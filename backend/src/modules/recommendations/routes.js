import { Router } from 'express';
import { resolveIdentity } from '../../middleware/identity.js';
import * as controller from './controller.js';

const router = Router({ mergeParams: true });
router.use(resolveIdentity);

router.get('/recommendation', controller.getRecommendation);
router.post('/recommendation', controller.offerRecommendation);
router.post('/recommendation-requests', controller.requestRecommendation);

export default router;

