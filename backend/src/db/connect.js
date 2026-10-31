import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { logger } from '../middleware/logger.js';

let isConnected = false;

export async function connectDB(customUri) {
  const uri = customUri || env.MONGODB_URI;

  if (mongoose.connection.readyState === 1) {
    isConnected = true;
    return mongoose.connection;
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 10000,
    });
    isConnected = true;
    logger.info({ host: conn.connection.host, name: conn.connection.name }, 'Connected to MongoDB');
    return conn.connection;
  } catch (err) {
    logger.error({ err }, 'Failed to connect to MongoDB');
    throw err;
  }
}

export async function disconnectDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    isConnected = false;
    logger.info('Disconnected from MongoDB');
  }
}

