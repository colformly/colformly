import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, BookOpen, School, CheckCircle2 } from 'lucide-react';

export default function AudienceSelector() {
  const [activeTab, setActiveTab] = useState<'colleges' | 'coaching' | 'schools'>('colleges');

  const audiences = {
    colleges: {
      title: 'Engineering Colleges & Universities',
      subtitle: 'Rigorous accreditation, NBA/NAAC compliance & high-concurrency exams',
      icon: GraduationCap,
      authMode: 'Strict GOOGLE_ONLY Domain Gate (@campus.edu.in)',
      hierarchy: 'Academic Year > Program (B.Tech / MBA) > Section (A/B/C)',
      marking: 'Custom weightage, negative marking penalties, and instant grading seals',
      features: [
        'Mandatory institutional Google Workspace SSO',
        'Automatic section-level grading sheet generation',
        'Direct faculty Google Drive response sync',
        'Anti-cheat proctored telemetry report logs for external audits',
      ],
    },
    coaching: {
      title: 'Competitive Coaching & Test Prep',
      subtitle: 'JEE / NEET / GATE speed tests with thousands of concurrent scholars',
      icon: BookOpen,
      authMode: 'HYBRID (Campus Google Workspace or Phone/Email OTP)',
      hierarchy: 'Target Batch (e.g., JEE 2027) > Morning/Evening Shift > Roll No',
      marking: '+4 / -1 JEE standard negative marking algorithm',
      features: [
        'Instant multi-section cohort leaderboards with live XP',
        'Sub-second paper submission under high-traffic test spikes',
        'WhatsApp instant exam link generation with zero login delay',
        'Subject-wise accuracy grids (Physics / Chemistry / Mathematics)',
      ],
    },
    schools: {
      title: 'K-12 Schools & Academies',
      subtitle: 'Formative assessments, term finals & encouraging teacher reviews',
      icon: School,
      authMode: 'HYBRID or GOOGLE_ONLY with simplified parental access',
      hierarchy: 'Standard (Grade 6 - 12) > Section > Student Roll',
      marking: 'Encouraging teacher blessings & detailed step-by-step review explanations',
      features: [
        'Distraction-free, kid-friendly proctored fullscreen interface',
        'SVG graded answer sheets with personalized teacher blessings',
        'BYOC (Bring Your Own Cloud) AI review for homework mastery',
        'Zero-cost operational footprint on school tech budgets',
      ],
    },
  };

  const current = audiences[activeTab];
  const Icon = current.icon;

  return (
    <section className="py-24 px-4 sm:px-6 max-w-7xl mx-auto">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <span className="font-mono text-xs uppercase tracking-wider text-teal-600 dark:text-teal-400 font-semibold">
          Tailored Fit
        </span>
        <h2 className="font-display font-black text-3xl sm:text-5xl text-slate-900 dark:text-white mt-2 tracking-tight">
          Built for Every Campus Ecosystem
        </h2>
        <p className="font-body text-slate-600 dark:text-slate-400 mt-4 text-base sm:text-lg">
          Configure authentication gates, batch hierarchies, and marking schemes tailored specifically
          to your institution&apos;s academic standards.
        </p>
      </div>

      {/* Tabs Switcher */}
      <div className="flex flex-wrap items-center justify-center gap-3 mb-12">
        {(
          [
            { id: 'colleges', label: 'Colleges & Universities', icon: GraduationCap },
            { id: 'coaching', label: 'Coaching & Test Prep', icon: BookOpen },
            { id: 'schools', label: 'K-12 Schools', icon: School },
          ] as const
        ).map((t) => {
          const TabIcon = t.icon;
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`inline-flex items-center gap-2 px-6 py-3 rounded-full font-display font-bold text-xs sm:text-sm transition-all ${
                active
                  ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/20 scale-105'
                  : 'bg-white dark:bg-[#0D111A] text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5'
              }`}
            >
              <TabIcon className="w-4 h-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Audience Content Panel */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.3 }}
          className="rounded-3xl p-8 sm:p-12 bg-white dark:bg-[#0D111A] border border-slate-200/90 dark:border-white/10 shadow-xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center"
        >
          <div className="lg:col-span-7 space-y-6">
            <div className="flex items-center gap-3">
              <span className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                <Icon className="w-6 h-6" />
              </span>
              <div>
                <h3 className="font-display font-black text-2xl sm:text-3xl text-slate-900 dark:text-white">
                  {current.title}
                </h3>
                <p className="font-body text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  {current.subtitle}
                </p>
              </div>
            </div>

            <ul className="space-y-3 pt-2">
              {current.features.map((feat, idx) => (
                <li key={idx} className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300">
                  <CheckCircle2 className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Configuration Matrix Card */}
          <div className="lg:col-span-5 rounded-2xl bg-slate-50 dark:bg-black/40 border border-slate-200/80 dark:border-white/10 p-6 font-mono text-xs space-y-4">
            <p className="text-slate-400 uppercase tracking-widest text-[10px] font-bold pb-2 border-b border-slate-200/60 dark:border-white/10">
              Campus Config Matrix
            </p>

            <div>
              <span className="text-slate-500 text-[11px] block">Authentication Mode:</span>
              <p className="font-bold text-slate-900 dark:text-teal-400 mt-0.5">{current.authMode}</p>
            </div>

            <div>
              <span className="text-slate-500 text-[11px] block">Cohort Hierarchy:</span>
              <p className="font-bold text-slate-900 dark:text-white mt-0.5">{current.hierarchy}</p>
            </div>

            <div>
              <span className="text-slate-500 text-[11px] block">Marking &amp; Scoring Engine:</span>
              <p className="font-bold text-slate-900 dark:text-slate-300 mt-0.5">{current.marking}</p>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </section>
  );
}
