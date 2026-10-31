import mongoose from 'mongoose';

const evidenceFileSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true }, // e.g. EV-CL-2041-01
    claimId: { type: String, required: true, ref: 'Claim' },
    checklistItemId: { type: String, default: null },
    category: {
      type: String,
      enum: ['policy', 'vehicle_identity', 'driver', 'incident', 'photos_video', 'repair_loss', 'other'],
      default: 'other',
    },
    fileName: { type: String, required: true },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
    sha256: { type: String, required: true },
    pageCount: { type: Number, default: null },
    source: {
      type: String,
      enum: ['captured_in_app', 'uploaded_file'],
      default: 'uploaded_file',
    },
    captureSessionId: { type: String, default: null },
    receivedAt: { type: Date, default: Date.now },
    uploadedBy: {
      id: { type: String, required: true },
      name: { type: String, required: true },
      role: { type: String, required: true },
    },
    processingStatus: {
      type: String,
      enum: ['processing', 'received', 'failed'],
      default: 'processing',
    },
    reviewStatus: {
      type: String,
      enum: ['pending', 'reviewed', 'needs_replacement'],
      default: 'pending',
    },
    reviewNote: { type: String, default: null },
    requestId: { type: String, default: null },
    replacesEvidenceId: { type: String, default: null },
    replacedByEvidenceId: { type: String, default: null },
    storageKey: { type: String, required: true },
    width: { type: Number, default: null },
    height: { type: Number, default: null },
    perceptualHash: { type: String, default: null },
    provenance: {
      statuses: [{ type: String }],
      duplicateOfIds: [{ type: String }],
      similarToIds: [{ type: String }],
      metadata: {
        present: { type: Boolean, default: false },
        dateTaken: { type: String, default: null },
        cameraMake: { type: String, default: null },
        cameraModel: { type: String, default: null },
        gpsPresent: { type: Boolean, default: false }, // Only boolean, never coordinates!
      },
    },
    fixtureKey: { type: String, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

evidenceFileSchema.index({ claimId: 1, receivedAt: -1 });
evidenceFileSchema.index({ claimId: 1, sha256: 1 });

export const EvidenceFile = mongoose.model('EvidenceFile', evidenceFileSchema);

