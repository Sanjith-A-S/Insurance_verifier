/**
 * Pure functions for checklist generation and progress calculation.
 */

export function generateChecklist(claimData, existingChecklist = []) {
  const existingMap = new Map();
  if (Array.isArray(existingChecklist)) {
    for (const item of existingChecklist) {
      existingMap.set(item.id, item);
    }
  }

  const damageAreas = (claimData.incident && claimData.incident.visibleDamageAreas) || [];
  const policeFiled =
    claimData.incident?.policeReportFiled === 'yes' ||
    claimData.incident?.policeReportFiled === true ||
    claimData.incident?.type === 'theft';
  const thirdParty =
    claimData.incident?.thirdPartyInvolved === 'yes' ||
    claimData.incident?.thirdPartyInvolved === true;

  const definitions = [
    {
      id: 'policy_schedule',
      category: 'policy',
      label: 'Policy Schedule / Certificate',
      requirement: 'required',
      reason: 'Required to verify coverage, policy period, and applicable deductible.',
      acceptableExamples: ['PDF of motor policy schedule', 'Scan of physical policy bond'],
      acceptedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
      maxSizeMB: 15,
    },
    {
      id: 'rc_certificate',
      category: 'vehicle_identity',
      label: 'Registration Certificate (RC)',
      requirement: 'required',
      reason: 'Required to confirm vehicle ownership and verify chassis/engine numbers.',
      acceptableExamples: ['Smart card RC photo', 'Form 23 PDF'],
      acceptedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
      maxSizeMB: 15,
    },
    {
      id: 'driving_licence',
      category: 'driver',
      label: 'Driving Licence of Driver at Incident',
      requirement: 'required',
      reason: 'Required to confirm driver legality and licence validity at the time of the incident.',
      acceptableExamples: ['Front & back photo of physical licence', 'DigiLocker PDF'],
      acceptedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
      maxSizeMB: 15,
    },
    {
      id: 'repair_estimate',
      category: 'repair_loss',
      label: 'Detailed Workshop Repair Estimate',
      requirement: 'conditionally_required',
      reason: 'Required to assess itemised parts, labour charges, and compute settlement.',
      acceptableExamples: ['Itemised workshop estimate sheet with garage seal'],
      acceptedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
      maxSizeMB: 15,
    },
    {
      id: 'police_report',
      category: 'incident',
      label: 'Police FIR / General Diary Entry',
      requirement: policeFiled ? 'conditionally_required' : 'optional',
      reason: policeFiled
        ? 'A police report was filed for this incident; required for validation.'
        : 'Optional for minor single-vehicle collisions without third-party injury.',
      acceptableExamples: ['FIR copy', 'GD entry receipt'],
      acceptedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
      maxSizeMB: 15,
    },
    {
      id: 'third_party_details',
      category: 'incident',
      label: 'Third-Party Incident Documentation',
      requirement: thirdParty ? 'conditionally_required' : 'optional',
      reason: thirdParty
        ? 'Third party involvement reported; details needed to review liability.'
        : 'Not applicable if no third party was involved.',
      acceptableExamples: ['Third-party insurance details', 'Driver exchange note'],
      acceptedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
      maxSizeMB: 15,
    },
    // Photos
    {
      id: 'photo_front',
      category: 'photos_video',
      label: 'Vehicle Front View',
      requirement: damageAreas.includes('front') ? 'required' : 'optional',
      reason: damageAreas.includes('front')
        ? 'Front damage reported on claim form; clear view required.'
        : 'Full vehicle front view for overall assessment.',
      acceptableExamples: ['Eye-level photograph of vehicle front showing registration plate'],
      acceptedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/heic'],
      maxSizeMB: 15,
    },
    {
      id: 'photo_rear',
      category: 'photos_video',
      label: 'Vehicle Rear View',
      requirement: damageAreas.includes('rear') ? 'required' : 'optional',
      reason: damageAreas.includes('rear')
        ? 'Rear damage reported on claim form; clear view required.'
        : 'Full vehicle rear view.',
      acceptableExamples: ['Rear photograph showing number plate and tail lamps'],
      acceptedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/heic'],
      maxSizeMB: 15,
    },
    {
      id: 'photo_left',
      category: 'photos_video',
      label: 'Vehicle Left (Passenger) Side',
      requirement: damageAreas.includes('left_side') || damageAreas.includes('left') ? 'required' : 'optional',
      reason: 'Full side profile view.',
      acceptableExamples: ['Side photograph showing full left profile and wheels'],
      acceptedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/heic'],
      maxSizeMB: 15,
    },
    {
      id: 'photo_right',
      category: 'photos_video',
      label: 'Vehicle Right (Driver) Side',
      requirement: damageAreas.includes('right_side') || damageAreas.includes('right') ? 'required' : 'optional',
      reason: 'Full side profile view.',
      acceptableExamples: ['Side photograph showing full right profile and wheels'],
      acceptedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/heic'],
      maxSizeMB: 15,
    },
    {
      id: 'photo_damage_closeup',
      category: 'photos_video',
      label: 'Close-up of Damaged Areas',
      requirement: 'required',
      reason: 'Mandatory high-resolution close-up of visible damage to examine impact severity.',
      acceptableExamples: ['Close-up photos highlighting scratches, dents, or broken components'],
      acceptedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/heic'],
      maxSizeMB: 15,
    },
    {
      id: 'photo_incident_scene',
      category: 'photos_video',
      label: 'Incident Scene Photo',
      requirement: 'optional',
      reason: 'Optional scene photograph providing environmental context and road markings.',
      acceptableExamples: ['Wide shot of accident location or road intersection'],
      acceptedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/heic'],
      maxSizeMB: 15,
    },
  ];

  return definitions.map((def) => {
    const existing = existingMap.get(def.id);
    if (existing) {
      return {
        ...def,
        status: existing.status,
        statusChangedBy: existing.statusChangedBy,
        statusChangedAt: existing.statusChangedAt,
        unavailableReason: existing.unavailableReason,
        evidenceIds: existing.evidenceIds || [],
      };
    }
    return {
      ...def,
      status: 'not_started',
      statusChangedBy: null,
      statusChangedAt: null,
      unavailableReason: null,
      evidenceIds: [],
    };
  });
}

export function computeChecklistProgress(checklist = []) {
  const applicableItems = checklist.filter(
    (item) => item.requirement !== 'not_applicable' && item.status !== 'not_applicable'
  );

  const doneItems = applicableItems.filter((item) =>
    ['uploaded', 'processing', 'received', 'reviewed', 'unavailable'].includes(item.status)
  );

  const missingRequiredItems = applicableItems.filter(
    (item) =>
      item.requirement === 'required' &&
      !['uploaded', 'processing', 'received', 'reviewed', 'unavailable'].includes(item.status)
  );

  return {
    checklistProgress: {
      done: doneItems.length,
      applicable: applicableItems.length,
    },
    missingEvidenceCount: missingRequiredItems.length,
  };
}
