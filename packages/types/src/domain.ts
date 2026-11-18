import type { Enums, Json, Tables } from './database';

// ── Enums ──────────────────────────────────────────────────────
export type UserRole = Enums<'user_role'>;
export type OrgRole = Enums<'org_role'>;
export type OrgTier = Enums<'org_tier'>;
export type CourseLevel = Enums<'course_level'>;

export type QuestionType = 'MCQ' | 'SHORT_ANSWER' | 'LONG_ANSWER' | 'TRUE_FALSE';
export type ResultStatus = 'IN_PROGRESS' | 'SUBMITTED' | 'GRADED' | 'FLAGGED';

// ── Structural Theming Engine Types ────────────────────────────
export type ThemeLayout = 'floating' | 'solid';
export type ThemeAnimationIntensity = 'high' | 'minimal';
export type ThemeBorderRadius = 'rounded-3xl' | 'rounded-xl' | 'rounded-md' | 'rounded-sm';
export type ThemePresetKey = 'default' | 'gamified' | 'enterprise' | 'superAdmin';

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  surface: string;
  muted: string;
}

export interface ThemeFonts {
  main: string;
  display: string;
}

export interface ThemeConfig {
  colors: ThemeColors;
  fonts: ThemeFonts;
  layout: ThemeLayout;
  animationIntensity: ThemeAnimationIntensity;
  borderRadius: ThemeBorderRadius;
  mode?: 'light' | 'dark';
}

// ── Core Domain Interfaces (mapped to Supabase tables) ─────────
export interface Organization extends Omit<Tables<'organizations'>, 'theme_config'> {
  theme_config: ThemeConfig;
}

export interface UserProfile extends Omit<Tables<'users'>, 'grading_blessings'> {
  grading_blessings: string[];
}

export type OrgUser = Tables<'org_users'>;

export type Course = Tables<'courses'>;

export interface CourseNode extends Course {
  children: CourseNode[];
}

export interface TestBlock {
  id: string;
  type: 'heading' | 'instructions' | 'mcq' | 'short_answer' | 'long_answer' | 'true_false';
  content: string;
  options?: string[];
  correctAnswer?: string;
  marks?: number;
  topic?: string;
}

export interface Test extends Omit<Tables<'tests'>, 'blocks'> {
  blocks: TestBlock[];
}

export interface TestAnswerKey extends Omit<Tables<'test_answer_keys'>, 'question_type' | 'options'> {
  question_type: QuestionType;
  options: string[];
}

export interface QuestionBreakdownItem {
  questionNumber: number;
  topic: string;
  questionText: string;
  studentAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  marksAwarded: number;
  maxMarks: number;
  explanation?: string;
}

export interface AntiCheatEvent {
  type: 'TAB_SWITCH' | 'WINDOW_BLUR' | 'FULLSCREEN_EXIT' | 'CONTEXT_MENU' | 'COPY_ATTEMPT' | 'DEVTOOLS_ATTEMPT';
  timestamp: string;
  details?: string;
}

export interface StudentResult
  extends Omit<
    Tables<'student_results'>,
    'answers' | 'question_breakdown' | 'anti_cheat_logs' | 'status'
  > {
  answers: Record<string, string>;
  question_breakdown: QuestionBreakdownItem[];
  anti_cheat_logs: AntiCheatEvent[];
  status: ResultStatus;
}

export interface LeaderboardEntry {
  student_id: string;
  full_name: string;
  avatar_url: string | null;
  tests_completed: number;
  avg_percentage: number;
  total_score: number;
  rank: number;
}

export type { Json };
