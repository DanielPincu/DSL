import { Router } from 'express';
import { register, login, logout, getMe } from './auth.controller.js';
import { validate } from '../../middleware/validate.js';
import { registerSchema, loginSchema } from './auth.schemas.js';
import { authMiddleware } from '../../middleware/auth.js';

const router = Router();

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.post('/logout', authMiddleware, logout);
router.get('/me', authMiddleware, getMe);

export default router;
