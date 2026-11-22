import { z } from 'zod';

/** `YYYY-MM-DD`, validated as a real calendar date (not just regex-shaped). */
export const dateOnlySchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value);
  }, 'Date must be a valid calendar date');

/** `YYYY-MM-DD` → midnight UTC of that day. */
export function toUtcDate(dateOnly: string): Date {
  return new Date(`${dateOnly}T00:00:00.000Z`);
}

/** `YYYY-MM-DD` → [start of that UTC day, start of the next UTC day). */
export function utcDayRange(dateOnly: string): { start: Date; end: Date } {
  const start = toUtcDate(dateOnly);

  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
}

export function todayDateOnly(): string {
  return new Date().toISOString().slice(0, 10);
}

const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

/** Today's `YYYY-MM-DD` in Indonesia Western Time (Asia/Jakarta, UTC+7). */
export function todayWib(): string {
  return new Date(Date.now() + WIB_OFFSET_MS).toISOString().slice(0, 10);
}

/** `YYYY-MM` of the current WIB day. */
export function currentMonthWib(): string {
  return todayWib().slice(0, 7);
}

/** `YYYY-MM` → [first instant of that UTC month, first instant of the next). */
export function monthRange(month: string): { start: Date; end: Date } {
  const [year, monthIndex] = month.split('-').map(Number) as [number, number];

  return {
    start: new Date(Date.UTC(year, monthIndex - 1, 1)),
    end: new Date(Date.UTC(year, monthIndex, 1)),
  };
}

export function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}