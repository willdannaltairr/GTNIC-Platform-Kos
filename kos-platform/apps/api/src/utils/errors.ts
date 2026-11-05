export type ErrorDetail = { field: string; message: string }

export class AppError extends Error {
  readonly statusCode: number
  readonly code: string
  readonly details?: ErrorDetail[]
  readonly isOperational = true

  constructor(message: string, statusCode = 500, code = 'INTERNAL_ERROR', details?: ErrorDetail[]) {
    super(message)
    this.name = this.constructor.name
    this.statusCode = statusCode
    this.code = code
    this.details = details
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request', code = 'BAD_REQUEST', details?: ErrorDetail[]) {
    super(message, 400, code, details)
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required', code = 'UNAUTHORIZED') {
    super(message, 401, code)
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You do not have permission to perform this action', code = 'FORBIDDEN') {
    super(message, 403, code)
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', code = 'NOT_FOUND') {
    super(message, 404, code)
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource conflict', code = 'CONFLICT', details?: ErrorDetail[]) {
    super(message, 409, code, details)
  }
}

export class UnprocessableEntityError extends AppError {
  constructor(message = 'Unable to process request', code = 'UNPROCESSABLE_ENTITY', details?: ErrorDetail[]) {
    super(message, 422, code, details)
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = 'Too many requests', code = 'TOO_MANY_REQUESTS') {
    super(message, 429, code)
  }
}
