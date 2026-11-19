import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { supabaseAuthMiddleware, type AuthUser } from './middleware/auth';
import { explainWrongAnswer, generateExamQuestions, type AiEnv } from './ai';
import { gradeStudentPaper, type GradingEnv } from './services/grading';

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
    version: '2.4.0',
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

// ── Protected API Routes ────────────────────────────────────────
app.use('/api/*', supabaseAuthMiddleware);

// 1. POST /api/ai/generate-questions (Teacher / Admin only)
app.post('/api/ai/generate-questions', async (c) => {
  const user = c.get('user');

  // Verify caller is a teacher or admin
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

  try {
    const body = await c.req.json<{
      topic: string;
      count?: number;
      difficulty?: 'easy' | 'medium' | 'hard';
      syllabusNotes?: string;
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

    const { questions, provider } = await generateExamQuestions(
      body.topic.trim(),
      body.count || 2,
      body.difficulty || 'medium',
      body.syllabusNotes,
      aiEnv,
    );

    return c.json({
      success: true,
      topic: body.topic.trim(),
      count: questions.length,
      provider,
      questions,
    });
  } catch (err) {
    console.error('Error in /api/ai/generate-questions:', err);
    return c.json(
      { error: err instanceof Error ? err.message : 'Question generation failed' },
      500,
    );
  }
});

// 2. POST /api/grade-paper (Student submission grading)
app.post('/api/grade-paper', async (c) => {
  const user = c.get('user');

  try {
    const body = await c.req.json<{
      testId: string;
      answers: Record<string, string>;
      antiCheatLogs?: Array<{ type: string; timestamp: string; details?: string }>;
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

    return c.json({
      success: true,
      ...result,
    });
  } catch (err) {
    console.error('Error in /api/grade-paper:', err);
    return c.json(
      { error: err instanceof Error ? err.message : 'Paper grading failed' },
      500,
    );
  }
});

// 3. POST /api/ai/explain-answer (Student BYOC / Fallback explainer)
app.post('/api/ai/explain-answer', async (c) => {
  try {
    const body = await c.req.json<{
      question: string;
      studentAnswer: string;
      correctAnswer: string;
      mode?: 'real_life' | 'summarize' | 'hinglish';
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

    return c.json({
      success: true,
      mode: body.mode || 'real_life',
      provider,
      explanation,
    });
  } catch (err) {
    console.error('Error in /api/ai/explain-answer:', err);
    return c.json(
      { error: err instanceof Error ? err.message : 'Explanation generation failed' },
      500,
    );
  }
});

export default app;
