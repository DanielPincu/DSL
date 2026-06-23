import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.js';
import { getAllMissions, getMissionBySlug } from './mission.controller.js';

const router = Router();

router.get('/', authMiddleware, getAllMissions);
router.get('/:slug', authMiddleware, getMissionBySlug);

export default router;
