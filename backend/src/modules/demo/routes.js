import { Router } from 'express';
import mongoose from 'mongoose';
import { env } from '../../config/env.js';
import { NotFoundError } from '../../lib/errors.js';
import { User } from '../../models/user.model.js';
import { logRing } from '../../lib/logRing.js';

const router = Router();

function ensureDemoMode(req, res, next) {
  if (!env.DEMO_MODE) {
    return next(new NotFoundError('Demo endpoints are disabled in non-demo mode'));
  }
  next();
}

router.use(ensureDemoMode);

router.get('/users', async (req, res, next) => {
  try {
    const users = await User.find({}, '_id name role').lean();
    const formatted = users.map((u) => ({
      id: u._id,
      name: u.name,
      role: u.role,
    }));
    res.status(200).json({
      ok: true,
      data: formatted,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/diagnostics', async (req, res, next) => {
  try {
    const dbState = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    const collections = await mongoose.connection.db?.listCollections().toArray() || [];
    const counts = {};

    for (const col of collections) {
      counts[col.name] = await mongoose.connection.db.collection(col.name).countDocuments();
    }

    res.status(200).json({
      ok: true,
      data: {
        dbState,
        aiMode: env.AI_MODE,
        configured: Boolean(env.GEMINI_API_KEY && env.GEMINI_API_KEY !== 'replace-me'),
        uptimeSec: Math.floor(process.uptime()),
        counts,
        recentLogs: logRing.getRecent(30),
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/reset', async (req, res, next) => {
  try {
    const { seedDatabase } = await import('../../../seed/loader.js');
    const result = await seedDatabase();
    res.status(200).json({
      ok: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
