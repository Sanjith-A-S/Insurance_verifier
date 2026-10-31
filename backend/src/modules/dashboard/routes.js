import { Router } from 'express';
import { resolveIdentity } from '../../middleware/identity.js';
import { requireRole } from '../../middleware/requireRole.js';
import * as controller from './controller.js';

const router = Router();
router.use(resolveIdentity);
router.use(requireRole('verifier'));

router.get('/dashboard', controller.getDashboard);

export default router;

