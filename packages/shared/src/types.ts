// ──────────────────────────────────────────────────────────────────────
//  @claimlens/shared · types.ts
//  Single source of truth for all TypeScript types used by both apps.
//  Do NOT add Zod schemas here (those live in schemas.ts).
// ──────────────────────────────────────────────────────────────────────

// ── Primitives ──────────────────────────────────────────────────────────
export type UserId = string;   // "usr_aarav", "usr_meera", etc.
export type ClaimId = string;  // "CL-####"
export type EvidenceId = string; // "EV-####-##"
export type RequestId = string;  // 24-hex ObjectId string
export type MessageId = string;
export type FindingId = string;
export type DecisionId = string;
export type AnalysisVersion = number;

// ── Roles ───────────────────────────────────────────────────────────────
export type UserRole = 'claimant' | 'verifier';

export interface User {
  id: UserId;
  name: string;
  role: UserRole;
}

// ── Claim Status & Priority ─────────────────────────────────────────────
export type ClaimStatus =
  | 'draft'
  | 'new'
  | 'in_review'
  | 'awaiting_claimant'
  | 'decision_pending'
  | 'completed';

export type ClaimPriority = 'high' | 'medium' | 'low';

// ── Checklist ──────────────────────────────────────────────────────────
export type ChecklistRequirement =
  | 'required'
  | 'conditionally_required'
  | 'optional'
  | 'not_applicable';

export type ChecklistStatus =
  | 'not_started'
  | 'uploaded'
  | 'processing'
  | 'received'
  | 'reviewed'
  | 'needs_replacement'
  | 'requested'
  | 'unavailable'
  | 'not_applicable';

export interface ChecklistProgress {
  done: number;
  applicable: number;
}

export interface ChecklistItem {
  id: string;
  category: string;
  label: string;
  requirement: ChecklistRequirement;
  status: ChecklistStatus;
  reason?: string;
  acceptableExamples?: string[];
  acceptedMimeTypes?: string[];
  maxSizeMB?: number;
  statusChangedBy?: string | null;
  statusChangedAt?: string | Date | null;
  unavailableReason?: string | null;
  evidenceIds?: string[];
}

// ── NextStep ────────────────────────────────────────────────────────────
export interface NextStep {
  kind: string;
  label: string;
  description: string;
}

// ── Claim ───────────────────────────────────────────────────────────────
export interface ClaimIncidentSummary {
  date: string;
  type: string;
  location: string;
}

export interface ClaimIncidentDetail extends ClaimIncidentSummary {
  time?: string;
  timeUncertain?: boolean;
  thirdPartyInvolved: string | boolean;
  policeReportFiled: string | boolean;
  visibleDamageAreas: string[];
}

export interface ClaimVehicleSummary {
  registrationNumber: string;
  make: string;
  model: string;
  year: number;
}

export interface ClaimVehicleDetail extends ClaimVehicleSummary {
  vin?: string;
}

export interface ClaimDriver {
  isPolicyholder: boolean;
  name?: string;
  relationship?: string;
  licenceNumber?: string;
}

export interface ClaimPolicy {
  policyNumber?: string;
  insurer?: string;
}

export interface ClaimSummary {
  id: ClaimId;
  claimantId: UserId;
  claimantName: string;
  status: ClaimStatus;
  priority: ClaimPriority;
  stage: string;
  incident: ClaimIncidentSummary;
  vehicle: ClaimVehicleSummary;
  submittedAt?: string | Date | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  checklistProgress: ChecklistProgress;
  missingEvidenceCount: number;
  openRequestCount: number;
  unreadMessageCount: number;
  nextStep: NextStep;
  assigneeId?: string | null;
  assigneeName?: string | null;
  analysisState?: string;
  latestAnalysisVersion?: number | null;
}

export interface ClaimDetail extends Omit<ClaimSummary, 'incident' | 'vehicle'> {
  incident: ClaimIncidentDetail;
  vehicle: ClaimVehicleDetail;
  driver: ClaimDriver;
  narrative?: string;
  policy?: ClaimPolicy;
  checklist: ChecklistItem[];
}

// ── Evidence ────────────────────────────────────────────────────────────
export type EvidenceSource = 'captured_in_app' | 'uploaded_file';
export type EvidenceProcessingStatus = 'pending' | 'processing' | 'ready' | 'failed';
export type EvidenceReviewStatus = 'pending' | 'reviewed' | 'needs_replacement';

export interface EvidenceProvenance {
  statuses: string[];
  duplicateOfIds?: string[];
  similarToIds?: string[];
  metadata: {
    present: boolean;
    dateTaken?: string | null;
    cameraMake?: string | null;
    cameraModel?: string | null;
    gpsPresent?: boolean;
  };
}

export interface EvidenceFile {
  id: EvidenceId;
  claimId: ClaimId;
  checklistItemId?: string | null;
  category: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  pageCount?: number | null;
  source: EvidenceSource;
  receivedAt: string | Date;
  uploadedBy: {
    id: string;
    name: string;
    role: string;
  };
  processingStatus: string;
  reviewStatus?: string;
  reviewNote?: string | null;
  provenance: EvidenceProvenance;
}

// ── Analysis & Findings ─────────────────────────────────────────────────
export type FindingType =
  | 'inconsistency'
  | 'missing_information'
  | 'calculation_check'
  | 'low_evidence_hypothesis'
  | 'policy_exclusion'
  | 'coverage_observation';

export type FindingPriority = 'high' | 'medium' | 'low' | 'informational';

export type FindingStatus = 'open' | 'useful' | 'dismissed' | 'clarification_requested';

export interface SourceRef {
  evidenceId: string;
  page?: number;
  regionId?: string;
  field?: string;
  quote?: string;
}

export interface Finding {
  id: FindingId;
  type: FindingType;
  title: string;
  category: string;
  priority: FindingPriority;
  status: FindingStatus;
  observed: string[];
  claimantAssertions: string[];
  documentFacts: string[];
  calculations: string[];
  aiInference?: string;
  alternatives: string[];
  uncertainty: string;
  nextAction: string;
  sources: SourceRef[];
  lowEvidence: boolean;
}

export interface MatrixColumn {
  id: string;
  label: string;
  evidenceId?: string;
}

export interface MatrixRow {
  id: string;
  label: string;
  cells: Record<string, string>;
}

export interface SettlementLine {
  label: string;
  value: number;
  kind: string;
  source?: string | null;
  note?: string | null;
}

export interface SettlementUnresolved {
  id: string;
  message: string;
  suggestedRequestTitle?: string | null;
}

export interface SettlementOverride {
  amount: number;
  rationale: string;
  by?: unknown;
  at?: unknown;
}

export type SettlementStatus = 'calculated' | 'withheld';

export interface Settlement {
  status: SettlementStatus;
  currency: 'INR';
  lines: SettlementLine[];
  formula: string;
  assumptions: string[];
  unresolved: SettlementUnresolved[];
  resultAmount?: number | null;
  overrides: SettlementOverride[];
  calculatedAt: string | Date;
}

export interface PolicyClause {
  id: string;
  title: string;
  text: string;
  relevant: boolean;
  interpretation?: string;
}

export interface CoverageItem {
  label: string;
  covered: boolean;
  condition?: string;
  evidenceId?: string;
}

export interface Analysis {
  version: AnalysisVersion;
  createdAt: string | Date;
  model: {
    name: string;
    promptVersion: string;
  };
  summary: string;
  extractedFacts: unknown[];
  regions: Record<string, unknown>;
  matrix: {
    columns: MatrixColumn[];
    rows: MatrixRow[];
  };
  findings: Finding[];
  missingEvidence: unknown[];
  policy: {
    clauses: PolicyClause[];
    coverage: CoverageItem[];
  };
  settlement?: Settlement | null;
}

// ── Messages ─────────────────────────────────────────────────────────────
export type MessageKind = 'message' | 'request_notice';

export interface MessageAttachment {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

export interface Message {
  id: MessageId;
  claimId: ClaimId;
  sender: {
    id: string;
    name: string;
    role: string;
  };
  body: string;
  kind: MessageKind;
  requestId?: string | null;
  attachments: MessageAttachment[];
  createdAt: string | Date;
  read: boolean;
}

// ── Evidence Requests ────────────────────────────────────────────────────
export type RequestStatus =
  | 'draft'
  | 'sent'
  | 'response_submitted'
  | 'resolved'
  | 'not_applicable';

export interface EvidenceRequestResponse {
  id: string;
  by: { id: string; name: string };
  at: string | Date;
  message?: string;
  evidenceIds?: string[];
  unavailable?: boolean;
  reason?: string;
}

export interface EvidenceRequest {
  id: RequestId;
  claimId: ClaimId;
  title: string;
  reason: string;
  examples?: string[];
  checklistItemId?: string | null;
  findingId?: string | null;
  status: RequestStatus;
  dueDate?: string | Date | null;
  createdBy: { id: string; name: string };
  sentAt?: string | Date | null;
  resolvedAt?: string | Date | null;
  notApplicableReason?: string | null;
  responses: EvidenceRequestResponse[];
  createdAt: string | Date;
}

// ── Decisions ────────────────────────────────────────────────────────────
export type DecisionKind =
  | 'pending'
  | 'recommend_approve'
  | 'recommend_partial'
  | 'recommend_reject'
  | 'more_information_required'
  | 'closed';

export interface Decision {
  id: DecisionId;
  claimId: ClaimId;
  decision: DecisionKind;
  rationale: string;
  recommendedAmount?: number | null;
  actor: { id: string; name: string };
  at: string | Date;
}

// ── Recommendations ───────────────────────────────────────────────────────
export interface Recommendation {
  offered?: boolean;
  label?: string;
  catalogueStatus?: string;
  content?: unknown | null;
}

// ── Dashboard ─────────────────────────────────────────────────────────────
export interface DashboardData {
  totals: {
    total: number;
    new: number;
    in_review: number;
    awaiting_claimant: number;
    decision_pending: number;
    completed: number;
  };
  overTime: Array<{ date: string; count: number }>;
  completenessBands: {
    complete: number;
    partial: number;
    mostlyMissing: number;
  };
  awaitingEvidenceCount: number;
  recentActivity: unknown[];
  nextUp: ClaimSummary[];
}

// ── Timeline ──────────────────────────────────────────────────────────────
export interface TimelineEvent {
  id: string;
  claimId: ClaimId;
  kind: string;
  summary: string;
  actor: { id: string; name: string; role: string };
  visibility: 'claimant' | 'verifier';
  metadata?: Record<string, unknown>;
  at: string | Date;
}

// ── Private Notes (verifier only, NOT in claimant app) ──────────────────
//  This interface is declared here so the verifier app can import it.
//  The claimant app must never import or reference PrivateNote.
export interface PrivateNote {
  id: string;
  claimId: ClaimId;
  author: { id: string; name: string };
  body: string;
  createdAt: string | Date;
}

// ── API Envelope ──────────────────────────────────────────────────────────
export interface ApiSuccess<T> {
  ok: true;
  data: T;
  meta?: {
    page: number;
    pageSize: number;
    total: number;
  };
}

export interface ApiErrorDetail {
  field: string;
  message: string;
}

export interface ApiError {
  ok: false;
  error: {
    code: string;
    message: string;
    fields?: ApiErrorDetail[];
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ── Fact Type ─────────────────────────────────────────────────────────────
export type FactType =
  | 'observed_in_file'
  | 'claimant_says'
  | 'document_shows'
  | 'calculated'
  | 'ai_inference'
  | 'unknown';

// ── Upload Progress ───────────────────────────────────────────────────────
export interface UploadProgressEvent {
  loaded: number;
  total: number;
  percent: number;
}

// ── Pagination ────────────────────────────────────────────────────────────
export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface ListResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

