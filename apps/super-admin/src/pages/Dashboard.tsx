import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  Building2,
  Cpu,
  DollarSign,
  Plus,
  RefreshCw,
  ShieldCheck,
  Terminal,
} from 'lucide-react';
import { Button, MetricCard } from '@colformly/ui';
import { SuperAdminShell } from '../layouts/SuperAdminShell';

const EDGE_REGIONS = [
  { region: 'ap-south-1 (Mumbai)', rps: '1,840 req/s', p99: '16ms', health: '99.99%' },
  { region: 'ap-southeast-1 (Singapore)', rps: '620 req/s', p99: '21ms', health: '99.98%' },
  { region: 'eu-central-1 (Frankfurt)', rps: '410 req/s', p99: '24ms', health: '99.97%' },
  { region: 'us-east-1 (Virginia)', rps: '330 req/s', p99: '27ms', health: '99.99%' },
];

export default function Dashboard() {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 650);
  };

  return (
    <SuperAdminShell>
      <div className="space-y-7">
        {/* Top Command Header */}
        <header className="p-6 rounded-2xl bg-zinc-900/80 border border-zinc-800/90 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="font-headline font-extrabold text-2xl sm:text-3xl text-white tracking-tight">
                Founder Command Center
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 font-mono text-[11px] font-bold text-emerald-300">
                ALL SYSTEMS NOMINAL
              </span>
            </div>
            <p className="text-sm text-zinc-400 mt-1">
              Global SaaS revenue telemetry, active college tenants, and Cloudflare edge relay health.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              size="sm"
              variant="outline"
              className="border-zinc-700 text-zinc-200 hover:bg-zinc-800"
              leftIcon={<RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />}
              onClick={handleRefresh}
            >
              Sync Telemetry
            </Button>
            <Link to="/clients">
              <Button size="sm" leftIcon={<Plus className="w-4 h-4" />}>
                Manage Colleges
              </Button>
            </Link>
          </div>
        </header>

        {/* Global KPI Strip */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <MetricCard
            title="Global MRR"
            value="$42,850"
            delta="+18.4%"
            trend="up"
            subtitle="$514k ARR run-rate"
            icon={<DollarSign className="w-5 h-5" />}
          />
          <MetricCard
            title="Active Colleges"
            value="34 / 38"
            delta="+4 this mo"
            trend="up"
            subtitle="31 Campus • 3 Enterprise"
            icon={<Building2 className="w-5 h-5" />}
          />
          <MetricCard
            title="CF Worker Executions"
            value="1.48M"
            delta="18ms P99"
            trend="up"
            subtitle="99.96% success"
            icon={<Cpu className="w-5 h-5" />}
          />
          <MetricCard
            title="Gross Infra Margin"
            value="98.7%"
            delta="BYOS Mode"
            trend="up"
            subtitle="$0.00 AWS burn"
            icon={<ShieldCheck className="w-5 h-5" />}
          />
        </section>

        {/* 2-Column Telemetry + Regional Nodes */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Revenue & Tenant Growth Chart */}
          <div className="lg:col-span-7 p-6 rounded-2xl bg-zinc-900/80 border border-zinc-800/90 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-headline font-bold text-base text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-teal-400" />
                  <span>Global MRR &amp; Concurrent Exam Throughput</span>
                </h2>
                <p className="font-mono text-xs text-zinc-400 mt-0.5">
                  Trailing 6 months • Flat Campus License adoption curve
                </p>
              </div>
              <span className="px-2.5 py-1 rounded bg-zinc-950 border border-zinc-800 font-mono text-[11px] text-teal-300">
                +142% QoQ
              </span>
            </div>

            <div className="h-52 w-full">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 500 170" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="superTeal" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#14B8A6" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#14B8A6" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <line x1="0" y1="40" x2="500" y2="40" stroke="#27272A" strokeWidth="1" />
                <line x1="0" y1="90" x2="500" y2="90" stroke="#27272A" strokeWidth="1" />
                <line x1="0" y1="140" x2="500" y2="140" stroke="#27272A" strokeWidth="1" />
                <path
                  d="M 0 145 Q 80 132, 150 105 T 290 72 T 410 38 T 500 18 L 500 170 L 0 170 Z"
                  fill="url(#superTeal)"
                />
                <path
                  d="M 0 145 Q 80 132, 150 105 T 290 72 T 410 38 T 500 18"
                  fill="none"
                  stroke="#2DD4BF"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                />
                <circle cx="410" cy="38" r="5" fill="#2DD4BF" />
                <circle cx="410" cy="38" r="10" fill="#2DD4BF" fillOpacity="0.2" />
              </svg>
            </div>

            <div className="flex items-center justify-between font-mono text-[11px] text-zinc-500 pt-3 border-t border-zinc-800">
              <span>JUN</span>
              <span>JUL</span>
              <span>AUG</span>
              <span>SEP</span>
              <span>OCT</span>
              <span className="text-teal-300 font-bold">NOV • $42.8k</span>
            </div>
          </div>

          {/* Regional Cloudflare POP Health */}
          <div className="lg:col-span-5 p-6 rounded-2xl bg-zinc-900/80 border border-zinc-800/90 flex flex-col justify-between gap-4">
            <div>
              <h2 className="font-headline font-bold text-base text-white mb-4">
                Edge POP &amp; Supabase Pool Health
              </h2>
              <div className="space-y-3">
                {EDGE_REGIONS.map((node) => (
                  <div
                    key={node.region}
                    className="p-3.5 rounded-xl bg-zinc-950/90 border border-zinc-800/90 flex items-center justify-between gap-3"
                  >
                    <div>
                      <p className="font-mono text-xs font-bold text-zinc-100">{node.region}</p>
                      <p className="font-mono text-[11px] text-zinc-500 mt-0.5">
                        {node.rps} • P99 <span className="text-teal-400">{node.p99}</span>
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 font-mono text-[11px] font-bold text-emerald-300">
                      {node.health}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <Link
              to="/system-logs"
              className="pt-4 border-t border-zinc-800 inline-flex items-center justify-between text-xs font-mono font-bold text-teal-400 hover:text-teal-300"
            >
              <span className="inline-flex items-center gap-1.5">
                <Terminal className="w-4 h-4" /> Tail Live Cloudflare / API Logs
              </span>
              <span>→</span>
            </Link>
          </div>
        </section>
      </div>
    </SuperAdminShell>
  );
}
