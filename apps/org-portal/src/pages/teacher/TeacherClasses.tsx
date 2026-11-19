import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  GraduationCap,
  Layers,
  Mail,
  Plus,
  Send,
  Sparkles,
} from 'lucide-react';
import { supabase, useAuth } from '@colformly/auth';
import { useTheme } from '@colformly/theme';
import type { Course } from '@colformly/types';
import { BaseModal, Button, MetricCard } from '@colformly/ui';
import { PortalShell } from '../../layouts/PortalShell';

interface DisplayAssignment {
  id: string;
  subject_name: string;
  course_name: string;
  year_name: string;
  section_name: string;
  section_id: string;
}

const DEFAULT_ASSIGNMENTS: DisplayAssignment[] = [
  {
    id: 'seed-assign-1',
    subject_name: 'Design & Analysis of Algorithms',
    course_name: 'B.Tech Computer Science & Engineering',
    year_name: 'Year 2 (Sophomore)',
    section_name: 'Section A',
    section_id: 'c2000000-0000-0000-0000-000000000001',
  },
  {
    id: 'seed-assign-2',
    subject_name: 'Operating Systems & Concurrency',
    course_name: 'B.Tech Computer Science & Engineering',
    year_name: 'Year 2 (Sophomore)',
    section_name: 'Section B',
    section_id: 'c2000000-0000-0000-0000-000000000002',
  },
];

const TOPIC_AUTOPSY = [
  { topic: 'Dynamic Programming (0/1 Knapsack)', accuracy: 42, missedBy: 37, severity: 'critical' },
  { topic: 'OS Deadlock Avoidance (Banker Alg)', accuracy: 54, missedBy: 29, severity: 'warning' },
  { topic: 'Red-Black & AVL Tree Rotations', accuracy: 69, missedBy: 20, severity: 'moderate' },
  { topic: 'Graph Traversals (BFS / Dijkstra)', accuracy: 88, missedBy: 8, severity: 'healthy' },
  { topic: 'Time Complexity Master Theorem', accuracy: 93, missedBy: 4, severity: 'healthy' },
];

const INTERVENTION_LIST = [
  { id: 's1', name: 'Rohan Kulkarni', roll: '24CSE108', score: '41%', weakTopic: 'Dynamic Programming', tabSwitches: 2 },
  { id: 's2', name: 'Meera Joshi', roll: '24CSE074', score: '46%', weakTopic: 'OS Deadlocks', tabSwitches: 0 },
  { id: 's3', name: 'Siddharth Rao', roll: '24CSE092', score: '52%', weakTopic: 'Dynamic Programming', tabSwitches: 1 },
];

export default function TeacherClasses() {
  const { classes } = useTheme();
  const { user, activeOrg } = useAuth();

  const [cohort, setCohort] = useState('CSE Sec-A (Algorithms)');
  const [messageTarget, setMessageTarget] = useState<(typeof INTERVENTION_LIST)[number] | null>(null);
  const [messageBody, setMessageBody] = useState('');
  const [sentIds, setSentIds] = useState<Record<string, boolean>>({});

  // Class Claiming & Live DB State
  const [assignments, setAssignments] = useState<DisplayAssignment[]>(DEFAULT_ASSIGNMENTS);
  const [courses, setCourses] = useState<Course[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [subjectInput, setSubjectInput] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedYearId, setSelectedYearId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);

  // Load live assignments & courses
  const loadData = async () => {
    try {
      const [{ data: coursesData }, { data: assignData }] = await Promise.all([
        (supabase.from('courses') as any).select('*').order('name'),
        (supabase.from('teacher_assignments') as any).select('*').order('created_at', { ascending: false }),
      ]);

      const allCourses = (coursesData as Course[]) || [];
      if (allCourses.length > 0) {
        setCourses(allCourses);
      }

      if (assignData && assignData.length > 0) {
        const courseMap = new Map<string, Course>(allCourses.map((c) => [c.id, c]));
        const formatted: DisplayAssignment[] = (assignData as Array<{ id: string; subject_name: string; section_id: string }>).map((a) => {
          const sec = courseMap.get(a.section_id);
          const yr = sec?.parent_id ? courseMap.get(sec.parent_id) : undefined;
          const crs = yr?.parent_id ? courseMap.get(yr.parent_id) : undefined;
          return {
            id: a.id,
            subject_name: a.subject_name,
            course_name: crs?.name || 'B.Tech Computer Science',
            year_name: yr?.name || 'Year 2 (Sophomore)',
            section_name: sec?.name || 'Section A',
            section_id: a.section_id,
          };
        });
        setAssignments(formatted);
      }
    } catch (err) {
      console.warn('Error loading teacher classes:', err);
    }
  };

  useEffect(() => {
    void loadData();
  }, [user]);

  // Cascading options
  const courseOptions = courses.filter((c) => c.level === 'COURSE');
  const yearOptions = courses.filter(
    (c) => c.level === 'YEAR' && (!selectedCourseId || c.parent_id === selectedCourseId),
  );
  const sectionOptions = courses.filter(
    (c) => c.level === 'SECTION' && (!selectedYearId || c.parent_id === selectedYearId),
  );

  useEffect(() => {
    if (courseOptions.length > 0 && !selectedCourseId) {
      setSelectedCourseId(courseOptions[0].id);
    }
  }, [courseOptions, selectedCourseId]);

  useEffect(() => {
    if (yearOptions.length > 0 && (!selectedYearId || !yearOptions.some((y) => y.id === selectedYearId))) {
      setSelectedYearId(yearOptions[0].id);
    }
  }, [yearOptions, selectedYearId]);

  useEffect(() => {
    if (sectionOptions.length > 0 && (!selectedSectionId || !sectionOptions.some((s) => s.id === selectedSectionId))) {
      setSelectedSectionId(sectionOptions[0].id);
    }
  }, [sectionOptions, selectedSectionId]);

  const handleClaimClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectInput.trim() || !selectedSectionId) {
      setClaimError('Please provide a subject name and select an assigned section.');
      return;
    }

    setClaiming(true);
    setClaimError(null);

    const orgId = activeOrg?.id || 'a0000000-0000-0000-0000-000000000001';
    const teacherId = user?.id || 'd9f9acff-eb5e-478e-9c38-269cb136cda0';

    try {
      const { error: insertErr } = await (supabase.from('teacher_assignments') as any).insert({
        org_id: orgId,
        teacher_id: teacherId,
        section_id: selectedSectionId,
        subject_name: subjectInput.trim(),
      });

      if (insertErr) {
        setClaimError(insertErr.message);
        setClaiming(false);
        return;
      }

      await loadData();
      setSubjectInput('');
      setModalOpen(false);
      setClaiming(false);
    } catch (err) {
      setClaimError(err instanceof Error ? err.message : 'Failed to claim class.');
      setClaiming(false);
    }
  };

  const openMessage = (student: (typeof INTERVENTION_LIST)[number]) => {
    setMessageTarget(student);
    setMessageBody(
      `Hi ${student.name.split(' ')[0]}, I noticed ${student.weakTopic} was tricky on the midterm. Let's review it during Thursday's 4 PM lab clinic!`,
    );
  };

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageTarget) return;
    setSentIds((prev) => ({ ...prev, [messageTarget.id]: true }));
    setMessageTarget(null);
  };

  return (
    <PortalShell persona="teacher">
      <div className="space-y-8">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="font-label text-xs text-primary font-bold uppercase tracking-wider mb-1">
              Diagnostic Intelligence &amp; Multi-Teacher Roster
            </p>
            <h1 className="font-headline font-bold text-2xl sm:text-3xl text-slate-900">
              Class Averages, Topic Autopsy &amp; Cohort Claims
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={cohort}
              onChange={(e) => setCohort(e.target.value)}
              className={`px-4 py-2 text-xs font-label font-semibold ${classes.input}`}
            >
              {assignments.map((a) => (
                <option key={a.id} value={`${a.subject_name} (${a.section_name})`}>
                  {a.subject_name} • {a.section_name}
                </option>
              ))}
              <option value="All Enrolled Cohorts">All Enrolled Cohorts</option>
            </select>

            <Button
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => setModalOpen(true)}
            >
              + Add My Class
            </Button>
          </div>
        </header>

        {/* Claimed Cohort Cards */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-headline font-bold text-sm text-slate-700 flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              <span>Claimed Teaching Cohorts ({assignments.length})</span>
            </h2>
            <span className="text-xs text-slate-500 font-mono">Live RLS Multi-Teacher Access</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assignments.map((assign) => (
              <div
                key={assign.id}
                className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:border-primary/40 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-primary text-[10px] font-bold uppercase">
                      {assign.section_name}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      {assign.year_name.split(' ')[0]}
                    </span>
                  </div>
                  <h3 className="font-headline font-bold text-base text-slate-900 leading-snug">
                    {assign.subject_name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                    {assign.course_name}
                  </p>
                </div>
                <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <GraduationCap className="w-4 h-4 text-primary" />
                    <span>64 Students Enrolled</span>
                  </span>
                  <span className="font-label font-bold text-primary hover:underline cursor-pointer">
                    View Autopsy →
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Summary Strip */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard title="Exam Takers" value="128" delta="100% submitted" trend="up" />
          <MetricCard title="Median Score" value="74.2%" delta="+3.1%" trend="up" />
          <MetricCard title="Weakest Topic" value="42%" delta="DP Recurrence" trend="down" />
          <MetricCard title="Intervention Needed" value="3 Students" delta="< 55% score" trend="down" />
        </section>

        {/* 2-Column Topic Autopsy + Intervention List */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Topic Autopsy */}
          <div className={`lg:col-span-7 p-6 space-y-5 ${classes.card}`}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-headline font-bold text-lg text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <span>Topic Autopsy ({cohort})</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Auto-grouped by syllabus tag from <code className="font-mono">test_answer_keys.topic</code>
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {TOPIC_AUTOPSY.map((item) => {
                const barColor =
                  item.severity === 'critical'
                    ? 'bg-rose-500'
                    : item.severity === 'warning'
                      ? 'bg-amber-500'
                      : item.severity === 'moderate'
                        ? 'bg-sky-500'
                        : 'bg-primary';
                return (
                  <div key={item.topic} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs gap-2">
                      <span className="font-headline font-semibold text-slate-900">
                        {item.topic}
                      </span>
                      <span className="font-mono text-slate-600 shrink-0">
                        <strong className="text-slate-900">{item.accuracy}%</strong> accuracy •{' '}
                        {item.missedBy} missed
                      </span>
                    </div>
                    <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${barColor}`}
                        style={{ width: `${item.accuracy}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Intervention Needed List */}
          <div className={`lg:col-span-5 p-6 space-y-4 ${classes.card}`}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-headline font-bold text-lg text-slate-900 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  <span>Intervention Needed</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Students scoring below 55% or showing anti-cheat flags
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {INTERVENTION_LIST.map((s) => (
                <div
                  key={s.id}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-headline font-bold text-sm text-slate-900 truncate">
                        {s.name}
                      </p>
                      <span className="font-mono text-[11px] font-bold text-rose-600">
                        {s.score}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 truncate">
                      {s.roll} • Struggled on <strong className="text-slate-700">{s.weakTopic}</strong>
                    </p>
                    {s.tabSwitches > 0 && (
                      <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold">
                        {s.tabSwitches} tab switch flag(s)
                      </span>
                    )}
                  </div>

                  {sentIds[s.id] ? (
                    <span className="inline-flex items-center gap-1 text-xs font-label font-bold text-emerald-700 shrink-0">
                      <CheckCircle2 className="w-4 h-4" /> Sent
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      leftIcon={<Mail className="w-3.5 h-3.5" />}
                      onClick={() => openMessage(s)}
                    >
                      Message
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* + Add My Class Modal */}
        <BaseModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Claim Class / Subject Cohort"
          description="Associate your faculty account with a specific Course, Year, and Section to author targeted tests and view analytics."
        >
          {claimError && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              {claimError}
            </div>
          )}

          <form onSubmit={handleClaimClass} className="space-y-4">
            <div>
              <label className="block text-xs font-label font-bold text-slate-700 mb-1.5">
                Subject Name
              </label>
              <input
                type="text"
                required
                value={subjectInput}
                onChange={(e) => setSubjectInput(e.target.value)}
                placeholder="e.g. Distributed Database Systems"
                className={`w-full px-4 py-2.5 text-sm ${classes.input}`}
              />
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-label font-bold text-slate-700 mb-1.5">
                  Degree / Course
                </label>
                <select
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  className={`w-full px-4 py-2.5 text-xs font-semibold ${classes.input}`}
                >
                  {courseOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.code ? `(${c.code})` : ''}
                    </option>
                  ))}
                  {courseOptions.length === 0 && (
                    <option value="demo-crs">B.Tech Computer Science &amp; Engineering</option>
                  )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-label font-bold text-slate-700 mb-1.5">
                    Academic Year
                  </label>
                  <select
                    value={selectedYearId}
                    onChange={(e) => setSelectedYearId(e.target.value)}
                    className={`w-full px-4 py-2.5 text-xs font-semibold ${classes.input}`}
                  >
                    {yearOptions.map((y) => (
                      <option key={y.id} value={y.id}>
                        {y.name}
                      </option>
                    ))}
                    {yearOptions.length === 0 && (
                      <option value="demo-yr">Year 2 (Sophomore)</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-label font-bold text-slate-700 mb-1.5">
                    Class Section
                  </label>
                  <select
                    value={selectedSectionId}
                    onChange={(e) => setSelectedSectionId(e.target.value)}
                    className={`w-full px-4 py-2.5 text-xs font-semibold ${classes.input}`}
                  >
                    {sectionOptions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                    {sectionOptions.length === 0 && (
                      <option value="demo-s">Section A</option>
                    )}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" isLoading={claiming} leftIcon={<CheckCircle2 className="w-4 h-4" />}>
                Claim Class Cohort
              </Button>
            </div>
          </form>
        </BaseModal>

        {/* Message Student Modal */}
        <BaseModal
          open={Boolean(messageTarget)}
          onClose={() => setMessageTarget(null)}
          title={messageTarget ? `Message ${messageTarget.name}` : ''}
          description="Send a targeted remedial study note directly to the student's portal inbox."
        >
          <form onSubmit={sendMessage} className="space-y-4">
            <textarea
              rows={4}
              required
              value={messageBody}
              onChange={(e) => setMessageBody(e.target.value)}
              className={`w-full p-3.5 text-sm ${classes.input}`}
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setMessageTarget(null)}>
                Cancel
              </Button>
              <Button type="submit" leftIcon={<Send className="w-4 h-4" />}>
                Send Intervention Note
              </Button>
            </div>
          </form>
        </BaseModal>
      </div>
    </PortalShell>
  );
}
