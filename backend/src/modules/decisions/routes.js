import { Router } from 'express';
import { resolveIdentity } from '../../middleware/identity.js';
import { requireRole } from '../../middleware/requireRole.js';
import * as controller from './controller.js';

const router = Router({ mergeParams: true });
router.use(resolveIdentity);

const verifierOnly = requireRole('verifier');

router.get('/decisions', verifierOnly, controller.getDecisions);
router.post('/decisions', verifierOnly, controller.createDecision);

export default router;
