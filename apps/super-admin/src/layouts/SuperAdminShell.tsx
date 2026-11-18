import { useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Activity,
  Building2,
  KeyRound,
  LogOut,
  ShieldCheck,
  Terminal,
} from 'lucide-react';
import { useAuth } from '@colformly/auth';
import { BaseModal, Button, FloatingNav, type NavItem } from '@colformly/ui';

interface SuperAdminShellProps {
  children: ReactNode;
}

export function SuperAdminShell({ children }: SuperAdminShellProps) {
  const location = useLocation();
  const { user, role, signInWithPassword, signOut } = useAuth();
  const [loginOpen, setLoginOpen] = useState(false);
  const [email, setEmail] = useState('core@edgecors.com');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const items: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Command Center',
      href: '/dashboard',
      icon: <Activity className="w-4 h-4" />,
      active: location.pathname === '/dashboard',
    },
    {
      id: 'clients',
      label: 'College Clients',
      href: '/clients',
      icon: <Building2 className="w-4 h-4" />,
      badge: 34,
      active: location.pathname === '/clients',
    },
    {
      id: 'logs',
      label: 'System Logs',
      href: '/system-logs',
      icon: <Terminal className="w-4 h-4" />,
      badge: 'LIVE',
      active: location.pathname === '/system-logs',
    },
  ];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setAuthError(null);
    const { error } = await signInWithPassword(email, password);
    setSubmitting(false);
    if (error) {
      setAuthError(error);
      return;
    }
    setPassword('');
    setLoginOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#09090B] text-zinc-100 terminal-grid flex flex-col md:flex-row">
      <FloatingNav
        variant="sidebar"
        className="border-zinc-800/90 bg-zinc-950/90"
        brand={
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/15 border border-teal-500/40 text-teal-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-headline font-bold text-sm text-white truncate">
                  Super Admin
                </span>
                <span className="px-1.5 py-0.5 rounded bg-teal-500/20 border border-teal-500/40 font-mono text-[9px] font-bold text-teal-300 uppercase">
                  ROOT
                </span>
              </div>
              <p className="font-mono text-[11px] text-zinc-400 truncate">Colformly Core v2.4</p>
            </div>
          </div>
        }
        items={items}
        renderLink={(item, className, content) => (
          <Link to={item.href || '/dashboard'} className={className}>
            {content}
          </Link>
        )}
        footer={
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-mono text-zinc-300">ap-south-1</span>
              </div>
              <span className="font-mono font-bold text-teal-400">99.98%</span>
            </div>

            {user ? (
              <div className="flex items-center justify-between gap-2 px-1">
                <div className="min-w-0">
                  <p className="font-mono text-xs font-bold text-zinc-100 truncate">{user.email}</p>
                  <p className="font-mono text-[10px] text-teal-400 uppercase">{role || 'SUPER_ADMIN'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void signOut()}
                  title="Sign Out"
                  className="p-2 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="w-full border-zinc-700 text-zinc-200 hover:bg-zinc-800"
                leftIcon={<KeyRound className="w-3.5 h-3.5 text-teal-400" />}
                onClick={() => setLoginOpen(true)}
              >
                Root Auth Sign In
              </Button>
            )}
          </div>
        }
      />

      <main className="flex-1 min-w-0 md:ml-[280px] p-4 sm:p-6 md:p-8 pb-24 md:pb-10">
        <div className="max-w-6xl mx-auto">{children}</div>
      </main>

      <BaseModal
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        title="Super Admin Authentication"
        description="Authenticate with Supabase Auth (core@edgecors.com) for live multi-tenant DB writes."
      >
        <form onSubmit={handleLogin} className="space-y-4">
          {authError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono">
              {authError}
            </div>
          )}
          <div>
            <label className="block font-mono text-xs text-zinc-400 mb-1.5">Root Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 font-mono text-sm text-zinc-100 focus:outline-none focus:border-teal-500"
            />
          </div>
          <div>
            <label className="block font-mono text-xs text-zinc-400 mb-1.5">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 font-mono text-sm text-zinc-100 focus:outline-none focus:border-teal-500"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setLoginOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={submitting}>
              Authenticate Root
            </Button>
          </div>
        </form>
      </BaseModal>
    </div>
  );
}
