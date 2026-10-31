// ──────────────────────────────────────────────────────────────────────
//  @claimlens/shared · mock/store.ts
//  Mock store initialized from seed data, persisted in localStorage.
// ──────────────────────────────────────────────────────────────────────
import type {
  User, ClaimSummary, ClaimDetail, ChecklistItem, EvidenceFile,
  Analysis, Message, EvidenceRequest, Decision, Recommendation,
  TimelineEvent, PrivateNote
} from '../types.js';

import usersSeed from './seed/users.json';
import claimsSeed from './seed/claims.json';
import checklistSeed from './seed/checklist.json';
import evidenceSeed from './seed/evidence.json';
import analysisSeed from './seed/analysis.json';
import messagesSeed from './seed/messages.json';
import requestsSeed from './seed/requests.json';
import decisionsSeed from './seed/decisions.json';
import recommendationSeed from './seed/recommendations.json';

const STORAGE_KEY = 'claimlens-mock-v1';

export interface MockStoreData {
  users: User[];
  claims: ClaimDetail[];
  evidence: EvidenceFile[];
  analyses: Record<string, Analysis[]>; // claimId -> Analysis[]
  messages: Message[];
  requests: EvidenceRequest[];
  decisions: Decision[];
  recommendation: Recommendation;
  timeline: TimelineEvent[];
  privateNotes: PrivateNote[];
}

function createInitialData(): MockStoreData {
  // Convert claimsSeed into ClaimDetail objects
  const claims: ClaimDetail[] = (claimsSeed as unknown as ClaimDetail[]).map((c) => ({
    ...c,
    checklist: (checklistSeed as unknown as ChecklistItem[]).map((item) => ({ ...item })),
  }));

  // Group analysis by claimId
  const analyses: Record<string, Analysis[]> = {};
  for (const an of analysisSeed as unknown as (Analysis & { claimId: string })[]) {
    if (!analyses[an.claimId]) analyses[an.claimId] = [];
    analyses[an.claimId].push(an);
  }

  // Generate initial timeline events
  const timeline: TimelineEvent[] = [
    {
      id: 'tl_01',
      claimId: 'CL-2041',
      kind: 'claim_submitted',
      summary: 'Claim CL-2041 submitted by Aarav Kumar',
      actor: { id: 'usr_aarav', name: 'Aarav Kumar', role: 'claimant' },
      visibility: 'claimant',
      at: '2026-06-16T10:15:00Z',
    },
    {
      id: 'tl_02',
      claimId: 'CL-2041',
      kind: 'analysis_completed',
      summary: 'Initial analysis version 1 generated',
      actor: { id: 'usr_meera', name: 'Meera Iyer', role: 'verifier' },
      visibility: 'verifier',
      at: '2026-06-16T10:20:00Z',
    },
  ];

  return {
    users: usersSeed as unknown as User[],
    claims,
    evidence: evidenceSeed as unknown as EvidenceFile[],
    analyses,
    messages: messagesSeed as unknown as Message[],
    requests: requestsSeed as unknown as EvidenceRequest[],
    decisions: decisionsSeed as unknown as Decision[],
    recommendation: recommendationSeed as unknown as Recommendation,
    timeline,
    privateNotes: [
      {
        id: 'note_01',
        claimId: 'CL-2042',
        author: { id: 'usr_meera', name: 'Meera Iyer' },
        body: 'Flagged discrepancy between photo timestamp and declared date. Requested updated invoice from workshop.',
        createdAt: '2026-10-15T09:40:00Z',
      },
    ],
  };
}

class Store {
  private data: MockStoreData;

  constructor() {
    this.data = this.load();
  }

  private load(): MockStoreData {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          return JSON.parse(raw);
        }
      }
    } catch (e) {
      console.warn('Could not read from localStorage, using fresh seed data', e);
    }
    const fresh = createInitialData();
    this.save(fresh);
    return fresh;
  }

  private save(data?: MockStoreData) {
    if (data) this.data = data;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
      }
    } catch (e) {
      console.warn('Could not save to localStorage', e);
    }
  }

  public getData(): MockStoreData {
    return this.data;
  }

  public persist() {
    this.save();
  }

  public reset(): MockStoreData {
    const fresh = createInitialData();
    this.save(fresh);
    return fresh;
  }
}

export const mockStore = new Store();

