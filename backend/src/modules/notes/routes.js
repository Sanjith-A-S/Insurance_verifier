import { Router } from 'express';
import { resolveIdentity } from '../../middleware/identity.js';
import { requireRole } from '../../middleware/requireRole.js';
import * as controller from './controller.js';

const router = Router({ mergeParams: true });
router.use(resolveIdentity);

const verifierOnly = requireRole('verifier');

router.get('/private-notes', verifierOnly, controller.getNotes);
router.post('/private-notes', verifierOnly, controller.addNote);

export default router;
