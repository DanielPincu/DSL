import { Response } from 'express';
import type { AuthRequest } from '../../middleware/auth.js';
import Conversation from './conversation.model.js';
import Mission from '../missions/mission.model.js';
import Attempt from '../attempts/attempt.model.js';
import Mistake from '../mistakes/mistake.model.js';
import User from '../users/user.model.js';
import { getActiveLevel } from '@dls/shared';
import { getAIProvider, buildConversationAIPrompt } from '../ai/ai.service.js';
import type { AIFeedback } from '@dls/shared';
import mongoose from 'mongoose';

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
    // Check length > 0 because [] is truthy in JS!
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

    // Check if conversation should end
    const isGoodbye =
      userMessage.toLowerCase().includes('farvel') ||
      userMessage.toLowerCase().includes('goodbye') ||
      userMessage.toLowerCase().includes('hej hej') ||
      aiFeedback.npcReply.toLowerCase().includes('farvel') ||
      aiFeedback.npcReply.toLowerCase().includes('goodbye');

    if (isGoodbye) {
      conversation.status = 'completed';
      conversation.finalScore = aiFeedback.score || 70;
      await conversation.save();
    }

    res.json({
      success: true,
      data: {
        conversation: conversation.toJSON(),
        aiReply: aiFeedback.npcReply,
        corrections: aiFeedback.corrections || [],
        feedback: aiFeedback.feedback || '',
        score: aiFeedback.score || 70,
        conversationComplete: isGoodbye,
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
