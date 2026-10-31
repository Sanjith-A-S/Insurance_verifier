import { normalizeRegistration, normalizeVin } from '../lib/normalize.js';

/**
 * Deterministic Evidence Comparison Matrix Builder.
 * Generates structured columns and rows with stable row IDs.
 */
export function buildEvidenceMatrix(claim, extractedFacts = [], evidenceFiles = [], annotations = []) {
  // Annotation lookup by rowId
  const annotationMap = new Map();
  for (const ann of annotations) {
    annotationMap.set(ann.rowId, ann);
  }

  // Determine active columns based on sources
  const columns = [{ id: 'claim_form', label: 'Claim Form' }];

  const sourceMap = new Map();
  for (const ev of evidenceFiles) {
    let colId = ev.category;
    if (ev.category === 'policy') colId = 'policy_doc';
    else if (ev.category === 'vehicle_identity') colId = 'rc_doc';
    else if (ev.category === 'repair_loss') colId = 'estimate_doc';
    else if (ev.category === 'photos_video') colId = 'photos';

    if (!sourceMap.has(colId)) {
      sourceMap.set(colId, {
        id: colId,
        label: ev.category === 'photos_video' ? 'Photographs' : ev.fileName,
        evidenceIds: [ev._id || ev.id],
      });
    } else {
      sourceMap.get(colId).evidenceIds.push(ev._id || ev.id);
    }
  }

  for (const col of sourceMap.values()) {
    columns.push(col);
  }

  // Helper to extract fact values for attribute
  const getFactVal = (type) => extractedFacts.find((f) => f.factType === type);

  // Rows definition
  const rowDefs = [
    {
      id: 'row_incident_date',
      attribute: 'Incident Date / Time',
      claimValue: `${claim.incident?.date || ''} ${claim.incident?.time || ''}`.trim(),
      factType: 'document_date',
    },
    {
      id: 'row_location',
      attribute: 'Incident Location',
      claimValue: claim.incident?.location || '',
      factType: 'incident_location',
    },
    {
      id: 'row_registration',
      attribute: 'Vehicle Registration',
      claimValue: claim.vehicle?.registrationNumber || '',
      factType: 'vehicle_registration',
    },
    {
      id: 'row_vin',
      attribute: 'Chassis Number / VIN',
      claimValue: claim.vehicle?.vin || '',
      factType: 'vin',
    },
    {
      id: 'row_policy_period',
      attribute: 'Policy Coverage Period',
      claimValue: claim.incident?.date || '',
      factType: 'policy_period_start',
    },
    {
      id: 'row_deductible_limit',
      attribute: 'Compulsory Deductible / Limit',
      claimValue: 'Applicable standard deductible',
      factType: 'deductible',
    },
    {
      id: 'row_damage_areas',
      attribute: 'Damaged Areas',
      claimValue: (claim.incident?.visibleDamageAreas || []).join(', '),
      factType: 'damage_observation',
    },
    {
      id: 'row_estimate_total',
      attribute: 'Repair Estimate Total',
      claimValue: 'Awaiting loss assessment',
      factType: 'estimate_total',
    },
  ];

  const rows = rowDefs.map((def) => {
    const fact = getFactVal(def.factType);
    const cells = {};

    // Claim form cell
    cells['claim_form'] = {
      value: def.claimValue,
      sources: [],
      state: def.claimValue ? 'match' : 'missing',
    };

    // Evaluate for other present columns
    for (const col of columns) {
      if (col.id === 'claim_form') continue;

      if (!fact) {
        cells[col.id] = {
          value: 'Not extracted',
          sources: [],
          state: 'missing',
        };
        continue;
      }

      let state = 'match';
      let displayValue = typeof fact.value === 'object' && fact.value !== null
        ? JSON.stringify(fact.value)
        : String(fact.value);

      if (def.id === 'row_registration') {
        const cReg = normalizeRegistration(def.claimValue);
        const fReg = normalizeRegistration(displayValue);
        if (cReg && fReg && cReg !== fReg) {
          state = 'mismatch';
        }
      } else if (def.id === 'row_vin') {
        const cVin = normalizeVin(def.claimValue);
        const fVin = normalizeVin(displayValue);
        if (cVin && fVin && cVin !== fVin) {
          state = 'mismatch';
        }
      }

      cells[col.id] = {
        value: displayValue,
        sources: fact.sources || [],
        state,
      };
    }

    const annotation = annotationMap.get(def.id);

    return {
      id: def.id,
      attribute: def.attribute,
      cells,
      annotation: annotation ? { text: annotation.text, by: annotation.by, at: annotation.at } : null,
    };
  });

  return { columns, rows };
}
