import { Response } from 'express';
import type { AuthRequest } from '../../middleware/auth.js';
import User from '../users/user.model.js';
import Mission from '../missions/mission.model.js';
import Conversation from '../conversations/conversation.model.js';
import Mistake from '../mistakes/mistake.model.js';
import Attempt from '../attempts/attempt.model.js';
import { getActiveLevel } from '@dls/shared';
import type { DashboardData, Mission as MissionType, MissionLevelProgress } from '@dls/shared';

export async function getDashboard(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    const activeLevel = getActiveLevel(user);

    // Completed missions count (overall)
    const completedConversations = await Conversation.countDocuments({
      userId,
      status: 'completed',
    });
    const totalConversations = await Conversation.countDocuments({ userId });

    // Mistakes
    const savedMistakes = await Mistake.countDocuments({ userId });
    const mistakesByType = await Mistake.aggregate([
      { $match: { userId: user._id, mastered: false } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    const weakestCategories = mistakesByType.map((m) => ({
      category: m._id,
      count: m.count,
    }));

    // Level progress & suggested mission
    let suggestedMission: MissionType | null = null;
    let suggestedMissionConversationId: string | undefined = undefined;
    let levelProgress: MissionLevelProgress | null = null;

    if (activeLevel) {
      const levelMissions = await Mission.find({ level: activeLevel }).sort({ order: 1 });
      const completedIds = (
        await Conversation.distinct('missionId', { userId, status: 'completed' })
      ).map((id) => id.toString());

      const completedInLevel = levelMissions.filter((m) =>
        completedIds.includes(m._id.toString())
      ).length;

      levelProgress = {
        level: activeLevel,
        total: levelMissions.length,
        completed: completedInLevel,
        allDone: levelMissions.length > 0 && completedInLevel >= levelMissions.length,
      };

      // Find next uncompleted mission (prefer active conversations)
      const activeConv = await Conversation.findOne({
        userId,
        missionId: { $in: levelMissions.map((m) => m._id) },
        status: 'active',
      }).populate('missionId').sort({ updatedAt: -1 });

      if (activeConv && activeConv.missionId) {
        const popMission = activeConv.missionId as unknown as { toJSON: () => MissionType };
        suggestedMission = popMission.toJSON() as MissionType;
        suggestedMissionConversationId = activeConv._id.toString();
      } else {
        // Find first uncompleted mission by order
        const nextMission = levelMissions.find(
          (m) => !completedIds.includes(m._id.toString())
        );
        if (nextMission) {
          suggestedMission = nextMission.toJSON() as unknown as MissionType;
        } else if (levelProgress.allDone) {
          // All done — suggest the last mission so they can still review
          suggestedMission = levelMissions[levelMissions.length - 1]?.toJSON() as unknown as MissionType;
        }
      }
    }

    // Streak calculation
    const recentConversations = await Conversation.find({ userId })
      .sort({ createdAt: -1 })
      .limit(30);
    let currentStreak = 0;
    if (recentConversations.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      for (let i = 0; i < recentConversations.length; i++) {
        const convDate = new Date(recentConversations[i].createdAt);
        convDate.setHours(0, 0, 0, 0);
        const diffDays = Math.floor(
          (today.getTime() - convDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (diffDays === i) {
          currentStreak++;
        } else if (diffDays > i) {
          break;
        }
      }
    }

    // Recent activity
    const recentAttempts = await Attempt.find({ userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('missionId', 'title');

    const recentActivity = recentAttempts.map((a) => ({
      type: 'conversation' as const,
      description: `Practiced: ${(a as unknown as { missionId: { title: string } }).missionId?.title || 'Unknown mission'}`,
      date: a.createdAt.toISOString(),
    }));

    const dashboard: DashboardData = {
      activeLevel,
      levelSource: user.levelSource || null,
      confidence: user.levelConfidence ?? null,
      placementCompleted: user.placementCompleted,
      strengths: user.strengths,
      weaknesses: user.weaknesses,
      completedMissions: completedConversations,
      conversationsCount: totalConversations,
      savedMistakes,
      weakestCategories,
      suggestedMission,
      suggestedMissionConversationId,
      levelProgress,
      currentStreak,
      recentActivity,
    };

    res.json({ success: true, data: dashboard });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ success: false, error: 'Failed to load dashboard' });
  }
}
