import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';

describe('Health and Envelope Tests', () => {
  it('GET /api/v1/health returns 200 with envelope', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.status).toBe('healthy');
    expect(res.body.data.db).toBe('connected');
    expect(res.headers['x-request-id']).toBeDefined();
  });

  it('Unknown route returns 404 NOT_FOUND envelope', async () => {
    const res = await request(app).get('/api/v1/unknown-endpoint-route');
    expect(res.status).toBe(404);
    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(res.body.error.message).toContain('Endpoint not found');
  });

  it('Malformed JSON body returns 400 VALIDATION_ERROR envelope', async () => {
    const res = await request(app)
      .post('/api/v1/claims')
      .set('Content-Type', 'application/json')
      .send('{ invalid json payload');

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
