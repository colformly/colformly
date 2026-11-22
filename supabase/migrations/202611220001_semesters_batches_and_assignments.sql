-- =============================================================================
-- Migration: 202611220001_semesters_batches_and_assignments.sql
-- Description: Idempotent upgrades for semesters, batches, and teacher assignments.
-- =============================================================================

-- 1. Upgrade public.courses with degree_code, duration_years, semester, batch_year
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS degree_code text,
  ADD COLUMN IF NOT EXISTS duration_years integer DEFAULT 4,
  ADD COLUMN IF NOT EXISTS semester smallint,
  ADD COLUMN IF NOT EXISTS batch_year integer,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'courses_duration_years_check'
  ) THEN
    ALTER TABLE public.courses
      ADD CONSTRAINT courses_duration_years_check CHECK (duration_years > 0);
  END IF;
END $$;

-- 2. Upgrade public.teacher_assignments with academic_year, semester and unique constraint
ALTER TABLE public.teacher_assignments
  ADD COLUMN IF NOT EXISTS academic_year text,
  ADD COLUMN IF NOT EXISTS semester smallint;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'teacher_assignments_unique_assignment'
  ) THEN
    ALTER TABLE public.teacher_assignments
      ADD CONSTRAINT teacher_assignments_unique_assignment UNIQUE (org_id, teacher_id, section_id, subject_name);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_teacher_assignments_teacher ON public.teacher_assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_section ON public.teacher_assignments(section_id);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_org ON public.teacher_assignments(org_id);

-- 3. Upgrade public.org_users with batch_year and current_semester
ALTER TABLE public.org_users
  ADD COLUMN IF NOT EXISTS batch_year integer,
  ADD COLUMN IF NOT EXISTS current_semester smallint;

CREATE INDEX IF NOT EXISTS idx_org_users_section ON public.org_users(org_id, section_id);
CREATE INDEX IF NOT EXISTS idx_org_users_role ON public.org_users(org_id, role);
