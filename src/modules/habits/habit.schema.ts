import { z } from 'zod';

export const TARGET_DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const;

export const targetDaySchema = z.enum(TARGET_DAYS);

export const targetDaysSchema = z
  .array(targetDaySchema)
  .min(1, 'At least one target day is required')
  .max(7, 'Target days cannot exceed 7 days')
  .refine((days) => new Set(days).size === days.length, 'Target days must be unique');

/** `YYYY-MM-DD`, validated as a real calendar date (not just regex-shaped). */
export const dateOnlySchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value);
  }, 'Date must be a valid calendar date');

export const habitIdParamsSchema = z.object({
  id: z.uuid('Habit id must be a valid UUID'),
});

/** `HH:mm`, 24-hour. */
export const reminderTimeSchema = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must be in HH:mm format');

export const listHabitsQuerySchema = z.object({
  date: dateOnlySchema.optional(),
});

export const createHabitSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200, 'Title is too long'),
  target_days: targetDaysSchema,
  reminder_time: reminderTimeSchema.nullable().optional(),
});

export const updateHabitSchema = z
  .object({
    title: z.string().trim().min(1, 'Title cannot be empty').max(200, 'Title is too long').optional(),
    target_days: targetDaysSchema.optional(),
    reminder_time: reminderTimeSchema.nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

export const checkInSchema = z.object({
  date: dateOnlySchema,
});

export type TargetDay = z.infer<typeof targetDaySchema>;
export type CreateHabitInput = z.infer<typeof createHabitSchema>;
export type UpdateHabitInput = z.infer<typeof updateHabitSchema>;
export type CheckInInput = z.infer<typeof checkInSchema>;
export type ListHabitsQuery = z.infer<typeof listHabitsQuerySchema>;