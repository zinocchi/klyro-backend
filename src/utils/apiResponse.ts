import type { Response } from 'express';
import type { FieldError } from './appError.js';

export interface SuccessBody<T> {
  success: true;
  message: string;
  data: T;
}

export interface ErrorBody {
  success: false;
  message: string;
  errors?: FieldError[];
}

export interface SuccessOptions {
  statusCode?: number;
  message?: string;
}

export interface ErrorOptions {
  statusCode?: number;
  errors?: FieldError[];
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  { statusCode = 200, message = 'Success' }: SuccessOptions = {},
): Response<SuccessBody<T>> {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
}

export function sendError(
  res: Response,
  message: string,
  { statusCode = 500, errors }: ErrorOptions = {},
): Response<ErrorBody> {
  const body: ErrorBody = { success: false, message };

  if (errors && errors.length > 0) {
    body.errors = errors;
  }

  return res.status(statusCode).json(body);
}
