// @colformly/types — Shared TypeScript interfaces

export type UserRole = 'SUPER_ADMIN' | 'ORG_ADMIN' | 'TEACHER' | 'STUDENT';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  theme_config: ThemeConfig | null;
  tier: 'FREE' | 'CAMPUS' | 'ENTERPRISE';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  global_role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface OrgUser {
  id: string;
  user_id: string;
  org_id: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface Course {
  id: string;
  org_id: string;
  name: string;
  year: number;
  section: string;
  parent_course_id: string | null;
  created_at: string;
}

export interface Test {
  id: string;
  org_id: string;
  course_id: string;
  created_by: string;
  title: string;
  description: string | null;
  total_marks: number;
  duration_minutes: number;
  is_published: boolean;
  anti_cheat_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface TestAnswerKey {
  id: string;
  test_id: string;
  question_number: number;
  question_text: string;
  correct_answer: string;
  marks: number;
  topic: string | null;
}

export interface StudentResult {
  id: string;
  test_id: string;
  student_id: string;
  org_id: string;
  score: number;
  total: number;
  percentage: number;
  answers: Record<string, unknown>;
  tab_switch_count: number;
  submitted_at: string;
  graded_at: string | null;
}

export interface ThemeConfig {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    surface: string;
    muted: string;
  };
  fonts: {
    main: string;
    display: string;
  };
  layout: 'floating' | 'solid';
  animationIntensity: 'high' | 'minimal';
  borderRadius: 'rounded-3xl' | 'rounded-xl' | 'rounded-md' | 'rounded-sm';
}
