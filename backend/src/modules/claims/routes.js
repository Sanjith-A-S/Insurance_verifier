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

export default router;
