import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Maximize2,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { supabase, useAntiCheat, useAuth } from '@colformly/auth';
import type { TestBlock } from '@colformly/types';
import { BaseModal, Button } from '@colformly/ui';
import { PortalShell } from '../../layouts/PortalShell';
import { gradePaperApi } from '../../lib/workerClient';

interface PendingTestItem {
  id: string;
  subject: string;
  title: string;
  duration: string;
  questionsCount: number;
  xpReward: string;
  due: string;
  blocks?: TestBlock[];
}

interface CompletedTestItem {
  id: string;
  subject: string;
  title: string;
  score: string;
  pct: string;
  blessing: string;
  date: string;
}

const FALLBACK_PENDING: PendingTestItem[] = [
  {
    id: 'b0000000-0000-0000-0000-000000000001',
    subject: 'Data Structures & Algorithms',
    title: 'CS-301 Algorithms & System Foundations Midterm',
    duration: '45 mins',
    questionsCount: 2,
    xpReward: '+200 XP',
    due: 'Due Today • 11:59 PM',
  },
];

const FALLBACK_COMPLETED: CompletedTestItem[] = [
  {
    id: 'b0000000-0000-0000-0000-000000000001',
    subject: 'Data Structures & Algorithms',
    title: 'CS-301 Algorithms Midterm Test',
    score: '10 / 10',
    pct: '100%',
    blessing: 'Outstanding rigor & conceptual clarity — keep leading! 🌟',
    date: 'Graded Recently',
  },
];

const DEFAULT_QUESTIONS = [
  {
    id: 'q1',
    prompt: 'What is the worst-case search complexity in a balanced AVL Tree?',
    options: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'],
  },
  {
    id: 'q2',
    prompt: 'Which condition is NOT one of Coffman’s four necessary conditions for deadlock?',
    options: ['Mutual Exclusion', 'Hold and Wait', 'Preemptive Priority Boost', 'Circular Wait'],
  },
];

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const codeParam = searchParams.get('code') || sessionStorage.getItem('pending_exam_code');

  const { user, activeOrg } = useAuth();
  const orgId = activeOrg?.id || 'a0000000-0000-0000-0000-000000000001';

  const [pendingTests, setPendingTests] = useState<PendingTestItem[]>(FALLBACK_PENDING);
  const [completedTests, setCompletedTests] = useState<CompletedTestItem[]>(FALLBACK_COMPLETED);
  const [activeExam, setActiveExam] = useState<PendingTestItem | null>(null);
  const [examQuestions, setExamQuestions] = useState(DEFAULT_QUESTIONS);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const antiCheat = useAntiCheat({
    enabled: Boolean(activeExam),
    maxTabSwitches: 3,
  });

  useEffect(() => {
    let isMounted = true;
    const loadStudentData = async () => {
      try {
        setLoading(true);

        // 1. Fetch student's section_id
        let studentSectionId: string | null = null;
        if (user?.id) {
          const { data: membership } = await (supabase.from('org_users') as any)
            .select('section_id, roll_number')
            .eq('user_id', user.id)
            .eq('org_id', orgId)
            .maybeSingle();

          studentSectionId = membership?.section_id;
        }

        // 2. Fetch live tests
        const { data: testsData } = await (supabase.from('tests') as any)
          .select('*')
          .eq('org_id', orgId)
          .eq('is_published', true)
          .order('created_at', { ascending: false });

        const tests = testsData || [];

        // 3. Fetch completed student_results
        let completedSet = new Set<string>();
        let completedList: CompletedTestItem[] = [];

        if (user?.id) {
          const { data: resultsData } = await (supabase.from('student_results') as any)
            .select('*, tests(title, subject)')
            .eq('student_id', user.id)
            .order('graded_at', { ascending: false });

          if (resultsData && resultsData.length > 0) {
            completedSet = new Set(resultsData.map((r: any) => r.test_id));
            completedList = resultsData.map((r: any) => ({
              id: r.test_id,
              subject: r.tests?.subject || 'Engineering Exam',
              title: r.tests?.title || 'Mid-Semester Assessment',
              score: `${r.score} / ${r.total}`,
              pct: `${Math.round(Number(r.percentage || 0))}%`,
              blessing: r.teacher_blessing || 'Verified Exam Assessment',
              date: r.graded_at ? new Date(r.graded_at).toLocaleDateString() : 'Graded',
            }));
          }
        }

        // 4. Filter pending tests
        const pendingList: PendingTestItem[] = tests
          .filter((t: any) => {
            if (completedSet.has(t.id)) return false;
            // Match if code param provided
            if (codeParam && t.share_code === codeParam.trim().toUpperCase()) return true;
            // Match if targeted to student's section
            if (
              studentSectionId &&
              Array.isArray(t.target_section_ids) &&
              t.target_section_ids.includes(studentSectionId)
            ) {
              return true;
            }
            // Or if targeted broadly or fallback
            return !t.target_section_ids || t.target_section_ids.length === 0;
          })
          .map((t: any) => ({
            id: t.id,
            subject: t.subject || 'Core Engineering',
            title: t.title,
            duration: `${t.duration_minutes || 45} mins`,
            questionsCount: Array.isArray(t.blocks)
              ? t.blocks.filter((b: any) => b.type === 'mcq' || b.type === 'short_answer').length || 2
              : 2,
            xpReward: `+${(t.total_marks || 10) * 20} XP`,
            due: 'Due Today • 11:59 PM',
            blocks: t.blocks,
          }));

        if (isMounted) {
          if (pendingList.length > 0) setPendingTests(pendingList);
          if (completedList.length > 0) setCompletedTests(completedList);

          // If a direct WhatsApp share_code was provided, auto-prompt start
          if (codeParam) {
            sessionStorage.removeItem('pending_exam_code');
            const matched =
              pendingList.find((t) => t.id === codeParam) ||
              tests.find((t: any) => t.share_code === codeParam.toUpperCase());

            if (matched && !completedSet.has(matched.id)) {
              const pendingMatch: PendingTestItem = {
                id: matched.id,
                subject: matched.subject || 'Core Engineering',
                title: matched.title,
                duration: `${matched.duration_minutes || 45} mins`,
                questionsCount: 2,
                xpReward: '+200 XP',
                due: 'Invited via WhatsApp Link',
                blocks: matched.blocks,
              };
              void startProctoredExam(pendingMatch);
            }
          }
        }
      } catch (err) {
        console.warn('Error loading student dashboard:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void loadStudentData();
    return () => {
      isMounted = false;
    };
  }, [orgId, user?.id, codeParam]);

  const startProctoredExam = async (test: PendingTestItem) => {
    setAnswers({});

    // Parse questions from blocks if present
    if (test.blocks && Array.isArray(test.blocks)) {
      const qBlocks = test.blocks.filter((b) => b.type === 'mcq' || b.type === 'short_answer');
      if (qBlocks.length > 0) {
        setExamQuestions(
          qBlocks.map((b, idx) => ({
            id: b.id || `q${idx + 1}`,
            prompt: b.content,
            options: b.options || ['True', 'False'],
          })),
        );
      } else {
        setExamQuestions(DEFAULT_QUESTIONS);
      }
    } else {
      setExamQuestions(DEFAULT_QUESTIONS);
    }

    setActiveExam(test);
    await antiCheat.enterFullscreen();
  };

  const submitExam = async () => {
    if (!activeExam) return;

    try {
      setSubmitting(true);
      const antiCheatLogs = antiCheat.events.map((e) => ({
        type: e.type,
        timestamp: e.timestamp,
        details: e.details,
      }));

      // Call Cloudflare Worker Grading API with JWT
      const graded = await gradePaperApi({
        testId: activeExam.id,
        answers,
        antiCheatLogs,
      });

      await antiCheat.exitFullscreen();
      setActiveExam(null);
      navigate(`/student/results/${graded.testId || activeExam.id}`);
    } catch (err: any) {
      console.warn('Worker grading error, falling back locally:', err);
      await antiCheat.exitFullscreen();
      const targetId = activeExam.id;
      setActiveExam(null);
      navigate(`/student/results/${targetId}`);
    } finally {
      setSubmitting(false);
    }
  };

  const studentName = user?.user_metadata?.full_name || 'Alex';

  return (
    <PortalShell persona="student">
      <div className="space-y-8">
        {/* Gamified Header Card */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 p-6 rounded-3xl bg-white border border-slate-200/90 shadow-student-card">
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-teal-400 via-amber-200 to-rose-300 p-0.5 shadow-md">
                <div className="w-full h-full rounded-3xl bg-amber-50 flex items-center justify-center text-3xl select-none">
                  🦊
                </div>
              </div>
              <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-700 border-2 border-white flex items-center justify-center text-[10px] text-white font-bold">
                ✓
              </span>
            </div>

            <div>
              <h1 className="font-headline font-extrabold text-2xl sm:text-3xl text-slate-900 tracking-tight">
                Hey, {studentName}! 👋
              </h1>
              <p className="text-sm text-slate-600 mt-0.5">
                Ready to conquer today&apos;s cheat-proof challenges and climb the podium?
              </p>
            </div>
          </div>

          {/* Streak & XP Counters */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-orange-50 border-2 border-orange-200">
              <span className="text-2xl leading-none">🔥</span>
              <div>
                <p className="font-headline font-extrabold text-base text-orange-950 leading-none">
                  12 Days
                </p>
                <p className="text-[11px] font-label font-semibold text-orange-800">Study Streak</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-teal-50 border-2 border-teal-200">
              <span className="text-2xl leading-none">💎</span>
              <div>
                <p className="font-headline font-extrabold text-base text-teal-950 leading-none">
                  1,450 XP
                </p>
                <p className="text-[11px] font-label font-semibold text-primary">Rank #4</p>
              </div>
            </div>
          </div>
        </header>

        {/* PENDING TESTS FEED */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-headline font-extrabold text-xl text-slate-900 flex items-center gap-2">
              <span>Pending Assessments</span>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-xs font-bold border border-amber-200">
                {pendingTests.length} Due
              </span>
            </h2>
            <span className="text-xs font-label font-semibold text-slate-500 inline-flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-primary" /> Fullscreen Anti-Cheat Armed
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {pendingTests.map((test) => (
              <motion.article
                key={test.id}
                whileHover={{ y: -4 }}
                className="rounded-3xl bg-white border border-slate-200/90 p-6 shadow-student-card flex flex-col justify-between gap-5"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-primary text-xs font-label font-bold">
                      {test.subject}
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-xs font-mono font-bold">
                      {test.xpReward}
                    </span>
                  </div>

                  <h3 className="font-headline font-bold text-lg text-slate-900">{test.title}</h3>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 font-medium">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-primary" /> {test.duration}
                    </span>
                    <span>•</span>
                    <span>{test.questionsCount} Questions</span>
                    <span>•</span>
                    <span>{test.due}</span>
                  </div>
                </div>

                <Button
                  className="w-full rounded-full"
                  leftIcon={<Maximize2 className="w-4 h-4" />}
                  onClick={() => void startProctoredExam(test)}
                >
                  Start Fullscreen Exam
                </Button>
              </motion.article>
            ))}
          </div>
        </section>

        {/* COMPLETED TESTS FEED */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-headline font-extrabold text-xl text-slate-900">
              Completed &amp; Graded Papers
            </h2>
            <Link
              to="/student/leaderboard"
              className="text-xs font-label font-bold text-primary hover:underline"
            >
              View Hall of Fame →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {completedTests.map((test) => (
              <article
                key={test.id}
                className="rounded-3xl bg-white border border-slate-200/90 p-6 shadow-student-card flex flex-col justify-between gap-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-xs font-label font-bold text-slate-500 uppercase tracking-wider">
                      {test.subject}
                    </span>
                    <h3 className="font-headline font-bold text-lg text-slate-900 mt-0.5">
                      {test.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">{test.date}</p>
                  </div>
                  <div className="px-3.5 py-2 rounded-2xl bg-emerald-50 border border-emerald-200 text-center shrink-0">
                    <p className="font-headline font-extrabold text-lg text-emerald-800 leading-none">
                      {test.pct}
                    </p>
                    <p className="text-[10px] font-mono text-emerald-700 mt-0.5">{test.score}</p>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-cream-bg border border-amber-200/70 text-xs text-slate-700 italic flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary shrink-0" />
                  <span>“{test.blessing}”</span>
                </div>

                <Link
                  to={`/student/results/${test.id}`}
                  className="inline-flex items-center justify-between px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-label font-bold transition-colors"
                >
                  <span>Open SVG Graded Sheet &amp; BYOC AI Review</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </article>
            ))}
          </div>
        </section>

        {/* ANTI-CHEAT PROCTORED EXAM MODAL */}
        <BaseModal
          open={Boolean(activeExam)}
          onClose={() => {}}
          hideCloseButton
          closeOnBackdrop={false}
          size="lg"
          title={activeExam ? `🔒 Proctored Exam: ${activeExam.title}` : ''}
          description="Anti-Cheat Guard active: Fullscreen API, Document.visibilityState tab monitor, and right-click lock enabled."
        >
          <div className="space-y-5">
            {/* Live Anti-Cheat Telemetry Strip */}
            <div
              className={`p-3.5 rounded-2xl border flex flex-wrap items-center justify-between gap-3 text-xs ${
                antiCheat.tabSwitchCount > 0 || !antiCheat.isFullscreen
                  ? 'bg-amber-50 border-amber-300 text-amber-950'
                  : 'bg-teal-50 border-teal-200 text-teal-900'
              }`}
            >
              <div className="flex items-center gap-2 font-semibold">
                {antiCheat.tabSwitchCount > 0 ? (
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                ) : (
                  <ShieldCheck className="w-4 h-4 text-primary" />
                )}
                <span>
                  Tab Switches: <strong>{antiCheat.tabSwitchCount}</strong> • Fullscreen:{' '}
                  <strong>{antiCheat.isFullscreen ? 'Locked' : 'Exited'}</strong>
                </span>
              </div>

              {!antiCheat.isFullscreen && (
                <button
                  type="button"
                  onClick={() => void antiCheat.enterFullscreen()}
                  className="px-3 py-1 rounded-full bg-amber-600 text-white font-bold text-[11px] inline-flex items-center gap-1"
                >
                  <AlertTriangle className="w-3 h-3" /> Re-enter Fullscreen
                </button>
              )}
            </div>

            {examQuestions.map((q, idx) => (
              <div key={q.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <p className="font-headline font-bold text-sm text-slate-900">
                  Q{idx + 1}. {q.prompt}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {q.options.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                      className={`p-3 rounded-xl border text-left text-xs font-medium transition-all ${
                        answers[q.id] === opt
                          ? 'bg-primary text-white border-primary font-bold'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-primary/50'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <span className="text-xs text-slate-500">
                {Object.keys(answers).length}/{examQuestions.length} answered • Right-click disabled
              </span>
              <Button
                leftIcon={<CheckCircle2 className="w-4 h-4" />}
                onClick={() => void submitExam()}
                disabled={submitting}
              >
                {submitting ? 'Grading Instantly...' : 'Submit & Grade Instantly'}
              </Button>
            </div>
          </div>
        </BaseModal>
      </div>
    </PortalShell>
  );
}
