import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.js';
import { getMyAttempts } from './attempt.controller.js';

const router = Router();

router.get('/me', authMiddleware, getMyAttempts);

export default router;
