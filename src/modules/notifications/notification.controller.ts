import type { Request, RequestHandler, Response } from 'express';
import { AppError } from '../../utils/appError.js';
import { sendSuccess } from '../../utils/apiResponse.js';
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from './notification.service.js';

function requireUserId(req: Request): string {
  if (!req.user) {
    throw AppError.unauthorized('Missing authentication context');
  }

  return req.user.id;
}

/** GET /api/v1/notifications */
export const getNotifications: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  const result = await listNotifications(requireUserId(req));

  sendSuccess(res, result, { message: 'Notifications retrieved successfully' });
};

/** PATCH /api/v1/notifications/:id/read */
export const patchNotificationRead: RequestHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const notification = await markNotificationRead(requireUserId(req), req.params.id as string);

  sendSuccess(res, { notification }, { message: 'Notification marked as read' });
};

/** PATCH /api/v1/notifications/read-all */
export const patchReadAll: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  const result = await markAllNotificationsRead(requireUserId(req));

  sendSuccess(res, result, { message: 'All notifications marked as read' });
};
