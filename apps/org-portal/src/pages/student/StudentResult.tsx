import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Lightbulb,
  RotateCcw,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { PortalShell } from '../../layouts/PortalShell';

interface WrongAnswerItem {
  qNum: number;
  topic: string;
  question: string;
  yourAnswer: string;
  correctAnswer: string;
  realLife: string;
  summary: string;
}

const WRONG_ANSWERS: WrongAnswerItem[] = [
  {
    qNum: 3,
    topic: 'Dynamic Programming',
    question: 'Write the optimal substructure recurrence for the 0/1 Knapsack problem.',
    yourAnswer: 'dp[i][w] = dp[i-1][w] + val[i]',
    correctAnswer: 'dp[i][w] = max(dp[i-1][w], val[i] + dp[i-1][w - wt[i]])',
    realLife:
      'Think of packing a 15kg flight carry-on bag before boarding: for every gadget, you compare leaving it behind vs. taking it and filling the remaining weight with the best previous combo — you always pick the maximum value!',
    summary:
      '0/1 Knapsack makes a binary choice per item: skip (dp[i-1][w]) or include (val[i] + dp[i-1][w-wt[i]]). Always wrap both branches in max().',
  },
  {
    qNum: 7,
    topic: 'Deadlock Avoidance',
    question: 'What guarantees a state is "Safe" in Dijkstra’s Banker’s Algorithm?',
    yourAnswer: 'Every process currently holds at least one resource',
    correctAnswer: 'There exists a safe execution sequence allowing every process to finish with available + released resources',
    realLife:
      'Like a college library with 5 copies of CLRS: a state is safe only if lending out books still lets at least one student finish their assignment and return copies so everyone else can finish in order.',
    summary:
      'Safe State = ∃ sequence <P1..Pn> where each Pi’s remaining Need ≤ Available + resources freed by earlier processes.',
  },
];

export default function StudentResult() {
  const { id } = useParams();
  const [animKey, setAnimKey] = useState(0);
  const [aiPanel, setAiPanel] = useState<Record<number, { mode: 'realLife' | 'summary'; text: string }>>({});

  const triggerAi = (item: WrongAnswerItem, mode: 'realLife' | 'summary') => {
    setAiPanel((prev) => ({
      ...prev,
      [item.qNum]: {
        mode,
        text: mode === 'realLife' ? item.realLife : item.summary,
      },
    }));
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
                <CheckCircle2 className="w-3.5 h-3.5" /> Official Graded Paper • {id || 'cs-301-midterm'}
              </span>
              <h1 className="font-headline font-extrabold text-2xl sm:text-3xl text-slate-900">
                CS-301 Algorithms Midterm Evaluation
              </h1>
              <p className="text-sm text-slate-600">
                Student: <strong className="text-slate-900">Alex Verma (24CSE041)</strong> • 0 Tab Switches Verified
              </p>
            </div>

            {/* Animated SVG Red/Teal Ink Grade Circle */}
            <div key={animKey} className="relative w-36 h-36 flex items-center justify-center shrink-0 mx-auto md:mx-0">
              <svg viewBox="0 0 140 140" className="w-full h-full overflow-visible">
                <path
                  d="M 70 12 C 110 10, 132 40, 128 74 C 124 112, 92 132, 60 128 C 24 124, 10 92, 16 58 C 22 26, 48 14, 78 16"
                  fill="none"
                  stroke="#0F766E"
                  strokeWidth="5"
                  strokeLinecap="round"
                  className="animate-ink-stroke"
                />
                <path
                  d="M 38 98 L 104 94"
                  fill="none"
                  stroke="#14B8A6"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  className="animate-ink-stroke"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="font-signature text-5xl font-bold text-primary leading-none">
                  85/100
                </span>
                <span className="font-mono text-[11px] font-bold text-emerald-700 mt-1">
                  Grade A • Top 8%
                </span>
              </div>
            </div>
          </div>

          {/* Teacher Handwritten Signature & Blessing Stamp */}
          <div className="pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-200 flex-1">
              <p className="text-[11px] font-label uppercase tracking-wider font-bold text-primary mb-1">
                Faculty Remark
              </p>
              <p className="text-sm text-slate-800 italic">
                “Strong algorithmic thinking — review DP transitions and Banker’s safe-state proofs!”
              </p>
            </div>
            <div className="text-left sm:text-right px-2">
              <p className="font-signature text-3xl text-primary leading-none">Prof. Sarah Mitchell</p>
              <p className="text-[11px] font-mono text-slate-500 mt-1">Digitally Signed • Aravali CSE</p>
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
              {WRONG_ANSWERS.length} Questions to Master
            </span>
          </div>

          <div className="space-y-5">
            {WRONG_ANSWERS.map((item) => {
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
                      onClick={() => triggerAi(item, 'realLife')}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:brightness-110 text-white font-label text-xs font-bold shadow-md transition-all active:scale-95"
                    >
                      <Lightbulb className="w-3.5 h-3.5" />
                      <span>AI: Real Life Analogy</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => triggerAi(item, 'summary')}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-teal-50 hover:bg-teal-100 border border-teal-200 text-primary font-label text-xs font-bold transition-all active:scale-95"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>AI: 1-Line Summarize</span>
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
                          {activeAi.mode === 'realLife'
                            ? 'BYOC AI • Real-Life Intuition'
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
        </section>
      </div>
    </PortalShell>
  );
}
