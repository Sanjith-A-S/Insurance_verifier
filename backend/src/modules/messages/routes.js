import { Router } from 'express';
import { resolveIdentity } from '../../middleware/identity.js';
import * as controller from './controller.js';

const router = Router({ mergeParams: true });
router.use(resolveIdentity);

router.get('/messages', controller.getMessages);
router.post('/messages', controller.sendMessage);
router.post('/messages/read', controller.markRead);

export default router;
