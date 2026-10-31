import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { User } from '../../src/models/user.model.js';
import { env } from '../../src/config/env.js';

describe('Phase 5 — Authentication & JWT Bearer Integration Tests', () => {
  beforeEach(async () => {
    await User.deleteMany({});
  });

  it('registers new claimant, denies duplicate email, and logs in with JWT', async () => {
    // 1. Register new claimant
    const regRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Sunita Sharma',
        email: 'sunita@example.com',
        password: 'Password123!',
        phone: '9876543219',
      });

    expect(regRes.status).toBe(201);
    expect(regRes.body.ok).toBe(true);
    expect(regRes.body.data.token).toBeDefined();
    expect(regRes.body.data.user.role).toBe('claimant');
    const token = regRes.body.data.token;

    // 2. Duplicate registration returns 400
    const dupRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Duplicate',
        email: 'sunita@example.com',
        password: 'Password123!',
      });

    expect(dupRes.status).toBe(400);
    expect(dupRes.body.error.code).toBe('VALIDATION_ERROR');

    // 3. Login with wrong password returns 401
    const badLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'sunita@example.com', password: 'WrongPassword' });

    expect(badLogin.status).toBe(401);
    expect(badLogin.body.error.code).toBe('UNAUTHENTICATED');

    // 4. Login with correct password returns 200 + token
    const goodLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'sunita@example.com', password: 'Password123!' });

    expect(goodLogin.status).toBe(200);
    expect(goodLogin.body.data.token).toBeDefined();

    // 5. Access protected route using Authorization: Bearer <token>
    const meRes = await request(app)
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.data.email).toBe('sunita@example.com');

    // 6. Access with invalid token returns 401
    const invalidTokenRes = await request(app)
      .get('/api/v1/me')
      .set('Authorization', 'Bearer invalid.bogus.token');

    expect(invalidTokenRes.status).toBe(401);
    expect(invalidTokenRes.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('ignores X-Demo-User-Id when DEMO_MODE is false', async () => {
    // Seed user
    const user = await User.create({
      _id: 'usr_demo_test',
      name: 'Demo Test',
      email: 'demo@example.com',
      role: 'claimant',
    });

    const origDemoMode = env.DEMO_MODE;
    try {
      env.DEMO_MODE = false;

      const res = await request(app)
        .get('/api/v1/me')
        .set('X-Demo-User-Id', 'usr_demo_test');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    } finally {
      env.DEMO_MODE = origDemoMode;
    }
  });
});
