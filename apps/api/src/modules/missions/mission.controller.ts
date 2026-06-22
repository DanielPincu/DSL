import { Request, Response } from 'express';
import Mission from './mission.model.js';
import Conversation from '../conversations/conversation.model.js';
import type { AuthRequest } from '../../middleware/auth.js';
import type { MissionLevelProgress, CEFRLevel } from '@dls/shared';
import User from '../users/user.model.js';
import { getActiveLevel } from '@dls/shared';
import mongoose from 'mongoose';

const CEFR_ORDER: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1'];

interface MissionWithLock {
  id: string;
  title: string;
  slug: string;
  category: string;
  level: string;
  order: number;
  description: string;
  scenarioPrompt: string;
  npcName: string;
  npcRole: string;
  requiredPhrases: string[];
  locked: boolean;
  lockedReason?: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Get strict linear progression within a level.
 * Returns locked status for each mission.
 * Mission #1 is always unlocked. Complete #1 to unlock #2, etc.
 */
export async function getLevelMissionsWithLock(
  userId: string,
  level: CEFRLevel
): Promise<{ missions: MissionWithLock[]; progress: MissionLevelProgress }> {
  const docs = await Mission.find({ level }).sort({ order: 1 });

  const completedIds = (
    await Conversation.distinct('missionId', { userId, status: 'completed' })
  ).map((id) => id.toString());

  // Find the first uncompleted mission
  let firstUncompletedIndex = docs.length; // all completed
  for (let i = 0; i < docs.length; i++) {
    if (!completedIds.includes(docs[i]._id.toString())) {
      firstUncompletedIndex = i;
      break;
    }
  }

  const missions: MissionWithLock[] = docs.map((m, i) => {
    const json = m.toJSON() as Record<string, unknown>;
    const isCompleted = completedIds.includes(m._id.toString());
    const isLocked = i > firstUncompletedIndex; // missions after the current one are locked

    return {
      ...json,
      id: json.id as string,
      locked: isLocked,
      lockedReason: isLocked
        ? `Complete "${docs[firstUncompletedIndex]?.title || 'previous mission'}" first`
        : undefined,
      completed: isCompleted,
    } as MissionWithLock;
  });

  const totalMissions = docs.length;
  const completedInLevel = missions.filter((m) => m.completed).length;

  const progress: MissionLevelProgress = {
    level,
    total: totalMissions,
    completed: completedInLevel,
    allDone: totalMissions > 0 && completedInLevel >= totalMissions,
  };

  return { missions, progress };
}

export async function getAllMissions(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    const activeLevel = getActiveLevel(user) || 'A1';
    const { missions, progress } = await getLevelMissionsWithLock(userId, activeLevel);

    res.json({
      success: true,
      data: { missions, progress },
    });
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

    const activeLevel = getActiveLevel(user) || 'A1';

    if (mission.level !== activeLevel) {
      res.status(403).json({
        success: false,
        error: `This mission is level ${mission.level}. Your current level is ${activeLevel}.`,
      });
      return;
    }

    // Check if locked within the level
    const { missions } = await getLevelMissionsWithLock(userId, activeLevel);
    const prog = missions.find((m) => m.slug === req.params.slug);

    const data = mission.toJSON() as Record<string, unknown>;
    res.json({
      success: true,
      data: {
        ...data,
        id: data.id as string,
        locked: prog?.locked ?? false,
        lockedReason: prog?.lockedReason,
        completed: prog?.completed ?? false,
      },
    });
  } catch (error) {
    console.error('Get mission error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch mission' });
  }
}
