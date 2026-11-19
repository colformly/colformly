import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Cpu,
  CreditCard,
  DollarSign,
  Download,
  Edit2,
  ExternalLink,
  FileCheck,
  FileText,
  Filter,
  Layers,
  Percent,
  Plus,
  Printer,
  Receipt,
  RefreshCw,
  Save,
  Search,
  Sparkles,
  TrendingDown,
  TrendingUp,
  X,
  Zap,
} from 'lucide-react';
import { supabase } from '@colformly/auth';
import type {
  Organization,
  OrgInvoice,
  OrgUsageMonthly,
  ServiceRate,
  OrgContract,
} from '@colformly/types';
import { Button, MetricCard } from '@colformly/ui';
import { SuperAdminShell } from '../layouts/SuperAdminShell';

export default function Billing() {
  const [activeTab, setActiveTab] = useState<'pnl' | 'rates' | 'invoices'>('pnl');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Data states
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [serviceRates, setServiceRates] = useState<ServiceRate[]>([]);
  const [monthlyUsage, setMonthlyUsage] = useState<OrgUsageMonthly[]>([]);
  const [invoices, setInvoices] = useState<OrgInvoice[]>([]);
  const [contracts, setContracts] = useState<OrgContract[]>([]);

  // Selected Billing Month (e.g. "2026-11")
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonth);

  // Rate Card editing state
  const [editingRate, setEditingRate] = useState<ServiceRate | null>(null);
  const [rateForm, setRateForm] = useState({
    unit_cost_inr: 0,
    monthly_fixed_inr: 0,
    free_tier_quota: 0,
  });
  const [rateSaving, setRateSaving] = useState(false);

  // New Invoice modal state
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceOrgId, setInvoiceOrgId] = useState('');
  const [invoicePlanName, setInvoicePlanName] = useState('Enterprise Tier (Annual)');
  const [invoiceSubtotal, setInvoiceSubtotal] = useState<number>(30000);
  const [invoiceNotes, setInvoiceNotes] = useState('Colformly AI Exam & Anti-Cheat Suite Subscription');
  const [invoiceSubmitting, setInvoiceSubmitting] = useState(false);

  // Invoice view / print receipt modal state
  const [viewInvoice, setViewInvoice] = useState<OrgInvoice | null>(null);

  // Notification
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const showNotification = (type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const loadBillingData = async () => {
    setRefreshing(true);
    try {
      const [orgsRes, ratesRes, usageRes, invoicesRes, contractsRes] = await Promise.all([
        supabase.from('organizations').select('*').order('name'),
        supabase.from('service_rates').select('*').order('service_key'),
        supabase.from('org_usage_monthly').select('*').eq('billing_month', selectedMonth),
        supabase.from('org_invoices').select('*').order('created_at', { ascending: false }),
        supabase.from('org_contracts').select('*').order('created_at', { ascending: false }),
      ]);

      if (orgsRes.error) console.warn('Fetch orgs warning:', orgsRes.error.message);
      if (ratesRes.error) console.warn('Fetch rates warning:', ratesRes.error.message);
      if (usageRes.error) console.warn('Fetch usage warning:', usageRes.error.message);
      if (invoicesRes.error) console.warn('Fetch invoices warning:', invoicesRes.error.message);
      if (contractsRes.error) console.warn('Fetch contracts warning:', contractsRes.error.message);

      if (orgsRes.data) setOrgs(orgsRes.data as unknown as Organization[]);
      if (ratesRes.data) setServiceRates(ratesRes.data as ServiceRate[]);
      if (usageRes.data) setMonthlyUsage(usageRes.data as OrgUsageMonthly[]);
      if (invoicesRes.data) setInvoices(invoicesRes.data as OrgInvoice[]);
      if (contractsRes.data) setContracts(contractsRes.data as OrgContract[]);
    } catch (err: any) {
      console.error('Error fetching billing data:', err);
      showNotification('error', err.message || 'Failed to fetch billing telemetry');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadBillingData();
  }, [selectedMonth]);

  // Compute calculated infrastructure operational cost for a given usage row
  const calculateOrgInfraCost = (usage?: OrgUsageMonthly): number => {
    if (!usage) return 0;
    let cost = 0;

    serviceRates.forEach((rate) => {
      if (rate.service_key === 'cf_worker_req') {
        const excess = Math.max(0, usage.ai_requests_count + usage.tests_graded_count * 2 - rate.free_tier_quota);
        cost += excess * rate.unit_cost_inr;
      } else if (rate.service_key === 'groq_llama_70b') {
        const excess = Math.max(0, usage.groq_tokens_used - rate.free_tier_quota);
        cost += (excess / 1000) * rate.unit_cost_inr;
      } else if (rate.service_key === 'gemini_flash') {
        const excess = Math.max(0, usage.gemini_tokens_used - rate.free_tier_quota);
        cost += (excess / 1000) * rate.unit_cost_inr;
      } else if (rate.service_key === 'supabase_compute') {
        // Shared base fixed rate across orgs
        cost += rate.monthly_fixed_inr / Math.max(1, orgs.length);
      } else if (rate.service_key === 'resend_email') {
        const excess = Math.max(0, usage.emails_sent_count - rate.free_tier_quota);
        cost += excess * rate.unit_cost_inr;
      }
    });

    return Math.round(cost * 100) / 100;
  };

  // Aggregated Financial Metrics
  const totalRevenueInr = invoices
    .filter((inv) => inv.status === 'PAID')
    .reduce((sum, inv) => sum + (inv.subtotal_inr || 0), 0);

  const totalBilledPendingInr = invoices
    .filter((inv) => inv.status === 'DUE' || inv.status === 'OVERDUE')
    .reduce((sum, inv) => sum + (inv.total_inr || 0), 0);

  const totalInfraCostInr = monthlyUsage.reduce(
    (sum, usage) => sum + calculateOrgInfraCost(usage),
    0
  );

  const totalActiveContractMrr = contracts.reduce((sum, c) => sum + (c.fee_inr || 0), 0);
  const grossProfitInr = totalActiveContractMrr - totalInfraCostInr;
  const netMarginPercent =
    totalActiveContractMrr > 0
      ? Math.round((grossProfitInr / totalActiveContractMrr) * 100)
      : 100;

  // Save Rate Card changes
  const handleSaveRate = async () => {
    if (!editingRate) return;
    setRateSaving(true);
    try {
      const { error } = await supabase
        .from('service_rates')
        .update({
          unit_cost_inr: rateForm.unit_cost_inr,
          monthly_fixed_inr: rateForm.monthly_fixed_inr,
          free_tier_quota: rateForm.free_tier_quota,
          updated_at: new Date().toISOString(),
        })
        .eq('service_key', editingRate.service_key);

      if (error) throw error;

      showNotification('success', `Rate updated for ${editingRate.display_name}`);
      setEditingRate(null);
      await loadBillingData();
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to update rate');
    } finally {
      setRateSaving(false);
    }
  };

  // Generate New Invoice
  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceOrgId) {
      showNotification('error', 'Please select an institution');
      return;
    }

    setInvoiceSubmitting(true);
    try {
      const gst = Math.round(invoiceSubtotal * 0.18 * 100) / 100;
      const total = invoiceSubtotal + gst;
      const invNum = `INV-${selectedMonth.replace('-', '')}-${Math.floor(1000 + Math.random() * 9000)}`;

      const { error } = await supabase.from('org_invoices').insert({
        invoice_number: invNum,
        org_id: invoiceOrgId,
        billing_month: selectedMonth,
        plan_name: invoicePlanName,
        subtotal_inr: invoiceSubtotal,
        gst_inr: gst,
        total_inr: total,
        status: 'DUE',
        due_date: new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
        notes: invoiceNotes,
      });

      if (error) throw error;

      showNotification('success', `Invoice ${invNum} created successfully`);
      setShowInvoiceModal(false);
      await loadBillingData();
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to create invoice');
    } finally {
      setInvoiceSubmitting(false);
    }
  };

  // Mark Invoice as Paid
  const handleMarkInvoicePaid = async (inv: OrgInvoice) => {
    try {
      const { error } = await supabase
        .from('org_invoices')
        .update({
          status: 'PAID',
          paid_at: new Date().toISOString(),
        })
        .eq('id', inv.id);

      if (error) throw error;
      showNotification('success', `Invoice ${inv.invoice_number} marked as PAID`);
      await loadBillingData();
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to update invoice');
    }
  };

  return (
    <SuperAdminShell>
      <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
        {/* Header with Month Selector & Refresh */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-headline font-bold text-2xl text-white tracking-tight">
                Billing & P&L Command
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-[10px] font-bold">
                PROFITABLE
              </span>
            </div>
            <p className="font-mono text-xs text-zinc-400 mt-1">
              Founder financial control: live infrastructure cost vs client MRR and margins.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800">
              <Calendar className="w-3.5 h-3.5 text-zinc-400" />
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent font-mono text-xs text-white focus:outline-none"
              />
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={loadBillingData}
              isLoading={refreshing}
              leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />}
            >
              Sync
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                if (orgs.length > 0) setInvoiceOrgId(orgs[0].id);
                setShowInvoiceModal(true);
              }}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              className="bg-teal-500 hover:bg-teal-400 text-zinc-950 font-bold"
            >
              Create Invoice
            </Button>
          </div>
        </div>

        {/* Global Alert Notification */}
        {statusMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`p-4 rounded-xl border font-mono text-xs flex items-center justify-between ${
              statusMessage.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400" />
              )}
              <span>{statusMessage.text}</span>
            </div>
            <button
              onClick={() => setStatusMessage(null)}
              className="hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {/* Top Financial KPI Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Active MRR (Contracts)"
            value={`₹${totalActiveContractMrr.toLocaleString('en-IN')}`}
            delta="100% Retained"
            trend="up"
            icon={<DollarSign className="w-4 h-4" />}
          />

          <MetricCard
            title="Monthly Infra Cost"
            value={`₹${totalInfraCostInr.toLocaleString('en-IN')}`}
            delta={`${serviceRates.length} active pipelines`}
            trend="neutral"
            icon={<Cpu className="w-4 h-4" />}
          />

          <MetricCard
            title="Gross Profit (Monthly)"
            value={`₹${grossProfitInr.toLocaleString('en-IN')}`}
            delta={`${netMarginPercent}% net margin`}
            trend="up"
            icon={<TrendingUp className="w-4 h-4" />}
          />

          <MetricCard
            title="Receivables Pending"
            value={`₹${totalBilledPendingInr.toLocaleString('en-IN')}`}
            delta={`${invoices.filter((i) => i.status !== 'PAID').length} due`}
            trend="neutral"
            icon={<Receipt className="w-4 h-4" />}
          />
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
          <button
            onClick={() => setActiveTab('pnl')}
            className={`px-4 py-2 rounded-xl font-mono text-xs font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'pnl'
                ? 'bg-zinc-800 text-teal-400 border border-zinc-700 shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900/50'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>P&L & College Unit Economics</span>
          </button>

          <button
            onClick={() => setActiveTab('rates')}
            className={`px-4 py-2 rounded-xl font-mono text-xs font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'rates'
                ? 'bg-zinc-800 text-teal-400 border border-zinc-700 shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900/50'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Service Rate Cards ({serviceRates.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('invoices')}
            className={`px-4 py-2 rounded-xl font-mono text-xs font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'invoices'
                ? 'bg-zinc-800 text-teal-400 border border-zinc-700 shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900/50'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Invoices & Receipts ({invoices.length})</span>
          </button>
        </div>

        {/* TAB 1: P&L & COLLEGE UNIT ECONOMICS */}
        {activeTab === 'pnl' && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/70 p-6 backdrop-blur-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="font-headline font-bold text-lg text-white">
                    College Unit Economics — Month of {selectedMonth}
                  </h2>
                  <p className="font-mono text-xs text-zinc-400 mt-0.5">
                    Live breakdown of AI token burn, worker compute, and actual net profit per institution.
                  </p>
                </div>

                <div className="text-right">
                  <span className="font-mono text-xs text-zinc-400">Net Profit Margin</span>
                  <div className="font-mono font-bold text-lg text-emerald-400">
                    {netMarginPercent}%
                  </div>
                </div>
              </div>

              {orgs.length === 0 ? (
                <div className="py-12 text-center font-mono text-xs text-zinc-500">
                  No registered institutions found.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-mono text-xs">
                    <thead>
                      <tr className="border-b border-zinc-800 text-zinc-400">
                        <th className="py-3 px-4 font-semibold">Institution</th>
                        <th className="py-3 px-4 font-semibold text-center">AI Requests</th>
                        <th className="py-3 px-4 font-semibold text-center">Token Burn (Groq/Gemini)</th>
                        <th className="py-3 px-4 font-semibold text-center">Tests Graded</th>
                        <th className="py-3 px-4 font-semibold text-right">Infra Cost</th>
                        <th className="py-3 px-4 font-semibold text-right">Contract Fee</th>
                        <th className="py-3 px-4 font-semibold text-right">Net Margin</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900">
                      {orgs.map((org) => {
                        const usage = monthlyUsage.find((u) => u.org_id === org.id);
                        const contract = contracts.find((c) => c.org_id === org.id);
                        const infraCost = calculateOrgInfraCost(usage);
                        const revenue = contract?.fee_inr || 0;
                        const marginInr = revenue - infraCost;
                        const marginPercent =
                          revenue > 0 ? Math.round((marginInr / revenue) * 100) : 0;

                        return (
                          <tr key={org.id} className="hover:bg-zinc-900/40 transition-colors">
                            <td className="py-4 px-4 font-sans font-medium text-white">
                              <div className="flex items-center gap-2.5">
                                <Building2 className="w-4 h-4 text-teal-400 shrink-0" />
                                <div>
                                  <div className="font-semibold">{org.name}</div>
                                  <div className="font-mono text-[10px] text-zinc-500">
                                    {org.institute_code || org.slug} • {org.org_type || 'COLLEGE'}
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="py-4 px-4 text-center text-zinc-300">
                              {usage?.ai_requests_count ? usage.ai_requests_count.toLocaleString() : '0'}
                            </td>

                            <td className="py-4 px-4 text-center text-zinc-400">
                              <div className="text-zinc-200">
                                {((usage?.groq_tokens_used || 0) + (usage?.gemini_tokens_used || 0)).toLocaleString()}{' '}
                                tokens
                              </div>
                              <div className="text-[10px] text-zinc-500">
                                G: {usage?.groq_tokens_used || 0} • M: {usage?.gemini_tokens_used || 0}
                              </div>
                            </td>

                            <td className="py-4 px-4 text-center text-zinc-300">
                              {usage?.tests_graded_count ? usage.tests_graded_count.toLocaleString() : '0'}
                            </td>

                            <td className="py-4 px-4 text-right text-rose-400 font-semibold">
                              ₹{infraCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>

                            <td className="py-4 px-4 text-right text-emerald-400 font-semibold">
                              ₹{revenue.toLocaleString('en-IN')}
                            </td>

                            <td className="py-4 px-4 text-right">
                              {revenue > 0 ? (
                                <span
                                  className={`inline-flex items-center gap-1 font-bold ${
                                    marginPercent >= 70
                                      ? 'text-emerald-400'
                                      : marginPercent >= 40
                                      ? 'text-amber-400'
                                      : 'text-rose-400'
                                  }`}
                                >
                                  {marginPercent >= 50 ? (
                                    <TrendingUp className="w-3.5 h-3.5" />
                                  ) : (
                                    <TrendingDown className="w-3.5 h-3.5" />
                                  )}
                                  {marginPercent}%
                                </span>
                              ) : (
                                <span className="text-zinc-500">Trial / Pilot</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: SERVICE RATE CARDS */}
        {activeTab === 'rates' && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/70 p-6 backdrop-blur-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="font-headline font-bold text-lg text-white">
                    Cloud & AI Rate Cards Engine
                  </h2>
                  <p className="font-mono text-xs text-zinc-400 mt-0.5">
                    Configure real-time per-unit cost parameters in INR for telemetry and margins calculation.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {serviceRates.map((rate) => (
                  <div
                    key={rate.service_key}
                    className="p-5 rounded-xl border border-zinc-800 bg-zinc-900/60 flex flex-col justify-between hover:border-zinc-700 transition-all"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-teal-500/10 border border-teal-500/20 text-teal-400 font-bold uppercase">
                          {rate.service_key}
                        </span>
                        <button
                          onClick={() => {
                            setEditingRate(rate);
                            setRateForm({
                              unit_cost_inr: rate.unit_cost_inr,
                              monthly_fixed_inr: rate.monthly_fixed_inr,
                              free_tier_quota: rate.free_tier_quota,
                            });
                          }}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <h3 className="font-headline font-semibold text-white text-base">
                        {rate.display_name}
                      </h3>
                      <p className="font-mono text-xs text-zinc-400 mt-1">
                        Unit: {rate.unit_label}
                      </p>

                      <div className="mt-4 space-y-2 font-mono text-xs">
                        <div className="flex justify-between py-1 border-b border-zinc-800/60">
                          <span className="text-zinc-500">Unit Cost (INR)</span>
                          <span className="font-semibold text-white">₹{rate.unit_cost_inr}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-zinc-800/60">
                          <span className="text-zinc-500">Monthly Fixed (INR)</span>
                          <span className="font-semibold text-white">₹{rate.monthly_fixed_inr}</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-zinc-500">Free Tier Allowance</span>
                          <span className="font-semibold text-teal-400">
                            {rate.free_tier_quota.toLocaleString()} units
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-zinc-800/60 font-mono text-[10px] text-zinc-500">
                      Updated {new Date(rate.updated_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: INVOICES & RECEIPTS */}
        {activeTab === 'invoices' && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/70 p-6 backdrop-blur-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="font-headline font-bold text-lg text-white">
                    Institution Invoices & Ledger
                  </h2>
                  <p className="font-mono text-xs text-zinc-400 mt-0.5">
                    Official tax invoices with 18% GST calculation, download, and receipt printing.
                  </p>
                </div>
              </div>

              {invoices.length === 0 ? (
                <div className="py-12 text-center font-mono text-xs text-zinc-500">
                  No invoices generated yet. Click "Create Invoice" above to issue one.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-mono text-xs">
                    <thead>
                      <tr className="border-b border-zinc-800 text-zinc-400">
                        <th className="py-3 px-4 font-semibold">Invoice #</th>
                        <th className="py-3 px-4 font-semibold">Institution</th>
                        <th className="py-3 px-4 font-semibold">Billing Month</th>
                        <th className="py-3 px-4 font-semibold">Plan Description</th>
                        <th className="py-3 px-4 font-semibold text-right">Subtotal</th>
                        <th className="py-3 px-4 font-semibold text-right">Total (GST 18%)</th>
                        <th className="py-3 px-4 font-semibold text-center">Status</th>
                        <th className="py-3 px-4 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900">
                      {invoices.map((inv) => {
                        const org = orgs.find((o) => o.id === inv.org_id);
                        return (
                          <tr key={inv.id} className="hover:bg-zinc-900/40 transition-colors">
                            <td className="py-4 px-4 font-semibold text-teal-400">
                              {inv.invoice_number}
                            </td>
                            <td className="py-4 px-4 text-white font-sans font-medium">
                              {org?.name || 'Unknown Org'}
                            </td>
                            <td className="py-4 px-4 text-zinc-400">{inv.billing_month}</td>
                            <td className="py-4 px-4 text-zinc-300 max-w-xs truncate">
                              {inv.plan_name}
                            </td>
                            <td className="py-4 px-4 text-right text-zinc-300">
                              ₹{inv.subtotal_inr.toLocaleString('en-IN')}
                            </td>
                            <td className="py-4 px-4 text-right text-white font-bold">
                              ₹{inv.total_inr.toLocaleString('en-IN')}
                            </td>
                            <td className="py-4 px-4 text-center">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  inv.status === 'PAID'
                                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                                    : inv.status === 'DUE'
                                    ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                                    : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
                                }`}
                              >
                                {inv.status}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {inv.status !== 'PAID' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleMarkInvoicePaid(inv)}
                                    className="text-[10px] text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                                  >
                                    Mark Paid
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setViewInvoice(inv)}
                                  className="text-zinc-400 hover:text-white"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                </Button>
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
          </div>
        )}

        {/* MODAL 1: EDIT SERVICE RATE */}
        <AnimatePresence>
          {editingRate && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-md rounded-2xl bg-zinc-950 border border-zinc-800 p-6 space-y-5"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-headline font-bold text-lg text-white">
                    Edit Rate Card: {editingRate.display_name}
                  </h3>
                  <button
                    onClick={() => setEditingRate(null)}
                    className="text-zinc-400 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4 font-mono text-xs">
                  <div>
                    <label className="block text-zinc-400 mb-1">
                      Unit Cost in INR (per {editingRate.unit_label})
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      value={rateForm.unit_cost_inr}
                      onChange={(e) =>
                        setRateForm({ ...rateForm, unit_cost_inr: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-400 mb-1">Monthly Fixed Allowance (INR)</label>
                    <input
                      type="number"
                      step="1"
                      value={rateForm.monthly_fixed_inr}
                      onChange={(e) =>
                        setRateForm({
                          ...rateForm,
                          monthly_fixed_inr: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-400 mb-1">Free Tier Quota Allowance</label>
                    <input
                      type="number"
                      step="1"
                      value={rateForm.free_tier_quota}
                      onChange={(e) =>
                        setRateForm({
                          ...rateForm,
                          free_tier_quota: parseInt(e.target.value, 10) || 0,
                        })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3">
                  <Button variant="ghost" size="sm" onClick={() => setEditingRate(null)}>
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSaveRate}
                    isLoading={rateSaving}
                    className="bg-teal-500 hover:bg-teal-400 text-zinc-950 font-bold"
                  >
                    Save Changes
                  </Button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* MODAL 2: CREATE INVOICE */}
        <AnimatePresence>
          {showInvoiceModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-lg rounded-2xl bg-zinc-950 border border-zinc-800 p-6 space-y-5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-teal-400" />
                    <h3 className="font-headline font-bold text-lg text-white">
                      Generate Institution Tax Invoice
                    </h3>
                  </div>
                  <button
                    onClick={() => setShowInvoiceModal(false)}
                    className="text-zinc-400 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleCreateInvoice} className="space-y-4 font-mono text-xs">
                  <div>
                    <label className="block text-zinc-400 mb-1">Target Institution</label>
                    <select
                      value={invoiceOrgId}
                      onChange={(e) => setInvoiceOrgId(e.target.value)}
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-teal-500"
                    >
                      {orgs.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name} ({o.institute_code || o.slug})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-zinc-400 mb-1">Plan / Line Item Description</label>
                    <input
                      type="text"
                      required
                      value={invoicePlanName}
                      onChange={(e) => setInvoicePlanName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-zinc-400 mb-1">Subtotal (INR)</label>
                      <input
                        type="number"
                        required
                        value={invoiceSubtotal}
                        onChange={(e) => setInvoiceSubtotal(parseFloat(e.target.value) || 0)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-teal-500"
                      />
                    </div>

                    <div>
                      <label className="block text-zinc-400 mb-1">Total (+18% GST)</label>
                      <div className="px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-emerald-400 font-bold">
                        ₹{(invoiceSubtotal * 1.18).toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-zinc-400 mb-1">Invoice Notes / Reference</label>
                    <textarea
                      rows={2}
                      value={invoiceNotes}
                      onChange={(e) => setInvoiceNotes(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-3">
                    <Button variant="ghost" size="sm" onClick={() => setShowInvoiceModal(false)}>
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      isLoading={invoiceSubmitting}
                      className="bg-teal-500 hover:bg-teal-400 text-zinc-950 font-bold"
                    >
                      Issue & Dispatch Invoice
                    </Button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* MODAL 3: INVOICE PRINT RECEIPT */}
        <AnimatePresence>
          {viewInvoice && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-xl rounded-2xl bg-zinc-950 border border-zinc-800 p-8 space-y-6 text-white"
              >
                <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold">
                      C
                    </div>
                    <div>
                      <h4 className="font-headline font-bold text-base">Colformly Technologies</h4>
                      <p className="font-mono text-[10px] text-zinc-400">
                        Autonomous Campus Examination Platform
                      </p>
                    </div>
                  </div>
                  <div className="text-right font-mono">
                    <div className="text-sm font-bold text-teal-400">
                      {viewInvoice.invoice_number}
                    </div>
                    <div className="text-[10px] text-zinc-500">
                      Month: {viewInvoice.billing_month}
                    </div>
                  </div>
                </div>

                <div className="space-y-4 font-mono text-xs">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-zinc-500 text-[10px] block">Billed To</span>
                      <span className="font-bold text-white text-sm">
                        {orgs.find((o) => o.id === viewInvoice.org_id)?.name || 'Client Institution'}
                      </span>
                      <span className="block text-zinc-400 text-[10px] mt-0.5">
                        GSTIN: 07AAAAA0000A1Z5
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-zinc-500 text-[10px] block">Payment Status</span>
                      <span
                        className={`inline-block px-2 py-0.5 rounded font-bold text-[10px] mt-1 ${
                          viewInvoice.status === 'PAID'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-amber-500/20 text-amber-400'
                        }`}
                      >
                        {viewInvoice.status}
                      </span>
                      {viewInvoice.due_date && (
                        <span className="block text-zinc-500 text-[10px] mt-1">
                          Due Date: {viewInvoice.due_date}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-3">
                    <div className="flex justify-between font-bold border-b border-zinc-800 pb-2">
                      <span>Description</span>
                      <span>Amount (INR)</span>
                    </div>
                    <div className="flex justify-between text-zinc-300">
                      <span>{viewInvoice.plan_name}</span>
                      <span>₹{viewInvoice.subtotal_inr.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between text-zinc-400 text-[11px]">
                      <span>CGST (9%) + SGST (9%)</span>
                      <span>₹{viewInvoice.gst_inr.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between font-bold text-white border-t border-zinc-800 pt-2 text-sm">
                      <span>Total Amount</span>
                      <span className="text-teal-400">
                        ₹{viewInvoice.total_inr.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  <div className="text-[10px] text-zinc-500 italic">
                    {viewInvoice.notes || 'Thank you for choosing Colformly Enterprise.'}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
                  <Button variant="ghost" size="sm" onClick={() => setViewInvoice(null)}>
                    Close
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => window.print()}
                    leftIcon={<Printer className="w-3.5 h-3.5" />}
                    className="bg-teal-500 hover:bg-teal-400 text-zinc-950 font-bold"
                  >
                    Print Receipt
                  </Button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </SuperAdminShell>
  );
}
