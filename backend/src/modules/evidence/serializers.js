export function serializeEvidenceFile(file, role) {
  const isVerifier = role === 'verifier';

  const base = {
    id: file._id || file.id,
    claimId: file.claimId,
    checklistItemId: file.checklistItemId || null,
    category: file.category,
    fileName: file.fileName,
    mimeType: file.mimeType,
    sizeBytes: file.sizeBytes,
    sha256: file.sha256,
    pageCount: file.pageCount || null,
    source: file.source,
    receivedAt: file.receivedAt,
    uploadedBy: file.uploadedBy,
    processingStatus: file.processingStatus,
    width: file.width || null,
    height: file.height || null,
    requestId: file.requestId || null,
    replacesEvidenceId: file.replacesEvidenceId || null,
    replacedByEvidenceId: file.replacedByEvidenceId || null,
  };

  if (isVerifier) {
    return {
      ...base,
      reviewStatus: file.reviewStatus || 'pending',
      reviewNote: file.reviewNote || null,
      provenance: file.provenance || {
        statuses: [],
        duplicateOfIds: [],
        similarToIds: [],
        metadata: { present: false, gpsPresent: false },
      },
    };
  }

  // Claimant projection: neutral safe values only, strip reviewNote, duplicates, similarity
  const safeStatuses = (file.provenance?.statuses || []).filter((s) =>
    ['capture_workflow_recorded', 'metadata_present'].includes(s)
  );

  return {
    ...base,
    reviewStatus: 'pending', // Neutral value
    provenance: {
      statuses: safeStatuses,
      duplicateOfIds: [],
      similarToIds: [],
      metadata: {
        present: Boolean(file.provenance?.metadata?.present),
        dateTaken: file.provenance?.metadata?.dateTaken || null,
        gpsPresent: Boolean(file.provenance?.metadata?.gpsPresent),
      },
    },
  };
}

