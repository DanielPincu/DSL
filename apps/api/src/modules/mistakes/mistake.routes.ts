import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.js';
import { getMyMistakes, markMastered } from './mistake.controller.js';

const router = Router();

router.get('/me', authMiddleware, getMyMistakes);
router.patch('/:id/mastered', authMiddleware, markMastered);

export default router;
