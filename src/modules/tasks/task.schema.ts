import { z } from 'zod';
import { dateOnlySchema } from '../../utils/date.js';

export const TASK_STATUSES = ['PENDING', 'IN_PROGRESS', 'COMPLETED'] as const;
export const TASK_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'] as const;

export const taskStatusSchema = z.enum(TASK_STATUSES);
export const taskPrioritySchema = z.enum(TASK_PRIORITIES);

export { dateOnlySchema };

/** Accepts `YYYY-MM-DD` or a full ISO-8601 datetime and yields a `Date`. */
export const dueDateSchema = z
  .string()
  .trim()
  .min(1, 'Due date cannot be empty')
  .refine((value) => !Number.isNaN(Date.parse(value)), 'Due date must be a valid ISO date')
  .transform((value) => new Date(value));

export const taskIdParamsSchema = z.object({
  id: z.uuid('Task id must be a valid UUID'),
});

export const subtaskSchema = z.object({
  id: z.string().min(1, 'Subtask id is required'),
  title: z.string().trim().min(1, 'Subtask title is required').max(200, 'Subtask title is too long'),
  completed: z.boolean(),
});

export const subtasksSchema = z.array(subtaskSchema).max(100, 'Too many subtasks');

/** Accepts an ISO-8601 datetime and yields a `Date`. */
export const reminderAtSchema = z
  .string()
  .trim()
  .min(1, 'Reminder cannot be empty')
  .refine((value) => !Number.isNaN(Date.parse(value)), 'Reminder must be a valid ISO datetime')
  .transform((value) => new Date(value));

/**
 * Accepts an array of ISO-8601 datetime strings and yields canonical ISO-8601 strings.
 * Stored as-is in the `reminders` JSON column (array of strings).
 */
export const remindersSchema = z
  .array(
    z
      .string()
      .trim()
      .min(1, 'Reminder cannot be empty')
      .refine((value) => !Number.isNaN(Date.parse(value)), 'Reminder must be a valid ISO datetime')
      .transform((value) => new Date(value).toISOString()),
  )
  .max(50, 'Too many reminders');

/** Hours between repeats (e.g. `1`, `2`, `4`) or `null` for a one-off reminder. */
export const reminderIntervalSchema = z
  .number('Reminder interval must be a number')
  .int('Reminder interval must be a whole number of hours')
  .positive('Reminder interval must be greater than zero')
  .max(8760, 'Reminder interval is too large')
  .nullable();

export const listTasksQuerySchema = z.object({
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  due_date: dateOnlySchema.optional(),
  search: z.string().trim().min(1).max(200).optional(),
});

export const createTaskSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200, 'Title is too long'),
  description: z.string().trim().max(2000, 'Description is too long').optional(),
  due_date: dueDateSchema.optional(),
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  subtasks: subtasksSchema.optional(),
  reminder_at: reminderAtSchema.nullable().optional(),
  reminders: remindersSchema.optional(),
  reminder_interval: reminderIntervalSchema.optional(),
});

export const updateTaskSchema = z
  .object({
    title: z.string().trim().min(1, 'Title cannot be empty').max(200, 'Title is too long').optional(),
    description: z.string().trim().max(2000, 'Description is too long').nullable().optional(),
    due_date: dueDateSchema.nullable().optional(),
    status: taskStatusSchema.optional(),
    priority: taskPrioritySchema.optional(),
    subtasks: subtasksSchema.optional(),
    reminder_at: reminderAtSchema.nullable().optional(),
    reminders: remindersSchema.optional(),
    reminder_interval: reminderIntervalSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

export type TaskStatusInput = z.infer<typeof taskStatusSchema>;
export type TaskPriorityInput = z.infer<typeof taskPrioritySchema>;
export type Subtask = z.infer<typeof subtaskSchema>;
export type Reminders = z.infer<typeof remindersSchema>;
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
