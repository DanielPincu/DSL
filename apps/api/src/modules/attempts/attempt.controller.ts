import { Response } from 'express';
import type { AuthRequest } from '../../middleware/auth.js';
import Attempt from './attempt.model.js';

export async function getMyAttempts(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const attempts = await Attempt.find({ userId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('missionId', 'title slug category level');

    const total = await Attempt.countDocuments({ userId });

    res.json({
      success: true,
      data: {
        attempts,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Get attempts error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch attempts' });
  }
}
