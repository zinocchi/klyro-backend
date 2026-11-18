/**
 * End-to-end smoke test against a running API instance.
 * Usage: npm run smoke   (SMOKE_BASE_URL defaults to http://localhost:3000/api/v1)
 * Leaves no data behind: the test user is deleted at the end.
 */
import assert from 'node:assert/strict';
import { prisma, disconnectPrisma } from '../src/config/prisma.js';

const BASE = process.env.SMOKE_BASE_URL ?? 'http://localhost:3000/api/v1';

interface ApiResult {
  status: number;
  body: any;
}

async function api(
  path: string,
  options: { method?: string; body?: unknown; token?: string; headers?: Record<string, string> } = {},
): Promise<ApiResult> {
  const response = await fetch(`${BASE}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...options.headers,
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  const text = await response.text();

  return { status: response.status, body: text ? JSON.parse(text) : null };
}

const email = `smoke.${Date.now()}@example.com`;
const password = 'Password123';
const name = 'Smoke Tester';
const today = new Date().toISOString().slice(0, 10);

async function main(): Promise<void> {
  let token = '';

  // health
  const health = await api('/health');
  assert.equal(health.status, 200, 'health should be 200');
  assert.equal(health.body.success, true);
  assert.equal(health.body.data.database.status, 'up', 'database should be up');

  // register
  const registered = await api('/auth/register', {
    method: 'POST',
    body: { name, email, password },
  });
  assert.equal(registered.status, 201, `register failed: ${JSON.stringify(registered.body)}`);
  assert.equal(registered.body.data.user.email, email);
  assert.equal(registered.body.data.user.name, name);
  assert.ok(!('password_hash' in registered.body.data.user), 'password_hash must not leak');
  token = registered.body.data.token;

  // duplicate register
  const duplicate = await api('/auth/register', {
    method: 'POST',
    body: { name, email, password },
  });
  assert.equal(duplicate.status, 409);

  // login + me
  const login = await api('/auth/login', { method: 'POST', body: { email, password } });
  assert.equal(login.status, 200);
  assert.equal(login.body.data.user.name, name);
  token = login.body.data.token;

  const me = await api('/auth/me', { token });
  assert.equal(me.status, 200);
  assert.equal(me.body.data.user.email, email);
  assert.equal(me.body.data.user.name, name);

  // unauthorized
  assert.equal((await api('/tasks')).status, 401);

  // tasks CRUD
  const created = await api('/tasks', {
    method: 'POST',
    token,
    body: { title: 'Smoke task', due_date: today, priority: 'HIGH' },
  });
  assert.equal(created.status, 201);
  const taskId: string = created.body.data.task.id;

  const listed = await api('/tasks?priority=HIGH', { token });
  assert.equal(listed.status, 200);
  assert.ok(listed.body.data.tasks.some((task: { id: string }) => task.id === taskId));

  const updated = await api(`/tasks/${taskId}`, {
    method: 'PATCH',
    token,
    body: { status: 'COMPLETED' },
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.data.task.status, 'COMPLETED');

  assert.equal((await api(`/tasks/${taskId}`, { method: 'DELETE', token })).status, 200);

  // habits CRUD + check-in
  const habit = await api('/habits', {
    method: 'POST',
    token,
    body: { title: 'Smoke habit', target_days: ['MON', 'WED', 'FRI'] },
  });
  assert.equal(habit.status, 201);
  const habitId: string = habit.body.data.habit.id;
  assert.equal(habit.body.data.habit.streak_count, 0);

  const checkIn = await api(`/habits/${habitId}/check-in`, {
    method: 'POST',
    token,
    body: { date: today },
  });
  assert.equal(checkIn.status, 200);
  assert.equal(checkIn.body.data.log.completed, true);
  assert.equal(checkIn.body.data.habit.streak_count, 1);

  const habits = await api(`/habits?date=${today}`, { token });
  assert.equal(habits.status, 200);
  const todayHabit = habits.body.data.habits.find((item: { id: string }) => item.id === habitId);
  assert.equal(todayHabit.completed, true);

  assert.equal((await api(`/habits/${habitId}`, { method: 'DELETE', token })).status, 200);

  // transactions CRUD + filter
  const income = await api('/transactions', {
    method: 'POST',
    token,
    body: { type: 'INCOME', amount: 5_000_000, category: 'Gaji', date: today },
  });
  assert.equal(income.status, 201, `create transaction failed: ${JSON.stringify(income.body)}`);
  assert.equal(income.body.data.transaction.amount, 5_000_000);
  const txId: string = income.body.data.transaction.id;

  const expense = await api('/transactions', {
    method: 'POST',
    token,
    body: { type: 'EXPENSE', amount: 25_000, category: 'Makan', note: 'Nasi padang' },
  });
  assert.equal(expense.status, 201);
  assert.equal(expense.body.data.transaction.date.slice(0, 10), today, 'date should default to today');

  const filteredTx = await api(`/transactions?type=EXPENSE&from=${today}&to=${today}`, { token });
  assert.equal(filteredTx.status, 200);
  assert.equal(filteredTx.body.data.transactions.length, 1);

  assert.equal(
    (await api('/transactions', { method: 'POST', token, body: { type: 'EXPENSE', amount: 10.5, category: 'X' } })).status,
    400,
    'fractional amount must be rejected',
  );

  const updatedTx = await api(`/transactions/${txId}`, {
    method: 'PATCH',
    token,
    body: { amount: 6_000_000 },
  });
  assert.equal(updatedTx.status, 200);
  assert.equal(updatedTx.body.data.transaction.amount, 6_000_000);

  assert.equal((await api(`/transactions/${txId}`, { method: 'DELETE', token })).status, 200);
  assert.equal((await api(`/transactions/${txId}`, { method: 'DELETE', token })).status, 404);

  // notes CRUD + pinned ordering
  const plainNote = await api('/notes', {
    method: 'POST',
    token,
    body: { title: 'Belanja', content: 'Beras, telur' },
  });
  assert.equal(plainNote.status, 201);
  assert.equal(plainNote.body.data.note.is_pinned, false);

  const pinnedNote = await api('/notes', {
    method: 'POST',
    token,
    body: { title: 'Penting', content: 'Bayar listrik', is_pinned: true },
  });
  assert.equal(pinnedNote.status, 201);
  const noteId: string = pinnedNote.body.data.note.id;

  const notes = await api('/notes', { token });
  assert.equal(notes.status, 200);
  assert.equal(notes.body.data.notes[0].id, noteId, 'pinned note must come first');

  const updatedNote = await api(`/notes/${noteId}`, {
    method: 'PATCH',
    token,
    body: { content: 'Bayar listrik sebelum tanggal 20' },
  });
  assert.equal(updatedNote.status, 200);
  assert.ok(updatedNote.body.data.note.updated_at >= updatedNote.body.data.note.created_at);

  assert.equal((await api(`/notes/${noteId}`, { method: 'DELETE', token })).status, 200);
  assert.equal((await api(`/notes/${noteId}`, { method: 'DELETE', token })).status, 404);

  console.log('smoke: all checks passed');
}

main()
  .catch((error: unknown) => {
    console.error('smoke: FAILED');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    // Cleanup, even on failure.
    await prisma.user.deleteMany({ where: { email } }).catch(() => undefined);
    await disconnectPrisma();
  });