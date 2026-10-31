import { Router } from 'express';
import { resolveIdentity } from '../../middleware/identity.js';
import { validate } from '../../middleware/validate.js';
import * as controller from './controller.js';
import {
  createClaimSchema,
  patchClaimSchema,
  assignClaimSchema,
  patchStatusSchema,
  patchChecklistItemSchema,
} from './schemas.js';

const router = Router();
router.use(resolveIdentity);

router.get('/', controller.listClaims);
router.post('/', validate(createClaimSchema), controller.createDraft);
router.get('/:id', controller.getClaim);
router.patch('/:id', validate(patchClaimSchema), controller.patchDraft);
router.post('/:id/submit', controller.submitClaim);
router.post('/:id/assign', validate(assignClaimSchema), controller.assignClaim);
router.patch('/:id/status', validate(patchStatusSchema), controller.patchStatus);

// Checklist
router.get('/:id/checklist', controller.getChecklist);
router.patch('/:id/checklist/:itemId', validate(patchChecklistItemSchema), controller.patchChecklistItem);
router.patch('/:id/checklist/:itemId/unavailable', (req, res, next) => {
  req.body = { status: 'unavailable', reason: req.body?.reason || 'Document unavailable' };
  controller.patchChecklistItem(req, res, next);
});

// Sub-routers mounted under /claims/:id
import evidenceRouter from '../evidence/routes.js';
import analysisRouter from '../analysis/routes.js';
import settlementRouter from '../settlement/routes.js';
import messagesRouter from '../messages/routes.js';
import requestsRouter from '../requests/routes.js';
import notesRouter from '../notes/routes.js';
import timelineRouter from '../timeline/routes.js';
import decisionsRouter from '../decisions/routes.js';
import recommendationsRouter from '../recommendations/routes.js';

router.use('/:id', evidenceRouter);
router.use('/:id', analysisRouter);
router.use('/:id', settlementRouter);
router.use('/:id', messagesRouter);
router.use('/:id', requestsRouter);
router.use('/:id', notesRouter);
router.use('/:id', timelineRouter);
router.use('/:id', decisionsRouter);
router.use('/:id', recommendationsRouter);

export default router;
