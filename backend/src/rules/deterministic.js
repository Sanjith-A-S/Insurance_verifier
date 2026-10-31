import { normalizeRegistration, normalizeVin, levenshteinDistance } from '../lib/normalize.js';

/**
 * Deterministic Rules R01 - R13.
 * Pure functions returning Finding objects or null.
 */

export function runDeterministicRules(claim, extractedFacts = [], evidenceFiles = []) {
  const findings = [];
  let findingSeq = 1;

  const nextFindingId = (version = 1) => `F-${version}-${String(findingSeq++).padStart(2, '0')}`;

  // Helper to find facts by type
  const getFacts = (type) => extractedFacts.filter((f) => f.factType === type);
  const getFirstFact = (type) => extractedFacts.find((f) => f.factType === type);

  // R01: Policy Period Check
  const policyStartFact = getFirstFact('policy_period_start');
  const policyEndFact = getFirstFact('policy_period_end');
  const incidentDate = claim.incident?.date;

  if (policyStartFact && policyEndFact && incidentDate) {
    const incDate = new Date(incidentDate);
    const startDate = new Date(policyStartFact.value);
    const endDate = new Date(policyEndFact.value);

    if (claim.incident.timeUncertain) {
      // Check boundary ambiguity (same day as start or end)
      const incDay = incidentDate.split('T')[0];
      const startDay = new Date(policyStartFact.value).toISOString().split('T')[0];
      const endDay = new Date(policyEndFact.value).toISOString().split('T')[0];

      if (incDay === startDay || incDay === endDay) {
        findings.push({
          ruleId: 'R01',
          type: 'inconsistency',
          title: 'Incident Date Near Policy Period Boundary with Uncertain Time',
          category: 'policy',
          priority: 'high',
          status: 'open',
          blocksSettlement: true,
          observed: [],
          claimantAssertions: [`Incident reported on ${incidentDate} with time marked as uncertain`],
          documentFacts: [
            `Policy valid from ${policyStartFact.value} to ${policyEndFact.value}`,
          ],
          calculations: [],
          alternatives: [
            'Accident occurred within active policy window before midnight expiry',
            'Accident occurred after policy expired at midnight',
          ],
          uncertainty: 'Exact time of incident is unverified and falls on policy boundary date',
          nextAction: 'Request precise time confirmation, police GD log, or tow truck dispatch timestamp',
          sources: policyEndFact.sources || [],
          lowEvidence: false,
        });
      }
    } else if (incDate < startDate || incDate > endDate) {
      findings.push({
        ruleId: 'R01',
        type: 'inconsistency',
        title: 'Incident Date Outside Policy Coverage Period',
        category: 'policy',
        priority: 'high',
        status: 'open',
        blocksSettlement: true,
        observed: [],
        claimantAssertions: [`Incident date ${incidentDate}`],
        documentFacts: [
          `Policy period: ${policyStartFact.value} to ${policyEndFact.value}`,
        ],
        calculations: [],
        alternatives: ['Data entry date error on claim form', 'Policy schedule uploaded belongs to different term'],
        uncertainty: 'Reported accident date does not fall within documented policy dates',
        nextAction: 'Verify policy renewal schedule or correct claim incident date',
        sources: policyStartFact.sources || [],
        lowEvidence: false,
      });
    }
  }

  // R02: Vehicle Registration Equality Check
  const claimReg = normalizeRegistration(claim.vehicle?.registrationNumber);
  const regFacts = getFacts('vehicle_registration');
  const plateFacts = getFacts('visible_plate_text');

  const allRegs = [...regFacts, ...plateFacts];
  for (const fact of allRegs) {
    const normFactVal = normalizeRegistration(String(fact.value));
    if (claimReg && normFactVal && claimReg !== normFactVal) {
      findings.push({
        ruleId: 'R02',
        type: 'inconsistency',
        title: 'Vehicle Registration Discrepancy Across Documents',
        category: 'vehicle_identity',
        priority: 'high',
        status: 'open',
        blocksSettlement: true,
        observed: fact.factType === 'visible_plate_text' ? [`Visible plate reads '${fact.value}'`] : [],
        claimantAssertions: [`Claim form registration '${claim.vehicle?.registrationNumber}'`],
        documentFacts: [`Extracted registration '${fact.value}' from ${fact.label}`],
        calculations: [],
        alternatives: [
          'Clerical typographical error in registration number entry',
          'Optical Character Recognition (OCR) misread on damaged plate',
          'Registration plate replaced or vehicle transfer in progress',
          'Document uploaded pertains to another vehicle on multi-car policy',
        ],
        uncertainty: 'Mismatch between claimed registration and documented/photographed vehicle identifier',
        nextAction: 'Request clear physical RC scan or vehicle chassis pencil print',
        sources: fact.sources || [],
        lowEvidence: false,
      });
      break;
    }
  }

  // R03: VIN / Chassis Equality Check
  const claimVin = normalizeVin(claim.vehicle?.vin);
  const vinFacts = getFacts('vin');

  for (const vf of vinFacts) {
    const normVinVal = normalizeVin(String(vf.value));
    if (claimVin && normVinVal && claimVin !== normVinVal) {
      const dist = levenshteinDistance(claimVin, normVinVal);
      findings.push({
        ruleId: 'R03',
        type: 'inconsistency',
        title: 'Vehicle Identification Number (VIN) Discrepancy',
        category: 'vehicle_identity',
        priority: 'high',
        status: 'open',
        blocksSettlement: true,
        observed: [],
        claimantAssertions: [`VIN entered: ${claim.vehicle?.vin}`],
        documentFacts: [`Extracted VIN: ${vf.value}`],
        calculations: [`Character difference distance: ${dist}`],
        alternatives: [
          dist <= 2
            ? 'Possible minor transcription difference or OCR character confusion (e.g. 0/O, 1/I)'
            : 'Different vehicle chassis referenced in document',
        ],
        uncertainty: 'Chassis number mismatch between claim record and official document',
        nextAction: 'Inspect physical chassis plate stamping photograph',
        sources: vf.sources || [],
        lowEvidence: false,
      });
      break;
    }
  }

  // R04: Estimate Line Items Sum Check
  const lineItemFacts = getFacts('estimate_line_item');
  const estimateTotalFact = getFirstFact('estimate_total');

  if (lineItemFacts.length > 0 && estimateTotalFact) {
    const sumLines = lineItemFacts.reduce((acc, f) => {
      const val = typeof f.value === 'object' && f.value !== null ? f.value.amount : f.value;
      const num = parseFloat(val);
      return acc + (isNaN(num) ? 0 : num);
    }, 0);

    const statedTotal = parseFloat(
      typeof estimateTotalFact.value === 'object' && estimateTotalFact.value !== null
        ? estimateTotalFact.value.amount
        : estimateTotalFact.value
    );

    if (!isNaN(statedTotal) && Math.abs(sumLines - statedTotal) > 1.0) {
      findings.push({
        ruleId: 'R04',
        type: 'calculation_check',
        title: 'Repair Estimate Total Does Not Equal Sum of Line Items',
        category: 'repair_loss',
        priority: 'high',
        status: 'open',
        blocksSettlement: true,
        observed: [],
        claimantAssertions: [],
        documentFacts: [
          `Stated estimate total: ₹${statedTotal.toLocaleString('en-IN')}`,
          `Sum of ${lineItemFacts.length} individual line items: ₹${sumLines.toLocaleString('en-IN')}`,
        ],
        calculations: [
          `Line items total: ₹${sumLines.toFixed(2)}`,
          `Stated total: ₹${statedTotal.toFixed(2)}`,
          `Discrepancy: ₹${Math.abs(sumLines - statedTotal).toFixed(2)}`,
        ],
        alternatives: [
          'Taxes, consumables, or labour surcharge not itemised in breakdown',
          'Arithmetic error in garage repair estimate sheet',
        ],
        uncertainty: 'Discrepancy between stated estimate total and itemised breakdown sum',
        nextAction: 'Request revised, itemised tax invoice or detailed bill of materials from workshop',
        sources: estimateTotalFact.sources || [],
        lowEvidence: false,
      });
    }
  }

  // R05: Estimate/Invoice/Police Report dated earlier than Incident
  const docDateFacts = [
    ...getFacts('document_date'),
    ...getFacts('estimate_garage'),
  ];
  if (incidentDate) {
    const incD = new Date(incidentDate);
    for (const df of docDateFacts) {
      if (df.value && df.value.date) {
        const dVal = new Date(df.value.date);
        if (dVal < incD) {
          findings.push({
            ruleId: 'R05',
            type: 'inconsistency',
            title: 'Repair Estimate Dated Prior to Reported Incident Date',
            category: 'repair_loss',
            priority: 'high',
            status: 'open',
            blocksSettlement: true,
            observed: [],
            claimantAssertions: [`Incident occurred on ${incidentDate}`],
            documentFacts: [`Estimate document dated on ${df.value.date}`],
            calculations: [],
            alternatives: [
              'Estimate document created using incorrect system clock or typographical date error',
              'Estimate relates to prior pre-existing damage inspection',
            ],
            uncertainty: 'Supporting repair documentation predates the reported date of loss',
            nextAction: 'Obtain workshop clarification on estimate generation date',
            sources: df.sources || [],
            lowEvidence: false,
          });
          break;
        }
      }
    }
  }

  // R06: EXIF Date Taken Earlier than Incident by > 1 Day
  if (incidentDate) {
    const incD = new Date(incidentDate);
    for (const ev of evidenceFiles) {
      if (ev.provenance?.metadata?.dateTaken) {
        const takenD = new Date(ev.provenance.metadata.dateTaken);
        const diffDays = (incD.getTime() - takenD.getTime()) / (1000 * 3600 * 24);
        if (diffDays > 1.0) {
          findings.push({
            ruleId: 'R06',
            type: 'inconsistency',
            title: 'Photo Capture Date Precedes Reported Incident Date',
            category: 'photos_video',
            priority: 'medium',
            status: 'open',
            blocksSettlement: false, // Informational, does not block
            observed: [`Photo metadata indicates creation date ${ev.provenance.metadata.dateTaken}`],
            claimantAssertions: [`Reported incident date: ${incidentDate}`],
            documentFacts: [],
            calculations: [`Time offset: approximately ${Math.round(diffDays)} days prior`],
            alternatives: [
              'Camera internal clock or time-zone setting was incorrect',
              'Image was re-saved, edited, or exported from messaging backup',
              'Photograph captured prior damage from an earlier event',
            ],
            uncertainty: 'Photo timestamp differs from claimant reported accident chronology',
            nextAction: 'Request original unmodified photo directly from camera roll or witness device',
            sources: [{ evidenceId: ev._id || ev.id, field: 'EXIF.DateTimeOriginal' }],
            lowEvidence: false,
          });
          break;
        }
      }
    }
  }

  // R07: Identical SHA-256 within Claim
  for (const ev of evidenceFiles) {
    if (ev.provenance?.duplicateOfIds?.length > 0) {
      findings.push({
        ruleId: 'R07',
        type: 'inconsistency',
        title: 'Identical File Bytes Uploaded Multiple Times',
        category: 'photos_video',
        priority: 'low',
        status: 'open',
        blocksSettlement: false,
        observed: ['Identical SHA-256 file hash detected within claim evidence'],
        claimantAssertions: [],
        documentFacts: [],
        calculations: [],
        alternatives: [
          'Duplicate file uploaded to satisfy multiple checklist requirements',
          'Accidental repeat upload during file selection',
        ],
        uncertainty: 'Same file provides duplicate submission for distinct checklist items',
        nextAction: 'Request distinct perspective view for secondary checklist requirement',
        sources: [{ evidenceId: ev._id || ev.id }],
        lowEvidence: false,
      });
      break;
    }
  }

  // R08: dHash Similarity <= 6
  for (const ev of evidenceFiles) {
    if (ev.provenance?.similarToIds?.length > 0) {
      findings.push({
        ruleId: 'R08',
        type: 'inconsistency',
        title: 'Visually Similar Photographs Detected',
        category: 'photos_video',
        priority: 'low',
        status: 'open',
        blocksSettlement: false,
        observed: ['Perceptual hash difference is within visual similarity threshold'],
        claimantAssertions: [],
        documentFacts: [],
        calculations: [],
        alternatives: [
          'Consecutive burst shots captured from nearly identical angle',
          'Cropped or scaled version of existing photo',
        ],
        uncertainty: 'Photographs offer redundant angles rather than distinct vehicle perspectives',
        nextAction: 'Request complementary angle showing full vehicle profile',
        sources: [{ evidenceId: ev._id || ev.id }],
        lowEvidence: false,
      });
      break;
    }
  }

  // R09: Required Claim-Form Fields Missing
  const missingFormFields = [];
  if (!claim.incident?.location) missingFormFields.push('incident.location');
  if (!claim.vehicle?.registrationNumber) missingFormFields.push('vehicle.registrationNumber');
  if (!claim.vehicle?.make) missingFormFields.push('vehicle.make');

  if (missingFormFields.length > 0) {
    findings.push({
      ruleId: 'R09',
      type: 'missing_information',
      title: 'Required Claim Form Information Incomplete',
      category: 'incident',
      priority: 'high',
      status: 'open',
      blocksSettlement: true,
      observed: [],
      claimantAssertions: [],
      documentFacts: [],
      calculations: [],
      alternatives: ['Claimant omitted optional details during quick submission'],
      uncertainty: `Missing core fields: ${missingFormFields.join(', ')}`,
      nextAction: 'Request claimant update incomplete claim declaration fields',
      sources: [],
      lowEvidence: false,
    });
  }

  // R10: Deductible / Limit / Policy Period Missing from Policy Facts
  const deductibleFact = getFirstFact('deductible');
  const sumInsuredFact = getFirstFact('sum_insured');

  if (!deductibleFact || !sumInsuredFact || !policyStartFact || !policyEndFact) {
    const missingPolicyItems = [];
    if (!deductibleFact) missingPolicyItems.push('compulsory deductible');
    if (!sumInsuredFact) missingPolicyItems.push('insured declared value (sum insured)');
    if (!policyStartFact || !policyEndFact) missingPolicyItems.push('policy validity period');

    findings.push({
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
      alternatives: [
        'Policy schedule document unreadable or page truncated',
        'Uploaded document is premium receipt rather than complete policy schedule',
      ],
      uncertainty: `Unresolved policy terms: ${missingPolicyItems.join(', ')}`,
      nextAction: 'Request full multi-page motor policy schedule certificate',
      sources: [],
      lowEvidence: false,
    });
  }

  // R11: Estimate Total Exceeds Extracted Sum Insured
  if (estimateTotalFact && sumInsuredFact) {
    const estVal = parseFloat(
      typeof estimateTotalFact.value === 'object' && estimateTotalFact.value !== null
        ? estimateTotalFact.value.amount
        : estimateTotalFact.value
    );
    const sumVal = parseFloat(
      typeof sumInsuredFact.value === 'object' && sumInsuredFact.value !== null
        ? sumInsuredFact.value.amount
        : sumInsuredFact.value
    );

    if (!isNaN(estVal) && !isNaN(sumVal) && estVal > sumVal) {
      findings.push({
        ruleId: 'R11',
        type: 'inconsistency',
        title: 'Estimated Repair Total Exceeds Policy Sum Insured',
        category: 'repair_loss',
        priority: 'high',
        status: 'open',
        blocksSettlement: false, // Capped in settlement
        observed: [],
        claimantAssertions: [],
        documentFacts: [
          `Estimated repair total: ₹${estVal.toLocaleString('en-IN')}`,
          `Policy Sum Insured (IDV): ₹${sumVal.toLocaleString('en-IN')}`,
        ],
        calculations: [`Excess over sum insured: ₹${(estVal - sumVal).toFixed(2)}`],
        alternatives: [
          'Vehicle may be constructive total loss (CTL)',
          'High repair estimate exceeds insured declared value',
        ],
        uncertainty: 'Loss extent reaches total loss threshold relative to insured vehicle value',
        nextAction: 'Initiate total loss / salvage valuation assessment',
        sources: estimateTotalFact.sources || [],
        lowEvidence: false,
      });
    }
  }

  // R12: Required Checklist Photo Views Missing
  const checklist = claim.checklist || [];
  const missingPhotos = checklist.filter(
    (item) =>
      item.category === 'photos_video' &&
      item.requirement === 'required' &&
      !['uploaded', 'processing', 'received', 'reviewed'].includes(item.status)
  );

  if (missingPhotos.length > 0) {
    findings.push({
      ruleId: 'R12',
      type: 'missing_information',
      title: 'Mandatory Vehicle Damage Photographs Missing',
      category: 'photos_video',
      priority: 'high',
      status: 'open',
      blocksSettlement: false,
      observed: [],
      claimantAssertions: [],
      documentFacts: [],
      calculations: [],
      alternatives: ['Claimant has not yet provided photos of all damaged panels'],
      uncertainty: `Pending views: ${missingPhotos.map((p) => p.label).join(', ')}`,
      nextAction: 'Issue evidence request for remaining damaged section photographs',
      sources: [],
      lowEvidence: false,
    });
  }

  // R13: Unresolved Reference in Policy Fact (e.g. annexure not supplied)
  const unresolvedRefFact = getFirstFact('unresolved_reference');
  if (unresolvedRefFact) {
    findings.push({
      ruleId: 'R13',
      type: 'missing_information',
      title: 'Policy Clause References Unsupplied Annexure or Endorsement',
      category: 'policy',
      priority: 'high',
      status: 'open',
      blocksSettlement: true,
      observed: [],
      claimantAssertions: [],
      documentFacts: [String(unresolvedRefFact.value || unresolvedRefFact.label)],
      calculations: [],
      alternatives: [
        'Endorsement schedule was issued separately from master policy schedule',
        'Add-on coverage wording contained in separate endorsement document',
      ],
      uncertainty: 'Terms of applicable add-on clause cannot be validated without referenced annexure',
      nextAction: 'Request referenced policy endorsement / annexure schedule',
      suggestedRequestTitle: 'Policy Add-on Endorsement Schedule',
      sources: unresolvedRefFact.sources || [],
      lowEvidence: false,
    });
  }

  return findings;
}
