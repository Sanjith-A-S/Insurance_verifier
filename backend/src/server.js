import { app } from './app.js';
import { env } from './config/env.js';
import { connectDB, disconnectDB } from './db/connect.js';
import { logger } from './middleware/logger.js';

async function startServer() {
  try {
    await connectDB();

    const server = app.listen(env.PORT, () => {
      logger.info(
        {
          port: env.PORT,
          env: env.NODE_ENV,
          demoMode: env.DEMO_MODE,
          aiMode: env.AI_MODE,
        },
        `ClaimLens AI Backend listening on port ${env.PORT}`
      );
    });

    const shutdown = async (signal) => {
      logger.info({ signal }, 'Graceful shutdown initiated');
      server.close(async () => {
        await disconnectDB();
        logger.info('Server closed cleanly');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (err) {
    logger.error({ err }, 'Failed to start server');
    process.exit(1);
  }
}

startServer();

