import mongoose from 'mongoose';

const captureSessionSchema = new mongoose.Schema(
  {
    claimId: { type: String, required: true, ref: 'Claim' },
    createdBy: { type: String, required: true },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 2 * 60 * 60 * 1000), // +2h
      index: { expires: 0 },
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        ret.captureSessionId = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const CaptureSession = mongoose.model('CaptureSession', captureSessionSchema);
