-- ============================================================================
-- Migration 001: Colformly Core Multi-Tenant Schema
-- Applied to Supabase project: crprffwlfngyiyztwgwb
-- ============================================================================

-- Non-exposed schema for internal SECURITY DEFINER helpers and triggers
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
REVOKE ALL ON SCHEMA private FROM anon;

-- Enums
DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM ('SUPER_ADMIN', 'ORG_ADMIN', 'TEACHER', 'STUDENT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.org_role AS ENUM ('ORG_ADMIN', 'TEACHER', 'STUDENT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.org_tier AS ENUM ('FREE', 'CAMPUS', 'ENTERPRISE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.course_level AS ENUM ('COURSE', 'YEAR', 'SECTION');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Shared updated_at trigger function
CREATE OR REPLACE FUNCTION private.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- 1. organizations
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  logo_url text,
  theme_config jsonb NOT NULL DEFAULT '{
    "colors": {
      "primary": "#6366f1",
      "secondary": "#8b5cf6",
      "accent": "#06b6d4",
      "surface": "#ffffff",
      "muted": "#f1f5f9"
    },
    "fonts": {
      "main": "\"Inter\", sans-serif",
      "display": "\"Cal Sans\", sans-serif"
    },
    "layout": "floating",
    "animationIntensity": "high",
    "borderRadius": "rounded-xl"
  }'::jsonb,
  tier public.org_tier NOT NULL DEFAULT 'FREE',
  mrr_cents integer NOT NULL DEFAULT 0 CHECK (mrr_cents >= 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE TRIGGER trg_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

-- ----------------------------------------------------------------------------
-- 2. users (extends auth.users)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  full_name text NOT NULL DEFAULT '',
  avatar_url text,
  global_role public.user_role NOT NULL DEFAULT 'STUDENT',
  signature_url text,
  grading_blessings jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_global_role ON public.users (global_role);

CREATE OR REPLACE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

-- ----------------------------------------------------------------------------
-- 3. courses (hierarchical: COURSE > YEAR > SECTION)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.courses(id) ON DELETE CASCADE,
  level public.course_level NOT NULL DEFAULT 'COURSE',
  name text NOT NULL,
  code text,
  year smallint CHECK (year IS NULL OR (year >= 1 AND year <= 10)),
  section text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_courses_org_id ON public.courses (org_id);
CREATE INDEX IF NOT EXISTS idx_courses_parent_id ON public.courses (parent_id);
CREATE INDEX IF NOT EXISTS idx_courses_org_level ON public.courses (org_id, level);

CREATE OR REPLACE TRIGGER trg_courses_updated_at
  BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

-- ----------------------------------------------------------------------------
-- 4. org_users (Multi-tenant RBAC: ORG_ADMIN, TEACHER, STUDENT)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.org_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role public.org_role NOT NULL DEFAULT 'STUDENT',
  course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  roll_number text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT org_users_user_org_unique UNIQUE (user_id, org_id)
);

CREATE INDEX IF NOT EXISTS idx_org_users_org_id ON public.org_users (org_id);
CREATE INDEX IF NOT EXISTS idx_org_users_user_id ON public.org_users (user_id);
CREATE INDEX IF NOT EXISTS idx_org_users_course_id ON public.org_users (course_id);
CREATE INDEX IF NOT EXISTS idx_org_users_lookup ON public.org_users (org_id, user_id, role) WHERE is_active = true;

CREATE OR REPLACE TRIGGER trg_org_users_updated_at
  BEFORE UPDATE ON public.org_users
  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

-- ----------------------------------------------------------------------------
-- 5. tests
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  title text NOT NULL,
  description text,
  subject text,
  blocks jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_marks integer NOT NULL DEFAULT 100 CHECK (total_marks > 0),
  duration_minutes integer NOT NULL DEFAULT 60 CHECK (duration_minutes > 0),
  is_published boolean NOT NULL DEFAULT false,
  anti_cheat_enabled boolean NOT NULL DEFAULT true,
  scheduled_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tests_org_id ON public.tests (org_id);
CREATE INDEX IF NOT EXISTS idx_tests_course_id ON public.tests (course_id);
CREATE INDEX IF NOT EXISTS idx_tests_created_by ON public.tests (created_by);
CREATE INDEX IF NOT EXISTS idx_tests_org_published ON public.tests (org_id, is_published);

CREATE OR REPLACE TRIGGER trg_tests_updated_at
  BEFORE UPDATE ON public.tests
  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

-- ----------------------------------------------------------------------------
-- 6. test_answer_keys
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.test_answer_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  test_id uuid NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  question_number integer NOT NULL CHECK (question_number > 0),
  question_text text NOT NULL,
  question_type text NOT NULL DEFAULT 'MCQ' CHECK (question_type IN ('MCQ', 'SHORT_ANSWER', 'LONG_ANSWER', 'TRUE_FALSE')),
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  correct_answer text NOT NULL,
  explanation text,
  marks numeric(6,2) NOT NULL DEFAULT 1 CHECK (marks >= 0),
  topic text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT test_answer_keys_test_qnum_unique UNIQUE (test_id, question_number)
);

CREATE INDEX IF NOT EXISTS idx_test_answer_keys_org_id ON public.test_answer_keys (org_id);
CREATE INDEX IF NOT EXISTS idx_test_answer_keys_test_id ON public.test_answer_keys (test_id);
CREATE INDEX IF NOT EXISTS idx_test_answer_keys_topic ON public.test_answer_keys (test_id, topic);

CREATE OR REPLACE TRIGGER trg_test_answer_keys_updated_at
  BEFORE UPDATE ON public.test_answer_keys
  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

-- ----------------------------------------------------------------------------
-- 7. student_results
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.student_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  test_id uuid NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  score numeric(6,2) NOT NULL DEFAULT 0 CHECK (score >= 0),
  total numeric(6,2) NOT NULL DEFAULT 100 CHECK (total > 0),
  percentage numeric(5,2) GENERATED ALWAYS AS (
    CASE WHEN total > 0 THEN round((score / total) * 100.0, 2) ELSE 0 END
  ) STORED,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  question_breakdown jsonb NOT NULL DEFAULT '[]'::jsonb,
  tab_switch_count integer NOT NULL DEFAULT 0 CHECK (tab_switch_count >= 0),
  fullscreen_exits integer NOT NULL DEFAULT 0 CHECK (fullscreen_exits >= 0),
  anti_cheat_logs jsonb NOT NULL DEFAULT '[]'::jsonb,
  teacher_blessing text,
  status text NOT NULL DEFAULT 'IN_PROGRESS' CHECK (status IN ('IN_PROGRESS', 'SUBMITTED', 'GRADED', 'FLAGGED')),
  submitted_at timestamptz,
  graded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT student_results_test_student_unique UNIQUE (test_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_student_results_org_id ON public.student_results (org_id);
CREATE INDEX IF NOT EXISTS idx_student_results_test_id ON public.student_results (test_id);
CREATE INDEX IF NOT EXISTS idx_student_results_student_id ON public.student_results (student_id);
CREATE INDEX IF NOT EXISTS idx_student_results_org_student ON public.student_results (org_id, student_id, status);

CREATE OR REPLACE TRIGGER trg_student_results_updated_at
  BEFORE UPDATE ON public.student_results
  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

-- ----------------------------------------------------------------------------
-- Auth Sync & Privilege Escalation Protection Triggers
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_role public.user_role := 'STUDENT';
BEGIN
  IF (NEW.raw_app_meta_data ->> 'role') IN ('SUPER_ADMIN', 'ORG_ADMIN', 'TEACHER', 'STUDENT') THEN
    v_role := (NEW.raw_app_meta_data ->> 'role')::public.user_role;
  END IF;

  INSERT INTO public.users (id, email, full_name, avatar_url, global_role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', ''),
    NEW.raw_user_meta_data ->> 'avatar_url',
    v_role
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = CASE WHEN public.users.full_name = '' THEN EXCLUDED.full_name ELSE public.users.full_name END,
    avatar_url = COALESCE(public.users.avatar_url, EXCLUDED.avatar_url),
    updated_at = now();

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION private.handle_new_auth_user();

-- Prevent authenticated users from escalating their own global_role
CREATE OR REPLACE FUNCTION private.protect_user_global_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.global_role IS DISTINCT FROM OLD.global_role THEN
    IF current_user IN ('authenticated', 'anon') THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.users
        WHERE id = (SELECT auth.uid()) AND global_role = 'SUPER_ADMIN'
      ) THEN
        RAISE EXCEPTION 'Forbidden: cannot modify global_role';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_users_protect_global_role
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION private.protect_user_global_role();
