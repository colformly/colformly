import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Building2,
  Check,
  CheckCircle2,
  Clock,
  Code,
  Copy,
  Cpu,
  Eye,
  Filter,
  Globe,
  Info,
  Play,
  Plus,
  RefreshCw,
  Search,
  Server,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import { supabase } from '@colformly/auth';
import type { SystemIncident, Organization } from '@colformly/types';
import { Button, MetricCard } from '@colformly/ui';
import { SuperAdminShell } from '../layouts/SuperAdminShell';

const WORKER_URL =
  import.meta.env.VITE_CLOUDFLARE_WORKER_URL ||
  'https://colformly-worker.colformly.workers.dev';

export default function Incidents() {
  const [incidents, setIncidents] = useState<SystemIncident[]>([]);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [severityFilter, setSeverityFilter] = useState<'ALL' | 'CRITICAL' | 'WARNING' | 'INFO'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNRESOLVED' | 'RESOLVED'>('UNRESOLVED');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected incident for payload inspector modal
  const [inspectIncident, setInspectIncident] = useState<SystemIncident | null>(null);
  const [copiedPayload, setCopiedPayload] = useState(false);

  // Manual Test Incident Modal
  const [showSimulateModal, setShowSimulateModal] = useState(false);
  const [simForm, setSimForm] = useState<{
    severity: 'CRITICAL' | 'WARNING' | 'INFO';
    category: 'SUPABASE_DB' | 'AUTH_SECURITY' | 'RATE_LIMIT' | 'AI_ROUTER' | 'WORKER_CRASH' | 'ANTI_CHEAT';
    org_id: string;
    message: string;
    payloadText: string;
  }>({
    severity: 'WARNING',
    category: 'AI_ROUTER',
    org_id: '',
    message: 'Simulated AI provider rate limit failover from Groq to Gemini',
    payloadText: JSON.stringify({ model: 'llama-3.3-70b-versatile', retryCount: 2, fallback: 'gemini-1.5-flash' }, null, 2),
  });
  const [simulating, setSimulating] = useState(false);

  // Live Edge Worker Health
  const [edgeHealth, setEdgeHealth] = useState<{
    status: 'online' | 'degraded' | 'offline' | 'checking';
    latencyMs: number;
    workerVersion?: string;
    lastChecked: string;
  }>({
    status: 'checking',
    latencyMs: 0,
    lastChecked: 'Never',
  });

  // Load Incidents and Orgs
  const fetchIncidents = async () => {
    setRefreshing(true);
    try {
      const [incRes, orgRes] = await Promise.all([
        supabase
          .from('system_incidents')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100),
        supabase.from('organizations').select('id, name, slug, institute_code'),
      ]);

      if (incRes.error) console.warn('Fetch incidents warning:', incRes.error.message);
      if (orgRes.error) console.warn('Fetch orgs warning:', orgRes.error.message);

      if (incRes.data) {
        setIncidents(incRes.data as unknown as SystemIncident[]);
      }
      if (orgRes.data) {
        setOrgs(orgRes.data as unknown as Organization[]);
      }
    } catch (err) {
      console.error('Error fetching incidents:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Check Edge Worker status
  const checkWorkerStatus = async () => {
    setEdgeHealth((prev) => ({ ...prev, status: 'checking' }));
    const startTime = performance.now();
    try {
      const res = await fetch(WORKER_URL, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      const latency = Math.round(performance.now() - startTime);
      if (res.ok) {
        const body = (await res.json().catch(() => ({}))) as any;
        setEdgeHealth({
          status: 'online',
          latencyMs: latency,
          workerVersion: body.version || '3.0.0-prime',
          lastChecked: new Date().toLocaleTimeString(),
        });
      } else {
        setEdgeHealth({
          status: 'degraded',
          latencyMs: latency,
          lastChecked: new Date().toLocaleTimeString(),
        });
      }
    } catch (e) {
      setEdgeHealth({
        status: 'offline',
        latencyMs: 0,
        lastChecked: new Date().toLocaleTimeString(),
      });
    }
  };

  useEffect(() => {
    void fetchIncidents();
    void checkWorkerStatus();

    // Subscribe to realtime incident events
    const channel = supabase
      .channel('incidents-realtime-feed')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'system_incidents' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setIncidents((prev) => [payload.new as unknown as SystemIncident, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setIncidents((prev) =>
              prev.map((item) =>
                item.id === payload.new.id ? (payload.new as unknown as SystemIncident) : item
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setIncidents((prev) => prev.filter((item) => item.id === payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  // 1-Click Resolve Incident
  const handleResolveIncident = async (id: string) => {
    try {
      const { error } = await supabase
        .from('system_incidents')
        .update({ resolved: true })
        .eq('id', id);

      if (error) throw error;
      setIncidents((prev) =>
        prev.map((inc) => (inc.id === id ? { ...inc, resolved: true } : inc))
      );
    } catch (err: any) {
      alert(`Failed to resolve incident: ${err.message}`);
    }
  };

  // Submit Simulated Incident
  const handleSimulateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSimulating(true);
    try {
      let parsedPayload: Record<string, unknown> = {};
      try {
        parsedPayload = JSON.parse(simForm.payloadText);
      } catch (e) {
        parsedPayload = { raw: simForm.payloadText };
      }

      const { error } = await supabase.from('system_incidents').insert({
        severity: simForm.severity,
        category: simForm.category,
        org_id: simForm.org_id || null,
        message: simForm.message,
        payload: parsedPayload,
        resolved: false,
      });

      if (error) throw error;
      setShowSimulateModal(false);
      await fetchIncidents();
    } catch (err: any) {
      alert(`Simulation failed: ${err.message}`);
    } finally {
      setSimulating(false);
    }
  };

  // Filtered List
  const filteredIncidents = incidents.filter((inc) => {
    if (severityFilter !== 'ALL' && inc.severity !== severityFilter) return false;
    if (categoryFilter !== 'ALL' && inc.category !== categoryFilter) return false;
    if (statusFilter === 'UNRESOLVED' && inc.resolved) return false;
    if (statusFilter === 'RESOLVED' && !inc.resolved) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const msgMatch = inc.message.toLowerCase().includes(q);
      const catMatch = inc.category.toLowerCase().includes(q);
      const org = orgs.find((o) => o.id === inc.org_id);
      const orgMatch = org ? org.name.toLowerCase().includes(q) : false;
      return msgMatch || catMatch || orgMatch;
    }

    return true;
  });

  // Incident Counts
  const unresolvedCritical = incidents.filter(
    (i) => !i.resolved && i.severity === 'CRITICAL'
  ).length;
  const unresolvedWarning = incidents.filter(
    (i) => !i.resolved && i.severity === 'WARNING'
  ).length;
  const totalResolved = incidents.filter((i) => i.resolved).length;

  return (
    <SuperAdminShell>
      <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
        {/* Header with Simulator Trigger */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-headline font-bold text-2xl text-white tracking-tight">
                Telemetry & System Incidents
              </h1>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
              </span>
            </div>
            <p className="font-mono text-xs text-zinc-400 mt-1">
              Zero-latency edge incident telemetry and autonomous anomaly detection.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void fetchIncidents();
                void checkWorkerStatus();
              }}
              isLoading={refreshing}
              leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />}
            >
              Sync
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSimulateModal(true)}
              leftIcon={<Play className="w-3.5 h-3.5" />}
              className="border-zinc-700 text-zinc-300 hover:text-white"
            >
              Trigger Test Incident
            </Button>
          </div>
        </div>

        {/* System Health Pulse Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Edge Worker Status Card */}
          <div className="p-4 rounded-2xl border border-zinc-800 bg-zinc-950/70 backdrop-blur-xl flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] text-zinc-400 font-semibold uppercase">
                Cloudflare Worker
              </span>
              <span
                className={`w-2 h-2 rounded-full ${
                  edgeHealth.status === 'online'
                    ? 'bg-emerald-400'
                    : edgeHealth.status === 'degraded'
                    ? 'bg-amber-400'
                    : 'bg-rose-400'
                }`}
              />
            </div>
            <div className="mt-2">
              <div className="font-headline font-bold text-lg text-white flex items-center gap-2">
                {edgeHealth.status === 'online' ? 'Operational' : edgeHealth.status.toUpperCase()}
                <span className="font-mono text-xs font-normal text-teal-400">
                  {edgeHealth.latencyMs > 0 ? `${edgeHealth.latencyMs}ms` : ''}
                </span>
              </div>
              <div className="font-mono text-[10px] text-zinc-500 mt-1">
                {edgeHealth.workerVersion ? `v${edgeHealth.workerVersion}` : 'Checking...'} • Checked {edgeHealth.lastChecked}
              </div>
            </div>
          </div>

          <MetricCard
            title="Unresolved Critical"
            value={unresolvedCritical.toString()}
            delta={unresolvedCritical > 0 ? 'Immediate Action' : 'All Clear'}
            trend={unresolvedCritical > 0 ? 'down' : 'up'}
            icon={<ShieldAlert className="w-4 h-4" />}
          />

          <MetricCard
            title="Active Warnings"
            value={unresolvedWarning.toString()}
            delta={`${unresolvedWarning} pending review`}
            trend="neutral"
            icon={<AlertTriangle className="w-4 h-4" />}
          />

          <MetricCard
            title="Resolved Incidents"
            value={totalResolved.toString()}
            delta="100% telemetry captured"
            trend="up"
            icon={<CheckCircle2 className="w-4 h-4" />}
          />
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between font-mono text-xs">
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Status Filter */}
            <div className="flex items-center rounded-xl bg-zinc-900 border border-zinc-800 p-0.5">
              {(['UNRESOLVED', 'ALL', 'RESOLVED'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    statusFilter === s
                      ? 'bg-zinc-800 text-teal-400 font-bold shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Severity Filter */}
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value as any)}
              className="px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 focus:outline-none focus:border-teal-500"
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical Only</option>
              <option value="WARNING">Warning Only</option>
              <option value="INFO">Info Only</option>
            </select>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 focus:outline-none focus:border-teal-500"
            >
              <option value="ALL">All Categories</option>
              <option value="AI_ROUTER">AI Router</option>
              <option value="AUTH_SECURITY">Auth & Security</option>
              <option value="SUPABASE_DB">Database</option>
              <option value="RATE_LIMIT">Rate Limits</option>
              <option value="WORKER_CRASH">Worker Faults</option>
              <option value="ANTI_CHEAT">Anti-Cheat Flags</option>
            </select>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-64">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search error, message, college..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:border-teal-500 text-xs"
            />
          </div>
        </div>

        {/* Live Incidents Feed Table */}
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/70 backdrop-blur-xl overflow-hidden">
          {filteredIncidents.length === 0 ? (
            <div className="py-16 text-center font-mono text-xs text-zinc-500">
              <CheckCircle2 className="w-8 h-8 text-emerald-400/50 mx-auto mb-2" />
              <div>No system incidents match your filter. Infrastructure nominal.</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400 bg-zinc-900/40">
                    <th className="py-3 px-4 font-semibold">Severity</th>
                    <th className="py-3 px-4 font-semibold">Category</th>
                    <th className="py-3 px-4 font-semibold">Incident Details</th>
                    <th className="py-3 px-4 font-semibold">Affected Scope</th>
                    <th className="py-3 px-4 font-semibold">Timestamp</th>
                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900">
                  {filteredIncidents.map((incident) => {
                    const org = orgs.find((o) => o.id === incident.org_id);
                    return (
                      <tr
                        key={incident.id}
                        className={`hover:bg-zinc-900/40 transition-colors ${
                          incident.resolved ? 'opacity-60' : ''
                        }`}
                      >
                        <td className="py-4 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              incident.severity === 'CRITICAL'
                                ? 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
                                : incident.severity === 'WARNING'
                                ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                                : 'bg-blue-500/10 border border-blue-500/30 text-blue-400'
                            }`}
                          >
                            {incident.severity === 'CRITICAL' && <ShieldAlert className="w-3 h-3" />}
                            {incident.severity === 'WARNING' && <AlertTriangle className="w-3 h-3" />}
                            {incident.severity === 'INFO' && <Info className="w-3 h-3" />}
                            {incident.severity}
                          </span>
                        </td>

                        <td className="py-4 px-4 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 text-[10px]">
                            {incident.category}
                          </span>
                        </td>

                        <td className="py-4 px-4 max-w-md">
                          <div className="font-sans font-medium text-white truncate">
                            {incident.message}
                          </div>
                          {incident.error_code && (
                            <div className="font-mono text-[10px] text-zinc-500 mt-0.5">
                              ERR: {incident.error_code}
                            </div>
                          )}
                        </td>

                        <td className="py-4 px-4 whitespace-nowrap">
                          {org ? (
                            <div className="flex items-center gap-1.5 text-zinc-300">
                              <Building2 className="w-3 h-3 text-teal-400" />
                              <span>{org.name}</span>
                            </div>
                          ) : (
                            <span className="text-zinc-500">Global / Edge</span>
                          )}
                        </td>

                        <td className="py-4 px-4 whitespace-nowrap text-zinc-400 text-[11px]">
                          {new Date(incident.created_at).toLocaleString()}
                        </td>

                        <td className="py-4 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setInspectIncident(incident)}
                              className="text-zinc-400 hover:text-white"
                            >
                              <Code className="w-3.5 h-3.5" />
                            </Button>

                            {!incident.resolved ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleResolveIncident(incident.id)}
                                className="text-[10px] text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                              >
                                Resolve
                              </Button>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] text-zinc-500">
                                <Check className="w-3 h-3 text-emerald-400" />
                                Resolved
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* MODAL 1: PAYLOAD INSPECTOR */}
        <AnimatePresence>
          {inspectIncident && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-2xl rounded-2xl bg-zinc-950 border border-zinc-800 p-6 space-y-4"
              >
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Code className="w-4 h-4 text-teal-400" />
                    <h3 className="font-headline font-bold text-base text-white">
                      Telemetry Incident Inspector
                    </h3>
                  </div>
                  <button
                    onClick={() => setInspectIncident(null)}
                    className="text-zinc-400 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-3 font-mono text-xs">
                  <div>
                    <span className="text-zinc-500 block text-[10px]">Incident Message</span>
                    <p className="text-white font-medium mt-0.5">{inspectIncident.message}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-[11px]">
                    <div>
                      <span className="text-zinc-500 block text-[10px]">Category</span>
                      <span className="text-teal-400">{inspectIncident.category}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block text-[10px]">Severity</span>
                      <span
                        className={
                          inspectIncident.severity === 'CRITICAL'
                            ? 'text-rose-400 font-bold'
                            : inspectIncident.severity === 'WARNING'
                            ? 'text-amber-400'
                            : 'text-blue-400'
                        }
                      >
                        {inspectIncident.severity}
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-zinc-500 text-[10px]">Context Payload (JSON)</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(
                            JSON.stringify(inspectIncident.payload || {}, null, 2)
                          );
                          setCopiedPayload(true);
                          setTimeout(() => setCopiedPayload(false), 2000);
                        }}
                        className="inline-flex items-center gap-1 text-[10px] text-zinc-400 hover:text-teal-400 transition-colors"
                      >
                        {copiedPayload ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy Payload</span>
                          </>
                        )}
                      </button>
                    </div>

                    <pre className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 text-teal-300 text-[11px] overflow-x-auto max-h-72">
                      {JSON.stringify(inspectIncident.payload || {}, null, 2)}
                    </pre>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800">
                  {!inspectIncident.resolved && (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={async () => {
                        await handleResolveIncident(inspectIncident.id);
                        setInspectIncident(null);
                      }}
                      className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold"
                    >
                      Resolve Incident
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => setInspectIncident(null)}>
                    Close
                  </Button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* MODAL 2: MANUAL INCIDENT SIMULATOR */}
        <AnimatePresence>
          {showSimulateModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-lg rounded-2xl bg-zinc-950 border border-zinc-800 p-6 space-y-4"
              >
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Play className="w-4 h-4 text-teal-400" />
                    <h3 className="font-headline font-bold text-base text-white">
                      Dispatch Telemetry Anomaly
                    </h3>
                  </div>
                  <button
                    onClick={() => setShowSimulateModal(false)}
                    className="text-zinc-400 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSimulateSubmit} className="space-y-4 font-mono text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-zinc-400 mb-1">Severity</label>
                      <select
                        value={simForm.severity}
                        onChange={(e) =>
                          setSimForm({ ...simForm, severity: e.target.value as any })
                        }
                        className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-teal-500"
                      >
                        <option value="CRITICAL">CRITICAL</option>
                        <option value="WARNING">WARNING</option>
                        <option value="INFO">INFO</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-zinc-400 mb-1">Category</label>
                      <select
                        value={simForm.category}
                        onChange={(e) =>
                          setSimForm({ ...simForm, category: e.target.value as any })
                        }
                        className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-teal-500"
                      >
                        <option value="AI_ROUTER">AI_ROUTER</option>
                        <option value="AUTH_SECURITY">AUTH_SECURITY</option>
                        <option value="SUPABASE_DB">SUPABASE_DB</option>
                        <option value="RATE_LIMIT">RATE_LIMIT</option>
                        <option value="WORKER_CRASH">WORKER_CRASH</option>
                        <option value="ANTI_CHEAT">ANTI_CHEAT</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-zinc-400 mb-1">Target Institution (Optional)</label>
                    <select
                      value={simForm.org_id}
                      onChange={(e) => setSimForm({ ...simForm, org_id: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-teal-500"
                    >
                      <option value="">Global / Unscoped</option>
                      {orgs.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-zinc-400 mb-1">Incident Description</label>
                    <input
                      type="text"
                      required
                      value={simForm.message}
                      onChange={(e) => setSimForm({ ...simForm, message: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-400 mb-1">Context Payload (JSON)</label>
                    <textarea
                      rows={3}
                      value={simForm.payloadText}
                      onChange={(e) => setSimForm({ ...simForm, payloadText: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-mono text-[11px] focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowSimulateModal(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      isLoading={simulating}
                      className="bg-teal-500 hover:bg-teal-400 text-zinc-950 font-bold"
                    >
                      Fire Incident
                    </Button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </SuperAdminShell>
  );
}
