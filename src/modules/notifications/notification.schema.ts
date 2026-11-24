import { z } from 'zod';

/** Client-triggered reminder kinds (mirrors the `Notification.type` convention). */
export const NOTIFICATION_TYPES = [
  'BUDGET_ALERT',
  'TASK_REMINDER',
  'HABIT_REMINDER',
  'NOTE_REMINDER',
  'DAILY_FINANCE',
] as const;

export const notificationTypeSchema = z.enum(NOTIFICATION_TYPES);

export const notificationIdParamsSchema = z.object({
  id: z.uuid('Notification id must be a valid UUID'),
});

export const createNotificationSchema = z.object({
  type: notificationTypeSchema,
  title: z.string().trim().min(1, 'Title is required').max(200, 'Title is too long'),
  message: z.string().trim().min(1, 'Message is required').max(2000, 'Message is too long'),
});

export type CreateNotificationInput = z.infer<typeof createNotificationSchema>;
