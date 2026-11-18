import { Link } from 'react-router-dom';
import { BarChart3, Clock, FileEdit, Plus, ShieldCheck, Users } from 'lucide-react';
import { useTheme } from '@colformly/theme';
import { Button, MetricCard } from '@colformly/ui';
import { PortalShell } from '../../layouts/PortalShell';

const ACTIVE_TESTS = [
  { id: 'cs-301', title: 'CS-301 Algorithms Midterm', cohort: 'B.Tech CSE • Y2 Sec-A', submissions: '64/64', avg: '78.4%', status: 'Graded' },
  { id: 'cs-304', title: 'Operating Systems Deadlocks Quiz', cohort: 'B.Tech CSE • Y2 Sec-B', submissions: '58/60', avg: '71.2%', status: 'Live' },
  { id: 'cs-309', title: 'DBMS Indexing & B+ Trees Lab', cohort: 'B.Tech CSE • Y3 Sec-A', submissions: '0/58', avg: '—', status: 'Draft' },
];

export default function TeacherDashboard() {
  const { classes } = useTheme();

  return (
    <PortalShell persona="teacher">
      <div className="space-y-8">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="font-label text-xs text-primary font-bold uppercase tracking-wider mb-1">
              Faculty Workspace • Computer Science Dept
            </p>
            <h1 className="font-headline font-bold text-2xl sm:text-3xl text-slate-900">
              Welcome back, Prof. Sarah Mitchell
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/teacher/classes">
              <Button variant="outline" size="sm" leftIcon={<BarChart3 className="w-4 h-4" />}>
                Topic Autopsy
              </Button>
            </Link>
            <Link to="/teacher/test-studio">
              <Button size="sm" leftIcon={<Plus className="w-4 h-4" />}>
                New Exam in Studio
              </Button>
            </Link>
          </div>
        </header>

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <MetricCard
            title="Assigned Students"
            value="182"
            delta="3 sections"
            trend="neutral"
            icon={<Users className="w-5 h-5" />}
          />
          <MetricCard
            title="Class Mean Score"
            value="76.8%"
            delta="+5.2%"
            trend="up"
            subtitle="vs last midterm"
            icon={<BarChart3 className="w-5 h-5" />}
          />
          <MetricCard
            title="Hours Saved Grading"
            value="34.5 hrs"
            delta="100% auto"
            trend="up"
            subtitle="This month"
            icon={<Clock className="w-5 h-5" />}
          />
          <MetricCard
            title="Anti-Cheat Flags"
            value="3"
            delta="Low risk"
            trend="down"
            subtitle="Auto-logged"
            icon={<ShieldCheck className="w-5 h-5" />}
          />
        </section>

        <section className={`p-6 ${classes.card}`}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-headline font-bold text-lg text-slate-900">
                Active &amp; Recent Assessments
              </h2>
              <p className="text-xs text-slate-500">
                Instant SVG grading and anti-cheat telemetry enabled across all published exams.
              </p>
            </div>
            <Link to="/teacher/test-studio" className="text-xs font-label font-bold text-primary hover:underline">
              Open Test Studio →
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {ACTIVE_TESTS.map((t) => (
              <div
                key={t.id}
                className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-headline font-bold text-sm text-slate-900">{t.title}</h3>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-label font-bold border ${
                        t.status === 'Graded'
                          ? 'bg-teal-50 text-primary border-teal-200'
                          : t.status === 'Live'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      {t.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {t.cohort} • Submissions: <strong className="text-slate-700">{t.submissions}</strong> • Avg:{' '}
                    <strong className="text-primary">{t.avg}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Link to="/teacher/classes">
                    <Button size="sm" variant="outline" leftIcon={<BarChart3 className="w-3.5 h-3.5" />}>
                      Autopsy
                    </Button>
                  </Link>
                  <Link to="/teacher/test-studio">
                    <Button size="sm" variant="ghost" leftIcon={<FileEdit className="w-3.5 h-3.5" />}>
                      Edit
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </PortalShell>
  );
}
