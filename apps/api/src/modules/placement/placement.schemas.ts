import { z } from 'zod';
import { CEFR_LEVELS } from '@dls/shared';

export const placementMessageSchema = z.object({
  message: z.string().min(1, 'Message is required'),
});

export const placementOverrideSchema = z.object({
  selectedLevel: z.enum(CEFR_LEVELS),
});
