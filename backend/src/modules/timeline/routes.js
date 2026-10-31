import { Router } from 'express';
import { resolveIdentity } from '../../middleware/identity.js';
import * as controller from './controller.js';

const router = Router({ mergeParams: true });
router.use(resolveIdentity);

router.get('/timeline', controller.getTimeline);

export default router;

