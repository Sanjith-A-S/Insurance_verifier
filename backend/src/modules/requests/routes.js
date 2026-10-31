import { Router } from 'express';
import { resolveIdentity } from '../../middleware/identity.js';
import * as controller from './controller.js';

const router = Router({ mergeParams: true });
router.use(resolveIdentity);

router.get('/requests', controller.listRequests);
router.get('/requests/:rid', controller.getRequest);
router.post('/requests', controller.createRequest);
router.patch('/requests/:rid', controller.patchRequest);
router.post('/requests/:rid/responses', controller.submitResponse);

export default router;
