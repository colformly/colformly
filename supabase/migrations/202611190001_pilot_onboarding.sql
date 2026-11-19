-- ============================================================================
-- Migration 003: Multi-Teacher Assignments & Self-Onboarding Pilot Schema
-- Applied to Supabase project: crprffwlfngyiyztwgwb
-- ============================================================================

-- 1. Alter public.organizations
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS allowed_domains text[] NOT NULL DEFAULT '{}';

-- 2. Alter public.org_users
ALTER TABLE public.org_users
  ADD COLUMN IF NOT EXISTS roll_number text,
  ADD COLUMN IF NOT EXISTS section_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;

-- Allow students to self-update their onboarding details
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'org_users' AND policyname = 'org_users_update_self_onboarding'
  ) THEN
    CREATE POLICY "org_users_update_self_onboarding"
      ON public.org_users FOR UPDATE
      TO authenticated
      USING (user_id = (SELECT auth.uid()))
      WITH CHECK (user_id = (SELECT auth.uid()));
  END IF;
END $$;

-- 3. Alter public.tests
ALTER TABLE public.tests
  ADD COLUMN IF NOT EXISTS target_section_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS share_code text UNIQUE;

-- 4. Create table public.teacher_assignments
CREATE TABLE IF NOT EXISTS public.teacher_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  section_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  subject_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_teacher_assignments UNIQUE (org_id, teacher_id, section_id, subject_name)
);

CREATE INDEX IF NOT EXISTS idx_teacher_assignments_org_id ON public.teacher_assignments (org_id);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_teacher_id ON public.teacher_assignments (teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_section_id ON public.teacher_assignments (section_id);

-- 5. Enable RLS on public.teacher_assignments and add policies
ALTER TABLE public.teacher_assignments ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.teacher_assignments FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.teacher_assignments TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'teacher_assignments' AND policyname = 'teacher_assignments_select'
  ) THEN
    CREATE POLICY "teacher_assignments_select"
      ON public.teacher_assignments FOR SELECT
      TO authenticated
      USING (
        (SELECT private.is_super_admin())
        OR (SELECT private.is_org_member(org_id))
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'teacher_assignments' AND policyname = 'teacher_assignments_insert'
  ) THEN
    CREATE POLICY "teacher_assignments_insert"
      ON public.teacher_assignments FOR INSERT
      TO authenticated
      WITH CHECK (
        (SELECT private.is_super_admin())
        OR (SELECT private.has_org_role(org_id, ARRAY['ORG_ADMIN']::public.org_role[]))
        OR (
          (SELECT private.has_org_role(org_id, ARRAY['TEACHER']::public.org_role[]))
          AND teacher_id = (SELECT auth.uid())
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'teacher_assignments' AND policyname = 'teacher_assignments_update'
  ) THEN
    CREATE POLICY "teacher_assignments_update"
      ON public.teacher_assignments FOR UPDATE
      TO authenticated
      USING (
        (SELECT private.is_super_admin())
        OR (SELECT private.has_org_role(org_id, ARRAY['ORG_ADMIN']::public.org_role[]))
        OR (
          (SELECT private.has_org_role(org_id, ARRAY['TEACHER']::public.org_role[]))
          AND teacher_id = (SELECT auth.uid())
        )
      )
      WITH CHECK (
        (SELECT private.is_super_admin())
        OR (SELECT private.has_org_role(org_id, ARRAY['ORG_ADMIN']::public.org_role[]))
        OR (
          (SELECT private.has_org_role(org_id, ARRAY['TEACHER']::public.org_role[]))
          AND teacher_id = (SELECT auth.uid())
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'teacher_assignments' AND policyname = 'teacher_assignments_delete'
  ) THEN
    CREATE POLICY "teacher_assignments_delete"
      ON public.teacher_assignments FOR DELETE
      TO authenticated
      USING (
        (SELECT private.is_super_admin())
        OR (SELECT private.has_org_role(org_id, ARRAY['ORG_ADMIN']::public.org_role[]))
        OR (
          (SELECT private.has_org_role(org_id, ARRAY['TEACHER']::public.org_role[]))
          AND teacher_id = (SELECT auth.uid())
        )
      );
  END IF;
END $$;

-- 6. RPC function public.auto_join_org_by_domain(p_email text)
CREATE OR REPLACE FUNCTION public.auto_join_org_by_domain(p_email text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_domain text;
  v_org_id uuid;
  v_user_id uuid;
  v_target_email text;
BEGIN
  v_user_id := auth.uid();
  v_target_email := COALESCE(NULLIF(trim(p_email), ''), auth.jwt() ->> 'email');

  IF v_target_email IS NULL OR position('@' in v_target_email) = 0 THEN
    RETURN NULL;
  END IF;

  v_domain := lower(split_part(v_target_email, '@', 2));

  -- Find active org matching domain
  SELECT id INTO v_org_id
  FROM public.organizations
  WHERE is_active = true
    AND (
      v_domain = ANY(allowed_domains)
      OR lower(v_domain) = ANY(SELECT lower(d) FROM unnest(allowed_domains) d)
    )
  LIMIT 1;

  IF v_org_id IS NULL THEN
    RETURN NULL;
  END IF;

  IF v_user_id IS NOT NULL THEN
    -- Ensure user profile exists
    INSERT INTO public.users (id, email, full_name, global_role)
    VALUES (
      v_user_id,
      v_target_email,
      COALESCE(auth.jwt() -> 'user_metadata' ->> 'full_name', split_part(v_target_email, '@', 1)),
      'CAMPUS_USER'
    )
    ON CONFLICT (id) DO NOTHING;

    -- Insert membership if not already a member
    INSERT INTO public.org_users (org_id, user_id, role, onboarding_completed, is_active)
    VALUES (v_org_id, v_user_id, 'STUDENT', false, true)
    ON CONFLICT (user_id, org_id) DO NOTHING;
  END IF;

  RETURN v_org_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.auto_join_org_by_domain(text) TO authenticated, anon;
