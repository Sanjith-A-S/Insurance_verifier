import mongoose from 'mongoose';

const recommendationSchema = new mongoose.Schema(
  {
    claimId: { type: String, required: true, ref: 'Claim' },
    label: { type: String, default: 'general_education' },
    catalogueStatus: { type: String, default: 'no_verified_catalogue' },
    offeredToClaimant: { type: Boolean, default: false },
    requestedByClaimant: { type: Boolean, default: false },
    content: {
      title: { type: String, default: 'Future Coverage Considerations' },
      notice: {
        type: String,
        default:
          'Cover bought in future cannot retroactively cover this incident and does not affect how the current claim is handled.',
      },
      options: [
        {
          code: {
            type: String,
            enum: [
              'zero_depreciation',
              'engine_protection',
              'roadside_assistance',
              'consumables_cover',
              'other_general',
            ],
            required: true,
          },
          title: { type: String, required: true },
          explanation: { type: String, required: true },
          relevanceToIncident: { type: String, required: true },
          _id: false,
        },
      ],
    },
    assumptions: [{ type: String }],
    createdBy: {
      id: { type: String, required: true },
      name: { type: String, required: true },
    },
    model: { type: String, default: 'gemini-3-flash-preview' },
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

recommendationSchema.index({ claimId: 1, createdAt: -1 });

export const Recommendation = mongoose.model('Recommendation', recommendationSchema);

