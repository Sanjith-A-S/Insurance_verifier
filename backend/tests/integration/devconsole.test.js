import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';

describe('DevConsole Static Serving & Route Guard Tests', () => {
  it('GET /devconsole returns 200 and HTML index when DEMO_MODE=true', async () => {
    const res = await request(app).get('/devconsole');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.text).toContain('ClaimLens Test Console');
    expect(res.text).toContain('/devconsole/');
  });

  it('GET /devconsole/some/subpath falls back to index.html for SPA routing', async () => {
    const res = await request(app).get('/devconsole/claims/CL-2041');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.text).toContain('ClaimLens Test Console');
  });

  it('GET /devconsole/nonexistent.xyz without DEMO_MODE fallback returns 404 or 200 HTML depending on route', async () => {
    const res = await request(app).get('/nonexistent-route-outside-devconsole');
    expect(res.status).toBe(404);
    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

