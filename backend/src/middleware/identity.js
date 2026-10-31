import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { UnauthenticatedError } from '../lib/errors.js';
import { User } from '../models/user.model.js';

export async function resolveIdentity(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const demoUserId = req.headers['x-demo-user-id'];

    // 1. Try Bearer token if provided
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();
      try {
        const decoded = jwt.verify(token, env.JWT_SECRET);
        const user = await User.findById(decoded.userId || decoded.id);
        if (user && user.status === 'active') {
          req.actor = {
            id: user._id.toString(),
            name: user.name,
            role: user.role,
          };
          return next();
        }
      } catch (err) {
        // Bearer token invalid or expired
        return next(new UnauthenticatedError('Invalid or expired authentication token'));
      }
    }

    // 2. If in DEMO_MODE, accept X-Demo-User-Id
    if (env.DEMO_MODE && demoUserId) {
      const user = await User.findById(demoUserId.trim());
      if (user && user.status === 'active') {
        req.actor = {
          id: user._id.toString(),
          name: user.name,
          role: user.role,
        };
        return next();
      }
      return next(new UnauthenticatedError(`Unknown demo user ID: ${demoUserId}`));
    }

    // Neither valid
    return next(new UnauthenticatedError('Authentication required. Missing credentials.'));
  } catch (err) {
    next(err);
  }
}

export async function optionalIdentity(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const demoUserId = req.headers['x-demo-user-id'];

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();
      try {
        const decoded = jwt.verify(token, env.JWT_SECRET);
        const user = await User.findById(decoded.userId || decoded.id);
        if (user && user.status === 'active') {
          req.actor = { id: user._id.toString(), name: user.name, role: user.role };
        }
      } catch {
        // Ignore in optional
      }
    } else if (env.DEMO_MODE && demoUserId) {
      const user = await User.findById(demoUserId.trim());
      if (user && user.status === 'active') {
        req.actor = { id: user._id.toString(), name: user.name, role: user.role };
      }
    }
    next();
  } catch {
    next();
  }
}
