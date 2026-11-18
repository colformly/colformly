import { useEffect, useState } from 'react';
import { Ban, CheckCircle2, Plus, Search } from 'lucide-react';
import type { OrgTier, Tables } from '@colformly/types';
import { supabase, useAuth } from '@colformly/auth';
import { BaseModal, Button } from '@colformly/ui';
import { SuperAdminShell } from '../layouts/SuperAdminShell';

type OrgDbRow = Tables<'organizations'>;

// Typed helper for @supabase/ssr + postgrest-js generic compatibility
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const orgsTable = () => supabase.from('organizations') as any;

interface ClientRow {
  id: string;
  name: string;
  slug: string;
  tier: OrgTier;
  students: number;
  mrr: number;
  isActive: boolean;
  region: string;
}

const INITIAL_CLIENTS: ClientRow[] = [
  { id: 'c1', name: 'Aravali College of Engineering', slug: 'aravali-eng', tier: 'CAMPUS', students: 1854, mrr: 1499, isActive: true, region: 'ap-south-1' },
  { id: 'c2', name: 'MIT-WPU Pune', slug: 'mit-wpu', tier: 'ENTERPRISE', students: 8420, mrr: 4900, isActive: true, region: 'ap-south-1' },
  { id: 'c3', name: 'JECRC University', slug: 'jecrc-univ', tier: 'CAMPUS', students: 3210, mrr: 1499, isActive: true, region: 'ap-south-1' },
  { id: 'c4', name: 'LNMIIT Jaipur', slug: 'lnmiit', tier: 'ENTERPRISE', students: 2940, mrr: 3500, isActive: true, region: 'ap-south-1' },
  { id: 'c5', name: 'Apex Polytechnic Pilot', slug: 'apex-poly', tier: 'FREE', students: 240, mrr: 0, isActive: false, region: 'ap-south-1' },
];

export default function Clients() {
  const { user, role } = useAuth();
  const [clients, setClients] = useState<ClientRow[]>(INITIAL_CLIENTS);
  const [query, setQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [newTier, setNewTier] = useState<OrgTier>('CAMPUS');

  // If authenticated as SUPER_ADMIN, merge any real rows from Supabase public.organizations
  useEffect(() => {
    if (!user || role !== 'SUPER_ADMIN') return;
    void (async () => {
      const { data } = (await orgsTable()
        .select('*')
        .order('created_at', { ascending: false })) as { data: OrgDbRow[] | null };
      if (data && data.length > 0) {
        const mapped: ClientRow[] = data.map((org) => ({
          id: org.id,
          name: org.name,
          slug: org.slug,
          tier: org.tier,
          students: 0,
          mrr: Math.round(org.mrr_cents / 100),
          isActive: org.is_active,
          region: 'ap-south-1',
        }));
        setClients((prev) => {
          const existingSlugs = new Set(mapped.map((m) => m.slug));
          return [...mapped, ...prev.filter((p) => !existingSlugs.has(p.slug))];
        });
      }
    })();
  }, [user, role]);

  const toggleStatus = async (client: ClientRow) => {
    const nextActive = !client.isActive;
    setClients((prev) =>
      prev.map((c) => (c.id === client.id ? { ...c, isActive: nextActive } : c)),
    );
    if (user && role === 'SUPER_ADMIN' && client.id.length > 10) {
      await orgsTable().update({ is_active: nextActive }).eq('id', client.id);
    }
  };

  const changeTier = async (client: ClientRow, tier: OrgTier) => {
    const mrr = tier === 'ENTERPRISE' ? 3500 : tier === 'CAMPUS' ? 1499 : 0;
    setClients((prev) =>
      prev.map((c) => (c.id === client.id ? { ...c, tier, mrr } : c)),
    );
    if (user && role === 'SUPER_ADMIN' && client.id.length > 10) {
      await orgsTable()
        .update({ tier, mrr_cents: mrr * 100 })
        .eq('id', client.id);
    }
  };

  const onboardCollege = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const slug = (newSlug.trim() || newName.toLowerCase().replace(/[^a-z0-9]+/g, '-')).replace(
      /^-|-$/g,
      '',
    );
    const mrr = newTier === 'ENTERPRISE' ? 3500 : newTier === 'CAMPUS' ? 1499 : 0;

    let insertedId = `local-${Date.now()}`;
    if (user && role === 'SUPER_ADMIN') {
      const { data } = (await orgsTable()
        .insert({ name: newName.trim(), slug, tier: newTier, mrr_cents: mrr * 100, is_active: true })
        .select('id')
        .single()) as { data: { id: string } | null };
      if (data?.id) insertedId = data.id;
    }

    setClients((prev) => [
      { id: insertedId, name: newName.trim(), slug, tier: newTier, students: 0, mrr, isActive: true, region: 'ap-south-1' },
      ...prev,
    ]);
    setNewName('');
    setNewSlug('');
    setModalOpen(false);
  };

  const filtered = clients.filter(
    (c) =>
      !query.trim() ||
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      c.slug.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <SuperAdminShell>
      <div className="space-y-7">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="font-mono text-xs text-teal-400 uppercase tracking-wider font-bold mb-1">
              Multi-Tenant Governance
            </p>
            <h1 className="font-headline font-extrabold text-2xl sm:text-3xl text-white">
              Onboarded Colleges &amp; License Tiers
            </h1>
          </div>

          <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setModalOpen(true)}>
            Provision College Tenant
          </Button>
        </header>

        {/* Table Card */}
        <section className="rounded-2xl bg-zinc-900/80 border border-zinc-800/90 overflow-hidden">
          <div className="p-5 border-b border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter by college or tenant slug..."
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-teal-500"
              />
            </div>
            <span className="font-mono text-xs text-zinc-400">
              {clients.filter((c) => c.isActive).length} active / {clients.length} total tenants
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-zinc-950/90 border-b border-zinc-800 font-mono text-[11px] uppercase tracking-wider text-zinc-400">
                  <th className="py-3.5 px-5">College Tenant</th>
                  <th className="py-3.5 px-5">License Tier</th>
                  <th className="py-3.5 px-5">Students</th>
                  <th className="py-3.5 px-5">MRR</th>
                  <th className="py-3.5 px-5">Status</th>
                  <th className="py-3.5 px-5 text-right">Governance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80">
                {filtered.map((client) => (
                  <tr key={client.id} className="hover:bg-zinc-800/40 transition-colors">
                    <td className="py-4 px-5">
                      <p className="font-headline font-bold text-zinc-100">{client.name}</p>
                      <p className="font-mono text-xs text-zinc-500">
                        slug: <span className="text-teal-400">{client.slug}</span> • {client.region}
                      </p>
                    </td>
                    <td className="py-4 px-5">
                      <select
                        value={client.tier}
                        onChange={(e) => void changeTier(client, e.target.value as OrgTier)}
                        className="px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-700 font-mono text-xs font-bold text-teal-300 focus:outline-none focus:border-teal-400"
                      >
                        <option value="FREE">FREE</option>
                        <option value="CAMPUS">CAMPUS</option>
                        <option value="ENTERPRISE">ENTERPRISE</option>
                      </select>
                    </td>
                    <td className="py-4 px-5 font-mono text-xs text-zinc-300">
                      {client.students.toLocaleString()}
                    </td>
                    <td className="py-4 px-5 font-mono text-xs font-bold text-emerald-300">
                      ${client.mrr.toLocaleString()}/mo
                    </td>
                    <td className="py-4 px-5">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-mono text-[11px] font-bold border ${
                          client.isActive
                            ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                            : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            client.isActive ? 'bg-emerald-400' : 'bg-rose-400'
                          }`}
                        />
                        {client.isActive ? 'ACTIVE' : 'SUSPENDED'}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-right">
                      <button
                        type="button"
                        onClick={() => void toggleStatus(client)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-xs font-bold border transition-colors ${
                          client.isActive
                            ? 'border-rose-500/40 text-rose-300 hover:bg-rose-500/15'
                            : 'border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/15'
                        }`}
                      >
                        {client.isActive ? (
                          <>
                            <Ban className="w-3.5 h-3.5" /> Suspend
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" /> Reactivate
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <BaseModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Provision New College Tenant"
          description="Creates an isolated organization row in Supabase with default structural theme config."
        >
          <form onSubmit={onboardCollege} className="space-y-4">
            <div>
              <label className="block font-mono text-xs text-zinc-400 mb-1.5">College Name</label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="IIT Jodhpur Extension Campus"
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 focus:outline-none focus:border-teal-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-mono text-xs text-zinc-400 mb-1.5">Tenant Slug</label>
                <input
                  type="text"
                  value={newSlug}
                  onChange={(e) => setNewSlug(e.target.value)}
                  placeholder="iitj-ext"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 font-mono text-sm text-zinc-100 focus:outline-none focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block font-mono text-xs text-zinc-400 mb-1.5">Tier</label>
                <select
                  value={newTier}
                  onChange={(e) => setNewTier(e.target.value as OrgTier)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 font-mono text-sm text-zinc-100 focus:outline-none focus:border-teal-500"
                >
                  <option value="FREE">FREE</option>
                  <option value="CAMPUS">CAMPUS</option>
                  <option value="ENTERPRISE">ENTERPRISE</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Create Tenant</Button>
            </div>
          </form>
        </BaseModal>
      </div>
    </SuperAdminShell>
  );
}
