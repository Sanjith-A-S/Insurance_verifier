import multer from 'multer';
import { AppError } from '../lib/errors.js';
import { logger } from './logger.js';
import { logRing } from '../lib/logRing.js';

export function errorHandler(err, req, res, next) {
  let statusCode = 500;
  let code = 'INTERNAL';
  let message = 'An unexpected internal error occurred';
  let fields;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    code = err.code;
    message = err.message;
    fields = err.fields;
  } else if (err instanceof multer.MulterError) {
    statusCode = 422;
    code = 'UPLOAD_REJECTED';
    message = `File upload rejected: ${err.message}`;
    fields = [{ field: 'file', message: err.message }];
  } else if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Malformed JSON payload in request body';
  } else if (err.name === 'CastError') {
    statusCode = 404;
    code = 'NOT_FOUND';
    message = 'Resource not found or invalid identifier format';
  } else {
    logger.error({ err, reqId: req.id }, 'Unhandled error caught in central error handler');
  }

  logRing.add({
    level: statusCode >= 500 ? 'error' : 'warn',
    message: `[${code}] ${message}`,
    path: req.originalUrl || req.url,
    method: req.method,
    statusCode,
    requestId: req.id,
    error: { code, message },
  });

  const responseBody = {
    ok: false,
    error: {
      code,
      message,
      ...(fields && fields.length > 0 ? { fields } : {}),
    },
  };

  res.status(statusCode).json(responseBody);
}
