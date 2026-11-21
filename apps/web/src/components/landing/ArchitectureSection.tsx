import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Smartphone, Cpu, Database, Sheet, ArrowDownRight, ArrowUpRight } from 'lucide-react';

export default function ArchitectureSection() {
  const containerRef = useRef<HTMLElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const nodeEdgeRef = useRef<HTMLDivElement>(null);
  const nodeDbRef = useRef<HTMLDivElement>(null);
  const nodeSheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      // Animate line draw
      if (pathRef.current) {
        const length = pathRef.current.getTotalLength();
        gsap.set(pathRef.current, { strokeDasharray: length, strokeDashoffset: length });

        gsap.to(pathRef.current, {
          strokeDashoffset: 0,
          ease: 'none',
          scrollTrigger: {
            trigger: containerRef.current,
            start: 'top 75%',
            end: 'center center',
            scrub: 1,
          },
        });
      }

      // Parallax pop on nodes
      const nodes = [nodeEdgeRef.current, nodeDbRef.current, nodeSheetRef.current];
      gsap.from(nodes, {
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top 70%',
        },
        y: 40,
        opacity: 0,
        stagger: 0.2,
        duration: 0.9,
        ease: 'power3.out',
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={containerRef} className="py-24 px-4 sm:px-6 max-w-7xl mx-auto overflow-hidden">
      <div className="text-center max-w-3xl mx-auto mb-20">
        <span className="font-mono text-xs uppercase tracking-wider text-teal-600 dark:text-teal-400 font-semibold">
          Edge Execution
        </span>
        <h2 className="font-display font-black text-3xl sm:text-5xl text-slate-900 dark:text-white mt-2 tracking-tight">
          The Zero-Limit Split-Plane Architecture
        </h2>
        <p className="font-body text-slate-600 dark:text-slate-400 mt-4 text-base sm:text-lg">
          How Colformly grades an entire university batch in under 150ms while simultaneously updating
          institutional databases and private faculty Google Sheets with zero write rate limits.
        </p>
      </div>

      <div className="relative max-w-5xl mx-auto">
        {/* SVG Split Flow Diagram */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center relative z-10">
          {/* Step 1: Student Device */}
          <div className="p-7 rounded-3xl bg-white dark:bg-[#0D111A] border border-slate-200/90 dark:border-white/10 shadow-md space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-700 dark:text-slate-300">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <span className="font-mono text-xs text-teal-600 dark:text-teal-400 font-bold">
                PLANE 01 • INGESTION
              </span>
              <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white mt-1">
                Student Browser
              </h3>
              <p className="font-body text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                Zero answer keys exposed in DOM. Fullscreen anti-cheat events and student responses
                are encrypted and streamed via TLS 1.3.
              </p>
            </div>
            <div className="pt-2 font-mono text-[11px] text-teal-600 dark:text-teal-400 flex items-center gap-1.5">
              <span>POST /api/grade-paper</span>
              <ArrowDownRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Step 2: Edge Worker Engine */}
          <div
            ref={nodeEdgeRef}
            className="p-8 rounded-3xl bg-teal-50 dark:bg-teal-950/30 border-2 border-teal-500/50 shadow-xl space-y-4 relative"
          >
            <div className="absolute -top-3 right-6 px-3 py-0.5 rounded-full bg-teal-600 text-white font-mono text-[10px] font-bold uppercase tracking-wider">
              Core Arbiter
            </div>
            <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-md">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <span className="font-mono text-xs text-teal-700 dark:text-teal-300 font-bold">
                PLANE 02 • &lt;150MS EDGE
              </span>
              <h3 className="font-display font-black text-xl text-slate-950 dark:text-white mt-1">
                Cloudflare Edge Worker
              </h3>
              <p className="font-body text-xs text-slate-700 dark:text-slate-300 mt-2 leading-relaxed">
                Evaluates responses against secret answer keys, burns SVG grade seals, and initiates
                two concurrent, non-blocking persistence streams.
              </p>
            </div>
            <div className="pt-2 font-mono text-[11px] text-slate-800 dark:text-slate-200">
              Parallel waitUntil Execution ⚡
            </div>
          </div>

          {/* Step 3: Simultaneous Dual Split Plane */}
          <div className="space-y-6">
            {/* Split A: Supabase Postgres */}
            <div
              ref={nodeDbRef}
              className="p-6 rounded-3xl bg-white dark:bg-[#0D111A] border border-slate-200/90 dark:border-white/10 shadow-md space-y-3"
            >
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Database className="w-5 h-5" />
                </span>
                <div>
                  <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                    SPLIT A • LEDGER
                  </span>
                  <h4 className="font-display font-bold text-sm text-slate-900 dark:text-white">
                    Supabase Postgres
                  </h4>
                </div>
              </div>
              <p className="font-body text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Atomic write to <code className="font-mono text-[11px]">public.student_results</code>{' '}
                for live campus podiums and accreditation records.
              </p>
            </div>

            {/* Split B: Teacher Google Sheet */}
            <div
              ref={nodeSheetRef}
              className="p-6 rounded-3xl bg-white dark:bg-[#0D111A] border border-slate-200/90 dark:border-white/10 shadow-md space-y-3"
            >
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                  <Sheet className="w-5 h-5" />
                </span>
                <div>
                  <span className="font-mono text-[10px] text-teal-600 dark:text-teal-400 font-bold">
                    SPLIT B • ZERO-LIMIT SYNC
                  </span>
                  <h4 className="font-display font-bold text-sm text-slate-900 dark:text-white">
                    Teacher Linked Sheet
                  </h4>
                </div>
              </div>
              <p className="font-body text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Dispatches to Google Form responder URL asynchronously, populating the faculty Google
                Sheet without hitting Google API quotas.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
