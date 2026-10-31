import { ForbiddenError, UnauthenticatedError } from '../lib/errors.js';

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.actor) {
      return next(new UnauthenticatedError('Authentication required'));
    }

    if (!allowedRoles.includes(req.actor.role)) {
      return next(new ForbiddenError(`Access restricted to roles: ${allowedRoles.join(', ')}`));
    }

    next();
  };
}

