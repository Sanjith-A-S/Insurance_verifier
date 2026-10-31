import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { seedDatabase } from '../../seed/loader.js';
import {
  ClaimSummarySchema,
  ClaimDetailSchema,
  ChecklistItemSchema,
  EvidenceFileSchema,
  AnalysisSchema,
  MessageSchema,
  EvidenceRequestSchema,
  DecisionSchema,
  apiSuccessSchema,
  ApiErrorSchema,
} from '../../../packages/shared/src/schemas.ts';
import { z } from 'zod';

describe('Shared Schema Contract Conformance Tests', () => {
  beforeEach(async () => {
    await seedDatabase();
  });

  it('validates GET /claims against ClaimSummarySchema for both roles', async () => {
    // Verifier
    const vRes = await request(app).get('/api/v1/claims').set('X-Demo-User-Id', 'usr_meera');
    expect(vRes.status).toBe(200);
    const vParsed = apiSuccessSchema(z.array(ClaimSummarySchema)).safeParse(vRes.body);
    expect(vParsed.success, JSON.stringify(vParsed.error?.issues)).toBe(true);

    // Claimant
    const cRes = await request(app).get('/api/v1/claims').set('X-Demo-User-Id', 'usr_aarav');
    expect(cRes.status).toBe(200);
    const cParsed = apiSuccessSchema(z.array(ClaimSummarySchema)).safeParse(cRes.body);
    expect(cParsed.success, JSON.stringify(cParsed.error?.issues)).toBe(true);
  });

  it('validates GET /claims/:id against ClaimDetailSchema', async () => {
    const res = await request(app).get('/api/v1/claims/CL-2041').set('X-Demo-User-Id', 'usr_meera');
    expect(res.status).toBe(200);
    const parsed = apiSuccessSchema(ClaimDetailSchema).safeParse(res.body);
    expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
  });

  it('validates GET /claims/:id/checklist against ChecklistItemSchema array', async () => {
    const res = await request(app).get('/api/v1/claims/CL-2041/checklist').set('X-Demo-User-Id', 'usr_aarav');
    expect(res.status).toBe(200);
    const parsed = apiSuccessSchema(z.array(ChecklistItemSchema)).safeParse(res.body);
    expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
  });

  it('validates GET /claims/:id/evidence against EvidenceFileSchema array', async () => {
    const res = await request(app).get('/api/v1/claims/CL-2041/evidence').set('X-Demo-User-Id', 'usr_meera');
    expect(res.status).toBe(200);
    const parsed = apiSuccessSchema(z.array(EvidenceFileSchema)).safeParse(res.body);
    expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
  });

  it('validates GET /claims/:id/analysis against AnalysisSchema', async () => {
    const res = await request(app).get('/api/v1/claims/CL-2041/analysis').set('X-Demo-User-Id', 'usr_meera');
    expect(res.status).toBe(200);
    const parsed = apiSuccessSchema(AnalysisSchema).safeParse(res.body);
    expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
  });

  it('validates GET /claims/:id/messages against MessageSchema array', async () => {
    const res = await request(app).get('/api/v1/claims/CL-2041/messages').set('X-Demo-User-Id', 'usr_aarav');
    expect(res.status).toBe(200);
    const parsed = apiSuccessSchema(z.array(MessageSchema)).safeParse(res.body);
    expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
  });

  it('validates GET /claims/:id/requests against EvidenceRequestSchema array', async () => {
    const res = await request(app).get('/api/v1/claims/CL-2043/requests').set('X-Demo-User-Id', 'usr_vikram');
    expect(res.status).toBe(200);
    const parsed = apiSuccessSchema(z.array(EvidenceRequestSchema)).safeParse(res.body);
    expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
  });

  it('validates GET /claims/:id/decisions against DecisionSchema array', async () => {
    const res = await request(app).get('/api/v1/claims/CL-2048/decisions').set('X-Demo-User-Id', 'usr_meera');
    expect(res.status).toBe(200);
    const parsed = apiSuccessSchema(z.array(DecisionSchema)).safeParse(res.body);
    expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
  });

  it('validates Error envelope against ApiErrorSchema', async () => {
    const res = await request(app).get('/api/v1/non-existent-endpoint');
    expect(res.status).toBe(404);
    const parsed = ApiErrorSchema.safeParse(res.body);
    expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
  });
});
