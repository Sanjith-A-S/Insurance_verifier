import { Router } from 'express';
import { resolveIdentity } from '../../middleware/identity.js';
import { requireRole } from '../../middleware/requireRole.js';
import * as controller from './controller.js';

const router = Router({ mergeParams: true });
router.use(resolveIdentity);

const verifierOnly = requireRole('verifier');

router.get('/settlement', verifierOnly, controller.recalculate);
router.post('/settlement/recalculate', verifierOnly, controller.recalculate);
router.post('/settlement/override', verifierOnly, controller.override);

export default router;
