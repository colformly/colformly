import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Zap, Shield, Database, Lock } from 'lucide-react';

export default function MetricsStrip() {
  const containerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      const cards = gsap.utils.toArray<HTMLElement>('.metric-card');
      gsap.from(cards, {
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top 85%',
        },
        y: 30,
        opacity: 0,
        stagger: 0.15,
        duration: 0.8,
        ease: 'power3.out',
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  const metrics = [
    {
      icon: Zap,
      stat: '<150ms',
      label: 'Edge Grading Speed',
      sub: 'Server-side evaluation via Cloudflare Workers without browser lag',
    },
    {
      icon: Database,
      stat: '0 Limits',
      label: 'Google Sheets Write Cap',
      sub: 'Native Form submissions bypass strict Sheets API quota thresholds',
    },
    {
      icon: Shield,
      stat: '100%',
      label: 'Answer-Key Isolation',
      sub: 'Questions & answers never touch the student browser DOM or memory',
    },
    {
      icon: Lock,
      stat: 'AES-256-GCM',
      label: 'Token Encryption',
      sub: 'Teacher Google OAuth tokens stored encrypted with zero plain-text leaks',
    },
  ];

  return (
    <section
      ref={containerRef}
      className="py-16 px-4 sm:px-6 max-w-7xl mx-auto border-y border-slate-200/80 dark:border-white/10"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((m, idx) => {
          const Icon = m.icon;
          return (
            <div
              key={idx}
              className="metric-card p-6 rounded-3xl bg-white dark:bg-[#0D111A] border border-slate-200/80 dark:border-white/10 shadow-sm flex flex-col justify-between space-y-3 transition-transform hover:-translate-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                </span>
                <span className="font-mono text-xs text-slate-400 dark:text-slate-500">
                  0{idx + 1}
                </span>
              </div>
              <div>
                <p className="font-display font-black text-3xl sm:text-4xl text-slate-900 dark:text-white tracking-tight">
                  {m.stat}
                </p>
                <p className="font-display font-bold text-sm text-slate-800 dark:text-slate-200 mt-1">
                  {m.label}
                </p>
                <p className="font-body text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  {m.sub}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
