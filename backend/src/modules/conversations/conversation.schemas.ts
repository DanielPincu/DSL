import { z } from 'zod';

export const startConversationSchema = z.object({
  missionId: z.string().min(1, 'Mission ID is required'),
});

export const sendMessageSchema = z.object({
  message: z.string().min(1, 'Message is required'),
});
