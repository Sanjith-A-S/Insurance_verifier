import pino from 'pino';
import { pinoHttp } from 'pino-http';
import { logRing } from '../lib/logRing.js';
import { env } from '../config/env.js';

export const logger = pino({
  level: env.NODE_ENV === 'test' ? 'silent' : 'info',
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers["x-demo-user-id"]',
      'req.body.password',
      'req.body.prompt',
      'req.body.narrative',
      'req.body.documentText',
      '*.password',
      '*.token',
    ],
    remove: true,
  },
});

export const httpLogger = pinoHttp({
  logger,
  genReqId: (req) => req.id || req.headers['x-request-id'],
  customLogLevel: (req, res, err) => {
    if (res.statusCode >= 500 || err) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  customSuccessMessage: (req, res) => `${req.method} ${req.url} ${res.statusCode}`,
  customErrorMessage: (req, res, err) => `${req.method} ${req.url} ${res.statusCode} - ${err.message}`,
  customAttributeKeys: {
    req: 'req',
    res: 'res',
    err: 'err',
    responseTime: 'responseTime',
  },
});

export function logRingMiddleware(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    logRing.add({
      level: res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info',
      message: `${req.method} ${req.originalUrl || req.url} ${res.statusCode} (${Date.now() - start}ms)`,
      path: req.originalUrl || req.url,
      method: req.method,
      statusCode: res.statusCode,
      requestId: req.id,
    });
  });
  next();
}
