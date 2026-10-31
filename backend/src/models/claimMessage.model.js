import mongoose from 'mongoose';

const claimMessageSchema = new mongoose.Schema(
  {
    claimId: { type: String, required: true, ref: 'Claim' },
    sender: {
      id: { type: String, required: true },
      name: { type: String, required: true },
      role: { type: String, enum: ['claimant', 'verifier'], required: true },
    },
    body: { type: String, required: true },
    attachmentEvidenceIds: [{ type: String }],
    kind: {
      type: String,
      enum: ['message', 'request_notice'],
      default: 'message',
    },
    requestId: { type: String, default: null },
    readBy: [{ type: String }],
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

claimMessageSchema.index({ claimId: 1, createdAt: 1 });

export const ClaimMessage = mongoose.model('ClaimMessage', claimMessageSchema);

