import { Request, Response } from 'express';
import Mission from './mission.model.js';

export async function getAllMissions(_req: Request, res: Response): Promise<void> {
  try {
    const missions = await Mission.find().sort({ level: 1, category: 1 });
    res.json({ success: true, data: missions });
  } catch (error) {
    console.error('Get missions error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch missions' });
  }
}

export async function getMissionBySlug(req: Request, res: Response): Promise<void> {
  try {
    const mission = await Mission.findOne({ slug: req.params.slug });
    if (!mission) {
      res.status(404).json({ success: false, error: 'Mission not found' });
      return;
    }
    res.json({ success: true, data: mission });
  } catch (error) {
    console.error('Get mission error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch mission' });
  }
}
