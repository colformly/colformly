import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ArrowRight, ShieldCheck, Sparkles, CheckCircle2 } from 'lucide-react';

export default function HeroSection() {
  const containerRef = useRef<HTMLElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const subheadRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const previewCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      tl.fromTo(
        headlineRef.current,
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, delay: 0.1 },
      )
        .fromTo(
          subheadRef.current,
          { y: 20, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.7 },
          '-=0.5',
        )
        .fromTo(
          ctaRef.current,
          { y: 15, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.6 },
          '-=0.4',
        )
        .fromTo(
          previewCardRef.current,
          { y: 40, opacity: 0, scale: 0.98 },
          { y: 0, opacity: 1, scale: 1, duration: 0.9, ease: 'back.out(1.2)' },
          '-=0.3',
        );

      // Subtle float animation on the preview card
      gsap.to(previewCardRef.current, {
        y: -10,
        duration: 3.5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: 1,
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={containerRef}
      className="relative pt-32 sm:pt-40 pb-20 px-4 sm:px-6 max-w-7xl mx-auto overflow-hidden text-center"
    >
      {/* Background radial glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-gradient-to-tr from-teal-500/20 via-indigo-500/10 to-transparent blur-[140px] pointer-events-none -z-10 rounded-full" />

      {/* Pill Badge */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-700 dark:text-teal-400 text-xs font-mono font-medium mb-6">
        <Sparkles className="w-3.5 h-3.5" />
        <span>Institutional Exam-as-a-Service OS</span>
      </div>

      {/* Headline with Instrument Serif Italic Accent */}
      <h1
        ref={headlineRef}
        className="font-display font-black text-4xl sm:text-6xl lg:text-7xl tracking-tight text-slate-900 dark:text-white max-w-5xl mx-auto leading-[1.08]"
      >
        Campus assessments made{' '}
        <span className="font-serif italic font-normal text-teal-600 dark:text-teal-400">
          effortless
        </span>
        , cheat-proof &amp; zero-limit.
      </h1>

      {/* Plain-English Value Prop (Clear for Google OAuth review & university buyers) */}
      <p
        ref={subheadRef}
        className="mt-6 text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-3xl mx-auto leading-relaxed font-body"
      >
        Run unlimited proctored campus exams with zero Google Sheets write limits.
        Colformly provides institutional Google Sign-In domain verification, instant server-side edge
        grading in &lt;150ms, and native Google Forms &amp; Sheets ownership directly in faculty drives.
      </p>

      {/* Dual CTAs */}
      <div
        ref={ctaRef}
        className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto"
      >
        <a
          href="#pilot-demo"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-teal-600 hover:bg-teal-700 text-white font-display font-bold text-sm shadow-lg shadow-teal-600/25 transition-all hover:-translate-y-0.5 active:scale-95"
        >
          <span>Launch Campus Pilot</span>
          <ArrowRight className="w-4 h-4" />
        </a>
        <a
          href="/login"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-white/10 dark:hover:bg-white/15 dark:text-white border border-slate-300 dark:border-white/15 font-display font-semibold text-sm transition-all active:scale-95"
        >
          <span>Sign In to Portal</span>
        </a>
      </div>

      {/* Security Trust Badges */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-5 text-xs text-slate-500 dark:text-slate-400 font-mono">
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" /> AES-256-GCM Encrypted
        </span>
        <span>•</span>
        <span className="inline-flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400" /> Zero Answer Key Leaks
        </span>
        <span>•</span>
        <span>Strict Campus Domain Gate</span>
      </div>

      {/* Interactive Exam Arena Preview Card */}
      <div
        ref={previewCardRef}
        className="mt-14 max-w-4xl mx-auto rounded-3xl p-1 bg-gradient-to-b from-white/20 to-white/5 dark:from-white/15 dark:to-transparent shadow-2xl backdrop-blur-xl"
      >
        <div className="rounded-[22px] bg-white/90 dark:bg-[#0D111A]/90 border border-slate-200/80 dark:border-white/10 p-5 sm:p-7 text-left overflow-hidden">
          {/* Card Topbar */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/10">
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-rose-500/80" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
              <span className="ml-2 font-mono text-xs text-slate-500 dark:text-slate-400">
                Colformly Exam Arena • CS-301 Midterm
              </span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-mono font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Fullscreen Guard Armed</span>
            </div>
          </div>

          {/* Question Preview */}
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-teal-600 dark:text-teal-400 font-bold">
                Question 01 of 20 • Multi-Choice
              </span>
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                Time Remaining: 42:15
              </span>
            </div>
            <p className="font-display font-bold text-base sm:text-lg text-slate-900 dark:text-white">
              Which tree rotation maintains the O(log n) worst-case search guarantee after an LL insertion in an AVL tree?
            </p>

            {/* Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {[
                { opt: 'A', text: 'Right Single Rotation', correct: true },
                { opt: 'B', text: 'Left-Right Double Rotation', correct: false },
                { opt: 'C', text: 'Left Single Rotation', correct: false },
                { opt: 'D', text: 'Right-Left Double Rotation', correct: false },
              ].map((item) => (
                <div
                  key={item.opt}
                  className={`p-3 rounded-xl border text-xs sm:text-sm flex items-center gap-3 transition-colors ${
                    item.correct
                      ? 'bg-teal-50/60 dark:bg-teal-500/10 border-teal-500 text-teal-900 dark:text-teal-200 font-semibold'
                      : 'bg-slate-50/60 dark:bg-white/5 border-slate-200 dark:border-white/5 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span
                    className={`w-6 h-6 rounded-lg flex items-center justify-center font-mono font-bold text-xs ${
                      item.correct
                        ? 'bg-teal-600 text-white'
                        : 'bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {item.opt}
                  </span>
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
