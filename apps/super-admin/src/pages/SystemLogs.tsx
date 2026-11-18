import { useEffect, useState } from 'react';
import { Pause, Play, Terminal as TerminalIcon, Trash2 } from 'lucide-react';
import { Button } from '@colformly/ui';
import { SuperAdminShell } from '../layouts/SuperAdminShell';

type LogLevel = 'EDGE' | 'RLS' | 'AI' | 'WARN';

interface LogLine {
  id: string;
  ts: string;
  level: LogLevel;
  source: string;
  latency: string;
  message: string;
}

const SEED_LOGS: LogLine[] = [
  { id: '1', ts: '17:12:04.118', level: 'EDGE', source: 'cf-worker/bom01', latency: '14ms', message: 'POST /api/grade-paper org=aravali-eng test=cs-301 status=200' },
  { id: '2', ts: '17:12:05.842', level: 'RLS', source: 'pg-ap-south-1', latency: '4ms', message: 'Policy test_answer_keys_select_cheat_proof blocked pre-submit read uid=24cse041' },
  { id: '3', ts: '17:12:07.309', level: 'AI', source: 'cf-ai-router', latency: '212ms', message: 'BYOC explainer completed mode=real_life tokens=148 cost=$0.00' },
  { id: '4', ts: '17:12:09.014', level: 'WARN', source: 'anti-cheat/ws', latency: '9ms', message: 'Student 24CSE108 triggered visibilityState=hidden count=2/3 (flagged)' },
  { id: '5', ts: '17:12:11.662', level: 'EDGE', source: 'cf-worker/sin01', latency: '17ms', message: 'GET /api/leaderboard org=mit-wpu cache=HIT ttl=30s' },
];

const STREAM_POOL: Array<Omit<LogLine, 'id' | 'ts'>> = [
  { level: 'EDGE', source: 'cf-worker/bom01', latency: '12ms', message: 'POST /api/grade-paper org=aravali-eng batch=12 status=200' },
  { level: 'RLS', source: 'pg-ap-south-1', latency: '3ms', message: 'initPlan cache hit private.is_org_member(org_id) rows=64' },
  { level: 'AI', source: 'cf-ai-router', latency: '185ms', message: 'Test Studio block generation completed blocks=5 topic="B+ Trees"' },
  { level: 'EDGE', source: 'cf-worker/del01', latency: '15ms', message: 'GET /auth/v1/user pkce_cookie=valid role=TEACHER status=200' },
  { level: 'WARN', source: 'waf-edge', latency: '2ms', message: 'Blocked unauthenticated /rest/v1/users probe ip=198.51.100.24 status=401' },
];

export default function SystemLogs() {
  const [logs, setLogs] = useState<LogLine[]>(SEED_LOGS);
  const [streaming, setStreaming] = useState(true);
  const [levelFilter, setLevelFilter] = useState<'ALL' | LogLevel>('ALL');
  const [grep, setGrep] = useState('');

  useEffect(() => {
    if (!streaming) return;
    const interval = setInterval(() => {
      const sample = STREAM_POOL[Math.floor(Math.random() * STREAM_POOL.length)];
      const now = new Date();
      const ts = now.toTimeString().slice(0, 8) + '.' + String(now.getMilliseconds()).padStart(3, '0');
      setLogs((prev) => [{ ...sample, id: `${Date.now()}`, ts }, ...prev].slice(0, 40));
    }, 2200);

    return () => clearInterval(interval);
  }, [streaming]);

  const visible = logs.filter((line) => {
    const matchLevel = levelFilter === 'ALL' || line.level === levelFilter;
    const matchGrep =
      !grep.trim() ||
      line.message.toLowerCase().includes(grep.toLowerCase()) ||
      line.source.toLowerCase().includes(grep.toLowerCase());
    return matchLevel && matchGrep;
  });

  const levelBadge = (level: LogLevel) => {
    if (level === 'WARN') return 'text-amber-300 bg-amber-500/15 border-amber-500/30';
    if (level === 'RLS') return 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30';
    if (level === 'AI') return 'text-violet-300 bg-violet-500/15 border-violet-500/30';
    return 'text-teal-300 bg-teal-500/15 border-teal-500/30';
  };

  return (
    <SuperAdminShell>
      <div className="space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="font-mono text-xs text-teal-400 uppercase tracking-wider font-bold mb-1">
              Cloudflare Workers &amp; Supabase Telemetry
            </p>
            <h1 className="font-headline font-extrabold text-2xl sm:text-3xl text-white">
              Live System Logs Terminal
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="border-zinc-700 text-zinc-200 hover:bg-zinc-800"
              leftIcon={streaming ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              onClick={() => setStreaming((s) => !s)}
            >
              {streaming ? 'Pause Stream' : 'Resume Stream'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-zinc-400 hover:text-rose-400"
              leftIcon={<Trash2 className="w-3.5 h-3.5" />}
              onClick={() => setLogs([])}
            >
              Clear
            </Button>
          </div>
        </header>

        {/* Terminal Window */}
        <section className="rounded-2xl bg-[#050608] border border-zinc-800 shadow-2xl overflow-hidden">
          {/* Terminal Titlebar */}
          <div className="px-4 py-3 bg-zinc-900/90 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500/80" />
              <span className="w-3 h-3 rounded-full bg-amber-400/80" />
              <span className="w-3 h-3 rounded-full bg-emerald-400/80" />
              <span className="ml-3 font-mono text-xs text-zinc-300 flex items-center gap-1.5">
                <TerminalIcon className="w-3.5 h-3.5 text-teal-400" />
                colformly@edge-ap-south-1:~# tail -f workers.log
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {(['ALL', 'EDGE', 'RLS', 'AI', 'WARN'] as const).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setLevelFilter(lvl)}
                  className={`px-2.5 py-1 rounded font-mono text-[11px] font-bold transition-colors ${
                    levelFilter === lvl
                      ? 'bg-teal-500 text-zinc-950'
                      : 'bg-zinc-950 text-zinc-400 border border-zinc-800 hover:text-zinc-200'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          {/* Grep Command Input */}
          <div className="px-4 py-2.5 border-b border-zinc-800/80 bg-zinc-950 flex items-center gap-2 font-mono text-xs">
            <span className="text-teal-400 font-bold">$ grep -i</span>
            <input
              type="text"
              value={grep}
              onChange={(e) => setGrep(e.target.value)}
              placeholder="aravali | rls | 401 | cf-worker..."
              className="flex-1 bg-transparent text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
            />
            <span className="text-zinc-500">{visible.length} lines</span>
          </div>

          {/* Monospace Log Stream */}
          <div className="p-4 h-[460px] overflow-y-auto font-mono text-xs space-y-2">
            {visible.length === 0 ? (
              <p className="text-zinc-600 italic">No log lines match current filter.</p>
            ) : (
              visible.map((line) => (
                <div
                  key={line.id}
                  className="flex flex-wrap sm:flex-nowrap items-baseline gap-2.5 py-1.5 px-2.5 rounded-lg hover:bg-zinc-900/70 transition-colors"
                >
                  <span className="text-zinc-500 shrink-0">{line.ts}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded border text-[10px] font-bold shrink-0 ${levelBadge(line.level)}`}
                  >
                    {line.level}
                  </span>
                  <span className="text-cyan-400 shrink-0">[{line.source}]</span>
                  <span className="text-zinc-200 flex-1 break-all">{line.message}</span>
                  <span className="text-emerald-400 font-bold shrink-0">{line.latency}</span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </SuperAdminShell>
  );
}
