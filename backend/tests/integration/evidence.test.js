import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { User } from '../../src/models/user.model.js';
import { Claim } from '../../src/models/claim.model.js';
import { EvidenceFile } from '../../src/models/evidenceFile.model.js';

describe('Evidence & File Upload Flow (Stream A)', () => {
  let claimId = 'CL-2041';

  beforeEach(async () => {
    await User.create([
      { _id: 'usr_aarav', name: 'Aarav Kumar', email: 'aarav@example.com', role: 'claimant' },
      { _id: 'usr_rohan', name: 'Rohan Das', email: 'rohan@example.com', role: 'claimant' },
      { _id: 'usr_meera', name: 'Meera Iyer', email: 'meera@example.com', role: 'verifier' },
    ]);

    await Claim.create({
      _id: claimId,
      claimantId: 'usr_aarav',
      status: 'new',
      incident: { date: '2026-10-15', location: 'Delhi', visibleDamageAreas: ['front'] },
      vehicle: { registrationNumber: 'DL-01-AB-1234', make: 'Maruti', model: 'Swift', year: 2022 },
      checklist: [
        { id: 'photo_front', category: 'photos_video', label: 'Front Photo', requirement: 'required', status: 'not_started' },
      ],
    });
  });

  it('rejects unsupported file extension with 422 UPLOAD_REJECTED', async () => {
    const res = await request(app)
      .post(`/api/v1/claims/${claimId}/evidence`)
      .set('X-Demo-User-Id', 'usr_aarav')
      .attach('file', Buffer.from('console.log("bad")'), 'script.exe');

    expect(res.status).toBe(422);
    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe('UPLOAD_REJECTED');
  });

  it('accepts valid PNG image and processes metadata asynchronously', async () => {
    // 1x1 transparent PNG buffer
    const pngBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );

    const res = await request(app)
      .post(`/api/v1/claims/${claimId}/evidence`)
      .set('X-Demo-User-Id', 'usr_aarav')
      .field('checklistItemId', 'photo_front')
      .attach('file', pngBuffer, 'photo.png');

    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    const evidence = res.body.data;
    expect(evidence.id).toMatch(/^EV-CL-2041-\d{2,}$/);
    expect(evidence.mimeType).toBe('image/png');
    expect(evidence.checklistItemId).toBe('photo_front');

    // Claimant sees neutral reviewStatus and safe provenance
    expect(evidence.reviewStatus).toBe('pending');
    expect(evidence.provenance.duplicateOfIds).toEqual([]);
    expect(evidence.reviewNote).toBeUndefined();

    // Verify raw file download via GET /file
    const fileRes = await request(app)
      .get(`/api/v1/claims/${claimId}/evidence/${evidence.id}/file`)
      .set('X-Demo-User-Id', 'usr_aarav');

    expect(fileRes.status).toBe(200);
    expect(fileRes.headers['content-type']).toBe('image/png');
    expect(fileRes.headers['x-content-type-options']).toBe('nosniff');

    // Unauthorized claimant gets 404
    const rogueFile = await request(app)
      .get(`/api/v1/claims/${claimId}/evidence/${evidence.id}/file`)
      .set('X-Demo-User-Id', 'usr_rohan');
    expect(rogueFile.status).toBe(404);

    // Verifier reviews file -> reviewed
    const reviewRes = await request(app)
      .post(`/api/v1/claims/${claimId}/evidence/${evidence.id}/review`)
      .set('X-Demo-User-Id', 'usr_meera')
      .send({ status: 'reviewed', note: 'Clear front bumper view' });

    expect(reviewRes.status).toBe(200);
    expect(reviewRes.body.data.reviewStatus).toBe('reviewed');
    expect(reviewRes.body.data.reviewNote).toBe('Clear front bumper view');
  });

  it('detects duplicate SHA-256 within the same claim as duplicate_candidate', async () => {
    const pngBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );

    // Upload first file
    const res1 = await request(app)
      .post(`/api/v1/claims/${claimId}/evidence`)
      .set('X-Demo-User-Id', 'usr_aarav')
      .attach('file', pngBuffer, 'photo1.png');
    expect(res1.status).toBe(201);

    // Wait a tick for async processing
    await new Promise((r) => setTimeout(r, 150));

    // Upload identical bytes as second file
    const res2 = await request(app)
      .post(`/api/v1/claims/${claimId}/evidence`)
      .set('X-Demo-User-Id', 'usr_aarav')
      .attach('file', pngBuffer, 'photo2.png');
    expect(res2.status).toBe(201);

    await new Promise((r) => setTimeout(r, 150));

    // Verifier inspects second file -> sees duplicate_candidate in provenance
    const verifierGet = await request(app)
      .get(`/api/v1/claims/${claimId}/evidence/${res2.body.data.id}`)
      .set('X-Demo-User-Id', 'usr_meera');

    expect(verifierGet.status).toBe(200);
    expect(verifierGet.body.data.provenance.statuses).toContain('duplicate_candidate');
    expect(verifierGet.body.data.provenance.duplicateOfIds).toContain(res1.body.data.id);
  });
});

