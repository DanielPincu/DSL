import { Request, Response } from 'express';
import Mission from './mission.model.js';
import Conversation from '../conversations/conversation.model.js';
import type { AuthRequest } from '../../middleware/auth.js';
import type { MissionLevelProgress, CEFRLevel } from '@dls/shared';
import User from '../users/user.model.js';
import { getActiveLevel } from '@dls/shared';

const CEFR_ORDER: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2'];

/**
 * Get the level the user should be working on.
 * Returns missions ONLY at the user's active level, sorted by difficulty (order).
 */
export async function getAllMissions(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    const activeLevel = getActiveLevel(user) || 'A1';

    // Get all missions at the user's level, sorted by order (progressive difficulty)
    const missions = await Mission.find({ level: activeLevel }).sort({ order: 1 });

    // Calculate progress for the current level
    const totalMissions = missions.length;
    const completedIds = (
      await Conversation.distinct('missionId', { userId, status: 'completed' })
    ).map((id) => id.toString());

    const completedInLevel = missions.filter((m) =>
      completedIds.includes(m._id.toString())
    ).length;

    const levelProgress: MissionLevelProgress = {
      level: activeLevel,
      total: totalMissions,
      completed: completedInLevel,
      allDone: totalMissions > 0 && completedInLevel >= totalMissions,
    };

    res.json({
      success: true,
      data: {
        missions,
        progress: levelProgress,
      },
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

    // Only allow viewing missions at the user's level
    if (mission.level !== activeLevel) {
      res.status(403).json({
        success: false,
        error: `This mission is level ${mission.level}. Your current level is ${activeLevel}. Complete all missions at your level first.`,
      });
      return;
    }

    res.json({ success: true, data: mission.toJSON() });
  } catch (error) {
    console.error('Get mission error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch mission' });
  }
}
