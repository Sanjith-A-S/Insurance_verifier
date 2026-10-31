// ──────────────────────────────────────────────────────────────────────
//  @claimlens/shared · constants.ts
// ──────────────────────────────────────────────────────────────────────
import type { ClaimStatus, ClaimPriority, ChecklistStatus, FactType, FindingStatus } from './types.js';

export const CLAIM_STATUS_MAP: Record<ClaimStatus, { label: string; color: string }> = {
  draft:              { label: 'Draft',              color: 'neutral' },
  new:                { label: 'New',                color: 'blue' },
  in_review:          { label: 'In Review',          color: 'orange' },
  awaiting_claimant:  { label: 'Needs Your Input',   color: 'yellow' },
  decision_pending:   { label: 'Decision Pending',   color: 'purple' },
  completed:          { label: 'Completed',          color: 'green' },
};

export const CLAIM_PRIORITY_MAP: Record<ClaimPriority, { label: string; color: string }> = {
  high:   { label: 'High',   color: 'red' },
  medium: { label: 'Medium', color: 'orange' },
  low:    { label: 'Low',    color: 'neutral' },
};

export const CHECKLIST_STATUS_MAP: Record<ChecklistStatus, { label: string; color: string }> = {
  not_started:      { label: 'Not Started',       color: 'neutral' },
  uploaded:         { label: 'Uploaded',          color: 'blue' },
  processing:       { label: 'Processing',        color: 'blue' },
  received:         { label: 'Received',          color: 'teal' },
  reviewed:         { label: 'Reviewed',          color: 'green' },
  needs_replacement:{ label: 'Needs Replacement', color: 'red' },
  requested:        { label: 'Requested',         color: 'orange' },
  unavailable:      { label: 'Marked Unavailable',color: 'neutral' },
  not_applicable:   { label: 'Not Applicable',    color: 'neutral' },
};

export const FACT_TYPE_MAP: Record<FactType, { label: string; shortLabel: string; color: string }> = {
  observed_in_file: { label: 'Observed in File',    shortLabel: 'Observed',  color: 'teal' },
  claimant_says:    { label: 'Claimant Says',        shortLabel: 'Claimant',  color: 'blue' },
  document_shows:   { label: 'Document Shows',       shortLabel: 'Document',  color: 'indigo' },
  calculated:       { label: 'Calculated',           shortLabel: 'Calc',      color: 'orange' },
  ai_inference:     { label: 'AI Inference',         shortLabel: 'Inferred',  color: 'purple' },
  unknown:          { label: 'Unknown',              shortLabel: 'Unknown',   color: 'neutral' },
};

export const FINDING_STATUS_MAP: Record<FindingStatus, { label: string; color: string }> = {
  open:                    { label: 'Open',                    color: 'blue' },
  useful:                  { label: 'Useful',                  color: 'green' },
  dismissed:               { label: 'Dismissed',               color: 'neutral' },
  clarification_requested: { label: 'Clarification Requested', color: 'orange' },
};

export const CELL_STATE_MAP: Record<string, { label: string; color: string }> = {
  agrees:      { label: 'Agrees',      color: 'green' },
  disagrees:   { label: 'Disagrees',   color: 'red' },
  partial:     { label: 'Partial',     color: 'orange' },
  not_covered: { label: 'N/A',         color: 'neutral' },
  unverified:  { label: 'Unverified',  color: 'neutral' },
};

// Checklist categories (determines grouping order)
export const CHECKLIST_CATEGORIES = [
  'photos_video',
  'police_documents',
  'vehicle_documents',
  'repair_estimate',
  'insurance_documents',
  'other',
] as const;

export const CHECKLIST_CATEGORY_LABELS: Record<string, string> = {
  photos_video:         'Photos & Video',
  police_documents:     'Police Documents',
  vehicle_documents:    'Vehicle Documents',
  repair_estimate:      'Repair Estimate',
  insurance_documents:  'Insurance Documents',
  other:                'Other',
};

// Demo users — mirrors the seed
export const DEMO_USERS = [
  { id: 'usr_aarav',   name: 'Aarav Kumar',  role: 'claimant' as const },
  { id: 'usr_rohan',   name: 'Rohan Das',    role: 'claimant' as const },
  { id: 'usr_priya',   name: 'Priya Raman',  role: 'claimant' as const },
  { id: 'usr_karthik', name: 'Karthik S',    role: 'claimant' as const },
  { id: 'usr_meera',   name: 'Meera Iyer',   role: 'verifier' as const },
  { id: 'usr_vikram',  name: 'Vikram Shah',  role: 'verifier' as const },
] as const;

export type DemoUserId = (typeof DEMO_USERS)[number]['id'];

