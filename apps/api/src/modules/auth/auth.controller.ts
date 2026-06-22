import { Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../users/user.model.js';
import { env } from '../../config/env.js';
import type { AuthRequest } from '../../middleware/auth.js';

function generateToken(userId: string): string {
  return jwt.sign({ userId }, env.JWT_SECRET, { expiresIn: '7d' });
}

function setTokenCookie(res: Response, token: string): void {
  const isProduction = env.NODE_ENV === 'production';
  res.cookie('token', token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  });
}

export async function register(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { email, password, name } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      res.status(409).json({ success: false, error: 'Email already registered' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      email,
      passwordHash,
      name,
      activeLanguage: 'da',
      progress: {
        da: { selectedLevel: 'A1', strengths: [], weaknesses: [] },
        es: { selectedLevel: 'A1', strengths: [], weaknesses: [] },
      },
    });
    const token = generateToken(user._id.toString());
    setTokenCookie(res, token);

    res.status(201).json({
      success: true,
      data: user.toJSON(),
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, error: 'Registration failed' });
  }
}

export async function login(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user) {
      res.status(401).json({ success: false, error: 'Invalid email or password' });
      return;
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      res.status(401).json({ success: false, error: 'Invalid email or password' });
      return;
    }

    const token = generateToken(user._id.toString());
    setTokenCookie(res, token);

    res.json({
      success: true,
      data: user.toJSON(),
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Login failed' });
  }
}

export async function logout(_req: AuthRequest, res: Response): Promise<void> {
  res.clearCookie('token', { path: '/' });
  res.json({ success: true, data: { message: 'Logged out successfully' } });
}

export async function setLevel(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { level } = req.body;
    if (!['A1', 'A2', 'B1', 'B2', 'C1'].includes(level)) {
      res.status(400).json({ success: false, error: 'Invalid level' });
      return;
    }
    const user = await User.findById(req.userId);
    if (!user) { res.status(404).json({ success: false, error: 'User not found' }); return; }
    const lang = user.activeLanguage || 'da';
    await User.findByIdAndUpdate(req.userId, { [`progress.${lang}.selectedLevel`]: level });
    const updated = await User.findById(req.userId);
    res.json({ success: true, data: updated?.toJSON() });
  } catch (error) {
    console.error('Set level error:', error);
    res.status(500).json({ success: false, error: 'Failed to set level' });
  }
}

export async function switchLanguage(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { language } = req.body;
    if (!['da', 'es'].includes(language)) {
      res.status(400).json({ success: false, error: 'Invalid language' });
      return;
    }
    const user = await User.findById(req.userId);
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }
    // Initialize progress for this language if not exists
    if (!user.progress?.[language]) {
      user.progress = user.progress || {};
      user.progress[language] = { selectedLevel: 'A1', strengths: [], weaknesses: [] };
    }
    user.activeLanguage = language as 'da' | 'es';
    await user.save();
    res.json({ success: true, data: user.toJSON() });
  } catch (error) {
    console.error('Switch language error:', error);
    res.status(500).json({ success: false, error: 'Failed to switch language' });
  }
}

export async function getMe(req: AuthRequest, res: Response): Promise<void> {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }
    res.json({ success: true, data: user.toJSON() });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ success: false, error: 'Failed to get user' });
  }
}
