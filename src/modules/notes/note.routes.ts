import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import {
  createNoteSchema,
  listNotesQuerySchema,
  noteIdParamsSchema,
  updateNoteSchema,
} from './note.schema.js';
import { getNotes, patchNote, postNote, removeNote } from './note.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', validate({ query: listNotesQuerySchema }), getNotes);
router.post('/', validate({ body: createNoteSchema }), postNote);
router.patch('/:id', validate({ params: noteIdParamsSchema, body: updateNoteSchema }), patchNote);
router.delete('/:id', validate({ params: noteIdParamsSchema }), removeNote);

export default router;