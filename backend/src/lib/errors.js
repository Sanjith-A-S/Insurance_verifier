export class AppError extends Error {
  constructor(message, code = 'INTERNAL', statusCode = 500, fields = undefined) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    if (fields && fields.length > 0) {
      this.fields = fields;
    }
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Invalid request data', fields = []) {
    super(message, 'VALIDATION_ERROR', 400, fields);
  }
}

export class UnauthenticatedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 'UNAUTHENTICATED', 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Action forbidden for your role') {
    super(message, 'FORBIDDEN', 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found or inaccessible') {
    super(message, 'NOT_FOUND', 404);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource state conflict') {
    super(message, 'CONFLICT', 409);
  }
}

export class UploadRejectedError extends AppError {
  constructor(message = 'Upload rejected due to invalid file type, size, or verification failure', fields = []) {
    super(message, 'UPLOAD_REJECTED', 422, fields);
  }
}

export class RateLimitedError extends AppError {
  constructor(message = 'Too many requests, please try again later') {
    super(message, 'RATE_LIMITED', 429);
  }
}

export class AnalysisUnavailableError extends AppError {
  constructor(message = 'AI analysis service temporarily unavailable') {
    super(message, 'ANALYSIS_UNAVAILABLE', 503);
  }
}

export class InternalError extends AppError {
  constructor(message = 'An internal server error occurred') {
    super(message, 'INTERNAL', 500);
  }
}

