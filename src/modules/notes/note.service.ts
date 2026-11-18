import type { Prisma, Note } from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { AppError } from '../../utils/appError.js';
import type { CreateNoteInput, ListNotesQuery, UpdateNoteInput } from './note.schema.js';

export async function listNotes(userId: string, filters: ListNotesQuery): Promise<Note[]> {
  const where: Prisma.NoteWhereInput = { user_id: userId };

  if (filters.is_pinned !== undefined) where.is_pinned = filters.is_pinned;

  if (filters.search) {
    where.OR = [
      { title: { contains: filters.search, mode: 'insensitive' } },
      { content: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  return prisma.note.findMany({
    where,
    orderBy: [{ is_pinned: 'desc' }, { updated_at: 'desc' }],
  });
}

export async function createNote(userId: string, input: CreateNoteInput): Promise<Note> {
  return prisma.note.create({
    data: {
      user_id: userId,
      title: input.title,
      content: input.content,
      is_pinned: input.is_pinned ?? false,
    },
  });
}

async function assertNoteOwnership(userId: string, noteId: string): Promise<void> {
  const found = await prisma.note.findFirst({
    where: { id: noteId, user_id: userId },
    select: { id: true },
  });

  if (!found) {
    throw AppError.notFound('Note not found');
  }
}

export async function updateNote(
  userId: string,
  noteId: string,
  input: UpdateNoteInput,
): Promise<Note> {
  await assertNoteOwnership(userId, noteId);

  const data: Prisma.NoteUpdateInput = {};

  if (input.title !== undefined) data.title = input.title;
  if (input.content !== undefined) data.content = input.content;
  if (input.is_pinned !== undefined) data.is_pinned = input.is_pinned;

  return prisma.note.update({ where: { id: noteId }, data });
}

export async function deleteNote(userId: string, noteId: string): Promise<{ id: string }> {
  const result = await prisma.note.deleteMany({ where: { id: noteId, user_id: userId } });

  if (result.count === 0) {
    throw AppError.notFound('Note not found');
  }

  return { id: noteId };
}