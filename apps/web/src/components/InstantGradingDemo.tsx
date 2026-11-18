import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CheckCircle2,
  Clock,
  Cpu,
  Play,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  XCircle,
} from 'lucide-react';

interface DemoQuestion {
  id: number;
  topic: string;
  question: string;
  answer: string;
  correct: boolean;
  marks: number;
  maxMarks: number;
  aiTip?: string;
}

const SAMPLE_QUESTIONS: DemoQuestion[] = [
  {
    id: 1,
    topic: 'Time Complexity',
    question: 'Worst-case lookup complexity of a balanced AVL Tree?',
    answer: 'O(log n)',
    correct: true,
    marks: 5,
    maxMarks: 5,
  },
  {
    id: 2,
    topic: 'Graph Algorithms',
    question: 'Which data structure powers BFS shortest-path traversal?',
    answer: 'FIFO Queue',
    correct: true,
    marks: 5,
    maxMarks: 5,
  },
  {
    id: 3,
    topic: 'Dynamic Programming',
    question: 'Optimal substructure recurrence for 0/1 Knapsack?',
    answer: 'dp[i][w] = dp[i-1][w] + val[i]',
    correct: false,
    marks: 0,
    maxMarks: 5,
    aiTip: 'Missing max() comparison against excluding item i',
  },
  {
    id: 4,
    topic: 'Hashing & RLS',
    question: 'Primary benefit of PostgreSQL Row Level Security in multi-tenant SaaS?',
    answer: 'Database-enforced tenant isolation per org_id',
    correct: true,
    marks: 5,
    maxMarks: 5,
  },
];

export default function InstantGradingDemo() {
  const [gradedCount, setGradedCount] = useState(0);
  const [isRunning, setIsRunning] = useState(true);
  const [latencyMs, setLatencyMs] = useState(0);

  useEffect(() => {
    if (!isRunning) return;
    if (gradedCount >= SAMPLE_QUESTIONS.length) {
      setIsRunning(false);
      return;
    }

    const timer = setTimeout(() => {
      setGradedCount((prev) => prev + 1);
      setLatencyMs((prev) => prev + 28);
    }, 520);

    return () => clearTimeout(timer);
  }, [gradedCount, isRunning]);

  const replay = () => {
    setGradedCount(0);
    setLatencyMs(0);
    setIsRunning(true);
  };

  const earnedMarks = SAMPLE_QUESTIONS.slice(0, gradedCount).reduce((sum, q) => sum + q.marks, 0);
  const totalMarks = SAMPLE_QUESTIONS.reduce((sum, q) => sum + q.maxMarks, 0);
  const pct = Math.round((earnedMarks / totalMarks) * 100);
  const isFinished = gradedCount === SAMPLE_QUESTIONS.length;

  return (
    <div
      id="grading-demo"
      className="relative mt-6 max-w-5xl mx-auto transition-transform duration-500 ease-out hover:-translate-y-1"
    >
      {/* Ambient Teal Glow */}
      <div className="absolute -inset-1.5 bg-gradient-to-r from-teal-400/20 via-teal-200/25 to-teal-400/20 rounded-3xl blur-xl opacity-70 pointer-events-none" />

      {/* Main Floating Browser Mockup Container */}
      <div className="relative rounded-2xl md:rounded-3xl bg-white border border-slate-200/80 shadow-floating-mockup overflow-hidden text-left">
        {/* Browser Header Bar */}
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-3 h-3 rounded-full bg-slate-300 shrink-0" />
            <span className="w-3 h-3 rounded-full bg-slate-300 shrink-0" />
            <span className="w-3 h-3 rounded-full bg-slate-300 shrink-0" />
            <span className="ml-3 font-mono text-xs text-slate-600 truncate hidden sm:inline">
              portal.colformly.app/aravali-college/cs-301/live-grade
            </span>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-50 text-light-primary text-xs font-semibold border border-teal-200">
              <span className="w-1.5 h-1.5 rounded-full bg-light-primary animate-pulse" />
              {isFinished ? `Graded in ${latencyMs}ms` : 'Evaluating Edge Stream...'}
            </span>
            <button
              type="button"
              onClick={replay}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white hover:bg-slate-100 border border-slate-200 text-xs font-label font-semibold text-slate-700 transition-colors"
            >
              {isRunning ? <Play className="w-3 h-3" /> : <RotateCcw className="w-3 h-3" />}
              <span>Replay</span>
            </button>
          </div>
        </div>

        {/* Mockup Inner Workspace */}
        <div className="p-5 sm:p-7 md:p-8 bg-gradient-to-b from-white to-slate-50/50">
          {/* KPI Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-card-soft">
              <div className="flex items-center justify-between text-slate-600 mb-1.5">
                <span className="text-xs font-medium">Instant Score</span>
                <Sparkles className="w-4 h-4 text-light-primary" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-headline font-bold text-xl text-slate-900 tabular-nums">
                  {earnedMarks}/{totalMarks}
                </span>
                <span className="text-xs font-semibold text-light-primary tabular-nums">{pct}%</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-card-soft">
              <div className="flex items-center justify-between text-slate-600 mb-1.5">
                <span className="text-xs font-medium">Edge Grading Time</span>
                <Clock className="w-4 h-4 text-light-primary" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-headline font-bold text-xl text-slate-900 tabular-nums">
                  {latencyMs || 18} ms
                </span>
                <span className="text-xs font-semibold text-light-primary">CF Worker</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-card-soft">
              <div className="flex items-center justify-between text-slate-600 mb-1.5">
                <span className="text-xs font-medium">Anti-Cheat Integrity</span>
                <ShieldCheck className="w-4 h-4 text-light-primary" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-headline font-bold text-xl text-slate-900 tabular-nums">
                  100%
                </span>
                <span className="text-xs font-medium text-slate-500">0 tab switches</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-card-soft">
              <div className="flex items-center justify-between text-slate-600 mb-1.5">
                <span className="text-xs font-medium">Cloud Cost / Test</span>
                <Cpu className="w-4 h-4 text-light-primary" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-headline font-bold text-xl text-slate-900 tabular-nums">
                  ₹0.00
                </span>
                <span className="text-xs font-semibold text-light-primary">BYOS Edge</span>
              </div>
            </div>
          </div>

          {/* 2-Column Live Grading Sheet + Telemetry Panel */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Animated Question Grading Sheet (2 cols) */}
            <div className="lg:col-span-2 p-5 rounded-xl bg-white border border-slate-200 shadow-card-soft">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="font-headline font-semibold text-base text-slate-900">
                    CS-301 Mid-Sem • Automated Answer Sheet Evaluation
                  </h4>
                  <p className="text-xs text-slate-500">
                    Aravali College • B.Tech CSE Year 2 (Section A) • Roll #24CSE041
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-teal-50 border border-teal-200 text-light-primary font-label text-[11px] font-semibold">
                  {gradedCount}/{SAMPLE_QUESTIONS.length} Checked
                </span>
              </div>

              <div className="space-y-3">
                {SAMPLE_QUESTIONS.map((q, index) => {
                  const isChecked = index < gradedCount;
                  return (
                    <motion.div
                      key={q.id}
                      initial={{ opacity: 0.6 }}
                      animate={{ opacity: 1 }}
                      className={`p-3.5 rounded-xl border transition-colors ${
                        !isChecked
                          ? 'bg-slate-50/70 border-slate-200/80'
                          : q.correct
                            ? 'bg-teal-50/50 border-teal-200'
                            : 'bg-rose-50/60 border-rose-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-[11px] font-semibold text-slate-500">
                              Q{q.id}
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-white border border-slate-200 text-[10px] font-label font-semibold text-slate-600">
                              {q.topic}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-slate-900">{q.question}</p>
                          <p className="text-xs font-mono text-slate-600 mt-1">
                            Student: <span className="text-slate-900 font-medium">{q.answer}</span>
                          </p>
                          {isChecked && !q.correct && q.aiTip && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-rose-200 text-[11px] text-rose-700 font-medium"
                            >
                              <Sparkles className="w-3.5 h-3.5 shrink-0" />
                              <span>BYOC AI Hint: {q.aiTip}</span>
                            </motion.div>
                          )}
                        </div>

                        <div className="shrink-0 flex items-center gap-2">
                          <AnimatePresence mode="wait">
                            {isChecked ? (
                              <motion.div
                                key="graded"
                                initial={{ scale: 0.4, opacity: 0, rotate: -15 }}
                                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                                transition={{ type: 'spring', stiffness: 420, damping: 20 }}
                                className="flex items-center gap-1.5"
                              >
                                <span
                                  className={`font-mono text-xs font-bold ${
                                    q.correct ? 'text-light-primary' : 'text-rose-600'
                                  }`}
                                >
                                  +{q.marks}/{q.maxMarks}
                                </span>
                                {q.correct ? (
                                  <CheckCircle2 className="w-5 h-5 text-light-primary" />
                                ) : (
                                  <XCircle className="w-5 h-5 text-rose-600" />
                                )}
                              </motion.div>
                            ) : (
                              <motion.span
                                key="pending"
                                className="w-5 h-5 rounded-full border-2 border-slate-300 border-t-light-primary animate-spin block"
                              />
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Right: Live Integrity & Teacher Blessing Stream (1 col) */}
            <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-card-soft flex flex-col justify-between gap-5">
              <div>
                <h4 className="font-headline font-semibold text-base text-slate-900 mb-3">
                  Real-Time Audit Stream
                </h4>

                {/* Animated Progress Bar */}
                <div className="mb-5 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-label font-semibold text-slate-700">Evaluation Progress</span>
                    <span className="font-mono font-bold text-light-primary">
                      {Math.round((gradedCount / SAMPLE_QUESTIONS.length) * 100)}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                    <motion.div
                      className="h-full bg-light-primary rounded-full"
                      initial={{ width: '0%' }}
                      animate={{ width: `${(gradedCount / SAMPLE_QUESTIONS.length) * 100}%` }}
                      transition={{ type: 'spring', stiffness: 200, damping: 24 }}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-teal-50 text-light-primary border border-teal-200 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">
                      1
                    </span>
                    <div>
                      <p className="font-headline text-xs font-semibold text-slate-900">
                        Fullscreen Lock Verified
                      </p>
                      <p className="text-xs text-slate-500">Document.visibilityState = visible</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-teal-50 text-light-primary border border-teal-200 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">
                      2
                    </span>
                    <div>
                      <p className="font-headline text-xs font-semibold text-slate-900">
                        Supabase RLS Tenant Check
                      </p>
                      <p className="text-xs text-slate-500">org_id = aravali_eng • isolated</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-teal-50 text-light-primary border border-teal-200 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">
                      3
                    </span>
                    <div>
                      <p className="font-headline text-xs font-semibold text-slate-900">
                        Topic Autopsy Generated
                      </p>
                      <p className="text-xs text-slate-500">Flagged: Dynamic Programming</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <div className="p-3 rounded-xl bg-teal-50/70 border border-teal-200/80">
                  <p className="text-[11px] font-label uppercase tracking-wider font-bold text-light-primary mb-1">
                    Teacher Grading Stamp
                  </p>
                  <p className="text-xs text-slate-700 italic">
                    "Strong fundamentals on Trees & Graphs — review DP transitions!"
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
