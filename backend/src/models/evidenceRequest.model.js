import mongoose from 'mongoose';

const responseItemSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    by: {
      id: { type: String, required: true },
      name: { type: String, required: true },
    },
    at: { type: Date, default: Date.now },
    message: { type: String, default: null },
    evidenceIds: [{ type: String }],
    unavailable: { type: Boolean, default: false },
    reason: { type: String, default: null },
  },
  { _id: false }
);

const historyItemSchema = new mongoose.Schema(
  {
    status: { type: String, required: true },
    by: {
      id: { type: String, required: true },
      name: { type: String, required: true },
    },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const evidenceRequestSchema = new mongoose.Schema(
  {
    claimId: { type: String, required: true, ref: 'Claim' },
    title: { type: String, required: true },
    reason: { type: String, required: true },
    examples: [{ type: String }],
    checklistItemId: { type: String, default: null },
    findingId: { type: String, default: null },
    status: {
      type: String,
      enum: ['draft', 'sent', 'response_submitted', 'resolved', 'not_applicable'],
      default: 'draft',
      required: true,
    },
    dueDate: { type: Date, default: null },
    createdBy: {
      id: { type: String, required: true },
      name: { type: String, required: true },
    },
    sentAt: { type: Date, default: null },
    resolvedAt: { type: Date, default: null },
    notApplicableReason: { type: String, default: null },
    responses: [responseItemSchema],
    history: [historyItemSchema],
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

evidenceRequestSchema.index({ claimId: 1, status: 1 });

export const EvidenceRequest = mongoose.model('EvidenceRequest', evidenceRequestSchema);

