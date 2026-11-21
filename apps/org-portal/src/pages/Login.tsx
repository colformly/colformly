import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  GraduationCap,
  KeyRound,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { supabase, useAuth, useAuthStore } from '@colformly/auth';
import { Button } from '@colformly/ui';
import { triggerToast } from '../lib/toast';
import { resolveSessionApi } from '../lib/workerClient';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, user, role, refreshProfile, isLoading } = useAuth();

  const [view, setView] = useState<'login' | 'forgot' | 'reset'>('login');
  const [mode, setMode] = useState<'google' | 'password'>('google');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [examCode, setExamCode] = useState<string | null>(null);

  // Check for password recovery params in search or hash
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const isRecovery =
      searchParams.get('type') === 'recovery' ||
      hashParams.get('type') === 'recovery' ||
      searchParams.get('reset') === 'true';

    if (isRecovery) {
      setView('reset');
    }

    const code = searchParams.get('code') || sessionStorage.getItem('pending_exam_code');
    if (code) {
      sessionStorage.setItem('pending_exam_code', code.trim());
      setExamCode(code.trim().toUpperCase());
    }
  }, [location.search]);

  // Listen for Supabase password recovery event
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setView('reset');
      }
    });
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const redirectByRole = (targetRole?: string | null) => {
    const resolved = targetRole || role;
    const pendingCode = sessionStorage.getItem('pending_exam_code');

    if (resolved === 'ORG_ADMIN' || resolved === 'SUPER_ADMIN') {
      if (pendingCode) {
        sessionStorage.removeItem('pending_exam_code');
        triggerToast('This is a student-only exam link.', 'error');
      }
      navigate('/org/dashboard', { replace: true });
    } else if (resolved === 'TEACHER') {
      if (pendingCode) {
        sessionStorage.removeItem('pending_exam_code');
        triggerToast('This is a student-only exam link.', 'error');
      }
      navigate('/teacher/dashboard', { replace: true });
    } else {
      if (pendingCode) {
        navigate(`/student/dashboard?code=${encodeURIComponent(pendingCode)}`, { replace: true });
      } else {
        navigate('/student/dashboard', { replace: true });
      }
    }
  };

  // If already authenticated on mount or after OAuth callback (skip if resetting password)
  useEffect(() => {
    let isMounted = true;
    const handleAuthRedirect = async () => {
      const searchParams = new URLSearchParams(location.search);
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      if (
        view === 'reset' ||
        searchParams.get('type') === 'recovery' ||
        hashParams.get('type') === 'recovery' ||
        searchParams.get('reset') === 'true'
      ) {
        return;
      }

      if (session?.user && isMounted) {
        setAuthLoading(true);
        try {
          const res = await resolveSessionApi();
          if (!res.authorized) {
            await supabase.auth.signOut();
            if (res.reason === 'WORKSPACE_SUSPENDED') {
              setError('Workspace Suspended: Your institution workspace is currently suspended. Please contact your campus administrator.');
            } else if (res.reason === 'DOMAIN_NOT_AUTHORIZED') {
              setError(
                `Access Denied: Your email domain (@${res.domain || session.user.email?.split('@')[1]}) is not authorized for any campus workspace. Please sign in with your official college email.`,
              );
            } else {
              setError(res.message || 'You are not authorized to access this portal.');
            }
            return;
          }

          await refreshProfile();
          const latestRole = res.role || useAuthStore.getState().role;
          redirectByRole(latestRole);
        } catch (err) {
          console.warn('Session resolve warning:', err);
          await refreshProfile();
          redirectByRole();
        } finally {
          if (isMounted) setAuthLoading(false);
        }
      }
    };

    void handleAuthRedirect();
    return () => {
      isMounted = false;
    };
  }, [session, user, view]);

  const handleGoogleSignIn = async () => {
    setError(null);
    setSuccessMsg(null);
    setAuthLoading(true);
    try {
      const pendingCode = sessionStorage.getItem('pending_exam_code');
      const redirectUrl = pendingCode
        ? `${window.location.origin}/login?code=${encodeURIComponent(pendingCode)}`
        : `${window.location.origin}/login`;

      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
        },
      });

      if (oauthError) throw oauthError;
    } catch (err: any) {
      console.error('Google OAuth sign-in error:', err);
      setError(err.message || 'Google Sign-in failed. Please ensure Google provider is enabled.');
      setAuthLoading(false);
    }
  };

  const handlePasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;

    setError(null);
    setSuccessMsg(null);
    setAuthLoading(true);
    try {
      const { data, error: signInErr } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (signInErr) throw signInErr;

      const res = await resolveSessionApi();
      if (!res.authorized) {
        await supabase.auth.signOut();
        if (res.reason === 'WORKSPACE_SUSPENDED') {
          setError('Workspace Suspended: Your institution workspace is currently suspended. Please contact your campus administrator.');
        } else if (res.reason === 'DOMAIN_NOT_AUTHORIZED') {
          setError(`Access Denied: Domain @${res.domain || email.split('@')[1]} is not authorized for this campus.`);
        } else {
          setError(res.message || 'You are not authorized to access this portal.');
        }
        return;
      }

      await refreshProfile();
      const latestRole = res.role || useAuthStore.getState().role;
      redirectByRole(latestRole);
    } catch (err: any) {
      console.error('Password sign-in error:', err);
      setError(err.message || 'Invalid email or password.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your email address to receive reset instructions.');
      return;
    }

    setError(null);
    setSuccessMsg(null);
    setAuthLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/login?reset=true`;
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: redirectUrl,
      });

      if (resetErr) throw resetErr;

      setSuccessMsg(`Password reset link dispatched to ${email.trim()}. Please check your email inbox and spam folder.`);
      triggerToast('Reset link dispatched!', 'success');
    } catch (err: any) {
      console.error('Password reset request error:', err);
      setError(err.message || 'Failed to dispatch reset email. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      setError('Please provide and confirm your new password.');
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

    setError(null);
    setSuccessMsg(null);
    setAuthLoading(true);
    try {
      const { error: updateErr } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateErr) throw updateErr;

      setSuccessMsg('Your password has been successfully updated! Redirecting to your dashboard...');
      triggerToast('Password updated successfully!', 'success');

      setTimeout(async () => {
        await refreshProfile();
        const latestRole = useAuthStore.getState().role;
        redirectByRole(latestRole);
      }, 1500);
    } catch (err: any) {
      console.error('Update password error:', err);
      setError(err.message || 'Failed to update password. The reset link may have expired.');
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background radial glow */}
      <div className="fixed top-12 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-teal-100/50 blur-[100px] rounded-full pointer-events-none -z-10" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white/85 backdrop-blur-xl border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-[0_20px_50px_-12px_rgba(15,23,42,0.1)] relative"
      >
        {/* Brand Header */}
        <div className="text-center space-y-2 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center mx-auto shadow-md">
            {view === 'reset' ? (
              <KeyRound className="w-6 h-6" />
            ) : view === 'forgot' ? (
              <Mail className="w-6 h-6" />
            ) : (
              <GraduationCap className="w-6 h-6" />
            )}
          </div>
          <h1 className="font-headline font-extrabold text-2xl text-slate-900 tracking-tight">
            {view === 'reset'
              ? 'Set New Password'
              : view === 'forgot'
              ? 'Reset Your Password'
              : 'Colformly Campus Portal'}
          </h1>
          <p className="text-xs text-slate-500">
            {view === 'reset'
              ? 'Choose a secure new password to regain access to your account.'
              : view === 'forgot'
              ? 'Enter your college email address to receive password reset instructions.'
              : 'Secure single-sign-on for college faculty, students, and administrators.'}
          </p>
        </div>

        {/* Pending Exam Link Notification */}
        {examCode && view === 'login' && (
          <div className="mb-5 p-3 rounded-2xl bg-teal-50 border border-teal-200/90 text-teal-900 text-xs flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-teal-600 shrink-0" />
              <span>
                Exam link detected: <strong className="font-mono text-teal-950 font-bold">{examCode}</strong>
              </span>
            </div>
            <span className="text-[10px] font-mono font-bold bg-teal-100/90 text-teal-800 px-2 py-0.5 rounded-full border border-teal-300/60">
              STUDENT
            </span>
          </div>
        )}

        {error && (
          <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">{error}</div>
          </div>
        )}

        {successMsg && (
          <div className="mb-5 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">{successMsg}</div>
          </div>
        )}

        {/* VIEW: RESET PASSWORD (From email recovery link) */}
        {view === 'reset' ? (
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-label font-bold text-slate-700 mb-1.5">
                New Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-primary focus:bg-white transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-label font-bold text-slate-700 mb-1.5">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-type new password"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-primary focus:bg-white transition-all"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={authLoading}
              className="w-full rounded-2xl py-3"
              leftIcon={<KeyRound className="w-4 h-4" />}
            >
              {authLoading ? 'Updating Password...' : 'Save New Password'}
            </Button>

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
            <div>
              <label className="block text-xs font-label font-bold text-slate-700 mb-1.5">
                Registered College Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@aravali.edu.in"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-primary focus:bg-white transition-all"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={authLoading}
              className="w-full rounded-2xl py-3"
              leftIcon={<Mail className="w-4 h-4" />}
            >
              {authLoading ? 'Sending Reset Link...' : 'Send Password Reset Link'}
            </Button>

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
        ) : (
          /* VIEW: NORMAL LOGIN */
          <>
            {/* Tab Toggle: Google vs Password */}
            <div className="p-1 rounded-2xl bg-slate-100/90 border border-slate-200/80 grid grid-cols-2 gap-1 mb-6">
              <button
                type="button"
                onClick={() => setMode('google')}
                className={`py-2 rounded-xl text-xs font-label font-bold transition-all ${
                  mode === 'google'
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Google Campus SSO
              </button>
              <button
                type="button"
                onClick={() => setMode('password')}
                className={`py-2 rounded-xl text-xs font-label font-bold transition-all ${
                  mode === 'password'
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Email &amp; Password
              </button>
            </div>

            {mode === 'google' ? (
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => void handleGoogleSignIn()}
                  disabled={authLoading}
                  className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-label text-sm font-bold shadow-sm transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
                >
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      fill="#EA4335"
                    />
                  </svg>
                  <span>{authLoading ? 'Connecting to Campus SSO...' : 'Continue with Campus Google'}</span>
                </button>

                <div className="p-3.5 rounded-2xl bg-teal-50/70 border border-teal-200/80 text-xs text-teal-950 flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    Log in with your college domain (e.g.{' '}
                    <strong className="font-mono text-primary">@acem.edu.in</strong> or{' '}
                    <strong className="font-mono text-primary">@aravali.edu.in</strong>) to auto-join your campus workspace.
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={handlePasswordSignIn} className="space-y-4">
                <div>
                  <label className="block text-xs font-label font-bold text-slate-700 mb-1.5">
                    College Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@aravali.edu.in"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-primary focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-label font-bold text-slate-700">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setView('forgot');
                        setError(null);
                        setSuccessMsg(null);
                      }}
                      className="text-xs text-primary hover:underline font-medium"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-primary focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={authLoading}
                  className="w-full rounded-2xl py-3"
                  leftIcon={<ArrowRight className="w-4 h-4" />}
                >
                  {authLoading ? 'Authenticating...' : 'Sign In to Portal'}
                </Button>
              </form>
            )}
          </>
        )}

        <div className="pt-6 mt-6 border-t border-slate-100 text-center">
          <p className="text-[11px] text-slate-400 font-mono">
            Colformly Multi-Tenant Identity Guard • ap-south-1
          </p>
        </div>
      </motion.div>
    </div>
  );
}