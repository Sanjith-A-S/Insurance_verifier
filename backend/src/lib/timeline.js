import { TimelineEvent } from '../models/timelineEvent.model.js';
import { logger } from '../middleware/logger.js';

export async function logTimelineEvent({
  claimId,
  kind,
  summary,
  actor,
  visibility = 'verifier',
  metadata = {},
  at = new Date(),
}) {
  try {
    const event = await TimelineEvent.create({
      claimId,
      kind,
      summary,
      actor: {
        id: actor.id || 'system',
        name: actor.name || 'System',
        role: actor.role || 'system',
      },
      visibility,
      metadata,
      at,
    });
    return event;
  } catch (err) {
    logger.error({ err, claimId, kind }, 'Failed to log timeline event');
    return null;
  }
}

