import type { NextFunction, Request, RequestHandler, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from '../utils/appError.js';

export interface AccessTokenPayload extends jwt.JwtPayload {
  sub: string;
  email: string;
}

function extractBearerToken(header: string | undefined): string | null {
  if (!header) return null;

  const [scheme, token] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;

  return token.trim();
}

function isAccessTokenPayload(payload: unknown): payload is AccessTokenPayload {
  if (typeof payload !== 'object' || payload === null) return false;

  const candidate = payload as Record<string, unknown>;

  return typeof candidate.sub === 'string' && typeof candidate.email === 'string';
}

/** Verifies the Bearer JWT and attaches the decoded user to `req.user`. */
export const authenticate: RequestHandler = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  const token = extractBearerToken(req.headers.authorization);

  if (!token) {
    next(AppError.unauthorized('Missing or malformed Authorization header'));
    return;
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);

    if (!isAccessTokenPayload(decoded)) {
      next(AppError.unauthorized('Invalid token payload'));
      return;
    }

    req.user = { id: decoded.sub, email: decoded.email };
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      next(AppError.unauthorized('Token expired'));
      return;
    }

    next(AppError.unauthorized('Invalid or expired token'));
  }
};

export default authenticate;
