import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Building2, CheckCircle2, Mail, Users } from 'lucide-react';
import { supabase } from '@colformly/auth';

export default function ContactForm() {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    college: '',
    role: 'Dean / Principal',
    studentCount: '1,000 - 5,000',
    byos: true,
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    // 1. Fire GA4 generate_lead event
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'generate_lead', {
        event_category: 'engagement',
        event_label: 'demo_inquiry',
        value: 1,
      });
    }

    // 2. Persist to public.demo_leads table
    try {
      const approxStudents = parseInt(form.studentCount.replace(/[^0-9]/g, '') || '1000', 10);
      await supabase.from('demo_leads').insert({
        full_name: form.fullName.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim() || null,
        college_name: form.college.trim(),
        designation: form.role,
        student_count: approxStudents,
        notes: `BYOS: ${form.byos ? 'Yes' : 'No'} | ${form.notes}`,
        status: 'NEW',
      });
    } catch (err) {
      console.warn('Demo lead DB insertion warning:', err);
    } finally {
      setSubmitting(false);
      setSubmitted(true);
    }
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-3xl bg-white dark:bg-[#0D111A] border border-teal-500/30 shadow-2xl p-8 sm:p-10 text-center space-y-4"
      >
        <div className="w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-600 dark:text-teal-400 mx-auto">
          <CheckCircle2 className="w-7 h-7" />
        </div>
        <h2 className="font-display font-bold text-2xl text-slate-900 dark:text-white">
          Campus Pilot Request Received
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
          Thanks, <span className="font-semibold text-slate-900 dark:text-white">{form.fullName}</span>! Our founder
          engineering team will reach out to{' '}
          <span className="font-mono text-teal-600 dark:text-teal-400 font-semibold">{form.email}</span> within 4 business hours
          to provision <span className="font-semibold text-slate-900 dark:text-white">{form.college}</span>.
        </p>
        <button
          type="button"
          onClick={() => setSubmitted(false)}
          className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full border border-slate-300 dark:border-white/10 text-xs font-display font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5"
        >
          Submit another inquiry
        </button>
      </motion.div>
    );
  }

  return (
    <form
      id="pilot-demo"
      onSubmit={handleSubmit}
      className="rounded-3xl bg-white dark:bg-[#0D111A] border border-slate-200/90 dark:border-white/10 shadow-2xl p-7 sm:p-9 space-y-5 text-left"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-display font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Your Name *
          </label>
          <input
            type="text"
            required
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            placeholder="Dr. Rajesh Sharma"
            className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/25 focus:border-teal-500"
          />
        </div>
        <div>
          <label className="block text-xs font-display font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Official Campus Email *
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="dean.academics@campus.edu.in"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/25 focus:border-teal-500"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-display font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Institution / College Name *
          </label>
          <div className="relative">
            <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              required
              value={form.college}
              onChange={(e) => setForm({ ...form, college: e.target.value })}
              placeholder="Aravali College of Engineering"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/25 focus:border-teal-500"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-display font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Active Student Strength
          </label>
          <div className="relative">
            <Users className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <select
              value={form.studentCount}
              onChange={(e) => setForm({ ...form, studentCount: e.target.value })}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/25 focus:border-teal-500"
            >
              <option className="text-slate-900 bg-white">Under 500</option>
              <option className="text-slate-900 bg-white">500 - 1,000</option>
              <option className="text-slate-900 bg-white">1,000 - 5,000</option>
              <option className="text-slate-900 bg-white">5,000+ (University Group)</option>
            </select>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-xs font-display font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
          Your Role
        </label>
        <div className="flex flex-wrap gap-2">
          {['Dean / Principal', 'HOD / Faculty', 'IT Administrator', 'Exam Controller'].map(
            (role) => (
              <button
                key={role}
                type="button"
                onClick={() => setForm({ ...form, role })}
                className={`px-3.5 py-1.5 rounded-full text-xs font-display font-semibold border transition-colors ${
                  form.role === role
                    ? 'bg-teal-500/10 border-teal-500 text-teal-700 dark:text-teal-300 font-bold'
                    : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10'
                }`}
              >
                {role}
              </button>
            ),
          )}
        </div>
      </div>

      <label className="flex items-start gap-3 p-3.5 rounded-xl bg-teal-50/60 dark:bg-teal-950/20 border border-teal-200/80 dark:border-teal-500/20 cursor-pointer">
        <input
          type="checkbox"
          checked={form.byos}
          onChange={(e) => setForm({ ...form, byos: e.target.checked })}
          className="mt-0.5 rounded border-teal-400 text-teal-600 focus:ring-teal-500"
        />
        <span className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
          <strong className="text-slate-900 dark:text-white">Enable BYOS (Bring Your Own Storage / Supabase):</strong>{' '}
          Keep 100% of exam papers and student records inside your college&apos;s own cloud database.
        </span>
      </label>

      <div>
        <label className="block text-xs font-display font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
          Deployment Notes or Questions
        </label>
        <textarea
          rows={3}
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          placeholder="Upcoming mid-sem dates, department roster size, or special requirements..."
          className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/25 focus:border-teal-500"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-teal-600 hover:bg-teal-700 text-white font-display font-bold text-sm shadow-md transition-all hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-60"
      >
        <span>{submitting ? 'Submitting Request...' : 'Book 15-Minute Founder Pilot Demo'}</span>
        <ArrowRight className="w-4 h-4" />
      </button>
    </form>
  );
}
