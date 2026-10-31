// ──────────────────────────────────────────────────────────────────────
//  @claimlens/shared · api/endpoints.ts
//  Path builder helpers for the API.
// ──────────────────────────────────────────────────────────────────────

const BASE = '/api/v1';
const b = (path: string) => `${BASE}${path}`;

export const endpoints = {
  // Health
  health: () => b('/health'),

  // Demo
  demoUsers:  () => b('/demo/users'),
  demoReset:  () => b('/demo/reset'),

  // Me
  me: () => b('/me'),

  // Claims
  claims:       () => b('/claims'),
  claim:        (id: string) => b(`/claims/${id}`),
  claimSubmit:  (id: string) => b(`/claims/${id}/submit`),
  claimTimeline:(id: string) => b(`/claims/${id}/timeline`),
  claimStatus:  (id: string) => b(`/claims/${id}/status`),

  // Checklist
  checklist:              (claimId: string) => b(`/claims/${claimId}/checklist`),
  checklistItem:          (claimId: string, itemId: string) => b(`/claims/${claimId}/checklist/${itemId}`),
  checklistItemUnavailable:(claimId: string, itemId: string) => b(`/claims/${claimId}/checklist/${itemId}/unavailable`),

  // Evidence
  evidence:       (claimId: string) => b(`/claims/${claimId}/evidence`),
  evidenceFile:   (claimId: string, eid: string) => b(`/claims/${claimId}/evidence/${eid}`),
  evidenceReview: (claimId: string, eid: string) => b(`/claims/${claimId}/evidence/${eid}/review`),
  evidenceFile_dl:(claimId: string, eid: string) => b(`/claims/${claimId}/evidence/${eid}/file`),
  captureSessions:(claimId: string) => b(`/claims/${claimId}/capture-sessions`),
  captureUpload:  (claimId: string, sessionId: string) => b(`/claims/${claimId}/capture-sessions/${sessionId}/upload`),

  // Analysis
  analysis:       (claimId: string) => b(`/claims/${claimId}/analysis`),
  analysisRun:    (claimId: string) => b(`/claims/${claimId}/analysis/run`),
  analysisVersion:(claimId: string, version: number) => b(`/claims/${claimId}/analysis/${version}`),
  findingReview:  (claimId: string, version: number, findingId: string) =>
    b(`/claims/${claimId}/analysis/${version}/findings/${findingId}/review`),
  matrixAnnotate: (claimId: string, version: number, rowId: string) =>
    b(`/claims/${claimId}/analysis/${version}/matrix/${rowId}/annotation`),
  settlement:     (claimId: string, version: number) => b(`/claims/${claimId}/analysis/${version}/settlement`),
  settlementOverride:(claimId: string) => b(`/claims/${claimId}/settlement/override`),

  // Messages
  messages:    (claimId: string) => b(`/claims/${claimId}/messages`),
  message:     (claimId: string, msgId: string) => b(`/claims/${claimId}/messages/${msgId}`),
  messagesRead:(claimId: string) => b(`/claims/${claimId}/messages/read`),

  // Requests
  requests:         (claimId: string) => b(`/claims/${claimId}/requests`),
  request:          (claimId: string, rid: string) => b(`/claims/${claimId}/requests/${rid}`),
  requestSend:      (claimId: string, rid: string) => b(`/claims/${claimId}/requests/${rid}/send`),
  requestResolve:   (claimId: string, rid: string) => b(`/claims/${claimId}/requests/${rid}/resolve`),
  requestNa:        (claimId: string, rid: string) => b(`/claims/${claimId}/requests/${rid}/not-applicable`),
  requestResponse:  (claimId: string, rid: string) => b(`/claims/${claimId}/requests/${rid}/response`),

  // Private notes (verifier only)
  privateNotes:    (claimId: string) => b(`/claims/${claimId}/private-notes`),

  // Decisions
  decisions:      (claimId: string) => b(`/claims/${claimId}/decisions`),

  // Recommendations
  recommendation: (claimId: string) => b(`/claims/${claimId}/recommendation`),

  // Dashboard
  dashboard: () => b('/dashboard'),
} as const;

