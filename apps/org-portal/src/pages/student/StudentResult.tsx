import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Lightbulb,
  MessageSquare,
  RotateCcw,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { supabase, useAuth } from '@colformly/auth';
import { PortalShell } from '../../layouts/PortalShell';
import { explainAnswerApi } from '../../lib/workerClient';

interface WrongAnswerItem {
  qNum: number;
  topic: string;
  question: string;
  yourAnswer: string;
  correctAnswer: string;
  explanation?: string;
}

const FALLBACK_WRONG: WrongAnswerItem[] = [
  {
    qNum: 1,
    topic: 'Dynamic Programming',
    question: 'Write the optimal substructure recurrence for the 0/1 Knapsack problem.',
    yourAnswer: 'dp[i][w] = dp[i-1][w] + val[i]',
    correctAnswer: 'dp[i][w] = max(dp[i-1][w], val[i] + dp[i-1][w - wt[i]])',
    explanation:
      '0/1 Knapsack makes a binary decision per item: exclude or include with weight reduction.',
  },
  {
    qNum: 2,
    topic: 'Deadlock Avoidance',
    question: 'What guarantees a state is "Safe" in Dijkstra’s Banker’s Algorithm?',
    yourAnswer: 'Every process currently holds at least one resource',
    correctAnswer:
      'There exists a safe execution sequence allowing every process to finish with available + released resources',
    explanation:
      'Safe State = ∃ sequence <P1..Pn> where each Pi remaining Need ≤ Available + freed resources.',
  },
];

export default function StudentResult() {
  const { id } = useParams();
  const { user } = useAuth();

  const [animKey, setAnimKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [testTitle, setTestTitle] = useState('Algorithms Midterm Assessment');
  const [studentName, setStudentName] = useState('Alex Verma (24CSE041)');
  const [score, setScore] = useState<number>(85);
  const [total, setTotal] = useState<number>(100);
  const [percentage, setPercentage] = useState<number>(85);
  const [teacherBlessing, setTeacherBlessing] = useState<string>(
    'Strong algorithmic thinking — review edge cases and DP transitions!',
  );
  const [teacherName, setTeacherName] = useState<string>('Prof. Sarah Mitchell');
  const [wrongAnswers, setWrongAnswers] = useState<WrongAnswerItem[]>(FALLBACK_WRONG);
  const [tabSwitches, setTabSwitches] = useState<number>(0);

  // AI Explainers State per question number
  const [aiPanel, setAiPanel] = useState<
    Record<
      number,
      { mode: 'real_life' | 'summarize' | 'hinglish'; text: string; loading?: boolean }
    >
  >({});

  useEffect(() => {
    let isMounted = true;
    const fetchResult = async () => {
      if (!id) return;
      try {
        setLoading(true);
        // Query student_results by id or test_id
        let query = (supabase.from('student_results') as any).select('*, tests(*), users(*)');
        if (id.includes('-') && id.length === 36) {
          query = query.or(`id.eq.${id},test_id.eq.${id}`);
        } else {
          query = query.eq('test_id', id);
        }

        const { data: resRow } = await query.order('graded_at', { ascending: false }).limit(1).maybeSingle();

        if (resRow && isMounted) {
          if (resRow.tests?.title) setTestTitle(resRow.tests.title);
          if (resRow.users?.full_name) {
            setStudentName(`${resRow.users.full_name} (${resRow.student_id ? 'STU-' + resRow.student_id.slice(0, 5) : '24CSE041'})`);
          } else if (user?.user_metadata?.full_name) {
            setStudentName(`${user.user_metadata.full_name} (24CSE041)`);
          }

          setScore(Number(resRow.score || 0));
          setTotal(Number(resRow.total || 10));
          setPercentage(Math.round(Number(resRow.percentage || 0)));
          if (resRow.teacher_blessing) setTeacherBlessing(resRow.teacher_blessing);
          setTabSwitches(resRow.tab_switch_count || 0);

          // Extract wrong answers from breakdown
          if (Array.isArray(resRow.question_breakdown)) {
            const wrong = resRow.question_breakdown
              .filter((q: any) => !q.isCorrect)
              .map((q: any, idx: number) => ({
                qNum: q.questionNumber || idx + 1,
                topic: q.topic || 'General',
                question: q.questionText || `Question ${idx + 1}`,
                yourAnswer: q.studentAnswer || '[No Answer]',
                correctAnswer: q.correctAnswer || '[Key not found]',
                explanation: q.explanation,
              }));

            if (wrong.length > 0) {
              setWrongAnswers(wrong);
            }
          }
        }
      } catch (err) {
        console.warn('Error loading student result:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void fetchResult();
    return () => {
      isMounted = false;
    };
  }, [id, user]);

  const triggerAi = async (
    item: WrongAnswerItem,
    mode: 'real_life' | 'summarize' | 'hinglish',
  ) => {
    setAiPanel((prev) => ({
      ...prev,
      [item.qNum]: { mode, text: 'Consulting AI tutor...', loading: true },
    }));

    try {
      const res = await explainAnswerApi({
        question: item.question,
        studentAnswer: item.yourAnswer,
        correctAnswer: item.correctAnswer,
        mode,
      });

      setAiPanel((prev) => ({
        ...prev,
        [item.qNum]: { mode, text: res.explanation, loading: false },
      }));
    } catch (err: any) {
      console.warn('AI explain error, using local tutor feedback:', err);
      const fallbackMsg =
        mode === 'real_life'
          ? `Think of this like an everyday analogy: When packing a flight bag with limited weight, you evaluate each item individually—either skip it or take it and maximize the remaining space!`
          : mode === 'hinglish'
            ? `Bhai simple hai: Knapsack me har item ke liye 2 choices hoti hain—ya to lo, ya chhodo. Dono me se jo max dega, wahi optimal answer hai!`
            : `Core Concept: Optimal substructure requires comparing the skipped subproblem against the included item subproblem using max().`;

      setAiPanel((prev) => ({
        ...prev,
        [item.qNum]: { mode, text: fallbackMsg, loading: false },
      }));
    }
  };

  return (
    <PortalShell persona="student">
      <div className="space-y-8">
        {/* Top Breadcrumb + Re-animate */}
        <div className="flex items-center justify-between gap-3">
          <Link
            to="/student/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-label font-bold text-slate-600 hover:text-primary"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Student Feed</span>
          </Link>

          <button
            type="button"
            onClick={() => setAnimKey((k) => k + 1)}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white border border-slate-200 text-xs font-label font-bold text-slate-700 hover:text-primary shadow-sm"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Re-animate Ink Grade</span>
          </button>
        </div>

        {/* TACTILE PAPER SCORECARD WITH SVG GRADING ANIMATION */}
        <section className="rounded-3xl bg-white paper-grid border-2 border-slate-200/90 shadow-student-card p-6 sm:p-10 relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b-2 border-dashed border-slate-200">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-label font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" /> Official Graded Paper • {id || 'b0000000-0000-0000-0000-000000000001'}
              </span>
              <h1 className="font-headline font-extrabold text-2xl sm:text-3xl text-slate-900">
                {testTitle}
              </h1>
              <p className="text-sm text-slate-600">
                Student: <strong className="text-slate-900">{studentName}</strong> • {tabSwitches} Tab Switches Logged
              </p>
            </div>

            {/* Animated SVG Red/Teal Ink Grade Circle */}
            <div key={animKey} className="relative w-36 h-36 flex items-center justify-center shrink-0 mx-auto md:mx-0">
              <svg viewBox="0 0 140 140" className="w-full h-full overflow-visible">
                <path
                  d="M 70 12 C 110 10, 132 40, 128 74 C 124 112, 92 132, 60 128 C 24 124, 10 92, 16 58 C 22 26, 48 14, 78 16"
                  fill="none"
                  stroke={percentage >= 70 ? '#0F766E' : '#B45309'}
                  strokeWidth="5"
                  strokeLinecap="round"
                  className="animate-ink-stroke"
                />
                <path
                  d="M 38 98 L 104 94"
                  fill="none"
                  stroke={percentage >= 70 ? '#14B8A6' : '#F59E0B'}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  className="animate-ink-stroke"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="font-signature text-5xl font-bold text-primary leading-none">
                  {score}/{total}
                </span>
                <span className="font-mono text-[11px] font-bold text-emerald-700 mt-1">
                  {percentage}% • {percentage >= 80 ? 'Grade A' : percentage >= 60 ? 'Grade B' : 'Needs Review'}
                </span>
              </div>
            </div>
          </div>

          {/* Teacher Handwritten Signature & Blessing Stamp */}
          <div className="pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-200 flex-1">
              <p className="text-[11px] font-label uppercase tracking-wider font-bold text-primary mb-1">
                Faculty Blessing &amp; Remark
              </p>
              <p className="text-sm text-slate-800 italic">
                “{teacherBlessing}”
              </p>
            </div>
            <div className="text-left sm:text-right px-2">
              <p className="font-signature text-3xl text-primary leading-none">{teacherName}</p>
              <p className="text-[11px] font-mono text-slate-500 mt-1">Digitally Signed • Sealed Anti-Cheat</p>
            </div>
          </div>
        </section>

        {/* WRONG ANSWERS + BYOC AI TUTOR BUTTONS */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-headline font-extrabold text-xl text-slate-900">
              Mistakes Autopsy &amp; BYOC AI Explainer
            </h2>
            <span className="px-3 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-800 text-xs font-label font-bold">
              {wrongAnswers.length} Questions to Master
            </span>
          </div>

          {wrongAnswers.length === 0 ? (
            <div className="p-8 rounded-3xl bg-white border border-slate-200 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
              <h3 className="font-headline font-bold text-base text-slate-900">
                100% Perfect Score!
              </h3>
              <p className="text-xs text-slate-500">
                No mistakes detected on this paper. Keep up the high standard!
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {wrongAnswers.map((item) => {
                const activeAi = aiPanel[item.qNum];
                return (
                  <article
                    key={item.qNum}
                    className="rounded-3xl bg-white border border-slate-200/90 p-6 shadow-student-card space-y-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs font-bold text-rose-600">Q{item.qNum}</span>
                          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-label font-bold">
                            {item.topic}
                          </span>
                        </div>
                        <h3 className="font-headline font-bold text-base text-slate-900">
                          {item.question}
                        </h3>
                      </div>
                      <XCircle className="w-6 h-6 text-rose-500 shrink-0" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-200">
                        <span className="font-label font-bold text-rose-700 block mb-1">Your Answer</span>
                        <code className="font-mono text-slate-800">{item.yourAnswer}</code>
                      </div>
                      <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200">
                        <span className="font-label font-bold text-emerald-800 block mb-1">
                          Correct Answer Key
                        </span>
                        <code className="font-mono text-slate-900">{item.correctAnswer}</code>
                      </div>
                    </div>

                    {/* BYOC AI Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2.5 pt-1">
                      <button
                        type="button"
                        onClick={() => void triggerAi(item, 'real_life')}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:brightness-110 text-white font-label text-xs font-bold shadow-md transition-all active:scale-95"
                      >
                        <Lightbulb className="w-3.5 h-3.5" />
                        <span>AI: Real Life Analogy</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => void triggerAi(item, 'summarize')}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-teal-50 hover:bg-teal-100 border border-teal-200 text-primary font-label text-xs font-bold transition-all active:scale-95"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>AI: 1-Line Summarize</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => void triggerAi(item, 'hinglish')}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 font-label text-xs font-bold transition-all active:scale-95"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>AI: Campus Hinglish</span>
                      </button>
                    </div>

                    {activeAi && (
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 rounded-2xl bg-violet-50/70 border border-violet-200 text-sm text-slate-800 leading-relaxed flex items-start gap-2.5"
                      >
                        <Sparkles className="w-4 h-4 text-violet-600 shrink-0 mt-1" />
                        <div>
                          <span className="font-label font-bold text-xs uppercase tracking-wider text-violet-700 block mb-0.5">
                            {activeAi.mode === 'real_life'
                              ? 'BYOC AI • Real-Life Intuition'
                              : activeAi.mode === 'hinglish'
                                ? 'BYOC AI • Campus Hinglish'
                                : 'BYOC AI • Exam-Ready Summary'}
                          </span>
                          <p>{activeAi.text}</p>
                        </div>
                      </motion.div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </PortalShell>
  );
}
