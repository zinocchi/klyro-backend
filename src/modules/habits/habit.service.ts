import type { Habit, HabitLog, Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { AppError } from '../../utils/appError.js';
import type { CheckInInput, CreateHabitInput, UpdateHabitInput } from './habit.schema.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/** `YYYY-MM-DD` (or any Date) → midnight UTC, the representation used by `@db.Date`. */
function utcMidnight(value: string | Date): Date {
  const key = typeof value === 'string' ? value : value.toISOString().slice(0, 10);
  return new Date(`${key}T00:00:00.000Z`);
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export type HabitWithCompletion = Habit & { completed: boolean };

export async function listHabits(userId: string, date?: string): Promise<HabitWithCompletion[]> {
  const day = utcMidnight(date ?? todayUtc());
  const nextDay = new Date(day.getTime() + DAY_MS);

  const habits = await prisma.habit.findMany({
    where: { user_id: userId },
    orderBy: { created_at: 'desc' },
    include: {
      logs: {
        where: { date: { gte: day, lt: nextDay } },
        select: { completed: true },
        take: 1,
      },
    },
  });

  return habits.map(({ logs, ...habit }) => ({
    ...habit,
    completed: logs[0]?.completed === true,
  }));
}

export async function createHabit(userId: string, input: CreateHabitInput): Promise<Habit> {
  return prisma.habit.create({
    data: {
      user_id: userId,
      title: input.title,
      target_days: input.target_days,
      streak_count: 0,
    },
  });
}

async function assertHabitOwnership(userId: string, habitId: string): Promise<void> {
  const habit = await prisma.habit.findFirst({
    where: { id: habitId, user_id: userId },
    select: { id: true },
  });

  if (!habit) {
    throw AppError.notFound('Habit not found');
  }
}

export async function updateHabit(
  userId: string,
  habitId: string,
  input: UpdateHabitInput,
): Promise<Habit> {
  await assertHabitOwnership(userId, habitId);

  const data: Prisma.HabitUpdateInput = {};

  if (input.title !== undefined) data.title = input.title;
  if (input.target_days !== undefined) data.target_days = input.target_days;

  return prisma.habit.update({ where: { id: habitId }, data });
}

export async function deleteHabit(userId: string, habitId: string): Promise<{ id: string }> {
  const result = await prisma.habit.deleteMany({ where: { id: habitId, user_id: userId } });

  if (result.count === 0) {
    throw AppError.notFound('Habit not found');
  }

  return { id: habitId };
}

/**
 * Number of consecutive completed days ending at the most recent completed log
 * on or before `upTo` (the check-in date). Unchecking a day therefore drops the
 * streak back to the run still intact, instead of zeroing unrelated history.
 */
async function calculateStreak(habitId: string, upTo: Date): Promise<number> {
  const logs = await prisma.habitLog.findMany({
    where: { habit_id: habitId, completed: true, date: { lte: upTo } },
    orderBy: { date: 'desc' },
    select: { date: true },
  });

  if (logs.length === 0) return 0;

  let streak = 1;
  let previous = utcMidnight(logs[0].date).getTime();

  for (let index = 1; index < logs.length; index += 1) {
    const current = utcMidnight(logs[index].date).getTime();

    if (previous - current !== DAY_MS) break;

    streak += 1;
    previous = current;
  }

  return streak;
}

export interface CheckInResult {
  habit: Habit;
  log: HabitLog;
}

/** Toggles the log for `(habit, date)`, then rewrites `streak_count` from scratch. */
export async function checkInHabit(
  userId: string,
  habitId: string,
  input: CheckInInput,
): Promise<CheckInResult> {
  await assertHabitOwnership(userId, habitId);

  const date = utcMidnight(input.date);

  const existing = await prisma.habitLog.findUnique({
    where: { habit_id_date: { habit_id: habitId, date } },
    select: { completed: true },
  });

  const completed = existing ? !existing.completed : true;

  const log = await prisma.habitLog.upsert({
    where: { habit_id_date: { habit_id: habitId, date } },
    create: { habit_id: habitId, date, completed },
    update: { completed },
  });

  const streakCount = await calculateStreak(habitId, date);

  const habit = await prisma.habit.update({
    where: { id: habitId },
    data: { streak_count: streakCount },
  });

  return { habit, log };
}