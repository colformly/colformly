import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { supabaseAuthMiddleware, type AuthUser } from './middleware/auth';
import { explainWrongAnswer, generateExamQuestions, type AiEnv } from './ai';
import { gradeStudentPaper, type GradingEnv } from './services/grading';
import {
  incrementOrgUsageAsync,
  reportSystemIncidentAsync,
  type TelemetryEnv,
} from './services/telemetry';
import {
  provisionOrganization,
  handoverOrganization,
  type ProvisionOrgParams,
  type HandoverOrgParams,
} from './services/superAdmin';

export type Bindings = {
  SUPABASE_URL: string;
  SUPABASE_PUBLISHABLE_KEY?: string;
  SUPABASE_ANON_KEY?: string;
  SUPABASE_SECRET_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  GROQ_API_KEYS?: string;
  GROQ_API_KEY?: string;
  GEMINI_API_KEYS?: string;
  GEMINI_API_KEY?: string;
};

export type Variables = {
  user: AuthUser;
};

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// ── Strict Multi-Origin CORS ────────────────────────────────────
const ALLOWED_ORIGINS = [
  'https://colformly.pages.dev',
  'https://colformly-org.pages.dev',
  'https://colformly-super-admin.pages.dev',
];

app.use(
  '*',
  cors({
    origin: (origin) => {
      if (!origin) return ALLOWED_ORIGINS[0];
      if (ALLOWED_ORIGINS.includes(origin)) return origin;
      if (/^http:\/\/localhost(:\d+)?$/.test(origin)) return origin;
      if (/^http:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) return origin;
      return null;
    },
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'apikey'],
    maxAge: 86400,
    credentials: true,
  }),
);

// ── Public Health & Root Endpoints ──────────────────────────────
app.get('/', (c) => {
  return c.json({
    status: 'online',
    service: 'colformly-worker',
    runtime: 'Cloudflare Workers (Hono)',
    version: '3.0.0-prime',
    region: 'ap-south-1',
    timestamp: new Date().toISOString(),
  });
});

app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

app.get('/health/keep-alive', async (c) => {
  const targetUrls = [
    'https://colformly-ga4-service.onrender.com/health',
    'https://colformly-ga4.onrender.com/health',
  ];
  const results = await Promise.allSettled(
    targetUrls.map(async (url) => {
      const start = Date.now();
      const res = await fetch(url, { headers: { 'User-Agent': 'Colformly-Worker-Keeper/1.0' } });
      const text = await res.text();
      return { url, status: res.status, durationMs: Date.now() - start, response: text };
    }),
  );
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    results: results.map((r) => (r.status === 'fulfilled' ? r.value : { error: String(r.reason) })),
  });
});

// ── Protected API Routes ────────────────────────────────────────
app.use('/api/*', supabaseAuthMiddleware);

// 1. POST /api/ai/generate-questions (Teacher / Admin only)
app.post('/api/ai/generate-questions', async (c) => {
  const user = c.get('user');

  const isAuthorizedRole =
    user.role === 'TEACHER' ||
    user.role === 'ORG_ADMIN' ||
    user.role === 'SUPER_ADMIN';

  if (!isAuthorizedRole) {
    return c.json(
      {
        error: 'Forbidden: Only faculty and administrators can invoke the AI Question Generator.',
        userRole: user.role,
      },
      403,
    );
  }

  const telemetryEnv: TelemetryEnv = {
    SUPABASE_URL: c.env.SUPABASE_URL || 'https://crprffwlfngyiyztwgwb.supabase.co',
    SUPABASE_SECRET_KEY: c.env.SUPABASE_SECRET_KEY || c.env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_SERVICE_ROLE_KEY: c.env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_PUBLISHABLE_KEY: c.env.SUPABASE_PUBLISHABLE_KEY || c.env.SUPABASE_ANON_KEY,
    SUPABASE_ANON_KEY: c.env.SUPABASE_ANON_KEY,
  };

  try {
    const body = await c.req.json<{
      topic: string;
      count?: number;
      difficulty?: 'easy' | 'medium' | 'hard';
      syllabusNotes?: string;
      orgId?: string;
    }>();

    if (!body?.topic?.trim()) {
      return c.json({ error: 'Missing required field: "topic"' }, 400);
    }

    const aiEnv: AiEnv = {
      GROQ_API_KEYS: c.env.GROQ_API_KEYS,
      GROQ_API_KEY: c.env.GROQ_API_KEY,
      GEMINI_API_KEYS: c.env.GEMINI_API_KEYS,
      GEMINI_API_KEY: c.env.GEMINI_API_KEY,
    };

    const count = body.count || 2;
    const { questions, provider } = await generateExamQuestions(
      body.topic.trim(),
      count,
      body.difficulty || 'medium',
      body.syllabusNotes,
      aiEnv,
    );

    // Async telemetry: Increment usage with ZERO exam latency
    const targetOrgId = body.orgId || 'a0000000-0000-0000-0000-000000000001';
    c.executionCtx.waitUntil(
      incrementOrgUsageAsync(telemetryEnv, {
        orgId: targetOrgId,
        aiReqs: 1,
        groqTokens: provider === 'groq' ? count * 350 : 0,
        geminiTokens: provider === 'gemini' ? count * 350 : 0,
      }),
    );

    return c.json({
      success: true,
      topic: body.topic.trim(),
      count: questions.length,
      provider,
      questions,
    });
  } catch (err: any) {
    console.error('Error in /api/ai/generate-questions:', err);

    // Asynchronously log incident
    c.executionCtx.waitUntil(
      reportSystemIncidentAsync(telemetryEnv, {
        severity: 'WARNING',
        category: 'AI_ROUTER',
        message: `Question generation failed: ${err.message}`,
        payload: { error: String(err) },
      }),
    );

    return c.json(
      { error: err instanceof Error ? err.message : 'Question generation failed' },
      500,
    );
  }
});

// 2. POST /api/grade-paper (Student submission grading)
app.post('/api/grade-paper', async (c) => {
  const user = c.get('user');

  const telemetryEnv: TelemetryEnv = {
    SUPABASE_URL: c.env.SUPABASE_URL || 'https://crprffwlfngyiyztwgwb.supabase.co',
    SUPABASE_SECRET_KEY: c.env.SUPABASE_SECRET_KEY || c.env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_SERVICE_ROLE_KEY: c.env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_PUBLISHABLE_KEY: c.env.SUPABASE_PUBLISHABLE_KEY || c.env.SUPABASE_ANON_KEY,
    SUPABASE_ANON_KEY: c.env.SUPABASE_ANON_KEY,
  };

  try {
    const body = await c.req.json<{
      testId: string;
      answers: Record<string, string>;
      antiCheatLogs?: Array<{ type: string; timestamp: string; details?: string }>;
      orgId?: string;
    }>();

    if (!body?.testId) {
      return c.json({ error: 'Missing required field: "testId"' }, 400);
    }

    const gradingEnv: GradingEnv = {
      SUPABASE_URL: c.env.SUPABASE_URL || 'https://crprffwlfngyiyztwgwb.supabase.co',
      SUPABASE_SECRET_KEY: c.env.SUPABASE_SECRET_KEY || c.env.SUPABASE_SERVICE_ROLE_KEY,
      SUPABASE_SERVICE_ROLE_KEY: c.env.SUPABASE_SERVICE_ROLE_KEY,
      SUPABASE_PUBLISHABLE_KEY: c.env.SUPABASE_PUBLISHABLE_KEY || c.env.SUPABASE_ANON_KEY,
      SUPABASE_ANON_KEY: c.env.SUPABASE_ANON_KEY,
    };

    const result = await gradeStudentPaper(
      body.testId,
      user.id,
      body.answers || {},
      body.antiCheatLogs || [],
      gradingEnv,
    );

    // Asynchronously record graded test counter
    const targetOrgId = body.orgId || result.orgId || 'a0000000-0000-0000-0000-000000000001';
    c.executionCtx.waitUntil(
      incrementOrgUsageAsync(telemetryEnv, {
        orgId: targetOrgId,
        testsGraded: 1,
      }),
    );

    // If severe anti-cheat logs detected, log an anti-cheat incident
    if (body.antiCheatLogs && body.antiCheatLogs.length >= 3) {
      c.executionCtx.waitUntil(
        reportSystemIncidentAsync(telemetryEnv, {
          severity: 'INFO',
          category: 'ANTI_CHEAT',
          orgId: targetOrgId,
          message: `Student ${user.email} triggered ${body.antiCheatLogs.length} anti-cheat integrity flags during test ${body.testId}`,
          payload: { flagsCount: body.antiCheatLogs.length, flags: body.antiCheatLogs },
        }),
      );
    }

    return c.json({
      success: true,
      ...result,
    });
  } catch (err: any) {
    console.error('Error in /api/grade-paper:', err);

    c.executionCtx.waitUntil(
      reportSystemIncidentAsync(telemetryEnv, {
        severity: 'CRITICAL',
        category: 'WORKER_CRASH',
        message: `Paper grading error: ${err.message}`,
        payload: { error: String(err) },
      }),
    );

    return c.json(
      { error: err instanceof Error ? err.message : 'Paper grading failed' },
      500,
    );
  }
});

// 3. POST /api/ai/explain-answer (Student BYOC / Fallback explainer)
app.post('/api/ai/explain-answer', async (c) => {
  const telemetryEnv: TelemetryEnv = {
    SUPABASE_URL: c.env.SUPABASE_URL || 'https://crprffwlfngyiyztwgwb.supabase.co',
    SUPABASE_SECRET_KEY: c.env.SUPABASE_SECRET_KEY || c.env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_SERVICE_ROLE_KEY: c.env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_PUBLISHABLE_KEY: c.env.SUPABASE_PUBLISHABLE_KEY || c.env.SUPABASE_ANON_KEY,
    SUPABASE_ANON_KEY: c.env.SUPABASE_ANON_KEY,
  };

  try {
    const body = await c.req.json<{
      question: string;
      studentAnswer: string;
      correctAnswer: string;
      mode?: 'real_life' | 'summarize' | 'hinglish';
      orgId?: string;
    }>();

    if (!body?.question || !body?.correctAnswer) {
      return c.json(
        { error: 'Missing required fields: "question" and "correctAnswer"' },
        400,
      );
    }

    const aiEnv: AiEnv = {
      GROQ_API_KEYS: c.env.GROQ_API_KEYS,
      GROQ_API_KEY: c.env.GROQ_API_KEY,
      GEMINI_API_KEYS: c.env.GEMINI_API_KEYS,
      GEMINI_API_KEY: c.env.GEMINI_API_KEY,
    };

    const { explanation, provider } = await explainWrongAnswer(
      body.question,
      body.studentAnswer || '[No Answer]',
      body.correctAnswer,
      body.mode || 'real_life',
      aiEnv,
    );

    const targetOrgId = body.orgId || 'a0000000-0000-0000-0000-000000000001';
    c.executionCtx.waitUntil(
      incrementOrgUsageAsync(telemetryEnv, {
        orgId: targetOrgId,
        aiReqs: 1,
        groqTokens: provider === 'groq' ? 250 : 0,
        geminiTokens: provider === 'gemini' ? 250 : 0,
      }),
    );

    return c.json({
      success: true,
      mode: body.mode || 'real_life',
      provider,
      explanation,
    });
  } catch (err: any) {
    console.error('Error in /api/ai/explain-answer:', err);
    return c.json(
      { error: err instanceof Error ? err.message : 'Explanation generation failed' },
      500,
    );
  }
});

// 4. POST /api/telemetry/report (Frontend error & incident ingestion)
app.post('/api/telemetry/report', async (c) => {
  const user = c.get('user');

  try {
    const body = await c.req.json<{
      severity: 'CRITICAL' | 'WARNING' | 'INFO';
      category: 'SUPABASE_DB' | 'AUTH_SECURITY' | 'RATE_LIMIT' | 'AI_ROUTER' | 'WORKER_CRASH' | 'ANTI_CHEAT';
      message: string;
      orgId?: string;
      errorCode?: string;
      payload?: Record<string, unknown>;
    }>();

    if (!body?.message || !body?.category || !body?.severity) {
      return c.json({ error: 'Missing required incident fields: severity, category, message' }, 400);
    }

    const telemetryEnv: TelemetryEnv = {
      SUPABASE_URL: c.env.SUPABASE_URL || 'https://crprffwlfngyiyztwgwb.supabase.co',
      SUPABASE_SECRET_KEY: c.env.SUPABASE_SECRET_KEY || c.env.SUPABASE_SERVICE_ROLE_KEY,
      SUPABASE_SERVICE_ROLE_KEY: c.env.SUPABASE_SERVICE_ROLE_KEY,
      SUPABASE_PUBLISHABLE_KEY: c.env.SUPABASE_PUBLISHABLE_KEY || c.env.SUPABASE_ANON_KEY,
      SUPABASE_ANON_KEY: c.env.SUPABASE_ANON_KEY,
    };

    c.executionCtx.waitUntil(
      reportSystemIncidentAsync(telemetryEnv, {
        severity: body.severity,
        category: body.category,
        orgId: body.orgId || null,
        errorCode: body.errorCode || null,
        message: `[Reported by ${user.email}] ${body.message}`,
        payload: body.payload || {},
      }),
    );

    return c.json({ success: true, reported: true });
  } catch (err: any) {
    return c.json({ error: err.message || 'Telemetry ingestion failed' }, 500);
  }
});

// 5. POST /api/super-admin/provision-org (Super Admin only)
app.post('/api/super-admin/provision-org', async (c) => {
  const user = c.get('user');

  if (user.role !== 'SUPER_ADMIN') {
    return c.json({ error: 'Forbidden: Super Admin root privileges required' }, 403);
  }

  const telemetryEnv: TelemetryEnv = {
    SUPABASE_URL: c.env.SUPABASE_URL || 'https://crprffwlfngyiyztwgwb.supabase.co',
    SUPABASE_SECRET_KEY: c.env.SUPABASE_SECRET_KEY || c.env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_SERVICE_ROLE_KEY: c.env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_PUBLISHABLE_KEY: c.env.SUPABASE_PUBLISHABLE_KEY || c.env.SUPABASE_ANON_KEY,
    SUPABASE_ANON_KEY: c.env.SUPABASE_ANON_KEY,
  };

  try {
    const body = await c.req.json<ProvisionOrgParams>();
    if (!body?.name?.trim() || !body?.setupEmail?.trim()) {
      return c.json({ error: 'Missing required fields: name and setupEmail' }, 400);
    }

    const result = await provisionOrganization(telemetryEnv, body);
    return c.json(result);
  } catch (err: any) {
    console.error('Super Admin Provision Error:', err);

    c.executionCtx.waitUntil(
      reportSystemIncidentAsync(telemetryEnv, {
        severity: 'CRITICAL',
        category: 'SUPABASE_DB',
        message: `Provision organization failed: ${err.message}`,
        payload: { error: String(err) },
      }),
    );

    return c.json(
      { success: false, error: err.message || 'Failed to provision organization' },
      400,
    );
  }
});

// 6. POST /api/super-admin/handover-org (Ghost Handover — Super Admin only)
app.post('/api/super-admin/handover-org', async (c) => {
  const user = c.get('user');

  if (user.role !== 'SUPER_ADMIN') {
    return c.json({ error: 'Forbidden: Super Admin root privileges required' }, 403);
  }

  const telemetryEnv: TelemetryEnv = {
    SUPABASE_URL: c.env.SUPABASE_URL || 'https://crprffwlfngyiyztwgwb.supabase.co',
    SUPABASE_SECRET_KEY: c.env.SUPABASE_SECRET_KEY || c.env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_SERVICE_ROLE_KEY: c.env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_PUBLISHABLE_KEY: c.env.SUPABASE_PUBLISHABLE_KEY || c.env.SUPABASE_ANON_KEY,
    SUPABASE_ANON_KEY: c.env.SUPABASE_ANON_KEY,
  };

  try {
    const body = await c.req.json<HandoverOrgParams>();
    if (!body?.orgId || !body?.clientAdminEmail?.trim()) {
      return c.json({ error: 'Missing required fields: orgId and clientAdminEmail' }, 400);
    }

    const result = await handoverOrganization(telemetryEnv, body);
    return c.json(result);
  } catch (err: any) {
    console.error('Super Admin Handover Error:', err);
    return c.json({ error: err.message || 'Failed to execute ghost handover' }, 500);
  }
});

export default {
  fetch: app.fetch,
  async scheduled(_event: any, _env: Bindings, ctx: any) {
    const urls = [
      'https://colformly-ga4-service.onrender.com/health',
      'https://colformly-ga4.onrender.com/health',
    ];
    ctx.waitUntil(
      Promise.allSettled(
        urls.map((url) =>
          fetch(url, { headers: { 'User-Agent': 'Colformly-Worker-Cron/1.0' } })
            .then((r) => r.text())
            .then((t) => console.log(`[Worker Cron] Keep-alive ping ${url} ->`, t))
            .catch((err) => console.warn(`[Worker Cron] Keep-alive ping ${url} failed:`, err.message)),
        ),
      ),
    );
  },
};
