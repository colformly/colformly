-- ============================================================================
-- Migration: Automatic Student & User Data Normalization Triggers
-- Applied to Supabase project: crprffwlfngyiyztwgwb
-- ============================================================================

-- 1. Trigger function for public.org_users (normalize roll_number)
CREATE OR REPLACE FUNCTION private.tr_normalize_org_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.roll_number IS NOT NULL THEN
    NEW.roll_number := UPPER(REGEXP_REPLACE(TRIM(NEW.roll_number), '[^a-zA-Z0-9]', '', 'g'));
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER tr_org_users_normalize
  BEFORE INSERT OR UPDATE OF roll_number ON public.org_users
  FOR EACH ROW
  EXECUTE FUNCTION private.tr_normalize_org_user();

-- 2. Trigger function for public.users (normalize full_name)
CREATE OR REPLACE FUNCTION private.tr_normalize_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.full_name IS NOT NULL THEN
    NEW.full_name := INITCAP(REGEXP_REPLACE(TRIM(NEW.full_name), '\s+', ' ', 'g'));
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER tr_users_normalize
  BEFORE INSERT OR UPDATE OF full_name ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION private.tr_normalize_user();

-- 3. Retroactively normalize any existing records
UPDATE public.org_users
SET roll_number = UPPER(REGEXP_REPLACE(TRIM(roll_number), '[^a-zA-Z0-9]', '', 'g'))
WHERE roll_number IS NOT NULL;

UPDATE public.users
SET full_name = INITCAP(REGEXP_REPLACE(TRIM(full_name), '\s+', ' ', 'g'))
WHERE full_name IS NOT NULL;

