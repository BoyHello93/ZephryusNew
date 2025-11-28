

export interface Lesson {
  id: string;
  title: string;
  description: string;
  concept: string;
  instructions: string;
  initialCode: string;
  solutionCode: string; // Used for AI reference/hinting
  userCode?: string; // The code the user has written so far
  completed: boolean;
  steps?: LearnerStep[]; // For Learner Mode
}

export interface LearnerStep {
  code: string;
  explanation: string;
  context?: string; // The line of code coming immediately before this step
}

export interface Module {
  id: string;
  title: string;
  description: string;
  lessons: Lesson[];
}

export interface Course {
  id: string;
  title: string;
  description: string;
  finalOutcomeDescription: string; // Preview of what will be made
  visualDescription?: string; // Specific visual design details
  previewImage?: string; // Generated snapshot of the final project
  modules: Module[];
  lastAccessed?: number;
  createdAt: number;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string; // emoji or lucide icon name
  awardedAt: number;
}

export type Theme = 'zephyr' | 'sunset' | 'ocean' | 'forest' | 'crimson';
export type DetailLevel = 'concise' | 'balanced' | 'verbose';

export interface AppSettings {
  showTips: boolean;
  showInsertionHints: boolean;
  autoIndent: boolean;
  theme: Theme;
  learnerMode: boolean; // Interactive line-by-line mode
  detailLevel: DetailLevel; // How verbose instructions are
  allowSkipping: boolean;
}

export type ViewState = 'auth' | 'onboarding' | 'landing' | 'generating' | 'map' | 'workspace' | 'playground';
export type Difficulty = 'novice' | 'beginner' | 'intermediate' | 'advanced';
export type CourseLength = 'short' | 'medium' | 'long';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  isError?: boolean;
}

export interface CodeFile {
  name: string;
  language: 'html' | 'css' | 'javascript';
  content: string;
}

export interface User {
  id: string;
  email: string;
  username: string;
  skillLevel?: Difficulty;
  isOnboarded: boolean;
}
