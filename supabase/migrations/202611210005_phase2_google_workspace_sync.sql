-- =============================================================================
-- Migration: 202611210005_phase2_google_workspace_sync.sql
-- Description: Phase 2 Google Drive & Forms Sync, Credential Vault, and Linked Sheet Schema
-- =============================================================================

-- 1. Create public.google_credentials vault table
CREATE TABLE IF NOT EXISTS public.google_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  google_email text NOT NULL,
  encrypted_refresh_token text NOT NULL,
  token_iv text NOT NULL,
  scopes text[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable strict RLS (Only backend Worker using SUPABASE_SECRET_KEY / service_role accesses tokens)
ALTER TABLE public.google_credentials ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'google_credentials'
      AND policyname = 'google_credentials_deny_all_public'
  ) THEN
    CREATE POLICY "google_credentials_deny_all_public"
      ON public.google_credentials
      FOR ALL
      TO public, authenticated, anon
      USING (false)
      WITH CHECK (false);
  END IF;
END $$;

-- 2. Extend public.tests with Google Drive, Forms, and Linked Sheets columns
ALTER TABLE public.tests
  ADD COLUMN IF NOT EXISTS drive_folder_id text,
  ADD COLUMN IF NOT EXISTS google_form_id text,
  ADD COLUMN IF NOT EXISTS linked_sheet_id text,
  ADD COLUMN IF NOT EXISTS form_responder_url text,
  ADD COLUMN IF NOT EXISTS form_entry_map jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS sheet_verified_at timestamptz;
