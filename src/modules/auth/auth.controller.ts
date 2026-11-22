import type { Request, RequestHandler, Response } from 'express';
import { AppError } from '../../utils/appError.js';
import { sendSuccess } from '../../utils/apiResponse.js';
import { getUserProfile, loginUser, registerUser, updateUserProfile, changeUserPassword } from './auth.service.js';
import type {
  ChangePasswordInput,
  LoginInput,
  RegisterInput,
  UpdateProfileInput,
} from './auth.schema.js';

/** POST /api/v1/auth/register */
export const register: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  const result = await registerUser(req.body as RegisterInput);

  sendSuccess(res, result, { statusCode: 201, message: 'User registered successfully' });
};

/** POST /api/v1/auth/login */
export const login: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  const result = await loginUser(req.body as LoginInput);

  sendSuccess(res, result, { message: 'Login successful' });
};

/** GET /api/v1/auth/me */
export const me: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    throw AppError.unauthorized('Missing authentication context');
  }

  const user = await getUserProfile(req.user.id);

  sendSuccess(res, { user }, { message: 'Authenticated user retrieved' });
};

/** PATCH /api/v1/auth/me */
export const patchMe: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    throw AppError.unauthorized('Missing authentication context');
  }

  const user = await updateUserProfile(req.user.id, req.body as UpdateProfileInput);

  sendSuccess(res, { user }, { message: 'Profile updated successfully' });
};

/** PATCH /api/v1/auth/password */
export const patchPassword: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    throw AppError.unauthorized('Missing authentication context');
  }

  await changeUserPassword(req.user.id, req.body as ChangePasswordInput);

  sendSuccess(res, {}, { message: 'Password updated successfully' });
};
