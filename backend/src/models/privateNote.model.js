import mongoose from 'mongoose';

const privateNoteSchema = new mongoose.Schema(
  {
    claimId: { type: String, required: true, ref: 'Claim' },
    author: {
      id: { type: String, required: true },
      name: { type: String, required: true },
    },
    body: { type: String, required: true },
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

privateNoteSchema.index({ claimId: 1, createdAt: -1 });

export const PrivateNote = mongoose.model('PrivateNote', privateNoteSchema);
