import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { User } from '../../src/models/user.model.js';
import { Claim } from '../../src/models/claim.model.js';

describe('Collaboration, Notes & Decisions Flow (Stream C)', () => {
  let claimId = 'CL-2041';

  beforeEach(async () => {
    await User.create([
      { _id: 'usr_aarav', name: 'Aarav Kumar', email: 'aarav@example.com', role: 'claimant' },
      { _id: 'usr_meera', name: 'Meera Iyer', email: 'meera@example.com', role: 'verifier' },
    ]);

    await Claim.create({
      _id: claimId,
      claimantId: 'usr_aarav',
      assigneeId: 'usr_meera',
      status: 'in_review',
      incident: { date: '2026-06-15', location: 'Delhi', visibleDamageAreas: ['front'] },
      vehicle: { registrationNumber: 'KA-01-MJ-5021', make: 'Hyundai', model: 'Creta', year: 2023 },
      checklist: [
        { id: 'driving_licence', category: 'driver', label: 'Driving Licence', requirement: 'required', status: 'not_started' },
      ],
    });
  });

  it('messages: post, retrieve, and mark read', async () => {
    // Verifier posts message
    const msgRes = await request(app)
      .post(`/api/v1/claims/${claimId}/messages`)
      .set('X-Demo-User-Id', 'usr_meera')
      .send({ body: 'Hello Aarav, please confirm the workshop location.' });

    expect(msgRes.status).toBe(201);
    expect(msgRes.body.ok).toBe(true);

    // Claimant lists messages
    const listRes = await request(app)
      .get(`/api/v1/claims/${claimId}/messages`)
      .set('X-Demo-User-Id', 'usr_aarav');

    expect(listRes.status).toBe(200);
    expect(listRes.body.data).toHaveLength(1);
    expect(listRes.body.data[0].read).toBe(false);

    // Claimant marks read
    const readRes = await request(app)
      .post(`/api/v1/claims/${claimId}/messages/read`)
      .set('X-Demo-User-Id', 'usr_aarav');
    expect(readRes.status).toBe(200);

    // Re-check
    const listRes2 = await request(app)
      .get(`/api/v1/claims/${claimId}/messages`)
      .set('X-Demo-User-Id', 'usr_aarav');
    expect(listRes2.body.data[0].read).toBe(true);
  });

  it('evidence requests lifecycle: send -> response -> resolve transitions claim status', async () => {
    // Verifier creates sent request
    const createReq = await request(app)
      .post(`/api/v1/claims/${claimId}/requests`)
      .set('X-Demo-User-Id', 'usr_meera')
      .send({
        title: 'Clear Driving Licence Scan',
        reason: 'The current image is blurred at the date of expiry field.',
        checklistItemId: 'driving_licence',
        status: 'sent',
      });

    expect(createReq.status).toBe(201);
    const reqId = createReq.body.data.id;

    // Check claim status transitioned to 'awaiting_claimant'
    const claimRes1 = await request(app)
      .get(`/api/v1/claims/${claimId}`)
      .set('X-Demo-User-Id', 'usr_aarav');
    expect(claimRes1.body.data.status).toBe('awaiting_claimant');

    // Claimant submits response (marked unavailable with reason)
    const respRes = await request(app)
      .post(`/api/v1/claims/${claimId}/requests/${reqId}/responses`)
      .set('X-Demo-User-Id', 'usr_aarav')
      .send({
        unavailable: true,
        reason: 'Physical licence is currently deposited at regional transport office.',
      });

    expect(respRes.status).toBe(201);
    expect(respRes.body.data.status).toBe('response_submitted');

    // Verifier resolves request
    const resolveRes = await request(app)
      .patch(`/api/v1/claims/${claimId}/requests/${reqId}`)
      .set('X-Demo-User-Id', 'usr_meera')
      .send({ action: 'resolve' });

    expect(resolveRes.status).toBe(200);
    expect(resolveRes.body.data.status).toBe('resolved');

    // Last open request resolved -> claim status reverts to 'in_review'
    const claimRes2 = await request(app)
      .get(`/api/v1/claims/${claimId}`)
      .set('X-Demo-User-Id', 'usr_meera');
    expect(claimRes2.body.data.status).toBe('in_review');
  });

  it('private notes: verifier only, claimant gets 403 FORBIDDEN', async () => {
    // Verifier creates private note
    const noteRes = await request(app)
      .post(`/api/v1/claims/${claimId}/private-notes`)
      .set('X-Demo-User-Id', 'usr_meera')
      .send({ body: 'Confidential assessment: verified workshop credibility directly with manager.' });

    expect(noteRes.status).toBe(201);
    expect(noteRes.body.ok).toBe(true);

    // Verifier reads private notes -> 200 OK
    const vRead = await request(app)
      .get(`/api/v1/claims/${claimId}/private-notes`)
      .set('X-Demo-User-Id', 'usr_meera');
    expect(vRead.status).toBe(200);
    expect(vRead.body.data).toHaveLength(1);

    // Claimant attempts to read private notes -> 403 FORBIDDEN
    const cRead = await request(app)
      .get(`/api/v1/claims/${claimId}/private-notes`)
      .set('X-Demo-User-Id', 'usr_aarav');
    expect(cRead.status).toBe(403);
    expect(cRead.body.ok).toBe(false);
  });

  it('decisions: recommend_approve -> decision_pending; closed -> completed (writes locked 409)', async () => {
    // Recommend approve
    const dec1 = await request(app)
      .post(`/api/v1/claims/${claimId}/decisions`)
      .set('X-Demo-User-Id', 'usr_meera')
      .send({
        decision: 'recommend_approve',
        rationale: 'Loss assessment fully consistent with workshop parts estimate.',
        recommendedAmount: 47600,
      });

    expect(dec1.status).toBe(201);
    const c1 = await request(app).get(`/api/v1/claims/${claimId}`).set('X-Demo-User-Id', 'usr_meera');
    expect(c1.body.data.status).toBe('decision_pending');

    // Close claim
    const dec2 = await request(app)
      .post(`/api/v1/claims/${claimId}/decisions`)
      .set('X-Demo-User-Id', 'usr_meera')
      .send({
        decision: 'closed',
        rationale: 'Claim payment advice disbursed and file closed.',
      });

    expect(dec2.status).toBe(201);
    const c2 = await request(app).get(`/api/v1/claims/${claimId}`).set('X-Demo-User-Id', 'usr_meera');
    expect(c2.body.data.status).toBe('completed');

    // Modifying completed claim returns 409 CONFLICT
    const modifyAttempt = await request(app)
      .post(`/api/v1/claims/${claimId}/assign`)
      .set('X-Demo-User-Id', 'usr_meera')
      .send({ assigneeId: 'me' });

    expect(modifyAttempt.status).toBe(409);
    expect(modifyAttempt.body.error.code).toBe('CONFLICT');
  });

  it('recommendation never mutates claim data (snapshot before/after test)', async () => {
    const claimBefore = await Claim.findById(claimId).lean();

    // Verifier generates recommendation
    const recRes = await request(app)
      .post(`/api/v1/claims/${claimId}/recommendation`)
      .set('X-Demo-User-Id', 'usr_meera')
      .send({ offerToClaimant: true });

    expect(recRes.status).toBe(201);
    expect(recRes.body.ok).toBe(true);

    const claimAfter = await Claim.findById(claimId).lean();

    // Verify claim status, checklist, vehicle, etc. are identical
    expect(claimBefore.status).toBe(claimAfter.status);
    expect(claimBefore.assigneeId).toBe(claimAfter.assigneeId);
    expect(claimBefore.incident).toEqual(claimAfter.incident);
    expect(claimBefore.vehicle).toEqual(claimAfter.vehicle);
  });
});

