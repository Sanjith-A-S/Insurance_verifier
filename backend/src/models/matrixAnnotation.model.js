import mongoose from 'mongoose';

const matrixAnnotationSchema = new mongoose.Schema(
  {
    claimId: { type: String, required: true, ref: 'Claim' },
    analysisVersion: { type: Number, required: true },
    rowId: { type: String, required: true },
    text: { type: String, required: true },
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

matrixAnnotationSchema.index({ claimId: 1, analysisVersion: 1, rowId: 1 });

export const MatrixAnnotation = mongoose.model('MatrixAnnotation', matrixAnnotationSchema);

