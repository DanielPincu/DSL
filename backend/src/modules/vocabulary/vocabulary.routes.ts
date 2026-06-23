import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.js';
import { getAllVocabulary, toggleLearned, getLevelStatus, submitLevelQuiz } from './vocabulary.controller.js';
import { validate } from '../../middleware/validate.js';
import { z } from 'zod';

const router = Router();

router.get('/', authMiddleware, getAllVocabulary);
router.get('/level-status', authMiddleware, getLevelStatus);
router.post('/level-quiz', authMiddleware, validate(z.object({
  level: z.string().min(1),
  answers: z.array(z.object({ danish: z.string(), selectedEnglish: z.string() })),
})), submitLevelQuiz);
router.patch('/learned', authMiddleware, validate(z.object({
  wordId: z.string().min(1),
  learned: z.boolean(),
})), toggleLearned);

export default router;
