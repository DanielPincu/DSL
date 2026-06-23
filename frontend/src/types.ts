// Enums & Constants
export const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'] as const;
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
  'health', 'housing', 'shopping', 'work', 'social',
  'technology', 'education', 'government', 'finance', 'citizenship',
] as const;
export type MissionCategory = (typeof MISSION_CATEGORIES)[number];

// Add new language codes here to extend (e.g., ['da', 'de', 'fr'])
export const LANGUAGES = ['da'] as const;
export type Language = (typeof LANGUAGES)[number];

// Add entries here when adding a new language
export const LANGUAGE_LABELS: Record<Language, string> = {
  da: 'Dansk',
};

export const LANGUAGE_FLAGS: Record<Language, string> = {
  da: '🇩🇰',
};

// User — per-language progress
export interface LanguageProgress {
  selectedLevel?: CEFRLevel;
  strengths: string[];
  weaknesses: string[];
}

export interface User {
  id: string;
  email: string;
  name: string;
  activeLanguage: Language;
  progress: Record<string, LanguageProgress>;
  createdAt: string;
  updatedAt: string;
}

export function getActiveLevel(user: Pick<User, 'progress'> | null, language: Language): CEFRLevel {
  if (!user?.progress?.[language]?.selectedLevel) return 'A1';
  return user.progress[language].selectedLevel!;
}

export function getLanguageProgress(user: Pick<User, 'progress'> | null, language: Language): LanguageProgress {
  const defaultProgress: LanguageProgress = { strengths: [], weaknesses: [] };
  if (!user?.progress?.[language]) return defaultProgress;
  return { ...defaultProgress, ...user.progress[language] };
}

// Mission
export interface MissionVocab {
  danish: string;
  english: string;
}

export interface Mission {
  id: string;
  title: string;
  slug: string;
  category: MissionCategory;
  language: Language;
  level: CEFRLevel;
  order: number;
  description: string;
  scenarioPrompt: string;
  npcName: string;
  npcRole: string;
  requiredPhrases: string[];
  vocabulary: MissionVocab[];
  createdAt: string;
  updatedAt: string;
}

export interface MissionLevelProgress {
  level: CEFRLevel;
  total: number;
  completed: number;
  allDone: boolean;
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
  language: Language;
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
  language: Language;
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
  passed: boolean;
  passedReason?: string;
}

// Mistake
export interface Mistake {
  id: string;
  userId: string;
  missionId: string;
  conversationId: string;
  language: Language;
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
  activeLevel: CEFRLevel;
  levelSource: LevelSource | null;
  strengths: string[];
  weaknesses: string[];
  completedMissions: number;
  conversationsCount: number;
  savedMistakes: number;
  weakestCategories: { category: string; count: number }[];
  suggestedMission: Mission | null;
  suggestedMissionConversationId?: string;
  levelProgress: MissionLevelProgress | null;
  currentStreak: number;
  recentActivity: {
    type: 'conversation' | 'mistake' | 'mission_complete';
    description: string;
    date: string;
  }[];
  activeLanguage: Language;
  availableLanguages: Language[];
}
