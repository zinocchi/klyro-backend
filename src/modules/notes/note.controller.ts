import type { Request, RequestHandler, Response } from 'express';
import { AppError } from '../../utils/appError.js';
import { sendSuccess } from '../../utils/apiResponse.js';
import { createNote, deleteNote, listNotes, updateNote } from './note.service.js';
import type { CreateNoteInput, ListNotesQuery, UpdateNoteInput } from './note.schema.js';

function requireUserId(req: Request): string {
  if (!req.user) {
    throw AppError.unauthorized('Missing authentication context');
  }

  return req.user.id;
}

/** GET /api/v1/notes */
export const getNotes: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  const notes = await listNotes(requireUserId(req), req.query as ListNotesQuery);

  sendSuccess(res, { notes }, { message: 'Notes retrieved successfully' });
};

/** POST /api/v1/notes */
export const postNote: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  const note = await createNote(requireUserId(req), req.body as CreateNoteInput);

  sendSuccess(res, { note }, { statusCode: 201, message: 'Note created successfully' });
};

/** PATCH /api/v1/notes/:id */
export const patchNote: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  const note = await updateNote(
    requireUserId(req),
    req.params.id as string,
    req.body as UpdateNoteInput,
  );

  sendSuccess(res, { note }, { message: 'Note updated successfully' });
};

/** DELETE /api/v1/notes/:id */
export const removeNote: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  const deleted = await deleteNote(requireUserId(req), req.params.id as string);

  sendSuccess(res, deleted, { message: 'Note deleted successfully' });
};