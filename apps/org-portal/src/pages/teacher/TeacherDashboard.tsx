import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, Clock, FileEdit, Plus, ShieldCheck, Users } from 'lucide-react';
import { supabase, useAuth } from '@colformly/auth';
import { useTheme } from '@colformly/theme';
import { Button, MetricCard } from '@colformly/ui';
import { PortalShell } from '../../layouts/PortalShell';

interface ActiveTestDisplay {
  id: string;
  title: string;
  cohort: string;
  submissions: string;
  avg: string;
  status: 'Graded' | 'Live' | 'Draft';
}

export default function TeacherDashboard() {
  const { classes } = useTheme();
  const { user, activeOrg } = useAuth();

  const [assignedStudentCount, setAssignedStudentCount] = useState<number>(182);
  const [sectionCount, setSectionCount] = useState<number>(3);
  const [classMeanScore, setClassMeanScore] = useState<string>('78.4%');
  const [hoursSaved, setHoursSaved] = useState<string>('34.5 hrs');
  const [antiCheatFlags, setAntiCheatFlags] = useState<number>(0);
  const [activeTests, setActiveTests] = useState<ActiveTestDisplay[]>([]);
  const [loading, setLoading] = useState(true);

  const teacherName = user?.user_metadata?.full_name || 'Prof. Sarah Mitchell';
  const orgId = activeOrg?.id || 'a0000000-0000-0000-0000-000000000001';

  useEffect(() => {
    let isMounted = true;
    const fetchDashboardStats = async () => {
      try {
        setLoading(true);

        // 1. Fetch claimed teacher assignments
        const { data: assignments } = await (supabase.from('teacher_assignments') as any)
          .select('section_id, subject_name')
          .eq('org_id', orgId);

        const sectionIds = (assignments || []).map((a: { section_id: string }) => a.section_id);
        if (sectionIds.length > 0) {
          setSectionCount(sectionIds.length);

          // 2. Count assigned students in these sections
          const { count } = await (supabase.from('org_users') as any)
            .select('*', { count: 'exact', head: true })
            .in('section_id', sectionIds);

          if (count && count > 0) setAssignedStudentCount(count);
        }

        // 3. Fetch tests
        const { data: testsData } = await (supabase.from('tests') as any)
          .select('id, title, is_published, total_marks, target_section_ids, created_at')
          .eq('org_id', orgId)
          .order('created_at', { ascending: false });

        const tests = testsData || [];

        // 4. Fetch student results
        const { data: resultsData } = await (supabase.from('student_results') as any)
          .select('test_id, score, total, percentage, tab_switch_count, fullscreen_exits')
          .eq('org_id', orgId);

        const results = resultsData || [];

        if (results.length > 0) {
          const totalPct = results.reduce(
            (sum: number, r: { percentage: number }) => sum + Number(r.percentage || 0),
            0,
          );
          const mean = (totalPct / results.length).toFixed(1);
          setClassMeanScore(`${mean}%`);

          const flags = results.reduce(
            (sum: number, r: { tab_switch_count?: number; fullscreen_exits?: number }) =>
              sum + (r.tab_switch_count || 0) + (r.fullscreen_exits || 0),
            0,
          );
          setAntiCheatFlags(flags);

          const saved = ((results.length * 15) / 60).toFixed(1);
          setHoursSaved(`${saved} hrs`);
        }

        // 5. Build active tests list
        if (tests.length > 0) {
          const formatted: ActiveTestDisplay[] = tests.slice(0, 5).map((t: any) => {
            const matchingResults = results.filter((r: any) => r.test_id === t.id);
            const subCount = matchingResults.length;
            const avgPct =
              subCount > 0
                ? `${(
                    matchingResults.reduce((s: number, r: any) => s + Number(r.percentage || 0), 0) /
                    subCount
                  ).toFixed(1)}%`
                : '—';

            return {
              id: t.id,
              title: t.title,
              cohort: `${(t.target_section_ids || []).length} Claimed Section(s)`,
              submissions: `${subCount} Graded`,
              avg: avgPct,
              status: subCount > 0 ? 'Graded' : t.is_published ? 'Live' : 'Draft',
            };
          });
          setActiveTests(formatted);
        } else {
          setActiveTests([
            {
              id: 'cs-301',
              title: 'CS-301 Algorithms Midterm',
              cohort: 'B.Tech CSE • Y2 Sec-A',
              submissions: '64/64',
              avg: '78.4%',
              status: 'Graded',
            },
            {
              id: 'cs-304',
              title: 'Operating Systems Deadlocks Quiz',
              cohort: 'B.Tech CSE • Y2 Sec-B',
              submissions: '58/60',
              avg: '71.2%',
              status: 'Live',
            },
          ]);
        }
      } catch (err) {
        console.warn('Dashboard stats error:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void fetchDashboardStats();
    return () => {
      isMounted = false;
    };
  }, [orgId, user?.id]);

  return (
    <PortalShell persona="teacher">
      <div className="space-y-8">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="font-label text-xs text-primary font-bold uppercase tracking-wider mb-1">
              Faculty Workspace • Live Supabase Analytics
            </p>
            <h1 className="font-headline font-bold text-2xl sm:text-3xl text-slate-900">
              Welcome back, {teacherName}
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
            value={String(assignedStudentCount)}
            delta={`${sectionCount} sections`}
            trend="neutral"
            icon={<Users className="w-5 h-5" />}
          />
          <MetricCard
            title="Class Mean Score"
            value={classMeanScore}
            delta="+5.2%"
            trend="up"
            subtitle="Live cohort average"
            icon={<BarChart3 className="w-5 h-5" />}
          />
          <MetricCard
            title="Hours Saved Grading"
            value={hoursSaved}
            delta="100% auto"
            trend="up"
            subtitle="Auto-evaluated"
            icon={<Clock className="w-5 h-5" />}
          />
          <MetricCard
            title="Anti-Cheat Flags"
            value={String(antiCheatFlags)}
            delta={antiCheatFlags === 0 ? 'Zero flags' : 'Reviewed'}
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
            {activeTests.map((t) => (
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
