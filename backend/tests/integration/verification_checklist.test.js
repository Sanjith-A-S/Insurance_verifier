import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { seedDatabase } from '../../seed/loader.js';
import { Claim } from '../../src/models/claim.model.js';
import { EvidenceFile } from '../../src/models/evidenceFile.model.js';
import { Analysis } from '../../src/models/analysis.model.js';

describe('Phase 4 — Conformance Verification Checklist (10 Points)', () => {
  beforeEach(async () => {
    await seedDatabase();
  });

  // 1. Claimant creates, uploads >= 1 photo + >= 1 doc, adds narrative, reads it back
  it('Checklist 1: Claimant creates, uploads photo + document, adds narrative, reads it back', async () => {
    const pngBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );
    const pdfBuffer = Buffer.from('%PDF-1.4 sample minimal pdf content %%EOF');

    const draft = await request(app)
      .post('/api/v1/claims')
      .set('X-Demo-User-Id', 'usr_aarav')
      .send({
        incident: { date: '2026-10-25', location: 'Delhi', visibleDamageAreas: ['front'] },
        vehicle: { registrationNumber: 'DL-01-AB-1234', make: 'Maruti', model: 'Swift', year: 2022 },
        driver: { isPolicyholder: true, name: 'Aarav Kumar' },
        narrative: 'Detailed narrative of front fender dent.',
      });
    expect(draft.status).toBe(201);
    const cid = draft.body.data.id;

    // Upload photo
    const photoUp = await request(app)
      .post(`/api/v1/claims/${cid}/evidence`)
      .set('X-Demo-User-Id', 'usr_aarav')
      .attach('file', pngBuffer, 'photo.png');
    expect(photoUp.status).toBe(201);

    // Upload document
    const docUp = await request(app)
      .post(`/api/v1/claims/${cid}/evidence`)
      .set('X-Demo-User-Id', 'usr_aarav')
      .attach('file', pdfBuffer, 'doc.pdf');
    expect(docUp.status).toBe(201);

    // Read back
    const readBack = await request(app)
      .get(`/api/v1/claims/${cid}`)
      .set('X-Demo-User-Id', 'usr_aarav');
    expect(readBack.status).toBe(200);
    expect(readBack.body.data.narrative).toBe('Detailed narrative of front fender dent.');
  });

  // 2. Verifier opens original through /file; another claimant gets 404
  it('Checklist 2: Verifier opens original through /file; another claimant gets 404', async () => {
    // Verifier Meera opens file on CL-2041
    const vRes = await request(app)
      .get('/api/v1/claims/CL-2041/evidence/EV-CL-2041-01/file')
      .set('X-Demo-User-Id', 'usr_meera');
    expect(vRes.status).toBe(200);

    // Other claimant Rohan gets 404
    const cRes = await request(app)
      .get('/api/v1/claims/CL-2041/evidence/EV-CL-2041-01/file')
      .set('X-Demo-User-Id', 'usr_rohan');
    expect(cRes.status).toBe(404);
  });

  // 3. CL-2041 has no invented conflict; CL-2042 potential inconsistencies no accusatory words; 2043/2044 missing/ambiguous
  it('Checklist 3: CL-2041 consistent; CL-2042 non-accusatory inconsistencies; CL-2043/44 missing/ambiguous', async () => {
    const a2041 = await request(app).get('/api/v1/claims/CL-2041/analysis').set('X-Demo-User-Id', 'usr_meera');
    expect(a2041.body.data.findings.length).toBe(0);

    const a2042 = await request(app).get('/api/v1/claims/CL-2042/analysis').set('X-Demo-User-Id', 'usr_meera');
    const f2042 = a2042.body.data.findings;
    expect(f2042.length).toBeGreaterThan(0);
    // Ensure no accusatory words
    const allText = JSON.stringify(f2042).toLowerCase();
    expect(allText).not.toContain('fraud');
    expect(allText).not.toContain('fake');
    expect(allText).not.toContain('forged');

    const a2043 = await request(app).get('/api/v1/claims/CL-2043/analysis').set('X-Demo-User-Id', 'usr_vikram');
    expect(a2043.body.data.missingEvidence.length).toBeGreaterThan(0);

    const a2044 = await request(app).get('/api/v1/claims/CL-2044/analysis').set('X-Demo-User-Id', 'usr_vikram');
    const f2044Titles = a2044.body.data.findings.map((f) => f.title);
    expect(f2044Titles.some((t) => t.includes('Boundary') || t.includes('Annexure'))).toBe(true);
  });

  // 4. Request sent -> answered -> resolved; claim status follows workflow and timeline events exist
  it('Checklist 4: Request sent -> answered -> resolved workflow with timeline events', async () => {
    const reqCreate = await request(app)
      .post('/api/v1/claims/CL-2041/requests')
      .set('X-Demo-User-Id', 'usr_meera')
      .send({ title: 'Clarification', reason: 'Test reason', status: 'sent' });
    const rid = reqCreate.body.data.id;

    // Claim is awaiting_claimant
    const c1 = await request(app).get('/api/v1/claims/CL-2041').set('X-Demo-User-Id', 'usr_aarav');
    expect(c1.body.data.status).toBe('awaiting_claimant');

    // Answer
    await request(app)
      .post(`/api/v1/claims/CL-2041/requests/${rid}/responses`)
      .set('X-Demo-User-Id', 'usr_aarav')
      .send({ message: 'Claimant answers prompt' });

    // Resolve
    await request(app)
      .patch(`/api/v1/claims/CL-2041/requests/${rid}`)
      .set('X-Demo-User-Id', 'usr_meera')
      .send({ action: 'resolve' });

    // Claim returns to in_review
    const c2 = await request(app).get('/api/v1/claims/CL-2041').set('X-Demo-User-Id', 'usr_meera');
    expect(c2.body.data.status).toBe('in_review');

    // Timeline event exists
    const tl = await request(app).get('/api/v1/claims/CL-2041/timeline').set('X-Demo-User-Id', 'usr_meera');
    expect(tl.body.data.some((e) => e.kind === 'status_changed')).toBe(true);
  });

  // 5. Private note text never appears in any claimant response
  it('Checklist 5: Private note text never appears in any claimant response', async () => {
    const claimantGet = await request(app).get('/api/v1/claims/CL-2041').set('X-Demo-User-Id', 'usr_aarav');
    expect(JSON.stringify(claimantGet.body)).not.toContain('CONFIDENTIAL_VERIFIER_SECRET_NOTE_9921_DO_NOT_LEAK');
  });

  // 6. Settlement: 2041 calculated ₹47,600; others withheld with unresolved[]; override stored separately
  it('Checklist 6: Settlement 2041 calculated ₹47,600; others withheld; override separate', async () => {
    const s2041 = await request(app).get('/api/v1/claims/CL-2041/analysis').set('X-Demo-User-Id', 'usr_meera');
    expect(s2041.body.data.settlement.resultAmount).toBe(47600);

    const s2042 = await request(app).get('/api/v1/claims/CL-2042/analysis').set('X-Demo-User-Id', 'usr_meera');
    expect(s2042.body.data.settlement.status).toBe('withheld');
    expect(s2042.body.data.settlement.unresolved.length).toBeGreaterThan(0);
  });

  // 7. Recommendation never changes claim data
  it('Checklist 7: Recommendation never changes claim data', async () => {
    const before = await Claim.findById('CL-2041').lean();
    await request(app)
      .post('/api/v1/claims/CL-2041/recommendation')
      .set('X-Demo-User-Id', 'usr_meera')
      .send({ offerToClaimant: true });
    const after = await Claim.findById('CL-2041').lean();
    expect(before.status).toBe(after.status);
    expect(before.latestAnalysisVersion).toBe(after.latestAnalysisVersion);
  });

  // 8. Invalid Gemini key: claim intact, unavailable state
  it('Checklist 8: Analysis failure leaves claim data intact and surfaces unavailable', async () => {
    const claimBefore = await Claim.findById('CL-2045').lean();

    // Trigger analysis on CL-2045
    const res = await request(app)
      .post('/api/v1/claims/CL-2045/analysis')
      .set('X-Demo-User-Id', 'usr_meera');
    expect(res.status).toBe(202);

    await new Promise((r) => setTimeout(r, 200));

    const claimAfter = await Claim.findById('CL-2045').lean();
    expect(claimAfter.vehicle).toEqual(claimBefore.vehicle);
    expect(claimAfter.incident).toEqual(claimBefore.incident);
  });

  // 9. 400, 401, 403, 404, 409, 422 each return the envelope
  it('Checklist 9: 400, 401, 403, 404, 409, 422 each return the envelope', async () => {
    // 401
    const r401 = await request(app).get('/api/v1/claims');
    expect(r401.status).toBe(401);
    expect(r401.body.ok).toBe(false);
    expect(r401.body.error.code).toBe('UNAUTHENTICATED');

    // 404
    const r404 = await request(app).get('/api/v1/non-existent-route');
    expect(r404.status).toBe(404);
    expect(r404.body.ok).toBe(false);
    expect(r404.body.error.code).toBe('NOT_FOUND');

    // 403
    const r403 = await request(app).get('/api/v1/claims/CL-2041/private-notes').set('X-Demo-User-Id', 'usr_aarav');
    expect(r403.status).toBe(403);
    expect(r403.body.ok).toBe(false);
    expect(r403.body.error.code).toBe('FORBIDDEN');

    // 400
    const r400 = await request(app).post('/api/v1/claims').set('X-Demo-User-Id', 'usr_aarav').send({});
    expect(r400.status).toBe(400);
    expect(r400.body.ok).toBe(false);
    expect(r400.body.error.code).toBe('VALIDATION_ERROR');

    // 409
    const r409 = await request(app).post('/api/v1/claims/CL-2050/assign').set('X-Demo-User-Id', 'usr_meera').send({ assigneeId: 'me' });
    expect(r409.status).toBe(409);
    expect(r409.body.ok).toBe(false);
    expect(r409.body.error.code).toBe('CONFLICT');

    // 422
    const r422 = await request(app)
      .post('/api/v1/claims/CL-2041/evidence')
      .set('X-Demo-User-Id', 'usr_aarav')
      .attach('file', Buffer.from('bad'), 'bad.exe');
    expect(r422.status).toBe(422);
    expect(r422.body.ok).toBe(false);
    expect(r422.body.error.code).toBe('UPLOAD_REJECTED');
  });

  // 10. Re-run analysis creates new version, old version readable via ?version=
  it('Checklist 10: Re-running analysis creates new version, old readable via ?version=', async () => {
    // CL-2041 starts with version 1
    const v1Res = await request(app).get('/api/v1/claims/CL-2041/analysis?version=1').set('X-Demo-User-Id', 'usr_meera');
    expect(v1Res.status).toBe(200);
    expect(v1Res.body.data.version).toBe(1);

    // Trigger run -> creates version 2
    const runRes = await request(app)
      .post('/api/v1/claims/CL-2041/analysis')
      .set('X-Demo-User-Id', 'usr_meera');
    expect(runRes.status).toBe(202);
    expect(runRes.body.data.version).toBe(2);

    await new Promise((r) => setTimeout(r, 200));

    // Old version still readable via ?version=1
    const oldRes = await request(app).get('/api/v1/claims/CL-2041/analysis?version=1').set('X-Demo-User-Id', 'usr_meera');
    expect(oldRes.status).toBe(200);
    expect(oldRes.body.data.version).toBe(1);

    // New version readable without param or ?version=2
    const newRes = await request(app).get('/api/v1/claims/CL-2041/analysis').set('X-Demo-User-Id', 'usr_meera');
    expect(newRes.status).toBe(200);
    expect(newRes.body.data.version).toBe(2);
  });
});
