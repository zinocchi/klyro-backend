import { z } from 'zod';

export const TASK_STATUSES = ['PENDING', 'IN_PROGRESS', 'COMPLETED'] as const;
export const TASK_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'] as const;

export const taskStatusSchema = z.enum(TASK_STATUSES);
export const taskPrioritySchema = z.enum(TASK_PRIORITIES);

/** `YYYY-MM-DD`, validated as a real calendar date (not just regex-shaped). */
export const dateOnlySchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value);
  }, 'Date must be a valid calendar date');

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

export const listTasksQuerySchema = z.object({
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  due_date: dateOnlySchema.optional(),
});

export const createTaskSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200, 'Title is too long'),
  description: z.string().trim().max(2000, 'Description is too long').optional(),
  due_date: dueDateSchema.optional(),
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
});

export const updateTaskSchema = z
  .object({
    title: z.string().trim().min(1, 'Title cannot be empty').max(200, 'Title is too long').optional(),
    description: z.string().trim().max(2000, 'Description is too long').nullable().optional(),
    due_date: dueDateSchema.nullable().optional(),
    status: taskStatusSchema.optional(),
    priority: taskPrioritySchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

export type TaskStatusInput = z.infer<typeof taskStatusSchema>;
export type TaskPriorityInput = z.infer<typeof taskPrioritySchema>;
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
