import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import * as controller from './controller.js';
import { registerSchema, loginSchema } from './service.js';

const router = Router();

router.post('/register', validate(registerSchema), controller.register);
router.post('/login', validate(loginSchema), controller.login);

export default router;
