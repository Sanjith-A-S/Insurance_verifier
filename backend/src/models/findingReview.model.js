import mongoose from 'mongoose';

const findingReviewSchema = new mongoose.Schema(
  {
    claimId: { type: String, required: true, ref: 'Claim' },
    analysisVersion: { type: Number, required: true },
    findingId: { type: String, required: true },
    status: {
      type: String,
      enum: ['useful', 'dismissed', 'clarification_requested'],
      required: true,
    },
    reason: { type: String, default: null },
    by: {
      id: { type: String, required: true },
      name: { type: String, required: true },
    },
    at: { type: Date, default: Date.now },
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

findingReviewSchema.index({ claimId: 1, analysisVersion: 1, findingId: 1 });

export const FindingReview = mongoose.model('FindingReview', findingReviewSchema);
