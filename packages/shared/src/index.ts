// Enums & Constants
export const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2'] as const;
export type CEFRLevel = (typeof CEFR_LEVELS)[number];

export const LEARNING_TARGETS = ['daily_life', 'work', 'citizenship', 'exam'] as const;
export type LearningTarget = (typeof LEARNING_TARGETS)[number];

export const MISTAKE_TYPES = ['grammar', 'vocabulary', 'word_order', 'spelling', 'phrase'] as const;
export type MistakeType = (typeof MISTAKE_TYPES)[number];

export const MESSAGE_ROLES = ['system', 'user', 'assistant'] as const;
export type MessageRole = (typeof MESSAGE_ROLES)[number];

export const CONVERSATION_STATUSES = ['active', 'completed'] as const;
export type ConversationStatus = (typeof CONVERSATION_STATUSES)[number];

export const LEVEL_SOURCES = ['assessment', 'user_override'] as const;
export type LevelSource = (typeof LEVEL_SOURCES)[number];

export const MISSION_CATEGORIES = [
  'health',
  'housing',
  'shopping',
  'work',
  'social',
  'technology',
  'education',
  'government',
  'finance',
  'citizenship',
] as const;
export type MissionCategory = (typeof MISSION_CATEGORIES)[number];

// User
export interface User {
  id: string;
  email: string;
  name: string;
  estimatedLevel?: CEFRLevel;
  selectedLevel?: CEFRLevel;
  levelSource?: LevelSource;
  levelConfidence?: number;
  placementCompleted: boolean;
  target?: LearningTarget;
  strengths: string[];
  weaknesses: string[];
  createdAt: string;
  updatedAt: string;
}

export type ActiveLevel = CEFRLevel;

export function getActiveLevel(user: Pick<User, 'estimatedLevel' | 'selectedLevel'>): CEFRLevel | null {
  return user.selectedLevel ?? user.estimatedLevel ?? null;
}

// Placement
export interface PlacementResult {
  estimatedLevel: CEFRLevel;
  confidence: number;
  strengths: string[];
  weaknesses: string[];
  explanation: string;
}

export interface PlacementOverride {
  selectedLevel: CEFRLevel;
}

// Mission
export interface Mission {
  id: string;
  title: string;
  slug: string;
  category: MissionCategory;
  level: CEFRLevel;
  description: string;
  scenarioPrompt: string;
  npcName: string;
  npcRole: string;
  requiredPhrases: string[];
  createdAt: string;
  updatedAt: string;
}

export interface MissionWithProgress extends Mission {
  locked: boolean;
  lockedReason?: string;
}

// Conversation
export interface Message {
  role: MessageRole;
  content: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  userId: string;
  missionId: string;
  messages: Message[];
  status: ConversationStatus;
  finalScore?: number;
  createdAt: string;
  updatedAt: string;
}

// Attempt
export interface Correction {
  original: string;
  corrected: string;
  explanation: string;
  type: MistakeType;
}

export interface Attempt {
  id: string;
  userId: string;
  missionId: string;
  conversationId: string;
  userInput: string;
  aiReply: string;
  corrections: Correction[];
  score: number;
  feedback: string;
  createdAt: string;
}

// AI Feedback
export interface AIFeedback {
  npcReply: string;
  corrections: Correction[];
  feedback: string;
  score: number;
  detectedMistakes: Correction[];
}

// Mistake
export interface Mistake {
  id: string;
  userId: string;
  missionId: string;
  conversationId: string;
  originalText: string;
  correctedText: string;
  explanation: string;
  type: MistakeType;
  mastered: boolean;
  createdAt: string;
  updatedAt: string;
}

// API Response
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// Dashboard
export interface DashboardData {
  activeLevel: CEFRLevel | null;
  levelSource: LevelSource | null;
  confidence: number | null;
  placementCompleted: boolean;
  strengths: string[];
  weaknesses: string[];
  completedMissions: number;
  conversationsCount: number;
  savedMistakes: number;
  weakestCategories: { category: string; count: number }[];
  suggestedMission: Mission | null;
  suggestedMissionConversationId?: string;
  currentStreak: number;
  recentActivity: {
    type: 'conversation' | 'mistake' | 'mission_complete';
    description: string;
    date: string;
  }[];
}
