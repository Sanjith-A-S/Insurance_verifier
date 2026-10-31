import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { User } from '../../src/models/user.model.js';
import { Claim } from '../../src/models/claim.model.js';
import { EvidenceFile } from '../../src/models/evidenceFile.model.js';

describe('Analysis & Settlement Flow (Stream B)', () => {
  let claimId = 'CL-2041';

  beforeEach(async () => {
    await User.create([
      { _id: 'usr_aarav', name: 'Aarav Kumar', email: 'aarav@example.com', role: 'claimant' },
      { _id: 'usr_meera', name: 'Meera Iyer', email: 'meera@example.com', role: 'verifier' },
    ]);

    await Claim.create({
      _id: claimId,
      claimantId: 'usr_aarav',
      status: 'in_review',
      assigneeId: 'usr_meera',
      incident: { date: '2026-06-15', location: 'Delhi', visibleDamageAreas: ['front'] },
      vehicle: { registrationNumber: 'KA-01-MJ-5021', make: 'Hyundai', model: 'Creta', year: 2023, vin: 'MALC141CMKM123456' },
      checklist: [
        { id: 'policy_schedule', category: 'policy', label: 'Policy Schedule', requirement: 'required', status: 'received' },
        { id: 'repair_estimate', category: 'repair_loss', label: 'Repair Estimate', requirement: 'required', status: 'received' },
      ],
    });

    await EvidenceFile.create([
      {
        _id: 'EV-CL-2041-01',
        claimId,
        category: 'policy',
        fileName: 'policy.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1024,
        sha256: 'sha_pol_1',
        uploadedBy: { id: 'usr_aarav', name: 'Aarav Kumar', role: 'claimant' },
        storageKey: `claims/${claimId}/policy.pdf`,
      },
      {
        _id: 'EV-CL-2041-02',
        claimId,
        category: 'repair_loss',
        fileName: 'estimate.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 2048,
        sha256: 'sha_est_1',
        uploadedBy: { id: 'usr_aarav', name: 'Aarav Kumar', role: 'claimant' },
        storageKey: `claims/${claimId}/estimate.pdf`,
      },
    ]);
  });

  it('triggers async 202 analysis, polls status, and retrieves ready analysis', async () => {
    const triggerRes = await request(app)
      .post(`/api/v1/claims/${claimId}/analysis`)
      .set('X-Demo-User-Id', 'usr_meera');

    expect(triggerRes.status).toBe(202);
    expect(triggerRes.body.ok).toBe(true);
    expect(triggerRes.body.data.analysisId).toBeDefined();
    expect(triggerRes.body.data.version).toBe(1);

    // Wait a tick for async execution
    await new Promise((r) => setTimeout(r, 200));

    // Poll status
    const statusRes = await request(app)
      .get(`/api/v1/claims/${claimId}/analysis/status`)
      .set('X-Demo-User-Id', 'usr_meera');

    expect(statusRes.status).toBe(200);
    expect(statusRes.body.data.state).toBe('ready');

    // Retrieve full analysis
    const analysisRes = await request(app)
      .get(`/api/v1/claims/${claimId}/analysis`)
      .set('X-Demo-User-Id', 'usr_meera');

    expect(analysisRes.status).toBe(200);
    expect(analysisRes.body.ok).toBe(true);
    const analysis = analysisRes.body.data;
    expect(analysis.version).toBe(1);
    expect(analysis.extractedFacts.length).toBeGreaterThan(0);
    expect(analysis.matrix.rows.length).toBeGreaterThan(0);
    expect(analysis.settlement).toBeDefined();

    // Verify CL-2041 computed amount = ₹47,600
    expect(analysis.settlement.status).toBe('calculated');
    expect(analysis.settlement.resultAmount).toBe(47600);
  });

  it('settlement recalculate and override workflow', async () => {
    // Run initial analysis first
    await request(app)
      .post(`/api/v1/claims/${claimId}/analysis`)
      .set('X-Demo-User-Id', 'usr_meera');
    await new Promise((r) => setTimeout(r, 200));

    // Recalculate settlement
    const recalcRes = await request(app)
      .post(`/api/v1/claims/${claimId}/settlement/recalculate`)
      .set('X-Demo-User-Id', 'usr_meera');

    expect(recalcRes.status).toBe(200);
    expect(recalcRes.body.ok).toBe(true);
    expect(recalcRes.body.data.resultAmount).toBe(47600);

    // Record an override
    const overrideRes = await request(app)
      .post(`/api/v1/claims/${claimId}/settlement/override`)
      .set('X-Demo-User-Id', 'usr_meera')
      .send({
        amount: 45000,
        rationale: 'Approved with discretionary salvage deduction agreed with claimant',
      });

    expect(overrideRes.status).toBe(200);
    expect(overrideRes.body.ok).toBe(true);
    // Spec §12: Override NEVER changes resultAmount!
    expect(overrideRes.body.data.resultAmount).toBe(47600);
    expect(overrideRes.body.data.overrides).toHaveLength(1);
    expect(overrideRes.body.data.overrides[0].amount).toBe(45000);
  });
});
