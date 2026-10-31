// ──────────────────────────────────────────────────────────────────────
//  @claimlens/shared · mock/mockTransport.ts
//  Complete in-memory mock transport simulating the ClaimLens AI API.
// ──────────────────────────────────────────────────────────────────────
import type { Transport, RequestOptions, UploadOptions } from '../api/transport.js';
import type {
  User, ClaimSummary, ClaimDetail, ChecklistItem, EvidenceFile,
  Analysis, Message, EvidenceRequest, Decision, Recommendation,
  DashboardData, TimelineEvent, PrivateNote, UploadProgressEvent,
  ListResult
} from '../types.js';
import { mockStore } from './store.js';
import { set, get } from 'idb-keyval';

// Latency simulator
const delay = (ms = 150) => new Promise((resolve) => setTimeout(resolve, ms));

async function computeSha256(file: File): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const buffer = await file.arrayBuffer();
    const digest = await crypto.subtle.digest('SHA-256', buffer);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  return `mock_hash_${Date.now()}`;
}

export function createMockTransport(): Transport {
  let currentUserId: string = 'usr_aarav'; // Default to Aarav (claimant)

  function getActor(): User {
    const data = mockStore.getData();
    const user = data.users.find((u) => u.id === currentUserId);
    if (!user) {
      return { id: currentUserId, name: 'Demo User', role: 'claimant' };
    }
    return user;
  }

  return {
    setIdentity(userId: string) {
      currentUserId = userId;
    },

    getIdentity() {
      return currentUserId;
    },

    async request<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
      await delay(120);
      const actor = getActor();
      const data = mockStore.getData();
      const url = new URL(path, 'http://localhost:4000');
      const pathname = url.pathname;
      const m = method.toUpperCase();

      // ── GET /api/v1/health ──
      if (pathname === '/api/v1/health') {
        return { status: 'ok', timestamp: new Date().toISOString() } as T;
      }

      // ── GET /api/v1/demo/users ──
      if (pathname === '/api/v1/demo/users') {
        return data.users as T;
      }

      // ── POST /api/v1/demo/reset ──
      if (pathname === '/api/v1/demo/reset' && m === 'POST') {
        mockStore.reset();
        return { message: 'Reset successful' } as T;
      }

      // ── GET /api/v1/me ──
      if (pathname === '/api/v1/me') {
        return actor as T;
      }

      // ── GET /api/v1/dashboard ──
      if (pathname === '/api/v1/dashboard') {
        const submitted = data.claims.filter((c) => c.status !== 'draft');
        const totals = {
          total: submitted.length,
          new: submitted.filter((c) => c.status === 'new').length,
          in_review: submitted.filter((c) => c.status === 'in_review').length,
          awaiting_claimant: submitted.filter((c) => c.status === 'awaiting_claimant').length,
          decision_pending: submitted.filter((c) => c.status === 'decision_pending').length,
          completed: submitted.filter((c) => c.status === 'completed').length,
        };

        const overTime = [
          { date: '2026-10-03', count: 2 },
          { date: '2026-10-08', count: 1 },
          { date: '2026-10-15', count: 2 },
          { date: '2026-10-21', count: 1 },
          { date: '2026-10-26', count: 2 },
          { date: '2026-10-29', count: 2 },
        ];

        const dash: DashboardData = {
          totals,
          overTime,
          completenessBands: { complete: 5, partial: 3, mostlyMissing: 2 },
          awaitingEvidenceCount: totals.awaiting_claimant,
          recentActivity: [
            { id: 'act_1', text: 'Meera Iyer marked CL-2041 ready for settlement', at: '2026-10-29T14:20:00Z' },
            { id: 'act_2', text: 'Clarification requested on CL-2042 for photo date discrepancy', at: '2026-10-29T09:10:00Z' },
          ],
          nextUp: submitted.filter((c) => c.status === 'new').slice(0, 5),
        };
        return dash as T;
      }

      // ── GET /api/v1/claims ──
      if (pathname === '/api/v1/claims' && m === 'GET') {
        let claims = [...data.claims];

        if (actor.role === 'claimant') {
          claims = claims.filter((c) => c.claimantId === actor.id);
        } else {
          // Verifier: non-drafts where assigneeId is me or unassigned
          claims = claims.filter(
            (c) => c.status !== 'draft' && (!c.assigneeId || c.assigneeId === actor.id)
          );
        }

        const statusFilter = url.searchParams.get('status');
        if (statusFilter) {
          claims = claims.filter((c) => c.status === statusFilter);
        }

        const priorityFilter = url.searchParams.get('priority');
        if (priorityFilter) {
          claims = claims.filter((c) => c.priority === priorityFilter);
        }

        const page = parseInt(url.searchParams.get('page') || '1', 10);
        const pageSize = parseInt(url.searchParams.get('pageSize') || '20', 10);
        const total = claims.length;
        const start = (page - 1) * pageSize;
        const items = claims.slice(start, start + pageSize);

        const res: ListResult<ClaimSummary> = {
          items,
          page,
          pageSize,
          total,
        };
        return res as T;
      }

      // ── POST /api/v1/claims ──
      if (pathname === '/api/v1/claims' && m === 'POST') {
        const body = (options.body as Partial<ClaimDetail>) || {};
        const count = data.claims.length + 1;
        const id = `CL-${2040 + count}`;

        const newClaim: ClaimDetail = {
          id,
          claimantId: actor.id,
          claimantName: actor.name,
          status: 'draft',
          priority: 'low',
          stage: 'draft',
          incident: {
            date: body.incident?.date || new Date().toISOString().split('T')[0],
            time: body.incident?.time,
            timeUncertain: body.incident?.timeUncertain,
            location: body.incident?.location || 'Unspecified location',
            type: body.incident?.type || 'collision',
            thirdPartyInvolved: body.incident?.thirdPartyInvolved || false,
            policeReportFiled: body.incident?.policeReportFiled || false,
            visibleDamageAreas: body.incident?.visibleDamageAreas || [],
          },
          vehicle: {
            registrationNumber: body.vehicle?.registrationNumber || 'KA01AB0000',
            make: body.vehicle?.make || 'Unknown',
            model: body.vehicle?.model || 'Model',
            year: body.vehicle?.year || 2022,
            vin: body.vehicle?.vin,
          },
          driver: {
            isPolicyholder: body.driver?.isPolicyholder ?? true,
            name: body.driver?.name,
            relationship: body.driver?.relationship,
            licenceNumber: body.driver?.licenceNumber,
          },
          narrative: body.narrative || '',
          policy: body.policy || {},
          submittedAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          checklistProgress: { done: 0, applicable: 4 },
          missingEvidenceCount: 4,
          openRequestCount: 0,
          unreadMessageCount: 0,
          nextStep: {
            kind: 'submit',
            label: 'Complete and submit your claim',
            description: 'Provide incident details and required documents to submit.',
          },
          checklist: [
            {
              id: 'photo_front',
              category: 'photos_video',
              label: 'Front View of Vehicle',
              requirement: 'required',
              status: 'not_started',
            },
            {
              id: 'photo_damage',
              category: 'photos_video',
              label: 'Damage Area Close-up',
              requirement: 'required',
              status: 'not_started',
            },
            {
              id: 'policy_schedule',
              category: 'insurance_documents',
              label: 'Motor Insurance Policy Schedule',
              requirement: 'required',
              status: 'not_started',
            },
            {
              id: 'repair_estimate',
              category: 'repair_estimate',
              label: 'Authorised Workshop Estimate',
              requirement: 'required',
              status: 'not_started',
            },
          ],
        };

        data.claims.unshift(newClaim);
        mockStore.persist();
        return newClaim as T;
      }

      // ── Match /api/v1/claims/:id patterns ──
      const claimMatch = pathname.match(/^\/api\/v1\/claims\/([A-Za-z0-9-]+)(\/.*)?$/);
      if (claimMatch) {
        const claimId = claimMatch[1];
        const subPath = claimMatch[2] || '';
        const claim = data.claims.find((c) => c.id === claimId);

        if (!claim) {
          throw new Error(`Claim ${claimId} not found`);
        }

        // Subpath: /submit
        if (subPath === '/submit' && m === 'POST') {
          const files = data.evidence.filter((e) => e.claimId === claimId);
          const hasPhoto = files.some((f) => f.category === 'photos_video');
          const hasDoc = files.some((f) => f.category !== 'photos_video');

          if (!hasPhoto || !hasDoc) {
            throw new Error('Claim submission requires at least one damage photograph and one supporting document.');
          }

          claim.status = 'new';
          claim.stage = 'intake';
          claim.submittedAt = new Date().toISOString();
          claim.nextStep = {
            kind: 'wait',
            label: 'Awaiting assignment',
            description: 'Your claim has been submitted and is in the investigation queue.',
          };
          mockStore.persist();
          return claim as T;
        }

        // Subpath: /status
        if (subPath === '/status' && (m === 'PATCH' || m === 'POST')) {
          const body = (options.body as { status: string }) || {};
          claim.status = body.status as any;
          claim.updatedAt = new Date().toISOString();
          mockStore.persist();
          return claim as T;
        }

        // Subpath: /timeline
        if (subPath === '/timeline' && m === 'GET') {
          const events = data.timeline.filter((e) => e.claimId === claimId);
          return events as T;
        }

        // Subpath: /checklist
        if (subPath === '/checklist' && m === 'GET') {
          return claim.checklist as T;
        }

        // Subpath: /checklist/:itemId/unavailable
        const unavMatch = subPath.match(/^\/checklist\/([A-Za-z0-9_-]+)\/unavailable$/);
        if (unavMatch && (m === 'PATCH' || m === 'POST')) {
          const itemId = unavMatch[1];
          const body = (options.body as { reason?: string }) || {};
          const item = claim.checklist.find((i) => i.id === itemId);
          if (item) {
            item.status = 'unavailable';
            item.unavailableReason = body.reason || 'Marked unavailable by claimant';
            mockStore.persist();
            return item as T;
          }
        }

        // Subpath: /evidence
        if (subPath === '/evidence' && m === 'GET') {
          const files = data.evidence.filter((e) => e.claimId === claimId);
          return files as T;
        }

        // Subpath: /evidence/:eid/review
        const revMatch = subPath.match(/^\/evidence\/([A-Za-z0-9_-]+)\/review$/);
        if (revMatch && (m === 'POST' || m === 'PATCH')) {
          const eid = revMatch[1];
          const body = (options.body as { reviewStatus?: string; reviewNote?: string }) || {};
          const file = data.evidence.find((e) => e.id === eid);
          if (file) {
            file.reviewStatus = body.reviewStatus || 'reviewed';
            file.reviewNote = body.reviewNote || null;
            mockStore.persist();
            return file as T;
          }
        }

        // Subpath: /analysis
        if (subPath === '/analysis' && m === 'GET') {
          const list = data.analyses[claimId] || [];
          return (list[list.length - 1] || null) as T;
        }

        // Subpath: /analysis/run
        if (subPath === '/analysis/run' && m === 'POST') {
          const list = data.analyses[claimId] || [];
          const nextVer = list.length + 1;
          const newAn: Analysis = {
            version: nextVer,
            createdAt: new Date().toISOString(),
            model: { name: 'gemini-3-flash-preview', promptVersion: 'analysis@1' },
            summary: `Automated assessment version ${nextVer} generated based on latest uploaded evidence.`,
            extractedFacts: [],
            regions: {},
            matrix: { columns: [], rows: [] },
            findings: [],
            missingEvidence: [],
            policy: { clauses: [], coverage: [] },
            settlement: null,
          };
          if (!data.analyses[claimId]) data.analyses[claimId] = [];
          data.analyses[claimId].push(newAn);
          claim.latestAnalysisVersion = nextVer;
          claim.analysisState = 'ready';
          mockStore.persist();
          return { started: true, version: nextVer } as T;
        }

        // Subpath: /analysis/:ver
        const verMatch = subPath.match(/^\/analysis\/(\d+)$/);
        if (verMatch && m === 'GET') {
          const ver = parseInt(verMatch[1], 10);
          const an = (data.analyses[claimId] || []).find((a) => a.version === ver);
          if (an) return an as T;
          throw new Error(`Analysis version ${ver} not found`);
        }

        // Subpath: /analysis/:ver/findings/:fid/review
        const fRevMatch = subPath.match(/^\/analysis\/(\d+)\/findings\/([A-Za-z0-9_-]+)\/review$/);
        if (fRevMatch && (m === 'PATCH' || m === 'POST')) {
          const ver = parseInt(fRevMatch[1], 10);
          const fid = fRevMatch[2];
          const body = (options.body as { status: string; reason?: string }) || {};
          const an = (data.analyses[claimId] || []).find((a) => a.version === ver);
          if (an) {
            const finding = an.findings.find((f) => f.id === fid);
            if (finding) {
              finding.status = body.status as any;
              mockStore.persist();
              return { success: true } as T;
            }
          }
          return { success: true } as T;
        }

        // Subpath: /messages
        if (subPath === '/messages' && m === 'GET') {
          return data.messages.filter((msg) => msg.claimId === claimId) as T;
        }

        if (subPath === '/messages' && m === 'POST') {
          const body = (options.body as { body: string; attachmentEvidenceIds?: string[] }) || {};
          const newMsg: Message = {
            id: `msg_${Date.now()}`,
            claimId,
            sender: { id: actor.id, name: actor.name, role: actor.role },
            body: body.body || '',
            kind: 'message',
            attachments: [],
            createdAt: new Date().toISOString(),
            read: true,
          };
          data.messages.push(newMsg);
          mockStore.persist();
          return newMsg as T;
        }

        if (subPath === '/messages/read' && m === 'POST') {
          for (const msg of data.messages) {
            if (msg.claimId === claimId) msg.read = true;
          }
          mockStore.persist();
          return { success: true } as T;
        }

        // Subpath: /requests
        if (subPath === '/requests' && m === 'GET') {
          return data.requests.filter((r) => r.claimId === claimId) as T;
        }

        if (subPath === '/requests' && m === 'POST') {
          const body = (options.body as any) || {};
          const newReq: EvidenceRequest = {
            id: `req_${Date.now()}`,
            claimId,
            title: body.title || 'Information Request',
            reason: body.reason || '',
            examples: body.examples || [],
            checklistItemId: body.checklistItemId || null,
            findingId: body.findingId || null,
            status: 'sent',
            dueDate: body.dueDate || null,
            createdBy: { id: actor.id, name: actor.name },
            sentAt: new Date().toISOString(),
            resolvedAt: null,
            notApplicableReason: null,
            responses: [],
            createdAt: new Date().toISOString(),
          };
          data.requests.push(newReq);
          claim.status = 'awaiting_claimant';
          claim.openRequestCount += 1;
          mockStore.persist();
          return newReq as T;
        }

        // Subpath: /requests/:rid/response
        const reqRespMatch = subPath.match(/^\/requests\/([A-Za-z0-9_-]+)\/response$/);
        if (reqRespMatch && m === 'POST') {
          const rid = reqRespMatch[1];
          const body = (options.body as any) || {};
          const req = data.requests.find((r) => r.id === rid);
          if (req) {
            req.responses.push({
              id: `resp_${Date.now()}`,
              by: { id: actor.id, name: actor.name },
              at: new Date().toISOString(),
              message: body.message,
              evidenceIds: body.evidenceIds || [],
              unavailable: body.unavailable || false,
              reason: body.reason,
            });
            req.status = 'response_submitted';
            mockStore.persist();
            return req as T;
          }
        }

        // Subpath: /requests/:rid/resolve
        const reqResMatch = subPath.match(/^\/requests\/([A-Za-z0-9_-]+)\/resolve$/);
        if (reqResMatch && m === 'POST') {
          const rid = reqResMatch[1];
          const req = data.requests.find((r) => r.id === rid);
          if (req) {
            req.status = 'resolved';
            req.resolvedAt = new Date().toISOString();
            if (claim.openRequestCount > 0) claim.openRequestCount -= 1;
            mockStore.persist();
            return req as T;
          }
        }

        // Subpath: /private-notes (verifier only)
        if (subPath === '/private-notes') {
          if (actor.role !== 'verifier') {
            throw new Error('Access denied: Private notes are restricted to verifiers');
          }
          if (m === 'GET') {
            return data.privateNotes.filter((n) => n.claimId === claimId) as T;
          }
          if (m === 'POST') {
            const body = (options.body as { body: string }) || {};
            const note: PrivateNote = {
              id: `note_${Date.now()}`,
              claimId,
              author: { id: actor.id, name: actor.name },
              body: body.body || '',
              createdAt: new Date().toISOString(),
            };
            data.privateNotes.push(note);
            mockStore.persist();
            return note as T;
          }
        }

        // Subpath: /decisions
        if (subPath === '/decisions') {
          if (m === 'GET') {
            return data.decisions.filter((d) => d.claimId === claimId) as T;
          }
          if (m === 'POST') {
            const body = (options.body as any) || {};
            const dec: Decision = {
              id: `dec_${Date.now()}`,
              claimId,
              decision: body.decision,
              rationale: body.rationale,
              recommendedAmount: body.recommendedAmount,
              actor: { id: actor.id, name: actor.name },
              at: new Date().toISOString(),
            };
            data.decisions.push(dec);
            claim.status = 'completed';
            claim.stage = 'closed';
            mockStore.persist();
            return dec as T;
          }
        }

        // Subpath: /recommendation
        if (subPath === '/recommendation') {
          return data.recommendation as T;
        }

        // Single claim GET
        if (subPath === '' && m === 'GET') {
          return claim as T;
        }

        // Single claim PATCH
        if (subPath === '' && m === 'PATCH') {
          const body = (options.body as Partial<ClaimDetail>) || {};
          Object.assign(claim, body, { updatedAt: new Date().toISOString() });
          mockStore.persist();
          return claim as T;
        }
      }

      throw new Error(`Mock endpoint not implemented: ${method} ${path}`);
    },

    async upload<T>(path: string, options: UploadOptions): Promise<T> {
      // Simulate progress ticks
      if (options.onProgress) {
        options.onProgress({ loaded: 200000, total: 1000000, percent: 20 });
        await delay(60);
        options.onProgress({ loaded: 600000, total: 1000000, percent: 60 });
        await delay(60);
        options.onProgress({ loaded: 1000000, total: 1000000, percent: 100 });
      }

      const actor = getActor();
      const data = mockStore.getData();
      const file = options.formData.get('file') as File;
      const category = (options.formData.get('category') as string) || 'photos_video';
      const checklistItemId = options.formData.get('checklistItemId') as string;
      const source = (options.formData.get('source') as any) || 'uploaded_file';

      const match = path.match(/\/claims\/([A-Za-z0-9-]+)\/evidence/);
      const claimId = match ? match[1] : 'CL-2041';

      const sha = file ? await computeSha256(file) : `mock_${Date.now()}`;
      const evId = `EV-${claimId}-${String(data.evidence.filter((e) => e.claimId === claimId).length + 1).padStart(2, '0')}`;

      // Store in IndexedDB for blob retrieval if possible
      if (file && typeof window !== 'undefined') {
        try {
          await set(`evidence_blob_${evId}`, file);
        } catch (e) {
          console.warn('Could not store blob in IDB', e);
        }
      }

      const newEv: EvidenceFile = {
        id: evId,
        claimId,
        checklistItemId: checklistItemId || null,
        category,
        fileName: file ? file.name : 'uploaded_file.jpg',
        mimeType: file ? file.type : 'image/jpeg',
        sizeBytes: file ? file.size : 256000,
        sha256: sha,
        source,
        receivedAt: new Date().toISOString(),
        uploadedBy: { id: actor.id, name: actor.name, role: actor.role },
        processingStatus: 'ready',
        reviewStatus: 'pending',
        provenance: {
          statuses: ['metadata_present'],
          duplicateOfIds: [],
          similarToIds: [],
          metadata: { present: true, gpsPresent: false },
        },
      };

      data.evidence.push(newEv);

      // Update checklist progress on claim
      const claim = data.claims.find((c) => c.id === claimId);
      if (claim) {
        if (checklistItemId) {
          const item = claim.checklist.find((i) => i.id === checklistItemId);
          if (item) item.status = 'received';
        }
        claim.checklistProgress.done += 1;
        if (claim.missingEvidenceCount > 0) claim.missingEvidenceCount -= 1;
      }

      mockStore.persist();
      return newEv as T;
    },

    async fetchBlob(path: string): Promise<string> {
      const match = path.match(/evidence\/([A-Za-z0-9_-]+)\/file/);
      if (match) {
        const evId = match[1];
        try {
          const blob = await get<Blob>(`evidence_blob_${evId}`);
          if (blob) return URL.createObjectURL(blob);
        } catch (e) {
          console.warn('IDB get failed', e);
        }
      }
      // Return a blank canvas or placeholder SVG blob
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect fill="#14141c" width="400" height="300"/><text fill="#8A8A96" x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="16">Synthetic Demo Evidence File</text></svg>`;
      const blob = new Blob([svg], { type: 'image/svg+xml' });
      return URL.createObjectURL(blob);
    },
  };
}

