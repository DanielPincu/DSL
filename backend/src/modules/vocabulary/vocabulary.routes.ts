import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.js';
import { getAllVocabulary, toggleLearned } from './vocabulary.controller.js';
import { validate } from '../../middleware/validate.js';
import { z } from 'zod';

const router = Router();

router.get('/', authMiddleware, getAllVocabulary);
router.patch('/learned', authMiddleware, validate(z.object({
  wordId: z.string().min(1),
  learned: z.boolean(),
})), toggleLearned);

export default router;
