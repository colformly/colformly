import type { Enums, Json, Tables } from './database';

// ── Enums ──────────────────────────────────────────────────────
export type UserRole = Enums<'user_role'>;
export type OrgRole = Enums<'org_role'>;
export type OrgTier = Enums<'org_tier'>;
export type CourseLevel = Enums<'course_level'>;

export type QuestionType = 'MCQ' | 'SHORT_ANSWER' | 'LONG_ANSWER' | 'TRUE_FALSE';
export type ResultStatus = 'IN_PROGRESS' | 'SUBMITTED' | 'GRADED' | 'FLAGGED';

export type OrgType = 'COLLEGE' | 'UNIVERSITY' | 'COACHING' | 'SCHOOL';
export type OnboardingStatus = 'SETUP_MODE' | 'HANDED_OVER' | 'SUSPENDED';
export type AuthPolicy = 'HYBRID' | 'GOOGLE_ONLY';

export interface FeatureFlags {
  ai_generator: boolean;
  byoc_explainer: boolean;
  strict_pwa: boolean;
  [key: string]: boolean | undefined;
}

export interface GlobalBroadcast {
  active: boolean;
  message: string;
  audience?: 'ALL' | 'STUDENTS' | 'TEACHERS' | 'ADMINS';
  type?: 'info' | 'warning' | 'urgent';
  updated_at?: string | null;
  created_at?: string | null;
}

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
export interface Organization extends Omit<Tables<'organizations'>, 'theme_config' | 'feature_flags' | 'global_broadcast' | 'org_type' | 'onboarding_status' | 'auth_policy'> {
  theme_config: ThemeConfig;
  org_type?: OrgType;
  institute_code?: string | null;
  onboarding_status?: OnboardingStatus;
  setup_admin_id?: string | null;
  auth_policy?: AuthPolicy;
  feature_flags?: FeatureFlags;
  global_broadcast?: GlobalBroadcast | null;
}

export interface ServiceRate {
  service_key: string;
  display_name: string;
  unit_label: string;
  unit_cost_inr: number;
  monthly_fixed_inr: number;
  free_tier_quota: number;
  updated_at: string;
}

export interface OrgUsageMonthly {
  id: string;
  org_id: string;
  billing_month: string;
  ai_requests_count: number;
  groq_tokens_used: number;
  gemini_tokens_used: number;
  tests_graded_count: number;
  emails_sent_count: number;
  updated_at: string;
}

export interface OrgInvoice {
  id: string;
  invoice_number: string;
  org_id: string;
  billing_month: string;
  plan_name: string;
  subtotal_inr: number;
  gst_inr: number;
  total_inr: number;
  status: 'PAID' | 'DUE' | 'OVERDUE';
  due_date: string | null;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
}

export interface OrgContract {
  id: string;
  contract_number: string;
  org_id: string;
  legal_entity_name: string;
  registered_address: string;
  gstin?: string | null;
  signatory_name: string;
  signatory_designation: string;
  signatory_email: string;
  plan_tier: string;
  fee_inr: number;
  billing_cycle: string;
  effective_date: string;
  expiry_date?: string | null;
  signed_at: string;
  signer_ip?: string | null;
  signature_svg?: string | null;
  document_sha256: string;
  created_at: string;
}

export interface SystemIncident {
  id: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  category: 'SUPABASE_DB' | 'AUTH_SECURITY' | 'RATE_LIMIT' | 'AI_ROUTER' | 'WORKER_CRASH' | 'ANTI_CHEAT';
  org_id?: string | null;
  error_code?: string | null;
  message: string;
  payload: Record<string, unknown>;
  resolved: boolean;
  created_at: string;
}

export interface DemoLead {
  id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  college_name: string;
  designation?: string | null;
  student_count: number;
  notes?: string | null;
  status: 'NEW' | 'CONTACTED' | 'CONVERTED' | 'ARCHIVED';
  created_at: string;
}

export interface UserProfile extends Omit<Tables<'users'>, 'grading_blessings'> {
  grading_blessings: string[];
}

export type OrgUser = Tables<'org_users'>;

export type TeacherAssignment = Tables<'teacher_assignments'>;

export interface TeacherAssignmentWithCourse extends TeacherAssignment {
  section?: Course;
  year?: Course;
  course?: Course;
}

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
