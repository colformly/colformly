import { supabase } from '@colformly/auth';

const WORKER_BASE =
  (import.meta.env.VITE_CLOUDFLARE_WORKER_URL as string | undefined) ||
  (typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:8787'
    : 'https://colformly-worker.colformly.workers.dev');

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

/**
 * 4. Multi-Tenant Session Resolution & Domain Authorization Gate
 */
export interface ResolveSessionResult {
  authorized: boolean;
  role?: string;
  orgId?: string | null;
  org?: any;
  isNewMember?: boolean;
  source?: string;
  reason?: 'DOMAIN_NOT_AUTHORIZED' | 'WORKSPACE_SUSPENDED' | 'INVALID_SESSION' | string;
  email?: string;
  domain?: string;
  message?: string;
}

export async function resolveSessionApi(): Promise<ResolveSessionResult> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${WORKER_BASE}/api/auth/resolve-session`, {
    method: 'POST',
    headers,
    body: JSON.stringify({}),
  });

  const data = (await res.json().catch(() => ({}))) as ResolveSessionResult;
  return data;
}

/**
 * 5. Faculty / Teacher Provisioning (Google Invite or Password Auth)
 */
export interface AddTeacherParams {
  orgId?: string;
  email: string;
  fullName?: string;
  department?: string;
  sectionId?: string;
  subjectName?: string;
  authMode: 'GOOGLE' | 'PASSWORD';
  password?: string;
}

export async function addTeacherApi(params: AddTeacherParams): Promise<{
  success: boolean;
  mode: string;
  message: string;
  teacher: any;
}> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${WORKER_BASE}/api/org/teachers/add`, {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error || `Failed to add teacher: HTTP ${res.status}`);
  }
  return json;
}

/**
 * 6. Organization Settings Update (Enforces Delegation Policy Locks)
 */
export async function updateOrgSettingsApi(params: Record<string, any>): Promise<{
  success: boolean;
  org: any;
}> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${WORKER_BASE}/api/org/settings`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(params),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error || json.message || `Failed to update settings: HTTP ${res.status}`);
  }
  return json;
}

/**
 * 7. Google Workspace Connection & Status
 */
export async function getGoogleStatusApi(): Promise<{
  connected: boolean;
  googleEmail?: string;
  scopes?: string[];
  updatedAt?: string;
}> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${WORKER_BASE}/api/google/status`, {
    method: 'GET',
    headers,
  });

  const data = await res.json().catch(() => ({ connected: false }));
  return data;
}

export async function connectGoogleApi(
  code: string,
  redirectUri: string,
): Promise<{ success: boolean; googleEmail?: string; scopes?: string[] }> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${WORKER_BASE}/api/google/connect`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ code, redirectUri }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Failed to connect Google account');
  }
  return data;
}

/**
 * 8. Sync Test with Google Drive & Google Forms
 */
export async function syncTestGoogleFormApi(testId: string): Promise<{
  success: boolean;
  googleFormId: string;
  driveFolderId: string;
  formResponderUrl: string;
  responsesEditUrl: string;
  linkedSheetId?: string | null;
  entryMap: Record<string, string>;
}> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${WORKER_BASE}/api/tests/${encodeURIComponent(testId)}/sync-google-form`, {
    method: 'POST',
    headers,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Failed to sync Google Form');
  }
  return data;
}

/**
 * 9. Verify Google Form Linked Sheet
 */
export async function verifyTestSheetApi(testId: string): Promise<{
  verified: boolean;
  linkedSheetId?: string;
  responsesEditUrl?: string;
  message: string;
}> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${WORKER_BASE}/api/tests/${encodeURIComponent(testId)}/verify-sheet`, {
    method: 'GET',
    headers,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok && data.verified !== false) {
    throw new Error(data.error || 'Failed to verify sheet link');
  }
  return data;
}

/**
 * 10. Fetch Server-Generated Google OAuth Authorization URL
 */
export async function getGoogleAuthUrlApi(redirectUri: string): Promise<string> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${WORKER_BASE}/api/google/auth-url?redirectUri=${encodeURIComponent(redirectUri)}`, {
    method: 'GET',
    headers,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.authUrl) {
    throw new Error(data.error || 'Failed to retrieve Google auth URL from worker');
  }
  return data.authUrl;
}

/**
 * 11. Assign Teacher to Section/Course with Subject & Semester
 */
export async function assignTeacherApi(params: {
  orgId?: string;
  teacherId: string;
  sectionId: string;
  subjectName: string;
  academicYear?: string;
  semester?: number;
}): Promise<{ success: boolean; message: string; assignment: any }> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${WORKER_BASE}/api/org/teachers/assign`, {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Failed to assign teacher');
  }
  return data;
}

/**
 * 12. Delete Teacher Assignment
 */
export async function deleteTeacherAssignmentApi(assignmentId: string): Promise<{ success: boolean; message: string }> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${WORKER_BASE}/api/org/teachers/assign/${encodeURIComponent(assignmentId)}`, {
    method: 'DELETE',
    headers,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Failed to delete assignment');
  }
  return data;
}
