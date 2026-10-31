import { Recommendation } from '../../models/recommendation.model.js';
import { Claim } from '../../models/claim.model.js';
import { loadClaimForActor, assertRole } from '../../lib/access.js';
import { logTimelineEvent } from '../../lib/timeline.js';
import { NotFoundError } from '../../lib/errors.js';

const FIXED_NOTICE =
  'Cover bought in future cannot retroactively cover this incident and does not affect how the current claim is handled.';

export async function getRecommendation(actor, claimId) {
  const claim = await loadClaimForActor(claimId, actor);
  const rec = await Recommendation.findOne({ claimId }).sort({ createdAt: -1 }).lean();

  if (!rec) {
    return {
      offered: false,
      content: null,
    };
  }

  // Claimant projection: only visible if offeredToClaimant or requestedByClaimant; strip assumptions
  if (actor.role === 'claimant') {
    if (!rec.offeredToClaimant && !rec.requestedByClaimant) {
      return {
        offered: false,
        content: null,
      };
    }
    return {
      label: rec.label,
      catalogueStatus: rec.catalogueStatus,
      content: rec.content,
      createdAt: rec.createdAt,
    };
  }

  // Verifier projection
  return {
    id: rec._id.toString(),
    claimId: rec.claimId,
    label: rec.label,
    catalogueStatus: rec.catalogueStatus,
    offeredToClaimant: rec.offeredToClaimant,
    requestedByClaimant: rec.requestedByClaimant,
    content: rec.content,
    assumptions: rec.assumptions || [],
    createdBy: rec.createdBy,
    createdAt: rec.createdAt,
  };
}

export async function createRecommendationOffer(actor, claimId, { offerToClaimant = false }) {
  assertRole(actor, 'verifier');
  const claim = await loadClaimForActor(claimId, actor);

  const defaultOptions = [
    {
      code: 'zero_depreciation',
      title: 'Zero Depreciation Add-on Cover',
      explanation: 'Covers full cost of parts replacement during repair without deduction for vehicle component age or wear.',
      relevanceToIncident: 'Applicable to panel, bumper, and plastic/fibre component repair costs.',
    },
    {
      code: 'consumables_cover',
      title: 'Consumables Expense Protection',
      explanation: 'Reimburses auxiliary workshop consumable materials like engine oil, nuts, bolts, lubricants, and coolant.',
      relevanceToIncident: 'Consumables are typically excluded from base standard own-damage policy settlement formulas.',
    },
    {
      code: 'roadside_assistance',
      title: '24/7 Roadside Assistance',
      explanation: 'Provides emergency towing, flat-tire assistance, jumpstarts, and on-spot breakdown support.',
      relevanceToIncident: 'Facilitates immediate vehicle recovery post-collision from incident location.',
    },
  ];

  const rec = await Recommendation.create({
    claimId,
    label: 'general_education',
    catalogueStatus: 'no_verified_catalogue',
    offeredToClaimant: Boolean(offerToClaimant),
    requestedByClaimant: false,
    content: {
      title: 'Future Coverage Considerations (General Education)',
      notice: FIXED_NOTICE,
      options: defaultOptions,
    },
    assumptions: [
      'Educational guide only; no insurance underwriting or pricing advice provided',
      'Does not modify claim settlement or existing policy terms',
    ],
    createdBy: { id: actor.id, name: actor.name },
  });

  await logTimelineEvent({
    claimId,
    kind: 'recommendation_generated',
    summary: 'Educational future coverage options generated',
    actor,
    visibility: 'verifier',
    metadata: { recommendationId: rec._id.toString(), offeredToClaimant: Boolean(offerToClaimant) },
  });

  return getRecommendation(actor, claimId);
}

export async function requestRecommendationAsClaimant(actor, claimId) {
  assertRole(actor, 'claimant');
  const claim = await loadClaimForActor(claimId, actor);

  const defaultOptions = [
    {
      code: 'zero_depreciation',
      title: 'Zero Depreciation Add-on Cover',
      explanation: 'Covers full cost of parts replacement during repair without deduction for vehicle component age or wear.',
      relevanceToIncident: 'Helps cover depreciation deductions on metal, plastic, and rubber components.',
    },
    {
      code: 'consumables_cover',
      title: 'Consumables Expense Protection',
      explanation: 'Reimburses workshop materials like oil, coolant, fasteners, and lubricants.',
      relevanceToIncident: 'Consumable materials are usually excluded under standard motor insurance.',
    },
  ];

  const rec = await Recommendation.create({
    claimId,
    label: 'general_education',
    catalogueStatus: 'no_verified_catalogue',
    offeredToClaimant: true,
    requestedByClaimant: true,
    content: {
      title: 'Future Coverage Considerations (General Education)',
      notice: FIXED_NOTICE,
      options: defaultOptions,
    },
    assumptions: [
      'Requested by policyholder for informational learning purposes',
      'No commercial offers or premiums quoted',
    ],
    createdBy: { id: actor.id, name: actor.name },
  });

  await logTimelineEvent({
    claimId,
    kind: 'recommendation_requested',
    summary: 'Claimant requested educational future coverage information',
    actor,
    visibility: 'verifier',
    metadata: { recommendationId: rec._id.toString() },
  });

  return getRecommendation(actor, claimId);
}
