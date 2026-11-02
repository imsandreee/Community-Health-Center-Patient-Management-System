import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors.js';
import { ProblemDetails } from '../types/index.js';

export function errorHandler(
  err: Error | AppError | ZodError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  const timestamp = new Date().toISOString();
  const instance = req.originalUrl || req.url;

  if (err instanceof AppError) {
    const payload: ProblemDetails = {
      type: err.type,
      title: err.title,
      status: err.statusCode,
      detail: err.detail,
      instance,
      code: err.code,
      timestamp,
      errors: err.errors,
    };
    res.status(err.statusCode).json(payload);
    return;
  }

  if (err instanceof ZodError) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of err.issues) {
      const field = issue.path.join('.') || 'body';
      if (!fieldErrors[field]) fieldErrors[field] = [];
      fieldErrors[field].push(issue.message);
    }

    const payload: ProblemDetails = {
      type: 'https://api.sanroque-chc.gov.ph/errors/validation-failed',
      title: 'Validation Failed (400)',
      status: 400,
      detail: 'The submitted request payload failed schema validation rules.',
      instance,
      code: 'VALIDATION_ERROR',
      timestamp,
      errors: fieldErrors,
    };
    res.status(400).json(payload);
    return;
  }

  // Unhandled internal server error
  console.error('[Unhandled Exception]:', err);
  const payload: ProblemDetails = {
    type: 'https://api.sanroque-chc.gov.ph/errors/internal-server-error',
    title: 'Internal Server Error',
    status: 500,
    detail: process.env.NODE_ENV === 'production' ? 'An unexpected server error occurred.' : err.message,
    instance,
    code: 'INTERNAL_SERVER_ERROR',
    timestamp,
  };
  res.status(500).json(payload);
}

