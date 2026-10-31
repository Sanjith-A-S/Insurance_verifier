import mongoose from 'mongoose';

const decisionSchema = new mongoose.Schema(
  {
    claimId: { type: String, required: true, ref: 'Claim' },
    decision: {
      type: String,
      enum: [
        'pending',
        'recommend_approve',
        'recommend_partial',
        'recommend_reject',
        'more_information_required',
        'closed',
      ],
      required: true,
    },
    rationale: { type: String, default: '' },
    recommendedAmount: { type: Number, default: null },
    actor: {
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

decisionSchema.index({ claimId: 1, at: -1 });

export const Decision = mongoose.model('Decision', decisionSchema);

