import { Response } from 'express';
import type { AuthRequest } from '../../middleware/auth.js';
import User from '../users/user.model.js';
import { getAIProvider, PLACEMENT_SYSTEM_PROMPT, buildPlacementPrompt } from '../ai/ai.service.js';
import type { Message } from '@dls/shared';

// Store placement conversations in memory (not persisted)
interface PlacementMessage {
  role: Message['role'];
  content: string;
  createdAt: string;
}
const placementSessions = new Map<string, { messages: PlacementMessage[] }>();

export async function startPlacement(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const firstMessage = {
      role: 'assistant' as const,
      content: 'Hej! Velkommen til Danish Life Simulator. Jeg vil gerne lære dig at kende. Hvad hedder du?',
      createdAt: new Date().toISOString(),
    };

    placementSessions.set(userId, {
      messages: [{ role: 'system', content: PLACEMENT_SYSTEM_PROMPT, createdAt: new Date().toISOString() }, firstMessage],
    });

    res.json({
      success: true,
      data: { messages: [firstMessage], sessionActive: true },
    });
  } catch (error) {
    console.error('Start placement error:', error);
    res.status(500).json({ success: false, error: 'Failed to start placement' });
  }
}

export async function sendPlacementMessage(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const { message } = req.body;

    let session = placementSessions.get(userId);
    if (!session) {
      // Auto-start if no session
      session = {
        messages: [{ role: 'system', content: PLACEMENT_SYSTEM_PROMPT, createdAt: new Date().toISOString() }],
      };
      placementSessions.set(userId, session);
    }

    session.messages.push({
      role: 'user',
      content: message,
      createdAt: new Date().toISOString(),
    });

    const provider = getAIProvider();
    const prompt = buildPlacementPrompt(session.messages);
    const result = await provider.generateJSON<{
      estimatedLevel?: string;
      confidence?: number;
      strengths?: string[];
      weaknesses?: string[];
      explanation?: string;
      nextQuestion?: string;
    }>(prompt, PLACEMENT_SYSTEM_PROMPT);

    // Check if assessment is complete
    if (result.estimatedLevel) {
      const level = result.estimatedLevel;
      if (!['A1', 'A2', 'B1', 'B2', 'C1'].includes(level)) {
        res.status(400).json({ success: false, error: 'Invalid level assessment' });
        return;
      }

      await User.findByIdAndUpdate(userId, {
        estimatedLevel: level,
        levelSource: 'assessment',
        levelConfidence: result.confidence ?? 50,
        strengths: result.strengths ?? [],
        weaknesses: result.weaknesses ?? [],
        placementCompleted: true,
      });

      placementSessions.delete(userId);

      res.json({
        success: true,
        data: {
          completed: true,
          estimatedLevel: level,
          confidence: result.confidence ?? 50,
          strengths: result.strengths ?? [],
          weaknesses: result.weaknesses ?? [],
          explanation: result.explanation ?? '',
        },
      });
    } else {
      // Continue conversation
      const nextQuestion = result.nextQuestion || 'Fortæl mig mere om dig selv.';
      session.messages.push({
        role: 'assistant',
        content: nextQuestion,
        createdAt: new Date().toISOString(),
      });

      res.json({
        success: true,
        data: {
          completed: false,
          message: nextQuestion,
        },
      });
    }
  } catch (error) {
    console.error('Placement message error:', error);
    res.status(500).json({ success: false, error: 'Failed to process placement message' });
  }
}

export async function overridePlacement(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const { selectedLevel } = req.body;

    const user = await User.findById(userId);
    const lang = user?.activeLanguage || 'da';
    await User.findByIdAndUpdate(userId, {
      [`progress.${lang}.selectedLevel`]: selectedLevel,
      [`progress.${lang}.levelSource`]: 'user_override',
      [`progress.${lang}.placementCompleted`]: true,
    });

    const updatedUser = await User.findById(userId);

    res.json({
      success: true,
      data: updatedUser?.toJSON(),
    });
  } catch (error) {
    console.error('Override placement error:', error);
    res.status(500).json({ success: false, error: 'Failed to override placement' });
  }
}
