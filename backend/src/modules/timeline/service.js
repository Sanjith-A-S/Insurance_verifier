import { TimelineEvent } from '../../models/timelineEvent.model.js';
import { loadClaimForActor } from '../../lib/access.js';

export async function listTimelineEvents(actor, claimId) {
  await loadClaimForActor(claimId, actor);

  const filter = { claimId };
  if (actor.role === 'claimant') {
    filter.visibility = 'claimant';
  }

  const events = await TimelineEvent.find(filter).sort({ at: -1 }).lean();

  return events.map((e) => {
    if (actor.role === 'claimant') {
      return {
        id: e._id.toString(),
        claimId: e.claimId,
        kind: e.kind,
        summary: e.summary,
        actor: {
          id: e.actor.role === 'claimant' ? e.actor.id : 'investigator',
          name: e.actor.role === 'claimant' ? e.actor.name : 'Claim Specialist',
          role: e.actor.role,
        },
        visibility: 'claimant',
        metadata: {},
        at: e.at,
      };
    }

    return {
      id: e._id.toString(),
      claimId: e.claimId,
      kind: e.kind,
      summary: e.summary,
      actor: e.actor,
      visibility: e.visibility,
      metadata: e.metadata || {},
      at: e.at,
    };
  });
}

