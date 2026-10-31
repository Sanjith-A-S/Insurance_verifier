import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { User } from '../../src/models/user.model.js';
import { EvidenceFile } from '../../src/models/evidenceFile.model.js';

describe('Claims & Authorization Flow', () => {
  beforeEach(async () => {
    await User.create([
      { _id: 'usr_aarav', name: 'Aarav Kumar', email: 'aarav@example.com', role: 'claimant' },
      { _id: 'usr_rohan', name: 'Rohan Das', email: 'rohan@example.com', role: 'claimant' },
      { _id: 'usr_meera', name: 'Meera Iyer', email: 'meera@example.com', role: 'verifier' },
      { _id: 'usr_vikram', name: 'Vikram Shah', email: 'vikram@example.com', role: 'verifier' },
    ]);
  });

  it('rejects unauthenticated requests with 401', async () => {
    const res = await request(app).get('/api/v1/claims');
    expect(res.status).toBe(401);
    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('claimant creates draft, checks initial checklist and cannot submit without photo + document', async () => {
    const draftData = {
      incident: {
        date: '2026-10-25',
        time: '14:30',
        location: 'MG Road, Bangalore',
        type: 'collision',
        visibleDamageAreas: ['front'],
      },
      vehicle: {
        registrationNumber: 'KA-01-MJ-5021',
        make: 'Hyundai',
        model: 'Creta',
        year: 2023,
      },
      driver: {
        isPolicyholder: true,
        name: 'Aarav Kumar',
        relationship: 'Self',
        licenceNumber: 'KA0120180012345',
      },
      narrative: 'Rear-ended at traffic signal.',
      policy: {
        policyNumber: 'POL-HYU-9921',
        insurer: 'National Insurance',
      },
    };

    const createRes = await request(app)
      .post('/api/v1/claims')
      .set('X-Demo-User-Id', 'usr_aarav')
      .send(draftData);

    expect(createRes.status).toBe(201);
    expect(createRes.body.ok).toBe(true);
    const claim = createRes.body.data;
    expect(claim.id).toMatch(/^CL-\d{4,}$/);
    expect(claim.status).toBe('draft');
    expect(claim.checklist.length).toBeGreaterThan(0);

    // Try submit without evidence -> 400 with fields
    const submitRes = await request(app)
      .post(`/api/v1/claims/${claim.id}/submit`)
      .set('X-Demo-User-Id', 'usr_aarav');

    expect(submitRes.status).toBe(400);
    expect(submitRes.body.ok).toBe(false);
    expect(submitRes.body.error.code).toBe('VALIDATION_ERROR');
    expect(submitRes.body.error.fields).toBeDefined();

    // Add 1 photo and 1 document
    await EvidenceFile.create([
      {
        _id: `EV-${claim.id}-01`,
        claimId: claim.id,
        category: 'photos_video',
        fileName: 'damage.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 1024,
        sha256: 'fakehash1',
        uploadedBy: { id: 'usr_aarav', name: 'Aarav Kumar', role: 'claimant' },
        storageKey: `claims/${claim.id}/fake1.jpg`,
      },
      {
        _id: `EV-${claim.id}-02`,
        claimId: claim.id,
        category: 'policy',
        fileName: 'policy.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 2048,
        sha256: 'fakehash2',
        uploadedBy: { id: 'usr_aarav', name: 'Aarav Kumar', role: 'claimant' },
        storageKey: `claims/${claim.id}/fake2.pdf`,
      },
    ]);

    // Submit now succeeds
    const submitSuccess = await request(app)
      .post(`/api/v1/claims/${claim.id}/submit`)
      .set('X-Demo-User-Id', 'usr_aarav');

    expect(submitSuccess.status).toBe(200);
    expect(submitSuccess.body.ok).toBe(true);
    expect(submitSuccess.body.data.status).toBe('new');

    // Submitting again is idempotent
    const submitAgain = await request(app)
      .post(`/api/v1/claims/${claim.id}/submit`)
      .set('X-Demo-User-Id', 'usr_aarav');
    expect(submitAgain.status).toBe(200);
    expect(submitAgain.body.data.status).toBe('new');

    // Claimant B cannot see Claimant A's claim -> 404 NOT_FOUND
    const rogueRes = await request(app)
      .get(`/api/v1/claims/${claim.id}`)
      .set('X-Demo-User-Id', 'usr_rohan');
    expect(rogueRes.status).toBe(404);
    expect(rogueRes.body.ok).toBe(false);

    // Verifier Meera sees the new claim in list and detail
    const verifierGet = await request(app)
      .get(`/api/v1/claims/${claim.id}`)
      .set('X-Demo-User-Id', 'usr_meera');
    expect(verifierGet.status).toBe(200);
    expect(verifierGet.body.data.claimantName).toBe('Aarav Kumar');

    // Verifier assigns claim to herself
    const assignRes = await request(app)
      .post(`/api/v1/claims/${claim.id}/assign`)
      .set('X-Demo-User-Id', 'usr_meera')
      .send({ assigneeId: 'me' });
    expect(assignRes.status).toBe(200);
    expect(assignRes.body.data.assigneeId).toBe('usr_meera');
    expect(assignRes.body.data.status).toBe('in_review');

    // Other verifier cannot see claim assigned to Meera -> 404 NOT_FOUND
    const otherVerifier = await request(app)
      .get(`/api/v1/claims/${claim.id}`)
      .set('X-Demo-User-Id', 'usr_vikram');
    expect(otherVerifier.status).toBe(404);

    // Claimant cannot access verifier dashboard -> 403 FORBIDDEN
    const claimantDash = await request(app)
      .get('/api/v1/investigator/dashboard')
      .set('X-Demo-User-Id', 'usr_aarav');
    expect(claimantDash.status).toBe(403);

    // Verifier Meera accesses dashboard -> 200 OK
    const verifierDash = await request(app)
      .get('/api/v1/investigator/dashboard')
      .set('X-Demo-User-Id', 'usr_meera');
    expect(verifierDash.status).toBe(200);
    expect(verifierDash.body.data.totals.in_review).toBe(1);
  });
});
