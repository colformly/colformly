import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Sparkles, Sheet, Send, CheckCircle2 } from 'lucide-react';

export default function TeacherWorkflow() {
  const containerRef = useRef<HTMLElement>(null);
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      num: '01',
      title: 'Create with AI or CSV Import',
      subtitle: 'Effortless Question Authoring',
      icon: Sparkles,
      desc: 'Type your syllabus topic and difficulty, or upload a question CSV. Colformly formats high-fidelity MCQs and short answers instantly with customizable marks and negative penalties.',
      pill: 'Gemini & Groq Acceleration',
      preview: {
        tag: 'AI Generator In Action',
        prompt: 'Prompt: 10 Advanced Compiler Design questions on LL(1) Parsing...',
        badge: '10 Questions Synthesized in 1.2s',
      },
    },
    {
      num: '02',
      title: 'Sync Form & 1-Click Link to Google Sheets',
      subtitle: 'Native Workspace Ownership',
      icon: Sheet,
      desc: '1-Click connects to teacher Google Drive using minimal scopes (drive.file and forms.body). Creates the Google Form, places it in your organized subject folder, and auto-verifies your linked response Sheet.',
      pill: 'Auto-Verified linkedSheetId',
      preview: {
        tag: 'Google Workspace Sync',
        prompt: 'Drive Hierarchy: /Colformly/CSE-2026/Compiler-Midterm',
        badge: 'Google Sheet Link Verified ✓',
      },
    },
    {
      num: '03',
      title: 'Publish to Batch, Course & Section',
      subtitle: 'Instant Delivery & Verification',
      icon: Send,
      desc: 'Target specific student cohorts or generate a secure WhatsApp exam link. Only students belonging to your authorized campus domain can sit the proctored test.',
      pill: 'Targeted RLS Deployment',
      preview: {
        tag: 'Cohort Dispatch',
        prompt: 'Target: B.Tech CSE • Year 3 • Section B',
        badge: 'Exam Code: CMP-892 • Live in Arena',
      },
    },
  ];

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      const stepElements = gsap.utils.toArray<HTMLElement>('.workflow-step-card');

      stepElements.forEach((el, idx) => {
        ScrollTrigger.create({
          trigger: el,
          start: 'top 60%',
          end: 'bottom 60%',
          onEnter: () => setActiveStep(idx),
          onEnterBack: () => setActiveStep(idx),
        });
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={containerRef} className="py-24 px-4 sm:px-6 max-w-7xl mx-auto">
      <div className="text-center max-w-3xl mx-auto mb-20">
        <span className="font-mono text-xs uppercase tracking-wider text-teal-600 dark:text-teal-400 font-semibold">
          Faculty Simplicity
        </span>
        <h2 className="font-display font-black text-3xl sm:text-5xl text-slate-900 dark:text-white mt-2 tracking-tight">
          Teacher Workflow in 3 Clicks
        </h2>
        <p className="font-body text-slate-600 dark:text-slate-400 mt-4 text-base sm:text-lg">
          No training needed. Professors can author, sync, and publish secure campus assessments in
          under three minutes.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Left Sticky Stepper Indicator */}
        <div className="lg:col-span-5 sticky top-32 space-y-6">
          <p className="font-mono text-xs text-slate-400 uppercase tracking-widest font-semibold">
            Interactive Progression
          </p>
          <div className="space-y-4">
            {steps.map((s, idx) => (
              <div
                key={s.num}
                className={`p-5 rounded-2xl border transition-all duration-300 ${
                  activeStep === idx
                    ? 'bg-teal-50 dark:bg-teal-950/30 border-teal-500 shadow-md translate-x-2'
                    : 'bg-white/60 dark:bg-[#0D111A]/60 border-slate-200/80 dark:border-white/5 opacity-70'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-mono font-bold text-xs ${
                      activeStep === idx
                        ? 'bg-teal-600 text-white'
                        : 'bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {s.num}
                  </span>
                  <div>
                    <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">
                      {s.title}
                    </h3>
                    <p className="text-xs text-teal-700 dark:text-teal-400 font-mono mt-0.5">
                      {s.subtitle}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Scrollable Cards */}
        <div className="lg:col-span-7 space-y-12">
          {steps.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.num}
                className="workflow-step-card rounded-3xl p-8 sm:p-10 bg-white dark:bg-[#0D111A] border border-slate-200/90 dark:border-white/10 shadow-lg space-y-6"
              >
                <div className="flex items-center justify-between">
                  <span className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                    <Icon className="w-6 h-6" />
                  </span>
                  <span className="px-3.5 py-1 rounded-full bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 font-mono text-xs font-semibold">
                    {s.pill}
                  </span>
                </div>

                <div>
                  <h3 className="font-display font-black text-2xl text-slate-900 dark:text-white">
                    Step {s.num}: {s.title}
                  </h3>
                  <p className="font-body text-slate-600 dark:text-slate-300 text-sm sm:text-base mt-3 leading-relaxed">
                    {s.desc}
                  </p>
                </div>

                {/* Mock UI Preview */}
                <div className="rounded-2xl bg-slate-50 dark:bg-black/40 border border-slate-200/80 dark:border-white/10 p-5 font-mono text-xs space-y-2">
                  <div className="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-200/60 dark:border-white/10">
                    <span>{s.preview.tag}</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  </div>
                  <p className="text-slate-700 dark:text-slate-300">{s.preview.prompt}</p>
                  <div className="pt-2">
                    <span className="px-3 py-1 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 font-bold text-[11px]">
                      {s.preview.badge}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
