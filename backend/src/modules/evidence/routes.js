import { Router } from 'express';
import { resolveIdentity } from '../../middleware/identity.js';
import { singleFileUpload } from '../../middleware/upload.js';
import { uploadLimiter } from '../../middleware/rateLimiters.js';
import * as controller from './controller.js';

const router = Router({ mergeParams: true });
router.use(resolveIdentity);

router.post('/capture-sessions', controller.createCaptureSession);
router.post('/evidence', uploadLimiter, singleFileUpload, controller.uploadEvidence);
router.get('/evidence', controller.listEvidence);
router.get('/evidence/:eid', controller.getEvidence);
router.get('/evidence/:eid/file', controller.getFile);
router.get('/evidence/:eid/thumbnail', controller.getThumbnail);
router.post('/evidence/:eid/review', controller.reviewEvidence);
router.patch('/evidence/:eid/review', controller.reviewEvidence);

export default router;

