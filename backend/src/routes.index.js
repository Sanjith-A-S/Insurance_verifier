import { Router } from 'express';
import healthRouter from './modules/health/routes.js';
import demoRouter from './modules/demo/routes.js';
import meRouter from './modules/me/routes.js';
import claimsRouter from './modules/claims/routes.js';
import dashboardRouter from './modules/dashboard/routes.js';
import authRouter from './modules/auth/routes.js';

const router = Router();

router.use('/', healthRouter);
router.use('/demo', demoRouter);
router.use('/me', meRouter);
router.use('/claims', claimsRouter);
router.use('/investigator', dashboardRouter);
router.use('/auth', authRouter);

export default router;
