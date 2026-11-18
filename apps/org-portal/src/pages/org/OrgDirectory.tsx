import { useRef, useState } from 'react';
import { CheckCircle2, FileSpreadsheet, Search, UploadCloud, UserPlus } from 'lucide-react';
import { useTheme } from '@colformly/theme';
import { Button } from '@colformly/ui';
import { PortalShell } from '../../layouts/PortalShell';

interface DirectoryMember {
  id: string;
  name: string;
  email: string;
  role: 'ORG_ADMIN' | 'TEACHER' | 'STUDENT';
  section: string;
  rollNumber: string;
  status: 'Active' | 'Invited';
}

const INITIAL_MEMBERS: DirectoryMember[] = [
  { id: '1', name: 'Prof. Sarah Mitchell', email: 's.mitchell@aravali.edu.in', role: 'TEACHER', section: 'CSE Dept', rollNumber: 'FAC-104', status: 'Active' },
  { id: '2', name: 'Dr. Vikram Rao', email: 'v.rao@aravali.edu.in', role: 'TEACHER', section: 'ECE Dept', rollNumber: 'FAC-118', status: 'Active' },
  { id: '3', name: 'Alex Verma', email: 'alex.verma@aravali.edu.in', role: 'STUDENT', section: 'B.Tech CSE • Y2 Sec-A', rollNumber: '24CSE041', status: 'Active' },
  { id: '4', name: 'Priya Nair', email: 'priya.nair@aravali.edu.in', role: 'STUDENT', section: 'B.Tech CSE • Y2 Sec-A', rollNumber: '24CSE019', status: 'Active' },
  { id: '5', name: 'Rohan Kulkarni', email: 'rohan.k@aravali.edu.in', role: 'STUDENT', section: 'B.Tech CSE • Y2 Sec-B', rollNumber: '24CSE108', status: 'Invited' },
];

export default function OrgDirectory() {
  const { classes, cardRadius } = useTheme();
  const [members, setMembers] = useState<DirectoryMember[]>(INITIAL_MEMBERS);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'TEACHER' | 'STUDENT'>('ALL');
  const [isDragging, setIsDragging] = useState(false);
  const [importNotice, setImportNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseCsvText = (text: string, fileName: string) => {
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    const parsed: DirectoryMember[] = [];
    lines.forEach((line, idx) => {
      if (idx === 0 && line.toLowerCase().includes('email')) return; // Skip header row
      const [name, email, roleRaw, section, rollNumber] = line.split(',').map((s) => s.trim());
      if (!email) return;
      const role =
        roleRaw?.toUpperCase() === 'TEACHER'
          ? 'TEACHER'
          : roleRaw?.toUpperCase() === 'ORG_ADMIN'
            ? 'ORG_ADMIN'
            : 'STUDENT';
      parsed.push({
        id: `csv-${Date.now()}-${idx}`,
        name: name || email.split('@')[0],
        email,
        role,
        section: section || 'B.Tech CSE • Y1 Sec-A',
        rollNumber: rollNumber || `CSV-${100 + idx}`,
        status: 'Invited',
      });
    });

    if (parsed.length > 0) {
      setMembers((prev) => [...parsed, ...prev]);
      setImportNotice(`Imported ${parsed.length} member(s) from ${fileName} (org_id isolated).`);
    } else {
      setImportNotice(`No valid rows found in ${fileName}. Expected: name,email,role,section,roll`);
    }
  };

  const handleFiles = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => parseCsvText(String(reader.result || ''), file.name);
    reader.readAsText(file);
  };

  const simulateSampleCsv = () => {
    const sample = [
      'name,email,role,section,roll',
      'Ananya Sharma,ananya.s@aravali.edu.in,STUDENT,B.Tech CSE • Y2 Sec-A,24CSE088',
      'Kabir Mehta,kabir.m@aravali.edu.in,STUDENT,B.Tech CSE • Y2 Sec-A,24CSE089',
      'Prof. Deepak Joshi,d.joshi@aravali.edu.in,TEACHER,CSE Dept,FAC-142',
    ].join('\n');
    parseCsvText(sample, 'aravali_sem4_roster.csv');
  };

  const filtered = members.filter((m) => {
    const matchesRole = roleFilter === 'ALL' || m.role === roleFilter;
    const matchesQuery =
      !query.trim() ||
      m.name.toLowerCase().includes(query.toLowerCase()) ||
      m.email.toLowerCase().includes(query.toLowerCase()) ||
      m.rollNumber.toLowerCase().includes(query.toLowerCase());
    return matchesRole && matchesQuery;
  });

  return (
    <PortalShell persona="org">
      <div className="space-y-7">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="font-label text-xs text-primary font-bold uppercase tracking-wider mb-1">
              Identity &amp; Bulk Provisioning
            </p>
            <h1 className="font-headline font-bold text-2xl sm:text-3xl text-slate-900">
              Teacher &amp; Student Directory
            </h1>
          </div>

          <Button size="sm" leftIcon={<UserPlus className="w-4 h-4" />} onClick={simulateSampleCsv}>
            Load Sample CSV Batch
          </Button>
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
            Supports up to 5,000 rows per batch. Columns:{' '}
            <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">
              name, email, role, section, roll_number
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
                placeholder="Search by name, email, or roll..."
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
        </section>
      </div>
    </PortalShell>
  );
}
