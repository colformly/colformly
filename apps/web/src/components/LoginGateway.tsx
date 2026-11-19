import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  KeyRound,
  Lock,
  Mail,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { supabase } from '@colformly/auth';

export default function LoginGateway() {
  const [view, setView] = useState<'login' | 'forgot' | 'reset'>('login');
  const [mode, setMode] = useState<'google' | 'password'>('google');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [authedUser, setAuthedUser] = useState<{ email: string; role: string } | null>(null);

  const resolveWorkspaceUrl = () => {
    return import.meta.env.VITE_ORG_PORTAL_URL || 'https://colformly-org.pages.dev';
  };

  const syncUserSession = async (userEmail: string, explicitRole?: string) => {
    let resolvedRole = explicitRole;
    if (!resolvedRole || resolvedRole === 'authenticated') {
      try {
        const { data: profile } = await supabase
          .from('users')
          .select('global_role')
          .eq('email', userEmail)
          .maybeSingle();

        if (profile?.global_role) {
          resolvedRole = profile.global_role;
        } else {
          resolvedRole = 'STUDENT';
        }
      } catch {
        resolvedRole = 'STUDENT';
      }
    }

    // Auto-join college organization if domain matches allowed_domains
    try {
      await supabase.rpc('auto_join_org_by_domain', { p_email: userEmail });
    } catch (rpcErr) {
      console.warn('Auto join by domain check:', rpcErr);
    }

    setAuthedUser({
      email: userEmail,
      role: resolvedRole,
    });
    setLoading(false);
    setCheckingSession(false);
  };

  // Check URL params for recovery mode
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const searchParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const isRecovery =
      searchParams.get('type') === 'recovery' ||
      hashParams.get('type') === 'recovery' ||
      searchParams.get('reset') === 'true';

    if (isRecovery) {
      setView('reset');
      setCheckingSession(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    // 1. Initial session check on mount (skip if resetting password)
    const checkInitialSession = async () => {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
        if (
          searchParams.get('type') === 'recovery' ||
          hashParams.get('type') === 'recovery' ||
          searchParams.get('reset') === 'true'
        ) {
          if (isMounted) setCheckingSession(false);
          return;
        }

        const {
          data: { session },
          error: sessionErr,
        } = await supabase.auth.getSession();
        if (sessionErr) {
          console.warn('Session retrieval error:', sessionErr);
        }
        if (session?.user && isMounted) {
          const role =
            (session.user.app_metadata?.role as string) ||
            (session.user.user_metadata?.role as string);
          await syncUserSession(session.user.email || '', role);
        } else if (isMounted) {
          setCheckingSession(false);
        }
      } catch {
        if (isMounted) setCheckingSession(false);
      }
    };

    void checkInitialSession();

    // 2. Subscribe to Supabase Auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        if (isMounted) {
          setView('reset');
          setCheckingSession(false);
        }
        return;
      }

      if (session?.user && isMounted && view !== 'reset') {
        const role =
          (session.user.app_metadata?.role as string) ||
          (session.user.user_metadata?.role as string);
        await syncUserSession(session.user.email || '', role);
      } else if (event === 'SIGNED_OUT' && isMounted) {
        setAuthedUser(null);
        setCheckingSession(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [view]);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    const { error: authErr } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/login`,
      },
    });
    if (authErr) {
      setError(authErr.message);
      setLoading(false);
    }
  };

  const handlePasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    const { data, error: authErr } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (authErr) {
      setError(authErr.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      const role =
        (data.user.app_metadata?.role as string) ||
        (data.user.user_metadata?.role as string) ||
        'STUDENT';
      await syncUserSession(data.user.email || email, role);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please provide your registered work or campus email address.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const redirectUrl = `${window.location.origin}/login?reset=true`;
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: redirectUrl,
      });

      if (resetErr) throw resetErr;

      setSuccessMsg(
        `Password reset link dispatched to ${email.trim()}. Please check your email inbox and spam folder.`
      );
    } catch (err: any) {
      console.error('Password reset request error:', err);
      setError(err.message || 'Failed to dispatch reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      setError('Please enter and confirm your new password.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please verify both fields.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const { error: updateErr } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateErr) throw updateErr;

      setSuccessMsg('Your password has been successfully updated! You can now access your college portal.');
      setTimeout(() => {
        window.location.href = resolveWorkspaceUrl();
      }, 1500);
    } catch (err: any) {
      console.error('Update password error:', err);
      setError(err.message || 'Failed to update password. Recovery link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md mx-auto rounded-3xl bg-white border border-slate-200/90 shadow-floating-mockup p-8 sm:p-9"
    >
      <div className="text-center mb-7">
        <div className="w-12 h-12 rounded-2xl bg-light-primary text-white font-headline font-extrabold text-xl flex items-center justify-center mx-auto mb-4 shadow-sm">
          {view === 'reset' ? (
            <KeyRound className="w-6 h-6" />
          ) : view === 'forgot' ? (
            <Mail className="w-6 h-6" />
          ) : (
            'C'
          )}
        </div>
        <h1 className="font-headline font-bold text-2xl text-slate-900 tracking-tight">
          {view === 'reset'
            ? 'Set New Password'
            : view === 'forgot'
            ? 'Reset Your Password'
            : 'Sign in to Colformly'}
        </h1>
        <p className="text-sm text-slate-600 mt-1.5">
          {view === 'reset'
            ? 'Choose a secure new password for your Colformly account.'
            : view === 'forgot'
            ? 'Enter your campus or work email to receive password reset instructions.'
            : 'Campus gateway for Students, Faculty & College Administrators.'}
        </p>
      </div>

      {checkingSession ? (
        <div className="p-8 rounded-2xl bg-slate-50/80 border border-slate-200 text-center space-y-3">
          <RefreshCw className="w-6 h-6 text-light-primary animate-spin mx-auto" />
          <p className="text-xs text-slate-600 font-medium">Verifying active session credentials...</p>
        </div>
      ) : view === 'reset' ? (
        /* VIEW: RESET PASSWORD */
        <form onSubmit={handleUpdatePassword} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-label font-semibold text-slate-700 mb-1.5">
              New Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min. 6 characters"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-light-primary/25 focus:border-light-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-label font-semibold text-slate-700 mb-1.5">
              Confirm New Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-type new password"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-light-primary/25 focus:border-light-primary"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-light-primary hover:bg-[#0D655E] text-white font-label font-bold text-sm shadow-sm transition-all active:scale-[0.98] disabled:opacity-60"
          >
            <KeyRound className="w-4 h-4" />
            <span>{loading ? 'Saving Password...' : 'Save New Password'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setView('login');
              setError(null);
              setSuccessMsg(null);
            }}
            className="w-full inline-flex items-center justify-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 font-medium py-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Sign In</span>
          </button>
        </form>
      ) : view === 'forgot' ? (
        /* VIEW: FORGOT PASSWORD REQUEST */
        <form onSubmit={handleForgotPassword} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-label font-semibold text-slate-700 mb-1.5">
              Work or Campus Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="prof@aravali.edu.in"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-light-primary/25 focus:border-light-primary"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-light-primary hover:bg-[#0D655E] text-white font-label font-bold text-sm shadow-sm transition-all active:scale-[0.98] disabled:opacity-60"
          >
            <Mail className="w-4 h-4" />
            <span>{loading ? 'Sending Reset Link...' : 'Send Password Reset Link'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setView('login');
              setError(null);
              setSuccessMsg(null);
            }}
            className="w-full inline-flex items-center justify-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 font-medium py-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Sign In</span>
          </button>
        </form>
      ) : authedUser ? (
        <div className="p-5 rounded-2xl bg-teal-50/80 border border-teal-200 text-center space-y-3">
          <CheckCircle2 className="w-8 h-8 text-light-primary mx-auto" />
          <div>
            <p className="font-headline font-bold text-slate-900 text-sm">
              Authenticated as {authedUser.email}
            </p>
            <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full bg-white border border-teal-200 text-[11px] font-mono font-bold text-light-primary">
              ROLE: {authedUser.role}
            </span>
          </div>
          <p className="text-xs text-slate-600">
            Your PKCE session cookie is active. Launch your college portal below.
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <a
              href={resolveWorkspaceUrl()}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-light-primary hover:bg-[#0D655E] text-white font-label text-sm font-semibold transition-colors"
            >
              <span>Open College Portal</span>
              <ArrowRight className="w-4 h-4" />
            </a>
            <button
              type="button"
              onClick={async () => {
                await supabase.auth.signOut();
                setAuthedUser(null);
              }}
              className="text-xs text-slate-500 hover:text-slate-800 font-medium py-1"
            >
              Sign out
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Mode Toggle */}
          <div className="grid grid-cols-2 p-1 rounded-full bg-slate-100 border border-slate-200 mb-6">
            <button
              type="button"
              onClick={() => {
                setMode('google');
                setError(null);
                setSuccessMsg(null);
              }}
              className={`py-2 rounded-full text-xs font-label font-bold transition-all ${
                mode === 'google'
                  ? 'bg-white text-light-primary shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Campus Google SSO
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('password');
                setError(null);
                setSuccessMsg(null);
              }}
              className={`py-2 rounded-full text-xs font-label font-bold transition-all ${
                mode === 'password'
                  ? 'bg-white text-light-primary shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Email &amp; Password
            </button>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {mode === 'google' ? (
            <div className="space-y-4">
              <button
                type="button"
                disabled={loading}
                onClick={handleGoogleSignIn}
                className="w-full flex items-center justify-center gap-3 px-5 py-3.5 rounded-full bg-white hover:bg-slate-50 border border-slate-300 text-slate-900 font-label font-semibold text-sm shadow-sm transition-all active:scale-[0.98] disabled:opacity-60"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
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
                <span>{loading ? 'Redirecting to Google...' : 'Continue with Google Workspace'}</span>
              </button>

              <p className="text-center text-xs text-slate-500 leading-relaxed">
                Use your verified college Google account (e.g.{' '}
                <span className="font-mono text-slate-700">@aravali.edu.in</span>) to auto-join your
                institution&apos;s isolated workspace.
              </p>
            </div>
          ) : (
            <form onSubmit={handlePasswordSignIn} className="space-y-4">
              <div>
                <label className="block text-xs font-label font-semibold text-slate-700 mb-1.5">
                  Work or Campus Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="prof@aravali.edu.in"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-light-primary/25 focus:border-light-primary"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-label font-semibold text-slate-700">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setView('forgot');
                      setError(null);
                      setSuccessMsg(null);
                    }}
                    className="text-xs text-light-primary hover:underline font-medium"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-light-primary/25 focus:border-light-primary"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-light-primary hover:bg-[#0D655E] text-white font-label font-bold text-sm shadow-sm transition-all active:scale-[0.98] disabled:opacity-60"
              >
                <span>{loading ? 'Verifying Credentials...' : 'Sign In Securely'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}
        </>
      )}

      <div className="mt-7 pt-5 border-t border-slate-100 flex items-center justify-center gap-2 text-[11px] text-slate-500">
        <ShieldCheck className="w-4 h-4 text-light-primary shrink-0" />
        <span>Protected by Supabase SSR PKCE Cookies &amp; Strict Tenant RLS</span>
      </div>
    </motion.div>
  );
}