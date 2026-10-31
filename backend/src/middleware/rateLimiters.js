import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

function createLimiter({ windowMs, max, message }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        ok: false,
        error: {
          code: 'RATE_LIMITED',
          message: message || 'Too many requests, please slow down and try again later',
        },
      });
    },
    keyGenerator: (req) => {
      // Per actor if resolved, or IP
      return (req.actor && req.actor.id) || req.ip || 'anonymous';
    },
    skip: () => env.NODE_ENV === 'test',
  });
}

export const globalLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: env.RATE_LIMIT_GLOBAL_MAX,
  message: 'Global rate limit exceeded. Please try again shortly.',
});

export const analyzeLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: env.RATE_LIMIT_ANALYZE_MAX,
  message: 'AI analysis rate limit exceeded. Please wait before triggering another analysis.',
});

export const uploadLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: env.RATE_LIMIT_UPLOAD_MAX,
  message: 'Evidence upload rate limit exceeded. Please wait before uploading more files.',
});
