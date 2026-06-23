import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../modules/users/user.model.js';
import { env } from '../config/env.js';

export interface AuthRequest extends Request {
  userId?: string;
  userEmail?: string;
}

export async function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = req.cookies?.token;

    if (!token) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const decoded = jwt.verify(token, env.JWT_SECRET) as { userId: string };
    const user = await User.findById(decoded.userId).select('_id email');

    if (!user) {
      res.status(401).json({ success: false, error: 'User not found' });
      return;
    }

    req.userId = user._id.toString();
    req.userEmail = user.email;
    next();
  } catch (error) {
    res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
}
