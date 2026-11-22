import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { notificationIdParamsSchema } from './notification.schema.js';
import {
  getNotifications,
  patchNotificationRead,
  patchReadAll,
} from './notification.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', getNotifications);
router.patch('/read-all', patchReadAll);
router.patch('/:id/read', validate({ params: notificationIdParamsSchema }), patchNotificationRead);

export default router;
