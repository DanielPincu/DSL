import { Response } from 'express';
import type { AuthRequest } from '../../middleware/auth.js';
import Conversation from './conversation.model.js';
import Mission from '../missions/mission.model.js';
import Attempt from '../attempts/attempt.model.js';
import Mistake from '../mistakes/mistake.model.js';
import User from '../users/user.model.js';
import { getActiveLevel } from '@dls/shared';
import { getAIProvider, buildConversationAIPrompt } from '../ai/ai.service.js';
import type { AIFeedback, CEFRLevel } from '@dls/shared';
import { getLevelMissionsWithLock } from '../missions/mission.controller.js';

const NEXT_LEVEL: Record<string, CEFRLevel | null> = {
  A1: 'A2',
  A2: 'B1',
  B1: 'B2',
  B2: 'C1',
  C1: null,
};

/**
 * Check if the user has completed all missions at their current level.
 * If so, auto-promote them to the next level.
 */
async function checkAutoPromotion(userId: string): Promise<CEFRLevel | null> {
  const user = await User.findById(userId);
  if (!user) return null;

  // Don't auto-promote if user manually overrode their level
  if (user.levelSource === 'user_override') return null;

  const currentLevel = getActiveLevel(user);
  if (!currentLevel) return null;

  const nextLevel = NEXT_LEVEL[currentLevel];
  if (!nextLevel) return null; // Already at max level

  // Count missions at current level
  const levelMissions = await Mission.countDocuments({ level: currentLevel });
  if (levelMissions === 0) return null;

  // Count completed missions at current level
  const missionIds = (await Mission.find({ level: currentLevel }).select('_id')).map((m) => m._id);
  const completed = await Conversation.countDocuments({
    userId,
    missionId: { $in: missionIds },
    status: 'completed',
  });

  if (completed >= levelMissions) {
    // All missions completed — promote!
    await User.findByIdAndUpdate(userId, {
      estimatedLevel: nextLevel,
      levelConfidence: Math.min((user.levelConfidence || 50) + 5, 100),
    });
    return nextLevel;
  }

  return null;
}

export async function startConversation(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const { missionId } = req.body;

    const mission = await Mission.findById(missionId);
    if (!mission) {
      res.status(404).json({ success: false, error: 'Mission not found' });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    const activeLevel = getActiveLevel(user) || 'A1';

    // Verify the mission is at the user's current level
    if (mission.level !== activeLevel) {
      res.status(403).json({
        success: false,
        error: `This mission is level ${mission.level}. Your current level is ${activeLevel}. Complete all ${activeLevel} missions first.`,
      });
      return;
    }

    // Check strict linear progression within the level
    const { missions } = await getLevelMissionsWithLock(userId, activeLevel);
    const prog = missions.find((m) => m.id === missionId);
    if (prog?.locked) {
      res.status(403).json({
        success: false,
        error: prog.lockedReason || 'Complete the previous mission first',
      });
      return;
    }

    // Check for existing active conversation
    const existing = await Conversation.findOne({ userId, missionId, status: 'active' });
    if (existing) {
      res.json({ success: true, data: existing.toJSON() });
      return;
    }

    const systemMessage = {
      role: 'system' as const,
      content: `You are ${mission.npcName}, a ${mission.npcRole} in Denmark. Scenario: ${mission.scenarioPrompt}. User level: ${activeLevel}. Speak Danish.`,
      createdAt: new Date().toISOString(),
    };

    const conversation = await Conversation.create({
      userId,
      missionId,
      messages: [systemMessage],
      status: 'active',
    });

    res.status(201).json({ success: true, data: conversation.toJSON() });
  } catch (error) {
    console.error('Start conversation error:', error);
    res.status(500).json({ success: false, error: 'Failed to start conversation' });
  }
}

export async function sendMessage(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const conversationId = req.params.id;
    const { message: userMessage } = req.body;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      res.status(404).json({ success: false, error: 'Conversation not found' });
      return;
    }

    if (conversation.userId.toString() !== userId) {
      res.status(403).json({ success: false, error: 'Not authorized' });
      return;
    }

    if (conversation.status !== 'active') {
      res.status(400).json({ success: false, error: 'Conversation is already completed' });
      return;
    }

    const mission = await Mission.findById(conversation.missionId);
    if (!mission) {
      res.status(404).json({ success: false, error: 'Mission not found' });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    const activeLevel = getActiveLevel(user) || 'A1';

    // Add user message
    conversation.messages.push({
      role: 'user',
      content: userMessage,
      createdAt: new Date().toISOString(),
    });

    // Get AI response
    const provider = getAIProvider();
    const aiPrompt = buildConversationAIPrompt(
      userMessage,
      mission.npcName,
      mission.npcRole,
      mission.scenarioPrompt,
      activeLevel,
      conversation.messages.slice(-10) // Last 10 messages for context
    );

    let aiFeedback: AIFeedback;
    try {
      aiFeedback = await provider.generateJSON<AIFeedback>(aiPrompt);
    } catch {
      // Fallback response if AI fails
      aiFeedback = {
        npcReply: 'Hej! Det lyder godt. Fortæl mig mere.',
        corrections: [],
        feedback: 'Keep going!',
        score: 70,
        detectedMistakes: [],
        passed: true,
        passedReason: '',
      };
    }

    // Add AI reply to conversation
    conversation.messages.push({
      role: 'assistant',
      content: aiFeedback.npcReply,
      createdAt: new Date().toISOString(),
    });

    // Save conversation
    await conversation.save();

    // Create attempt record
    const attempt = await Attempt.create({
      userId,
      missionId: conversation.missionId,
      conversationId: conversation._id,
      userInput: userMessage,
      aiReply: aiFeedback.npcReply,
      corrections: aiFeedback.corrections || [],
      score: aiFeedback.score || 70,
      feedback: aiFeedback.feedback || '',
    });

    // Save mistakes
    const mistakesSource =
      aiFeedback.detectedMistakes && aiFeedback.detectedMistakes.length > 0
        ? aiFeedback.detectedMistakes
        : aiFeedback.corrections || [];
    const mistakes = mistakesSource.filter(
      (c) => c.original && c.original.trim().length > 0
    );

    if (mistakes.length > 0) {
      const mistakeDocs = mistakes.map((m) => ({
        userId,
        missionId: conversation.missionId,
        conversationId: conversation._id,
        originalText: m.original,
        correctedText: m.corrected,
        explanation: m.explanation,
        type: m.type || 'grammar',
        mastered: false,
      }));

      await Mistake.insertMany(mistakeDocs);

      // Update user weaknesses
      const mistakeTypes = [...new Set(mistakes.map((m) => m.type).filter(Boolean))] as string[];
      if (mistakeTypes.length > 0) {
        await User.findByIdAndUpdate(userId, {
          $addToSet: { weaknesses: { $each: mistakeTypes } },
        });
      }
    }

    let autoPromoted: CEFRLevel | null = null;

    // Check if conversation should end
    const isGoodbye =
      userMessage.toLowerCase().includes('farvel') ||
      userMessage.toLowerCase().includes('goodbye') ||
      userMessage.toLowerCase().includes('hej hej') ||
      aiFeedback.npcReply.toLowerCase().includes('farvel') ||
      aiFeedback.npcReply.toLowerCase().includes('goodbye');

    // Anti-cheat: require at least 3 user messages before "farvel" counts
    const userMsgCount = conversation.messages.filter((m) => m.role === 'user').length;
    if (isGoodbye && userMsgCount >= 3) {
      // AI quality gate: only complete if the user demonstrated sufficient Danish
      if (aiFeedback.passed) {
        conversation.status = 'completed';
        conversation.finalScore = aiFeedback.score || 70;
        await conversation.save();

        // Check if all missions at this level are done → promote
        autoPromoted = await checkAutoPromotion(userId);
      } else {
        // Not passed — keep conversation active, tell user what to improve
        const reason = aiFeedback.passedReason || 'prøv igen og øv dig mere';
        conversation.messages.push({
          role: 'assistant',
          content: `Du er ikke helt klar endnu. ${reason}. Prøv igen! (You're not quite ready yet. ${reason}. Try again!)`,
          createdAt: new Date().toISOString(),
        });
        await conversation.save();
        aiFeedback.npcReply = `Du er ikke helt klar endnu. ${reason}. Prøv igen! (You're not quite ready yet. ${reason}. Try again!)`;
      }
    } else if (isGoodbye && userMsgCount < 3) {
      // Tell the user they need to actually practice first
      conversation.messages.push({
        role: 'assistant',
        content: 'Du har ikke øvet dig nok endnu! Prøv at fortsætte samtalen. (You haven\'t practiced enough yet — please continue the conversation!)',
        createdAt: new Date().toISOString(),
      });
      await conversation.save();
      // Override the AI reply in the response
      aiFeedback.npcReply = 'Du har ikke øvet dig nok endnu! Prøv at fortsætte samtalen. (You haven\'t practiced enough yet — please continue the conversation!)';
    }

    res.json({
      success: true,
      data: {
        conversation: conversation.toJSON(),
        aiReply: aiFeedback.npcReply,
        corrections: aiFeedback.corrections || [],
        feedback: aiFeedback.feedback || '',
        score: aiFeedback.score || 70,
        conversationComplete: isGoodbye && userMsgCount >= 3 && aiFeedback.passed,
        autoPromoted,
        passed: aiFeedback.passed,
        passedReason: aiFeedback.passedReason,
      },
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ success: false, error: 'Failed to send message' });
  }
}

export async function getMyConversations(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const conversations = await Conversation.find({ userId })
      .sort({ updatedAt: -1 })
      .populate('missionId', 'title slug category level')
      .limit(50);

    res.json({ success: true, data: conversations });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch conversations' });
  }
}

export async function getConversation(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const conversation = await Conversation.findById(req.params.id).populate(
      'missionId',
      'title slug category level npcName npcRole'
    );

    if (!conversation) {
      res.status(404).json({ success: false, error: 'Conversation not found' });
      return;
    }

    if (conversation.userId.toString() !== userId) {
      res.status(403).json({ success: false, error: 'Not authorized' });
      return;
    }

    res.json({ success: true, data: conversation.toJSON() });
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch conversation' });
  }
}
