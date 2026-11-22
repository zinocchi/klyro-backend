import { z } from 'zod';

export const noteIdParamsSchema = z.object({
  id: z.uuid('Note id must be a valid UUID'),
});

const pinnedFlag = z.enum(['true', 'false']).transform((value) => value === 'true');

/** Accepts an ISO-8601 datetime and yields a `Date`. */
const remindAtSchema = z
  .string()
  .trim()
  .min(1, 'Reminder cannot be empty')
  .refine((value) => !Number.isNaN(Date.parse(value)), 'Reminder must be a valid ISO datetime')
  .transform((value) => new Date(value));

const tagSchema = z.string().trim().min(1, 'Tag cannot be empty').max(50, 'Tag is too long');

export const listNotesQuerySchema = z.object({
  is_pinned: pinnedFlag.optional(),
  search: z.string().trim().min(1).max(200).optional(),
});

export const createNoteSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200, 'Title is too long'),
  content: z.string().trim().min(1, 'Content is required').max(20000, 'Content is too long'),
  is_pinned: z.boolean().optional(),
  tag: tagSchema.nullable().optional(),
  remind_at: remindAtSchema.nullable().optional(),
});

export const updateNoteSchema = z
  .object({
    title: z.string().trim().min(1, 'Title cannot be empty').max(200, 'Title is too long').optional(),
    content: z.string().trim().min(1, 'Content cannot be empty').max(20000, 'Content is too long').optional(),
    is_pinned: z.boolean().optional(),
    tag: tagSchema.nullable().optional(),
    remind_at: remindAtSchema.nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

export type ListNotesQuery = z.infer<typeof listNotesQuerySchema>;
export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;