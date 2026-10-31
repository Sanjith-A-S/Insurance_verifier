import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CLIENT_ORIGINS: z.string().default('http://localhost:5173,http://localhost:5174'),
  MONGODB_URI: z.string().default('mongodb://127.0.0.1:27017/claimlens'),
  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_UPLOAD_MB: z.coerce.number().default(15),
  MAX_FILES_PER_CLAIM: z.coerce.number().default(40),
  GEMINI_API_KEY: z.string().default('replace-me'),
  GEMINI_MODEL: z.string().default('gemini-3-flash-preview'),
  GEMINI_FALLBACK_MODEL: z.string().default('gemini-3.1-flash-lite'),
  GEMINI_TIMEOUT_MS: z.coerce.number().default(60000),
  AI_CONCURRENCY: z.coerce.number().default(3),
  AI_MODE: z.enum(['live', 'mock', 'auto']).default('auto'),
  DEMO_MODE: z.preprocess((val) => {
    if (val === undefined || val === null || val === '') return true;
    return val === 'true' || val === true;
  }, z.boolean().default(true)),
  JWT_SECRET: z.string().default('claimlens-secret-jwt-key-change-in-production-2026'),
  SESSION_TTL_HOURS: z.coerce.number().default(12),
  RATE_LIMIT_GLOBAL_MAX: z.coerce.number().default(300),
  RATE_LIMIT_ANALYZE_MAX: z.coerce.number().default(6),
  RATE_LIMIT_UPLOAD_MAX: z.coerce.number().default(60),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.format());
  throw new Error('Environment configuration validation failed');
}

export const env = parsed.data;

if (env.NODE_ENV === 'production' && env.DEMO_MODE === true) {
  throw new Error('Security Error: DEMO_MODE=true is strictly prohibited in production');
}

export const clientOriginsList = env.CLIENT_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean);
