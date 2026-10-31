import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { env, clientOriginsList } from './config/env.js';
import { requestIdMiddleware } from './middleware/requestId.js';
import { logRingMiddleware } from './middleware/logger.js';
import { globalLimiter } from './middleware/rateLimiters.js';
import { errorHandler } from './middleware/errorHandler.js';
import { NotFoundError } from './lib/errors.js';
import v1Router from './routes.index.js';

export const app = express();

// Security headers
app.use(helmet({ contentSecurityPolicy: false }));

// CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, smoke script)
      if (!origin) return callback(null, true);
      if (
        clientOriginsList.includes(origin) ||
        origin === 'http://localhost:4000' ||
        origin === 'http://127.0.0.1:4000' ||
        (env.DEMO_MODE && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin))
      ) {
        return callback(null, true);
      }
      return callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
    allowedHeaders: ['Authorization', 'X-Demo-User-Id', 'Content-Type', 'Idempotency-Key', 'X-Request-Id'],
    exposedHeaders: ['X-Request-Id'],
  })
);

// Standard body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request tracing and logging
app.use(requestIdMiddleware);
app.use(logRingMiddleware);

// Global rate limiting
app.use(globalLimiter);

// API v1 router
app.use('/api/v1', v1Router);

// DevConsole serving (only when DEMO_MODE=true)
if (env.DEMO_MODE) {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.resolve(currentDir, '../devconsole/dist'),
    path.resolve(process.cwd(), 'devconsole/dist'),
    path.resolve(process.cwd(), 'backend/devconsole/dist'),
  ];
  const distPath = candidates.find((c) => fs.existsSync(c)) || candidates[0];

  app.use('/devconsole', express.static(distPath, { redirect: false }));

  app.get(['/devconsole', '/devconsole/*'], (req, res, next) => {
    if (req.path.startsWith('/devconsole/assets/')) {
      return next();
    }
    const indexPath = path.join(distPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      next();
    }
  });
}

// 404 Not Found catch-all
app.use((req, res, next) => {
  next(new NotFoundError(`Endpoint not found: ${req.method} ${req.originalUrl || req.url}`));
});

// Central error handler
app.use(errorHandler);

