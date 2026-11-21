-- =============================================================================
-- Migration: 202611210004_phase1_security_and_config.sql
-- Description: Phase 1 — Security Hardening, Multi-Tenant Domain Isolation,
--              Org Invites Table, Teacher Provisioning & Answer-Key Leak Patch
-- =============================================================================

-- 1. Extend public.organizations with configuration and isolation columns
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS city_state text,
  ADD COLUMN IF NOT EXISTS teacher_auth_mode text NOT NULL DEFAULT 'BOTH',
  ADD COLUMN IF NOT EXISTS student_auth_mode text NOT NULL DEFAULT 'GOOGLE_ONLY',
  ADD COLUMN IF NOT EXISTS student_allowed_domains text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS teacher_allowed_domains text[] NOT NULL DEFAULT '{"gmail.com"}',
  ADD COLUMN IF NOT EXISTS capacity_limits jsonb NOT NULL DEFAULT '{"max_active_tests": 50, "student_seat_cap": 500, "monthly_ai_allowance": 500, "usage_alert_percent": 80}'::jsonb,
  ADD COLUMN IF NOT EXISTS exam_defaults jsonb NOT NULL DEFAULT '{"default_duration_mins": 60, "negative_marking_allowed": false, "result_visibility": "AFTER_CLOSE"}'::jsonb,
  ADD COLUMN IF NOT EXISTS billing_config jsonb NOT NULL DEFAULT '{"plan_tier": "PILOT", "billing_cycle": "MONTHLY", "monthly_fee": 0, "contract_status": "DRAFT", "invoice_status": "PENDING"}'::jsonb,
  ADD COLUMN IF NOT EXISTS delegation_policy jsonb NOT NULL DEFAULT '{"allow_org_edit_teacher_domains": true, "lock_student_domains": true, "allow_org_edit_features": false, "allow_org_edit_exam_defaults": true, "lock_billing_and_limits": true}'::jsonb;

-- Update feature_flags default and ensure existing rows have new flags
ALTER TABLE public.organizations
  ALTER COLUMN feature_flags SET DEFAULT '{"ai_generator": true, "wrong_answer_explainer": true, "csv_import": true, "anti_cheat": true}'::jsonb;

UPDATE public.organizations
SET feature_flags = COALESCE(feature_flags, '{}'::jsonb) || '{"wrong_answer_explainer": true, "csv_import": true, "anti_cheat": true}'::jsonb
WHERE NOT (feature_flags ? 'wrong_answer_explainer');

-- Add CHECK constraints for auth modes
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_teacher_auth_mode') THEN
    ALTER TABLE public.organizations
      ADD CONSTRAINT check_teacher_auth_mode CHECK (teacher_auth_mode IN ('GOOGLE_ONLY', 'EMAIL_PASSWORD', 'BOTH'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_student_auth_mode') THEN
    ALTER TABLE public.organizations
      ADD CONSTRAINT check_student_auth_mode CHECK (student_auth_mode IN ('GOOGLE_ONLY', 'EMAIL_PASSWORD', 'BOTH'));
  END IF;
END $$;

-- 2. Create public.org_invites table
CREATE TABLE IF NOT EXISTS public.org_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('ORG_ADMIN', 'TEACHER', 'STUDENT')),
  full_name text,
  department text,
  course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  section_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  claimed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_org_invites_org_email UNIQUE (org_id, email)
);

ALTER TABLE public.org_invites ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any to prevent conflicts on re-run
DROP POLICY IF EXISTS org_invites_super_admin ON public.org_invites;
DROP POLICY IF EXISTS org_invites_org_admin ON public.org_invites;
DROP POLICY IF EXISTS org_invites_self_select ON public.org_invites;

-- Super Admin: Full management access
CREATE POLICY org_invites_super_admin ON public.org_invites
  FOR ALL TO authenticated
  USING (
    (SELECT private.is_super_admin())
  )
  WITH CHECK (
    (SELECT private.is_super_admin())
  );

-- Org Admin: Select, Insert, Update, Delete for their own organization
CREATE POLICY org_invites_org_admin ON public.org_invites
  FOR ALL TO authenticated
  USING (
    (SELECT private.has_org_role(org_invites.org_id, ARRAY['ORG_ADMIN'::org_role]))
  )
  WITH CHECK (
    (SELECT private.has_org_role(org_invites.org_id, ARRAY['ORG_ADMIN'::org_role]))
  );

-- Self-invite claim read: Authenticated users can read their own unclaimed invite
CREATE POLICY org_invites_self_select ON public.org_invites
  FOR SELECT TO authenticated
  USING (
    lower(email) = lower(auth.jwt() ->> 'email')
    AND claimed_at IS NULL
  );

-- 3. Production Data Cleanup
-- A. Aravali College: Remove 'gmail.com' from general allowed_domains and split into explicit domain lists
UPDATE public.organizations
SET
  allowed_domains = array_remove(allowed_domains, 'gmail.com'),
  student_allowed_domains = ARRAY['acem.edu.in', 'aravali.edu.in'],
  teacher_allowed_domains = ARRAY['acem.edu.in', 'aravali.edu.in', 'gmail.com'],
  city_state = 'Faridabad, Haryana'
WHERE id = 'a0000000-0000-0000-0000-000000000001';

UPDATE public.organizations
SET
  student_allowed_domains = ARRAY['acem.edu.in'],
  teacher_allowed_domains = ARRAY['acem.edu.in', 'gmail.com'],
  city_state = 'Faridabad, Haryana'
WHERE id = 'cdc96b6f-8b3c-4ed2-98bd-ca955c2f59ba';

-- B. Deduplicate duplicate invite rows in public.org_users where user_id IS NULL
DELETE FROM public.org_users
WHERE id IN (
  SELECT id FROM (
    SELECT id, row_number() OVER (PARTITION BY org_id, lower(invited_email) ORDER BY created_at DESC) as rn
    FROM public.org_users
    WHERE user_id IS NULL AND invited_email IS NOT NULL
  ) sub WHERE rn > 1
);

-- C. Patch public.auto_join_org_by_domain to use LIMIT 1 on unclaimed invite update
CREATE OR REPLACE FUNCTION public.auto_join_org_by_domain(p_email text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_domain text;
  v_org_id uuid;
  v_user_id uuid;
  v_target_email text;
  v_matched_invite_id uuid;
BEGIN
  v_user_id := auth.uid();
  v_target_email := COALESCE(NULLIF(trim(p_email), ''), auth.jwt() ->> 'email');

  IF v_target_email IS NULL OR position('@' in v_target_email) = 0 THEN
    RETURN NULL;
  END IF;

  v_domain := lower(split_part(v_target_email, '@', 2));

  -- Find active org matching student allowed domains or legacy allowed domains
  SELECT id INTO v_org_id
  FROM public.organizations
  WHERE is_active = true
    AND onboarding_status != 'SUSPENDED'
    AND (
      v_domain = ANY(student_allowed_domains)
      OR lower(v_domain) = ANY(SELECT lower(d) FROM unnest(student_allowed_domains) d)
      OR v_domain = ANY(allowed_domains)
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
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

    -- Safely find single matching unclaimed invite
    SELECT id INTO v_matched_invite_id
    FROM public.org_users
    WHERE org_id = v_org_id
      AND lower(invited_email) = lower(v_target_email)
      AND user_id IS NULL
    LIMIT 1;

    IF v_matched_invite_id IS NOT NULL THEN
      UPDATE public.org_users
      SET user_id = v_user_id,
          is_active = true
      WHERE id = v_matched_invite_id;
    ELSE
      -- Insert as student if no invite matched
      INSERT INTO public.org_users (org_id, user_id, role, onboarding_completed, is_active)
      VALUES (v_org_id, v_user_id, 'STUDENT', false, true)
      ON CONFLICT (user_id, org_id) DO NOTHING;
    END IF;
  END IF;

  RETURN v_org_id;
END;
$function$;

-- D. Strip correctAnswer and explanation keys from public.tests.blocks to protect answer keys from student queries
UPDATE public.tests
SET blocks = (
  SELECT jsonb_agg(
    b - 'correctAnswer' - 'explanation'
  )
  FROM jsonb_array_elements(blocks) AS b
)
WHERE blocks IS NOT NULL AND jsonb_array_length(blocks) > 0;
