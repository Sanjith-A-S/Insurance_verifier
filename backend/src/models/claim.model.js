import mongoose from 'mongoose';

const checklistItemSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    category: {
      type: String,
      enum: ['policy', 'vehicle_identity', 'driver', 'incident', 'photos_video', 'repair_loss', 'other'],
      required: true,
    },
    label: { type: String, required: true },
    requirement: {
      type: String,
      enum: ['required', 'conditionally_required', 'optional', 'not_applicable'],
      required: true,
    },
    status: {
      type: String,
      enum: [
        'not_started',
        'uploaded',
        'processing',
        'received',
        'reviewed',
        'needs_replacement',
        'requested',
        'unavailable',
        'not_applicable',
      ],
      default: 'not_started',
    },
    reason: { type: String, default: '' },
    acceptableExamples: [{ type: String }],
    acceptedMimeTypes: [{ type: String }],
    maxSizeMB: { type: Number, default: 15 },
    statusChangedBy: { type: String },
    statusChangedAt: { type: Date },
    unavailableReason: { type: String },
    evidenceIds: [{ type: String }],
  },
  { _id: false }
);

const claimSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true }, // e.g. CL-2041
    claimantId: { type: String, required: true, ref: 'User' },
    assigneeId: { type: String, ref: 'User', default: null },
    status: {
      type: String,
      enum: ['draft', 'new', 'in_review', 'awaiting_claimant', 'decision_pending', 'completed'],
      default: 'draft',
      required: true,
    },
    priority: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium',
    },
    incident: {
      date: { type: String, required: true },
      time: { type: String, default: '' },
      timeUncertain: { type: Boolean, default: false },
      location: { type: String, default: '' },
      type: { type: String, default: 'collision' },
      thirdPartyInvolved: { type: String, default: 'no' },
      policeReportFiled: { type: String, default: 'no' },
      visibleDamageAreas: [{ type: String }],
    },
    vehicle: {
      registrationNumber: { type: String, required: true },
      make: { type: String, required: true },
      model: { type: String, required: true },
      year: { type: Number, required: true },
      vin: { type: String, default: '' },
    },
    driver: {
      isPolicyholder: { type: Boolean, default: true },
      name: { type: String, default: '' },
      relationship: { type: String, default: 'Self' },
      licenceNumber: { type: String, default: '' },
    },
    narrative: { type: String, default: '' },
    policy: {
      policyNumber: { type: String, default: '' },
      insurer: { type: String, default: '' },
    },
    submittedAt: { type: Date, default: null },
    evidenceSeq: { type: Number, default: 0 },
    latestAnalysisVersion: { type: Number, default: null },
    idempotencyKey: { type: String, default: null },
    checklist: [checklistItemSchema],
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

claimSchema.index({ claimantId: 1, updatedAt: -1 });
claimSchema.index({ status: 1, updatedAt: -1 });
claimSchema.index({ assigneeId: 1, status: 1 });
claimSchema.index(
  { claimantId: 1, idempotencyKey: 1 },
  {
    unique: true,
    partialFilterExpression: { idempotencyKey: { $type: 'string' } },
  }
);

export const Claim = mongoose.model('Claim', claimSchema);
