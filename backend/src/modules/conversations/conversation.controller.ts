import { Response } from 'express';
import type { AuthRequest } from '../../middleware/auth.js';
import Conversation from './conversation.model.js';
import Mission from '../missions/mission.model.js';
import Attempt from '../attempts/attempt.model.js';
import Mistake from '../mistakes/mistake.model.js';
import User from '../users/user.model.js';
import { getActiveLevel } from '../../types.js';
import { getAIProvider, buildConversationAIPrompt } from '../ai/ai.service.js';
import type { AIFeedback, CEFRLevel } from '../../types.js';
import { getLevelMissionsWithLock } from '../missions/mission.controller.js';

const NEXT_LEVEL: Record<string, CEFRLevel | null> = { A1: 'A2', A2: 'B1', B1: 'B2', B2: 'C1', C1: null };

async function checkAutoPromotion(userId: string): Promise<CEFRLevel | null> {
  const user = await User.findById(userId);
  if (!user) return null;
  const lang = user.activeLanguage || 'da';
  const currentLevel = getActiveLevel(user, lang);
  if (!currentLevel) return null;

  // Don't auto-promote if user manually chose a specific level
  const prog = user.progress?.[lang];
  if (prog?.selectedLevel && prog.selectedLevel !== currentLevel) return null;

  const nextLevel = NEXT_LEVEL[currentLevel];
  if (!nextLevel) return null;

  const levelMissions = await Mission.countDocuments({ level: currentLevel, language: lang });
  if (levelMissions === 0) return null;

  const missionIds = (await Mission.find({ level: currentLevel, language: lang }).select('_id')).map((m) => m._id);
  const completed = await Conversation.countDocuments({ userId, missionId: { $in: missionIds }, status: 'completed' });

  if (completed >= levelMissions) {
    await User.findByIdAndUpdate(userId, { [`progress.${lang}.selectedLevel`]: nextLevel });
    return nextLevel;
  }
  return null;
}

export async function startConversation(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const { missionId } = req.body;
    const mission = await Mission.findById(missionId);
    if (!mission) { res.status(404).json({ success: false, error: 'Mission not found' }); return; }
    const user = await User.findById(userId);
    if (!user) { res.status(404).json({ success: false, error: 'User not found' }); return; }
    const lang = user.activeLanguage || 'da';
    if (mission.language !== lang) { res.status(403).json({ success: false, error: `This mission is for ${mission.language}, not your active language ${lang}.` }); return; }

    const activeLevel = getActiveLevel(user, lang);
    if (mission.level !== activeLevel) { res.status(403).json({ success: false, error: `This mission is level ${mission.level}. Your current level is ${activeLevel}.` }); return; }

    const { missions } = await getLevelMissionsWithLock(userId, activeLevel, lang);
    const prog = missions.find((m) => m.id === missionId);
    if (prog?.locked) { res.status(403).json({ success: false, error: prog.lockedReason || 'Complete the previous mission first' }); return; }

    const existing = await Conversation.findOne({ userId, missionId, status: 'active' });
    if (existing) { res.json({ success: true, data: existing.toJSON() }); return; }

    const conversation = await Conversation.create({
      userId, missionId, language: lang,
      messages: [{ role: 'system' as const, content: `You are ${mission.npcName}, a ${mission.npcRole}. Scenario: ${mission.scenarioPrompt}. User level: ${activeLevel}. Language: Danish.`, createdAt: new Date().toISOString() }],
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
    if (!conversation) { res.json({ success: true, data: { reset: true, reason: 'Conversation was reset' } }); return; }
    if (conversation.userId.toString() !== userId) { res.status(403).json({ success: false, error: 'Not authorized' }); return; }
    if (conversation.status !== 'active') { res.status(400).json({ success: false, error: 'Conversation is already completed' }); return; }

    const mission = await Mission.findById(conversation.missionId);
    if (!mission) { res.status(404).json({ success: false, error: 'Mission not found' }); return; }
    const user = await User.findById(userId);
    if (!user) { res.status(404).json({ success: false, error: 'User not found' }); return; }

    const lang = conversation.language || 'da';
    const activeLevel = getActiveLevel(user, lang);

    conversation.messages.push({ role: 'user', content: userMessage, createdAt: new Date().toISOString() });

    const provider = getAIProvider();
    const aiPrompt = buildConversationAIPrompt(userMessage, mission.npcName, mission.npcRole, mission.scenarioPrompt, activeLevel, conversation.messages.slice(-10), lang);

    let aiFeedback: AIFeedback;
    try {
      aiFeedback = await provider.generateJSON<AIFeedback>(aiPrompt);
    } catch (err) {
      console.warn('AI provider failed, using fallback:', err instanceof Error ? err.message : 'unknown error');
      aiFeedback = {
        npcReply: 'Hej! Det lyder godt. Fortæl mig mere.',
        corrections: [], feedback: '', score: 50, detectedMistakes: [], passed: true, passedReason: '',
      };
    }

    conversation.messages.push({ role: 'assistant', content: aiFeedback.npcReply, createdAt: new Date().toISOString() });
    await conversation.save();

    await Attempt.create({
      userId, missionId: conversation.missionId, conversationId: conversation._id, language: lang,
      userInput: userMessage, aiReply: aiFeedback.npcReply,
      corrections: aiFeedback.corrections || [], score: aiFeedback.score || 70, feedback: aiFeedback.feedback || '',
    });

    const mistakesSource = aiFeedback.detectedMistakes?.length ? aiFeedback.detectedMistakes : (aiFeedback.corrections || []);
    const mistakesArr = mistakesSource.filter((c) => c.original?.trim());

    if (mistakesArr.length > 0) {
      await Mistake.insertMany(mistakesArr.map((m) => ({
        userId, missionId: conversation.missionId, conversationId: conversation._id, language: lang,
        originalText: m.original, correctedText: m.corrected, explanation: m.explanation, type: m.type || 'grammar', mastered: false,
      })));
      const types = [...new Set(mistakesArr.map((m) => m.type).filter(Boolean))] as string[];
      if (types.length) await User.findByIdAndUpdate(userId, { $addToSet: { [`progress.${lang}.weaknesses`]: { $each: types } } });
    }

    let autoPromoted: CEFRLevel | null = null;
    const isGoodbye = userMessage.toLowerCase().includes('farvel') ||
      aiFeedback.npcReply.toLowerCase().includes('farvel');

    const allUserMsgs = conversation.messages.filter((m) => m.role === 'user').map((m) => m.content.toLowerCase().trim());
    const meaningfulCount = allUserMsgs.filter((m) => {
      const wc = m.split(/\s+/).length;
      return !['hej', 'hej!', 'ja', 'nej', 'no', 'ok'].includes(m) && wc > 1;
    }).length;

    if (isGoodbye && meaningfulCount >= 5) {
      if (aiFeedback.passed) {
        conversation.status = 'completed'; conversation.finalScore = aiFeedback.score || 70; await conversation.save();
        autoPromoted = await checkAutoPromotion(userId);
        res.json({ success: true, data: { conversation: conversation.toJSON(), aiReply: aiFeedback.npcReply, corrections: aiFeedback.corrections || [], feedback: aiFeedback.feedback || '', score: aiFeedback.score || 70, conversationComplete: true, autoPromoted, passed: true } });
        return;
      } else {
        const failReason = aiFeedback.passedReason || 'prøv igen og øv dig mere';
        await Mistake.deleteMany({ conversationId: conversation._id }); await Attempt.deleteMany({ conversationId: conversation._id }); await Conversation.findByIdAndDelete(conversation._id);
        res.json({ success: true, data: { reset: true, reason: failReason } }); return;
      }
    } else if (isGoodbye && meaningfulCount < 5) {
      await Mistake.deleteMany({ conversationId: conversation._id }); await Attempt.deleteMany({ conversationId: conversation._id }); await Conversation.findByIdAndDelete(conversation._id);
      res.json({ success: true, data: { reset: true, reason: 'Du skrev for få beskeder. Skriv mindst 5 beskeder på dansk før du siger farvel.' } }); return;
    }

    res.json({ success: true, data: { conversation: conversation.toJSON(), aiReply: aiFeedback.npcReply, corrections: aiFeedback.corrections || [], feedback: aiFeedback.feedback || '', score: aiFeedback.score || 70, conversationComplete: false, autoPromoted: null, passed: true } });
  } catch (error) {
    if ((error as Error).name === 'ResetError') { res.json({ success: true, data: { reset: true, reason: (error as Error).message } }); return; }
    console.error('Send message error:', error);
    res.status(500).json({ success: false, error: 'Failed to send message' });
  }
}

export async function getMyConversations(req: AuthRequest, res: Response): Promise<void> {
  try {
    const user = await User.findById(req.userId);
    const lang = user?.activeLanguage || 'da';
    const conversations = await Conversation.find({ userId: req.userId, language: lang }).sort({ updatedAt: -1 }).populate('missionId', 'title slug category level').limit(50);
    res.json({ success: true, data: conversations });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch conversations' });
  }
}

export async function getConversation(req: AuthRequest, res: Response): Promise<void> {
  try {
    const conversation = await Conversation.findById(req.params.id).populate('missionId', 'title slug category level npcName npcRole');
    if (!conversation) { res.status(404).json({ success: false, error: 'Conversation not found' }); return; }
    if (conversation.userId.toString() !== req.userId) { res.status(403).json({ success: false, error: 'Not authorized' }); return; }
    res.json({ success: true, data: conversation.toJSON() });
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch conversation' });
  }
}
