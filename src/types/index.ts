/**
 * Type Definitions
 *
 * Shared types used across the application
 */
import type {
  User,
  Explanation,
  Question,
  QuizSession,
  QuizAnswer,
  StudySession,
  UserProgress,
  UserPreferences,
  Subscription,
  Credits,
  CreditUsage,
  QuestionType,
  Difficulty,
  StudentType,
  SubscriptionTier,
  SubscriptionStatus,
  UsageType,
} from '@prisma/client';

// Re-export Prisma types
export type {
  User,
  Explanation,
  Question,
  QuizSession,
  QuizAnswer,
  StudySession,
  UserProgress,
  UserPreferences,
  Subscription,
  Credits,
  CreditUsage,
  QuestionType,
  Difficulty,
  StudentType,
  SubscriptionTier,
  SubscriptionStatus,
  UsageType,
};

// Extended types with relations
export type UserWithRelations = User & {
  progress: UserProgress | null;
  preferences: UserPreferences | null;
  subscription: Subscription | null;
  credits: Credits | null;
};

export type ExplanationWithRelations = Explanation & {
  questions: Question[];
  quizSession?: QuizSession | null;
  studySession?: StudySession | null;
  _count?: {
    questions: number;
  };
};

export type QuizSessionWithRelations = QuizSession & {
  explanation: Explanation;
  answers: (QuizAnswer & { question: Question })[];
};

// Form types
export interface ExplanationFormData {
  topic: string;
  audioBlob: Blob | null;
}

export interface QuizGenerationOptions {
  explanationId: string;
  studentType: StudentType;
  questionCount: number;
}

export interface QuizAnswerSubmission {
  quizSessionId: string;
  questionId: string;
  userAnswer: string;
  timeTaken: number;
}

// UI State types
export interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  audioBlob: Blob | null;
}

export interface QuizState {
  currentQuestionIndex: number;
  answers: Record<string, string>;
  startTime: number;
  isComplete: boolean;
}

// API Response types
export interface TranscriptionResult {
  text: string;
  duration: number;
  confidence?: number;
}

export interface QuizGenerationResult {
  quizSession: QuizSession;
  questions: Question[];
}

export interface AnswerResult {
  isCorrect: boolean;
  correctAnswer: string;
  explanation: string | null;
}

// Activity types for progress tracking
export interface DailyActivity {
  date: string;
  explanations: number;
  quizzes: number;
  avgScore: number;
}

export interface TopicPerformance {
  id: string;
  topic: string;
  attemptCount: number;
  avgScore: number;
  lastAttempt: number | null;
}

// Billing types
export interface PaymentHistory {
  id: string;
  amount: number;
  currency: string;
  status: string | null;
  date: Date;
  pdfUrl: string | null;
}

export interface PricingPlan {
  id: SubscriptionTier;
  name: string;
  price: number;
  credits: number | 'Unlimited';
  features: string[];
  highlighted?: boolean;
}
