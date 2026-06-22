import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { placementMessageSchema, placementOverrideSchema } from './placement.schemas.js';
import { startPlacement, sendPlacementMessage, overridePlacement } from './placement.controller.js';

const router = Router();

router.post('/start', authMiddleware, startPlacement);
router.post('/message', authMiddleware, validate(placementMessageSchema), sendPlacementMessage);
router.post('/override', authMiddleware, validate(placementOverrideSchema), overridePlacement);

export default router;
