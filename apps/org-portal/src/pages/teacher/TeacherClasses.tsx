import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Mail, Send, Sparkles } from 'lucide-react';
import { useTheme } from '@colformly/theme';
import { BaseModal, Button, MetricCard } from '@colformly/ui';
import { PortalShell } from '../../layouts/PortalShell';

const TOPIC_AUTOPSY = [
  { topic: 'Dynamic Programming (0/1 Knapsack)', accuracy: 42, missedBy: 37, severity: 'critical' },
  { topic: 'OS Deadlock Avoidance (Banker Alg)', accuracy: 54, missedBy: 29, severity: 'warning' },
  { topic: 'Red-Black & AVL Tree Rotations', accuracy: 69, missedBy: 20, severity: 'moderate' },
  { topic: 'Graph Traversals (BFS / Dijkstra)', accuracy: 88, missedBy: 8, severity: 'healthy' },
  { topic: 'Time Complexity Master Theorem', accuracy: 93, missedBy: 4, severity: 'healthy' },
];

const INTERVENTION_LIST = [
  { id: 's1', name: 'Rohan Kulkarni', roll: '24CSE108', score: '41%', weakTopic: 'Dynamic Programming', tabSwitches: 2 },
  { id: 's2', name: 'Meera Joshi', roll: '24CSE074', score: '46%', weakTopic: 'OS Deadlocks', tabSwitches: 0 },
  { id: 's3', name: 'Siddharth Rao', roll: '24CSE092', score: '52%', weakTopic: 'Dynamic Programming', tabSwitches: 1 },
];

export default function TeacherClasses() {
  const { classes } = useTheme();
  const [cohort, setCohort] = useState('CSE Sec-A (Algorithms)');
  const [messageTarget, setMessageTarget] = useState<(typeof INTERVENTION_LIST)[number] | null>(null);
  const [messageBody, setMessageBody] = useState('');
  const [sentIds, setSentIds] = useState<Record<string, boolean>>({});

  const openMessage = (student: (typeof INTERVENTION_LIST)[number]) => {
    setMessageTarget(student);
    setMessageBody(
      `Hi ${student.name.split(' ')[0]}, I noticed ${student.weakTopic} was tricky on the midterm. Let's review it during Thursday's 4 PM lab clinic!`,
    );
  };

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageTarget) return;
    setSentIds((prev) => ({ ...prev, [messageTarget.id]: true }));
    setMessageTarget(null);
  };

  return (
    <PortalShell persona="teacher">
      <div className="space-y-8">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="font-label text-xs text-primary font-bold uppercase tracking-wider mb-1">
              Diagnostic Intelligence
            </p>
            <h1 className="font-headline font-bold text-2xl sm:text-3xl text-slate-900">
              Class Averages, Topic Autopsy &amp; Intervention
            </h1>
          </div>

          <select
            value={cohort}
            onChange={(e) => setCohort(e.target.value)}
            className={`px-4 py-2 text-xs font-label font-semibold ${classes.input}`}
          >
            <option>CSE Sec-A (Algorithms)</option>
            <option>CSE Sec-B (Operating Systems)</option>
            <option>All Enrolled Cohorts</option>
          </select>
        </header>

        {/* Summary Strip */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard title="Exam Takers" value="128" delta="100% submitted" trend="up" />
          <MetricCard title="Median Score" value="74.2%" delta="+3.1%" trend="up" />
          <MetricCard title="Weakest Topic" value="42%" delta="DP Recurrence" trend="down" />
          <MetricCard title="Intervention Needed" value="3 Students" delta="< 55% score" trend="down" />
        </section>

        {/* 2-Column Topic Autopsy + Intervention List */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Topic Autopsy */}
          <div className={`lg:col-span-7 p-6 space-y-5 ${classes.card}`}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-headline font-bold text-lg text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <span>Topic Autopsy ({cohort})</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Auto-grouped by syllabus tag from <code className="font-mono">test_answer_keys.topic</code>
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {TOPIC_AUTOPSY.map((item) => {
                const barColor =
                  item.severity === 'critical'
                    ? 'bg-rose-500'
                    : item.severity === 'warning'
                      ? 'bg-amber-500'
                      : item.severity === 'moderate'
                        ? 'bg-sky-500'
                        : 'bg-primary';
                return (
                  <div key={item.topic} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs gap-2">
                      <span className="font-headline font-semibold text-slate-900">
                        {item.topic}
                      </span>
                      <span className="font-mono text-slate-600 shrink-0">
                        <strong className="text-slate-900">{item.accuracy}%</strong> accuracy •{' '}
                        {item.missedBy} missed
                      </span>
                    </div>
                    <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${barColor}`}
                        style={{ width: `${item.accuracy}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Intervention Needed List */}
          <div className={`lg:col-span-5 p-6 space-y-4 ${classes.card}`}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-headline font-bold text-lg text-slate-900 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  <span>Intervention Needed</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Students scoring below 55% or showing anti-cheat flags
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {INTERVENTION_LIST.map((s) => (
                <div
                  key={s.id}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-headline font-bold text-sm text-slate-900 truncate">
                        {s.name}
                      </p>
                      <span className="font-mono text-[11px] font-bold text-rose-600">
                        {s.score}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 truncate">
                      {s.roll} • Struggled on <strong className="text-slate-700">{s.weakTopic}</strong>
                    </p>
                    {s.tabSwitches > 0 && (
                      <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold">
                        {s.tabSwitches} tab switch flag(s)
                      </span>
                    )}
                  </div>

                  {sentIds[s.id] ? (
                    <span className="inline-flex items-center gap-1 text-xs font-label font-bold text-emerald-700 shrink-0">
                      <CheckCircle2 className="w-4 h-4" /> Sent
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      leftIcon={<Mail className="w-3.5 h-3.5" />}
                      onClick={() => openMessage(s)}
                    >
                      Message
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Message Student Modal */}
        <BaseModal
          open={Boolean(messageTarget)}
          onClose={() => setMessageTarget(null)}
          title={messageTarget ? `Message ${messageTarget.name}` : ''}
          description="Send a targeted remedial study note directly to the student's portal inbox."
        >
          <form onSubmit={sendMessage} className="space-y-4">
            <textarea
              rows={4}
              required
              value={messageBody}
              onChange={(e) => setMessageBody(e.target.value)}
              className={`w-full p-3.5 text-sm ${classes.input}`}
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setMessageTarget(null)}>
                Cancel
              </Button>
              <Button type="submit" leftIcon={<Send className="w-4 h-4" />}>
                Send Intervention Note
              </Button>
            </div>
          </form>
        </BaseModal>
      </div>
    </PortalShell>
  );
}
