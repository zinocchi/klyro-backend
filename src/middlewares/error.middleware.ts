import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { isProduction } from '../config/env.js';
import { AppError } from '../utils/appError.js';
import { sendError } from '../utils/apiResponse.js';
import { formatZodError } from './validate.middleware.js';

interface HttpishError extends Error {
  status?: number;
  statusCode?: number;
  type?: string;
  code?: string;
}

function isJsonParseError(error: unknown): error is HttpishError {
  return (
    error instanceof SyntaxError &&
    typeof (error as HttpishError).status === 'number' &&
    (error as HttpishError).status === 400 &&
    'body' in error
  );
}

/** Single exit point for every error raised in the stack. */
export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (error instanceof AppError) {
    sendError(res, error.message, { statusCode: error.statusCode, errors: error.errors });
    return;
  }

  if (error instanceof ZodError) {
    sendError(res, 'Validation failed', { statusCode: 400, errors: formatZodError(error) });
    return;
  }

  if (isJsonParseError(error)) {
    sendError(res, 'Malformed JSON payload', { statusCode: 400 });
    return;
  }

  const httpError = error as HttpishError;
  const statusCode = httpError?.statusCode ?? httpError?.status;

  if (typeof statusCode === 'number' && statusCode >= 400 && statusCode < 600) {
    sendError(res, httpError.message || 'Request failed', { statusCode });
    return;
  }

  // eslint-disable-next-line no-console
  console.error('[error] Unhandled exception:', error);

  sendError(res, isProduction ? 'Internal server error' : String(httpError?.message ?? error), {
    statusCode: 500,
  });
}

export default errorHandler;
