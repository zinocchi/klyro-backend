import type { Request, RequestHandler, Response } from 'express';
import { AppError } from '../../utils/appError.js';
import { sendSuccess } from '../../utils/apiResponse.js';
import {
  checkInHabit,
  createHabit,
  deleteHabit,
  listHabits,
  updateHabit,
} from './habit.service.js';
import type {
  CheckInInput,
  CreateHabitInput,
  ListHabitsQuery,
  UpdateHabitInput,
} from './habit.schema.js';

function requireUserId(req: Request): string {
  if (!req.user) {
    throw AppError.unauthorized('Missing authentication context');
  }

  return req.user.id;
}

/** GET /api/v1/habits */
export const getHabits: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  const query = req.query as ListHabitsQuery;
  const habits = await listHabits(requireUserId(req), query.date);

  sendSuccess(res, { habits }, { message: 'Habits retrieved successfully' });
};

/** POST /api/v1/habits */
export const postHabit: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  const habit = await createHabit(requireUserId(req), req.body as CreateHabitInput);

  sendSuccess(res, { habit }, { statusCode: 201, message: 'Habit created successfully' });
};

/** PATCH /api/v1/habits/:id */
export const patchHabit: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  const habit = await updateHabit(
    requireUserId(req),
    req.params.id as string,
    req.body as UpdateHabitInput,
  );

  sendSuccess(res, { habit }, { message: 'Habit updated successfully' });
};

/** DELETE /api/v1/habits/:id */
export const removeHabit: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  const deleted = await deleteHabit(requireUserId(req), req.params.id as string);

  sendSuccess(res, deleted, { message: 'Habit deleted successfully' });
};

/** POST /api/v1/habits/:id/check-in */
export const postCheckIn: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  const result = await checkInHabit(
    requireUserId(req),
    req.params.id as string,
    req.body as CheckInInput,
  );

  sendSuccess(res, result, { message: 'Habit check-in toggled successfully' });
};