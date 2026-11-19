import { useState, useEffect, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  ExternalLink,
  KeyRound,
  Lock,
  LogOut,
  Mail,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Terminal,
} from 'lucide-react';
import { useAuth, supabase } from '@colformly/auth';
import { Button, FloatingNav, type NavItem } from '@colformly/ui';

interface SuperAdminShellProps {
  children: ReactNode;
}

export function SuperAdminShell({ children }: SuperAdminShellProps) {
  const location = useLocation();
  const {
    user,
    role,
    isLoading,
    isInitialized,
    signInWithPassword,
    signInWithGoogle,
    resetPasswordForEmail,
    updatePassword,
    refreshProfile,
    signOut,
  } = useAuth();

  const [authView, setAuthView] = useState<'login' | 'forgot' | 'reset'>('login');
  const [authMode, setAuthMode] = useState<'password' | 'google'>('password');
  const [email, setEmail] = useState('core@edgecors.com');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Check for password recovery params in search or hash
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const isRecovery =
      searchParams.get('type') === 'recovery' ||
      hashParams.get('type') === 'recovery' ||
      searchParams.get('reset') === 'true';

    if (isRecovery) {
      setAuthView('reset');
    }
  }, [location.search]);

  // Listen for Supabase password recovery event
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setAuthView('reset');
      }
    });
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // 1. Loading State
  if (isLoading || !isInitialized) {
    return (
      <div className="min-h-screen bg-[#09090B] text-zinc-100 flex items-center justify-center font-mono">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-teal-400 animate-spin" />
          <span className="text-xs text-zinc-400 tracking-wider">
            INITIALIZING ROOT SECURE ENCLAVE...
          </span>
        </div>
      </div>
    );
  }

  // 2. Recovery Mode (Render Set New Master Password even if session is in recovery state)
  if (authView === 'reset') {
    const handleUpdateMasterPassword = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newPassword || !confirmPassword) {
        setAuthError('Please provide and confirm your new master key.');
        return;
      }

      if (newPassword !== confirmPassword) {
        setAuthError('Keys do not match. Please verify both fields.');
        return;
      }

      if (newPassword.length < 6) {
        setAuthError('Key must be at least 6 characters long.');
        return;
      }

      setAuthError(null);
      setAuthSuccess(null);
      setSubmitting(true);
      try {
        const { error } = await updatePassword(newPassword);
        if (error) throw new Error(error);

        setAuthSuccess('Master key updated successfully! Entering root enclave...');
        setTimeout(async () => {
          await refreshProfile();
          setAuthView('login');
        }, 1200);
      } catch (err: any) {
        console.error('Update master password error:', err);
        setAuthError(err.message || 'Failed to update master password. Recovery link may have expired.');
      } finally {
        setSubmitting(false);
      }
    };

    return (
      <div className="min-h-screen bg-[#09090B] text-zinc-100 flex items-center justify-center p-4 sm:p-6 terminal-grid">
        <div className="w-full max-w-md rounded-2xl bg-zinc-950/95 border border-zinc-800/90 shadow-2xl p-7 sm:p-8 space-y-6 backdrop-blur-xl">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-teal-400 flex items-center justify-center mx-auto shadow-inner">
              <KeyRound className="w-7 h-7" />
            </div>
            <div className="flex items-center justify-center gap-2">
              <h1 className="font-headline font-bold text-xl text-white tracking-tight">
                Set New Master Key
              </h1>
              <span className="px-1.5 py-0.5 rounded bg-teal-500/20 border border-teal-500/40 font-mono text-[9px] font-bold text-teal-300 uppercase">
                RECOVERY
              </span>
            </div>
            <p className="font-mono text-xs text-zinc-400">
              Update root operator access credentials for Colformly infrastructure.
            </p>
          </div>

          {authError && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span>{authError}</span>
            </div>
          )}

          {authSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
              <span>{authSuccess}</span>
            </div>
          )}

          <form onSubmit={handleUpdateMasterPassword} className="space-y-4">
            <div>
              <label className="block font-mono text-xs text-zinc-400 mb-1.5">
                New Master Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 font-mono text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>

            <div>
              <label className="block font-mono text-xs text-zinc-400 mb-1.5">
                Confirm Master Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-type master password"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 font-mono text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>

            <Button
              type="submit"
              size="md"
              isLoading={submitting}
              className="w-full bg-teal-500 hover:bg-teal-400 text-zinc-950 font-mono font-bold text-xs"
              leftIcon={<KeyRound className="w-3.5 h-3.5" />}
            >
              Update Master Credentials
            </Button>

            <button
              type="button"
              onClick={() => {
                setAuthView('login');
                setAuthError(null);
                setAuthSuccess(null);
              }}
              className="w-full inline-flex items-center justify-center gap-1.5 font-mono text-xs text-zinc-400 hover:text-zinc-200 transition-colors py-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Login</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 3. Access Denied State (Authenticated as student/teacher/org admin instead of super admin)
  if (user && role !== 'SUPER_ADMIN') {
    const orgPortalUrl =
      import.meta.env.VITE_ORG_PORTAL_URL || 'https://colformly-org.pages.dev';

    return (
      <div className="min-h-screen bg-[#09090B] text-zinc-100 flex items-center justify-center p-4 terminal-grid">
        <div className="w-full max-w-md rounded-2xl bg-zinc-950 border border-rose-900/40 p-8 shadow-2xl text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-500 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div>
            <span className="px-2.5 py-1 rounded-md bg-rose-500/10 border border-rose-500/30 text-[11px] font-mono font-bold text-rose-400 uppercase tracking-wider">
              HTTP 403 · ACCESS DENIED
            </span>
            <h1 className="font-headline font-bold text-xl text-white mt-3">
              Root Privilege Required
            </h1>
            <p className="text-xs text-zinc-400 mt-2 font-mono leading-relaxed">
              Authenticated as <span className="text-zinc-200">{user.email}</span> (Role: {role || 'STUDENT'}).
              This domain is strictly restricted to Colformly Infrastructure Operators.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <a
              href={`${orgPortalUrl}/login`}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono font-semibold transition-colors"
            >
              <span>Go to College Portal</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <Button
              variant="outline"
              size="sm"
              className="w-full border-rose-900/50 text-rose-300 hover:bg-rose-950/40"
              leftIcon={<LogOut className="w-3.5 h-3.5" />}
              onClick={() => void signOut()}
            >
              Sign Out of Session
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 4. Unauthenticated State (Hard Auth Wall Gate)
  if (!user) {
    const handlePasswordSignIn = async (e: React.FormEvent) => {
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
    };

    const handleGoogleSignIn = async () => {
      setSubmitting(true);
      setAuthError(null);
      const { error } = await signInWithGoogle(window.location.href);
      if (error) {
        setAuthError(error);
        setSubmitting(false);
      }
    };

    const handleForgotMasterPassword = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!email.trim()) {
        setAuthError('Please enter root operator email.');
        return;
      }

      setAuthError(null);
      setAuthSuccess(null);
      setSubmitting(true);
      try {
        const redirectUrl = `${window.location.origin}/?reset=true`;
        const { error } = await resetPasswordForEmail(email.trim().toLowerCase(), redirectUrl);
        if (error) throw new Error(error);

        setAuthSuccess(
          `Master recovery link dispatched to ${email.trim()}. Follow the instructions in the email to set a new key.`
        );
      } catch (err: any) {
        console.error('Password reset request error:', err);
        setAuthError(err.message || 'Failed to dispatch reset email. Please try again.');
      } finally {
        setSubmitting(false);
      }
    };

    return (
      <div className="min-h-screen bg-[#09090B] text-zinc-100 flex items-center justify-center p-4 sm:p-6 terminal-grid">
        <div className="w-full max-w-md rounded-2xl bg-zinc-950/95 border border-zinc-800/90 shadow-2xl p-7 sm:p-8 space-y-6 backdrop-blur-xl">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-teal-400 flex items-center justify-center mx-auto shadow-inner">
              {authView === 'forgot' ? (
                <Mail className="w-7 h-7" />
              ) : (
                <ShieldCheck className="w-7 h-7" />
              )}
            </div>
            <div className="flex items-center justify-center gap-2">
              <h1 className="font-headline font-bold text-xl text-white tracking-tight">
                {authView === 'forgot' ? 'Reset Master Key' : 'Super Admin Console'}
              </h1>
              <span className="px-1.5 py-0.5 rounded bg-teal-500/20 border border-teal-500/40 font-mono text-[9px] font-bold text-teal-300 uppercase">
                ROOT
              </span>
            </div>
            <p className="font-mono text-xs text-zinc-400">
              {authView === 'forgot'
                ? 'Dispatch an emergency recovery link to the root administrator email.'
                : 'Stealth infrastructure enclave. Authenticate with verified root operator credentials.'}
            </p>
          </div>

          {authError && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span>{authError}</span>
            </div>
          )}

          {authSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
              <span>{authSuccess}</span>
            </div>
          )}

          {authView === 'forgot' ? (
            <form onSubmit={handleForgotMasterPassword} className="space-y-4">
              <div>
                <label className="block font-mono text-xs text-zinc-400 mb-1.5">
                  Root Operator Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="core@edgecors.com"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 font-mono text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <Button
                type="submit"
                size="md"
                isLoading={submitting}
                className="w-full bg-teal-500 hover:bg-teal-400 text-zinc-950 font-mono font-bold text-xs"
                leftIcon={<Mail className="w-3.5 h-3.5" />}
              >
                Send Master Key Reset Link
              </Button>

              <button
                type="button"
                onClick={() => {
                  setAuthView('login');
                  setAuthError(null);
                  setAuthSuccess(null);
                }}
                className="w-full inline-flex items-center justify-center gap-1.5 font-mono text-xs text-zinc-400 hover:text-zinc-200 transition-colors py-2"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Login</span>
              </button>
            </form>
          ) : (
            <>
              {/* Mode Switcher */}
              <div className="grid grid-cols-2 p-1 rounded-xl bg-zinc-900 border border-zinc-800 font-mono text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('password');
                    setAuthError(null);
                  }}
                  className={`py-2 rounded-lg font-bold transition-all ${
                    authMode === 'password'
                      ? 'bg-zinc-800 text-teal-300 shadow'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Email &amp; Key
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('google');
                    setAuthError(null);
                  }}
                  className={`py-2 rounded-lg font-bold transition-all ${
                    authMode === 'google'
                      ? 'bg-zinc-800 text-teal-300 shadow'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Google SSO
                </button>
              </div>

              {authMode === 'google' ? (
                <div className="space-y-4">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleGoogleSignIn}
                    className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-zinc-100 font-mono text-xs font-bold transition-all active:scale-[0.99] disabled:opacity-50"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        fill="#4285F4"
                        d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.3h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.87c2.26-2.08 3.56-5.15 3.56-8.65Z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.24 0 5.95-1.07 7.93-2.91l-3.87-3a7.17 7.17 0 0 1-10.67-3.77H1.4v3.09A12 12 0 0 0 12 24Z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.39 14.32a7.2 7.2 0 0 1 0-4.64V6.59H1.4a12 12 0 0 0 0 10.82l3.99-3.09Z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.76 0 3.34.61 4.58 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.69 1.4 6.59l3.99 3.09A7.15 7.15 0 0 1 12 4.75Z"
                      />
                    </svg>
                    <span>{submitting ? 'Redirecting to OAuth...' : 'Sign In with Operator Google'}</span>
                  </button>

                  <p className="text-center font-mono text-[11px] text-zinc-500">
                    Authorizes via Google OAuth for core@edgecors.com root administrator profile.
                  </p>
                </div>
              ) : (
                <form onSubmit={handlePasswordSignIn} className="space-y-4">
                  <div>
                    <label className="block font-mono text-xs text-zinc-400 mb-1.5">
                      Root Operator Email
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="core@edgecors.com"
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 font-mono text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-teal-500"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block font-mono text-xs text-zinc-400">
                        Master Password
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setAuthView('forgot');
                          setAuthError(null);
                          setAuthSuccess(null);
                        }}
                        className="text-[11px] font-mono text-teal-400 hover:text-teal-300 transition-colors"
                      >
                        Forgot master key?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 font-mono text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-teal-500"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    size="md"
                    isLoading={submitting}
                    className="w-full bg-teal-500 hover:bg-teal-400 text-zinc-950 font-mono font-bold text-xs"
                    leftIcon={<KeyRound className="w-3.5 h-3.5" />}
                  >
                    Authenticate Root Console
                  </Button>
                </form>
              )}
            </>
          )}

          <div className="pt-4 border-t border-zinc-900 flex items-center justify-between text-[11px] font-mono text-zinc-500">
            <span>Isolation: Strict RLS</span>
            <span className="text-teal-400">TLS 1.3 / PKCE</span>
          </div>
        </div>
      </div>
    );
  }

  // 5. Authenticated Root Operator View
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

            <div className="flex items-center justify-between gap-2 px-1">
              <div className="min-w-0">
                <p className="font-mono text-xs font-bold text-zinc-100 truncate">{user.email}</p>
                <p className="font-mono text-[10px] text-teal-400 uppercase">ROOT OPERATOR</p>
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
          </div>
        }
      />

      <main className="flex-1 min-w-0 md:ml-[280px] p-4 sm:p-6 md:p-8 pb-24 md:pb-10">
        <div className="max-w-6xl mx-auto">{children}</div>
      </main>
    </div>
  );
}