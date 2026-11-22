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
export type TeacherAuthMode = 'GOOGLE_ONLY' | 'EMAIL_PASSWORD' | 'BOTH';
export type StudentAuthMode = 'GOOGLE_ONLY' | 'EMAIL_PASSWORD' | 'BOTH';

export interface CapacityLimits {
  max_active_tests: number;
  student_seat_cap: number;
  monthly_ai_allowance: number;
  usage_alert_percent: number;
  [key: string]: number | undefined;
}

export interface ExamDefaults {
  default_duration_mins: number;
  negative_marking_allowed: boolean;
  result_visibility: 'IMMEDIATE' | 'AFTER_CLOSE' | 'MANUAL_RELEASE';
  [key: string]: string | number | boolean | undefined;
}

export interface BillingConfig {
  plan_tier: string;
  billing_cycle: string;
  monthly_fee: number;
  contract_status: string;
  invoice_status: string;
  [key: string]: string | number | boolean | undefined;
}

export interface DelegationPolicy {
  allow_org_edit_teacher_domains: boolean;
  lock_student_domains: boolean;
  allow_org_edit_features: boolean;
  allow_org_edit_exam_defaults: boolean;
  lock_billing_and_limits: boolean;
  [key: string]: boolean | undefined;
}

export interface FeatureFlags {
  ai_generator: boolean;
  wrong_answer_explainer?: boolean;
  csv_import?: boolean;
  anti_cheat?: boolean;
  byoc_explainer?: boolean;
  strict_pwa?: boolean;
  [key: string]: boolean | undefined;
}

export interface OrgInvite {
  id: string;
  org_id: string;
  email: string;
  role: 'ORG_ADMIN' | 'TEACHER' | 'STUDENT';
  full_name?: string | null;
  department?: string | null;
  course_id?: string | null;
  section_id?: string | null;
  invited_by?: string | null;
  claimed_at?: string | null;
  created_at: string;
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
export interface Organization extends Omit<
  Tables<'organizations'>,
  | 'theme_config'
  | 'feature_flags'
  | 'global_broadcast'
  | 'org_type'
  | 'onboarding_status'
  | 'auth_policy'
  | 'billing_config'
  | 'capacity_limits'
  | 'exam_defaults'
  | 'delegation_policy'
  | 'city_state'
  | 'institute_code'
  | 'setup_admin_id'
  | 'teacher_auth_mode'
  | 'student_auth_mode'
  | 'student_allowed_domains'
  | 'teacher_allowed_domains'
> {
  theme_config: ThemeConfig;
  org_type?: OrgType;
  institute_code?: string | null;
  city_state?: string | null;
  teacher_auth_mode?: TeacherAuthMode;
  student_auth_mode?: StudentAuthMode;
  student_allowed_domains?: string[];
  teacher_allowed_domains?: string[];
  capacity_limits?: CapacityLimits;
  exam_defaults?: ExamDefaults;
  billing_config?: BillingConfig;
  delegation_policy?: DelegationPolicy;
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

export interface FormEntryMap {
  _student_email?: string;
  [questionId: string]: string | undefined;
}

export interface GoogleCredential {
  id: string;
  user_id: string;
  org_id: string;
  google_email: string;
  encrypted_refresh_token: string;
  token_iv: string;
  scopes: string[];
  updated_at: string;
}

export interface Test extends Omit<
  Tables<'tests'>,
  | 'blocks'
  | 'drive_folder_id'
  | 'google_form_id'
  | 'linked_sheet_id'
  | 'form_responder_url'
  | 'form_entry_map'
  | 'sheet_verified_at'
> {
  blocks: TestBlock[];
  drive_folder_id?: string | null;
  google_form_id?: string | null;
  linked_sheet_id?: string | null;
  form_responder_url?: string | null;
  form_entry_map?: FormEntryMap;
  sheet_verified_at?: string | null;
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
