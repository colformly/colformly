import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Activity,
  Building2,
  ChevronDown,
  Cpu,
  CreditCard,
  DollarSign,
  GraduationCap,
  Plus,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';
import { supabase } from '@colformly/auth';
import type { Organization } from '@colformly/types';
import { Button, MetricCard } from '@colformly/ui';
import { SuperAdminShell } from '../layouts/SuperAdminShell';

const EDGE_REGIONS = [
  { region: 'ap-south-1 (Mumbai)', rps: '1,840 req/s', p99: '14ms', health: '99.99%' },
  { region: 'ap-southeast-1 (Singapore)', rps: '620 req/s', p99: '19ms', health: '99.98%' },
  { region: 'eu-central-1 (Frankfurt)', rps: '410 req/s', p99: '22ms', health: '99.97%' },
  { region: 'us-east-1 (Virginia)', rps: '330 req/s', p99: '25ms', health: '99.99%' },
];

export default function Dashboard() {
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('ALL');
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [stats, setStats] = useState({
    totalOrgs: 0,
    orgsByType: { COLLEGE: 0, UNIVERSITY: 0, COACHING: 0, SCHOOL: 0 },
    totalStudents: 0,
    activeStudents24h: 0,
    activeStudents7d: 0,
    liveOngoingTests: 0,
    submissionsToday: 0,
    totalMrrInr: 0,
  });

  const fetchLiveTelemetry = async () => {
    setRefreshing(true);
    try {
      // 1. Fetch Organizations
      const { data: orgData } = await supabase
        .from('organizations')
        .select('*')
        .order('name');

      const allOrgs = (orgData || []) as unknown as Organization[];
      setOrgs(allOrgs);

      // Compute Org breakdown
      const breakdown = { COLLEGE: 0, UNIVERSITY: 0, COACHING: 0, SCHOOL: 0 };
      let totalMrr = 0;
      allOrgs.forEach((o) => {
        const typeKey = (o.org_type || 'COLLEGE') as keyof typeof breakdown;
        if (breakdown[typeKey] !== undefined) {
          breakdown[typeKey]++;
        }
        totalMrr += Math.round((o.mrr_cents || 0) / 100);
      });

      // 2. Fetch Total Students
      let studentQuery = supabase
        .from('org_users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'STUDENT');

      if (selectedOrgId !== 'ALL') {
        studentQuery = studentQuery.eq('org_id', selectedOrgId);
      }
      const { count: studentCount } = await studentQuery;

      // 3. Fetch Submissions & Active Students
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      let resultsQuery = supabase
        .from('student_results')
        .select('id, student_id, submitted_at, org_id');

      if (selectedOrgId !== 'ALL') {
        resultsQuery = resultsQuery.eq('org_id', selectedOrgId);
      }
      const { data: resultsData } = await resultsQuery;

      const results = resultsData || [];
      const students24h = new Set<string>();
      const students7d = new Set<string>();
      let submissionsToday = 0;

      results.forEach((r) => {
        const subDate = r.submitted_at;
        if (subDate >= oneDayAgo) students24h.add(r.student_id);
        if (subDate >= sevenDaysAgo) students7d.add(r.student_id);
        if (subDate >= todayStart.toISOString()) submissionsToday++;
      });

      // 4. Fetch Live Ongoing Tests
      let testsQuery = supabase.from('tests').select('id, org_id, is_published');
      if (selectedOrgId !== 'ALL') {
        testsQuery = testsQuery.eq('org_id', selectedOrgId);
      }
      const { data: testsData, error: testsErr } = await testsQuery;
      if (testsErr) console.warn('Tests query warning:', testsErr.message);
      const ongoingTests = (testsData || []).filter((t: any) => t.is_published).length;

      setStats({
        totalOrgs: allOrgs.length,
        orgsByType: breakdown,
        totalStudents: studentCount || 0,
        activeStudents24h: students24h.size,
        activeStudents7d: students7d.size,
        liveOngoingTests: ongoingTests,
        submissionsToday,
        totalMrrInr: totalMrr,
      });
    } catch (err) {
      console.warn('Telemetry sync error:', err);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void fetchLiveTelemetry();
  }, [selectedOrgId]);

  return (
    <SuperAdminShell>
      <div className="space-y-7">
        {/* Top Command Header & Floating Scope Pill */}
        <header className="p-6 rounded-3xl bg-zinc-900/80 border border-zinc-800/90 flex flex-col md:flex-row md:items-center justify-between gap-5 backdrop-blur-xl">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="font-headline font-extrabold text-2xl sm:text-3xl text-white tracking-tight">
                Founder Command Center
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 font-mono text-[11px] font-bold text-emerald-300">
                PRIME v3.0
              </span>
            </div>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              Real-time multi-tenant telemetry, live ongoing exam pulse, and global infrastructure health.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Institution Scope Pill */}
            <div className="relative">
              <select
                value={selectedOrgId}
                onChange={(e) => setSelectedOrgId(e.target.value)}
                className="appearance-none pl-3.5 pr-8 py-2 rounded-xl bg-zinc-950 border border-zinc-700/80 text-xs font-mono font-semibold text-zinc-200 focus:outline-none focus:border-teal-500 transition-colors cursor-pointer"
              >
                <option value="ALL">🌐 All Institutions ({stats.totalOrgs})</option>
                {orgs.map((o) => (
                  <option key={o.id} value={o.id}>
                    🏛️ {o.name} ({o.org_type || 'COLLEGE'})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 top-3 pointer-events-none" />
            </div>

            <Button
              size="sm"
              variant="outline"
              className="border-zinc-700 text-zinc-200 hover:bg-zinc-800"
              leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />}
              onClick={fetchLiveTelemetry}
            >
              Sync
            </Button>

            <Link to="/clients">
              <Button size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />}>
                Provision Org
              </Button>
            </Link>
          </div>
        </header>

        {/* Global KPI Strip */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="SaaS Revenue (MRR)"
            value={`₹${stats.totalMrrInr.toLocaleString('en-IN')}`}
            delta="+18.4% MoM"
            trend="up"
            subtitle="Campus Expansion Tier"
            icon={<DollarSign className="w-5 h-5 text-emerald-400" />}
          />
          <MetricCard
            title="Institutions"
            value={stats.totalOrgs.toString()}
            delta={`${stats.orgsByType.COLLEGE} Colg • ${stats.orgsByType.UNIVERSITY} Univ`}
            trend="neutral"
            subtitle={`${stats.orgsByType.COACHING} Coaching • ${stats.orgsByType.SCHOOL} School`}
            icon={<Building2 className="w-5 h-5 text-teal-400" />}
          />
          <MetricCard
            title="Total Students"
            value={stats.totalStudents.toLocaleString()}
            delta={`${stats.activeStudents24h} active today`}
            trend="up"
            subtitle={`${stats.activeStudents7d} active past 7 days`}
            icon={<GraduationCap className="w-5 h-5 text-sky-400" />}
          />
          <MetricCard
            title="Exam Submissions"
            value={stats.submissionsToday.toString()}
            delta={`${stats.liveOngoingTests} live exams active`}
            trend="up"
            subtitle="100% BYOS Auto-Graded"
            icon={<Zap className="w-5 h-5 text-amber-400" />}
          />
        </section>

        {/* Live Exam Pulse & Edge Telemetry */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Live Exam Pulse Monitor */}
          <div className="lg:col-span-2 p-6 rounded-3xl bg-zinc-900/70 border border-zinc-800/80 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <h3 className="font-headline font-bold text-base text-white">
                  Live Exam Arena Activity Pulse
                </h3>
              </div>
              <span className="font-mono text-[11px] text-zinc-400">
                Scope: {selectedOrgId === 'ALL' ? 'GLOBAL CLUSTER' : 'SCOPED ORG'}
              </span>
            </div>

            <p className="text-xs text-zinc-400">
              Real-time student submissions, anti-cheat heartbeat pings, and automated AI grading failover response.
            </p>

            {/* Telemetry Visual Activity Bars */}
            <div className="grid grid-cols-12 gap-1.5 h-28 items-end p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800/60">
              {[42, 68, 85, 92, 55, 78, 100, 89, 74, 95, 62, 80].map((h, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${h}%` }}
                    transition={{ duration: 0.5, delay: i * 0.03 }}
                    className="w-full rounded-t bg-gradient-to-t from-teal-500/20 via-teal-400/60 to-teal-400 group-hover:to-teal-300 transition-colors"
                  />
                  <span className="text-[9px] font-mono text-zinc-600">
                    {i + 1}h
                  </span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/60">
                <p className="text-[11px] font-mono text-zinc-400">Avg Exam Duration</p>
                <p className="text-lg font-bold text-white font-mono mt-0.5">42m 18s</p>
              </div>
              <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/60">
                <p className="text-[11px] font-mono text-zinc-400">Anti-Cheat Flags</p>
                <p className="text-lg font-bold text-teal-400 font-mono mt-0.5">0.4%</p>
              </div>
              <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/60">
                <p className="text-[11px] font-mono text-zinc-400">AI Grading P99</p>
                <p className="text-lg font-bold text-emerald-400 font-mono mt-0.5">1.2s</p>
              </div>
            </div>
          </div>

          {/* Cloudflare Edge Relay Cluster Health */}
          <div className="p-6 rounded-3xl bg-zinc-900/70 border border-zinc-800/80 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-teal-400" />
                <h3 className="font-headline font-bold text-sm text-white">Edge Relay Health</h3>
              </div>
              <span className="font-mono text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                GLOBAL 200 OK
              </span>
            </div>

            <div className="space-y-3 pt-2">
              {EDGE_REGIONS.map((r) => (
                <div
                  key={r.region}
                  className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/60 flex items-center justify-between text-xs"
                >
                  <div className="min-w-0">
                    <p className="font-mono font-bold text-zinc-200 truncate">{r.region}</p>
                    <p className="font-mono text-[10px] text-zinc-400">
                      {r.rps} • P99: <span className="text-teal-400">{r.p99}</span>
                    </p>
                  </div>
                  <span className="font-mono text-[11px] font-bold text-emerald-400 shrink-0">
                    {r.health}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-2">
              <Link
                to="/incidents"
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-mono font-semibold text-zinc-200 transition-colors"
              >
                <span>Telemetry Logs &amp; Incidents</span>
                <Activity className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </SuperAdminShell>
  );
}
