import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import {
  checkInSchema,
  createHabitSchema,
  habitIdParamsSchema,
  listHabitsQuerySchema,
  updateHabitSchema,
} from './habit.schema.js';
import {
  getHabits,
  patchHabit,
  postCheckIn,
  postHabit,
  removeHabit,
} from './habit.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', validate({ query: listHabitsQuerySchema }), getHabits);
router.post('/', validate({ body: createHabitSchema }), postHabit);
router.patch(
  '/:id',
  validate({ params: habitIdParamsSchema, body: updateHabitSchema }),
  patchHabit,
);
router.delete('/:id', validate({ params: habitIdParamsSchema }), removeHabit);
router.post(
  '/:id/check-in',
  validate({ params: habitIdParamsSchema, body: checkInSchema }),
  postCheckIn,
);

export default router;