import { Response } from 'express';
import type { AuthRequest } from '../../middleware/auth.js';
import Mission from '../missions/mission.model.js';
import User from '../users/user.model.js';

export async function getAllVocabulary(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const { level, category } = req.query;

    const filter: Record<string, unknown> = {};
    if (level && typeof level === 'string') filter.level = level;
    if (category && typeof category === 'string') filter.category = category;

    const missions = await Mission.find(filter)
      .select('title slug level category vocabulary')
      .sort({ level: 1, order: 1 });

    const user = await User.findById(userId);
    const learnedSet = new Set(user?.learnedVocab || []);

    const words: Record<string, unknown>[] = [];
    for (const mission of missions) {
      const json = mission.toJSON() as Record<string, unknown>;
      const vocab = (json.vocabulary as { danish: string; english: string }[]) || [];
      vocab.forEach((v, i) => {
        const id = `${json.slug}:${i}`;
        words.push({
          id,
          danish: v.danish,
          english: v.english,
          level: json.level,
          category: json.category,
          missionSlug: json.slug,
          missionTitle: json.title,
          learned: learnedSet.has(id),
        });
      });
    }

    res.json({ success: true, data: { words } });
  } catch (error) {
    console.error('Get vocabulary error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch vocabulary' });
  }
}

export async function toggleLearned(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { wordId, learned } = req.body;
    if (!wordId || typeof learned !== 'boolean') {
      res.status(400).json({ success: false, error: 'wordId and learned are required' });
      return;
    }

    const user = await User.findById(req.userId);
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    if (learned) {
      if (!user.learnedVocab.includes(wordId)) {
        user.learnedVocab.push(wordId);
      }
    } else {
      user.learnedVocab = user.learnedVocab.filter((w) => w !== wordId);
    }

    await user.save();
    res.json({ success: true, data: { learnedVocab: user.learnedVocab } });
  } catch (error) {
    console.error('Toggle learned error:', error);
    res.status(500).json({ success: false, error: 'Failed to update vocabulary' });
  }
}
