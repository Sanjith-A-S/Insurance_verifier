import { Router } from 'express';
import mongoose from 'mongoose';
import { env } from '../../config/env.js';

const router = Router();

router.get('/health', (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  const isAiConfigured = Boolean(env.GEMINI_API_KEY && env.GEMINI_API_KEY !== 'replace-me');

  const data = {
    status: isDbConnected ? 'healthy' : 'unhealthy',
    db: isDbConnected ? 'connected' : 'disconnected',
    ai: {
      mode: env.AI_MODE,
      configured: isAiConfigured,
      model: env.GEMINI_MODEL,
    },
    uptimeSec: Math.floor(process.uptime()),
  };

  if (!isDbConnected) {
    return res.status(503).json({
      ok: false,
      error: {
        code: 'INTERNAL',
        message: 'Database connection unavailable',
      },
      data,
    });
  }

  res.status(200).json({
    ok: true,
    data,
  });
});

export default router;
