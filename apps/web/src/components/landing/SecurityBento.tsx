import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ShieldCheck, Lock, Globe, EyeOff, Radio, Power } from 'lucide-react';

export default function SecurityBento() {
  const containerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      const items = gsap.utils.toArray<HTMLElement>('.bento-item');
      gsap.from(items, {
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top 80%',
        },
        y: 35,
        opacity: 0,
        stagger: 0.12,
        duration: 0.8,
        ease: 'power3.out',
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={containerRef} className="py-24 px-4 sm:px-6 max-w-7xl mx-auto">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <span className="font-mono text-xs uppercase tracking-wider text-teal-600 dark:text-teal-400 font-semibold">
          Defensive Depth
        </span>
        <h2 className="font-display font-black text-3xl sm:text-5xl text-slate-900 dark:text-white mt-2 tracking-tight">
          The Security &amp; Anti-Cheat Vault
        </h2>
        <p className="font-body text-slate-600 dark:text-slate-400 mt-4 text-base sm:text-lg">
          Institutional-grade protection protecting exam integrity, student privacy, and faculty
          workspaces from unauthorized intrusion.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Bento Item 1: Large Featured - Zero Browser Answer-Key Exposure */}
        <div className="bento-item md:col-span-2 rounded-3xl p-8 sm:p-10 bg-white dark:bg-[#0D111A] border border-slate-200/90 dark:border-white/10 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <span className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                <EyeOff className="w-6 h-6" />
              </span>
              <span className="px-3 py-1 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-300 text-xs font-mono font-bold">
                Zero Client Secrets
              </span>
            </div>
            <h3 className="font-display font-black text-2xl sm:text-3xl text-slate-900 dark:text-white">
              Zero Browser Answer-Key Exposure
            </h3>
            <p className="font-body text-sm sm:text-base text-slate-600 dark:text-slate-300 mt-4 leading-relaxed max-w-xl">
              Unlike generic exam tools where correct options reside in JavaScript bundles or hidden DOM
              inputs, Colformly evaluates answers exclusively inside Cloudflare V8 isolates. Even
              computer science students inspecting network websockets see zero scoring vectors.
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-white/10 flex flex-wrap items-center gap-6 text-xs font-mono text-slate-500 dark:text-slate-400">
            <span>• Isolated <code className="text-teal-600 dark:text-teal-400">test_answer_keys</code> table</span>
            <span>• RLS Service-Role Guard</span>
            <span>• Zero Client Leaks</span>
          </div>
        </div>

        {/* Bento Item 2: Campus Domain Gate */}
        <div className="bento-item rounded-3xl p-8 bg-white dark:bg-[#0D111A] border border-slate-200/90 dark:border-white/10 shadow-lg flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-6">
              <Globe className="w-6 h-6" />
            </div>
            <h3 className="font-display font-bold text-xl text-slate-900 dark:text-white">
              Campus Domain Lock
            </h3>
            <p className="font-body text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-3 leading-relaxed">
              Enforces registration and test participation strictly through verified Google Workspace
              domains (e.g. <code className="font-mono text-teal-600 dark:text-teal-400">@mit.edu.in</code>).
              Outsiders and personal gmail accounts are rejected at the edge.
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-white/10 text-xs font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
            Auto-Cohort Enrollment Onboarded
          </div>
        </div>

        {/* Bento Item 3: Fullscreen & Tab Telemetry */}
        <div className="bento-item rounded-3xl p-8 bg-white dark:bg-[#0D111A] border border-slate-200/90 dark:border-white/10 shadow-lg flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-6">
              <Radio className="w-6 h-6" />
            </div>
            <h3 className="font-display font-bold text-xl text-slate-900 dark:text-white">
              Tab-Switch Telemetry
            </h3>
            <p className="font-body text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-3 leading-relaxed">
              Enforces Fullscreen API locks, detects tab switching via <code className="font-mono">visibilitychange</code>,
              and streams proctoring violation counts live to teacher dashboards and telemetry logs.
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-white/10 text-xs font-mono text-amber-600 dark:text-amber-400 font-semibold">
            Max 3 Tolerances Before Auto-Lock
          </div>
        </div>

        {/* Bento Item 4: AES-256-GCM Token Encryption */}
        <div className="bento-item rounded-3xl p-8 bg-white dark:bg-[#0D111A] border border-slate-200/90 dark:border-white/10 shadow-lg flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-6">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="font-display font-bold text-xl text-slate-900 dark:text-white">
              AES-256-GCM Vault
            </h3>
            <p className="font-body text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-3 leading-relaxed">
              Teacher Google OAuth refresh tokens are encrypted at rest using Web Crypto AES-256-GCM
              with random 12-byte initialization vectors. Never readable by client browsers or public queries.
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-white/10 text-xs font-mono text-teal-600 dark:text-teal-400 font-semibold">
            Zero Plaintext Token Storage
          </div>
        </div>

        {/* Bento Item 5: Tenant Kill Switch */}
        <div className="bento-item rounded-3xl p-8 bg-white dark:bg-[#0D111A] border border-slate-200/90 dark:border-white/10 shadow-lg flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-6">
              <Power className="w-6 h-6" />
            </div>
            <h3 className="font-display font-bold text-xl text-slate-900 dark:text-white">
              Instant Kill Switch
            </h3>
            <p className="font-body text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-3 leading-relaxed">
              Super Admins and Deans can suspend an assessment or entire tenant in 1 click, instantly
              invalidating sessions across edge workers and closing exam submission portals.
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-white/10 text-xs font-mono text-rose-600 dark:text-rose-400 font-semibold">
            Sub-second Propagation
          </div>
        </div>
      </div>
    </section>
  );
}
