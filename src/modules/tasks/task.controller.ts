import type { Request, RequestHandler, Response } from 'express';
import { AppError } from '../../utils/appError.js';
import { sendSuccess } from '../../utils/apiResponse.js';
import { createTask, deleteTask, listTasks, updateTask } from './task.service.js';
import type { CreateTaskInput, ListTasksQuery, UpdateTaskInput } from './task.schema.js';

function requireUserId(req: Request): string {
  if (!req.user) {
    throw AppError.unauthorized('Missing authentication context');
  }

  return req.user.id;
}

/** GET /api/v1/tasks */
export const getTasks: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  const tasks = await listTasks(requireUserId(req), req.query as ListTasksQuery);

  sendSuccess(res, { tasks }, { message: 'Tasks retrieved successfully' });
};

/** POST /api/v1/tasks */
export const postTask: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  const task = await createTask(requireUserId(req), req.body as CreateTaskInput);

  sendSuccess(res, { task }, { statusCode: 201, message: 'Task created successfully' });
};

/** PATCH /api/v1/tasks/:id */
export const patchTask: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  const task = await updateTask(
    requireUserId(req),
    req.params.id as string,
    req.body as UpdateTaskInput,
  );

  sendSuccess(res, { task }, { message: 'Task updated successfully' });
};

/** DELETE /api/v1/tasks/:id */
export const removeTask: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  const deleted = await deleteTask(requireUserId(req), req.params.id as string);

  sendSuccess(res, deleted, { message: 'Task deleted successfully' });
};
