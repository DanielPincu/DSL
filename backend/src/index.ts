import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { env, validateEnv } from './config/env.js';import { connectDB } from './config/db.js';
import { errorHandler } from './middleware/errorHandler.js';

// Routes
import authRoutes from './modules/auth/auth.routes.js';
import missionRoutes from './modules/missions/mission.routes.js';
import conversationRoutes from './modules/conversations/conversation.routes.js';
import attemptRoutes from './modules/attempts/attempt.routes.js';
import mistakeRoutes from './modules/mistakes/mistake.routes.js';
import dashboardRoutes from './modules/dashboard/dashboard.routes.js';

// Validate env before starting
validateEnv();

const app = express();

// Security
app.use(helmet());
app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  })
);

// Rate limiting — generous per-minute limits with JSON responses
function jsonRateLimiter(opts: { windowMs: number; max: number }) {
  return rateLimit({
    ...opts,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Too many requests, please slow down' },
  });
}
app.use('/api/auth', jsonRateLimiter({ windowMs: 60 * 1000, max: 40 }));
app.use('/api', jsonRateLimiter({ windowMs: 60 * 1000, max: 80 }));

// Body parsing
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());

// Logging
if (env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      database: 'checking',
      environment: env.NODE_ENV,
      version: '1.0.0',
    },
  });
});

// Test route
app.get('/api/test', (_req, res) => {
  res.json({ success: true, data: { message: 'OK' } });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/missions', missionRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/attempts', attemptRoutes);
app.use('/api/mistakes', mistakeRoutes);
app.use('/api/dashboard', dashboardRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// Error handler
app.use(errorHandler);

// Start server
async function start(): Promise<void> {
  await connectDB();
  app.listen(env.PORT, () => {
    console.log(`🚀 Danish Life Simulator API running on port ${env.PORT}`);
    console.log(`🌍 Environment: ${env.NODE_ENV}`);
    console.log(`🔗 Client URL: ${env.CLIENT_URL}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

export default app;
