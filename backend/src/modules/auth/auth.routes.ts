import { Router } from 'express';
import { register, login, logout, getMe, switchLanguage, setLevel, resetProfile, deleteAccount, passQuiz } from './auth.controller.js';
import { validate } from '../../middleware/validate.js';
import { registerSchema, loginSchema } from './auth.schemas.js';
import { authMiddleware } from '../../middleware/auth.js';
import { z } from 'zod';

const router = Router();

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.post('/logout', authMiddleware, logout);
router.get('/me', authMiddleware, getMe);
router.patch('/language', authMiddleware, validate(z.object({ language: z.enum(['da']) })), switchLanguage);
router.patch('/level', authMiddleware, validate(z.object({ level: z.enum(['A1', 'A2', 'B1', 'B2', 'C1']) })), setLevel);
router.post('/reset', authMiddleware, validate(z.object({ password: z.string().min(1) })), resetProfile);
router.post('/delete-account', authMiddleware, validate(z.object({ password: z.string().min(1) })), deleteAccount);
router.post('/pass-quiz', authMiddleware, validate(z.object({ level: z.string().min(1) })), passQuiz);

export default router;
