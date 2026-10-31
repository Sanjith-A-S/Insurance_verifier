import mongoose from 'mongoose';

const timelineEventSchema = new mongoose.Schema(
  {
    claimId: { type: String, required: true, ref: 'Claim' },
    kind: { type: String, required: true },
    summary: { type: String, required: true },
    actor: {
      id: { type: String, required: true },
      name: { type: String, required: true },
      role: { type: String, required: true },
    },
    visibility: {
      type: String,
      enum: ['claimant', 'verifier'],
      default: 'verifier',
    },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
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

timelineEventSchema.index({ claimId: 1, at: -1 });
timelineEventSchema.index({ claimId: 1, visibility: 1, at: -1 });

export const TimelineEvent = mongoose.model('TimelineEvent', timelineEventSchema);
