import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { AlertTriangle, CheckCircle2, XCircle, ShieldCheck } from 'lucide-react';

export default function ChaosVsCalm() {
  const containerRef = useRef<HTMLElement>(null);
  const chaosRef = useRef<HTMLDivElement>(null);
  const calmRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      gsap.fromTo(
        chaosRef.current,
        { y: 50, opacity: 0.6 },
        {
          y: -20,
          opacity: 1,
          scrollTrigger: {
            trigger: containerRef.current,
            start: 'top 80%',
            end: 'bottom 40%',
            scrub: 1,
          },
        },
      );

      gsap.fromTo(
        calmRef.current,
        { y: -30, opacity: 0.8 },
        {
          y: 20,
          opacity: 1,
          scrollTrigger: {
            trigger: containerRef.current,
            start: 'top 80%',
            end: 'bottom 40%',
            scrub: 1,
          },
        },
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  const chaosPoints = [
    'Leaked Inspect Element answers in plain client HTML',
    'Google Sheets 429 quota exhaustion during class-wide submissions',
    'Random unverified personal @gmail.com accounts taking exams',
    'Unregulated tab-switching & split-screen AI chatbot cheating',
    'Manual grading spreadsheets taking 3 to 5 days per cohort',
  ];

  const calmPoints = [
    '100% server-side answer key isolation — zero keys on student devices',
    'Native background responder forwarding with zero Google write caps',
    'Strict institutional Google Sign-In domain gate (@campus.edu.in)',
    'Real-time fullscreen anti-cheat lock & tab switch telemetry',
    'Instant <150ms automated grading with SVG signature & BYOC AI review',
  ];

  return (
    <section ref={containerRef} className="py-24 px-4 sm:px-6 max-w-7xl mx-auto overflow-hidden">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <span className="font-mono text-xs uppercase tracking-wider text-teal-600 dark:text-teal-400 font-semibold">
          Architectural Contrast
        </span>
        <h2 className="font-display font-black text-3xl sm:text-5xl text-slate-900 dark:text-white mt-2 tracking-tight">
          The Chaos vs. The Calm
        </h2>
        <p className="font-body text-slate-600 dark:text-slate-400 mt-4 text-base sm:text-lg">
          Campus exams break when relying on generic survey tools and exposed spreadsheets.
          Colformly restores serenity to university faculties and students alike.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
        {/* Chaos Card */}
        <div
          ref={chaosRef}
          className="rounded-3xl p-7 sm:p-9 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-900/40 flex flex-col justify-between shadow-sm"
        >
          <div>
            <div className="flex items-center gap-3 mb-6">
              <span className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-display font-bold text-xl text-rose-950 dark:text-rose-200">
                  The Old Campus Chaos
                </h3>
                <p className="text-xs text-rose-700/80 dark:text-rose-400/80 font-mono">
                  Generic Google Forms &amp; Shared Sheets
                </p>
              </div>
            </div>

            <ul className="space-y-4">
              {chaosPoints.map((point, idx) => (
                <li key={idx} className="flex items-start gap-3 text-sm text-rose-900 dark:text-rose-300">
                  <XCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-8 pt-6 border-t border-rose-200/60 dark:border-rose-900/30 text-xs font-mono text-rose-700 dark:text-rose-400">
            Result: Exam cancellation &amp; institutional reputational loss.
          </div>
        </div>

        {/* Calm Card */}
        <div
          ref={calmRef}
          className="rounded-3xl p-7 sm:p-9 bg-teal-50/50 dark:bg-[#0D111A] border border-teal-200/80 dark:border-teal-500/20 flex flex-col justify-between shadow-xl"
        >
          <div>
            <div className="flex items-center gap-3 mb-6">
              <span className="w-10 h-10 rounded-2xl bg-teal-100 dark:bg-teal-500/20 text-teal-700 dark:text-teal-400 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-display font-bold text-xl text-slate-950 dark:text-white">
                  The Colformly Calm
                </h3>
                <p className="text-xs text-teal-700 dark:text-teal-400 font-mono">
                  Cheat-Proof Institutional Exam OS
                </p>
              </div>
            </div>

            <ul className="space-y-4">
              {calmPoints.map((point, idx) => (
                <li key={idx} className="flex items-start gap-3 text-sm text-slate-800 dark:text-slate-200">
                  <CheckCircle2 className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-8 pt-6 border-t border-teal-200/60 dark:border-white/10 text-xs font-mono text-teal-700 dark:text-teal-400">
            Result: Complete peace of mind for faculty, deans &amp; students.
          </div>
        </div>
      </div>
    </section>
  );
}
