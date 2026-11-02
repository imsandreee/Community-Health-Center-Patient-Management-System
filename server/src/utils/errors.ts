export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public title: string;
  public detail: string;
  public type: string;
  public errors?: Record<string, string[]>;

  constructor(params: {
    statusCode: number;
    code: string;
    title: string;
    detail: string;
    type?: string;
    errors?: Record<string, string[]>;
  }) {
    super(params.detail);
    this.name = 'AppError';
    this.statusCode = params.statusCode;
    this.code = params.code;
    this.title = params.title;
    this.detail = params.detail;
    this.type = params.type || `https://api.sanroque-chc.gov.ph/errors/${params.code.toLowerCase().replace(/_/g, '-')}`;
    this.errors = params.errors;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const badRequest = (detail: string, code = 'BAD_REQUEST', errors?: Record<string, string[]>) =>
  new AppError({
    statusCode: 400,
    code,
    title: 'Bad Request',
    detail,
    errors,
  });

export const unauthorized = (detail = 'Missing, invalid, or expired authorization credentials.', code = 'UNAUTHORIZED') =>
  new AppError({
    statusCode: 401,
    code,
    title: 'Unauthorized',
    detail,
  });

export const forbidden = (detail = 'Authenticated user lacks required Section 5 RBAC permissions.', code = 'FORBIDDEN') =>
  new AppError({
    statusCode: 403,
    code,
    title: 'Forbidden Access',
    detail,
  });

export const notFound = (detail = 'Target resource was not found on this server.', code = 'NOT_FOUND') =>
  new AppError({
    statusCode: 404,
    code,
    title: 'Resource Not Found',
    detail,
  });

export const conflict = (detail: string, code = 'CONFLICT', errors?: Record<string, string[]>) =>
  new AppError({
    statusCode: 409,
    code,
    title: 'Conflict / Business Rule Violation',
    detail,
    errors,
  });

export const internal = (detail = 'An unexpected internal server error occurred.', code = 'INTERNAL_ERROR') =>
  new AppError({
    statusCode: 500,
    code,
    title: 'Internal Server Error',
    detail,
  });

