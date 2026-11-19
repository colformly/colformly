import { useEffect, useState } from 'react';
import { Check, Palette, RotateCcw, Sparkles } from 'lucide-react';
import { supabase, useAuth } from '@colformly/auth';
import {
  useTheme,
  type ThemeAnimationIntensity,
  type ThemeBorderRadius,
  type ThemeLayout,
} from '@colformly/theme';
import { Button, MetricCard } from '@colformly/ui';
import { PortalShell } from '../../layouts/PortalShell';

const COLOR_SWATCHES = [
  { name: 'Colformly Teal', primary: '#0F766E', secondary: '#14B8A6' },
  { name: 'Royal Indigo', primary: '#4F46E5', secondary: '#818CF8' },
  { name: 'Campus Crimson', primary: '#BE123C', secondary: '#F43F5E' },
  { name: 'Oxford Navy', primary: '#1D4ED8', secondary: '#3B82F6' },
  { name: 'Emerald Forest', primary: '#047857', secondary: '#10B981' },
];

export default function OrgBranding() {
  const { theme, updateTheme, applyPreset, resetTheme, classes } = useTheme();
  const { activeOrg, setActiveOrg } = useAuth();

  const orgId = activeOrg?.id || 'a0000000-0000-0000-0000-000000000001';

  const [collegeName, setCollegeName] = useState(
    activeOrg?.name || 'Aravali College of Engineering',
  );
  const [saving, setSaving] = useState(false);
  const [savedToast, setSavedToast] = useState(false);

  useEffect(() => {
    if (activeOrg?.name) {
      setCollegeName(activeOrg.name);
    }
  }, [activeOrg?.name]);

  const handleSave = async () => {
    try {
      setSaving(true);
      // 1. Update live organization theme_config and name in Supabase
      const { error } = await (supabase.from('organizations') as any)
        .update({
          theme_config: theme,
          name: collegeName.trim(),
        })
        .eq('id', orgId);

      if (error) throw error;

      // 2. Synchronize ThemeProvider and AuthStore context
      updateTheme(theme);
      if (setActiveOrg) {
        await setActiveOrg(orgId).catch(() => {});
      }

      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 2600);
    } catch (err: any) {
      console.error('Error saving branding config:', err);
      alert(`Error saving theme: ${err.message || 'Database permission error'}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <PortalShell persona="org">
      <div className="space-y-7">
        {/* Top Action Bar */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-label text-xs text-primary font-bold uppercase tracking-wider">
                Structural Theming Engine • Live Supabase Sync
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-50 text-primary text-xs font-semibold border border-teal-200">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                Live Theme Sync
              </span>
            </div>
            <h1 className="font-headline font-bold text-2xl sm:text-3xl text-slate-900">
              College Branding &amp; Structural Layout
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<RotateCcw className="w-4 h-4" />}
              onClick={resetTheme}
            >
              Reset Defaults
            </Button>
            <Button
              size="sm"
              leftIcon={<Check className="w-4 h-4" />}
              onClick={() => void handleSave()}
              disabled={saving}
            >
              {saving ? 'Saving...' : savedToast ? 'Saved to Org!' : 'Save Changes'}
            </Button>
          </div>
        </header>

        {/* Two-Column Settings + Live Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
          {/* Left: Structural Controls */}
          <div className={`lg:col-span-7 p-6 space-y-6 ${classes.card}`}>
            {/* Quick Structural Presets */}
            <div>
              <label className="block text-xs font-label font-bold uppercase tracking-wider text-slate-500 mb-2.5">
                One-Click Structural Presets
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => applyPreset('default')}
                  className="p-3 rounded-xl border border-slate-200 hover:border-primary text-left transition-colors bg-white"
                >
                  <p className="font-headline font-bold text-xs text-slate-900">Colformly Glass</p>
                  <p className="text-[11px] text-slate-500">Floating • rounded-xl</p>
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('gamified')}
                  className="p-3 rounded-xl border border-slate-200 hover:border-primary text-left transition-colors bg-white"
                >
                  <p className="font-headline font-bold text-xs text-slate-900">GenZ Gamified</p>
                  <p className="text-[11px] text-slate-500">Floating • rounded-3xl • High</p>
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('enterprise')}
                  className="p-3 rounded-xl border border-slate-200 hover:border-primary text-left transition-colors bg-white"
                >
                  <p className="font-headline font-bold text-xs text-slate-900">Enterprise Solid</p>
                  <p className="text-[11px] text-slate-500">Solid • rounded-md • Minimal</p>
                </button>
              </div>
            </div>

            {/* College Display Name */}
            <div>
              <label className="block text-xs font-label font-bold text-slate-700 mb-1.5">
                Institution Name
              </label>
              <input
                type="text"
                value={collegeName}
                onChange={(e) => setCollegeName(e.target.value)}
                className={`w-full px-4 py-2.5 text-sm ${classes.input}`}
              />
            </div>

            {/* Brand Primary Color Swatches & Picker */}
            <div>
              <label className="block text-xs font-label font-bold text-slate-700 mb-2">
                Primary Brand Color (<code className="font-mono">--color-primary</code>)
              </label>
              <div className="flex flex-wrap items-center gap-2.5">
                {COLOR_SWATCHES.map((s) => (
                  <button
                    key={s.name}
                    type="button"
                    onClick={() =>
                      updateTheme({
                        colors: { ...theme.colors, primary: s.primary, secondary: s.secondary },
                      })
                    }
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-label font-semibold transition-all ${
                      theme.colors.primary.toLowerCase() === s.primary.toLowerCase()
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: s.primary }} />
                    <span>{s.name}</span>
                  </button>
                ))}
                <input
                  type="color"
                  aria-label="Custom Primary Color"
                  value={theme.colors.primary}
                  onChange={(e) =>
                    updateTheme({ colors: { ...theme.colors, primary: e.target.value } })
                  }
                  className="h-9 w-11 rounded-lg border border-slate-200 cursor-pointer p-0.5"
                />
              </div>
            </div>

            {/* Structural Layout Mode */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-xs font-label font-bold text-slate-700 mb-2">
                  UI Structure (<code>theme.layout</code>)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['floating', 'solid'] as ThemeLayout[]).map((layout) => (
                    <button
                      key={layout}
                      type="button"
                      onClick={() => updateTheme({ layout })}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-label font-bold capitalize transition-all ${
                        theme.layout === layout
                          ? 'bg-primary text-white border-primary'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {layout}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-label font-bold text-slate-700 mb-2">
                  Animations (<code>animationIntensity</code>)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['high', 'minimal'] as ThemeAnimationIntensity[]).map((intensity) => (
                    <button
                      key={intensity}
                      type="button"
                      onClick={() => updateTheme({ animationIntensity: intensity })}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-label font-bold capitalize transition-all ${
                        theme.animationIntensity === intensity
                          ? 'bg-primary text-white border-primary'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {intensity}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Component Border Radius Variant */}
            <div>
              <label className="block text-xs font-label font-bold text-slate-700 mb-2">
                Component Geometry (<code>borderRadius</code>)
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(
                  [
                    { token: 'rounded-sm', label: 'Sharp' },
                    { token: 'rounded-md', label: 'Enterprise' },
                    { token: 'rounded-xl', label: 'Modern' },
                    { token: 'rounded-3xl', label: 'Gamified' },
                  ] as Array<{ token: ThemeBorderRadius; label: string }>
                ).map((r) => (
                  <button
                    key={r.token}
                    type="button"
                    onClick={() => updateTheme({ borderRadius: r.token })}
                    className={`py-2.5 px-2 border text-xs font-label font-bold transition-all ${r.token} ${
                      theme.borderRadius === r.token
                        ? 'bg-primary text-white border-primary'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Live Structural Mini-Preview */}
          <div className="lg:col-span-5 space-y-4">
            <div className={`p-6 space-y-5 ${classes.card}`}>
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-label font-bold text-primary">
                  <Palette className="w-4 h-4" /> Real-Time Structural Preview
                </span>
                <span className="font-mono text-[11px] text-slate-400">
                  {theme.layout} • {theme.borderRadius}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 bg-primary text-white flex items-center justify-center font-headline font-bold ${theme.borderRadius}`}
                  >
                    {collegeName.slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-headline font-bold text-sm text-slate-900">{collegeName}</p>
                    <p className="text-xs text-slate-500">White-Label Exam Portal</p>
                  </div>
                </div>

                <MetricCard
                  title="Live Preview Metric"
                  value="94.2%"
                  delta="+4.8%"
                  trend="up"
                  subtitle="Responds instantly to theme"
                  icon={<Sparkles className="w-5 h-5" />}
                />

                <div className="flex items-center gap-2">
                  <Button size="sm" className="flex-1">
                    Primary CTA
                  </Button>
                  <Button size="sm" variant="secondary" className="flex-1">
                    Secondary
                  </Button>
                </div>
              </div>

              <pre className="p-3.5 rounded-xl bg-slate-900 text-teal-300 font-mono text-[11px] overflow-x-auto">
                {JSON.stringify(
                  {
                    primary: theme.colors.primary,
                    layout: theme.layout,
                    animationIntensity: theme.animationIntensity,
                    borderRadius: theme.borderRadius,
                  },
                  null,
                  2,
                )}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </PortalShell>
  );
}
