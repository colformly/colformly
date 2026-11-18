-- ============================================================================
-- Migration 002: Strict Multi-Tenant RLS Policies & Tenant Integrity Guards
-- Applied to Supabase project: crprffwlfngyiyztwgwb
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Enable RLS on all public tables
-- ----------------------------------------------------------------------------
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_answer_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_results ENABLE ROW LEVEL SECURITY;

-- Explicit table privileges: authenticated gets access subject to RLS; anon gets none
REVOKE ALL ON TABLE
  public.organizations,
  public.users,
  public.courses,
  public.org_users,
  public.tests,
  public.test_answer_keys,
  public.student_results
FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.organizations,
  public.users,
  public.courses,
  public.org_users,
  public.tests,
  public.test_answer_keys,
  public.student_results
TO authenticated;

-- ----------------------------------------------------------------------------
-- 2. Private RLS Helper Functions (non-exposed schema, no recursion)
-- ----------------------------------------------------------------------------
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE OR REPLACE FUNCTION private.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = (SELECT auth.uid())
      AND global_role = 'SUPER_ADMIN'
  );
$$;

CREATE OR REPLACE FUNCTION private.is_org_member(target_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.org_users
    WHERE org_id = target_org_id
      AND user_id = (SELECT auth.uid())
      AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION private.has_org_role(target_org_id uuid, allowed_roles public.org_role[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.org_users
    WHERE org_id = target_org_id
      AND user_id = (SELECT auth.uid())
      AND is_active = true
      AND role = ANY(allowed_roles)
  );
$$;

CREATE OR REPLACE FUNCTION private.shares_org_with_user(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.org_users me
    JOIN public.org_users other ON other.org_id = me.org_id
    WHERE me.user_id = (SELECT auth.uid())
      AND me.is_active = true
      AND other.user_id = target_user_id
  );
$$;

CREATE OR REPLACE FUNCTION private.has_submitted_test(target_test_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.student_results
    WHERE test_id = target_test_id
      AND student_id = (SELECT auth.uid())
      AND status IN ('SUBMITTED', 'GRADED')
  );
$$;

REVOKE ALL ON FUNCTION private.is_super_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.is_org_member(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.has_org_role(uuid, public.org_role[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.shares_org_with_user(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.has_submitted_test(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION private.is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_org_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.has_org_role(uuid, public.org_role[]) TO authenticated;
GRANT EXECUTE ON FUNCTION private.shares_org_with_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.has_submitted_test(uuid) TO authenticated;

-- ----------------------------------------------------------------------------
-- 3. Cross-Tenant FK Integrity Triggers (Defense in Depth)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.enforce_test_org_match()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_parent_org uuid;
BEGIN
  IF TG_TABLE_NAME = 'tests' THEN
    SELECT org_id INTO v_parent_org FROM public.courses WHERE id = NEW.course_id;
    IF v_parent_org IS DISTINCT FROM NEW.org_id THEN
      RAISE EXCEPTION 'Tenant isolation violation: course belongs to a different organization';
    END IF;
  ELSIF TG_TABLE_NAME IN ('test_answer_keys', 'student_results') THEN
    SELECT org_id INTO v_parent_org FROM public.tests WHERE id = NEW.test_id;
    IF v_parent_org IS DISTINCT FROM NEW.org_id THEN
      RAISE EXCEPTION 'Tenant isolation violation: test belongs to a different organization';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_tests_org_match
  BEFORE INSERT OR UPDATE ON public.tests
  FOR EACH ROW EXECUTE FUNCTION private.enforce_test_org_match();

CREATE OR REPLACE TRIGGER trg_test_answer_keys_org_match
  BEFORE INSERT OR UPDATE ON public.test_answer_keys
  FOR EACH ROW EXECUTE FUNCTION private.enforce_test_org_match();

CREATE OR REPLACE TRIGGER trg_student_results_org_match
  BEFORE INSERT OR UPDATE ON public.student_results
  FOR EACH ROW EXECUTE FUNCTION private.enforce_test_org_match();

-- ----------------------------------------------------------------------------
-- 4. RLS Policies: organizations
-- ----------------------------------------------------------------------------
CREATE POLICY "organizations_select_scoped"
  ON public.organizations FOR SELECT
  TO authenticated
  USING (
    (SELECT private.is_super_admin())
    OR (SELECT private.is_org_member(id))
  );

CREATE POLICY "organizations_insert_super_admin"
  ON public.organizations FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT private.is_super_admin()));

CREATE POLICY "organizations_update_admin"
  ON public.organizations FOR UPDATE
  TO authenticated
  USING (
    (SELECT private.is_super_admin())
    OR (SELECT private.has_org_role(id, ARRAY['ORG_ADMIN']::public.org_role[]))
  )
  WITH CHECK (
    (SELECT private.is_super_admin())
    OR (SELECT private.has_org_role(id, ARRAY['ORG_ADMIN']::public.org_role[]))
  );

CREATE POLICY "organizations_delete_super_admin"
  ON public.organizations FOR DELETE
  TO authenticated
  USING ((SELECT private.is_super_admin()));

-- ----------------------------------------------------------------------------
-- 5. RLS Policies: users
-- ----------------------------------------------------------------------------
CREATE POLICY "users_select_self_or_same_org"
  ON public.users FOR SELECT
  TO authenticated
  USING (
    (SELECT private.is_super_admin())
    OR id = (SELECT auth.uid())
    OR (SELECT private.shares_org_with_user(id))
  );

CREATE POLICY "users_insert_self_or_super_admin"
  ON public.users FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT private.is_super_admin())
    OR (id = (SELECT auth.uid()) AND global_role <> 'SUPER_ADMIN')
  );

CREATE POLICY "users_update_self_or_super_admin"
  ON public.users FOR UPDATE
  TO authenticated
  USING (
    (SELECT private.is_super_admin())
    OR id = (SELECT auth.uid())
  )
  WITH CHECK (
    (SELECT private.is_super_admin())
    OR (id = (SELECT auth.uid()) AND global_role <> 'SUPER_ADMIN')
  );

CREATE POLICY "users_delete_super_admin"
  ON public.users FOR DELETE
  TO authenticated
  USING ((SELECT private.is_super_admin()));

-- ----------------------------------------------------------------------------
-- 6. RLS Policies: org_users
-- ----------------------------------------------------------------------------
CREATE POLICY "org_users_select_org_scoped"
  ON public.org_users FOR SELECT
  TO authenticated
  USING (
    (SELECT private.is_super_admin())
    OR (SELECT private.is_org_member(org_id))
  );

CREATE POLICY "org_users_insert_org_admin"
  ON public.org_users FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT private.is_super_admin())
    OR (SELECT private.has_org_role(org_id, ARRAY['ORG_ADMIN']::public.org_role[]))
  );

CREATE POLICY "org_users_update_org_admin"
  ON public.org_users FOR UPDATE
  TO authenticated
  USING (
    (SELECT private.is_super_admin())
    OR (SELECT private.has_org_role(org_id, ARRAY['ORG_ADMIN']::public.org_role[]))
  )
  WITH CHECK (
    (SELECT private.is_super_admin())
    OR (SELECT private.has_org_role(org_id, ARRAY['ORG_ADMIN']::public.org_role[]))
  );

CREATE POLICY "org_users_delete_org_admin"
  ON public.org_users FOR DELETE
  TO authenticated
  USING (
    (SELECT private.is_super_admin())
    OR (SELECT private.has_org_role(org_id, ARRAY['ORG_ADMIN']::public.org_role[]))
  );

-- ----------------------------------------------------------------------------
-- 7. RLS Policies: courses
-- ----------------------------------------------------------------------------
CREATE POLICY "courses_select_org_scoped"
  ON public.courses FOR SELECT
  TO authenticated
  USING (
    (SELECT private.is_super_admin())
    OR (SELECT private.is_org_member(org_id))
  );

CREATE POLICY "courses_insert_staff"
  ON public.courses FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT private.is_super_admin())
    OR (SELECT private.has_org_role(org_id, ARRAY['ORG_ADMIN', 'TEACHER']::public.org_role[]))
  );

CREATE POLICY "courses_update_staff"
  ON public.courses FOR UPDATE
  TO authenticated
  USING (
    (SELECT private.is_super_admin())
    OR (SELECT private.has_org_role(org_id, ARRAY['ORG_ADMIN', 'TEACHER']::public.org_role[]))
  )
  WITH CHECK (
    (SELECT private.is_super_admin())
    OR (SELECT private.has_org_role(org_id, ARRAY['ORG_ADMIN', 'TEACHER']::public.org_role[]))
  );

CREATE POLICY "courses_delete_org_admin"
  ON public.courses FOR DELETE
  TO authenticated
  USING (
    (SELECT private.is_super_admin())
    OR (SELECT private.has_org_role(org_id, ARRAY['ORG_ADMIN']::public.org_role[]))
  );

-- ----------------------------------------------------------------------------
-- 8. RLS Policies: tests
-- ----------------------------------------------------------------------------
CREATE POLICY "tests_select_org_scoped"
  ON public.tests FOR SELECT
  TO authenticated
  USING (
    (SELECT private.is_super_admin())
    OR (SELECT private.has_org_role(org_id, ARRAY['ORG_ADMIN', 'TEACHER']::public.org_role[]))
    OR (is_published = true AND (SELECT private.is_org_member(org_id)))
  );

CREATE POLICY "tests_insert_staff"
  ON public.tests FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT private.is_super_admin())
    OR (
      created_by = (SELECT auth.uid())
      AND (SELECT private.has_org_role(org_id, ARRAY['ORG_ADMIN', 'TEACHER']::public.org_role[]))
    )
  );

CREATE POLICY "tests_update_staff"
  ON public.tests FOR UPDATE
  TO authenticated
  USING (
    (SELECT private.is_super_admin())
    OR (SELECT private.has_org_role(org_id, ARRAY['ORG_ADMIN', 'TEACHER']::public.org_role[]))
  )
  WITH CHECK (
    (SELECT private.is_super_admin())
    OR (SELECT private.has_org_role(org_id, ARRAY['ORG_ADMIN', 'TEACHER']::public.org_role[]))
  );

CREATE POLICY "tests_delete_staff"
  ON public.tests FOR DELETE
  TO authenticated
  USING (
    (SELECT private.is_super_admin())
    OR (SELECT private.has_org_role(org_id, ARRAY['ORG_ADMIN', 'TEACHER']::public.org_role[]))
  );

-- ----------------------------------------------------------------------------
-- 9. RLS Policies: test_answer_keys (Cheat-Proof Isolation)
-- ----------------------------------------------------------------------------
CREATE POLICY "test_answer_keys_select_cheat_proof"
  ON public.test_answer_keys FOR SELECT
  TO authenticated
  USING (
    (SELECT private.is_super_admin())
    OR (SELECT private.has_org_role(org_id, ARRAY['ORG_ADMIN', 'TEACHER']::public.org_role[]))
    OR (
      (SELECT private.is_org_member(org_id))
      AND (SELECT private.has_submitted_test(test_id))
    )
  );

CREATE POLICY "test_answer_keys_insert_staff"
  ON public.test_answer_keys FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT private.is_super_admin())
    OR (SELECT private.has_org_role(org_id, ARRAY['ORG_ADMIN', 'TEACHER']::public.org_role[]))
  );

CREATE POLICY "test_answer_keys_update_staff"
  ON public.test_answer_keys FOR UPDATE
  TO authenticated
  USING (
    (SELECT private.is_super_admin())
    OR (SELECT private.has_org_role(org_id, ARRAY['ORG_ADMIN', 'TEACHER']::public.org_role[]))
  )
  WITH CHECK (
    (SELECT private.is_super_admin())
    OR (SELECT private.has_org_role(org_id, ARRAY['ORG_ADMIN', 'TEACHER']::public.org_role[]))
  );

CREATE POLICY "test_answer_keys_delete_staff"
  ON public.test_answer_keys FOR DELETE
  TO authenticated
  USING (
    (SELECT private.is_super_admin())
    OR (SELECT private.has_org_role(org_id, ARRAY['ORG_ADMIN', 'TEACHER']::public.org_role[]))
  );

-- ----------------------------------------------------------------------------
-- 10. RLS Policies: student_results
-- ----------------------------------------------------------------------------
CREATE POLICY "student_results_select_scoped"
  ON public.student_results FOR SELECT
  TO authenticated
  USING (
    (SELECT private.is_super_admin())
    OR (SELECT private.has_org_role(org_id, ARRAY['ORG_ADMIN', 'TEACHER']::public.org_role[]))
    OR (
      student_id = (SELECT auth.uid())
      AND (SELECT private.is_org_member(org_id))
    )
  );

CREATE POLICY "student_results_insert_scoped"
  ON public.student_results FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT private.is_super_admin())
    OR (SELECT private.has_org_role(org_id, ARRAY['ORG_ADMIN', 'TEACHER']::public.org_role[]))
    OR (
      student_id = (SELECT auth.uid())
      AND (SELECT private.has_org_role(org_id, ARRAY['STUDENT']::public.org_role[]))
    )
  );

CREATE POLICY "student_results_update_scoped"
  ON public.student_results FOR UPDATE
  TO authenticated
  USING (
    (SELECT private.is_super_admin())
    OR (SELECT private.has_org_role(org_id, ARRAY['ORG_ADMIN', 'TEACHER']::public.org_role[]))
    OR (
      student_id = (SELECT auth.uid())
      AND status = 'IN_PROGRESS'
      AND (SELECT private.has_org_role(org_id, ARRAY['STUDENT']::public.org_role[]))
    )
  )
  WITH CHECK (
    (SELECT private.is_super_admin())
    OR (SELECT private.has_org_role(org_id, ARRAY['ORG_ADMIN', 'TEACHER']::public.org_role[]))
    OR (
      student_id = (SELECT auth.uid())
      AND status IN ('IN_PROGRESS', 'SUBMITTED', 'FLAGGED')
      AND (SELECT private.has_org_role(org_id, ARRAY['STUDENT']::public.org_role[]))
    )
  );

CREATE POLICY "student_results_delete_admin"
  ON public.student_results FOR DELETE
  TO authenticated
  USING (
    (SELECT private.is_super_admin())
    OR (SELECT private.has_org_role(org_id, ARRAY['ORG_ADMIN']::public.org_role[]))
  );

-- ----------------------------------------------------------------------------
-- 11. Privacy-Preserving Org Leaderboard RPC
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_org_leaderboard(target_org_id uuid)
RETURNS TABLE (
  student_id uuid,
  full_name text,
  avatar_url text,
  tests_completed bigint,
  avg_percentage numeric,
  total_score numeric,
  rank bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT (private.is_super_admin() OR private.is_org_member(target_org_id)) THEN
    RAISE EXCEPTION 'Forbidden: not a member of this organization';
  END IF;

  RETURN QUERY
  SELECT
    u.id AS student_id,
    u.full_name,
    u.avatar_url,
    COUNT(sr.id) AS tests_completed,
    ROUND(COALESCE(AVG(sr.percentage), 0), 2) AS avg_percentage,
    COALESCE(SUM(sr.score), 0) AS total_score,
    RANK() OVER (ORDER BY COALESCE(AVG(sr.percentage), 0) DESC, COUNT(sr.id) DESC) AS rank
  FROM public.org_users ou
  JOIN public.users u ON u.id = ou.user_id
  LEFT JOIN public.student_results sr
    ON sr.student_id = u.id
    AND sr.org_id = target_org_id
    AND sr.status = 'GRADED'
  WHERE ou.org_id = target_org_id
    AND ou.role = 'STUDENT'
    AND ou.is_active = true
  GROUP BY u.id, u.full_name, u.avatar_url
  ORDER BY rank ASC, u.full_name ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_org_leaderboard(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_org_leaderboard(uuid) TO authenticated;
