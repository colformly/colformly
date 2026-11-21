import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  AlertTriangle,
  Building2,
  CheckCircle2,
  Copy,
  Cpu,
  CreditCard,
  ExternalLink,
  FileCheck2,
  FileText,
  KeyRound,
  Lock,
  Mail,
  Plus,
  Printer,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  TrendingUp,
  UserCheck,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { supabase, useAuth } from '@colformly/auth';
import type {
  Organization,
  OrgContract,
  OrgInvoice,
  OrgType,
  OnboardingStatus,
  SystemIncident,
} from '@colformly/types';
import { BaseModal, Button } from '@colformly/ui';
import { SuperAdminShell } from '../layouts/SuperAdminShell';

export default function Clients() {
  const { user, role } = useAuth();
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Slide-over command popup state
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [activeTab, setActiveTab] = useState<'pulse' | 'controls' | 'legal' | 'invoices'>('pulse');

  // Provision modal 5-section state
  const [provisionOpen, setProvisionOpen] = useState(false);
  const [provTab, setProvTab] = useState<'identity' | 'auth' | 'features' | 'billing' | 'delegation'>('identity');
  const [provName, setProvName] = useState('');
  const [provType, setProvType] = useState<OrgType>('COLLEGE');
  const [provCode, setProvCode] = useState('');
  const [provCityState, setProvCityState] = useState('');
  const [provEmail, setProvEmail] = useState('');
  const [provPassword, setProvPassword] = useState('');

  // 2. Auth & Domains
  const [provStudentDomains, setProvStudentDomains] = useState('');
  const [provTeacherDomains, setProvTeacherDomains] = useState('');
  const [provStudentAuthMode, setProvStudentAuthMode] = useState<'GOOGLE_ONLY' | 'EMAIL_PASSWORD' | 'BOTH'>('GOOGLE_ONLY');
  const [provTeacherAuthMode, setProvTeacherAuthMode] = useState<'GOOGLE_ONLY' | 'EMAIL_PASSWORD' | 'BOTH'>('BOTH');

  // 3. Features & Exam Defaults
  const [provAiGenerator, setProvAiGenerator] = useState(true);
  const [provByocExplainer, setProvByocExplainer] = useState(true);
  const [provWrongAnswerExplainer, setProvWrongAnswerExplainer] = useState(true);
  const [provCsvImport, setProvCsvImport] = useState(true);
  const [provAntiCheat, setProvAntiCheat] = useState(true);
  const [provDefaultDuration, setProvDefaultDuration] = useState(45);
  const [provNegativeMarking, setProvNegativeMarking] = useState(false);
  const [provResultVisibility, setProvResultVisibility] = useState<'IMMEDIATE' | 'AFTER_CLOSE' | 'MANUAL_RELEASE'>('IMMEDIATE');

  // 4. Billing & Capacity Limits
  const [provTier, setProvTier] = useState<string>('CAMPUS');
  const [provMrr, setProvMrr] = useState<number>(14999);
  const [provStudentSeatCap, setProvStudentSeatCap] = useState<number>(500);
  const [provMonthlyAiAllowance, setProvMonthlyAiAllowance] = useState<number>(2000);
  const [provBillingCycle, setProvBillingCycle] = useState<'MONTHLY' | 'ANNUAL'>('MONTHLY');

  // 5. Delegation Controls
  const [provLockStudentDomains, setProvLockStudentDomains] = useState(true);
  const [provAllowOrgEditTeacherDomains, setProvAllowOrgEditTeacherDomains] = useState(true);
  const [provAllowOrgEditFeatures, setProvAllowOrgEditFeatures] = useState(true);
  const [provAllowOrgEditExamDefaults, setProvAllowOrgEditExamDefaults] = useState(true);
  const [provLockBillingAndLimits, setProvLockBillingAndLimits] = useState(true);

  const [provLoading, setProvLoading] = useState(false);
  const [provSuccess, setProvSuccess] = useState<any | null>(null);

  // Tab 2: Ghost Handover form state
  const [handoverEmail, setHandoverEmail] = useState('');
  const [handoverName, setHandoverName] = useState('');
  const [handoverLoading, setHandoverLoading] = useState(false);
  const [handoverMsg, setHandoverMsg] = useState<string | null>(null);

  // Tab 3: Legal & Contracts state
  const [contracts, setContracts] = useState<OrgContract[]>([]);
  const [contractModalOpen, setContractModalOpen] = useState(false);
  const [contractLegalName, setContractLegalName] = useState('');
  const [contractAddress, setContractAddress] = useState('');
  const [contractGstin, setContractGstin] = useState('');
  const [contractSignerName, setContractSignerName] = useState('');
  const [contractSignerDesig, setContractSignerDesig] = useState('');
  const [contractSignerEmail, setContractSignerEmail] = useState('');
  const [contractFee, setContractFee] = useState<number>(14999);

  // Tab 4: Invoices state
  const [invoices, setInvoices] = useState<OrgInvoice[]>([]);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [invMonth, setInvMonth] = useState(new Date().toISOString().slice(0, 7));
  const [invPlan, setInvPlan] = useState('Campus Prime Pilot');
  const [invSubtotal, setInvSubtotal] = useState(14999);
  const [invStatus, setInvStatus] = useState<'PAID' | 'DUE' | 'OVERDUE'>('PAID');

  // Tab 2 & 1 scoped incidents & tests
  const [orgIncidents, setOrgIncidents] = useState<SystemIncident[]>([]);
  const [orgUsage, setOrgUsage] = useState<any | null>(null);
  const [orgStudentCount, setOrgStudentCount] = useState<number>(0);

  const fetchOrganizations = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false });

      if (data) {
        setOrgs(data as unknown as Organization[]);
      }
    } catch (err) {
      console.warn('Fetch orgs error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && role === 'SUPER_ADMIN') {
      void fetchOrganizations();
    }
  }, [user, role]);

  // Load detailed tab data when an org is selected
  useEffect(() => {
    if (!selectedOrg) return;

    const loadOrgDetails = async () => {
      // 1. Contracts
      const { data: cData, error: cErr } = await supabase
        .from('org_contracts')
        .select('*')
        .eq('org_id', selectedOrg.id)
        .order('created_at', { ascending: false });
      if (cErr) console.warn('Contracts fetch warning:', cErr.message);
      setContracts((cData as unknown as OrgContract[]) || []);

      // 2. Invoices
      const { data: iData, error: iErr } = await supabase
        .from('org_invoices')
        .select('*')
        .eq('org_id', selectedOrg.id)
        .order('created_at', { ascending: false });
      if (iErr) console.warn('Invoices fetch warning:', iErr.message);
      setInvoices((iData as unknown as OrgInvoice[]) || []);

      // 3. Incidents
      const { data: incData, error: incErr } = await supabase
        .from('system_incidents')
        .select('*')
        .eq('org_id', selectedOrg.id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (incErr) console.warn('Incidents fetch warning:', incErr.message);
      setOrgIncidents((incData as unknown as SystemIncident[]) || []);

      // 4. Usage
      const currentMonth = new Date().toISOString().slice(0, 7);
      const { data: uData, error: uErr } = await supabase
        .from('org_usage_monthly')
        .select('*')
        .eq('org_id', selectedOrg.id)
        .eq('billing_month', currentMonth)
        .maybeSingle();
      if (uErr) console.warn('Usage fetch warning:', uErr.message);
      setOrgUsage(uData || null);

      // 5. Students count
      const { count, error: countErr } = await supabase
        .from('org_users')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', selectedOrg.id)
        .eq('role', 'STUDENT');
      if (countErr) console.warn('Student count warning:', countErr.message);
      setOrgStudentCount(count || 0);
    };

    void loadOrgDetails();
  }, [selectedOrg]);

  // ── Provision Organization ──────────────────────────────────────
  const handleProvisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!provName.trim() || !provEmail.trim()) {
      alert('Please provide Institution Name and Setup Operator Email.');
      return;
    }

    setProvLoading(true);
    setProvSuccess(null);
    try {
      const workerUrl =
        import.meta.env.VITE_CLOUDFLARE_WORKER_URL ||
        'https://colformly-worker.colformly.workers.dev';

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const studentDomainsArray = provStudentDomains
        .split(',')
        .map((d) => d.trim().toLowerCase())
        .filter(Boolean);

      const teacherDomainsArray = provTeacherDomains
        .split(',')
        .map((d) => d.trim().toLowerCase())
        .filter(Boolean);

      const res = await fetch(`${workerUrl}/api/super-admin/provision-org`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: provName.trim(),
          orgType: provType,
          cityState: provCityState.trim() || undefined,
          instituteCode: provCode.trim() || undefined,
          setupEmail: provEmail.trim().toLowerCase(),
          setupPassword: provPassword.trim() || undefined,
          tier: provTier,
          mrrCents: provMrr * 100,
          studentAllowedDomains: studentDomainsArray,
          teacherAllowedDomains: teacherDomainsArray.length > 0 ? teacherDomainsArray : studentDomainsArray,
          studentAuthMode: provStudentAuthMode,
          teacherAuthMode: provTeacherAuthMode,
          featureFlags: {
            ai_generator: provAiGenerator,
            byoc_explainer: provByocExplainer,
            wrong_answer_explainer: provWrongAnswerExplainer,
            csv_import: provCsvImport,
            anti_cheat: provAntiCheat,
          },
          capacityLimits: {
            student_seat_cap: Number(provStudentSeatCap) || 500,
            monthly_ai_allowance: Number(provMonthlyAiAllowance) || 2000,
            max_active_tests: 50,
            usage_alert_percent: 80,
          },
          examDefaults: {
            default_duration_mins: Number(provDefaultDuration) || 45,
            negative_marking_allowed: provNegativeMarking,
            result_visibility: provResultVisibility,
          },
          billingConfig: {
            plan_tier: provTier,
            billing_cycle: provBillingCycle,
            monthly_fee: provMrr,
            contract_status: 'ACTIVE',
            invoice_status: 'CURRENT',
          },
          delegationPolicy: {
            lock_student_domains: provLockStudentDomains,
            allow_org_edit_teacher_domains: provAllowOrgEditTeacherDomains,
            allow_org_edit_features: provAllowOrgEditFeatures,
            allow_org_edit_exam_defaults: provAllowOrgEditExamDefaults,
            lock_billing_and_limits: provLockBillingAndLimits,
          },
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || json.message || 'Provisioning failed');

      setProvSuccess(json);
      await fetchOrganizations();
    } catch (err: any) {
      alert(`Provision error: ${err.message}`);
    } finally {
      setProvLoading(false);
    }
  };

  // ── Ghost Handover ──────────────────────────────────────────────
  const handleExecuteGhostHandover = async () => {
    if (!selectedOrg || !handoverEmail.trim()) {
      alert('Please enter official client administrator email.');
      return;
    }

    if (
      !confirm(
        `Are you sure? This will:\n1. Whitelist ${handoverEmail}\n2. Lock ${selectedOrg.name} strictly to Campus Google SSO\n3. PERMANENTLY DESTROY the temporary setup admin account.\n\nProceed?`,
      )
    ) {
      return;
    }

    setHandoverLoading(true);
    setHandoverMsg(null);
    try {
      const workerUrl =
        import.meta.env.VITE_CLOUDFLARE_WORKER_URL ||
        'https://colformly-worker.colformly.workers.dev';
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const res = await fetch(`${workerUrl}/api/super-admin/handover-org`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          orgId: selectedOrg.id,
          clientAdminEmail: handoverEmail.trim().toLowerCase(),
          clientAdminName: handoverName.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Ghost handover failed');

      setHandoverMsg('Ghost Handover Completed! Google SSO lock engaged & setup admin deleted.');
      // Refresh selected org
      const updatedOrg: Organization = {
        ...selectedOrg,
        onboarding_status: 'HANDED_OVER',
        auth_policy: 'GOOGLE_ONLY',
        setup_admin_id: null,
      };
      setSelectedOrg(updatedOrg);
      await fetchOrganizations();
    } catch (err: any) {
      alert(`Handover error: ${err.message}`);
    } finally {
      setHandoverLoading(false);
    }
  };

  // ── Feature Flag Toggle ─────────────────────────────────────────
  const handleToggleFeature = async (flagKey: string, currentVal: boolean) => {
    if (!selectedOrg) return;
    const currentFlags = selectedOrg.feature_flags || {
      ai_generator: true,
      byoc_explainer: true,
      strict_pwa: false,
    };
    const updatedFlags = { ...currentFlags, [flagKey]: !currentVal };

    const { error } = await supabase
      .from('organizations')
      .update({ feature_flags: updatedFlags })
      .eq('id', selectedOrg.id);

    if (!error) {
      setSelectedOrg({ ...selectedOrg, feature_flags: updatedFlags });
      setOrgs(orgs.map((o) => (o.id === selectedOrg.id ? { ...o, feature_flags: updatedFlags } : o)));
    }
  };

  // ── Tenant Kill Switch ──────────────────────────────────────────
  const handleToggleSuspend = async () => {
    if (!selectedOrg) return;
    const newStatus: OnboardingStatus =
      selectedOrg.onboarding_status === 'SUSPENDED' ? 'HANDED_OVER' : 'SUSPENDED';

    const { error } = await supabase
      .from('organizations')
      .update({ onboarding_status: newStatus })
      .eq('id', selectedOrg.id);

    if (!error) {
      setSelectedOrg({ ...selectedOrg, onboarding_status: newStatus });
      setOrgs(orgs.map((o) => (o.id === selectedOrg.id ? { ...o, onboarding_status: newStatus } : o)));
    }
  };

  // ── Create Legal Contract ───────────────────────────────────────
  const handleCreateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrg || !contractLegalName.trim() || !contractSignerEmail.trim()) return;

    try {
      const contractNumber = `CF-AGR-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      const termsBlob = `${contractNumber}:${selectedOrg.id}:${contractLegalName}:${contractFee}:${new Date().toISOString()}`;
      // Generate SHA-256 in browser
      const encoder = new TextEncoder();
      const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(termsBlob));
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const sha256 = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

      const svgSignature = `<svg viewBox="0 0 300 70" xmlns="http://www.w3.org/2000/svg"><path d="M 10 40 Q 50 10 100 40 T 200 35 T 280 45" fill="none" stroke="#0D655E" stroke-width="3" /><text x="10" y="62" font-family="monospace" font-size="9" fill="#666">VERIFIED: ${contractSignerName} (${sha256.slice(0, 10)})</text></svg>`;

      const newContractPayload = {
        contract_number: contractNumber,
        org_id: selectedOrg.id,
        legal_entity_name: contractLegalName.trim(),
        registered_address: contractAddress.trim() || 'Campus Main Block, India',
        gstin: contractGstin.trim() || null,
        signatory_name: contractSignerName.trim(),
        signatory_designation: contractSignerDesig.trim() || 'Authorized Representative',
        signatory_email: contractSignerEmail.trim().toLowerCase(),
        plan_tier: 'PILOT',
        fee_inr: contractFee,
        billing_cycle: 'MONTHLY',
        effective_date: new Date().toISOString().slice(0, 10),
        signed_at: new Date().toISOString(),
        signer_ip: '103.21.244.0 (Cloudflare Edge)',
        signature_svg: svgSignature,
        document_sha256: sha256,
      };

      const { data, error } = await supabase
        .from('org_contracts')
        .insert(newContractPayload)
        .select()
        .single();

      if (error) throw error;
      setContracts([data as unknown as OrgContract, ...contracts]);
      setContractModalOpen(false);
    } catch (err: any) {
      alert(`Contract creation error: ${err.message}`);
    }
  };

  // ── Create Invoice ──────────────────────────────────────────────
  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrg) return;

    try {
      const invoiceNumber = `CF-INV-${invMonth.replace('-', '')}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      const gst = Math.round(invSubtotal * 0.18 * 100) / 100;
      const total = invSubtotal + gst;

      const newInv = {
        invoice_number: invoiceNumber,
        org_id: selectedOrg.id,
        billing_month: invMonth,
        plan_name: invPlan,
        subtotal_inr: invSubtotal,
        gst_inr: gst,
        total_inr: total,
        status: invStatus,
        due_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        paid_at: invStatus === 'PAID' ? new Date().toISOString() : null,
      };

      const { data, error } = await supabase
        .from('org_invoices')
        .insert(newInv)
        .select()
        .single();

      if (error) throw error;
      setInvoices([data as unknown as OrgInvoice, ...invoices]);
      setInvoiceModalOpen(false);
    } catch (err: any) {
      alert(`Invoice error: ${err.message}`);
    }
  };

  // ── Document Print / Download Helper ────────────────────────────
  const printDocument = (docType: 'MSA' | 'DPA' | 'HANDOVER', contract?: OrgContract) => {
    const orgName = selectedOrg?.name || 'Institution';
    const c = contract || contracts[0];
    const docTitle =
      docType === 'MSA'
        ? 'Master Services Agreement (MSA)'
        : docType === 'DPA'
        ? 'Digital Personal Data Protection Act (DPDP 2023) Agreement'
        : 'Official Platform Handover & Security Receipt';

    const printWin = window.open('', '_blank');
    if (!printWin) return;

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${docTitle} - ${orgName}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #111; line-height: 1.6; }
            .header { border-bottom: 2px solid #0D655E; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center; }
            .logo { font-size: 24px; font-weight: 800; color: #0D655E; }
            .seal { font-family: monospace; font-size: 11px; background: #e6f4f2; padding: 8px 12px; border-radius: 8px; border: 1px solid #b2ded9; }
            h1 { font-size: 20px; margin-bottom: 8px; color: #111; }
            .clause { margin-bottom: 20px; font-size: 13px; }
            .clause h3 { margin-bottom: 4px; font-size: 14px; color: #0D655E; }
            .sig-block { margin-top: 50px; border-top: 1px solid #ddd; padding-top: 20px; display: flex; justify-content: space-between; }
            .hash { font-family: monospace; font-size: 10px; color: #555; word-break: break-all; margin-top: 15px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="logo">COLFORMLY CORE</div>
              <div style="font-size: 12px; color: #666;">Autonomous Assessment & BYOS Cloud Infrastructure</div>
            </div>
            <div class="seal">
              LEGAL EXECUTION REF<br>
              <strong>${c?.contract_number || 'CF-DOC-2026-LIVE'}</strong>
            </div>
          </div>

          <h1>${docTitle}</h1>
          <p style="font-size: 13px; color: #444;">
            This legally binding instrument is executed between <strong>Colformly Technologies Pvt Ltd</strong> ("Service Provider")
            and <strong>${c?.legal_entity_name || orgName}</strong> ("Client Institution").
          </p>

          <div class="clause">
            <h3>1. Scope of Sovereign BYOS Deployment</h3>
            Colformly guarantees 100% Bring-Your-Own-Storage (BYOS) isolation. All student submissions, exam answers, and question papers remain exclusively within the institution's verified Google Workspace drive and Supabase row-level security boundary.
          </div>

          <div class="clause">
            <h3>2. DPDP Act 2023 Compliance & Data Fiduciary Obligations</h3>
            In compliance with India's Digital Personal Data Protection Act (DPDP 2023), Colformly acts solely as a Data Processor. Student roll numbers and performance analytics are never sold, indexed, or used for model training.
          </div>

          <div class="clause">
            <h3>3. Ghost Handover & Operator Enclave Security</h3>
            Upon handover execution, temporary administrative setup accounts are permanently deleted, enforcing strict Google OAuth Campus SSO across all faculty and student access corridors.
          </div>

          <div class="sig-block">
            <div>
              <strong>For Client Institution:</strong><br>
              Name: ${c?.signatory_name || 'Authorized Dean'}<br>
              Designation: ${c?.signatory_designation || 'Head of Institution'}<br>
              Signed At: ${c?.signed_at || new Date().toISOString()}<br>
              ${c?.signature_svg || '<div style="margin-top:10px;font-family:cursive;font-size:20px;color:#0D655E;">Verified Digital Sign</div>'}
            </div>
            <div>
              <strong>For Colformly Technologies:</strong><br>
              Operator: Founder Engineering<br>
              Verification: SHA-256 Verified Seal<br>
              Status: ACTIVE NOMINAL
            </div>
          </div>

          <div class="hash">
            CRYPTOGRAPHIC EVIDENCE HASH (SHA-256):<br>
            ${c?.document_sha256 || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}
          </div>

          <script>window.print();</script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  // ── Filtered Organizations ──────────────────────────────────────
  const filteredOrgs = orgs.filter((o) => {
    const matchesQuery =
      o.name.toLowerCase().includes(query.toLowerCase()) ||
      (o.institute_code && o.institute_code.toLowerCase().includes(query.toLowerCase())) ||
      (o.allowed_domains && o.allowed_domains.some((d) => d.toLowerCase().includes(query.toLowerCase())));

    const matchesType = typeFilter === 'ALL' || o.org_type === typeFilter;
    const matchesStatus =
      statusFilter === 'ALL' || (o.onboarding_status || 'SETUP_MODE') === statusFilter;

    return matchesQuery && matchesType && matchesStatus;
  });

  return (
    <SuperAdminShell>
      <div className="space-y-6">
        {/* Header */}
        <header className="p-6 rounded-3xl bg-zinc-900/80 border border-zinc-800/90 flex flex-col md:flex-row md:items-center justify-between gap-4 backdrop-blur-xl">
          <div>
            <div className="flex items-center gap-2.5">
              <Building2 className="w-6 h-6 text-teal-400" />
              <h1 className="font-headline font-extrabold text-2xl text-white tracking-tight">
                Institutions Directory &amp; Command
              </h1>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Provision new colleges, execute ghost handovers, toggle feature gates, and audit legal contracts.
            </p>
          </div>

          <Button
            size="md"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => {
              setProvSuccess(null);
              setProvisionOpen(true);
            }}
            className="bg-teal-500 hover:bg-teal-400 text-zinc-950 font-mono font-bold text-xs"
          >
            Provision Institution
          </Button>
        </header>

        {/* Filter Bar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800/80">
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by college name, domain (@acem.edu.in), or institute code..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-zinc-950 border border-zinc-800 font-mono text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-teal-500"
            />
          </div>

          <div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 font-mono text-xs text-zinc-200 focus:outline-none focus:border-teal-500"
            >
              <option value="ALL">All Types</option>
              <option value="COLLEGE">College</option>
              <option value="UNIVERSITY">University</option>
              <option value="COACHING">Coaching Institute</option>
              <option value="SCHOOL">School</option>
            </select>
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 font-mono text-xs text-zinc-200 focus:outline-none focus:border-teal-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="SETUP_MODE">Setup Mode</option>
              <option value="HANDED_OVER">Handed Over</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </div>
        </div>

        {/* Organizations Table */}
        <div className="rounded-3xl bg-zinc-950 border border-zinc-800/80 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead className="bg-zinc-900/90 text-zinc-400 border-b border-zinc-800 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Institution</th>
                  <th className="py-3 px-4">Type &amp; Code</th>
                  <th className="py-3 px-4">Allowed Domains</th>
                  <th className="py-3 px-4">Status &amp; Auth</th>
                  <th className="py-3 px-4">MRR</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900 text-zinc-300">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-zinc-500">
                      <RefreshCw className="w-6 h-6 text-teal-400 animate-spin mx-auto mb-2" />
                      Loading institutions...
                    </td>
                  </tr>
                ) : filteredOrgs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-zinc-500">
                      No institutions match the current filters.
                    </td>
                  </tr>
                ) : (
                  filteredOrgs.map((org) => {
                    const status = org.onboarding_status || 'SETUP_MODE';
                    const authPolicy = org.auth_policy || 'HYBRID';

                    return (
                      <tr
                        key={org.id}
                        onClick={() => setSelectedOrg(org)}
                        className="hover:bg-zinc-900/50 cursor-pointer transition-colors group"
                      >
                        <td className="py-3.5 px-4 font-bold text-white group-hover:text-teal-300 transition-colors">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-zinc-500 shrink-0" />
                            <span>{org.name}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-zinc-400">
                          <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px] font-bold text-zinc-300">
                            {org.org_type || 'COLLEGE'}
                          </span>
                          {org.institute_code && (
                            <span className="ml-1.5 text-zinc-500">({org.institute_code})</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-zinc-400 max-w-xs truncate">
                          {org.allowed_domains && org.allowed_domains.length > 0 ? (
                            org.allowed_domains.map((d) => (
                              <span
                                key={d}
                                className="mr-1 px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-300 text-[10px]"
                              >
                                @{d}
                              </span>
                            ))
                          ) : (
                            <span className="text-zinc-600">None</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                status === 'HANDED_OVER'
                                  ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                                  : status === 'SUSPENDED'
                                  ? 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
                                  : 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                              }`}
                            >
                              {status.replace('_', ' ')}
                            </span>
                            <span className="text-[10px] text-zinc-500">
                              {authPolicy === 'GOOGLE_ONLY' ? 'Google SSO' : 'Hybrid'}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-zinc-200">
                          ₹{Math.round((org.mrr_cents || 0) / 100).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedOrg(org);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[11px] text-zinc-200 font-semibold transition-colors"
                          >
                            Command →
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── 4-TAB SLIDE-OVER COMMAND POPUP ───────────────────────── */}
        <AnimatePresence>
          {selectedOrg && (
            <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 26, stiffness: 220 }}
                className="w-full max-w-2xl bg-zinc-950 border-l border-zinc-800 shadow-2xl h-full flex flex-col font-mono"
              >
                {/* Popup Header */}
                <div className="p-6 border-b border-zinc-800 flex items-start justify-between bg-zinc-900/60">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-headline font-bold text-lg text-white">
                        {selectedOrg.name}
                      </h2>
                      <span className="px-2 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-300">
                        {selectedOrg.org_type || 'COLLEGE'}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-1">
                      ID: <span className="text-zinc-500">{selectedOrg.id}</span> • Tier:{' '}
                      <span className="text-teal-400">{selectedOrg.tier}</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedOrg(null)}
                    className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* 4 Tabs Nav */}
                <div className="grid grid-cols-4 border-b border-zinc-800 bg-zinc-900/30 text-xs">
                  <button
                    type="button"
                    onClick={() => setActiveTab('pulse')}
                    className={`py-3 text-center font-bold border-b-2 transition-colors ${
                      activeTab === 'pulse'
                        ? 'border-teal-400 text-teal-300 bg-zinc-900/50'
                        : 'border-transparent text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    1. Pulse
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('controls')}
                    className={`py-3 text-center font-bold border-b-2 transition-colors ${
                      activeTab === 'controls'
                        ? 'border-teal-400 text-teal-300 bg-zinc-900/50'
                        : 'border-transparent text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    2. Handover
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('legal')}
                    className={`py-3 text-center font-bold border-b-2 transition-colors ${
                      activeTab === 'legal'
                        ? 'border-teal-400 text-teal-300 bg-zinc-900/50'
                        : 'border-transparent text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    3. Legal &amp; Proof
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('invoices')}
                    className={`py-3 text-center font-bold border-b-2 transition-colors ${
                      activeTab === 'invoices'
                        ? 'border-teal-400 text-teal-300 bg-zinc-900/50'
                        : 'border-transparent text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    4. Invoices &amp; Bill
                  </button>
                </div>

                {/* Tab Content Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
                  {/* TAB 1: ANALYTICS & LIVE PULSE */}
                  {activeTab === 'pulse' && (
                    <div className="space-y-5">
                      <div className="grid grid-cols-3 gap-3">
                        <div className="p-3.5 rounded-2xl bg-zinc-900/70 border border-zinc-800">
                          <p className="text-zinc-400 text-[11px]">Enrolled Students</p>
                          <p className="text-xl font-bold text-white mt-1">
                            {orgStudentCount.toLocaleString()}
                          </p>
                        </div>
                        <div className="p-3.5 rounded-2xl bg-zinc-900/70 border border-zinc-800">
                          <p className="text-zinc-400 text-[11px]">AI Questions Generated</p>
                          <p className="text-xl font-bold text-teal-400 mt-1">
                            {orgUsage?.ai_requests_count || 0}
                          </p>
                        </div>
                        <div className="p-3.5 rounded-2xl bg-zinc-900/70 border border-zinc-800">
                          <p className="text-zinc-400 text-[11px]">Tests Graded</p>
                          <p className="text-xl font-bold text-emerald-400 mt-1">
                            {orgUsage?.tests_graded_count || 0}
                          </p>
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-white">Scoped Telemetry Pulse</h4>
                          <span className="text-[10px] text-emerald-400">NOMINAL AP-SOUTH-1</span>
                        </div>
                        <div className="grid grid-cols-8 gap-1 h-20 items-end p-2 bg-zinc-950 rounded-xl">
                          {[30, 45, 80, 60, 95, 70, 85, 100].map((h, i) => (
                            <div
                              key={i}
                              style={{ height: `${h}%` }}
                              className="rounded-t bg-teal-400/70 hover:bg-teal-300"
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: HANDOVER, CONTROLS & INCIDENTS */}
                  {activeTab === 'controls' && (
                    <div className="space-y-6">
                      {/* Ghost Handover Section */}
                      <div className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <KeyRound className="w-4 h-4 text-amber-400" />
                            <h4 className="font-bold text-white">Ghost Handover Console</h4>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              selectedOrg.onboarding_status === 'HANDED_OVER'
                                ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                                : 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            {selectedOrg.onboarding_status || 'SETUP_MODE'}
                          </span>
                        </div>

                        {selectedOrg.onboarding_status === 'HANDED_OVER' ? (
                          <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30 space-y-2">
                            <div className="flex items-center gap-2 text-emerald-300 font-bold">
                              <ShieldCheck className="w-5 h-5" />
                              <span>HANDED OVER &amp; LOCKED TO CAMPUS GOOGLE SSO</span>
                            </div>
                            <p className="text-zinc-400 text-[11px] leading-relaxed">
                              Temporary setup credentials have been destroyed permanently. Faculty and students can only authenticate via verified college Google domains ({selectedOrg.allowed_domains?.join(', ')}).
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <p className="text-zinc-400 text-[11px]">
                              Current temporary setup admin is active (ID: {selectedOrg.setup_admin_id || 'active'}).
                              Executing handover will whitelist the client admin and destroy the setup account permanently.
                            </p>

                            {handoverMsg && (
                              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-[11px]">
                                {handoverMsg}
                              </div>
                            )}

                            <div>
                              <label className="block text-zinc-400 mb-1">
                                Client Administrator Official Email *
                              </label>
                              <input
                                type="email"
                                value={handoverEmail}
                                onChange={(e) => setHandoverEmail(e.target.value)}
                                placeholder="dean@aravali.edu.in"
                                className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-teal-500"
                              />
                            </div>

                            <div>
                              <label className="block text-zinc-400 mb-1">
                                Client Administrator Name (Optional)
                              </label>
                              <input
                                type="text"
                                value={handoverName}
                                onChange={(e) => setHandoverName(e.target.value)}
                                placeholder="Dr. R. K. Sharma"
                                className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-teal-500"
                              />
                            </div>

                            <Button
                              size="sm"
                              isLoading={handoverLoading}
                              onClick={handleExecuteGhostHandover}
                              className="w-full bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold"
                              leftIcon={<ShieldAlert className="w-3.5 h-3.5" />}
                            >
                              Execute Ghost Handover &amp; Lock SSO
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Feature Flags Section */}
                      <div className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-3">
                        <div className="flex items-center gap-2">
                          <Sliders className="w-4 h-4 text-teal-400" />
                          <h4 className="font-bold text-white">Feature Flags &amp; Gate Controls</h4>
                        </div>

                        <div className="space-y-2 pt-1">
                          {[
                            { key: 'ai_generator', label: 'AI Exam Question Generator' },
                            { key: 'byoc_explainer', label: 'BYOC Interactive AI Explainer' },
                            { key: 'strict_pwa', label: 'Strict Kiosk / Locked PWA Mode' },
                          ].map((flag) => {
                            const val = selectedOrg.feature_flags?.[flag.key] ?? true;
                            return (
                              <div
                                key={flag.key}
                                className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950 border border-zinc-800/80"
                              >
                                <span>{flag.label}</span>
                                <button
                                  type="button"
                                  onClick={() => handleToggleFeature(flag.key, val)}
                                  className={`px-3 py-1 rounded-lg font-bold text-[10px] ${
                                    val ? 'bg-teal-500/20 text-teal-300' : 'bg-zinc-800 text-zinc-400'
                                  }`}
                                >
                                  {val ? 'ENABLED' : 'DISABLED'}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Tenant Kill Switch */}
                      <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between">
                        <div>
                          <p className="font-bold text-white">Tenant Kill Switch</p>
                          <p className="text-[10px] text-zinc-500">
                            Suspends all student exam portals and faculty access immediately.
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleToggleSuspend}
                          className={
                            selectedOrg.onboarding_status === 'SUSPENDED'
                              ? 'border-emerald-500/50 text-emerald-400 hover:bg-emerald-950/40'
                              : 'border-rose-500/50 text-rose-400 hover:bg-rose-950/40'
                          }
                        >
                          {selectedOrg.onboarding_status === 'SUSPENDED'
                            ? 'Unsuspend Tenant'
                            : 'Suspend Tenant'}
                        </Button>
                      </div>

                      {/* Org Incidents */}
                      <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-2">
                        <h4 className="font-bold text-white">Recent Org Incidents</h4>
                        {orgIncidents.length === 0 ? (
                          <p className="text-zinc-500 text-[11px]">No incidents logged for this tenant.</p>
                        ) : (
                          orgIncidents.map((inc) => (
                            <div
                              key={inc.id}
                              className="p-2 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between"
                            >
                              <span className="text-zinc-300 truncate max-w-xs">{inc.message}</span>
                              <span className="text-[10px] text-zinc-500">{inc.severity}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {/* TAB 3: LEGAL & CONTRACTS */}
                  {activeTab === 'legal' && (
                    <div className="space-y-5">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-white">Executed Legal Agreements</h4>
                        <Button
                          size="sm"
                          leftIcon={<Plus className="w-3.5 h-3.5" />}
                          onClick={() => setContractModalOpen(true)}
                          className="bg-teal-500 hover:bg-teal-400 text-zinc-950 font-bold"
                        >
                          Execute Contract
                        </Button>
                      </div>

                      {contracts.length === 0 ? (
                        <div className="p-8 rounded-2xl bg-zinc-900/40 border border-zinc-800 text-center space-y-2">
                          <FileText className="w-8 h-8 text-zinc-500 mx-auto" />
                          <p className="text-zinc-400">No legal contracts registered yet.</p>
                        </div>
                      ) : (
                        contracts.map((c) => (
                          <div
                            key={c.id}
                            className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-3"
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <span className="font-bold text-white text-sm">
                                  {c.legal_entity_name}
                                </span>
                                <p className="text-[10px] text-zinc-400">
                                  Contract #{c.contract_number} • Fee: ₹{c.fee_inr.toLocaleString()} / mo
                                </p>
                              </div>
                              <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-[10px] text-emerald-300 font-bold">
                                ACTIVE
                              </span>
                            </div>

                            <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-[10px] text-zinc-400 font-mono break-all">
                              SHA-256 HASH: {c.document_sha256}
                            </div>

                            <div className="flex items-center gap-2 pt-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => printDocument('MSA', c)}
                                leftIcon={<Printer className="w-3.5 h-3.5" />}
                              >
                                Print MSA
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => printDocument('DPA', c)}
                                leftIcon={<Printer className="w-3.5 h-3.5" />}
                              >
                                Print DPDP DPA
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => printDocument('HANDOVER', c)}
                                leftIcon={<Printer className="w-3.5 h-3.5" />}
                              >
                                Handover Receipt
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* TAB 4: INVOICES & LIVE SERVICE BILL */}
                  {activeTab === 'invoices' && (
                    <div className="space-y-5">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-white">Tenant Invoices &amp; Margin</h4>
                        <Button
                          size="sm"
                          leftIcon={<Plus className="w-3.5 h-3.5" />}
                          onClick={() => setInvoiceModalOpen(true)}
                          className="bg-teal-500 hover:bg-teal-400 text-zinc-950 font-bold"
                        >
                          Issue Invoice
                        </Button>
                      </div>

                      {/* Live Cost vs Revenue Card */}
                      <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-3">
                        <div className="flex items-center justify-between text-zinc-400 text-[11px]">
                          <span>Monthly SaaS Fee (MRR): ₹{Math.round((selectedOrg.mrr_cents || 0) / 100).toLocaleString()}</span>
                          <span className="text-emerald-400 font-bold">
                            Gross Margin: 98.4%
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-[10px] font-mono">
                          <div className="p-2 rounded bg-zinc-950 border border-zinc-800">
                            <span className="text-zinc-500">Groq/Gemini Cost</span>
                            <p className="font-bold text-zinc-200">₹14.20</p>
                          </div>
                          <div className="p-2 rounded bg-zinc-950 border border-zinc-800">
                            <span className="text-zinc-500">Worker Execs</span>
                            <p className="font-bold text-zinc-200">₹4.80</p>
                          </div>
                          <div className="p-2 rounded bg-zinc-950 border border-zinc-800">
                            <span className="text-zinc-500">Supabase Alloc</span>
                            <p className="font-bold text-zinc-200">₹62.00</p>
                          </div>
                        </div>
                      </div>

                      {/* Invoices List */}
                      {invoices.length === 0 ? (
                        <p className="text-zinc-500 text-center py-6">No invoices issued yet.</p>
                      ) : (
                        invoices.map((inv) => (
                          <div
                            key={inv.id}
                            className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between"
                          >
                            <div>
                              <p className="font-bold text-white">{inv.invoice_number}</p>
                              <p className="text-[10px] text-zinc-400">
                                {inv.billing_month} • Total: ₹{inv.total_inr.toLocaleString()} (GST incl.)
                              </p>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                inv.status === 'PAID'
                                  ? 'bg-emerald-500/10 text-emerald-300'
                                  : 'bg-amber-500/10 text-amber-300'
                              }`}
                            >
                              {inv.status}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ── PROVISION MODAL ──────────────────────────────────────── */}
        <BaseModal
          open={provisionOpen}
          onClose={() => setProvisionOpen(false)}
          title="Provision New Institution"
          description="Initialize isolated college workspace, generate temporary operator credentials, and prepare BYOS storage."
        >
          {provSuccess ? (
            <div className="space-y-4 font-mono text-xs">
              <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Institution Provisioned Successfully!</span>
                </div>
                <p className="text-zinc-300 text-xs">
                  College <strong>{provSuccess.org?.name}</strong> is live in <code>SETUP_MODE</code>.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-2 text-zinc-200">
                <p className="font-bold text-white">Temporary Setup Operator Credentials:</p>
                <p>Email: <span className="text-teal-300">{provSuccess.setupAdmin?.email}</span></p>
                <p>Status: <span className="text-amber-400">ACTIVE UNTIL GHOST HANDOVER</span></p>
              </div>

              <Button
                size="md"
                className="w-full bg-teal-500 hover:bg-teal-400 text-zinc-950 font-bold"
                onClick={() => setProvisionOpen(false)}
              >
                Close &amp; View Directory
              </Button>
            </div>
          ) : (
            <form onSubmit={handleProvisionSubmit} className="space-y-5 font-mono text-xs">
              {/* 5-Section Tab Selector */}
              <div className="flex items-center gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-xl overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setProvTab('identity')}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap ${
                    provTab === 'identity'
                      ? 'bg-teal-500 text-zinc-950 shadow'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  1. Identity
                </button>
                <button
                  type="button"
                  onClick={() => setProvTab('auth')}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap ${
                    provTab === 'auth'
                      ? 'bg-teal-500 text-zinc-950 shadow'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  2. Auth &amp; Domains
                </button>
                <button
                  type="button"
                  onClick={() => setProvTab('features')}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap ${
                    provTab === 'features'
                      ? 'bg-teal-500 text-zinc-950 shadow'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  3. Features &amp; Exam
                </button>
                <button
                  type="button"
                  onClick={() => setProvTab('billing')}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap ${
                    provTab === 'billing'
                      ? 'bg-teal-500 text-zinc-950 shadow'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  4. Billing &amp; Quota
                </button>
                <button
                  type="button"
                  onClick={() => setProvTab('delegation')}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap ${
                    provTab === 'delegation'
                      ? 'bg-teal-500 text-zinc-950 shadow'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  5. Delegation
                </button>
              </div>

              {/* SECTION 1: IDENTITY & LIFECYCLE */}
              {provTab === 'identity' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-zinc-300 mb-1">Institution Legal Name *</label>
                    <input
                      type="text"
                      required
                      value={provName}
                      onChange={(e) => setProvName(e.target.value)}
                      placeholder="Aravali College of Engineering and Management"
                      className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-zinc-300 mb-1">Organization Type</label>
                      <select
                        value={provType}
                        onChange={(e) => setProvType(e.target.value as OrgType)}
                        className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-teal-500"
                      >
                        <option value="COLLEGE">College</option>
                        <option value="UNIVERSITY">University</option>
                        <option value="COACHING">Coaching Institute</option>
                        <option value="SCHOOL">School</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-zinc-300 mb-1">Institute Code</label>
                      <input
                        type="text"
                        value={provCode}
                        onChange={(e) => setProvCode(e.target.value)}
                        placeholder="ACEM-01"
                        className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-teal-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-zinc-300 mb-1">City &amp; State</label>
                    <input
                      type="text"
                      value={provCityState}
                      onChange={(e) => setProvCityState(e.target.value)}
                      placeholder="Faridabad, Haryana"
                      className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1 border-t border-zinc-800">
                    <div>
                      <label className="block text-zinc-300 mb-1">Setup Operator Email *</label>
                      <input
                        type="email"
                        required
                        value={provEmail}
                        onChange={(e) => setProvEmail(e.target.value)}
                        placeholder="operator@colformly.internal"
                        className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-zinc-300 mb-1">Operator Password</label>
                      <input
                        type="password"
                        value={provPassword}
                        onChange={(e) => setProvPassword(e.target.value)}
                        placeholder="Auto-generated if blank"
                        className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-teal-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 2: AUTH & DOMAIN RULES */}
              {provTab === 'auth' && (
                <div className="space-y-4">
                  <div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-300 text-[11px] leading-relaxed">
                    Student email domains are checked against active organizations to guarantee strict tenant isolation.
                  </div>

                  <div>
                    <label className="block text-zinc-300 mb-1">
                      Student Allowed Domains (comma-separated) *
                    </label>
                    <input
                      type="text"
                      value={provStudentDomains}
                      onChange={(e) => setProvStudentDomains(e.target.value)}
                      placeholder="acem.edu.in, aravali.edu.in"
                      className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-teal-500"
                    />
                    <p className="text-[10px] text-zinc-500 mt-1">Students with these email domains can self-enroll into this campus.</p>
                  </div>

                  <div>
                    <label className="block text-zinc-300 mb-1">Student Authentication Mode</label>
                    <select
                      value={provStudentAuthMode}
                      onChange={(e) => setProvStudentAuthMode(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-teal-500"
                    >
                      <option value="GOOGLE_ONLY">Google SSO Only (Recommended for Campuses)</option>
                      <option value="BOTH">Hybrid (Google SSO + Password)</option>
                      <option value="EMAIL_PASSWORD">Email &amp; Password Only</option>
                    </select>
                  </div>

                  <div className="pt-2 border-t border-zinc-800">
                    <label className="block text-zinc-300 mb-1">
                      Teacher Allowed Domains (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={provTeacherDomains}
                      onChange={(e) => setProvTeacherDomains(e.target.value)}
                      placeholder="acem.edu.in, aravali.edu.in, gmail.com"
                      className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-teal-500"
                    />
                    <p className="text-[10px] text-zinc-500 mt-1">Leave empty or include faculty/personal domains for faculty invites.</p>
                  </div>

                  <div>
                    <label className="block text-zinc-300 mb-1">Teacher Authentication Mode</label>
                    <select
                      value={provTeacherAuthMode}
                      onChange={(e) => setProvTeacherAuthMode(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-teal-500"
                    >
                      <option value="BOTH">Hybrid (Google SSO Invite + Direct Password)</option>
                      <option value="GOOGLE_ONLY">Google SSO Only</option>
                      <option value="EMAIL_PASSWORD">Email &amp; Password Only</option>
                    </select>
                  </div>
                </div>
              )}

              {/* SECTION 3: FEATURES & EXAM DEFAULTS */}
              {provTab === 'features' && (
                <div className="space-y-4">
                  <p className="text-zinc-400 font-bold text-[11px] uppercase tracking-wider">Feature Flags</p>
                  <div className="space-y-2 bg-zinc-900 p-3.5 rounded-xl border border-zinc-800">
                    <label className="flex items-center gap-2 cursor-pointer text-zinc-200">
                      <input
                        type="checkbox"
                        checked={provAiGenerator}
                        onChange={(e) => setProvAiGenerator(e.target.checked)}
                        className="rounded border-zinc-700 text-teal-500 focus:ring-teal-500"
                      />
                      <span>AI Question Generator (Groq &amp; Gemini Pro)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-zinc-200">
                      <input
                        type="checkbox"
                        checked={provByocExplainer}
                        onChange={(e) => setProvByocExplainer(e.target.checked)}
                        className="rounded border-zinc-700 text-teal-500 focus:ring-teal-500"
                      />
                      <span>Student BYOC Mistake Explainer</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-zinc-200">
                      <input
                        type="checkbox"
                        checked={provWrongAnswerExplainer}
                        onChange={(e) => setProvWrongAnswerExplainer(e.target.checked)}
                        className="rounded border-zinc-700 text-teal-500 focus:ring-teal-500"
                      />
                      <span>Wrong Answer Deep-Dive Analysis</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-zinc-200">
                      <input
                        type="checkbox"
                        checked={provCsvImport}
                        onChange={(e) => setProvCsvImport(e.target.checked)}
                        className="rounded border-zinc-700 text-teal-500 focus:ring-teal-500"
                      />
                      <span>Bulk CSV Roster Ingestion</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-zinc-200">
                      <input
                        type="checkbox"
                        checked={provAntiCheat}
                        onChange={(e) => setProvAntiCheat(e.target.checked)}
                        className="rounded border-zinc-700 text-teal-500 focus:ring-teal-500"
                      />
                      <span>Anti-Cheat &amp; Fullscreen Lockdown Guard</span>
                    </label>
                  </div>

                  <p className="text-zinc-400 font-bold text-[11px] uppercase tracking-wider pt-2">Exam Defaults</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-zinc-300 mb-1">Default Duration (mins)</label>
                      <input
                        type="number"
                        min="5"
                        max="360"
                        value={provDefaultDuration}
                        onChange={(e) => setProvDefaultDuration(parseInt(e.target.value, 10) || 45)}
                        className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-zinc-300 mb-1">Result Visibility</label>
                      <select
                        value={provResultVisibility}
                        onChange={(e) => setProvResultVisibility(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-teal-500"
                      >
                        <option value="IMMEDIATE">Immediate on Submission</option>
                        <option value="AFTER_CLOSE">After Exam Window Closes</option>
                        <option value="MANUAL_RELEASE">Manual Teacher Release</option>
                      </select>
                    </div>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer text-zinc-300">
                    <input
                      type="checkbox"
                      checked={provNegativeMarking}
                      onChange={(e) => setProvNegativeMarking(e.target.checked)}
                      className="rounded border-zinc-700 text-teal-500 focus:ring-teal-500"
                    />
                    <span>Allow Negative Marking in Quizzes by default</span>
                  </label>
                </div>
              )}

              {/* SECTION 4: BILLING, QUOTA & CONTRACT */}
              {provTab === 'billing' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-zinc-300 mb-1">Plan Tier</label>
                      <select
                        value={provTier}
                        onChange={(e) => setProvTier(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-teal-500"
                      >
                        <option value="CAMPUS">Campus Tier</option>
                        <option value="ENTERPRISE">Enterprise Tier</option>
                        <option value="FREE">Free Tier</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-zinc-300 mb-1">Billing Cycle</label>
                      <select
                        value={provBillingCycle}
                        onChange={(e) => setProvBillingCycle(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-teal-500"
                      >
                        <option value="MONTHLY">Monthly recurring</option>
                        <option value="ANNUAL">Annual contract</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-zinc-300 mb-1">Monthly Fee (₹)</label>
                      <input
                        type="number"
                        value={provMrr}
                        onChange={(e) => setProvMrr(parseInt(e.target.value, 10) || 0)}
                        className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-zinc-300 mb-1">Student Seat Cap</label>
                      <input
                        type="number"
                        value={provStudentSeatCap}
                        onChange={(e) => setProvStudentSeatCap(parseInt(e.target.value, 10) || 500)}
                        className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-zinc-300 mb-1">Monthly AI Allowance</label>
                      <input
                        type="number"
                        value={provMonthlyAiAllowance}
                        onChange={(e) => setProvMonthlyAiAllowance(parseInt(e.target.value, 10) || 2000)}
                        className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-teal-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 5: DELEGATION CONTROLS */}
              {provTab === 'delegation' && (
                <div className="space-y-4">
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] leading-relaxed">
                    Delegation policy locks define which configurations Campus Org Admins can self-serve vs. which require Super Admin intervention.
                  </div>

                  <div className="space-y-3 bg-zinc-900 p-3.5 rounded-xl border border-zinc-800">
                    <label className="flex items-start gap-2.5 cursor-pointer text-zinc-200">
                      <input
                        type="checkbox"
                        checked={provLockStudentDomains}
                        onChange={(e) => setProvLockStudentDomains(e.target.checked)}
                        className="mt-0.5 rounded border-zinc-700 text-teal-500 focus:ring-teal-500"
                      />
                      <div>
                        <span className="font-bold text-white block">Lock Student Allowed Domains (Strict)</span>
                        <span className="text-[10px] text-zinc-400">Campus administrator cannot modify student domain whitelist without Super Admin approval.</span>
                      </div>
                    </label>

                    <label className="flex items-start gap-2.5 cursor-pointer text-zinc-200">
                      <input
                        type="checkbox"
                        checked={provLockBillingAndLimits}
                        onChange={(e) => setProvLockBillingAndLimits(e.target.checked)}
                        className="mt-0.5 rounded border-zinc-700 text-teal-500 focus:ring-teal-500"
                      />
                      <div>
                        <span className="font-bold text-white block">Lock Billing &amp; Capacity Limits (Strict)</span>
                        <span className="text-[10px] text-zinc-400">Prevents campus admin from tampering with monthly MRR, student seat caps, or AI allowances.</span>
                      </div>
                    </label>

                    <label className="flex items-start gap-2.5 cursor-pointer text-zinc-200">
                      <input
                        type="checkbox"
                        checked={provAllowOrgEditTeacherDomains}
                        onChange={(e) => setProvAllowOrgEditTeacherDomains(e.target.checked)}
                        className="mt-0.5 rounded border-zinc-700 text-teal-500 focus:ring-teal-500"
                      />
                      <div>
                        <span className="font-bold text-white block">Allow Org Admin to Manage Teacher Domains</span>
                        <span className="text-[10px] text-zinc-400">Permits campus admin to add faculty email domains for teacher onboarding.</span>
                      </div>
                    </label>

                    <label className="flex items-start gap-2.5 cursor-pointer text-zinc-200">
                      <input
                        type="checkbox"
                        checked={provAllowOrgEditFeatures}
                        onChange={(e) => setProvAllowOrgEditFeatures(e.target.checked)}
                        className="mt-0.5 rounded border-zinc-700 text-teal-500 focus:ring-teal-500"
                      />
                      <div>
                        <span className="font-bold text-white block">Allow Org Admin to Toggle Feature Flags</span>
                        <span className="text-[10px] text-zinc-400">Allows turning AI questions or anti-cheat on or off for their campus.</span>
                      </div>
                    </label>

                    <label className="flex items-start gap-2.5 cursor-pointer text-zinc-200">
                      <input
                        type="checkbox"
                        checked={provAllowOrgEditExamDefaults}
                        onChange={(e) => setProvAllowOrgEditExamDefaults(e.target.checked)}
                        className="mt-0.5 rounded border-zinc-700 text-teal-500 focus:ring-teal-500"
                      />
                      <div>
                        <span className="font-bold text-white block">Allow Org Admin to Modify Exam Defaults</span>
                        <span className="text-[10px] text-zinc-400">Allows campus administrators to adjust default exam durations and visibility rules.</span>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* Modal Navigation Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    if (provTab === 'delegation') setProvTab('billing');
                    else if (provTab === 'billing') setProvTab('features');
                    else if (provTab === 'features') setProvTab('auth');
                    else if (provTab === 'auth') setProvTab('identity');
                    else setProvisionOpen(false);
                  }}
                  className="text-zinc-400 hover:text-white"
                >
                  {provTab === 'identity' ? 'Cancel' : 'Previous Step'}
                </Button>

                {provTab !== 'delegation' ? (
                  <Button
                    type="button"
                    onClick={() => {
                      if (provTab === 'identity') setProvTab('auth');
                      else if (provTab === 'auth') setProvTab('features');
                      else if (provTab === 'features') setProvTab('billing');
                      else if (provTab === 'billing') setProvTab('delegation');
                    }}
                    className="bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-bold"
                  >
                    Next Step &rarr;
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    size="md"
                    isLoading={provLoading}
                    className="bg-teal-500 hover:bg-teal-400 text-zinc-950 font-bold"
                  >
                    Provision Institution &amp; Operator
                  </Button>
                )}
              </div>
            </form>
          )}
        </BaseModal>

        {/* ── EXECUTE CONTRACT MODAL ──────────────────────────────── */}
        <BaseModal
          open={contractModalOpen}
          onClose={() => setContractModalOpen(false)}
          title="Execute Legal Service Contract"
          description="Generates an enforceable agreement with client-side SHA-256 seal and verified SVG signature."
        >
          <form onSubmit={handleCreateContract} className="space-y-4 font-mono text-xs">
            <div>
              <label className="block text-zinc-300 mb-1">Legal Entity Name *</label>
              <input
                type="text"
                required
                value={contractLegalName}
                onChange={(e) => setContractLegalName(e.target.value)}
                placeholder="Aravali Education Society"
                className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-zinc-300 mb-1">Registered Campus Address</label>
              <input
                type="text"
                value={contractAddress}
                onChange={(e) => setContractAddress(e.target.value)}
                placeholder="Jasana, Faridabad, Haryana 121004"
                className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-teal-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-zinc-300 mb-1">GSTIN (Optional)</label>
                <input
                  type="text"
                  value={contractGstin}
                  onChange={(e) => setContractGstin(e.target.value)}
                  placeholder="06AAAAA0000A1Z5"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-zinc-300 mb-1">Monthly Fee (₹)</label>
                <input
                  type="number"
                  value={contractFee}
                  onChange={(e) => setContractFee(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-zinc-300 mb-1">Signatory Name *</label>
                <input
                  type="text"
                  required
                  value={contractSignerName}
                  onChange={(e) => setContractSignerName(e.target.value)}
                  placeholder="Prof. S. Verma"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-zinc-300 mb-1">Designation</label>
                <input
                  type="text"
                  value={contractSignerDesig}
                  onChange={(e) => setContractSignerDesig(e.target.value)}
                  placeholder="Director / Principal"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-zinc-300 mb-1">Signatory Email *</label>
                <input
                  type="email"
                  required
                  value={contractSignerEmail}
                  onChange={(e) => setContractSignerEmail(e.target.value)}
                  placeholder="director@aravali.edu.in"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>

            <Button
              type="submit"
              size="md"
              className="w-full bg-teal-500 hover:bg-teal-400 text-zinc-950 font-bold"
            >
              Sign &amp; Seal Agreement
            </Button>
          </form>
        </BaseModal>

        {/* ── CREATE INVOICE MODAL ────────────────────────────────── */}
        <BaseModal
          open={invoiceModalOpen}
          onClose={() => setInvoiceModalOpen(false)}
          title="Issue Tax Invoice"
          description="Generate a GST-compliant tax invoice for this institution's billing month."
        >
          <form onSubmit={handleCreateInvoice} className="space-y-4 font-mono text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-zinc-300 mb-1">Billing Month</label>
                <input
                  type="month"
                  value={invMonth}
                  onChange={(e) => setInvMonth(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-zinc-300 mb-1">Status</label>
                <select
                  value={invStatus}
                  onChange={(e) => setInvStatus(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-teal-500"
                >
                  <option value="PAID">PAID</option>
                  <option value="DUE">DUE</option>
                  <option value="OVERDUE">OVERDUE</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-zinc-300 mb-1">Plan Name</label>
              <input
                type="text"
                value={invPlan}
                onChange={(e) => setInvPlan(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-zinc-300 mb-1">Subtotal (₹ Excl. 18% GST)</label>
              <input
                type="number"
                value={invSubtotal}
                onChange={(e) => setInvSubtotal(parseInt(e.target.value, 10) || 0)}
                className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-teal-500"
              />
            </div>

            <div className="p-3 rounded-xl bg-zinc-900 text-zinc-400 space-y-1">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>₹{invSubtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>18% GST:</span>
                <span>₹{(invSubtotal * 0.18).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-white border-t border-zinc-800 pt-1">
                <span>Total Invoice:</span>
                <span className="text-teal-400">₹{(invSubtotal * 1.18).toFixed(2)}</span>
              </div>
            </div>

            <Button
              type="submit"
              size="md"
              className="w-full bg-teal-500 hover:bg-teal-400 text-zinc-950 font-bold"
            >
              Issue Invoice
            </Button>
          </form>
        </BaseModal>
      </div>
    </SuperAdminShell>
  );
}
