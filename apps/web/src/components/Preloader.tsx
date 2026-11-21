import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';

export default function Preloader() {
  const [active, setActive] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 1. Check reduced motion preference
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    // 2. Run only once per session
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('colformly_preloaded')) {
      return;
    }

    setActive(true);

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        onComplete: () => {
          sessionStorage.setItem('colformly_preloaded', 'true');
          setActive(false);
        },
      });

      tl.fromTo(
        logoRef.current,
        { opacity: 0, scale: 0.9, y: 10 },
        { opacity: 1, scale: 1, y: 0, duration: 0.35, ease: 'power2.out' },
      )
        .fromTo(
          barRef.current,
          { width: '0%' },
          { width: '100%', duration: 0.45, ease: 'power1.inOut' },
          '-=0.1',
        )
        .to(containerRef.current, {
          yPercent: -100,
          duration: 0.5,
          ease: 'power3.inOut',
          delay: 0.05,
        });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  if (!active) return null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[100] bg-[#07090E] flex flex-col items-center justify-center pointer-events-none select-none"
    >
      <div ref={logoRef} className="flex flex-col items-center gap-3">
        <div className="w-14 h-14 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-display font-black text-2xl shadow-lg border border-teal-400/30">
          C
        </div>
        <div className="text-center">
          <p className="font-display font-extrabold text-xl text-white tracking-tight">Colformly</p>
          <p className="font-mono text-[11px] text-teal-400 tracking-wider uppercase mt-0.5">
            Calm Exam OS
          </p>
        </div>
      </div>

      {/* Hairline Progress Sweep */}
      <div className="w-48 h-0.5 bg-white/10 rounded-full mt-6 overflow-hidden">
        <div ref={barRef} className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full" />
      </div>
    </div>
  );
}
