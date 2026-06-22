import { Response } from 'express';
import type { AuthRequest } from '../../middleware/auth.js';
import User from '../users/user.model.js';
import Mission from '../missions/mission.model.js';
import Conversation from '../conversations/conversation.model.js';
import Mistake from '../mistakes/mistake.model.js';
import Attempt from '../attempts/attempt.model.js';
import { getActiveLevel } from '@dls/shared';
import type { DashboardData, Mission as MissionType } from '@dls/shared';

export async function getDashboard(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    const activeLevel = getActiveLevel(user);

    // Completed missions count
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

    // Suggested mission - find missions at user's level they haven't completed
    let suggestedMission: MissionType | null = null;
    let suggestedMissionConversationId: string | undefined = undefined;
    if (activeLevel) {
      const completedMissionIds = (
        await Conversation.distinct('missionId', { userId, status: 'completed' })
      ).map((id) => id.toString());

      // Also exclude missions with active conversations — those show as "Continue"
      const activeMissionIds = (
        await Conversation.distinct('missionId', { userId, status: 'active' })
      ).map((id) => id.toString());

      const missionDoc = await Mission.findOne({
        level: activeLevel,
        _id: { $nin: [...completedMissionIds, ...activeMissionIds] },
      }).sort({ createdAt: 1 });

      if (missionDoc) {
        suggestedMission = missionDoc.toJSON() as unknown as MissionType;
      }

      // If there's an active conversation for a mission at this level, link to that instead
      if (activeMissionIds.length > 0) {
        const activeConv = await Conversation.findOne({
          userId,
          missionId: { $in: activeMissionIds },
          status: 'active',
        }).populate('missionId').sort({ updatedAt: -1 });

        if (activeConv && activeConv.missionId) {
          const popMission = activeConv.missionId as unknown as { toJSON: () => MissionType };
          suggestedMission = popMission.toJSON() as MissionType;
          suggestedMissionConversationId = activeConv._id.toString();
        }
      }
    }

    // Streak calculation (simplified: consecutive days with conversations)
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
      currentStreak,
      recentActivity,
    };

    res.json({ success: true, data: dashboard });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ success: false, error: 'Failed to load dashboard' });
  }
}
