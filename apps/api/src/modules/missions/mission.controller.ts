import { Request, Response } from 'express';
import Mission from './mission.model.js';
import Conversation from '../conversations/conversation.model.js';
import type { AuthRequest } from '../../middleware/auth.js';
import type { MissionWithProgress, CEFRLevel } from '@dls/shared';

const LEVEL_ORDER: Record<CEFRLevel, number> = { A1: 0, A2: 1, B1: 2, B2: 3 };

/**
 * Determine which missions are unlocked for a user.
 * Missions are ordered by level (A1 → A2 → B1 → B2) then by creation date.
 * A mission is unlocked when all missions before it are completed.
 */
async function getMissionProgress(userId: string): Promise<(MissionWithProgress)[]> {
  const missions = await Mission.find().sort({ level: 1, createdAt: 1 });

  // Get completed mission IDs for this user
  const completedIds = (
    await Conversation.distinct('missionId', { userId, status: 'completed' })
  ).map((id) => id.toString());

  // Sort missions by level order then creation date
  const sorted = missions.sort((a, b) => {
    const levelDiff = LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level];
    if (levelDiff !== 0) return levelDiff;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });

  // Find how many consecutive missions from the start are completed
  let completedCount = 0;
  for (const m of sorted) {
    if (completedIds.includes(m._id.toString())) {
      completedCount++;
    } else {
      break;
    }
  }

  return sorted.map((m, i) => {
    const json = m.toJSON() as unknown as MissionWithProgress;
    const isCompleted = completedIds.includes(m._id.toString());

    if (isCompleted) {
      json.locked = false;
    } else if (i <= completedCount) {
      // First N consecutive completed, next one is unlocked
      json.locked = false;
    } else {
      json.locked = true;
      json.lockedReason = `Complete "${sorted[i - 1].title}" first`;
    }

    return json;
  });
}

export async function getAllMissions(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const missions = await getMissionProgress(userId);
    res.json({ success: true, data: missions });
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

    // Check if mission is unlocked
    const progression = await getMissionProgress(userId);
    const prog = progression.find((m) => m.slug === req.params.slug);
    const isLocked = prog?.locked ?? false;

    const data = mission.toJSON();
    res.json({
      success: true,
      data: { ...data, locked: isLocked, lockedReason: prog?.lockedReason },
    });
  } catch (error) {
    console.error('Get mission error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch mission' });
  }
}
