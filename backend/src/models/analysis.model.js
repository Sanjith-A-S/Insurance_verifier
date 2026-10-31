import mongoose from 'mongoose';

const stageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    status: { type: String, enum: ['pending', 'running', 'completed', 'failed', 'skipped'], default: 'pending' },
    error: { type: String, default: null },
  },
  { _id: false }
);

const analysisSchema = new mongoose.Schema(
  {
    claimId: { type: String, required: true, ref: 'Claim' },
    version: { type: Number, required: true },
    analysisId: { type: String, required: true },
    state: {
      type: String,
      enum: ['running', 'ready', 'unavailable'],
      default: 'running',
    },
    model: {
      name: { type: String, default: 'gemini-3-flash-preview' },
      promptVersion: { type: String, default: 'analysis@1' },
    },
    aiStatus: {
      type: String,
      enum: ['ok', 'degraded', 'unavailable', 'mock'],
      default: 'ok',
    },
    createdBy: { type: String, required: true },
    evidenceSnapshot: [
      {
        evidenceId: { type: String, required: true },
        sha256: { type: String, required: true },
        _id: false,
      },
    ],
    stages: [stageSchema],
    summary: { type: String, default: '' },
    extractedFacts: [{ type: mongoose.Schema.Types.Mixed }],
    regions: { type: mongoose.Schema.Types.Mixed, default: {} },
    matrix: {
      columns: [{ type: mongoose.Schema.Types.Mixed }],
      rows: [{ type: mongoose.Schema.Types.Mixed }],
    },
    findings: [{ type: mongoose.Schema.Types.Mixed }],
    missingEvidence: [{ type: mongoose.Schema.Types.Mixed }],
    policy: {
      clauses: [{ type: mongoose.Schema.Types.Mixed }],
      coverage: [{ type: mongoose.Schema.Types.Mixed }],
    },
    settlement: { type: mongoose.Schema.Types.Mixed, default: null },
    warnings: [{ type: String }],
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

analysisSchema.index({ claimId: 1, version: 1 }, { unique: true });

export const Analysis = mongoose.model('Analysis', analysisSchema);

