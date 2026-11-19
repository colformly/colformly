-- =============================================================================
-- Migration: 202611190003_super_admin_prime.sql
-- Description: Super Admin Prime — Extended Org Attributes, Service Rates,
--              Usage Metering, Invoices, Contracts, Incidents & CRM Leads
-- =============================================================================

-- 1. Extend public.organizations
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS org_type text NOT NULL DEFAULT 'COLLEGE',
  ADD COLUMN IF NOT EXISTS institute_code text,
  ADD COLUMN IF NOT EXISTS onboarding_status text NOT NULL DEFAULT 'SETUP_MODE',
  ADD COLUMN IF NOT EXISTS setup_admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS auth_policy text NOT NULL DEFAULT 'HYBRID',
  ADD COLUMN IF NOT EXISTS feature_flags jsonb NOT NULL DEFAULT '{"ai_generator": true, "byoc_explainer": true, "strict_pwa": false}'::jsonb,
  ADD COLUMN IF NOT EXISTS global_broadcast jsonb DEFAULT '{"active": false, "message": "", "audience": "ALL", "updated_at": null}'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_org_type') THEN
    ALTER TABLE public.organizations ADD CONSTRAINT check_org_type CHECK (org_type IN ('COLLEGE', 'UNIVERSITY', 'COACHING', 'SCHOOL'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_onboarding_status') THEN
    ALTER TABLE public.organizations ADD CONSTRAINT check_onboarding_status CHECK (onboarding_status IN ('SETUP_MODE', 'HANDED_OVER', 'SUSPENDED'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_auth_policy') THEN
    ALTER TABLE public.organizations ADD CONSTRAINT check_auth_policy CHECK (auth_policy IN ('HYBRID', 'GOOGLE_ONLY'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_institute_code') THEN
    ALTER TABLE public.organizations ADD CONSTRAINT unique_institute_code UNIQUE (institute_code);
  END IF;
END $$;

-- 2. Billing & Live Usage Metering
CREATE TABLE IF NOT EXISTS public.service_rates (
  service_key text PRIMARY KEY,
  display_name text NOT NULL,
  unit_label text NOT NULL,
  unit_cost_inr numeric(12,6) NOT NULL DEFAULT 0,
  monthly_fixed_inr numeric(10,2) NOT NULL DEFAULT 0,
  free_tier_quota bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.service_rates (service_key, display_name, unit_label, unit_cost_inr, monthly_fixed_inr, free_tier_quota)
VALUES
  ('groq_tokens', 'Groq Llama 3.3 70B Tokens', 'per 1M tokens', 45.000000, 0, 500000),
  ('gemini_tokens', 'Google Gemini 2.5 Flash Tokens', 'per 1M tokens', 25.000000, 0, 500000),
  ('worker_requests', 'Cloudflare Edge Worker Compute', 'per 100k reqs', 15.000000, 0, 100000),
  ('supabase_db', 'Supabase High-Availability Postgres', 'shared infra unit', 0.000000, 2100.00, 1),
  ('resend_emails', 'Resend Transactional Mail Engine', 'per 1k emails', 80.000000, 0, 3000)
ON CONFLICT (service_key) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  unit_label = EXCLUDED.unit_label,
  updated_at = now();

CREATE TABLE IF NOT EXISTS public.org_usage_monthly (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  billing_month text NOT NULL,
  ai_requests_count integer NOT NULL DEFAULT 0,
  groq_tokens_used bigint NOT NULL DEFAULT 0,
  gemini_tokens_used bigint NOT NULL DEFAULT 0,
  tests_graded_count integer NOT NULL DEFAULT 0,
  emails_sent_count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_org_billing_month UNIQUE (org_id, billing_month)
);

CREATE OR REPLACE FUNCTION public.increment_org_usage(
  p_org_id uuid,
  p_month text,
  p_ai_reqs integer DEFAULT 0,
  p_groq_tokens bigint DEFAULT 0,
  p_gemini_tokens bigint DEFAULT 0,
  p_tests_graded integer DEFAULT 0,
  p_emails integer DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.org_usage_monthly (
    org_id,
    billing_month,
    ai_requests_count,
    groq_tokens_used,
    gemini_tokens_used,
    tests_graded_count,
    emails_sent_count,
    updated_at
  )
  VALUES (
    p_org_id,
    p_month,
    GREATEST(0, p_ai_reqs),
    GREATEST(0, p_groq_tokens),
    GREATEST(0, p_gemini_tokens),
    GREATEST(0, p_tests_graded),
    GREATEST(0, p_emails),
    now()
  )
  ON CONFLICT (org_id, billing_month)
  DO UPDATE SET
    ai_requests_count = public.org_usage_monthly.ai_requests_count + EXCLUDED.ai_requests_count,
    groq_tokens_used = public.org_usage_monthly.groq_tokens_used + EXCLUDED.groq_tokens_used,
    gemini_tokens_used = public.org_usage_monthly.gemini_tokens_used + EXCLUDED.gemini_tokens_used,
    tests_graded_count = public.org_usage_monthly.tests_graded_count + EXCLUDED.tests_graded_count,
    emails_sent_count = public.org_usage_monthly.emails_sent_count + EXCLUDED.emails_sent_count,
    updated_at = now();
END;
$$;

-- 3. Invoices, Contracts, System Incidents & Demo Leads
CREATE TABLE IF NOT EXISTS public.org_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text UNIQUE NOT NULL,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  billing_month text NOT NULL,
  plan_name text NOT NULL,
  subtotal_inr numeric(10,2) NOT NULL DEFAULT 0,
  gst_inr numeric(10,2) NOT NULL DEFAULT 0,
  total_inr numeric(10,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'DUE' CHECK (status IN ('PAID', 'DUE', 'OVERDUE')),
  due_date date,
  paid_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.org_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_number text UNIQUE NOT NULL,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  legal_entity_name text NOT NULL,
  registered_address text NOT NULL,
  gstin text,
  signatory_name text NOT NULL,
  signatory_designation text NOT NULL,
  signatory_email text NOT NULL,
  plan_tier text NOT NULL DEFAULT 'PILOT',
  fee_inr numeric(10,2) NOT NULL DEFAULT 0,
  billing_cycle text NOT NULL DEFAULT 'MONTHLY',
  effective_date date NOT NULL DEFAULT CURRENT_DATE,
  expiry_date date,
  signed_at timestamptz NOT NULL DEFAULT now(),
  signer_ip text,
  signature_svg text,
  document_sha256 text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.system_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  severity text NOT NULL CHECK (severity IN ('CRITICAL', 'WARNING', 'INFO')),
  category text NOT NULL CHECK (category IN ('SUPABASE_DB', 'AUTH_SECURITY', 'RATE_LIMIT', 'AI_ROUTER', 'WORKER_CRASH', 'ANTI_CHEAT')),
  org_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  error_code text,
  message text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.demo_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  college_name text NOT NULL,
  designation text,
  student_count integer DEFAULT 0,
  notes text,
  status text NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW', 'CONTACTED', 'CONVERTED', 'ARCHIVED')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Realtime Publication
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.system_incidents;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.organizations;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.demo_leads;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;

-- 4. Row Level Security Policies
ALTER TABLE public.service_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_usage_monthly ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_leads ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND global_role = 'SUPER_ADMIN'
  );
$$;

CREATE POLICY "Anyone authenticated can read rates" ON public.service_rates
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Super admins can manage rates" ON public.service_rates
  FOR ALL TO authenticated USING (public.is_super_admin());

CREATE POLICY "Super admins have full usage access" ON public.org_usage_monthly
  FOR ALL TO authenticated USING (public.is_super_admin());

CREATE POLICY "Org admins can read their usage" ON public.org_usage_monthly
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.org_users
      WHERE org_users.org_id = org_usage_monthly.org_id
        AND org_users.user_id = auth.uid()
        AND org_users.role = 'ORG_ADMIN'
    )
  );

CREATE POLICY "Super admins full access invoices" ON public.org_invoices
  FOR ALL TO authenticated USING (public.is_super_admin());

CREATE POLICY "Org admins read own invoices" ON public.org_invoices
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.org_users
      WHERE org_users.org_id = org_invoices.org_id
        AND org_users.user_id = auth.uid()
        AND org_users.role = 'ORG_ADMIN'
    )
  );

CREATE POLICY "Super admins full access contracts" ON public.org_contracts
  FOR ALL TO authenticated USING (public.is_super_admin());

CREATE POLICY "Org admins read own contracts" ON public.org_contracts
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.org_users
      WHERE org_users.org_id = org_contracts.org_id
        AND org_users.user_id = auth.uid()
        AND org_users.role = 'ORG_ADMIN'
    )
  );

CREATE POLICY "Super admins full access incidents" ON public.system_incidents
  FOR ALL TO authenticated USING (public.is_super_admin());

CREATE POLICY "Authenticated can insert telemetry incident" ON public.system_incidents
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Super admins full access demo_leads" ON public.demo_leads
  FOR ALL TO authenticated USING (public.is_super_admin());

CREATE POLICY "Anyone can insert demo_lead" ON public.demo_leads
  FOR INSERT TO anon, authenticated WITH CHECK (true);
