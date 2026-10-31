import { Router } from 'express';
import { resolveIdentity } from '../../middleware/identity.js';
import { requireRole } from '../../middleware/requireRole.js';
import { analyzeLimiter } from '../../middleware/rateLimiters.js';
import * as controller from './controller.js';

const router = Router({ mergeParams: true });
router.use(resolveIdentity);

const verifierOnly = requireRole('verifier');

router.post('/analysis', analyzeLimiter, verifierOnly, controller.runAnalysis);
router.get('/analysis/status', verifierOnly, controller.getStatus);
router.get('/analysis/versions', verifierOnly, controller.getVersions);
router.get('/analysis', verifierOnly, controller.getAnalysis);
router.patch('/findings/:fid', verifierOnly, controller.updateFinding);
router.post('/matrix/annotations', verifierOnly, controller.annotateMatrix);

export default router;
