import { Router } from 'express';
import { resolveIdentity } from '../../middleware/identity.js';
import * as controller from './controller.js';

const router = Router({ mergeParams: true });
router.use(resolveIdentity);

router.get('/requests', controller.listRequests);
router.get('/requests/:rid', controller.getRequest);
router.post('/requests', controller.createRequest);
router.patch('/requests/:rid', controller.patchRequest);
router.post('/requests/:rid/send', (req, res, next) => {
  req.body = { ...req.body, action: 'send' };
  controller.patchRequest(req, res, next);
});
router.post('/requests/:rid/resolve', (req, res, next) => {
  req.body = { ...req.body, action: 'resolve' };
  controller.patchRequest(req, res, next);
});
router.post('/requests/:rid/not-applicable', (req, res, next) => {
  req.body = { ...req.body, action: 'mark_not_applicable', reason: req.body?.reason || 'Not applicable' };
  controller.patchRequest(req, res, next);
});
router.post('/requests/:rid/responses', controller.submitResponse);
router.post('/requests/:rid/response', controller.submitResponse);

export default router;

