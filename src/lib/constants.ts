/**
 * Application-wide constants
 */

export const APP_NAME = 'Explain2Win';
export const APP_DESCRIPTION =
  'Learn by teaching - Explain topics by voice and get AI-generated quiz questions';

// Credit costs for different actions
export const CREDIT_COSTS = {
  TRANSCRIPTION_PER_MINUTE: 1,
  QUIZ_GENERATION: 5,
  RE_QUIZ: 2,
  ATTEMPT_COMPARISON: 1, // LLM-powered comparison between attempts
} as const;


// Subscription tier limits
export const TIER_LIMITS = {
  FREE: {
    monthlyCredits: 50,
    maxQuestionBank: 50,
    audioStorageDays: 7,
    studentTypes: ['CURIOUS'] as const,
  },
  PRO: {
    monthlyCredits: 500,
    maxQuestionBank: Infinity,
    audioStorageDays: 30,
    studentTypes: ['CURIOUS', 'EXAM_FOCUSED', 'CHALLENGING', 'BEGINNER'] as const,
  },
  PREMIUM: {
    monthlyCredits: Infinity,
    maxQuestionBank: Infinity,
    audioStorageDays: Infinity,
    studentTypes: ['CURIOUS', 'EXAM_FOCUSED', 'CHALLENGING', 'BEGINNER'] as const,
  },
} as const;

// Quiz configuration
export const QUIZ_CONFIG = {
  DEFAULT_QUESTION_COUNT: 5,
  MIN_QUESTION_COUNT: 3,
  MAX_QUESTION_COUNT: 10,
  QUESTION_TIME_LIMIT: 60, // seconds
} as const;

// Audio recording configuration
export const AUDIO_CONFIG = {
  SAMPLE_RATE: 16000,
  CHANNELS: 1,
  MIME_TYPE: 'audio/webm;codecs=opus',
  MAX_DURATION: 600, // 10 minutes in seconds
  MIN_DURATION: 10, // 10 seconds minimum
} as const;

// Student type descriptions for UI
export const STUDENT_TYPE_INFO = {
  CURIOUS: {
    name: 'Curious Student',
    description: 'Asks "why" and "how" questions to understand deeper concepts',
    emoji: '🤔',
    color: 'blue',
  },
  EXAM_FOCUSED: {
    name: 'Exam-Focused Student',
    description: 'Focuses on key definitions and testable concepts',
    emoji: '📝',
    color: 'purple',
  },
  CHALLENGING: {
    name: 'Challenging Student',
    description: 'Plays devil\'s advocate and explores edge cases',
    emoji: '😈',
    color: 'red',
  },
  BEGINNER: {
    name: 'Beginner Student',
    description: 'Asks basic questions to confirm fundamental understanding',
    emoji: '🌱',
    color: 'green',
  },
} as const;

// Routes
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard',
  EXPLAIN: '/explain',
  QUIZ: '/quiz',
  STUDY_SESSIONS: '/study-sessions',
  QUESTION_BANK: '/question-bank',
  PROGRESS: '/progress',
  BILLING: '/billing',
  SETTINGS: '/settings',
  PRICING: '/pricing',
} as const;

// API endpoints
export const API_ROUTES = {
  TRPC: '/api/trpc',
  AUTH: '/api/auth',
  UPLOAD: '/api/upload',
  WEBHOOKS: {
    STRIPE: '/api/webhooks/stripe',
  },
} as const;
