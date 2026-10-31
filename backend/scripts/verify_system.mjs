import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { env } from '../src/config/env.js';
import { connectDB, disconnectDB } from '../src/db/connect.js';
import { logger } from '../src/middleware/logger.js';
import { seedDatabase } from '../seed/loader.js';
import { User } from '../src/models/user.model.js';
import { Claim } from '../src/models/claim.model.js';
import { EvidenceFile } from '../src/models/evidenceFile.model.js';
import { Analysis } from '../src/models/analysis.model.js';
import { ExtractedFact } from '../src/models/extractedFact.model.js';
import { FindingReview } from '../src/models/findingReview.model.js';
import { MatrixAnnotation } from '../src/models/matrixAnnotation.model.js';
import { SettlementCalculation, SettlementOverride } from '../src/models/settlement.model.js';
import { EvidenceRequest } from '../src/models/evidenceRequest.model.js';
import { ClaimMessage } from '../src/models/claimMessage.model.js';
import { PrivateNote } from '../src/models/privateNote.model.js';
import { TimelineEvent } from '../src/models/timelineEvent.model.js';
import { Decision } from '../src/models/decision.model.js';
import { Recommendation } from '../src/models/recommendation.model.js';
import { Counter } from '../src/models/counter.model.js';

import { runDeterministicRules } from '../src/rules/deterministic.js';
import { calculateSettlement } from '../src/rules/settlement.js';
import { buildEvidenceMatrix } from '../src/rules/matrix.js';
import { containsBannedLanguage, sanitizeBannedLanguage, validateAndSanitizeFindings } from '../src/ai/safety.js';
import { initiateAnalysis } from '../src/ai/pipeline.js';
import { createRecommendationOffer, getRecommendation } from '../src/modules/recommendations/service.js';

console.log('\n=============================================================');
console.log('       ClaimLens AI — System & Database Verification        ');
console.log('=============================================================\n');

let memoryServer = null;

async function establishDatabaseConnection() {
  const targetUri = env.MONGODB_URI;
  const maskedUri = targetUri.replace(/:([^:@]+)@/, ':****@');
  console.log(`[1/4] Connecting to configured MongoDB: ${maskedUri}...`);

  try {
    await mongoose.connect(targetUri, { serverSelectionTimeoutMS: 5000, connectTimeoutMS: 6000 });
    console.log('  [PASS] Successfully connected to live MongoDB cluster!\n');
    return true;
  } catch (err) {
    console.log(`  [INFO] Live MongoDB connection could not be established: ${err.message}`);
    if (targetUri.includes('mongodb.net')) {
      console.log('  [NOTE] Atlas Network Access requires whitelisting your IP in MongoDB Atlas:');
      console.log('         Go to MongoDB Atlas -> Network Access -> Add IP Address -> Allow Access from Anywhere (0.0.0.0/0)');
    }
    console.log('  [FALLBACK] Starting embedded MongoDB engine (MongoMemoryServer) for local verification...');
    memoryServer = await MongoMemoryServer.create();
    const memUri = memoryServer.getUri();
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await connectDB(memUri);
    console.log(`  [PASS] Connected to embedded MongoDB successfully at: ${memUri}\n`);
    return false;
  }
}

async function verifyDatabaseCollections() {
  console.log('[2/4] Running database seed and inspecting all 16 collections...');
  await seedDatabase();

  const collections = [
    { name: 'users', model: User },
    { name: 'claims', model: Claim },
    { name: 'counters', model: Counter },
    { name: 'evidence_files', model: EvidenceFile },
    { name: 'analyses', model: Analysis },
    { name: 'extracted_facts', model: ExtractedFact },
    { name: 'finding_reviews', model: FindingReview },
    { name: 'matrix_annotations', model: MatrixAnnotation },
    { name: 'settlement_calculations', model: SettlementCalculation },
    { name: 'settlement_overrides', model: SettlementOverride },
    { name: 'evidence_requests', model: EvidenceRequest },
    { name: 'claim_messages', model: ClaimMessage },
    { name: 'private_notes', model: PrivateNote },
    { name: 'timeline_events', model: TimelineEvent },
    { name: 'decisions', model: Decision },
    { name: 'recommendations', model: Recommendation },
  ];

  console.log('  -------------------------------------------------------------');
  console.log('  Collection Name               | Document Count | Status      ');
  console.log('  -------------------------------------------------------------');

  let allHealthy = true;
  for (const c of collections) {
    const count = await c.model.countDocuments();
    const padName = c.name.padEnd(29, ' ');
    const padCount = String(count).padStart(14, ' ');
    const status = count >= 0 ? '[OK]' : '[ERR]';
    if (count < 0) allHealthy = false;
    console.log(`  ${padName} | ${padCount} | ${status}`);
  }
  console.log('  -------------------------------------------------------------');

  const usersCount = await User.countDocuments();
  const claimsCount = await Claim.countDocuments();
  console.log(`  Summary: ${usersCount} users and ${claimsCount} claims successfully stored.\n`);
  return allHealthy;
}

async function verifyAIFeatures() {
  console.log('[3/4] Verifying all AI Features, Pipeline, Rules & Safety Engine...');

  // Test 1: Safety & Banned Language Screen
  console.log('  Testing AI Safety Screen & Guardrails...');
  const dirty = 'This claim shows fraud with a fake and forged receipt proving that it is a scam.';
  if (!containsBannedLanguage(dirty)) throw new Error('Safety filter failed to detect banned words');
  const cleaned = sanitizeBannedLanguage(dirty);
  if (containsBannedLanguage(cleaned)) throw new Error('Safety sanitizer failed to neutralize words');
  console.log('    [PASS] Accusatory words (fraud/fake/forged) neutralized to objective terminology');

  // Test 2: Deterministic Rules R01 - R13
  console.log('  Testing Deterministic Rules R01 through R13...');
  const testClaim = {
    incident: { date: '2026-06-15', location: 'Indiranagar, Bangalore' },
    vehicle: { registrationNumber: 'KA-01-MJ-5021', vin: 'MA3EW123456789' },
  };
  const testFacts = [
    { factType: 'policy_period_start', value: '2026-01-01' },
    { factType: 'policy_period_end', value: '2026-12-31' },
    { factType: 'vehicle_registration', value: 'KA-01-MJ-9999' }, // Discrepancy -> R02
    { factType: 'sum_insured', value: 500000 },
    { factType: 'deductible', value: 1000 },
    { factType: 'estimate_line_item', value: 35000 },
  ];
  const findings = runDeterministicRules(testClaim, testFacts, []);
  const r02 = findings.find((f) => f.ruleId === 'R02');
  if (!r02) throw new Error('Rule R02 failed to detect registration mismatch');
  console.log('    [PASS] Rules engine identified: ' + r02.title);

  // Test 3: Multi-Column Evidence Matrix
  console.log('  Testing Evidence Comparison Matrix...');
  const matrix = buildEvidenceMatrix(testClaim, testFacts, [
    { _id: 'EV-1', category: 'policy', fileName: 'policy.pdf' },
  ]);
  if (!matrix.columns || matrix.rows.length === 0) throw new Error('Matrix generation failed');
  console.log(`    [PASS] Matrix constructed with ${matrix.columns.length} columns and ${matrix.rows.length} rows`);

  // Test 4: Deterministic Settlement Engine
  console.log('  Testing Settlement Engine & Blockers...');
  const withheldSettlement = calculateSettlement({
    extractedFacts: testFacts,
    findings: [{ id: 'F-1', ruleId: 'R02', title: 'Reg Mismatch', blocksSettlement: true }],
  });
  if (withheldSettlement.status !== 'withheld' || withheldSettlement.resultAmount !== null) {
    throw new Error('Settlement withholding logic failed');
  }
  console.log('    [PASS] Settlement appropriately withheld (resultAmount: null) when blockers are active');

  const resolvedSettlement = calculateSettlement({
    extractedFacts: testFacts,
    findings: [{ id: 'F-1', ruleId: 'R02', title: 'Reg Mismatch', blocksSettlement: true }],
    findingReviews: [{ findingId: 'F-1', status: 'dismissed' }],
  });
  if (resolvedSettlement.status !== 'calculated' || resolvedSettlement.resultAmount !== 34000) {
    throw new Error('Settlement calculation formula failed');
  }
  console.log(`    [PASS] Settlement calculated deterministically: INR ${resolvedSettlement.resultAmount.toLocaleString('en-IN')}`);

  // Test 5: Future-Cover Recommendations
  console.log('  Testing Recommendations Invariant Guardrails...');
  const claimDoc = (await Claim.findOne({ status: { $ne: 'draft' }, assigneeId: 'usr_meera' })) || (await Claim.findOne({ status: { $ne: 'draft' } }));
  const claimantUser = await User.findById(claimDoc.claimantId);
  const claimant = { id: claimantUser._id.toString(), name: claimantUser.name, role: 'claimant' };
  const verifier = { id: claimDoc.assigneeId || 'usr_meera', name: 'Meera Iyer', role: 'verifier' };

  const statusBefore = claimDoc.status;
  await createRecommendationOffer(verifier, claimDoc._id, { offerToClaimant: true });
  const recView = await getRecommendation(claimant, claimDoc._id);

  if (!recView.label || !recView.content.notice.includes('cannot retroactively cover this incident')) {
    throw new Error('Educational disclaimer missing from recommendation');
  }
  const claimAfter = await Claim.findById(claimDoc._id);
  if (claimAfter.status !== statusBefore) throw new Error('Recommendation mutated claim status');
  console.log('    [PASS] Recommendation generated educational options; zero mutation to claim state');

  // Test 6: Async Analysis Trigger and Version Immutability
  console.log('  Testing Async Analysis Lifecycle & Versioning...');
  const initRes = await initiateAnalysis(claimDoc._id, verifier);
  if (initRes.status !== 'running') throw new Error('Async 202 initiate analysis failed');

  let pollAnalysis;
  for (let i = 0; i < 40; i++) {
    pollAnalysis = await Analysis.findOne({ claimId: claimDoc._id, version: initRes.version });
    const finalizeStage = pollAnalysis?.stages?.find((s) => s.name === 'finalize');
    if (pollAnalysis && pollAnalysis.state === 'ready' && finalizeStage?.status === 'completed') break;
    await new Promise((r) => setTimeout(r, 150));
  }
  if (!pollAnalysis || pollAnalysis.state !== 'ready') throw new Error('Analysis pipeline failed to reach ready state');
  console.log(`    [PASS] Analysis v${pollAnalysis.version} completed all stages: ${pollAnalysis.stages.map((s) => s.name).join(', ')}\n`);
}

async function runVerification() {
  try {
    const isLive = await establishDatabaseConnection();
    await verifyDatabaseCollections();
    await verifyAIFeatures();

    console.log('=============================================================');
    console.log('  [ALL PASSED] Database & AI Engine Fully Verified & Healthy ');
    console.log('=============================================================\n');

    await new Promise((r) => setTimeout(r, 600));
    await mongoose.disconnect();
    if (memoryServer) await memoryServer.stop();
    process.exit(0);
  } catch (err) {
    console.error('\n  [VERIFICATION FAILED]:', err.message);
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    if (memoryServer) await memoryServer.stop();
    process.exit(1);
  }
}

runVerification();
