import { z } from 'zod';

export const ApiErrorSchema = z.object({
  ok: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    fields: z
      .array(
        z.object({
          field: z.string(),
          message: z.string(),
        })
      )
      .optional(),
  }),
});

export function apiSuccessSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    ok: z.literal(true),
    data: dataSchema,
    meta: z
      .object({
        page: z.number(),
        pageSize: z.number(),
        total: z.number(),
      })
      .optional(),
  });
}

export const NextStepSchema = z.object({
  kind: z.string(),
  label: z.string(),
  description: z.string(),
});

export const ChecklistProgressSchema = z.object({
  done: z.number(),
  applicable: z.number(),
});

export const ChecklistItemSchema = z.object({
  id: z.string(),
  category: z.string(),
  label: z.string(),
  requirement: z.enum(['required', 'conditionally_required', 'optional', 'not_applicable']),
  status: z.enum([
    'not_started',
    'uploaded',
    'processing',
    'received',
    'reviewed',
    'needs_replacement',
    'requested',
    'unavailable',
    'not_applicable',
  ]),
  reason: z.string().optional(),
  acceptableExamples: z.array(z.string()).optional(),
  acceptedMimeTypes: z.array(z.string()).optional(),
  maxSizeMB: z.number().optional(),
  statusChangedBy: z.string().nullable().optional(),
  statusChangedAt: z.union([z.string(), z.date()]).nullable().optional(),
  unavailableReason: z.string().nullable().optional(),
  evidenceIds: z.array(z.string()).optional(),
});

export const ClaimSummarySchema = z.object({
  id: z.string(),
  claimantId: z.string(),
  claimantName: z.string(),
  status: z.enum(['draft', 'new', 'in_review', 'awaiting_claimant', 'decision_pending', 'completed']),
  priority: z.enum(['high', 'medium', 'low']),
  stage: z.string(),
  incident: z.object({
    date: z.string(),
    type: z.string(),
    location: z.string(),
  }),
  vehicle: z.object({
    registrationNumber: z.string(),
    make: z.string(),
    model: z.string(),
    year: z.number(),
  }),
  submittedAt: z.union([z.string(), z.date()]).nullable().optional(),
  createdAt: z.union([z.string(), z.date()]),
  updatedAt: z.union([z.string(), z.date()]),
  checklistProgress: ChecklistProgressSchema,
  missingEvidenceCount: z.number(),
  openRequestCount: z.number(),
  unreadMessageCount: z.number(),
  nextStep: NextStepSchema,
  assigneeId: z.string().nullable().optional(),
  assigneeName: z.string().nullable().optional(),
  analysisState: z.string().optional(),
});

export const ClaimDetailSchema = ClaimSummarySchema.extend({
  incident: z.object({
    date: z.string(),
    time: z.string().optional(),
    timeUncertain: z.boolean().optional(),
    location: z.string(),
    type: z.string(),
    thirdPartyInvolved: z.union([z.string(), z.boolean()]),
    policeReportFiled: z.union([z.string(), z.boolean()]),
    visibleDamageAreas: z.array(z.string()),
  }),
  vehicle: z.object({
    registrationNumber: z.string(),
    make: z.string(),
    model: z.string(),
    year: z.number(),
    vin: z.string().optional(),
  }),
  driver: z.object({
    isPolicyholder: z.boolean(),
    name: z.string().optional(),
    relationship: z.string().optional(),
    licenceNumber: z.string().optional(),
  }),
  narrative: z.string().optional(),
  policy: z.object({
    policyNumber: z.string().optional(),
    insurer: z.string().optional(),
  }).optional(),
  checklist: z.array(ChecklistItemSchema),
});

export const EvidenceFileSchema = z.object({
  id: z.string(),
  claimId: z.string(),
  checklistItemId: z.string().nullable().optional(),
  category: z.string(),
  fileName: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number(),
  sha256: z.string(),
  pageCount: z.number().nullable().optional(),
  source: z.string(),
  receivedAt: z.union([z.string(), z.date()]),
  uploadedBy: z.object({
    id: z.string(),
    name: z.string(),
    role: z.string(),
  }),
  processingStatus: z.string(),
  reviewStatus: z.string().optional(),
  reviewNote: z.string().nullable().optional(),
  provenance: z.object({
    statuses: z.array(z.string()),
    duplicateOfIds: z.array(z.string()).optional(),
    similarToIds: z.array(z.string()).optional(),
    metadata: z.object({
      present: z.boolean(),
      dateTaken: z.string().nullable().optional(),
      cameraMake: z.string().nullable().optional(),
      cameraModel: z.string().nullable().optional(),
      gpsPresent: z.boolean().optional(),
    }),
  }),
});

export const FindingSchema = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string(),
  category: z.string(),
  priority: z.string(),
  status: z.string(),
  observed: z.array(z.string()),
  claimantAssertions: z.array(z.string()),
  documentFacts: z.array(z.string()),
  calculations: z.array(z.string()),
  aiInference: z.string().optional(),
  alternatives: z.array(z.string()),
  uncertainty: z.string(),
  nextAction: z.string(),
  sources: z.array(
    z.object({
      evidenceId: z.string(),
      page: z.number().optional(),
      regionId: z.string().optional(),
      field: z.string().optional(),
      quote: z.string().optional(),
    })
  ),
  lowEvidence: z.boolean(),
});

export const SettlementSchema = z.object({
  status: z.enum(['calculated', 'withheld']),
  currency: z.literal('INR'),
  lines: z.array(
    z.object({
      label: z.string(),
      value: z.number(),
      kind: z.string(),
      source: z.string().nullable().optional(),
      note: z.string().nullable().optional(),
    })
  ),
  formula: z.string(),
  assumptions: z.array(z.string()),
  unresolved: z.array(
    z.object({
      id: z.string(),
      message: z.string(),
      suggestedRequestTitle: z.string().nullable().optional(),
    })
  ),
  resultAmount: z.number().nullable().optional(),
  overrides: z.array(
    z.object({
      amount: z.number(),
      rationale: z.string(),
      by: z.any().optional(),
      at: z.any().optional(),
    })
  ),
  calculatedAt: z.union([z.string(), z.date()]),
});

export const AnalysisSchema = z.object({
  version: z.number(),
  createdAt: z.union([z.string(), z.date()]),
  model: z.object({
    name: z.string(),
    promptVersion: z.string(),
  }),
  summary: z.string(),
  extractedFacts: z.array(z.any()),
  regions: z.record(z.any()),
  matrix: z.object({
    columns: z.array(z.any()),
    rows: z.array(z.any()),
  }),
  findings: z.array(FindingSchema),
  missingEvidence: z.array(z.any()),
  policy: z.object({
    clauses: z.array(z.any()),
    coverage: z.array(z.any()),
  }),
  settlement: SettlementSchema.nullable().optional(),
});

export const MessageSchema = z.object({
  id: z.string(),
  claimId: z.string(),
  sender: z.object({
    id: z.string(),
    name: z.string(),
    role: z.string(),
  }),
  body: z.string(),
  kind: z.enum(['message', 'request_notice']),
  requestId: z.string().nullable().optional(),
  attachments: z.array(
    z.object({
      id: z.string(),
      fileName: z.string(),
      mimeType: z.string(),
      sizeBytes: z.number(),
    })
  ),
  createdAt: z.union([z.string(), z.date()]),
  read: z.boolean(),
});

export const EvidenceRequestSchema = z.object({
  id: z.string(),
  claimId: z.string(),
  title: z.string(),
  reason: z.string(),
  examples: z.array(z.string()).optional(),
  checklistItemId: z.string().nullable().optional(),
  findingId: z.string().nullable().optional(),
  status: z.enum(['draft', 'sent', 'response_submitted', 'resolved', 'not_applicable']),
  dueDate: z.union([z.string(), z.date()]).nullable().optional(),
  createdBy: z.object({ id: z.string(), name: z.string() }),
  sentAt: z.union([z.string(), z.date()]).nullable().optional(),
  resolvedAt: z.union([z.string(), z.date()]).nullable().optional(),
  notApplicableReason: z.string().nullable().optional(),
  responses: z.array(z.any()),
  createdAt: z.union([z.string(), z.date()]),
});

export const DecisionSchema = z.object({
  id: z.string(),
  claimId: z.string(),
  decision: z.string(),
  rationale: z.string(),
  recommendedAmount: z.number().nullable().optional(),
  actor: z.object({ id: z.string(), name: z.string() }),
  at: z.union([z.string(), z.date()]),
});

export const RecommendationSchema = z.object({
  offered: z.boolean().optional(),
  label: z.string().optional(),
  catalogueStatus: z.string().optional(),
  content: z.any().nullable().optional(),
});

export const DashboardDataSchema = z.object({
  totals: z.object({
    total: z.number(),
    new: z.number(),
    in_review: z.number(),
    awaiting_claimant: z.number(),
    decision_pending: z.number(),
    completed: z.number(),
  }),
  overTime: z.array(z.object({ date: z.string(), count: z.number() })),
  completenessBands: z.object({
    complete: z.number(),
    partial: z.number(),
    mostlyMissing: z.number(),
  }),
  awaitingEvidenceCount: z.number(),
  recentActivity: z.array(z.any()),
  nextUp: z.array(ClaimSummarySchema),
});
