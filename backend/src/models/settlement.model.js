import mongoose from 'mongoose';

const settlementCalculationSchema = new mongoose.Schema(
  {
    claimId: { type: String, required: true, ref: 'Claim' },
    analysisVersion: { type: Number, default: null },
    status: {
      type: String,
      enum: ['calculated', 'withheld'],
      required: true,
    },
    currency: { type: String, default: 'INR' },
    lines: [
      {
        label: { type: String, required: true },
        value: { type: Number, required: true },
        kind: { type: String, required: true },
        source: { type: String, default: null },
        note: { type: String, default: null },
        _id: false,
      },
    ],
    formula: { type: String, required: true },
    assumptions: [{ type: String }],
    unresolved: [
      {
        id: { type: String, required: true },
        message: { type: String, required: true },
        suggestedRequestTitle: { type: String, default: null },
        _id: false,
      },
    ],
    resultAmount: { type: Number, default: null },
    calculatedAt: { type: Date, default: Date.now },
    calculatedBy: {
      id: { type: String, required: true },
      name: { type: String, required: true },
    },
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

settlementCalculationSchema.index({ claimId: 1, calculatedAt: -1 });

export const SettlementCalculation = mongoose.model(
  'SettlementCalculation',
  settlementCalculationSchema
);

const settlementOverrideSchema = new mongoose.Schema(
  {
    claimId: { type: String, required: true, ref: 'Claim' },
    amount: { type: Number, required: true },
    rationale: { type: String, required: true },
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

settlementOverrideSchema.index({ claimId: 1, at: -1 });

export const SettlementOverride = mongoose.model('SettlementOverride', settlementOverrideSchema);

