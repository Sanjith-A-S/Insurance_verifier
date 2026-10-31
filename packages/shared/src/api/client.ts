// ──────────────────────────────────────────────────────────────────────
//  @claimlens/shared · api/client.ts
//  Typed API client factory. All components call these functions;
//  none call fetch directly.
// ──────────────────────────────────────────────────────────────────────
import type { Transport, UploadOptions } from './transport.js';
import type {
  User, ClaimSummary, ClaimDetail, ChecklistItem, EvidenceFile,
  Analysis, Message, EvidenceRequest, Decision, Recommendation,
  DashboardData, TimelineEvent, PrivateNote, UploadProgressEvent,
  ListResult,
} from '../types.js';
import { endpoints } from './endpoints.js';

export interface ClaimFilters {
  status?: string;
  priority?: string;
  assigneeId?: string;
  page?: number;
  pageSize?: number;
}

export interface CreateClaimBody {
  incident: {
    date: string;
    time?: string;
    timeUncertain?: boolean;
    location: string;
    type: string;
    thirdPartyInvolved: boolean | string;
    policeReportFiled: boolean | string;
    visibleDamageAreas: string[];
  };
  vehicle: {
    registrationNumber: string;
    make: string;
    model: string;
    year: number;
    vin?: string;
  };
  driver: {
    isPolicyholder: boolean;
    name?: string;
    relationship?: string;
    licenceNumber?: string;
  };
  narrative?: string;
  policy?: { policyNumber?: string; insurer?: string };
  idempotencyKey?: string;
}

export interface UploadEvidenceOptions {
  claimId: string;
  file: File;
  category: string;
  checklistItemId?: string;
  source?: 'uploaded_file' | 'captured_in_app';
  onProgress?: (e: UploadProgressEvent) => void;
}

export interface ReviewFindingBody {
  status: 'useful' | 'dismissed' | 'clarification_requested';
  reason?: string;
}

export interface RecordDecisionBody {
  decision: string;
  rationale: string;
  recommendedAmount?: number;
}

export function createClient(transport: Transport) {
  // ── Me ──────────────────────────────────────────────────────────────
  const getMe = (): Promise<User> =>
    transport.request<User>('GET', endpoints.me());

  // ── Demo ────────────────────────────────────────────────────────────
  const getDemoUsers = (): Promise<User[]> =>
    transport.request<User[]>('GET', endpoints.demoUsers());

  const resetDemo = (): Promise<void> =>
    transport.request<void>('POST', endpoints.demoReset());

  // ── Claims ──────────────────────────────────────────────────────────
  const listClaims = (filters: ClaimFilters = {}): Promise<ListResult<ClaimSummary>> => {
    const params = new URLSearchParams();
    if (filters.status)     params.set('status', filters.status);
    if (filters.priority)   params.set('priority', filters.priority);
    if (filters.assigneeId) params.set('assigneeId', filters.assigneeId);
    if (filters.page)       params.set('page', String(filters.page));
    if (filters.pageSize)   params.set('pageSize', String(filters.pageSize));
    const qs = params.toString();
    return transport.request<ListResult<ClaimSummary>>(
      'GET',
      `${endpoints.claims()}${qs ? `?${qs}` : ''}`
    );
  };

  const getClaim = (id: string): Promise<ClaimDetail> =>
    transport.request<ClaimDetail>('GET', endpoints.claim(id));

  const createClaim = (body: CreateClaimBody): Promise<ClaimDetail> =>
    transport.request<ClaimDetail>('POST', endpoints.claims(), { body });

  const updateClaim = (id: string, body: Partial<CreateClaimBody>): Promise<ClaimDetail> =>
    transport.request<ClaimDetail>('PATCH', endpoints.claim(id), { body });

  const submitClaim = (id: string): Promise<ClaimDetail> =>
    transport.request<ClaimDetail>('POST', endpoints.claimSubmit(id));

  const getTimeline = (id: string): Promise<TimelineEvent[]> =>
    transport.request<TimelineEvent[]>('GET', endpoints.claimTimeline(id));

  const setClaimStatus = (id: string, status: string): Promise<ClaimDetail> =>
    transport.request<ClaimDetail>('PATCH', endpoints.claimStatus(id), { body: { status } });

  // ── Checklist ──────────────────────────────────────────────────────
  const getChecklist = (claimId: string): Promise<ChecklistItem[]> =>
    transport.request<ChecklistItem[]>('GET', endpoints.checklist(claimId));

  const markUnavailable = (claimId: string, itemId: string, reason: string): Promise<ChecklistItem> =>
    transport.request<ChecklistItem>('PATCH', endpoints.checklistItemUnavailable(claimId, itemId), { body: { reason } });

  // ── Evidence ───────────────────────────────────────────────────────
  const listEvidence = (claimId: string): Promise<EvidenceFile[]> =>
    transport.request<EvidenceFile[]>('GET', endpoints.evidence(claimId));

  const getEvidence = (claimId: string, eid: string): Promise<EvidenceFile> =>
    transport.request<EvidenceFile>('GET', endpoints.evidenceFile(claimId, eid));

  const uploadEvidence = (opts: UploadEvidenceOptions): Promise<EvidenceFile> => {
    const fd = new FormData();
    fd.append('file', opts.file);
    fd.append('category', opts.category);
    if (opts.checklistItemId) fd.append('checklistItemId', opts.checklistItemId);
    fd.append('source', opts.source ?? 'uploaded_file');

    return transport.upload<EvidenceFile>(endpoints.evidence(opts.claimId), {
      formData: fd,
      onProgress: opts.onProgress,
    });
  };

  const reviewEvidence = (claimId: string, eid: string, reviewStatus: string, reviewNote?: string): Promise<EvidenceFile> =>
    transport.request<EvidenceFile>('POST', endpoints.evidenceReview(claimId, eid), {
      body: { reviewStatus, reviewNote },
    });

  const openEvidenceFile = async (claimId: string, eid: string): Promise<string> => {
    const blobUrl = await transport.fetchBlob(endpoints.evidenceFile_dl(claimId, eid));
    window.open(blobUrl, '_blank');
    return blobUrl;
  };

  const createCaptureSession = (claimId: string): Promise<{ id: string; expiresAt: string }> =>
    transport.request<{ id: string; expiresAt: string }>('POST', endpoints.captureSessions(claimId));

  const uploadCapture = (
    claimId: string,
    sessionId: string,
    opts: Omit<UploadEvidenceOptions, 'claimId'>
  ): Promise<EvidenceFile> => {
    const fd = new FormData();
    fd.append('file', opts.file);
    fd.append('category', opts.category);
    if (opts.checklistItemId) fd.append('checklistItemId', opts.checklistItemId);
    fd.append('source', 'captured_in_app');

    return transport.upload<EvidenceFile>(endpoints.captureUpload(claimId, sessionId), {
      formData: fd,
      onProgress: opts.onProgress,
    });
  };

  // ── Analysis ───────────────────────────────────────────────────────
  const getAnalysis = (claimId: string): Promise<Analysis | null> =>
    transport.request<Analysis | null>('GET', endpoints.analysis(claimId));

  const runAnalysis = (claimId: string): Promise<{ started: boolean; version: number }> =>
    transport.request<{ started: boolean; version: number }>('POST', endpoints.analysisRun(claimId));

  const getAnalysisVersion = (claimId: string, version: number): Promise<Analysis> =>
    transport.request<Analysis>('GET', endpoints.analysisVersion(claimId, version));

  const reviewFinding = (
    claimId: string,
    version: number,
    findingId: string,
    body: ReviewFindingBody
  ): Promise<void> =>
    transport.request<void>('PATCH', endpoints.findingReview(claimId, version, findingId), { body });

  const annotateMatrix = (
    claimId: string,
    version: number,
    rowId: string,
    text: string
  ): Promise<void> =>
    transport.request<void>('POST', endpoints.matrixAnnotate(claimId, version, rowId), { body: { text } });

  const recalculateSettlement = (claimId: string, version: number): Promise<Analysis> =>
    transport.request<Analysis>('POST', endpoints.settlement(claimId, version));

  const overrideSettlement = (claimId: string, amount: number, rationale: string): Promise<void> =>
    transport.request<void>('POST', endpoints.settlementOverride(claimId), { body: { amount, rationale } });

  // ── Messages ───────────────────────────────────────────────────────
  const listMessages = (claimId: string): Promise<Message[]> =>
    transport.request<Message[]>('GET', endpoints.messages(claimId));

  const sendMessage = (claimId: string, body: string, attachmentEvidenceIds?: string[]): Promise<Message> =>
    transport.request<Message>('POST', endpoints.messages(claimId), {
      body: { body, attachmentEvidenceIds },
    });

  const markMessagesRead = (claimId: string): Promise<void> =>
    transport.request<void>('POST', endpoints.messagesRead(claimId));

  // ── Requests ───────────────────────────────────────────────────────
  const listRequests = (claimId: string): Promise<EvidenceRequest[]> =>
    transport.request<EvidenceRequest[]>('GET', endpoints.requests(claimId));

  const createRequest = (
    claimId: string,
    body: { title: string; reason: string; examples?: string[]; checklistItemId?: string; findingId?: string; dueDate?: string }
  ): Promise<EvidenceRequest> =>
    transport.request<EvidenceRequest>('POST', endpoints.requests(claimId), { body });

  const sendRequest = (claimId: string, rid: string): Promise<EvidenceRequest> =>
    transport.request<EvidenceRequest>('POST', endpoints.requestSend(claimId, rid));

  const resolveRequest = (claimId: string, rid: string): Promise<EvidenceRequest> =>
    transport.request<EvidenceRequest>('POST', endpoints.requestResolve(claimId, rid));

  const markRequestNa = (claimId: string, rid: string, reason: string): Promise<EvidenceRequest> =>
    transport.request<EvidenceRequest>('POST', endpoints.requestNa(claimId, rid), { body: { reason } });

  const respondToRequest = (
    claimId: string,
    rid: string,
    body: { message?: string; evidenceIds?: string[]; unavailable?: boolean; reason?: string }
  ): Promise<EvidenceRequest> =>
    transport.request<EvidenceRequest>('POST', endpoints.requestResponse(claimId, rid), { body });

  // ── Private Notes (verifier only) ─────────────────────────────────
  const listPrivateNotes = (claimId: string): Promise<PrivateNote[]> =>
    transport.request<PrivateNote[]>('GET', endpoints.privateNotes(claimId));

  const addPrivateNote = (claimId: string, body: string): Promise<PrivateNote> =>
    transport.request<PrivateNote>('POST', endpoints.privateNotes(claimId), { body: { body } });

  // ── Decisions ──────────────────────────────────────────────────────
  const listDecisions = (claimId: string): Promise<Decision[]> =>
    transport.request<Decision[]>('GET', endpoints.decisions(claimId));

  const recordDecision = (claimId: string, body: RecordDecisionBody): Promise<Decision> =>
    transport.request<Decision>('POST', endpoints.decisions(claimId), { body });

  // ── Recommendation ─────────────────────────────────────────────────
  const getRecommendation = (claimId: string): Promise<Recommendation> =>
    transport.request<Recommendation>('GET', endpoints.recommendation(claimId));

  const generateRecommendation = (claimId: string): Promise<Recommendation> =>
    transport.request<Recommendation>('POST', endpoints.recommendation(claimId));

  // ── Dashboard ──────────────────────────────────────────────────────
  const getDashboard = (): Promise<DashboardData> =>
    transport.request<DashboardData>('GET', endpoints.dashboard());

  return {
    // Identity
    getMe,
    setIdentity: transport.setIdentity.bind(transport),
    getIdentity: transport.getIdentity.bind(transport),

    // Demo
    getDemoUsers,
    resetDemo,

    // Claims
    listClaims,
    getClaim,
    createClaim,
    updateClaim,
    submitClaim,
    getTimeline,
    setClaimStatus,

    // Checklist
    getChecklist,
    markUnavailable,

    // Evidence
    listEvidence,
    getEvidence,
    uploadEvidence,
    reviewEvidence,
    openEvidenceFile,
    createCaptureSession,
    uploadCapture,

    // Analysis
    getAnalysis,
    runAnalysis,
    getAnalysisVersion,
    reviewFinding,
    annotateMatrix,
    recalculateSettlement,
    overrideSettlement,

    // Messages
    listMessages,
    sendMessage,
    markMessagesRead,

    // Requests
    listRequests,
    createRequest,
    sendRequest,
    resolveRequest,
    markRequestNa,
    respondToRequest,

    // Private notes (verifier only)
    listPrivateNotes,
    addPrivateNote,

    // Decisions
    listDecisions,
    recordDecision,

    // Recommendation
    getRecommendation,
    generateRecommendation,

    // Dashboard
    getDashboard,
  };
}

export type ApiClient = ReturnType<typeof createClient>;

