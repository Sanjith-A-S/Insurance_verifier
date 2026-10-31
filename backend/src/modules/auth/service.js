import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { User } from '../../models/user.model.js';
import { ValidationError, UnauthenticatedError } from '../../lib/errors.js';

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export async function registerClaimant(data) {
  const existing = await User.findOne({ email: data.email.toLowerCase() });
  if (existing) {
    throw new ValidationError('Email is already registered', [
      { field: 'email', message: 'Email address already in use' },
    ]);
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(data.password, salt);
  const userId = `usr_${Date.now()}`;

  const user = await User.create({
    _id: userId,
    name: data.name,
    email: data.email.toLowerCase(),
    passwordHash,
    role: 'claimant', // Registration is claimant only
    phone: data.phone || '',
  });

  const token = jwt.sign(
    { userId: user._id, role: user.role, name: user.name },
    env.JWT_SECRET,
    { expiresIn: `${env.SESSION_TTL_HOURS}h` }
  );

  return {
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
}

export async function loginUser(email, password) {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user || !user.passwordHash) {
    throw new UnauthenticatedError('Invalid email or password');
  }

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    throw new UnauthenticatedError('Invalid email or password');
  }

  const token = jwt.sign(
    { userId: user._id, role: user.role, name: user.name },
    env.JWT_SECRET,
    { expiresIn: `${env.SESSION_TTL_HOURS}h` }
  );

  return {
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
}

