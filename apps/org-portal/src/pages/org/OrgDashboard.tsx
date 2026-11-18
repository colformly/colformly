import { Link } from 'react-router-dom';
import {
  BookOpen,
  CheckCircle2,
  FileCheck2,
  GraduationCap,
  Palette,
  ShieldCheck,
  Upload,
  Users,
} from 'lucide-react';
import { useTheme } from '@colformly/theme';
import { Button, MetricCard } from '@colformly/ui';
import { PortalShell } from '../../layouts/PortalShell';

const RECENT_EVENTS = [
  { title: 'CSV Import Completed', meta: '142 B.Tech CSE Year-2 students enrolled', time: '12m ago' },
  { title: 'CS-301 Midterm Published', meta: 'Prof. Sarah Mitchell • Anti-Cheat Lock Active', time: '48m ago' },
  { title: 'Theme Config Synced', meta: 'Aravali Deep Teal • Floating Glass Layout', time: '2h ago' },
  { title: 'RLS Isolation Verified', meta: 'Zero cross-tenant anomalies across 1,850 sessions', time: '4h ago' },
];

export default function OrgDashboard() {
  const { classes, cardRadius } = useTheme();

  return (
    <PortalShell persona="org">
      <div className="space-y-8">
        {/* Top Action Bar */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-label text-xs text-primary font-bold uppercase tracking-wider">
                Enterprise Administration
              </span>
              <span className="text-slate-400 text-xs">•</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-50 text-primary text-xs font-semibold border border-teal-200">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                Supabase RLS Active
              </span>
            </div>
            <h1 className="font-headline font-bold text-2xl sm:text-3xl text-slate-900 tracking-tight">
              Campus Overview
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/org/branding">
              <Button variant="outline" size="sm" leftIcon={<Palette className="w-4 h-4" />}>
                Customize Theme
              </Button>
            </Link>
            <Link to="/org/directory">
              <Button size="sm" leftIcon={<Upload className="w-4 h-4" />}>
                Import CSV Roster
              </Button>
            </Link>
          </div>
        </header>

        {/* High-Level KPI Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <MetricCard
            title="Enrolled Students"
            value="1,854"
            delta="+142"
            trend="up"
            subtitle="This semester"
            icon={<GraduationCap className="w-5 h-5" />}
          />
          <MetricCard
            title="Active Faculty"
            value="94"
            delta="+6"
            trend="up"
            subtitle="Across 5 branches"
            icon={<Users className="w-5 h-5" />}
          />
          <MetricCard
            title="Papers Auto-Graded"
            value="14,280"
            delta="118ms avg"
            trend="up"
            subtitle="₹0 cloud burn"
            icon={<FileCheck2 className="w-5 h-5" />}
          />
          <MetricCard
            title="Anti-Cheat Integrity"
            value="99.4%"
            delta="0 leaks"
            trend="up"
            subtitle="Fullscreen enforced"
            icon={<ShieldCheck className="w-5 h-5" />}
          />
        </section>

        {/* Main 2-Column Content */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Branch Enrollment Breakdown */}
          <div className={`lg:col-span-2 p-6 ${classes.card}`}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-headline font-bold text-lg text-slate-900">
                  Department Exam Velocity
                </h2>
                <p className="text-xs text-slate-500">
                  Completed assessments &amp; average integrity score by department
                </p>
              </div>
              <Link to="/org/courses" className="text-xs font-label font-bold text-primary hover:underline">
                Manage Courses →
              </Link>
            </div>

            <div className="space-y-4">
              {[
                { name: 'B.Tech Computer Science (CSE)', students: 640, tests: 42, avg: 84 },
                { name: 'B.Tech Electronics & Comm (ECE)', students: 410, tests: 31, avg: 79 },
                { name: 'B.Tech Mechanical Engineering', students: 380, tests: 24, avg: 76 },
                { name: 'Master of Computer Applications (MCA)', students: 224, tests: 19, avg: 88 },
              ].map((dept) => (
                <div key={dept.name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-headline font-semibold text-slate-800">{dept.name}</span>
                    <span className="font-mono text-slate-500">
                      {dept.students} students • {dept.tests} exams •{' '}
                      <strong className="text-primary">{dept.avg}% avg</strong>
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${dept.avg}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Live Audit Stream */}
          <div className={`p-6 flex flex-col justify-between gap-4 ${classes.card}`}>
            <div>
              <h2 className="font-headline font-bold text-lg text-slate-900 mb-4">
                Campus Activity Log
              </h2>
              <div className="space-y-3.5">
                {RECENT_EVENTS.map((ev) => (
                  <div key={ev.title} className="flex items-start gap-3">
                    <div
                      className={`w-7 h-7 bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5 ${cardRadius}`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-headline font-bold text-slate-900">{ev.title}</p>
                      <p className="text-xs text-slate-500">{ev.meta}</p>
                      <p className="text-[11px] font-mono text-slate-400 mt-0.5">{ev.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Link
              to="/org/courses"
              className="pt-4 border-t border-slate-100 inline-flex items-center gap-1.5 text-xs font-label font-bold text-primary hover:underline"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Open Course Hierarchy</span>
            </Link>
          </div>
        </section>
      </div>
    </PortalShell>
  );
}
