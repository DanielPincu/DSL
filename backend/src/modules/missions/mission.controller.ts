import { Request, Response } from 'express';
import Mission from './mission.model.js';
import Conversation from '../conversations/conversation.model.js';
import type { AuthRequest } from '../../middleware/auth.js';
import type { MissionLevelProgress, CEFRLevel, Language } from '../../types.js';
import User from '../users/user.model.js';
import { getActiveLevel } from '../../types.js';

const CEFR_ORDER: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1'];

interface MissionWithLock {
  id: string; title: string; slug: string; category: string; language: string;
  level: string; order: number; description: string; scenarioPrompt: string;
  npcName: string; npcRole: string; requiredPhrases: string[];
  locked: boolean; lockedReason?: string; completed: boolean; createdAt: string; updatedAt: string;
}

export async function getLevelMissionsWithLock(
  userId: string,
  level: CEFRLevel,
  language: Language
): Promise<{ missions: MissionWithLock[]; progress: MissionLevelProgress }> {
  const docs = await Mission.find({ level, language }).sort({ order: 1 });
  const completedIds = (
    await Conversation.distinct('missionId', { userId, status: 'completed' })
  ).map((id) => id.toString());

  let firstUncompletedIndex = docs.length;
  for (let i = 0; i < docs.length; i++) {
    if (!completedIds.includes(docs[i]._id.toString())) {
      firstUncompletedIndex = i;
      break;
    }
  }

  const missions: MissionWithLock[] = docs.map((m, i) => {
    const json = m.toJSON() as Record<string, unknown>;
    const isCompleted = completedIds.includes(m._id.toString());
    const isLocked = i > firstUncompletedIndex;
    return {
      ...json, id: json.id as string,
      locked: isLocked,
      lockedReason: isLocked ? `Complete "${docs[firstUncompletedIndex]?.title || 'previous mission'}" first` : undefined,
      completed: isCompleted,
    } as MissionWithLock;
  });

  const completedInLevel = missions.filter((m) => m.completed).length;
  return {
    missions,
    progress: { level, total: docs.length, completed: completedInLevel, allDone: docs.length > 0 && completedInLevel >= docs.length },
  };
}

export async function getAllMissions(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }
    const lang = user.activeLanguage || 'da';
    const activeLevel = getActiveLevel(user, lang) || 'A1';
    const { missions, progress } = await getLevelMissionsWithLock(userId, activeLevel, lang);
    res.json({ success: true, data: { missions, progress } });
  } catch (error) {
    console.error('Get missions error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch missions' });
  }
}

export async function getMissionBySlug(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const mission = await Mission.findOne({ slug: req.params.slug });
    if (!mission) {
      res.status(404).json({ success: false, error: 'Mission not found' });
      return;
    }
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }
    const lang = user.activeLanguage || 'da';
    const activeLevel = getActiveLevel(user, lang) || 'A1';

    if (mission.level !== activeLevel || mission.language !== lang) {
      res.status(403).json({
        success: false,
        error: `This mission is not available for your current language/level.`,
      });
      return;
    }

    const { missions } = await getLevelMissionsWithLock(userId, activeLevel, lang);
    const prog = missions.find((m) => m.slug === req.params.slug);
    const data = mission.toJSON() as Record<string, unknown>;
    res.json({
      success: true,
      data: { ...data, id: data.id as string, locked: prog?.locked ?? false, lockedReason: prog?.lockedReason, completed: prog?.completed ?? false },
    });
  } catch (error) {
    console.error('Get mission error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch mission' });
  }
}
