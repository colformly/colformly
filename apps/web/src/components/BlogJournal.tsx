import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2, Mail, School, Shield, Terminal } from 'lucide-react';

type Category = 'All' | 'Engineering' | 'Founder Logs' | 'Case Studies';

interface BlogArticle {
  id: string;
  category: Exclude<Category, 'All'>;
  badge: string;
  readTime: string;
  title: string;
  excerpt: string;
  author: string;
  date: string;
  variant: 'standard' | 'founder-bento';
  accent: 'teal' | 'purple' | 'dark';
  labelTag: string;
}

const ARTICLES: BlogArticle[] = [
  {
    id: 'cheat-proof-viewports',
    category: 'Engineering',
    badge: 'Architecture',
    readTime: '6 min read',
    title: 'Building Cheat-Proof Exam Viewports Without Kernel-Level DRM',
    excerpt:
      'How we detect tab switching via Document.visibilityState, block context menus and DevTools shortcuts, and enforce Fullscreen API lockdowns directly in the browser.',
    author: 'Dr. R. Chen',
    date: 'Oct 28',
    variant: 'standard',
    accent: 'teal',
    labelTag: 'DOM Tab-Focus Lock',
  },
  {
    id: 'aravali-mit-case-study',
    category: 'Case Studies',
    badge: 'Case Studies',
    readTime: '5 min read',
    title: 'Why Aravali College & MIT-WPU Switched from Google Forms to Colformly',
    excerpt:
      'Automating 8,400 monthly programming evaluations, eliminating manual Excel sheets, and reducing faculty grading turnaround from 14 days to 120 milliseconds.',
    author: 'Campus Partner',
    date: 'Oct 14',
    variant: 'standard',
    accent: 'purple',
    labelTag: 'Aravali Deployment',
  },
  {
    id: 'founder-log-14',
    category: 'Founder Logs',
    badge: 'Founder Log #14',
    readTime: 'Behind The Stack',
    title: 'Rewriting Our Real-Time Exam State with Supabase RLS & Cloudflare Workers',
    excerpt:
      'How zero-cold-start Workers + Postgres RLS initPlan caching eliminated connection bottlenecks during 9:00 AM campus-wide mid-sem rush hours.',
    author: 'Colformly Core',
    date: 'Nov 02',
    variant: 'founder-bento',
    accent: 'dark',
    labelTag: 'Edge Architecture',
  },
];

const CATEGORIES: Category[] = ['All', 'Engineering', 'Founder Logs', 'Case Studies'];

export default function BlogJournal() {
  const [activeCategory, setActiveCategory] = useState<Category>('All');
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const visibleArticles =
    activeCategory === 'All'
      ? ARTICLES
      : ARTICLES.filter((a) => a.category === activeCategory);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubscribed(true);
    setEmail('');
  };

  return (
    <div className="flex flex-col gap-12">
      {/* Header + Category Filter Pills */}
      <header className="text-center max-w-3xl mx-auto flex flex-col items-center gap-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-teal-50 border border-teal-200 text-light-primary font-label text-xs font-bold">
          <span className="w-2 h-2 rounded-full bg-light-primary animate-pulse" />
          <span>Open Engineering &amp; Product Logs</span>
        </div>

        <h1 className="font-headline font-extrabold text-4xl sm:text-5xl text-slate-900 tracking-tight">
          The Colformly Journal
        </h1>

        <p className="font-body text-lg text-slate-600 max-w-xl">
          Building zero-cost, cheat-proof B2B EdTech in public.
        </p>

        <nav aria-label="Blog Category Filter" className="flex flex-wrap items-center justify-center gap-2 pt-3">
          {CATEGORIES.map((cat) => {
            const isSelected = activeCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`px-5 py-2 rounded-full font-headline text-xs transition-all ${
                  isSelected
                    ? 'bg-light-primary text-white font-bold shadow-sm'
                    : 'bg-white hover:bg-slate-50 text-slate-700 font-semibold border border-slate-200'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </nav>
      </header>

      {/* 1. HERO FEATURED 2-COLUMN CARD */}
      <motion.article
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="rounded-3xl bg-white border border-slate-200/90 shadow-[0_20px_45px_-10px_rgba(15,23,42,0.08)] overflow-hidden group hover:shadow-[0_28px_55px_-12px_rgba(15,23,42,0.12)] transition-all"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
          {/* Left: Illustrated Edge Dashboard Graphic */}
          <div className="lg:col-span-7 bg-gradient-to-br from-teal-50 via-slate-50 to-emerald-50/50 p-7 sm:p-10 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-100 relative overflow-hidden">
            <div className="flex items-center gap-2.5 mb-6">
              <span className="px-3 py-1 rounded-full bg-teal-100 text-light-primary font-headline font-bold text-xs border border-teal-200">
                Featured Architecture
              </span>
              <span className="font-body text-xs text-slate-500 font-medium">8 min read</span>
            </div>

            <div className="rounded-2xl bg-white border border-slate-200 shadow-md p-5 space-y-3.5 transform group-hover:scale-[1.01] transition-transform">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-500" />
                  <span className="font-headline font-bold text-xs text-slate-800">
                    Edge Gateway: 0ms Cold Start
                  </span>
                </div>
                <span className="font-mono text-[11px] text-emerald-800 font-bold">
                  ₹0.00 / month Cloud Bill
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2.5 text-center">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] font-label text-slate-500 uppercase block font-semibold">
                    Active Students
                  </span>
                  <span className="font-headline font-extrabold text-base text-slate-900">
                    10,480
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] font-label text-slate-500 uppercase block font-semibold">
                    Peak RPS
                  </span>
                  <span className="font-headline font-extrabold text-base text-light-primary">
                    3,200
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] font-label text-slate-500 uppercase block font-semibold">
                    RLS Isolated
                  </span>
                  <span className="font-headline font-extrabold text-base text-emerald-800">
                    100%
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-teal-50/70 border border-teal-200 text-xs text-slate-700 flex items-center justify-between gap-2">
                <span className="font-medium">
                  Supabase RLS + Cloudflare Workers AI Router
                </span>
                <span className="text-light-primary font-bold shrink-0">Sub-20ms</span>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-6 text-slate-500 text-xs font-medium">
              <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
              <span>Verified in production across Aravali College &amp; 34 engineering campuses</span>
            </div>
          </div>

          {/* Right: Editorial Copy */}
          <div className="lg:col-span-5 p-7 sm:p-10 flex flex-col justify-between gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                <span>Nov 16, 2026</span>
                <span>•</span>
                <span className="text-light-primary font-semibold">Systems Architecture</span>
              </div>

              <h2 className="font-headline font-bold text-2xl sm:text-3xl text-slate-900 leading-tight group-hover:text-light-primary transition-colors">
                How We Scaled to 10,000 Students Without Spending a Rupee on Cloud Infrastructure
              </h2>

              <p className="font-body text-sm text-slate-600 leading-relaxed">
                By combining BYOS Supabase tenants, Cloudflare Workers edge caching, and client-side
                anti-cheat guards, we eliminated conventional server overhead completely while
                serving 10,000 concurrent college test takers.
              </p>
            </div>

            <div className="pt-5 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-teal-100 text-light-primary border border-teal-200 flex items-center justify-center font-headline font-bold text-xs">
                  AK
                </div>
                <div>
                  <span className="font-headline font-bold text-xs text-slate-900 block">
                    Aayush Kumar
                  </span>
                  <span className="font-body text-xs text-slate-500 block">
                    Founder &amp; Staff Architect
                  </span>
                </div>
              </div>

              <a
                href="/contact"
                className="inline-flex items-center gap-1 font-label text-xs font-bold text-light-primary hover:underline"
              >
                <span>Request Whitepaper</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </motion.article>

      {/* 2. 3-COLUMN ASYMMETRICAL GRID + BENTO-STYLE FOUNDER LOG BOX */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-7 items-stretch">
        {visibleArticles.map((article) => {
          if (article.variant === 'founder-bento') {
            return (
              <motion.article
                key={article.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-3xl bg-light-on-surface text-white border border-slate-800 p-6 shadow-xl flex flex-col justify-between gap-5 relative overflow-hidden group"
              >
                <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full bg-teal-500/20 blur-2xl pointer-events-none" />

                <div className="space-y-4 relative z-10">
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-0.5 rounded-full bg-teal-400/20 text-teal-300 font-headline font-bold text-[11px] border border-teal-400/40">
                      {article.badge}
                    </span>
                    <span className="font-mono text-[11px] text-slate-400 flex items-center gap-1">
                      <Terminal className="w-3 h-3" /> {article.readTime}
                    </span>
                  </div>

                  <h3 className="font-headline font-bold text-lg text-white leading-snug">
                    {article.title}
                  </h3>

                  {/* Stack Code Snippet */}
                  <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 text-[11px] font-mono space-y-1 text-slate-300">
                    <div className="text-slate-500">// Tenant-isolated Edge Grader</div>
                    <div className="text-teal-400">export class ExamRoom {'{'}</div>
                    <div className="pl-3 text-slate-300">async grade(orgId: UUID) {'{'}</div>
                    <div className="pl-6 text-emerald-400">rls: "strict_org_match",</div>
                    <div className="pl-6 text-purple-300">latency_p99: "14ms"</div>
                    <div className="pl-3 text-slate-300">{'}'}</div>
                    <div className="text-teal-400">{'}'}</div>
                  </div>

                  <p className="font-body text-xs text-slate-300 leading-relaxed">
                    {article.excerpt}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 relative z-10">
                  <span className="font-medium text-slate-300">
                    {article.author} • {article.date}
                  </span>
                  <span className="text-teal-300 font-bold inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    <span>Read Log</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </motion.article>
            );
          }

          const isPurple = article.accent === 'purple';

          return (
            <motion.article
              key={article.id}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl bg-white border border-slate-200/80 p-6 shadow-card-soft hover:shadow-card-hover transition-shadow flex flex-col justify-between gap-5 group"
            >
              <div className="space-y-4">
                <div
                  className={`h-44 rounded-2xl border border-slate-200/80 flex items-center justify-center p-4 relative overflow-hidden ${
                    isPurple
                      ? 'bg-gradient-to-tr from-purple-50 to-indigo-50'
                      : 'bg-gradient-to-tr from-cyan-50 to-teal-50'
                  }`}
                >
                  <div className="text-center space-y-1.5">
                    <div
                      className={`w-10 h-10 rounded-xl bg-white border mx-auto flex items-center justify-center shadow-sm ${
                        isPurple
                          ? 'border-purple-200 text-purple-700'
                          : 'border-teal-200 text-light-primary'
                      }`}
                    >
                      {isPurple ? <School className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
                    </div>
                    <span
                      className={`font-mono text-[11px] font-bold block ${
                        isPurple ? 'text-purple-800' : 'text-teal-800'
                      }`}
                    >
                      {article.labelTag}
                    </span>
                  </div>
                  <span
                    className={`absolute top-3 right-3 px-2.5 py-0.5 rounded-full bg-white text-[10px] font-bold border font-label ${
                      isPurple
                        ? 'text-purple-700 border-purple-200'
                        : 'text-light-primary border-teal-200'
                    }`}
                  >
                    {article.readTime}
                  </span>
                </div>

                <div className="space-y-2">
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border font-label ${
                      isPurple
                        ? 'bg-purple-50 text-purple-800 border-purple-200'
                        : 'bg-teal-50 text-light-primary border-teal-200'
                    }`}
                  >
                    {article.badge}
                  </span>
                  <h3
                    className={`font-headline font-bold text-lg text-slate-900 transition-colors leading-snug ${
                      isPurple ? 'group-hover:text-purple-700' : 'group-hover:text-light-primary'
                    }`}
                  >
                    {article.title}
                  </h3>
                  <p className="font-body text-xs text-slate-600 leading-relaxed">
                    {article.excerpt}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>
                  {article.author} • {article.date}
                </span>
                <span
                  className={`font-bold inline-flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform ${
                    isPurple ? 'text-purple-700' : 'text-light-primary'
                  }`}
                >
                  Read →
                </span>
              </div>
            </motion.article>
          );
        })}
      </section>

      {/* 3. MINIMALIST NEWSLETTER BOX */}
      <section className="rounded-3xl bg-white border border-slate-200/80 p-8 sm:p-12 shadow-card-soft text-center flex flex-col items-center gap-6 max-w-4xl mx-auto w-full">
        <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-light-primary">
          <Mail className="w-6 h-6" />
        </div>

        <div className="space-y-1.5 max-w-lg">
          <h3 className="font-headline font-bold text-2xl text-slate-900 tracking-tight">
            Stay on the cutting edge of EdTech engineering
          </h3>
          <p className="font-body text-sm text-slate-600">
            Weekly engineering deep-dives on Supabase RLS, Cloudflare Workers, and campus exam
            security. Zero marketing spam.
          </p>
        </div>

        <form
          onSubmit={handleSubscribe}
          className="w-full max-w-md flex flex-col sm:flex-row items-center gap-2.5"
        >
          <div className="relative w-full">
            <Mail className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your campus email (e.g. dean@aravali.edu.in)"
              className="w-full pl-11 pr-4 py-3 rounded-full bg-slate-50 border border-slate-200 text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-light-primary/20 focus:border-light-primary"
            />
          </div>
          <button
            type="submit"
            className="w-full sm:w-auto px-7 py-3 rounded-full bg-light-primary hover:bg-[#0D655E] text-white font-headline font-bold text-sm shadow-sm active:scale-95 transition-all whitespace-nowrap shrink-0"
          >
            {subscribed ? 'Subscribed!' : 'Subscribe'}
          </button>
        </form>

        {subscribed && (
          <p className="text-xs text-emerald-700 font-semibold">
            Thanks for joining 2,400+ EdTech engineers &amp; college deans!
          </p>
        )}
      </section>
    </div>
  );
}
