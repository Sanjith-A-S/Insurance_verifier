import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { app } from '../../src/app.js';
import { seedDatabase } from '../../seed/loader.js';

describe('Live HTTP Smoke Verification (scripts/smoke.mjs)', () => {
  let server;
  let baseUrl;

  beforeEach(async () => {
    await seedDatabase();
  });

  beforeAll(async () => {
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}/api/v1`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it('runs complete HTTP smoke lifecycle', async () => {
    process.env.API_BASE_URL = baseUrl;
    // Dynamically run smoke
    const healthRes = await fetch(`${baseUrl}/health`);
    expect(healthRes.status).toBe(200);
    const healthJson = await healthRes.json();
    expect(healthJson.ok).toBe(true);

    const usersRes = await fetch(`${baseUrl}/demo/users`);
    expect(usersRes.status).toBe(200);

    const claimRes = await fetch(`${baseUrl}/claims`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Demo-User-Id': 'usr_aarav',
      },
      body: JSON.stringify({
        incident: { date: '2026-10-25', location: 'Delhi', visibleDamageAreas: ['front'] },
        vehicle: { registrationNumber: 'DL-01-AB-1234', make: 'Maruti', model: 'Swift', year: 2022 },
        driver: { isPolicyholder: true, name: 'Aarav Kumar' },
        narrative: 'Smoke test run',
        policy: { policyNumber: 'POL-SMOKE-1' },
      }),
    });
    expect(claimRes.status).toBe(201);
    const claim = await claimRes.json();
    expect(claim.data.id).toMatch(/^CL-\d{4,}$/);
  });
});
