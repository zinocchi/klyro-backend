import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { notificationIdParamsSchema, createNotificationSchema } from './notification.schema.js';
import {
  getNotifications,
  patchNotificationRead,
  patchReadAll,
  postNotification,
} from './notification.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', getNotifications);
router.post('/', validate({ body: createNotificationSchema }), postNotification);
router.patch('/read-all', patchReadAll);
router.patch('/:id/read', validate({ params: notificationIdParamsSchema }), patchNotificationRead);

export default router;
