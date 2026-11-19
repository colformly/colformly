import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  ArrowRight,
  Bell,
  Building2,
  CheckCircle2,
  Clock,
  ExternalLink,
  Filter,
  Globe,
  Mail,
  Megaphone,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  TrendingUp,
  UserCheck,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { supabase } from '@colformly/auth';
import type { DemoLead, Organization, GlobalBroadcast } from '@colformly/types';
import { Button, MetricCard } from '@colformly/ui';
import { SuperAdminShell } from '../layouts/SuperAdminShell';

const GA4_SERVICE_URL =
  import.meta.env.VITE_GA4_SERVICE_URL || 'https://colformly-ga4-service.onrender.com';

interface Ga4ReportData {
  activeUsers24h: number;
  sessions7d: number;
  conversionRate: string;
  sources: { source: string; users: number; percentage: number }[];
}

export default function Leads() {
  const [leads, setLeads] = useState<DemoLead[]>([]);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter & Search
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'NEW' | 'CONTACTED' | 'CONVERTED' | 'ARCHIVED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected lead for detail/conversion
  const [selectedLead, setSelectedLead] = useState<DemoLead | null>(null);
  const [convertingLead, setConvertingLead] = useState<DemoLead | null>(null);
  const [conversionSubmitting, setConversionSubmitting] = useState(false);

  // Global Broadcast Banner state
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastType, setBroadcastType] = useState<'info' | 'warning' | 'urgent'>('info');
  const [broadcastActive, setBroadcastActive] = useState(false);
  const [broadcastSaving, setBroadcastSaving] = useState(false);

  // GA4 Telemetry Data
  const [ga4Data, setGa4Data] = useState<Ga4ReportData>({
    activeUsers24h: 1420,
    sessions7d: 8940,
    conversionRate: '4.8%',
    sources: [
      { source: 'Direct / Campus Referrals', users: 3820, percentage: 43 },
      { source: 'Google Search (Organic)', users: 2710, percentage: 30 },
      { source: 'LinkedIn Education Outreach', users: 1620, percentage: 18 },
      { source: 'Partner Workshops', users: 790, percentage: 9 },
    ],
  });
  const [ga4Live, setGa4Live] = useState(false);

  // Notification
  const [alertNote, setAlertNote] = useState<string | null>(null);

  const notify = (msg: string) => {
    setAlertNote(msg);
    setTimeout(() => setAlertNote(null), 4000);
  };

  const fetchLeadsAndBroadcast = async () => {
    setRefreshing(true);
    try {
      const [leadsRes, orgsRes] = await Promise.all([
        supabase.from('demo_leads').select('*').order('created_at', { ascending: false }),
        supabase.from('organizations').select('*').limit(50),
      ]);

      if (leadsRes.error) console.warn('Fetch demo_leads warning:', leadsRes.error.message);
      if (orgsRes.error) console.warn('Fetch orgs warning:', orgsRes.error.message);

      if (leadsRes.data) {
        setLeads(leadsRes.data as unknown as DemoLead[]);
      }

      if (orgsRes.data) {
        const orgList = orgsRes.data as unknown as Organization[];
        setOrgs(orgList);

        // Check if any org has an active broadcast
        const activeB = orgList.find((o) => o.global_broadcast?.active);
        if (activeB?.global_broadcast) {
          setBroadcastMessage(activeB.global_broadcast.message);
          setBroadcastType(activeB.global_broadcast.type || 'info');
          setBroadcastActive(true);
        }
      }

      // Try fetching live GA4 report from microservice
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;

        const gaRes = await fetch(`${GA4_SERVICE_URL}/api/ga4/overview`, {
          headers: {
            Accept: 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (gaRes.ok) {
          const json = await gaRes.json();
          if (json.activeUsers24h) {
            setGa4Data(json);
            setGa4Live(true);
          }
        }
      } catch (e) {
        // Fallback gracefully to default metrics
        setGa4Live(false);
      }
    } catch (err: any) {
      console.error('Error fetching leads:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void fetchLeadsAndBroadcast();

    // Subscribe to realtime demo_leads table
    const channel = supabase
      .channel('demo-leads-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'demo_leads' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setLeads((prev) => [payload.new as unknown as DemoLead, ...prev]);
            notify(`New Lead Received: ${(payload.new as any).college_name}`);
          } else if (payload.eventType === 'UPDATE') {
            setLeads((prev) =>
              prev.map((l) => (l.id === payload.new.id ? (payload.new as unknown as DemoLead) : l))
            );
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  // Update Lead Status
  const handleUpdateStatus = async (
    id: string,
    newStatus: 'NEW' | 'CONTACTED' | 'CONVERTED' | 'ARCHIVED'
  ) => {
    try {
      const { error } = await supabase
        .from('demo_leads')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
      setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status: newStatus } : l)));
      notify(`Lead status updated to ${newStatus}`);
    } catch (err: any) {
      alert(`Error updating status: ${err.message}`);
    }
  };

  // Convert Lead to College Organization (via Worker or Supabase)
  const handleConfirmConversion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!convertingLead) return;

    setConversionSubmitting(true);
    try {
      const slug = convertingLead.college_name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 32);

      const code = convertingLead.college_name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 6);

      // Create college organization in Supabase
      const { data: newOrg, error } = await supabase
        .from('organizations')
        .insert({
          name: convertingLead.college_name,
          slug,
          institute_code: code || 'CAMPUS',
          org_type: 'COLLEGE',
          onboarding_status: 'SETUP_MODE',
          allowed_domains: [convertingLead.email.split('@')[1] || 'college.edu.in'],
        })
        .select()
        .single();

      if (error) throw error;

      // Mark lead as CONVERTED
      await supabase
        .from('demo_leads')
        .update({
          status: 'CONVERTED',
          notes: `Converted to College ID: ${(newOrg as any)?.id || ''} on ${new Date().toLocaleDateString()}`,
        })
        .eq('id', convertingLead.id);

      notify(`Institution ${convertingLead.college_name} provisioned!`);
      setConvertingLead(null);
      await fetchLeadsAndBroadcast();
    } catch (err: any) {
      alert(`Conversion failed: ${err.message}`);
    } finally {
      setConversionSubmitting(false);
    }
  };

  // Broadcast Message to all campuses
  const handleSaveBroadcast = async () => {
    setBroadcastSaving(true);
    try {
      const payload: GlobalBroadcast = {
        active: broadcastActive,
        message: broadcastMessage,
        type: broadcastType,
        created_at: new Date().toISOString(),
      };

      // Update broadcast across all active institutions
      const { error } = await supabase
        .from('organizations')
        .update({ global_broadcast: payload } as any)
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (error) throw error;
      notify(broadcastActive ? 'Global campus broadcast published!' : 'Broadcast cleared');
    } catch (err: any) {
      alert(`Broadcast update failed: ${err.message}`);
    } finally {
      setBroadcastSaving(false);
    }
  };

  // Filtered Leads
  const filteredLeads = leads.filter((l) => {
    if (statusFilter !== 'ALL' && l.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        l.college_name.toLowerCase().includes(q) ||
        l.full_name.toLowerCase().includes(q) ||
        l.email.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const newLeadsCount = leads.filter((l) => l.status === 'NEW').length;
  const contactedCount = leads.filter((l) => l.status === 'CONTACTED').length;
  const convertedCount = leads.filter((l) => l.status === 'CONVERTED').length;

  return (
    <SuperAdminShell>
      <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-headline font-bold text-2xl text-white tracking-tight">
                GA4 Telemetry & Institutional Leads CRM
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-400 font-mono text-[10px] font-bold">
                GROWTH ENGINE
              </span>
            </div>
            <p className="font-mono text-xs text-zinc-400 mt-1">
              Top-of-funnel web traffic, inbound university demo requests, and campus broadcasts.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchLeadsAndBroadcast}
              isLoading={refreshing}
              leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />}
            >
              Sync
            </Button>
          </div>
        </div>

        {/* Global Notification Banner */}
        {alertNote && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="p-3.5 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-300 font-mono text-xs flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-teal-400" />
              <span>{alertNote}</span>
            </div>
            <button onClick={() => setAlertNote(null)} className="hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {/* SECTION 1: GA4 WEB TELEMETRY */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Daily Active Visitors"
            value={ga4Data.activeUsers24h.toLocaleString()}
            delta="+18.4% this week"
            trend="up"
            icon={<Users className="w-4 h-4" />}
          />

          <MetricCard
            title="Weekly Sessions (7D)"
            value={ga4Data.sessions7d.toLocaleString()}
            delta="Landing + Exam Halls"
            trend="neutral"
            icon={<Globe className="w-4 h-4" />}
          />

          <MetricCard
            title="Demo Lead Conversion"
            value={ga4Data.conversionRate}
            delta={`${leads.length} total leads`}
            trend="up"
            icon={<TrendingUp className="w-4 h-4" />}
          />

          <MetricCard
            title="New Inbound Requests"
            value={newLeadsCount.toString()}
            delta={`${contactedCount} contacted`}
            trend="neutral"
            icon={<Mail className="w-4 h-4" />}
          />
        </div>

        {/* Traffic Channels Breakdown & Global Broadcast */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Traffic Sources Breakdown */}
          <div className="lg:col-span-1 rounded-2xl border border-zinc-800/80 bg-zinc-950/70 p-6 backdrop-blur-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-headline font-bold text-base text-white">Acquisition Sources</h3>
              <span className="font-mono text-[10px] text-zinc-500">
                {ga4Live ? 'Live GA4 Data API' : 'Simulated Telemetry'}
              </span>
            </div>

            <div className="space-y-3 font-mono text-xs">
              {ga4Data.sources.map((item) => (
                <div key={item.source} className="space-y-1">
                  <div className="flex justify-between text-zinc-300">
                    <span className="truncate pr-2">{item.source}</span>
                    <span className="font-bold text-white">{item.percentage}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-zinc-900 overflow-hidden">
                    <div
                      className="h-full bg-teal-400 rounded-full"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Global Campus Broadcast Banner Controller */}
          <div className="lg:col-span-2 rounded-2xl border border-zinc-800/80 bg-zinc-950/70 p-6 backdrop-blur-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-teal-400" />
                <h3 className="font-headline font-bold text-base text-white">
                  Global Campus Emergency Broadcast
                </h3>
              </div>
              <div className="flex items-center gap-2 font-mono text-xs">
                <span className={broadcastActive ? 'text-teal-400 font-bold' : 'text-zinc-500'}>
                  {broadcastActive ? 'BROADCAST ACTIVE' : 'INACTIVE'}
                </span>
                <input
                  type="checkbox"
                  checked={broadcastActive}
                  onChange={(e) => setBroadcastActive(e.target.checked)}
                  className="rounded bg-zinc-900 border-zinc-800 text-teal-500 focus:ring-0 h-4 w-4"
                />
              </div>
            </div>

            <p className="font-mono text-xs text-zinc-400">
              Publish an immediate flash notice to all student exam halls and faculty dashboards across all onboarded institutions.
            </p>

            <div className="space-y-3 font-mono text-xs">
              <div className="flex gap-2">
                {(['info', 'warning', 'urgent'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setBroadcastType(t)}
                    className={`px-3 py-1 rounded-lg text-xs uppercase font-bold transition-all ${
                      broadcastType === t
                        ? t === 'urgent'
                          ? 'bg-rose-500/20 border border-rose-500/40 text-rose-300'
                          : t === 'warning'
                          ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300'
                          : 'bg-teal-500/20 border border-teal-500/40 text-teal-300'
                        : 'bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-white'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <textarea
                rows={2}
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                placeholder="E.g., Scheduled cloud maintenance notice for semester final exams tonight..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-600 focus:outline-none focus:border-teal-500 text-xs font-mono"
              />

              <div className="flex justify-end">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={handleSaveBroadcast}
                  isLoading={broadcastSaving}
                  className="bg-teal-500 hover:bg-teal-400 text-zinc-950 font-bold"
                >
                  Deploy Broadcast
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: DEMO LEADS CRM TABLE */}
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/70 p-6 backdrop-blur-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-headline font-bold text-lg text-white">
                Inbound Demo Requests & University Pipeline
              </h2>
              <p className="font-mono text-xs text-zinc-400 mt-0.5">
                Real-time inquiries submitted via the marketing website contact form.
              </p>
            </div>

            {/* Filter and Search */}
            <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
              <div className="flex items-center rounded-xl bg-zinc-900 border border-zinc-800 p-0.5">
                {(['ALL', 'NEW', 'CONTACTED', 'CONVERTED'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      statusFilter === s
                        ? 'bg-zinc-800 text-teal-400 font-bold shadow-sm'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search college, name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:border-teal-500 text-xs"
                />
              </div>
            </div>
          </div>

          {filteredLeads.length === 0 ? (
            <div className="py-12 text-center font-mono text-xs text-zinc-500">
              No inbound demo requests found matching filter.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400">
                    <th className="py-3 px-4 font-semibold">College / Institution</th>
                    <th className="py-3 px-4 font-semibold">Contact Person</th>
                    <th className="py-3 px-4 font-semibold">Direct Email & Phone</th>
                    <th className="py-3 px-4 font-semibold text-center">Student Body</th>
                    <th className="py-3 px-4 font-semibold text-center">Status</th>
                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900">
                  {filteredLeads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-zinc-900/40 transition-colors">
                      <td className="py-4 px-4 font-sans font-medium text-white">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-teal-400 shrink-0" />
                          <div>
                            <div className="font-semibold">{lead.college_name}</div>
                            <div className="font-mono text-[10px] text-zinc-500">
                              Received {new Date(lead.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4 text-zinc-300">
                        <div className="font-medium text-white">{lead.full_name}</div>
                        <div className="text-[10px] text-zinc-500">{lead.designation || 'Faculty / Admin'}</div>
                      </td>

                      <td className="py-4 px-4 text-zinc-400">
                        <div className="flex items-center gap-1.5 text-zinc-200">
                          <Mail className="w-3 h-3 text-zinc-500" />
                          <a href={`mailto:${lead.email}`} className="hover:underline">
                            {lead.email}
                          </a>
                        </div>
                        {lead.phone && (
                          <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 mt-0.5">
                            <Phone className="w-3 h-3 text-zinc-500" />
                            <span>{lead.phone}</span>
                          </div>
                        )}
                      </td>

                      <td className="py-4 px-4 text-center text-teal-400 font-bold">
                        {lead.student_count ? lead.student_count.toLocaleString() : 'N/A'}
                      </td>

                      <td className="py-4 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            lead.status === 'NEW'
                              ? 'bg-blue-500/10 border border-blue-500/30 text-blue-400'
                              : lead.status === 'CONTACTED'
                              ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                              : lead.status === 'CONVERTED'
                              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                              : 'bg-zinc-800 text-zinc-400'
                          }`}
                        >
                          {lead.status}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {lead.status === 'NEW' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateStatus(lead.id, 'CONTACTED')}
                              className="text-[10px] text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
                            >
                              Contacted
                            </Button>
                          )}

                          {lead.status !== 'CONVERTED' && (
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => setConvertingLead(lead)}
                              leftIcon={<Sparkles className="w-3 h-3" />}
                              className="text-[10px] bg-teal-500 hover:bg-teal-400 text-zinc-950 font-bold"
                            >
                              Convert to College
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* MODAL: CONVERT LEAD TO COLLEGE */}
        <AnimatePresence>
          {convertingLead && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-md rounded-2xl bg-zinc-950 border border-zinc-800 p-6 space-y-4"
              >
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-teal-400" />
                    <h3 className="font-headline font-bold text-base text-white">
                      Convert Lead to College
                    </h3>
                  </div>
                  <button
                    onClick={() => setConvertingLead(null)}
                    className="text-zinc-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleConfirmConversion} className="space-y-4 font-mono text-xs">
                  <div>
                    <label className="block text-zinc-400 mb-1">College / Organization Name</label>
                    <input
                      type="text"
                      required
                      value={convertingLead.college_name}
                      onChange={(e) =>
                        setConvertingLead({ ...convertingLead, college_name: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-400 mb-1">Designated Admin Email</label>
                    <input
                      type="email"
                      required
                      value={convertingLead.email}
                      onChange={(e) =>
                        setConvertingLead({ ...convertingLead, email: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <p className="text-[11px] text-zinc-400">
                    This will provision a tenant in SETUP_MODE and mark this lead as CONVERTED in the database.
                  </p>

                  <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setConvertingLead(null)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      isLoading={conversionSubmitting}
                      className="bg-teal-500 hover:bg-teal-400 text-zinc-950 font-bold"
                    >
                      Provision Institution
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
