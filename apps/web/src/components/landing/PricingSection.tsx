import { useState } from 'react';
import { Check, ArrowRight, Sparkles } from 'lucide-react';

export default function PricingSection() {
  const [annual, setAnnual] = useState(true);

  const tiers = [
    {
      name: 'Campus Pilot',
      badge: 'Zero Risk Trial',
      price: annual ? '₹0' : '₹0',
      period: 'for 60 days',
      desc: 'Test Colformly with an active department before campus-wide rollout.',
      features: [
        'Up to 500 active scholars',
        'Unlimited exams & tests',
        'Teacher Google Drive & Forms sync',
        'Basic tab-switch anti-cheat guard',
        'Standard edge grading (<150ms)',
      ],
      cta: 'Start Campus Pilot',
      featured: false,
    },
    {
      name: 'Department Growth',
      badge: 'Most Popular',
      price: annual ? '₹14,999' : '₹16,999',
      period: annual ? '/mo (billed annually)' : '/month',
      desc: 'Ideal for single departments or specialized faculties needing regular testing.',
      features: [
        'Up to 2,500 enrolled scholars',
        'Unlimited exams & submissions',
        'Google Workspace SSO domain lock',
        'Full anti-cheat telemetry logging',
        'AI question generator (Groq / Gemini)',
        'SVG grade signatures with blessings',
        'Priority SLA support',
      ],
      cta: 'Deploy Department Plan',
      featured: true,
    },
    {
      name: 'University Enterprise',
      badge: 'Institution-Wide',
      price: 'Custom',
      period: 'campus contract',
      desc: 'Tailored for multi-faculty colleges, universities, and coaching networks.',
      features: [
        'Unlimited campus students & faculty',
        'Multiple campus sub-domains & branches',
        'Dedicated Cloudflare Edge isolate',
        'Custom NBA / NAAC compliance export',
        'Custom negative marking engines',
        'Dedicated technical account manager',
        '99.95% uptime SLA guarantee',
      ],
      cta: 'Contact Institutional Sales',
      featured: false,
    },
  ];

  return (
    <section id="pricing" className="py-24 px-4 sm:px-6 max-w-7xl mx-auto">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <span className="font-mono text-xs uppercase tracking-wider text-teal-600 dark:text-teal-400 font-semibold">
          Transparent Investment
        </span>
        <h2 className="font-display font-black text-3xl sm:text-5xl text-slate-900 dark:text-white mt-2 tracking-tight">
          Institutional Plans &amp; Predictable Scale
        </h2>
        <p className="font-body text-slate-600 dark:text-slate-400 mt-4 text-base sm:text-lg">
          No hidden per-submission fees or surge pricing during finals week. One transparent license
          covering your entire academic year.
        </p>

        {/* Annual / Monthly Toggle */}
        <div className="mt-8 inline-flex items-center gap-3 p-1 rounded-full bg-slate-100 dark:bg-[#0D111A] border border-slate-200 dark:border-white/10 text-xs font-display font-bold">
          <button
            type="button"
            onClick={() => setAnnual(false)}
            className={`px-4 py-2 rounded-full transition-all ${
              !annual
                ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setAnnual(true)}
            className={`px-4 py-2 rounded-full flex items-center gap-1.5 transition-all ${
              annual
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>Annual</span>
            <span className="px-1.5 py-0.5 rounded-full bg-emerald-400 text-slate-950 text-[10px] font-mono">
              Save 15%
            </span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
        {tiers.map((t) => (
          <div
            key={t.name}
            className={`rounded-3xl p-8 sm:p-10 flex flex-col justify-between transition-all duration-300 ${
              t.featured
                ? 'bg-white dark:bg-[#0D111A] border-2 border-teal-500 shadow-2xl scale-105 z-10'
                : 'bg-white/70 dark:bg-[#0D111A]/70 border border-slate-200/90 dark:border-white/10 shadow-md'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="font-mono text-xs text-teal-600 dark:text-teal-400 font-bold uppercase tracking-wider">
                  {t.badge}
                </span>
                {t.featured && (
                  <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 text-[11px] font-bold">
                    <Sparkles className="w-3 h-3" /> Recommended
                  </span>
                )}
              </div>

              <h3 className="font-display font-black text-2xl text-slate-900 dark:text-white">
                {t.name}
              </h3>
              <p className="font-body text-xs text-slate-500 dark:text-slate-400 mt-2 min-h-[36px]">
                {t.desc}
              </p>

              <div className="mt-6 pb-6 border-b border-slate-100 dark:border-white/10">
                <span className="font-display font-black text-4xl text-slate-900 dark:text-white">
                  {t.price}
                </span>
                <span className="font-mono text-xs text-slate-500 dark:text-slate-400 ml-2">
                  {t.period}
                </span>
              </div>

              <ul className="mt-6 space-y-3.5">
                {t.features.map((f, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                    <Check className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-8 pt-6">
              <a
                href="#pilot-demo"
                className={`w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-full font-display font-bold text-xs sm:text-sm transition-all ${
                  t.featured
                    ? 'bg-teal-600 hover:bg-teal-700 text-white shadow-lg shadow-teal-600/25'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-900 dark:bg-white/10 dark:hover:bg-white/15 dark:text-white'
                }`}
              >
                <span>{t.cta}</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
