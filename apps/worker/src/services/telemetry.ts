export interface TelemetryEnv {
  SUPABASE_URL: string;
  SUPABASE_SECRET_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SUPABASE_PUBLISHABLE_KEY?: string;
  SUPABASE_ANON_KEY?: string;
}

export interface IncrementUsageParams {
  orgId: string;
  month?: string; // YYYY-MM
  aiReqs?: number;
  groqTokens?: number;
  geminiTokens?: number;
  testsGraded?: number;
  emails?: number;
}

export interface ReportIncidentParams {
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  category: 'SUPABASE_DB' | 'AUTH_SECURITY' | 'RATE_LIMIT' | 'AI_ROUTER' | 'WORKER_CRASH' | 'ANTI_CHEAT';
  orgId?: string | null;
  errorCode?: string | null;
  message: string;
  payload?: Record<string, unknown>;
}

function getSecretKey(env: TelemetryEnv): string {
  return (
    env.SUPABASE_SECRET_KEY ||
    env.SUPABASE_SERVICE_ROLE_KEY ||
    env.SUPABASE_PUBLISHABLE_KEY ||
    env.SUPABASE_ANON_KEY ||
    'sb_publishable_t9dfV3HzxY50ZwkiumiD_w_RurnQuC4'
  );
}

export async function incrementOrgUsageAsync(
  env: TelemetryEnv,
  params: IncrementUsageParams,
): Promise<void> {
  try {
    const supabaseUrl = env.SUPABASE_URL || 'https://crprffwlfngyiyztwgwb.supabase.co';
    const key = getSecretKey(env);
    const month = params.month || new Date().toISOString().slice(0, 7);

    await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/rpc/increment_org_usage`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        p_org_id: params.orgId,
        p_month: month,
        p_ai_reqs: params.aiReqs || 0,
        p_groq_tokens: params.groqTokens || 0,
        p_gemini_tokens: params.geminiTokens || 0,
        p_tests_graded: params.testsGraded || 0,
        p_emails: params.emails || 0,
      }),
    });
  } catch (err) {
    console.warn('Async usage metering telemetry warning:', err);
  }
}

export async function reportSystemIncidentAsync(
  env: TelemetryEnv,
  params: ReportIncidentParams,
): Promise<void> {
  try {
    const supabaseUrl = env.SUPABASE_URL || 'https://crprffwlfngyiyztwgwb.supabase.co';
    const key = getSecretKey(env);

    await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/system_incidents`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        severity: params.severity,
        category: params.category,
        org_id: params.orgId || null,
        error_code: params.errorCode || null,
        message: params.message,
        payload: params.payload || {},
      }),
    });
  } catch (err) {
    console.warn('Async incident logging telemetry warning:', err);
  }
}
