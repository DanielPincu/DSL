import { Response } from 'express';
import type { AuthRequest } from '../../middleware/auth.js';
import User from '../users/user.model.js';
import Mistake from './mistake.model.js';

export async function getMyMistakes(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const user = await User.findById(userId);
    const lang = user?.activeLanguage || 'da';
    const { type, mastered, page, limit } = req.query;

    const filter: Record<string, unknown> = { userId, language: lang };

    if (type && typeof type === 'string') {
      filter.type = type;
    }
    if (mastered !== undefined) {
      filter.mastered = mastered === 'true';
    }

    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 50;

    const mistakes = await Mistake.find(filter)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .populate('missionId', 'title slug');

    const total = await Mistake.countDocuments(filter);

    res.json({
      success: true,
      data: {
        mistakes,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    console.error('Get mistakes error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch mistakes' });
  }
}

export async function markMastered(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const mistake = await Mistake.findById(req.params.id);

    if (!mistake) {
      res.status(404).json({ success: false, error: 'Mistake not found' });
      return;
    }

    if (mistake.userId.toString() !== userId) {
      res.status(403).json({ success: false, error: 'Not authorized' });
      return;
    }

    mistake.mastered = !mistake.mastered;
    await mistake.save();

    res.json({ success: true, data: mistake.toJSON() });
  } catch (error) {
    console.error('Mark mastered error:', error);
    res.status(500).json({ success: false, error: 'Failed to update mistake' });
  }
}
