import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { authRateLimit } from '../../middlewares/rateLimit.middleware.js';
import { loginSchema, registerSchema, changePasswordSchema, updateProfileSchema } from './auth.schema.js';
import { login, me, patchMe, patchPassword, register } from './auth.controller.js';

const router = Router();

router.post('/register', authRateLimit, validate({ body: registerSchema }), register);
router.post('/login', authRateLimit, validate({ body: loginSchema }), login);
router.get('/me', authenticate, me);
router.patch('/me', authenticate, validate({ body: updateProfileSchema }), patchMe);
router.patch('/password', authenticate, validate({ body: changePasswordSchema }), patchPassword);

export default router;
