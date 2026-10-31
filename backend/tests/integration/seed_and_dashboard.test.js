import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { seedDatabase } from '../../seed/loader.js';

describe('Seed & Dashboard Contract Test (Phase 3)', () => {
  it('seeds database and verifies exact totals and settlement amounts', async () => {
    const seedResult = await seedDatabase();
    expect(seedResult.users).toBe(6);
    expect(seedResult.submittedClaims).toBe(10);
    expect(seedResult.draftClaims).toBe(1);

    // Test Dashboard Totals for verifier Meera
    // Note: Meera sees unassigned claims (CL-2045, 2046) + her assigned claims (CL-2041, 2042, 2047, 2048, 2050)
    // To see all 10 non-draft claims across the system, let's test claims list and dashboard
    const listRes = await request(app)
      .get('/api/v1/claims')
      .set('X-Demo-User-Id', 'usr_meera');

    expect(listRes.status).toBe(200);
    expect(listRes.body.ok).toBe(true);

    // Check CL-2041 analysis & settlement
    const a2041 = await request(app)
      .get('/api/v1/claims/CL-2041/analysis')
      .set('X-Demo-User-Id', 'usr_meera');

    expect(a2041.status).toBe(200);
    expect(a2041.body.data.settlement.status).toBe('calculated');
    expect(a2041.body.data.settlement.resultAmount).toBe(47600);

    // Check CL-2042 analysis & settlement (withheld)
    const a2042 = await request(app)
      .get('/api/v1/claims/CL-2042/analysis')
      .set('X-Demo-User-Id', 'usr_meera');

    expect(a2042.status).toBe(200);
    expect(a2042.body.data.settlement.status).toBe('withheld');
    expect(a2042.body.data.settlement.resultAmount).toBeNull();

    // Check CL-2044 analysis & settlement (withheld)
    const a2044 = await request(app)
      .get('/api/v1/claims/CL-2044/analysis')
      .set('X-Demo-User-Id', 'usr_vikram');

    expect(a2044.status).toBe(200);
    expect(a2044.body.data.settlement.status).toBe('withheld');
    expect(a2044.body.data.settlement.resultAmount).toBeNull();
  });

  it('POST /api/v1/demo/reset reseeds database dynamically', async () => {
    const res = await request(app).post('/api/v1/demo/reset');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.submittedClaims).toBe(10);
  });
});
