import { supabase } from '@colformly/auth';

const WORKER_BASE =
  (import.meta.env.VITE_CLOUDFLARE_WORKER_URL as string | undefined) ||
  (typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:8787'
    : 'https://colformly-worker.edgecors.workers.dev');

export interface GeneratedQuestion {
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
  topicTag: string;
}

export interface QuestionBreakdown {
  questionNumber: number;
  topic: string;
  questionText: string;
  studentAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  marksAwarded: number;
  maxMarks: number;
  explanation?: string;
}

export interface GradedPaperResult {
  success: boolean;
  testId: string;
  studentId: string;
  score: number;
  total: number;
  percentage: number;
  status: 'GRADED';
  questionBreakdown: QuestionBreakdown[];
  weakTopics: string[];
  teacherBlessing: string;
  signatureOverlaySvg: string;
  gradedAt: string;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/**
 * 1. AI Question Generator (Teacher/Admin only)
 */
export async function generateQuestionsApi(params: {
  topic: string;
  count?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  syllabusNotes?: string;
}): Promise<{ questions: GeneratedQuestion[]; provider: string }> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${WORKER_BASE}/api/ai/generate-questions`, {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error || `Failed to generate questions: HTTP ${res.status}`);
  }

  const data = (await res.json()) as { questions: GeneratedQuestion[]; provider: string };
  return data;
}

/**
 * 2. Automated Paper Grading with Anti-Cheat Telemetry
 */
export async function gradePaperApi(params: {
  testId: string;
  answers: Record<string, string>;
  antiCheatLogs?: Array<{ type: string; timestamp: string; details?: string }>;
}): Promise<GradedPaperResult> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${WORKER_BASE}/api/grade-paper`, {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error || `Grading submission failed: HTTP ${res.status}`);
  }

  const data = (await res.json()) as GradedPaperResult;
  return data;
}

/**
 * 3. AI Mistake Explainer (Real-life / Summarize / Hinglish)
 */
export async function explainAnswerApi(params: {
  question: string;
  studentAnswer: string;
  correctAnswer: string;
  mode?: 'real_life' | 'summarize' | 'hinglish';
}): Promise<{ explanation: string; provider: string }> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${WORKER_BASE}/api/ai/explain-answer`, {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error || `Explanation failed: HTTP ${res.status}`);
  }

  const data = (await res.json()) as { explanation: string; provider: string };
  return data;
}
