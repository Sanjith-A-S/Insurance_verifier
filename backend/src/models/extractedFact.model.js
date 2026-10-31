import mongoose from 'mongoose';

const sourceRefSchema = new mongoose.Schema(
  {
    evidenceId: { type: String, required: true },
    page: { type: Number, default: null },
    regionId: { type: String, default: null },
    field: { type: String, default: null },
    quote: { type: String, default: null },
  },
  { _id: false }
);

const extractedFactSchema = new mongoose.Schema(
  {
    claimId: { type: String, required: true, ref: 'Claim' },
    analysisVersion: { type: Number, required: true },
    evidenceId: { type: String, default: null },
    sha256: { type: String, default: null },
    factType: { type: String, required: true },
    label: { type: String, required: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
    normalizedValue: { type: mongoose.Schema.Types.Mixed, default: null },
    sources: [sourceRefSchema],
    originType: {
      type: String,
      enum: [
        'claimant_assertion',
        'document_extraction',
        'image_observation',
        'deterministic',
        'human_verified',
      ],
      required: true,
    },
    confidence: { type: Number, default: 1.0 },
    extractionRunId: { type: String, default: null },
    promptVersion: { type: String, default: 'extraction@1' },
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

extractedFactSchema.index({ claimId: 1, analysisVersion: 1 });
extractedFactSchema.index({ evidenceId: 1, sha256: 1, promptVersion: 1 });

export const ExtractedFact = mongoose.model('ExtractedFact', extractedFactSchema);

