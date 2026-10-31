import path from 'node:path';
import fs from 'node:fs/promises';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../src/models/user.model.js';
import { Counter } from '../src/models/counter.model.js';
import { Claim } from '../src/models/claim.model.js';
import { EvidenceFile } from '../src/models/evidenceFile.model.js';
import { Analysis } from '../src/models/analysis.model.js';
import { ExtractedFact } from '../src/models/extractedFact.model.js';
import { TimelineEvent } from '../src/models/timelineEvent.model.js';
import { EvidenceRequest } from '../src/models/evidenceRequest.model.js';
import { ClaimMessage } from '../src/models/claimMessage.model.js';
import { PrivateNote } from '../src/models/privateNote.model.js';
import { Decision } from '../src/models/decision.model.js';
import { generateChecklist } from '../src/rules/checklist.rules.js';
import { createSyntheticDemoImage, createSyntheticDemoPdf } from './fallback-generator.js';
import { env } from '../src/config/env.js';
import { connectDB, disconnectDB } from '../src/db/connect.js';
import { logger } from '../src/middleware/logger.js';

export async function seedDatabase() {
  await connectDB();
  logger.info('Starting full database seed...');

  // Clean existing collections
  await Promise.all([
    User.deleteMany({}),
    Counter.deleteMany({}),
    Claim.deleteMany({}),
    EvidenceFile.deleteMany({}),
    Analysis.deleteMany({}),
    ExtractedFact.deleteMany({}),
    TimelineEvent.deleteMany({}),
    EvidenceRequest.deleteMany({}),
    ClaimMessage.deleteMany({}),
    PrivateNote.deleteMany({}),
    Decision.deleteMany({}),
  ]);

  // Set counter sequence so new claims start at CL-2052
  await Counter.create({ _id: 'claimNumber', seq: 2051 });

  // 1. Seed 6 Users (bcrypt passwords)
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('DemoPass2026!', salt);

  const users = [
    { _id: 'usr_aarav', name: 'Aarav Kumar', email: 'aarav@claimlens.demo', role: 'claimant', phone: '+91 98765 43210', passwordHash },
    { _id: 'usr_rohan', name: 'Rohan Das', email: 'rohan@claimlens.demo', role: 'claimant', phone: '+91 98765 43211', passwordHash },
    { _id: 'usr_priya', name: 'Priya Raman', email: 'priya@claimlens.demo', role: 'claimant', phone: '+91 98765 43212', passwordHash },
    { _id: 'usr_karthik', name: 'Karthik S', email: 'karthik@claimlens.demo', role: 'claimant', phone: '+91 98765 43213', passwordHash },
    { _id: 'usr_meera', name: 'Meera Iyer', email: 'meera@claimlens.demo', role: 'verifier', phone: '+91 98765 43214', passwordHash },
    { _id: 'usr_vikram', name: 'Vikram Shah', email: 'vikram@claimlens.demo', role: 'verifier', phone: '+91 98765 43215', passwordHash },
  ];
  await User.insertMany(users);

  // Helper to save evidence bytes
  const uploadRoot = path.resolve(env.UPLOAD_DIR);
  async function saveSeedFile(claimId, filename, buffer) {
    const claimDir = path.join(uploadRoot, 'claims', claimId);
    await fs.mkdir(claimDir, { recursive: true });
    await fs.writeFile(path.join(claimDir, filename), buffer);
    return `claims/${claimId}/${filename}`;
  }

  // 2. Generate Real Synthetic Evidence Fixtures
  const [demoPhoto1, demoPhoto2, demoPolicyPdf, demoEstimatePdf] = await Promise.all([
    createSyntheticDemoImage('Front Vehicle Bumper View (CL-2041)'),
    createSyntheticDemoImage('Damage Close-up View (CL-2041)'),
    createSyntheticDemoPdf('MOTOR VEHICLE POLICY SCHEDULE', [
      'Policy Number: POL-HYU-9921',
      'Insured Name: Aarav Kumar',
      'Policy Period: 2026-01-01 to 2026-12-31',
      'Vehicle Registration: KA-01-MJ-5021',
      'Make / Model: Hyundai Creta 2023',
      'Insured Declared Value (IDV): INR 500,000',
      'Compulsory Deductible: INR 1,000',
    ]),
    createSyntheticDemoPdf('AUTHORISED WORKSHOP ESTIMATE', [
      'Repair Estimate No: EST-2026-4412',
      'Date: 2026-06-16',
      'Vehicle: KA-01-MJ-5021',
      'Line 1: Front Bumper Replacement — INR 35,000',
      'Line 2: Headlight Assembly (RH) — INR 13,600',
      'Total Estimated Amount: INR 48,600',
    ]),
  ]);

  // CL-2041 Files
  const pPath1 = await saveSeedFile('CL-2041', 'policy_schedule.pdf', demoPolicyPdf.buffer);
  const ePath1 = await saveSeedFile('CL-2041', 'workshop_estimate.pdf', demoEstimatePdf.buffer);
  const imgPath1 = await saveSeedFile('CL-2041', 'front_view.png', demoPhoto1.buffer);

  const ev2041 = [
    {
      _id: 'EV-CL-2041-01',
      claimId: 'CL-2041',
      checklistItemId: 'policy_schedule',
      category: 'policy',
      fileName: 'policy_schedule.pdf',
      mimeType: 'application/pdf',
      sizeBytes: demoPolicyPdf.buffer.length,
      sha256: demoPolicyPdf.sha256,
      pageCount: 1,
      source: 'uploaded_file',
      receivedAt: new Date('2026-06-16T10:00:00Z'),
      uploadedBy: { id: 'usr_aarav', name: 'Aarav Kumar', role: 'claimant' },
      processingStatus: 'received',
      reviewStatus: 'reviewed',
      storageKey: pPath1,
      provenance: { statuses: ['metadata_present'], duplicateOfIds: [], similarToIds: [], metadata: { present: true, gpsPresent: false } },
    },
    {
      _id: 'EV-CL-2041-02',
      claimId: 'CL-2041',
      checklistItemId: 'repair_estimate',
      category: 'repair_loss',
      fileName: 'workshop_estimate.pdf',
      mimeType: 'application/pdf',
      sizeBytes: demoEstimatePdf.buffer.length,
      sha256: demoEstimatePdf.sha256,
      pageCount: 1,
      source: 'uploaded_file',
      receivedAt: new Date('2026-06-16T10:05:00Z'),
      uploadedBy: { id: 'usr_aarav', name: 'Aarav Kumar', role: 'claimant' },
      processingStatus: 'received',
      reviewStatus: 'reviewed',
      storageKey: ePath1,
      provenance: { statuses: ['metadata_present'], duplicateOfIds: [], similarToIds: [], metadata: { present: true, gpsPresent: false } },
    },
    {
      _id: 'EV-CL-2041-03',
      claimId: 'CL-2041',
      checklistItemId: 'photo_front',
      category: 'photos_video',
      fileName: 'front_view.png',
      mimeType: 'image/png',
      sizeBytes: demoPhoto1.buffer.length,
      sha256: demoPhoto1.sha256,
      source: 'uploaded_file',
      receivedAt: new Date('2026-06-16T10:10:00Z'),
      uploadedBy: { id: 'usr_aarav', name: 'Aarav Kumar', role: 'claimant' },
      processingStatus: 'received',
      reviewStatus: 'reviewed',
      storageKey: imgPath1,
      provenance: { statuses: ['metadata_present'], duplicateOfIds: [], similarToIds: [], metadata: { present: true, gpsPresent: false } },
    },
  ];
  await EvidenceFile.insertMany(ev2041);

  // 3. Seed 10 Submitted Claims + 1 Draft
  const baseIncident = {
    date: '2026-06-15',
    time: '14:30',
    timeUncertain: false,
    location: 'Bangalore, Indiranagar',
    type: 'collision',
    thirdPartyInvolved: 'no',
    policeReportFiled: 'no',
    visibleDamageAreas: ['front'],
  };

  const claims = [
    // CL-2041: Consistent, in_review, ₹47,600
    {
      _id: 'CL-2041',
      claimantId: 'usr_aarav',
      assigneeId: 'usr_meera',
      status: 'in_review',
      priority: 'medium',
      incident: baseIncident,
      vehicle: { registrationNumber: 'KA-01-MJ-5021', make: 'Hyundai', model: 'Creta', year: 2023, vin: 'MALC141CMKM123456' },
      driver: { isPolicyholder: true, name: 'Aarav Kumar', relationship: 'Self', licenceNumber: 'KA0120180012345' },
      narrative: 'Vehicle was struck in the front while waiting at traffic intersection.',
      policy: { policyNumber: 'POL-HYU-9921', insurer: 'National Insurance' },
      submittedAt: new Date('2026-06-16T10:15:00Z'),
      latestAnalysisVersion: 1,
      checklist: generateChecklist({ incident: baseIncident }),
    },
    // CL-2042: Inconsistent, in_review, withheld
    {
      _id: 'CL-2042',
      claimantId: 'usr_rohan',
      assigneeId: 'usr_meera',
      status: 'in_review',
      priority: 'high',
      incident: { ...baseIncident, date: '2026-10-14', location: 'Mumbai Western Express' },
      vehicle: { registrationNumber: 'MH-02-EZ-4412', make: 'Tata', model: 'Nexon', year: 2022 },
      driver: { isPolicyholder: true, name: 'Rohan Das', relationship: 'Self' },
      narrative: 'Skidded on wet asphalt.',
      policy: { policyNumber: 'POL-TAT-4412', insurer: 'Oriental Insurance' },
      submittedAt: new Date('2026-10-15T09:00:00Z'),
      latestAnalysisVersion: 1,
      checklist: generateChecklist({ incident: { ...baseIncident, date: '2026-10-14' } }),
    },
    // CL-2043: Incomplete, awaiting_claimant, withheld
    {
      _id: 'CL-2043',
      claimantId: 'usr_priya',
      assigneeId: 'usr_vikram',
      status: 'awaiting_claimant',
      priority: 'high',
      incident: { ...baseIncident, date: '2026-10-20', location: 'Chennai OMR' },
      vehicle: { registrationNumber: 'TN-09-BK-8891', make: 'Honda', model: 'City', year: 2021 },
      driver: { isPolicyholder: true, name: 'Priya Raman', relationship: 'Self' },
      narrative: 'Pillar scrape in basement parking.',
      submittedAt: new Date('2026-10-21T11:00:00Z'),
      latestAnalysisVersion: 1,
      checklist: generateChecklist({ incident: baseIncident }),
    },
    // CL-2044: Ambiguous (midnight boundary), in_review, withheld
    {
      _id: 'CL-2044',
      claimantId: 'usr_karthik',
      assigneeId: 'usr_vikram',
      status: 'in_review',
      priority: 'medium',
      incident: { ...baseIncident, date: '2026-10-15', time: '23:58', timeUncertain: true, location: 'Pune Bypass' },
      vehicle: { registrationNumber: 'MH-12-PQ-9002', make: 'Kia', model: 'Seltos', year: 2023 },
      driver: { isPolicyholder: true, name: 'Karthik S', relationship: 'Self' },
      narrative: 'Incident occurred around midnight near toll gate.',
      submittedAt: new Date('2026-10-16T08:00:00Z'),
      latestAnalysisVersion: 1,
      checklist: generateChecklist({ incident: baseIncident }),
    },
    // CL-2045: new, unassigned
    {
      _id: 'CL-2045',
      claimantId: 'usr_aarav',
      assigneeId: null,
      status: 'new',
      priority: 'medium',
      incident: { ...baseIncident, date: '2026-10-28', location: 'Bangalore Koramangala' },
      vehicle: { registrationNumber: 'KA-03-NB-1122', make: 'Maruti', model: 'Baleno', year: 2022 },
      driver: { isPolicyholder: true, name: 'Aarav Kumar' },
      narrative: 'Rear bumper scratch.',
      submittedAt: new Date('2026-10-28T14:00:00Z'),
      checklist: generateChecklist({ incident: baseIncident }),
    },
    // CL-2046: new, unassigned
    {
      _id: 'CL-2046',
      claimantId: 'usr_rohan',
      assigneeId: null,
      status: 'new',
      priority: 'low',
      incident: { ...baseIncident, date: '2026-10-29', location: 'Mumbai Bandra' },
      vehicle: { registrationNumber: 'MH-01-DE-7788', make: 'Hyundai', model: 'i20', year: 2021 },
      driver: { isPolicyholder: true, name: 'Rohan Das' },
      narrative: 'Side mirror damaged by passing bike.',
      submittedAt: new Date('2026-10-29T16:00:00Z'),
      checklist: generateChecklist({ incident: baseIncident }),
    },
    // CL-2047: awaiting_claimant, assignee: usr_meera
    {
      _id: 'CL-2047',
      claimantId: 'usr_priya',
      assigneeId: 'usr_meera',
      status: 'awaiting_claimant',
      priority: 'medium',
      incident: { ...baseIncident, date: '2026-10-22' },
      vehicle: { registrationNumber: 'TN-07-ZZ-3344', make: 'Toyota', model: 'Glanza', year: 2023 },
      driver: { isPolicyholder: true, name: 'Priya Raman' },
      narrative: 'Front fog lamp cracked.',
      submittedAt: new Date('2026-10-23T10:00:00Z'),
      checklist: generateChecklist({ incident: baseIncident }),
    },
    // CL-2048: decision_pending, assignee: usr_meera
    {
      _id: 'CL-2048',
      claimantId: 'usr_karthik',
      assigneeId: 'usr_meera',
      status: 'decision_pending',
      priority: 'medium',
      incident: { ...baseIncident, date: '2026-10-18' },
      vehicle: { registrationNumber: 'KA-05-MM-5566', make: 'Mahindra', model: 'XUV700', year: 2022 },
      driver: { isPolicyholder: true, name: 'Karthik S' },
      narrative: 'Right door dented in parking lot.',
      submittedAt: new Date('2026-10-19T12:00:00Z'),
      checklist: generateChecklist({ incident: baseIncident }),
    },
    // CL-2049: completed, assignee: usr_vikram
    {
      _id: 'CL-2049',
      claimantId: 'usr_aarav',
      assigneeId: 'usr_vikram',
      status: 'completed',
      priority: 'low',
      incident: { ...baseIncident, date: '2026-09-10' },
      vehicle: { registrationNumber: 'KA-01-MJ-5021', make: 'Hyundai', model: 'Creta', year: 2023 },
      driver: { isPolicyholder: true, name: 'Aarav Kumar' },
      narrative: 'Windshield stone chip repair.',
      submittedAt: new Date('2026-09-11T10:00:00Z'),
      checklist: generateChecklist({ incident: baseIncident }),
    },
    // CL-2050: completed, assignee: usr_meera
    {
      _id: 'CL-2050',
      claimantId: 'usr_rohan',
      assigneeId: 'usr_meera',
      status: 'completed',
      priority: 'low',
      incident: { ...baseIncident, date: '2026-09-15' },
      vehicle: { registrationNumber: 'MH-02-EZ-4412', make: 'Tata', model: 'Nexon', year: 2022 },
      driver: { isPolicyholder: true, name: 'Rohan Das' },
      narrative: 'Tail lamp assembly replacement.',
      submittedAt: new Date('2026-09-16T11:00:00Z'),
      checklist: generateChecklist({ incident: baseIncident }),
    },
    // CL-2051: draft, claimant: usr_aarav
    {
      _id: 'CL-2051',
      claimantId: 'usr_aarav',
      assigneeId: null,
      status: 'draft',
      priority: 'medium',
      incident: { ...baseIncident, date: '2026-10-30', location: 'Indiranagar 100ft Road' },
      vehicle: { registrationNumber: 'KA-01-MJ-5021', make: 'Hyundai', model: 'Creta', year: 2023 },
      driver: { isPolicyholder: true, name: 'Aarav Kumar' },
      narrative: 'Draft claim for side door ding.',
      checklist: generateChecklist({ incident: baseIncident }),
    },
  ];
  await Claim.insertMany(claims);

  // 4. Pre-stored Analysis for CL-2041 (Consistent, ₹47,600)
  const facts2041 = [
    { claimId: 'CL-2041', analysisVersion: 1, factType: 'sum_insured', label: 'IDV Limit', value: { amount: 500000, currency: 'INR' }, originType: 'document_extraction', confidence: 1.0, promptVersion: 'extraction@1', sources: [{ evidenceId: 'EV-CL-2041-01' }] },
    { claimId: 'CL-2041', analysisVersion: 1, factType: 'deductible', label: 'Compulsory Deductible', value: { amount: 1000, currency: 'INR' }, originType: 'document_extraction', confidence: 1.0, promptVersion: 'extraction@1', sources: [{ evidenceId: 'EV-CL-2041-01' }] },
    { claimId: 'CL-2041', analysisVersion: 1, factType: 'policy_period_start', label: 'Policy Start', value: '2026-01-01', originType: 'document_extraction', confidence: 1.0, promptVersion: 'extraction@1', sources: [{ evidenceId: 'EV-CL-2041-01' }] },
    { claimId: 'CL-2041', analysisVersion: 1, factType: 'policy_period_end', label: 'Policy Expiry', value: '2026-12-31', originType: 'document_extraction', confidence: 1.0, promptVersion: 'extraction@1', sources: [{ evidenceId: 'EV-CL-2041-01' }] },
    { claimId: 'CL-2041', analysisVersion: 1, factType: 'estimate_line_item', label: 'Front Bumper Replacement', value: { amount: 35000, currency: 'INR' }, originType: 'document_extraction', confidence: 1.0, promptVersion: 'extraction@1', sources: [{ evidenceId: 'EV-CL-2041-02' }] },
    { claimId: 'CL-2041', analysisVersion: 1, factType: 'estimate_line_item', label: 'Headlight Assembly (RH)', value: { amount: 13600, currency: 'INR' }, originType: 'document_extraction', confidence: 1.0, promptVersion: 'extraction@1', sources: [{ evidenceId: 'EV-CL-2041-02' }] },
    { claimId: 'CL-2041', analysisVersion: 1, factType: 'estimate_total', label: 'Stated Total', value: { amount: 48600, currency: 'INR' }, originType: 'document_extraction', confidence: 1.0, promptVersion: 'extraction@1', sources: [{ evidenceId: 'EV-CL-2041-02' }] },
  ];
  await ExtractedFact.insertMany(facts2041);

  await Analysis.create({
    claimId: 'CL-2041',
    version: 1,
    analysisId: 'an_seed2041',
    state: 'ready',
    model: { name: 'seed-fixture', promptVersion: 'analysis@1' },
    aiStatus: 'mock',
    createdBy: 'usr_meera',
    evidenceSnapshot: ev2041.map((f) => ({ evidenceId: f._id, sha256: f.sha256 })),
    stages: [{ name: 'finalize', status: 'completed' }],
    summary: 'Consistent claim declaration matching policy terms and workshop parts estimate.',
    extractedFacts: facts2041,
    matrix: { columns: [{ id: 'claim_form', label: 'Claim Form' }], rows: [] },
    findings: [],
    missingEvidence: [],
    policy: {
      clauses: [{ title: 'Own Damage Standard Cover', text: 'Accidental collision loss' }],
      coverage: [{ item: 'Own Damage IDV', limit: { amount: 500000, currency: 'INR' } }],
    },
    settlement: {
      status: 'calculated',
      currency: 'INR',
      lines: [
        { label: 'Total Itemised Repair Estimate', value: 48600, kind: 'estimate_total' },
        { label: 'Policy Sum Insured Limit (IDV)', value: 500000, kind: 'sublimit' },
        { label: 'Compulsory Deductible', value: 1000, kind: 'deductible' },
        { label: 'Eligible Assessment Amount', value: 48600, kind: 'eligible_amount' },
        { label: 'Final Calculated Settlement', value: 47600, kind: 'final_calculated' },
      ],
      formula: 'result = max(0, min(eligible, limit) - deductible)',
      assumptions: ['All itemised estimate lines treated as eligible'],
      unresolved: [],
      resultAmount: 47600,
      overrides: [],
      calculatedAt: new Date(),
    },
  });

  // 5. Pre-stored Analysis for CL-2042 (Inconsistent, withheld)
  await Analysis.create({
    claimId: 'CL-2042',
    version: 1,
    analysisId: 'an_seed2042',
    state: 'ready',
    model: { name: 'seed-fixture', promptVersion: 'analysis@1' },
    aiStatus: 'mock',
    createdBy: 'usr_meera',
    evidenceSnapshot: [],
    stages: [{ name: 'finalize', status: 'completed' }],
    summary: 'Analysis identified chronological and arithmetic discrepancies in estimate.',
    extractedFacts: [],
    matrix: { columns: [{ id: 'claim_form', label: 'Claim Form' }], rows: [] },
    findings: [
      {
        id: 'F-1-01',
        ruleId: 'R04',
        type: 'calculation_check',
        title: 'Repair Estimate Total Does Not Equal Sum of Line Items',
        category: 'repair_loss',
        priority: 'high',
        status: 'open',
        blocksSettlement: true,
        observed: [],
        claimantAssertions: [],
        documentFacts: ['Stated total: ₹65,200', 'Sum of line items: ₹62,300'],
        calculations: ['Discrepancy: ₹2,900'],
        alternatives: ['Taxes or shop supplies omitted from itemised breakdown'],
        uncertainty: 'Discrepancy between stated estimate total and itemised breakdown sum',
        nextAction: 'Request revised, itemised tax invoice from workshop',
        sources: [],
        lowEvidence: false,
      },
      {
        id: 'F-1-02',
        ruleId: 'R05',
        type: 'inconsistency',
        title: 'Repair Estimate Dated Prior to Reported Incident Date',
        category: 'repair_loss',
        priority: 'high',
        status: 'open',
        blocksSettlement: true,
        observed: [],
        claimantAssertions: ['Incident occurred 14 Oct 2026'],
        documentFacts: ['Estimate dated 11 Oct 2026'],
        calculations: [],
        alternatives: ['Typographical error in workshop document header'],
        uncertainty: 'Estimate predates reported date of accident',
        nextAction: 'Confirm vehicle check-in date with workshop management',
        sources: [],
        lowEvidence: false,
      },
    ],
    missingEvidence: [],
    policy: { clauses: [], coverage: [] },
    settlement: {
      status: 'withheld',
      currency: 'INR',
      lines: [],
      formula: 'result = max(0, min(eligible, limit) - deductible)',
      assumptions: ['All itemised estimate lines treated as eligible'],
      unresolved: [
        { id: 'unresolved_finding_F-1-01', message: 'Open finding blocker: Repair Estimate Total Does Not Equal Sum of Line Items' },
        { id: 'unresolved_finding_F-1-02', message: 'Open finding blocker: Repair Estimate Dated Prior to Reported Incident Date' },
      ],
      resultAmount: null,
      overrides: [],
      calculatedAt: new Date(),
    },
  });

  // 6. Pre-stored Analysis for CL-2043 (Incomplete, withheld)
  await Analysis.create({
    claimId: 'CL-2043',
    version: 1,
    analysisId: 'an_seed2043',
    state: 'ready',
    model: { name: 'seed-fixture', promptVersion: 'analysis@1' },
    aiStatus: 'mock',
    createdBy: 'usr_vikram',
    evidenceSnapshot: [],
    stages: [{ name: 'finalize', status: 'completed' }],
    summary: 'Core policy and workshop estimate documentation missing from submission.',
    extractedFacts: [],
    matrix: { columns: [{ id: 'claim_form', label: 'Claim Form' }], rows: [] },
    findings: [
      {
        id: 'F-1-01',
        ruleId: 'R10',
        type: 'missing_information',
        title: 'Policy Coverage Terms and Deductibles Not Established',
        category: 'policy',
        priority: 'high',
        status: 'open',
        blocksSettlement: true,
        observed: [],
        claimantAssertions: [],
        documentFacts: [],
        calculations: [],
        alternatives: ['Policy schedule not uploaded'],
        uncertainty: 'Coverage limit and deductible unknown',
        nextAction: 'Request policy schedule document',
        sources: [],
        lowEvidence: false,
      },
    ],
    missingEvidence: [
      { id: 'me_policy', category: 'policy', label: 'Policy Schedule', reason: 'Required to confirm coverage' },
      { id: 'me_estimate', category: 'repair_loss', label: 'Repair Estimate', reason: 'Required to assess loss' },
    ],
    policy: { clauses: [], coverage: [] },
    settlement: {
      status: 'withheld',
      currency: 'INR',
      lines: [],
      formula: 'result = max(0, min(eligible, limit) - deductible)',
      assumptions: [],
      unresolved: [
        { id: 'unresolved_sum_insured', message: 'Policy sum insured / IDV limit is unknown or unextracted' },
        { id: 'unresolved_deductible', message: 'Compulsory policy deductible could not be verified' },
      ],
      resultAmount: null,
      overrides: [],
      calculatedAt: new Date(),
    },
  });

  // 7. Pre-stored Analysis for CL-2044 (Ambiguous midnight, withheld)
  await Analysis.create({
    claimId: 'CL-2044',
    version: 1,
    analysisId: 'an_seed2044',
    state: 'ready',
    model: { name: 'seed-fixture', promptVersion: 'analysis@1' },
    aiStatus: 'mock',
    createdBy: 'usr_vikram',
    evidenceSnapshot: [],
    stages: [{ name: 'finalize', status: 'completed' }],
    summary: 'Incident reported around midnight coincides with policy expiry boundary.',
    extractedFacts: [],
    matrix: { columns: [{ id: 'claim_form', label: 'Claim Form' }], rows: [] },
    findings: [
      {
        id: 'F-1-01',
        ruleId: 'R01',
        type: 'inconsistency',
        title: 'Incident Date Near Policy Period Boundary with Uncertain Time',
        category: 'policy',
        priority: 'high',
        status: 'open',
        blocksSettlement: true,
        observed: [],
        claimantAssertions: ['Incident around midnight (time uncertain)'],
        documentFacts: ['Policy ended 15 Oct 11:59 pm'],
        calculations: [],
        alternatives: ['Accident occurred before midnight', 'Accident occurred after policy expired'],
        uncertainty: 'Exact timestamp determines active coverage status',
        nextAction: 'Request tow truck dispatch or toll receipt timestamp',
        sources: [],
        lowEvidence: false,
      },
      {
        id: 'F-1-02',
        ruleId: 'R13',
        type: 'missing_information',
        title: 'Policy Clause References Unsupplied Annexure or Endorsement',
        category: 'policy',
        priority: 'high',
        status: 'open',
        blocksSettlement: true,
        observed: [],
        claimantAssertions: [],
        documentFacts: ['Consumables clause references Annexure C (not supplied)'],
        calculations: [],
        alternatives: ['Endorsement document was issued separately'],
        uncertainty: 'Specific terms of consumables add-on not verifiable',
        nextAction: 'Request policy Annexure C schedule',
        suggestedRequestTitle: 'Policy Add-on Endorsement Schedule',
        sources: [],
        lowEvidence: false,
      },
    ],
    missingEvidence: [],
    policy: { clauses: [], coverage: [] },
    settlement: {
      status: 'withheld',
      currency: 'INR',
      lines: [],
      formula: 'result = max(0, min(eligible, limit) - deductible)',
      assumptions: [],
      unresolved: [
        { id: 'unresolved_finding_F-1-01', message: 'Open finding blocker: Incident Date Near Policy Period Boundary with Uncertain Time' },
        { id: 'unresolved_finding_F-1-02', message: 'Open finding blocker: Policy Clause References Unsupplied Annexure or Endorsement' },
      ],
      resultAmount: null,
      overrides: [],
      calculatedAt: new Date(),
    },
  });

  // Seed open request on CL-2043
  await EvidenceRequest.create({
    claimId: 'CL-2043',
    title: 'Policy Schedule and Workshop Estimate',
    reason: 'Please upload your complete motor policy certificate and repair estimate.',
    status: 'sent',
    createdBy: { id: 'usr_vikram', name: 'Vikram Shah' },
    sentAt: new Date(),
  });

  // Seed open request on CL-2047
  await EvidenceRequest.create({
    claimId: 'CL-2047',
    title: 'Clear Photo of Damaged Section',
    reason: 'Please provide a clear eye-level photograph of the cracked fog lamp.',
    status: 'sent',
    createdBy: { id: 'usr_meera', name: 'Meera Iyer' },
    sentAt: new Date(),
  });

  // Seed decisions on CL-2048, CL-2049, CL-2050
  await Decision.create({
    claimId: 'CL-2048',
    decision: 'recommend_approve',
    rationale: 'Loss verified against garage assessment; recommended for standard settlement.',
    recommendedAmount: 22000,
    actor: { id: 'usr_meera', name: 'Meera Iyer' },
  });

  await Decision.create({
    claimId: 'CL-2049',
    decision: 'closed',
    rationale: 'Claim settled and closed.',
    actor: { id: 'usr_vikram', name: 'Vikram Shah' },
  });

  await Decision.create({
    claimId: 'CL-2050',
    decision: 'closed',
    rationale: 'Payment disbursed and file closed.',
    actor: { id: 'usr_meera', name: 'Meera Iyer' },
  });

  // Seed sample private note on CL-2041 for the no-leak test
  await PrivateNote.create({
    claimId: 'CL-2041',
    author: { id: 'usr_meera', name: 'Meera Iyer' },
    body: 'CONFIDENTIAL_VERIFIER_SECRET_NOTE_9921_DO_NOT_LEAK',
  });

  logger.info('Database seeded successfully with 6 users, 10 submitted claims (2 new, 3 in review, 2 awaiting claimant, 1 decision pending, 2 completed) + 1 draft.');

  return {
    users: users.length,
    submittedClaims: 10,
    draftClaims: 1,
    analyses: 4,
  };
}

// Allow direct execution
if (process.argv[1]?.endsWith('loader.js')) {
  seedDatabase()
    .then((res) => {
      console.log('Seed completed successfully:', res);
      process.exit(0);
    })
    .catch((err) => {
      console.error('Seed failed:', err);
      process.exit(1);
    });
}
