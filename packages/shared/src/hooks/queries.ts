// ──────────────────────────────────────────────────────────────────────
//  @claimlens/shared · hooks/queries.ts
//  TanStack Query hooks wrapping the typed ApiClient.
// ──────────────────────────────────────────────────────────────────────
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiClient, ClaimFilters, CreateClaimBody, ReviewFindingBody, RecordDecisionBody } from '../api/client.js';

export const queryKeys = {
  me:           () => ['me'] as const,
  demoUsers:    () => ['demoUsers'] as const,
  dashboard:    () => ['dashboard'] as const,
  claims:       (filters?: ClaimFilters) => ['claims', filters] as const,
  claim:        (id: string) => ['claim', id] as const,
  timeline:     (id: string) => ['timeline', id] as const,
  checklist:    (claimId: string) => ['checklist', claimId] as const,
  evidence:     (claimId: string) => ['evidence', claimId] as const,
  analysis:     (claimId: string) => ['analysis', claimId] as const,
  analysisVer:  (claimId: string, ver: number) => ['analysis', claimId, ver] as const,
  messages:     (claimId: string) => ['messages', claimId] as const,
  requests:     (claimId: string) => ['requests', claimId] as const,
  decisions:    (claimId: string) => ['decisions', claimId] as const,
  recommendation:(claimId: string) => ['recommendation', claimId] as const,
  privateNotes: (claimId: string) => ['privateNotes', claimId] as const,
};

export function createQueryHooks(client: ApiClient) {
  return {
    useMe: () =>
      useQuery({ queryKey: queryKeys.me(), queryFn: client.getMe }),

    useDemoUsers: () =>
      useQuery({ queryKey: queryKeys.demoUsers(), queryFn: client.getDemoUsers }),

    useDashboard: () =>
      useQuery({ queryKey: queryKeys.dashboard(), queryFn: client.getDashboard }),

    useClaims: (filters?: ClaimFilters) =>
      useQuery({
        queryKey: queryKeys.claims(filters),
        queryFn: () => client.listClaims(filters),
      }),

    useClaim: (id: string) =>
      useQuery({
        queryKey: queryKeys.claim(id),
        queryFn: () => client.getClaim(id),
        enabled: Boolean(id),
      }),

    useTimeline: (id: string) =>
      useQuery({
        queryKey: queryKeys.timeline(id),
        queryFn: () => client.getTimeline(id),
        enabled: Boolean(id),
      }),

    useChecklist: (claimId: string) =>
      useQuery({
        queryKey: queryKeys.checklist(claimId),
        queryFn: () => client.getChecklist(claimId),
        enabled: Boolean(claimId),
      }),

    useEvidence: (claimId: string) =>
      useQuery({
        queryKey: queryKeys.evidence(claimId),
        queryFn: () => client.listEvidence(claimId),
        enabled: Boolean(claimId),
      }),

    useAnalysis: (claimId: string) =>
      useQuery({
        queryKey: queryKeys.analysis(claimId),
        queryFn: () => client.getAnalysis(claimId),
        enabled: Boolean(claimId),
      }),

    useAnalysisVersion: (claimId: string, version: number) =>
      useQuery({
        queryKey: queryKeys.analysisVer(claimId, version),
        queryFn: () => client.getAnalysisVersion(claimId, version),
        enabled: Boolean(claimId && version),
      }),

    useMessages: (claimId: string) =>
      useQuery({
        queryKey: queryKeys.messages(claimId),
        queryFn: () => client.listMessages(claimId),
        enabled: Boolean(claimId),
        refetchInterval: 6000,
      }),

    useRequests: (claimId: string) =>
      useQuery({
        queryKey: queryKeys.requests(claimId),
        queryFn: () => client.listRequests(claimId),
        enabled: Boolean(claimId),
      }),

    useDecisions: (claimId: string) =>
      useQuery({
        queryKey: queryKeys.decisions(claimId),
        queryFn: () => client.listDecisions(claimId),
        enabled: Boolean(claimId),
      }),

    useRecommendation: (claimId: string) =>
      useQuery({
        queryKey: queryKeys.recommendation(claimId),
        queryFn: () => client.getRecommendation(claimId),
        enabled: Boolean(claimId),
      }),

    usePrivateNotes: (claimId: string) =>
      useQuery({
        queryKey: queryKeys.privateNotes(claimId),
        queryFn: () => client.listPrivateNotes(claimId),
        enabled: Boolean(claimId),
      }),

    // ── Mutations ──
    useCreateClaim: () => {
      const qc = useQueryClient();
      return useMutation({
        mutationFn: (body: CreateClaimBody) => client.createClaim(body),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['claims'] }),
      });
    },

    useSubmitClaim: (claimId: string) => {
      const qc = useQueryClient();
      return useMutation({
        mutationFn: () => client.submitClaim(claimId),
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: queryKeys.claim(claimId) });
          qc.invalidateQueries({ queryKey: ['claims'] });
        },
      });
    },

    useRunAnalysis: (claimId: string) => {
      const qc = useQueryClient();
      return useMutation({
        mutationFn: () => client.runAnalysis(claimId),
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: queryKeys.analysis(claimId) });
          qc.invalidateQueries({ queryKey: queryKeys.claim(claimId) });
        },
      });
    },

    useSendMessage: (claimId: string) => {
      const qc = useQueryClient();
      return useMutation({
        mutationFn: ({ body, attachmentEvidenceIds }: { body: string; attachmentEvidenceIds?: string[] }) =>
          client.sendMessage(claimId, body, attachmentEvidenceIds),
        onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.messages(claimId) }),
      });
    },

    useCreateRequest: (claimId: string) => {
      const qc = useQueryClient();
      return useMutation({
        mutationFn: (body: Parameters<ApiClient['createRequest']>[1]) =>
          client.createRequest(claimId, body),
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: queryKeys.requests(claimId) });
          qc.invalidateQueries({ queryKey: queryKeys.claim(claimId) });
        },
      });
    },

    useRespondToRequest: (claimId: string, requestId: string) => {
      const qc = useQueryClient();
      return useMutation({
        mutationFn: (body: Parameters<ApiClient['respondToRequest']>[2]) =>
          client.respondToRequest(claimId, requestId, body),
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: queryKeys.requests(claimId) });
          qc.invalidateQueries({ queryKey: queryKeys.claim(claimId) });
        },
      });
    },

    useResolveRequest: (claimId: string, requestId: string) => {
      const qc = useQueryClient();
      return useMutation({
        mutationFn: () => client.resolveRequest(claimId, requestId),
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: queryKeys.requests(claimId) });
          qc.invalidateQueries({ queryKey: queryKeys.claim(claimId) });
        },
      });
    },

    useAddPrivateNote: (claimId: string) => {
      const qc = useQueryClient();
      return useMutation({
        mutationFn: (body: string) => client.addPrivateNote(claimId, body),
        onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.privateNotes(claimId) }),
      });
    },

    useRecordDecision: (claimId: string) => {
      const qc = useQueryClient();
      return useMutation({
        mutationFn: (body: RecordDecisionBody) => client.recordDecision(claimId, body),
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: queryKeys.decisions(claimId) });
          qc.invalidateQueries({ queryKey: queryKeys.claim(claimId) });
          qc.invalidateQueries({ queryKey: ['claims'] });
        },
      });
    },

    useReviewFinding: (claimId: string, version: number) => {
      const qc = useQueryClient();
      return useMutation({
        mutationFn: ({ findingId, body }: { findingId: string; body: ReviewFindingBody }) =>
          client.reviewFinding(claimId, version, findingId, body),
        onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.analysis(claimId) }),
      });
    },
  };
}

