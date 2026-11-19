import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Clock,
  Cloud,
  Eye,
  Globe,
  KeyRound,
  Lock,
  Moon,
  Palette,
  RefreshCw,
  Server,
  Shield,
  ShieldCheck,
  Sliders,
  Sparkles,
  Sun,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import { useAuth, supabase } from '@colformly/auth';
import { Button } from '@colformly/ui';
import { SuperAdminShell } from '../layouts/SuperAdminShell';
import { useThemeStore, type SuperAdminTheme } from '../lib/themeStore';

const THEMES: {
  id: SuperAdminTheme;
  title: string;
  tagline: string;
  previewClass: string;
  badge: string;
}[] = [
  {
    id: 'apple-glass',
    title: 'Apple Glassmorphism',
    tagline: 'Frosted crystal acrylic, ultra-fine 1px borders, ambient depth & soft shadows.',
    previewClass: 'bg-zinc-900/60 border-white/20 backdrop-blur-2xl shadow-xl',
    badge: 'VISIONARY',
  },
  {
    id: 'obsidian-stealth',
    title: 'Obsidian Stealth',
    tagline: 'Deep absolute pitch black (#000000), tactical muted accents, zero light bleed.',
    previewClass: 'bg-black border-zinc-800 text-zinc-100',
    badge: 'DEFAULT',
  },
  {
    id: 'spatial-midnight',
    title: 'Spatial Midnight',
    tagline: 'Cosmic deep navy (#050816), violet nebula glow, visionOS floating layers.',
    previewClass: 'bg-[#0a0e27] border-indigo-500/30 text-indigo-100 shadow-indigo-900/30',
    badge: 'SPATIAL',
  },
  {
    id: 'neo-brutal',
    title: 'Neo-Brutalism',
    tagline: 'Stark 2px hard borders, sharp non-rounded corners, high-contrast yellow & cyan.',
    previewClass: 'bg-zinc-950 border-2 border-teal-400 text-white rounded-none shadow-[4px_4px_0px_0px_#2dd4bf]',
    badge: 'STARK HIGH-CONTRAST',
  },
];

export default function Settings() {
  const { user, role, updatePassword } = useAuth();
  const { theme, setTheme, reducedMotion, setReducedMotion, soundFx, setSoundFx } = useThemeStore();

  // Password update form
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submittingPassword, setSubmittingPassword] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const handleUpdateMasterPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      setPasswordStatus({ type: 'error', text: 'Please fill in both password fields.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordStatus({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    if (newPassword.length < 8) {
      setPasswordStatus({ type: 'error', text: 'Master key must be at least 8 characters.' });
      return;
    }

    setSubmittingPassword(true);
    setPasswordStatus(null);
    try {
      const { error } = await updatePassword(newPassword);
      if (error) throw new Error(error);

      setPasswordStatus({
        type: 'success',
        text: 'Root master password successfully updated.',
      });
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordStatus({
        type: 'error',
        text: err.message || 'Failed to update master password.',
      });
    } finally {
      setSubmittingPassword(false);
    }
  };

  return (
    <SuperAdminShell>
      <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-headline font-bold text-2xl text-white tracking-tight">
                Settings & Themes Enclave
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-400 font-mono text-[10px] font-bold">
                ROOT CONFIG
              </span>
            </div>
            <p className="font-mono text-xs text-zinc-400 mt-1">
              Personalize interface aesthetics, motion physics, and root cryptographic credentials.
            </p>
          </div>
        </div>

        {/* SECTION 1: THEME SELECTOR CARDS */}
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/70 p-6 backdrop-blur-xl space-y-6">
          <div>
            <div className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-teal-400" />
              <h2 className="font-headline font-bold text-lg text-white">
                Super Admin Prime Themes
              </h2>
            </div>
            <p className="font-mono text-xs text-zinc-400 mt-0.5">
              Select an interface paradigm. Changes apply instantly across the entire console.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {THEMES.map((t) => {
              const isSelected = theme === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={`text-left p-5 rounded-2xl border transition-all relative overflow-hidden flex flex-col justify-between ${
                    isSelected
                      ? 'border-teal-500 ring-2 ring-teal-500/20 bg-zinc-900/80'
                      : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-teal-400 font-bold">
                        {t.badge}
                      </span>
                      {isSelected && (
                        <span className="flex items-center gap-1 font-mono text-[11px] text-teal-400 font-bold">
                          <Check className="w-3.5 h-3.5" />
                          ACTIVE
                        </span>
                      )}
                    </div>

                    <h3 className="font-headline font-bold text-base text-white">{t.title}</h3>
                    <p className="font-mono text-xs text-zinc-400">{t.tagline}</p>
                  </div>

                  {/* Visual Preview Box */}
                  <div className="mt-5 p-3 rounded-xl border border-zinc-800/60 bg-black/40 font-mono text-[10px] text-zinc-400 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-teal-400" />
                      <span>{t.id} preview</span>
                    </div>
                    <span className="text-zinc-500">CSS Variable Driven</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* SECTION 2: MOTION & SENSORY CONTROLS */}
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/70 p-6 backdrop-blur-xl space-y-6">
          <div>
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-teal-400" />
              <h2 className="font-headline font-bold text-lg text-white">
                Motion & Sensory Physics
              </h2>
            </div>
            <p className="font-mono text-xs text-zinc-400 mt-0.5">
              Tune Framer Motion easing curves, dynamic island spring physics, and telemetry alerts.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
            {/* Reduced Motion Toggle */}
            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 flex items-center justify-between">
              <div>
                <div className="font-bold text-white flex items-center gap-2">
                  <Zap className="w-4 h-4 text-teal-400" />
                  Reduced Motion Mode
                </div>
                <div className="text-[11px] text-zinc-400 mt-1">
                  Disables slide-overs, pulse blurs, and continuous spring oscillations.
                </div>
              </div>
              <input
                type="checkbox"
                checked={reducedMotion}
                onChange={(e) => setReducedMotion(e.target.checked)}
                className="rounded bg-zinc-900 border-zinc-700 text-teal-500 focus:ring-0 h-4 w-4"
              />
            </div>

            {/* Sound FX Toggle */}
            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 flex items-center justify-between">
              <div>
                <div className="font-bold text-white flex items-center gap-2">
                  {soundFx ? (
                    <Volume2 className="w-4 h-4 text-teal-400" />
                  ) : (
                    <VolumeX className="w-4 h-4 text-zinc-500" />
                  )}
                  Incident Acoustic Cues
                </div>
                <div className="text-[11px] text-zinc-400 mt-1">
                  Subtle audio chime when high-priority incidents hit the Dynamic Island.
                </div>
              </div>
              <input
                type="checkbox"
                checked={soundFx}
                onChange={(e) => setSoundFx(e.target.checked)}
                className="rounded bg-zinc-900 border-zinc-700 text-teal-500 focus:ring-0 h-4 w-4"
              />
            </div>
          </div>
        </div>

        {/* SECTION 3: SUPER ADMIN MASTER CREDENTIALS */}
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/70 p-6 backdrop-blur-xl space-y-6">
          <div>
            <div className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-teal-400" />
              <h2 className="font-headline font-bold text-lg text-white">
                Master Security & Credentials
              </h2>
            </div>
            <p className="font-mono text-xs text-zinc-400 mt-0.5">
              Root operator profile and master key rotation for Colformly Prime.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Operator Info Box */}
            <div className="p-5 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-4 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <span className="text-zinc-400">Authenticated Identity</span>
                <span className="font-bold text-white">{user?.email || 'core@edgecors.com'}</span>
              </div>
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <span className="text-zinc-400">Enclave Role</span>
                <span className="px-2 py-0.5 rounded bg-teal-500/10 border border-teal-500/30 text-teal-400 font-bold uppercase">
                  {role || 'SUPER_ADMIN'}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <span className="text-zinc-400">Auth Method</span>
                <span className="text-zinc-300">
                  {user?.app_metadata?.provider || 'PKCE Password / Google'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Isolation Enclave</span>
                <span className="text-emerald-400 font-bold">Strict RLS Active</span>
              </div>
            </div>

            {/* Change Master Password Form */}
            <form
              onSubmit={handleUpdateMasterPassword}
              className="p-5 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-4 font-mono text-xs"
            >
              <div className="font-bold text-white mb-2">Rotate Master Key</div>

              {passwordStatus && (
                <div
                  className={`p-3 rounded-lg border flex items-center gap-2 ${
                    passwordStatus.type === 'success'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  }`}
                >
                  {passwordStatus.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <span>{passwordStatus.text}</span>
                </div>
              )}

              <div>
                <label className="block text-zinc-400 mb-1">New Master Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-600 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat master password"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-600 focus:outline-none focus:border-teal-500"
                />
              </div>

              <Button
                type="submit"
                size="sm"
                variant="primary"
                isLoading={submittingPassword}
                leftIcon={<Lock className="w-3.5 h-3.5" />}
                className="w-full bg-teal-500 hover:bg-teal-400 text-zinc-950 font-bold"
              >
                Update Master Password
              </Button>
            </form>
          </div>
        </div>

        {/* SECTION 4: CLOUD INFRASTRUCTURE TOPOLOGY */}
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/70 p-6 backdrop-blur-xl space-y-4">
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-teal-400" />
            <h2 className="font-headline font-bold text-lg text-white">
              Cloud Infrastructure Topology
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40">
              <span className="text-zinc-500 text-[10px] block">Cloudflare Worker</span>
              <span className="text-white font-bold block mt-1">colformly-worker</span>
              <span className="text-teal-400 text-[10px] block mt-0.5">Edge Global v3.0</span>
            </div>

            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40">
              <span className="text-zinc-500 text-[10px] block">Database Server</span>
              <span className="text-white font-bold block mt-1">Supabase PostgreSQL</span>
              <span className="text-teal-400 text-[10px] block mt-0.5">AWS ap-south-1 (Mumbai)</span>
            </div>

            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40">
              <span className="text-zinc-500 text-[10px] block">AI Gateway Router</span>
              <span className="text-white font-bold block mt-1">Groq + Gemini</span>
              <span className="text-teal-400 text-[10px] block mt-0.5">Failover Pool Rotation</span>
            </div>

            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40">
              <span className="text-zinc-500 text-[10px] block">GA4 Analytics</span>
              <span className="text-white font-bold block mt-1">Render Microservice</span>
              <span className="text-teal-400 text-[10px] block mt-0.5">Node.js + Google Data API</span>
            </div>
          </div>
        </div>
      </div>
    </SuperAdminShell>
  );
}
