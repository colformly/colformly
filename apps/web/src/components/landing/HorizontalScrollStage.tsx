import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Shield, Settings, FileEdit, Award, CheckCircle } from 'lucide-react';

export default function HorizontalScrollStage() {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const mm = gsap.matchMedia();

    // Desktop: Pinned horizontal scroll
    mm.add('(min-width: 768px)', () => {
      const track = trackRef.current;
      if (!track) return;

      const totalScroll = track.scrollWidth - window.innerWidth + 120;

      gsap.to(track, {
        x: -totalScroll,
        ease: 'none',
        scrollTrigger: {
          trigger: sectionRef.current,
          pin: true,
          scrub: 1,
          start: 'top top',
          end: () => `+=${totalScroll}`,
          invalidateOnRefresh: true,
        },
      });
    });

    return () => mm.revert();
  }, []);

  const worlds = [
    {
      num: '01',
      title: 'Super Admin Console',
      role: 'Platform Operations',
      icon: Settings,
      desc: 'Deploy new campus tenants in seconds with our 5-section modal, enforce institute code isolation, and execute seamless operator handover.',
      badge: 'Tenant Isolation',
      preview: {
        header: 'Super Admin Prime • Tenant Provisioning',
        stats: [
          { label: 'Active Orgs', val: '24' },
          { label: 'Cloudflare Edge', val: 'Online' },
          { label: 'Token Vault', val: 'AES-GCM' },
        ],
        details: [
          'Domain Gate: @mit.edu.in',
          'Auth Mode: HYBRID (Google + Email)',
          'Feature Flags: AI Generator ON',
        ],
      },
    },
    {
      num: '02',
      title: 'Org Admin Portal',
      role: 'Campus Deans & HODs',
      icon: Shield,
      desc: 'Lock registration exclusively to your institutional Google Workspace domain, configure academic departments, and invite professors with zero credential friction.',
      badge: 'Domain Gatekeeper',
      preview: {
        header: 'Dean Console • Campus Access Gate',
        stats: [
          { label: 'Faculty Claimed', val: '68' },
          { label: 'Enrolled Students', val: '4,120' },
          { label: 'Auto-Enrollment', val: 'Armed' },
        ],
        details: [
          'Allowed Domain: @engineering.campus.edu',
          'Student Policy: GOOGLE_ONLY',
          'Departments: 8 Configured',
        ],
      },
    },
    {
      num: '03',
      title: 'Teacher Test Studio',
      role: 'Faculty & Professors',
      icon: FileEdit,
      desc: 'Generate syllabus-aligned questions with AI, sync directly into your Google Drive, and verify your linked Google Sheet before publishing in 1 click.',
      badge: 'Sync & Ownership',
      preview: {
        header: 'Test Studio • CS-301 Midterm Sync',
        stats: [
          { label: 'Questions', val: '20' },
          { label: 'Google Form ID', val: '1FAIpQLSc...' },
          { label: 'Linked Sheet', val: 'Verified ✓' },
        ],
        details: [
          'Drive Folder: /Colformly/CSE-2026/CS-301',
          'Sheet Link: Verified via forms.get',
          'Distribution: WhatsApp + Student Portal',
        ],
      },
    },
    {
      num: '04',
      title: 'Student Exam Arena',
      role: 'Students & Scholars',
      icon: Award,
      desc: 'Clean, distraction-free proctored environment with fullscreen enforcement, real-time telemetry, and instant server grading with teacher blessings.',
      badge: 'Anti-Cheat Proctored',
      preview: {
        header: 'Student Arena • Algorithms Exam',
        stats: [
          { label: 'Grade Speed', val: '120ms' },
          { label: 'Student Score', val: '19 / 20' },
          { label: 'Campus Rank', val: '#1 Podium' },
        ],
        details: [
          'Anti-Cheat: 0 tab switches detected',
          'SVG Graded Sheet: Stored in Vault',
          'Blessing: Outstanding algorithmic rigor!',
        ],
      },
    },
  ];

  return (
    <section ref={sectionRef} className="py-24 bg-slate-50 dark:bg-[#07090E] overflow-hidden">
      <div className="px-4 sm:px-6 max-w-7xl mx-auto mb-12">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="font-mono text-xs uppercase tracking-wider text-teal-600 dark:text-teal-400 font-semibold">
              Ecosystem
            </span>
            <h2 className="font-display font-black text-3xl sm:text-5xl text-slate-900 dark:text-white mt-2 tracking-tight">
              One Platform, Four Worlds
            </h2>
          </div>
          <p className="font-body text-slate-600 dark:text-slate-400 text-sm max-w-md">
            Engineered so super admins, campus deans, professors, and students operate within
            tailored, laser-focused interfaces.
          </p>
        </div>
      </div>

      {/* Horizontal Track (pinned on desktop, stacked on mobile) */}
      <div
        ref={trackRef}
        className="flex flex-col md:flex-row gap-6 md:gap-8 px-4 sm:px-6 md:pl-16 md:w-max items-stretch"
      >
        {worlds.map((w) => {
          const Icon = w.icon;
          return (
            <div
              key={w.num}
              className="w-full md:w-[480px] shrink-0 rounded-3xl p-7 sm:p-9 bg-white dark:bg-[#0D111A] border border-slate-200/90 dark:border-white/10 shadow-lg flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-5">
                  <span className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                    <Icon className="w-6 h-6" />
                  </span>
                  <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-white/10 text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                    {w.badge}
                  </span>
                </div>

                <p className="font-mono text-xs text-teal-600 dark:text-teal-400 font-bold uppercase tracking-wider">
                  World {w.num} • {w.role}
                </p>
                <h3 className="font-display font-black text-2xl text-slate-900 dark:text-white mt-1">
                  {w.title}
                </h3>
                <p className="font-body text-sm text-slate-600 dark:text-slate-300 mt-3 leading-relaxed">
                  {w.desc}
                </p>
              </div>

              {/* Mockup Preview Panel */}
              <div className="mt-8 rounded-2xl bg-slate-50 dark:bg-black/40 border border-slate-200/80 dark:border-white/10 p-5 font-mono text-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-white/10 text-slate-500 dark:text-slate-400">
                  <span>{w.preview.header}</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                </div>

                <div className="grid grid-cols-3 gap-2 text-center py-1">
                  {w.preview.stats.map((s, idx) => (
                    <div key={idx} className="p-2 rounded-lg bg-white/70 dark:bg-white/5">
                      <p className="font-bold text-slate-900 dark:text-white">{s.val}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">{s.label}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-1.5 pt-1 text-[11px] text-slate-600 dark:text-slate-400">
                  {w.preview.details.map((d, idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-teal-500 shrink-0" />
                      <span>{d}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
