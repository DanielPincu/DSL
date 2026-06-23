import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { startConversationSchema, sendMessageSchema } from './conversation.schemas.js';
import {
  startConversation,
  sendMessage,
  getMyConversations,
  getConversation,
} from './conversation.controller.js';

const router = Router();

router.post('/start', authMiddleware, validate(startConversationSchema), startConversation);
router.post('/:id/message', authMiddleware, validate(sendMessageSchema), sendMessage);
router.get('/me', authMiddleware, getMyConversations);
router.get('/:id', authMiddleware, getConversation);

export default router;
