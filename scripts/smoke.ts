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
const today = new Date().toISOString().slice(0, 10);

async function main(): Promise<void> {
  let token = '';

  // health
  const health = await api('/health');
  assert.equal(health.status, 200, 'health should be 200');
  assert.equal(health.body.success, true);
  assert.equal(health.body.data.database.status, 'up', 'database should be up');

  // register
  const registered = await api('/auth/register', { method: 'POST', body: { email, password } });
  assert.equal(registered.status, 201, `register failed: ${JSON.stringify(registered.body)}`);
  assert.equal(registered.body.data.user.email, email);
  assert.ok(!('password_hash' in registered.body.data.user), 'password_hash must not leak');
  token = registered.body.data.token;

  // duplicate register
  const duplicate = await api('/auth/register', { method: 'POST', body: { email, password } });
  assert.equal(duplicate.status, 409);

  // login + me
  const login = await api('/auth/login', { method: 'POST', body: { email, password } });
  assert.equal(login.status, 200);
  token = login.body.data.token;

  const me = await api('/auth/me', { token });
  assert.equal(me.status, 200);
  assert.equal(me.body.data.user.email, email);

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