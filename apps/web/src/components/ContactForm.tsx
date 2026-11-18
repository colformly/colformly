import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Building2, CheckCircle2, Mail, Users } from 'lucide-react';

export default function ContactForm() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    college: '',
    role: 'Dean / Principal',
    studentCount: '1,000 - 5,000',
    byos: true,
    notes: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-3xl bg-white border border-teal-200 shadow-floating-mockup p-8 sm:p-10 text-center space-y-4"
      >
        <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-light-primary mx-auto">
          <CheckCircle2 className="w-7 h-7" />
        </div>
        <h2 className="font-headline font-bold text-2xl text-slate-900">
          Campus Pilot Request Received
        </h2>
        <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
          Thanks, <span className="font-semibold text-slate-900">{form.fullName}</span>! Our founder
          engineering team will reach out to{' '}
          <span className="font-mono text-light-primary">{form.email}</span> within 4 business hours
          to provision <span className="font-semibold text-slate-900">{form.college}</span>.
        </p>
        <button
          type="button"
          onClick={() => setSubmitted(false)}
          className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full border border-slate-300 text-xs font-label font-semibold text-slate-700 hover:bg-slate-50"
        >
          Submit another inquiry
        </button>
      </motion.div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl bg-white border border-slate-200/90 shadow-floating-mockup p-7 sm:p-9 space-y-5"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-label font-semibold text-slate-700 mb-1.5">
            Your Name *
          </label>
          <input
            type="text"
            required
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            placeholder="Dr. Rajesh Sharma"
            className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-light-primary/25 focus:border-light-primary"
          />
        </div>
        <div>
          <label className="block text-xs font-label font-semibold text-slate-700 mb-1.5">
            Official Campus Email *
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="hod.cse@college.edu.in"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-light-primary/25 focus:border-light-primary"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-label font-semibold text-slate-700 mb-1.5">
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
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-light-primary/25 focus:border-light-primary"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-label font-semibold text-slate-700 mb-1.5">
            Active Student Strength
          </label>
          <div className="relative">
            <Users className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <select
              value={form.studentCount}
              onChange={(e) => setForm({ ...form, studentCount: e.target.value })}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-light-primary/25 focus:border-light-primary"
            >
              <option>Under 500</option>
              <option>500 - 1,000</option>
              <option>1,000 - 5,000</option>
              <option>5,000+ (University Group)</option>
            </select>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-xs font-label font-semibold text-slate-700 mb-1.5">
          Your Role
        </label>
        <div className="flex flex-wrap gap-2">
          {['Dean / Principal', 'HOD / Faculty', 'IT Administrator', 'Exam Controller'].map(
            (role) => (
              <button
                key={role}
                type="button"
                onClick={() => setForm({ ...form, role })}
                className={`px-3.5 py-1.5 rounded-full text-xs font-label font-semibold border transition-colors ${
                  form.role === role
                    ? 'bg-teal-50 border-light-primary text-light-primary'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {role}
              </button>
            ),
          )}
        </div>
      </div>

      <label className="flex items-start gap-3 p-3.5 rounded-xl bg-teal-50/60 border border-teal-200/80 cursor-pointer">
        <input
          type="checkbox"
          checked={form.byos}
          onChange={(e) => setForm({ ...form, byos: e.target.checked })}
          className="mt-0.5 rounded border-teal-400 text-light-primary focus:ring-light-primary"
        />
        <span className="text-xs text-slate-700 leading-relaxed">
          <strong className="text-slate-900">Enable BYOS (Bring Your Own Storage / Supabase):</strong>{' '}
          Keep 100% of exam papers and student records inside our college&apos;s own cloud tenant.
        </span>
      </label>

      <div>
        <label className="block text-xs font-label font-semibold text-slate-700 mb-1.5">
          Deployment Timeline or Questions
        </label>
        <textarea
          rows={3}
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          placeholder="Tell us about your upcoming mid-sem exams or CSV roster size..."
          className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-light-primary/25 focus:border-light-primary"
        />
      </div>

      <button
        type="submit"
        className="w-full inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-light-primary hover:bg-[#0D655E] text-white font-label font-bold text-sm shadow-sm transition-all hover:-translate-y-0.5 active:scale-[0.98]"
      >
        <span>Book 15-Minute Founder Demo</span>
        <ArrowRight className="w-4 h-4" />
      </button>
    </form>
  );
}
