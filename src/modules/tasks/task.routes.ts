import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import {
  createTaskSchema,
  listTasksQuerySchema,
  taskIdParamsSchema,
  updateTaskSchema,
} from './task.schema.js';
import { getTasks, patchTask, postTask, removeTask } from './task.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', validate({ query: listTasksQuerySchema }), getTasks);
router.post('/', validate({ body: createTaskSchema }), postTask);
router.patch(
  '/:id',
  validate({ params: taskIdParamsSchema, body: updateTaskSchema }),
  patchTask,
);
router.delete('/:id', validate({ params: taskIdParamsSchema }), removeTask);

export default router;
