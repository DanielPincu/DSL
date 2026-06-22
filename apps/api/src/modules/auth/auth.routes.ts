import { Router } from 'express';
import { register, login, logout, getMe, switchLanguage } from './auth.controller.js';
import { validate } from '../../middleware/validate.js';
import { registerSchema, loginSchema } from './auth.schemas.js';
import { authMiddleware } from '../../middleware/auth.js';
import { z } from 'zod';

const router = Router();

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.post('/logout', authMiddleware, logout);
router.get('/me', authMiddleware, getMe);
router.patch('/language', authMiddleware, validate(z.object({ language: z.enum(['da', 'es']) })), switchLanguage);

export default router;
