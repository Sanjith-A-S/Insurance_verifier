import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { User } from '../../src/models/user.model.js';

describe('Demo & /me Module Tests', () => {
  beforeEach(async () => {
    await User.create([
      { _id: 'usr_aarav', name: 'Aarav Kumar', email: 'aarav@example.com', role: 'claimant', phone: '9876543210' },
      { _id: 'usr_meera', name: 'Meera Iyer', email: 'meera@example.com', role: 'verifier' },
    ]);
  });

  it('GET /api/v1/demo/users returns all seeded users without authentication', async () => {
    const res = await request(app).get('/api/v1/demo/users');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(2);
    expect(res.body.data[0]).toHaveProperty('id');
    expect(res.body.data[0]).toHaveProperty('name');
    expect(res.body.data[0]).toHaveProperty('role');
  });

  it('GET /api/v1/me returns profile of authenticated user', async () => {
    const res = await request(app)
      .get('/api/v1/me')
      .set('X-Demo-User-Id', 'usr_aarav');

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.id).toBe('usr_aarav');
    expect(res.body.data.name).toBe('Aarav Kumar');
    expect(res.body.data.phone).toBe('9876543210');
  });

  it('PATCH /api/v1/me updates phone and notificationPrefs and rejects unknown keys', async () => {
    const patchRes = await request(app)
      .patch('/api/v1/me')
      .set('X-Demo-User-Id', 'usr_aarav')
      .send({
        phone: '9999988888',
        notificationPrefs: { email: true, sms: true },
      });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.ok).toBe(true);
    expect(patchRes.body.data.phone).toBe('9999988888');

    // Unknown field should be rejected with 400
    const badRes = await request(app)
      .patch('/api/v1/me')
      .set('X-Demo-User-Id', 'usr_aarav')
      .send({ role: 'verifier' });

    expect(badRes.status).toBe(400);
    expect(badRes.body.ok).toBe(false);
    expect(badRes.body.error.code).toBe('VALIDATION_ERROR');
  });
});
