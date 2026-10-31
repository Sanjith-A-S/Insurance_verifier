import { describe, it, expect } from 'vitest';
import { User } from '../../src/models/user.model.js';
import { Claim } from '../../src/models/claim.model.js';
import { Counter } from '../../src/models/counter.model.js';
import { EvidenceFile } from '../../src/models/evidenceFile.model.js';
import { Analysis } from '../../src/models/analysis.model.js';
import { ExtractedFact } from '../../src/models/extractedFact.model.js';
import { FindingReview } from '../../src/models/findingReview.model.js';
import { MatrixAnnotation } from '../../src/models/matrixAnnotation.model.js';
import { SettlementCalculation, SettlementOverride } from '../../src/models/settlement.model.js';
import { EvidenceRequest } from '../../src/models/evidenceRequest.model.js';
import { ClaimMessage } from '../../src/models/claimMessage.model.js';
import { PrivateNote } from '../../src/models/privateNote.model.js';
import { TimelineEvent } from '../../src/models/timelineEvent.model.js';
import { Decision } from '../../src/models/decision.model.js';
import { Recommendation } from '../../src/models/recommendation.model.js';

import { runDeterministicRules } from '../../src/rules/deterministic.js';
import { calculateSettlement } from '../../src/rules/settlement.js';
import { buildEvidenceMatrix } from '../../src/rules/matrix.js';
import { validateAndSanitizeFindings, containsBannedLanguage, sanitizeBannedLanguage } from '../../src/ai/safety.js';
import { initiateAnalysis, executeAnalysisPipeline } from '../../src/ai/pipeline.js';
import { createRecommendationOffer, getRecommendation } from '../../src/modules/recommendations/service.js';
import { generateClaimId } from '../../src/lib/ids.js';

describe('Comprehensive AI Features & Database Health Suite', () => {
  const verifierActor = { id: 'usr_meera', name: 'Meera Iyer', role: 'verifier', email: 'meera@claimlens.demo' };
  const claimantActor = { id: 'usr_aarav', name: 'Aarav Kumar', role: 'claimant', email: 'aarav@claimlens.demo' };

  // ==========================================
  // SECTION 1: DATABASE ENGINE & ALL 16 MODELS
  // ==========================================
  describe('Database Models & Collection Storage Integrity', () => {
    it('verifies all 16 collections exist and handle CRUD seamlessly', async () => {
      // 1. User
      const testUser = await User.create({
        _id: 'usr_test_db',
        name: 'Database Test User',
        email: 'testdb@claimlens.demo',
        role: 'claimant',
        phone: '+91 99999 88888',
      });
      expect(testUser.email).toBe('testdb@claimlens.demo');

      // 2. Counter & ID Generator
      const nextClaimId = await generateClaimId();
      expect(nextClaimId).toMatch(/^CL-\d{4}$/);

      // 3. Claim
      const claim = await Claim.create({
        _id: nextClaimId,
        claimantId: testUser._id,
        status: 'draft',
        incident: {
          date: '2026-06-15',
          location: 'Outer Ring Road, Bengaluru',
          type: 'collision',
        },
        vehicle: {
          registrationNumber: 'KA-01-AB-1234',
          make: 'Tata',
          model: 'Nexon',
          year: 2023,
          vin: 'MATATA12345678901',
        },
        policy: {
          policyNumber: 'POL-TATA-2026',
        },
      });
      expect(claim._id).toBe(nextClaimId);

      // 4. EvidenceFile
      const evidence = await EvidenceFile.create({
        _id: `EV-${claim._id}-01`,
        claimId: claim._id,
        checklistItemId: 'vehicle_damage_photos',
        category: 'photos_video',
        fileName: 'front_bumper.png',
        mimeType: 'image/png',
        sizeBytes: 10240,
        sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        storageKey: `claims/${claim._id}/front_bumper.png`,
        uploadedBy: {
          id: claimantActor.id,
          name: claimantActor.name,
          role: claimantActor.role,
        },
        processingStatus: 'received',
      });
      expect(evidence._id).toBe(`EV-${claim._id}-01`);

      // 5. ExtractedFact
      const fact = await ExtractedFact.create({
        claimId: claim._id,
        analysisVersion: 1,
        evidenceId: evidence._id,
        sha256: evidence.sha256,
        factType: 'vehicle_registration',
        label: 'Extracted Plate Registration',
        value: 'KA-01-AB-1234',
        normalizedValue: 'KA-01-AB-1234',
        sources: [{ evidenceId: evidence._id, page: 1 }],
        originType: 'image_observation',
        confidence: 0.98,
        promptVersion: 'extraction@1',
      });
      expect(fact.confidence).toBe(0.98);

      // 6. Analysis
      const analysis = await Analysis.create({
        claimId: claim._id,
        version: 1,
        analysisId: 'an_test_123',
        state: 'ready',
        model: { name: 'gemini-3-flash-preview', promptVersion: 'analysis@1' },
        aiStatus: 'ok',
        createdBy: verifierActor.id,
        stages: [{ name: 'extraction', status: 'completed' }],
        findings: [],
        matrix: { columns: [], rows: [] },
        summary: 'Database test analysis summary',
      });
      expect(analysis.analysisId).toBe('an_test_123');

      // 7. FindingReview
      const review = await FindingReview.create({
        claimId: claim._id,
        findingId: 'F-1-01',
        analysisVersion: 1,
        status: 'useful',
        reason: 'Verified by senior investigator',
        by: { id: verifierActor.id, name: verifierActor.name },
      });
      expect(review.status).toBe('useful');

      // 8. MatrixAnnotation
      const annotation = await MatrixAnnotation.create({
        claimId: claim._id,
        analysisVersion: 1,
        rowId: 'row_registration',
        text: 'Confirmed plate match against registration document',
        by: { id: verifierActor.id, name: verifierActor.name },
      });
      expect(annotation.text).toContain('Confirmed plate match');

      // 9. SettlementCalculation
      const settlement = await SettlementCalculation.create({
        claimId: claim._id,
        analysisVersion: 1,
        status: 'calculated',
        currency: 'INR',
        resultAmount: 47600,
        formula: 'max(0, eligible - deductible)',
        lines: [{ label: 'Repair Estimate', value: 48600, kind: 'estimate_total' }],
        calculatedBy: { id: 'system', name: 'System Deterministic Engine' },
      });
      expect(settlement.resultAmount).toBe(47600);

      // 10. SettlementOverride
      const override = await SettlementOverride.create({
        claimId: claim._id,
        amount: 45000,
        rationale: 'Approved agreed salvage discount with workshop',
        by: { id: verifierActor.id, name: verifierActor.name },
      });
      expect(override.amount).toBe(45000);

      // 11. EvidenceRequest
      const req = await EvidenceRequest.create({
        claimId: claim._id,
        title: 'Original Driving License Scan',
        reason: 'Required to verify driving entitlement',
        status: 'sent',
        createdBy: { id: verifierActor.id, name: verifierActor.name },
      });
      expect(req.status).toBe('sent');

      // 12. ClaimMessage
      const msg = await ClaimMessage.create({
        claimId: claim._id,
        sender: {
          id: verifierActor.id,
          name: verifierActor.name,
          role: 'verifier',
        },
        body: 'Please upload the front page of your driving license.',
      });
      expect(msg.body).toContain('driving license');

      // 13. PrivateNote
      const note = await PrivateNote.create({
        claimId: claim._id,
        author: { id: verifierActor.id, name: verifierActor.name },
        body: 'Internal verifier assessment: awaiting workshop inspection report.',
      });
      expect(note.body).toContain('Internal verifier');

      // 14. TimelineEvent
      const timeline = await TimelineEvent.create({
        claimId: claim._id,
        kind: 'claim_submitted',
        summary: 'Claim submitted for assessment',
        actor: { id: claimantActor.id, name: claimantActor.name, role: 'claimant' },
        visibility: 'claimant',
      });
      expect(timeline.visibility).toBe('claimant');

      // 15. Decision
      const decision = await Decision.create({
        claimId: claim._id,
        decision: 'recommend_approve',
        actor: { id: verifierActor.id, name: verifierActor.name },
        rationale: 'All items matched and verified without outstanding discrepancies.',
        recommendedAmount: 47600,
      });
      expect(decision.decision).toBe('recommend_approve');

      // 16. Recommendation
      const rec = await Recommendation.create({
        claimId: claim._id,
        label: 'general_education',
        catalogueStatus: 'no_verified_catalogue',
        offeredToClaimant: true,
        requestedByClaimant: false,
        content: {
          title: 'Future Coverage Considerations (General Education)',
          notice: 'Cover bought in future cannot retroactively cover this incident.',
          options: [
            {
              code: 'zero_depreciation',
              title: 'Zero Depreciation',
              explanation: 'No wear deduction',
              relevanceToIncident: 'Applicable to plastic bumper and metal panel repair costs',
            },
          ],
        },
        createdBy: { id: verifierActor.id, name: verifierActor.name },
      });
      expect(rec.label).toBe('general_education');

      // Cleanup test documents
      await Promise.all([
        User.deleteOne({ _id: testUser._id }),
        Claim.deleteOne({ _id: claim._id }),
        EvidenceFile.deleteOne({ _id: evidence._id }),
        ExtractedFact.deleteOne({ _id: fact._id }),
        Analysis.deleteOne({ _id: analysis._id }),
        FindingReview.deleteOne({ _id: review._id }),
        MatrixAnnotation.deleteOne({ _id: annotation._id }),
        SettlementCalculation.deleteOne({ _id: settlement._id }),
        SettlementOverride.deleteOne({ _id: override._id }),
        EvidenceRequest.deleteOne({ _id: req._id }),
        ClaimMessage.deleteOne({ _id: msg._id }),
        PrivateNote.deleteOne({ _id: note._id }),
        TimelineEvent.deleteOne({ _id: timeline._id }),
        Decision.deleteOne({ _id: decision._id }),
        Recommendation.deleteOne({ _id: rec._id }),
      ]);
    });
  });

  // ===================================================
  // SECTION 2: AI SAFETY GUARDRAILS & LANGUAGE SCREEN
  // ===================================================
  describe('AI Safety Filters & Sanitization Guardrails', () => {
    it('detects and sanitizes prohibited accusatory words', () => {
      const dirtyText = 'This claim is an obvious fraud with a fake and forged document proving that it is a scam.';
      expect(containsBannedLanguage(dirtyText)).toBe(true);

      const cleaned = sanitizeBannedLanguage(dirtyText);
      expect(containsBannedLanguage(cleaned)).toBe(false);
      expect(cleaned).toContain('inconsistent declaration');
      expect(cleaned).toContain('unverified document');
      expect(cleaned).not.toContain('fraud');
      expect(cleaned).not.toContain('fake');
      expect(cleaned).not.toContain('forged');
    });

    it('enforces SourceRef integrity and quote length <= 25 words', () => {
      const storedFacts = [
        {
          evidenceId: 'EV-01',
          value: 'The front bumper and RH headlamp suffered impact damage during collision.',
        },
      ];

      const rawFindings = [
        {
          id: 'F-1',
          title: 'Damage Observation Inconsistency',
          type: 'inconsistency',
          priority: 'high',
          sources: [
            {
              evidenceId: 'EV-01',
              quote: 'front bumper and RH headlamp suffered impact damage',
            },
          ],
        },
        {
          id: 'F-2',
          title: 'Suspicious long quote exceeding limit',
          type: 'inconsistency',
          priority: 'high',
          sources: [
            {
              evidenceId: 'EV-01',
              // 28 words - must be stripped
              quote:
                'word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12 word13 word14 word15 word16 word17 word18 word19 word20 word21 word22 word23 word24 word25 word26 word27 word28',
            },
          ],
        },
        {
          id: 'F-3',
          title: 'Finding with no evidence reference',
          type: 'inconsistency',
          priority: 'high',
          sources: [], // No source ref
        },
      ];

      const { findings } = validateAndSanitizeFindings(rawFindings, {
        validEvidenceIds: new Set(['EV-01']),
        storedFacts,
      });

      // F-1 kept quote
      expect(findings[0].sources[0].quote).toBe('front bumper and RH headlamp suffered impact damage');

      // F-2 stripped quote due to length > 25 words, but kept reference
      expect(findings[1].sources[0].quote).toBeUndefined();
      expect(findings[1].sources[0].evidenceId).toBe('EV-01');

      // F-3 converted to low_evidence_hypothesis and priority downgraded to low
      expect(findings[2].lowEvidence).toBe(true);
      expect(findings[2].type).toBe('low_evidence_hypothesis');
      expect(findings[2].priority).toBe('low');
    });
  });

  // ==========================================
  // SECTION 3: DETERMINISTIC RULES (R01 - R13)
  // ==========================================
  describe('Deterministic Rules R01 to R13 Exhaustive Coverage', () => {
    it('R01: triggers on incident date outside policy coverage period', () => {
      const claim = {
        incident: { date: '2026-07-01', timeUncertain: false },
        vehicle: {},
      };
      const facts = [
        { factType: 'policy_period_start', value: '2025-01-01', sources: [{ evidenceId: 'EV-1' }] },
        { factType: 'policy_period_end', value: '2025-12-31', sources: [{ evidenceId: 'EV-1' }] },
      ];
      const findings = runDeterministicRules(claim, facts, [{ _id: 'EV-1' }]);
      const r01 = findings.find((f) => f.ruleId === 'R01');
      expect(r01).toBeDefined();
      expect(r01.blocksSettlement).toBe(true);
      expect(r01.title).toContain('Incident Date Outside Policy Coverage Period');
    });

    it('R02: triggers on vehicle registration mismatch between claim and document', () => {
      const claim = {
        incident: { date: '2026-05-10' },
        vehicle: { registrationNumber: 'KA-01-AB-1234' },
      };
      const facts = [
        { factType: 'vehicle_registration', value: 'KA-05-CD-9999', sources: [{ evidenceId: 'EV-RC' }] },
      ];
      const findings = runDeterministicRules(claim, facts, [{ _id: 'EV-RC' }]);
      const r02 = findings.find((f) => f.ruleId === 'R02');
      expect(r02).toBeDefined();
      expect(r02.blocksSettlement).toBe(true);
      expect(r02.title).toContain('Vehicle Registration Discrepancy Across Documents');
    });

    it('R03: triggers on VIN / Chassis number discrepancy', () => {
      const claim = {
        incident: { date: '2026-05-10' },
        vehicle: { vin: 'MATATA11111111111' },
      };
      const facts = [
        { factType: 'vin', value: 'MATATA22222222222', sources: [{ evidenceId: 'EV-RC' }] },
      ];
      const findings = runDeterministicRules(claim, facts, [{ _id: 'EV-RC' }]);
      const r03 = findings.find((f) => f.ruleId === 'R03');
      expect(r03).toBeDefined();
      expect(r03.blocksSettlement).toBe(true);
      expect(r03.title).toContain('Vehicle Identification Number (VIN) Discrepancy');
    });

    it('R04: triggers when estimate total does not equal sum of itemised lines', () => {
      const claim = {
        incident: { date: '2026-06-15' },
        vehicle: {},
      };
      const facts = [
        { factType: 'estimate_line_item', value: 20000, sources: [{ evidenceId: 'EV-EST' }] },
        { factType: 'estimate_line_item', value: 10000, sources: [{ evidenceId: 'EV-EST' }] },
        { factType: 'estimate_total', value: 35000, sources: [{ evidenceId: 'EV-EST' }] }, // Discrepancy: 30000 vs 35000
      ];
      const findings = runDeterministicRules(claim, facts, [{ _id: 'EV-EST' }]);
      const r04 = findings.find((f) => f.ruleId === 'R04');
      expect(r04).toBeDefined();
      expect(r04.blocksSettlement).toBe(true);
      expect(r04.title).toContain('Repair Estimate Total Does Not Equal Sum of Line Items');
    });

    it('R05: triggers when repair estimate or document is dated prior to incident', () => {
      const claim = {
        incident: { date: '2026-06-15' },
        vehicle: {},
      };
      const facts = [
        { factType: 'document_date', value: { date: '2026-06-10' }, sources: [{ evidenceId: 'EV-DOC' }] },
      ];
      const findings = runDeterministicRules(claim, facts, [{ _id: 'EV-DOC' }]);
      const r05 = findings.find((f) => f.ruleId === 'R05');
      expect(r05).toBeDefined();
      expect(r05.blocksSettlement).toBe(true);
      expect(r05.title).toContain('Repair Estimate Dated Prior to Reported Incident Date');
    });

    it('R06: triggers when photo capture timestamp precedes incident by > 1 day', () => {
      const claim = {
        incident: { date: '2026-06-15T10:00:00Z' },
        vehicle: {},
      };
      const evidence = [
        {
          _id: 'EV-IMG-01',
          provenance: {
            metadata: { dateTaken: '2026-06-10T10:00:00Z' }, // 5 days prior
          },
        },
      ];
      const findings = runDeterministicRules(claim, [], evidence);
      const r06 = findings.find((f) => f.ruleId === 'R06');
      expect(r06).toBeDefined();
      expect(r06.title).toContain('Photo Capture Date Precedes Reported Incident Date');
    });

    it('R07: triggers on identical file bytes uploaded multiple times', () => {
      const claim = { incident: { date: '2026-06-15' }, vehicle: {} };
      const evidence = [
        { _id: 'EV-IMG-02', provenance: { duplicateOfIds: ['EV-IMG-01'] } },
      ];
      const findings = runDeterministicRules(claim, [], evidence);
      const r07 = findings.find((f) => f.ruleId === 'R07');
      expect(r07).toBeDefined();
      expect(r07.title).toContain('Identical File Bytes Uploaded Multiple Times');
    });

    it('R08: triggers on visually similar photographs (dHash difference <= 6)', () => {
      const claim = { incident: { date: '2026-06-15' }, vehicle: {} };
      const evidence = [
        { _id: 'EV-IMG-03', provenance: { similarToIds: ['EV-IMG-01'] } },
      ];
      const findings = runDeterministicRules(claim, [], evidence);
      const r08 = findings.find((f) => f.ruleId === 'R08');
      expect(r08).toBeDefined();
      expect(r08.title).toContain('Visually Similar Photographs Detected');
    });

    it('R09: triggers when core required claim-form fields are incomplete', () => {
      const claim = {
        incident: { location: '' }, // missing location
        vehicle: { registrationNumber: '', make: '' }, // missing reg & make
      };
      const findings = runDeterministicRules(claim, [], []);
      const r09 = findings.find((f) => f.ruleId === 'R09');
      expect(r09).toBeDefined();
      expect(r09.blocksSettlement).toBe(true);
      expect(r09.title).toContain('Required Claim Form Information Incomplete');
    });

    it('R10: triggers when compulsory policy terms and limits are missing', () => {
      const claim = { incident: { date: '2026-06-15' }, vehicle: {} };
      // No deductibleFact or sumInsuredFact
      const findings = runDeterministicRules(claim, [], []);
      const r10 = findings.find((f) => f.ruleId === 'R10');
      expect(r10).toBeDefined();
      expect(r10.blocksSettlement).toBe(true);
      expect(r10.title).toContain('Policy Coverage Terms and Deductibles Not Established');
    });

    it('R11: triggers when repair estimate total exceeds policy sum insured (IDV)', () => {
      const claim = { incident: { date: '2026-06-15' }, vehicle: {} };
      const facts = [
        { factType: 'policy_period_start', value: '2026-01-01' },
        { factType: 'policy_period_end', value: '2026-12-31' },
        { factType: 'deductible', value: 1000 },
        { factType: 'sum_insured', value: 200000, sources: [{ evidenceId: 'EV-POL' }] },
        { factType: 'estimate_total', value: 350000, sources: [{ evidenceId: 'EV-EST' }] }, // Exceeds IDV
      ];
      const findings = runDeterministicRules(claim, facts, []);
      const r11 = findings.find((f) => f.ruleId === 'R11');
      expect(r11).toBeDefined();
      expect(r11.title).toContain('Estimated Repair Total Exceeds Policy Sum Insured');
    });

    it('R12: triggers when mandatory vehicle damage photographs are missing from checklist', () => {
      const claim = {
        incident: { date: '2026-06-15' },
        vehicle: {},
        checklist: [
          {
            id: 'vehicle_damage_photos',
            category: 'photos_video',
            requirement: 'required',
            status: 'not_started',
            label: 'Damage Profile Photos',
          },
        ],
      };
      const findings = runDeterministicRules(claim, [], []);
      const r12 = findings.find((f) => f.ruleId === 'R12');
      expect(r12).toBeDefined();
      expect(r12.title).toContain('Mandatory Vehicle Damage Photographs Missing');
    });

    it('R13: triggers when policy clause references unsupplied annexure or endorsement', () => {
      const claim = { incident: { date: '2026-06-15' }, vehicle: {} };
      const facts = [
        {
          factType: 'unresolved_reference',
          value: 'Clause 4(a) refers to Endorsement Annexure B which is missing from schedule',
          sources: [{ evidenceId: 'EV-POL' }],
        },
      ];
      const findings = runDeterministicRules(claim, facts, []);
      const r13 = findings.find((f) => f.ruleId === 'R13');
      expect(r13).toBeDefined();
      expect(r13.blocksSettlement).toBe(true);
      expect(r13.title).toContain('Policy Clause References Unsupplied Annexure or Endorsement');
    });
  });

  // ==========================================
  // SECTION 4: EVIDENCE MATRIX GENERATION
  // ==========================================
  describe('Evidence Comparison Matrix Builder', () => {
    it('builds multi-column matrix with stable rows and match evaluations', () => {
      const claim = {
        incident: { date: '2026-06-15', location: 'Indiranagar, Bangalore' },
        vehicle: { registrationNumber: 'KA-01-MJ-5021', vin: 'MA3EW123456789' },
      };
      const extractedFacts = [
        { factType: 'vehicle_registration', value: 'KA-01-MJ-5021' },
        { factType: 'vin', value: 'MA3EW123456789' },
        { factType: 'incident_location', value: 'Indiranagar, Bangalore' },
      ];
      const evidenceFiles = [
        { _id: 'EV-POL', category: 'policy', fileName: 'policy.pdf' },
        { _id: 'EV-RC', category: 'vehicle_identity', fileName: 'rc.pdf' },
      ];

      const matrix = buildEvidenceMatrix(claim, extractedFacts, evidenceFiles);
      expect(matrix.columns.length).toBeGreaterThanOrEqual(2);
      expect(matrix.columns[0].id).toBe('claim_form');

      const regRow = matrix.rows.find((r) => r.id === 'row_registration');
      expect(regRow).toBeDefined();
      expect(regRow.cells.claim_form.state).toBe('match');
      expect(regRow.cells.rc_doc.state).toBe('match');
      expect(regRow.cells.claim_form.value).toBe('KA-01-MJ-5021');
    });
  });

  // ==========================================
  // SECTION 5: DETERMINISTIC SETTLEMENT ENGINE
  // ==========================================
  describe('Deterministic Settlement Calculation & Overrides', () => {
    it('withholds settlement with resultAmount: null when blockers exist', () => {
      const extractedFacts = [
        { factType: 'sum_insured', value: 500000 },
        { factType: 'deductible', value: 1000 },
        { factType: 'policy_period_start', value: '2026-01-01' },
        { factType: 'policy_period_end', value: '2026-12-31' },
        { factType: 'estimate_line_item', value: 35000 },
      ];
      const findings = [
        {
          id: 'F-1-01',
          ruleId: 'R02',
          title: 'Registration Discrepancy',
          blocksSettlement: true,
        },
      ];

      const settlement = calculateSettlement({
        extractedFacts,
        findings,
        findingReviews: [],
      });

      expect(settlement.status).toBe('withheld');
      expect(settlement.resultAmount).toBeNull();
      expect(settlement.unresolved.length).toBe(1);
      expect(settlement.unresolved[0].message).toContain('Registration Discrepancy');
    });

    it('calculates deterministic amount when all blockers are resolved or dismissed', () => {
      const extractedFacts = [
        { factType: 'sum_insured', value: 500000 },
        { factType: 'deductible', value: 1000 },
        { factType: 'policy_period_start', value: '2026-01-01' },
        { factType: 'policy_period_end', value: '2026-12-31' },
        { factType: 'estimate_line_item', value: 35000 },
        { factType: 'estimate_line_item', value: 13600 },
      ];
      const findings = [
        {
          id: 'F-1-01',
          ruleId: 'R02',
          title: 'Registration Discrepancy',
          blocksSettlement: true,
        },
      ];
      // Verifier dismissed the blocker
      const findingReviews = [
        {
          findingId: 'F-1-01',
          status: 'dismissed',
          reason: 'Typo in claim form verified against vehicle physically',
        },
      ];

      const settlement = calculateSettlement({
        extractedFacts,
        findings,
        findingReviews,
      });

      expect(settlement.status).toBe('calculated');
      // Eligible: 35000 + 13600 = 48600. Less deductible 1000 = 47600
      expect(settlement.resultAmount).toBe(47600);
      expect(settlement.lines.length).toBeGreaterThan(0);
    });

    it('records manual verifier override amount with audit rationale in settlement output', () => {
      const extractedFacts = [
        { factType: 'sum_insured', value: 500000 },
        { factType: 'deductible', value: 1000 },
        { factType: 'policy_period_start', value: '2026-01-01' },
        { factType: 'policy_period_end', value: '2026-12-31' },
        { factType: 'estimate_line_item', value: 35000 },
      ];

      const overrides = [
        {
          amount: 32000,
          rationale: 'Applied pre-negotiated workshop discount',
          by: { id: 'usr_meera', name: 'Meera Iyer' },
          at: new Date(),
        },
      ];

      const settlement = calculateSettlement({
        extractedFacts,
        findings: [],
        overrides,
      });

      expect(settlement.status).toBe('calculated');
      expect(settlement.resultAmount).toBe(34000); // 35000 - 1000 = 34000
      expect(settlement.overrides.length).toBe(1);
      expect(settlement.overrides[0].amount).toBe(32000);
      expect(settlement.overrides[0].rationale).toContain('workshop discount');
    });
  });

  // ==========================================
  // SECTION 6: FUTURE-COVER RECOMMENDATION INVARIANTS
  // ==========================================
  describe('Future-Cover Recommendation Invariants', () => {
    it('generates educational recommendations without mutating claim status or settlement', async () => {
      const claim = await Claim.create({
        _id: 'CL-REC-TEST',
        claimantId: claimantActor.id,
        status: 'in_review',
        incident: { date: '2026-06-15' },
        vehicle: {
          registrationNumber: 'KA-01-ZZ-9999',
          make: 'Hyundai',
          model: 'Creta',
          year: 2023,
        },
      });

      // Snapshot claim state before recommendation
      const statusBefore = claim.status;
      const analysisVersionBefore = claim.latestAnalysisVersion;

      const rec = await createRecommendationOffer(verifierActor, claim._id, { offerToClaimant: true });
      expect(rec.label).toBe('general_education');
      expect(rec.catalogueStatus).toBe('no_verified_catalogue');
      expect(rec.content.notice).toContain('cannot retroactively cover this incident');

      // Verify claimant can view educational options
      const claimantView = await getRecommendation(claimantActor, claim._id);
      expect(claimantView.label).toBe('general_education');
      expect(claimantView.content.options.length).toBeGreaterThan(0);
      // Assumptions must be stripped for claimant
      expect(claimantView.assumptions).toBeUndefined();

      // Check Invariant: claim was NOT mutated
      const claimAfter = await Claim.findById(claim._id);
      expect(claimAfter.status).toBe(statusBefore);
      expect(claimAfter.latestAnalysisVersion).toBe(analysisVersionBefore);

      await Claim.deleteOne({ _id: claim._id });
      await Recommendation.deleteMany({ claimId: claim._id });
    });
  });

  // ==========================================
  // SECTION 7: ASYNC PIPELINE & VERSIONING
  // ==========================================
  describe('Async Analysis Pipeline Execution & Immutability', () => {
    it('executes analysis pipeline asynchronously, records stages, and never overwrites previous version', async () => {
      const claim = await Claim.create({
        _id: 'CL-ASYNC-TEST',
        claimantId: claimantActor.id,
        status: 'new',
        incident: {
          date: '2026-06-15',
          location: 'Koramangala 4th Block, Bengaluru',
        },
        vehicle: {
          registrationNumber: 'KA-03-XX-7777',
          make: 'Maruti',
          model: 'Swift',
          year: 2022,
          vin: 'MA123456789012345',
        },
      });

      // Trigger Version 1
      const initResult1 = await initiateAnalysis(claim._id, verifierActor);
      expect(initResult1.status).toBe('running');
      expect(initResult1.version).toBe(1);

      // Poll until completed
      let v1;
      for (let i = 0; i < 30; i++) {
        v1 = await Analysis.findOne({ claimId: claim._id, version: 1 });
        if (v1 && v1.state === 'ready') break;
        await new Promise((r) => setTimeout(r, 80));
      }

      expect(v1.state).toBe('ready');
      expect(v1.stages.length).toBe(10);
      expect(v1.stages.every((s) => s.status === 'completed')).toBe(true);

      // Trigger Version 2 (re-analysis)
      const initResult2 = await initiateAnalysis(claim._id, verifierActor);
      expect(initResult2.version).toBe(2);

      let v2;
      for (let i = 0; i < 30; i++) {
        v2 = await Analysis.findOne({ claimId: claim._id, version: 2 });
        if (v2 && v2.state === 'ready') break;
        await new Promise((r) => setTimeout(r, 80));
      }

      expect(v2.state).toBe('ready');
      expect(v2.version).toBe(2);

      // Immutability check: Version 1 is still present untouched
      const v1Again = await Analysis.findOne({ claimId: claim._id, version: 1 });
      expect(v1Again).toBeDefined();
      expect(v1Again.version).toBe(1);
      expect(v1Again.analysisId).toBe(v1.analysisId);

      await Claim.deleteOne({ _id: claim._id });
      await Analysis.deleteMany({ claimId: claim._id });
      await ExtractedFact.deleteMany({ claimId: claim._id });
    });
  });
});
