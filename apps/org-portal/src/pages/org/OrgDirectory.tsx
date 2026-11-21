import { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  FileSpreadsheet,
  Plus,
  Search,
  UploadCloud,
  UserPlus,
} from 'lucide-react';
import { supabase, useAuth } from '@colformly/auth';
import { useTheme } from '@colformly/theme';
import type { Course } from '@colformly/types';
import { BaseModal, Button } from '@colformly/ui';
import { PortalShell } from '../../layouts/PortalShell';
import { addTeacherApi } from '../../lib/workerClient';

interface DirectoryMember {
  id: string;
  name: string;
  email: string;
  role: 'ORG_ADMIN' | 'TEACHER' | 'STUDENT';
  section: string;
  sectionId?: string;
  rollNumber: string;
  status: 'Active' | 'Invited';
}

export default function OrgDirectory() {
  const { classes, cardRadius } = useTheme();
  const { activeOrg } = useAuth();

  const orgId = activeOrg?.id || 'a0000000-0000-0000-0000-000000000001';

  const [members, setMembers] = useState<DirectoryMember[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'TEACHER' | 'STUDENT'>('ALL');
  const [isDragging, setIsDragging] = useState(false);
  const [importNotice, setImportNotice] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Single Member Form State
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRole, setFormRole] = useState<'TEACHER' | 'STUDENT'>('STUDENT');
  const [formRoll, setFormRoll] = useState('');
  const [formSectionId, setFormSectionId] = useState('');
  const [formTeacherAuthMode, setFormTeacherAuthMode] = useState<'GOOGLE' | 'PASSWORD'>('GOOGLE');
  const [formTeacherPassword, setFormTeacherPassword] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDirectory = async () => {
    try {
      setLoading(true);
      // Fetch members and courses in parallel
      const [{ data: usersData, error: uErr }, { data: coursesData }] = await Promise.all([
        (supabase.from('org_users') as any)
          .select('*, users(full_name, email), courses(name, code, section, level)')
          .eq('org_id', orgId)
          .order('created_at', { ascending: false }),
        (supabase.from('courses') as any).select('*').eq('org_id', orgId).order('name'),
      ]);

      if (uErr) throw uErr;

      const courseList = (coursesData as Course[]) || [];
      setCourses(courseList);

      const courseMap = new Map<string, Course>(courseList.map((c) => [c.id, c]));

      const mapped: DirectoryMember[] = (usersData || []).map((row: any) => {
        const u = row.users;
        const name = u?.full_name || row.invited_name || row.invited_email?.split('@')[0] || 'Member';
        const email = u?.email || row.invited_email || '—';
        const secCourse = row.section_id ? courseMap.get(row.section_id) : undefined;
        const sectionDisplay = secCourse
          ? `${secCourse.name || `Section ${secCourse.section}`}`
          : row.role === 'TEACHER'
            ? 'Faculty / Dept'
            : 'Unassigned Section';

        const status: 'Active' | 'Invited' =
          row.user_id && row.onboarding_completed ? 'Active' : 'Invited';

        return {
          id: row.id,
          name,
          email,
          role: row.role,
          section: sectionDisplay,
          sectionId: row.section_id,
          rollNumber: row.roll_number || '—',
          status,
        };
      });

      setMembers(mapped);
    } catch (err) {
      console.warn('Error loading directory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDirectory();
  }, [orgId]);

  // Bulk CSV parser and database writer
  const parseCsvText = async (text: string, fileName: string) => {
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    const rowsToInsert: any[] = [];
    lines.forEach((line, idx) => {
      if (idx === 0 && line.toLowerCase().includes('email')) return; // skip header
      const [name, email, roleRaw, sectionName, rollNumber] = line.split(',').map((s) => s.trim());
      if (!email || !email.includes('@')) return;

      const role =
        roleRaw?.toUpperCase() === 'TEACHER'
          ? 'TEACHER'
          : roleRaw?.toUpperCase() === 'ORG_ADMIN'
            ? 'ORG_ADMIN'
            : 'STUDENT';

      // Match section by name if possible
      const matchedSection = courses.find(
        (c) =>
          c.level === 'SECTION' &&
          (c.name?.toLowerCase() === sectionName?.toLowerCase() ||
            c.section?.toLowerCase() === sectionName?.toLowerCase()),
      );

      rowsToInsert.push({
        org_id: orgId,
        role,
        invited_email: email.toLowerCase(),
        invited_name: name || email.split('@')[0],
        roll_number: rollNumber || null,
        section_id: matchedSection?.id || null,
        is_active: true,
        onboarding_completed: false,
      });
    });

    if (rowsToInsert.length === 0) {
      setImportNotice(`No valid rows found in ${fileName}. Format: name, email, role, section, roll`);
      return;
    }

    try {
      setLoading(true);
      const { error } = await (supabase.from('org_users') as any).insert(rowsToInsert);
      if (error) throw error;

      setImportNotice(`Successfully whitelisted ${rowsToInsert.length} member(s) from ${fileName}.`);
      await loadDirectory();
    } catch (err: any) {
      console.error('CSV import error:', err);
      setImportNotice(`Error saving batch: ${err.message || 'Check database permissions'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFiles = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => void parseCsvText(String(reader.result || ''), file.name);
    reader.readAsText(file);
  };

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formEmail.trim()) return;

    try {
      setSubmitting(true);

      if (formRole === 'TEACHER') {
        const res = await addTeacherApi({
          orgId,
          email: formEmail.trim().toLowerCase(),
          fullName: formName.trim() || undefined,
          sectionId: formSectionId || undefined,
          authMode: formTeacherAuthMode,
          password: formTeacherAuthMode === 'PASSWORD' ? formTeacherPassword : undefined,
        });

        setImportNotice(res.message || `Successfully provisioned faculty ${formEmail}.`);
      } else {
        const { error } = await (supabase.from('org_users') as any).insert({
          org_id: orgId,
          role: 'STUDENT',
          invited_email: formEmail.trim().toLowerCase(),
          invited_name: formName.trim() || formEmail.split('@')[0],
          roll_number: formRoll.trim() || null,
          section_id: formSectionId || null,
          is_active: true,
          onboarding_completed: false,
        });

        if (error) throw error;
        setImportNotice(`Added student ${formEmail} to organization directory.`);
      }

      setFormName('');
      setFormEmail('');
      setFormRoll('');
      setFormSectionId('');
      setFormTeacherPassword('');
      setModalOpen(false);
      await loadDirectory();
    } catch (err: any) {
      console.error('Member provisioning error:', err);
      alert(`Error provisioning member: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const simulateSampleCsv = () => {
    const sample = [
      'name,email,role,section,roll',
      'Ananya Sharma,ananya.s@aravali.edu.in,STUDENT,Section A,24CSE088',
      'Kabir Mehta,kabir.m@aravali.edu.in,STUDENT,Section B,24CSE089',
      'Prof. Deepak Joshi,d.joshi@aravali.edu.in,TEACHER,Section A,FAC-142',
    ].join('\n');
    void parseCsvText(sample, 'aravali_faculty_students_batch.csv');
  };

  const filtered = members.filter((m) => {
    const matchesRole = roleFilter === 'ALL' || m.role === roleFilter;
    const matchesQuery =
      !query.trim() ||
      m.name.toLowerCase().includes(query.toLowerCase()) ||
      m.email.toLowerCase().includes(query.toLowerCase()) ||
      m.rollNumber.toLowerCase().includes(query.toLowerCase()) ||
      m.section.toLowerCase().includes(query.toLowerCase());
    return matchesRole && matchesQuery;
  });

  const availableSections = courses.filter((c) => c.level === 'SECTION');

  return (
    <PortalShell persona="org">
      <div className="space-y-7">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="font-label text-xs text-primary font-bold uppercase tracking-wider mb-1">
              Identity &amp; Bulk Provisioning • Live Supabase Roster
            </p>
            <h1 className="font-headline font-bold text-2xl sm:text-3xl text-slate-900">
              Teacher &amp; Student Directory
            </h1>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              size="sm"
              variant="outline"
              leftIcon={<UserPlus className="w-4 h-4" />}
              onClick={simulateSampleCsv}
            >
              Batch Sample CSV
            </Button>
            <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setModalOpen(true)}>
              Whitelist Member
            </Button>
          </div>
        </header>

        {/* CSV DROPZONE */}
        <section
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            handleFiles(e.dataTransfer.files?.[0]);
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`cursor-pointer border-2 border-dashed p-8 text-center transition-all ${cardRadius} ${
            isDragging
              ? 'border-primary bg-teal-50/70 scale-[1.01]'
              : 'border-slate-300 bg-white hover:border-primary/70 hover:bg-teal-50/30'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files?.[0])}
          />
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
            <UploadCloud className="w-6 h-6" />
          </div>
          <h2 className="font-headline font-bold text-base text-slate-900">
            Drop Teacher or Student CSV Roster Here
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Directly populates <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">public.org_users</code>. Format:{' '}
            <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">
              name, email, role, section, roll
            </code>
          </p>
          <div className="mt-4 inline-flex items-center gap-2 text-xs font-label font-bold text-primary">
            <FileSpreadsheet className="w-4 h-4" />
            <span>Click to browse .csv file</span>
          </div>
        </section>

        {importNotice && (
          <div className="p-3.5 rounded-2xl bg-teal-50 border border-teal-200 text-teal-900 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
            <span>{importNotice}</span>
          </div>
        )}

        {/* Roster Table Card */}
        <section className={`overflow-hidden ${classes.card}`}>
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, email, roll, or section..."
                className={`w-full pl-10 pr-4 py-2 text-sm ${classes.input}`}
              />
            </div>

            <div className="flex items-center gap-1.5">
              {(['ALL', 'TEACHER', 'STUDENT'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRoleFilter(r)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-label font-bold transition-colors ${
                    roleFilter === r
                      ? 'bg-primary text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {r === 'ALL' ? `All (${members.length})` : r}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-500 font-label">
              Querying live Supabase directory...
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-slate-500 font-label">
              No members match the current search filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-label uppercase tracking-wider text-slate-500">
                    <th className="py-3.5 px-5">Member</th>
                    <th className="py-3.5 px-5">Role</th>
                    <th className="py-3.5 px-5">Cohort / Dept</th>
                    <th className="py-3.5 px-5">Roll / ID</th>
                    <th className="py-3.5 px-5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-5">
                        <p className="font-headline font-semibold text-slate-900">{m.name}</p>
                        <p className="text-xs text-slate-500 font-mono">{m.email}</p>
                      </td>
                      <td className="py-3.5 px-5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-label font-bold border ${
                            m.role === 'TEACHER'
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : m.role === 'ORG_ADMIN'
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-teal-50 text-primary border-teal-200'
                          }`}
                        >
                          {m.role}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-xs text-slate-700">{m.section}</td>
                      <td className="py-3.5 px-5 font-mono text-xs text-slate-600">{m.rollNumber}</td>
                      <td className="py-3.5 px-5">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                            m.status === 'Active' ? 'text-emerald-700' : 'text-amber-700'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              m.status === 'Active' ? 'bg-emerald-600' : 'bg-amber-500'
                            }`}
                          />
                          {m.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Modal: Whitelist Single Member */}
        <BaseModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Whitelist Organization Member"
          description="Pre-approves a faculty or student email into public.org_users so they are linked upon login."
        >
          <form onSubmit={handleSingleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-label font-semibold text-slate-700 mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Prof. Sarah Mitchell or Alex Verma"
                className={`w-full px-3.5 py-2.5 text-sm ${classes.input}`}
              />
            </div>

            <div>
              <label className="block text-xs font-label font-semibold text-slate-700 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                required
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="name@aravali.edu.in"
                className={`w-full px-3.5 py-2.5 text-sm ${classes.input}`}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-label font-semibold text-slate-700 mb-1.5">
                  Role
                </label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value as 'TEACHER' | 'STUDENT')}
                  className={`w-full px-3.5 py-2.5 text-sm ${classes.input}`}
                >
                  <option value="STUDENT">STUDENT</option>
                  <option value="TEACHER">TEACHER</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-label font-semibold text-slate-700 mb-1.5">
                  Roll / Faculty ID
                </label>
                <input
                  type="text"
                  value={formRoll}
                  onChange={(e) => setFormRoll(e.target.value)}
                  placeholder="24CSE041 or FAC-104"
                  className={`w-full px-3.5 py-2.5 text-sm ${classes.input}`}
                />
              </div>
            </div>

            {formRole === 'TEACHER' && (
              <div className="p-3.5 rounded-xl border border-primary/20 bg-primary/5 space-y-3">
                <div>
                  <label className="block text-xs font-label font-semibold text-slate-800 mb-1">
                    Faculty Authentication Mode
                  </label>
                  <select
                    value={formTeacherAuthMode}
                    onChange={(e) => setFormTeacherAuthMode(e.target.value as 'GOOGLE' | 'PASSWORD')}
                    className={`w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg`}
                  >
                    <option value="GOOGLE">Google SSO Invite (Magic Auto-Join)</option>
                    <option value="PASSWORD">Email + Direct Password</option>
                  </select>
                </div>

                {formTeacherAuthMode === 'PASSWORD' && (
                  <div>
                    <label className="block text-xs font-label font-semibold text-slate-800 mb-1">
                      Initial Faculty Password
                    </label>
                    <input
                      type="password"
                      required
                      value={formTeacherPassword}
                      onChange={(e) => setFormTeacherPassword(e.target.value)}
                      placeholder="At least 6 characters (e.g. Faculty@2026!)"
                      className={`w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg`}
                    />
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-xs font-label font-semibold text-slate-700 mb-1.5">
                Assign Section (Optional)
              </label>
              <select
                value={formSectionId}
                onChange={(e) => setFormSectionId(e.target.value)}
                className={`w-full px-3.5 py-2.5 text-sm ${classes.input}`}
              >
                <option value="">Unassigned</option>
                {availableSections.map((sec) => (
                  <option key={sec.id} value={sec.id}>
                    {sec.name} ({sec.section || 'A'})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Saving...' : 'Whitelist Member'}
              </Button>
            </div>
          </form>
        </BaseModal>
      </div>
    </PortalShell>
  );
}
