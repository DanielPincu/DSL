import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.js';
import { getDashboard } from './dashboard.controller.js';

const router = Router();

router.get('/', authMiddleware, getDashboard);

export default router;
