import { z } from 'zod';

const todayIso = () => new Date().toISOString().split('T')[0];

export const createClaimSchema = z.object({
  incident: z.object({
    date: z.string().refine((val) => {
      // Must not be in future
      return val <= todayIso();
    }, { message: 'Incident date cannot be in the future' }),
    time: z.string().optional().default(''),
    timeUncertain: z.boolean().optional().default(false),
    location: z.string().min(1, 'Incident location is required'),
    type: z.string().default('collision'),
    thirdPartyInvolved: z.union([z.string(), z.boolean()]).default('no'),
    policeReportFiled: z.union([z.string(), z.boolean()]).default('no'),
    visibleDamageAreas: z.array(z.string()).default([]),
  }),
  vehicle: z.object({
    registrationNumber: z.string().min(1, 'Vehicle registration number is required'),
    make: z.string().min(1, 'Vehicle make is required'),
    model: z.string().min(1, 'Vehicle model is required'),
    year: z.number().int().min(1980).max(2030),
    vin: z.string().optional().default(''),
  }),
  driver: z.object({
    isPolicyholder: z.boolean().default(true),
    name: z.string().optional().default(''),
    relationship: z.string().optional().default('Self'),
    licenceNumber: z.string().optional().default(''),
  }).optional().default({}),
  narrative: z.string().optional().default(''),
  policy: z.object({
    policyNumber: z.string().optional().default(''),
    insurer: z.string().optional().default(''),
  }).optional().default({}),
});

export const patchClaimSchema = createClaimSchema.partial();

export const assignClaimSchema = z.object({
  assigneeId: z.string().min(1, 'Assignee ID is required'),
});

export const patchStatusSchema = z.object({
  status: z.enum(['in_review', 'decision_pending']),
});

export const patchChecklistItemSchema = z.object({
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
});
