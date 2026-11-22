import { useEffect, useState } from 'react';
import { BookOpen, ChevronDown, ChevronRight, FolderTree, Plus, Trash2, Users } from 'lucide-react';
import { supabase, useAuth } from '@colformly/auth';
import { useTheme } from '@colformly/theme';
import type { Course } from '@colformly/types';
import { BaseModal, Button } from '@colformly/ui';
import { PortalShell } from '../../layouts/PortalShell';

interface SectionNode {
  id: string;
  name: string;
  sectionCode: string;
  students: number;
}

interface YearNode {
  id: string;
  label: string;
  yearNumber: number;
  sections: SectionNode[];
}

interface CourseTree {
  id: string;
  code: string;
  name: string;
  degreeCode?: string | null;
  durationYears?: number | null;
  years: YearNode[];
}

export default function OrgCourses() {
  const { classes, cardRadius } = useTheme();
  const { activeOrg } = useAuth();

  const [tree, setTree] = useState<CourseTree[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCourses, setOpenCourses] = useState<Record<string, boolean>>({});
  const [openYears, setOpenYears] = useState<Record<string, boolean>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [newCourseName, setNewCourseName] = useState('');
  const [newCourseCode, setNewCourseCode] = useState('');
  const [newDegreeCode, setNewDegreeCode] = useState('BTECH');
  const [newDurationYears, setNewDurationYears] = useState(4);
  const [submitting, setSubmitting] = useState(false);

  const orgId = activeOrg?.id || 'a0000000-0000-0000-0000-000000000001';

  const loadCourses = async () => {
    try {
      setLoading(true);
      // 1. Fetch all courses for this org
      const { data: coursesData, error: coursesError } = await (supabase.from('courses') as any)
        .select('*')
        .eq('org_id', orgId)
        .order('name');

      if (coursesError) throw coursesError;
      const allRows = (coursesData as Course[]) || [];

      // 2. Fetch student enrollment count per section
      const { data: enrollmentData } = await (supabase.from('org_users') as any)
        .select('section_id')
        .eq('org_id', orgId)
        .not('section_id', 'is', null);

      const countMap: Record<string, number> = {};
      (enrollmentData || []).forEach((row: { section_id: string }) => {
        if (row.section_id) {
          countMap[row.section_id] = (countMap[row.section_id] || 0) + 1;
        }
      });

      // 3. Build tree
      const courseRows = allRows.filter((r) => r.level === 'COURSE' || !r.parent_id);
      const yearRows = allRows.filter((r) => r.level === 'YEAR');
      const sectionRows = allRows.filter((r) => r.level === 'SECTION');

      const builtTree: CourseTree[] = courseRows.map((c) => {
        const matchingYears = yearRows
          .filter((y) => y.parent_id === c.id)
          .sort((a, b) => (a.year || 0) - (b.year || 0));

        const builtYears: YearNode[] = matchingYears.map((y) => {
          const matchingSections = sectionRows
            .filter((s) => s.parent_id === y.id)
            .sort((a, b) => (a.section || a.name).localeCompare(b.section || b.name));

          const builtSections: SectionNode[] = matchingSections.map((s) => ({
            id: s.id,
            name: s.name || `Section ${s.section || 'A'}`,
            sectionCode: s.section || 'A',
            students: countMap[s.id] || 0,
          }));

          return {
            id: y.id,
            label: y.name || `Year ${y.year || 1}`,
            yearNumber: y.year || 1,
            sections: builtSections,
          };
        });

        return {
          id: c.id,
          code: c.code || 'COURSE',
          name: c.name,
          degreeCode: c.degree_code,
          durationYears: c.duration_years || 4,
          years: builtYears,
        };
      });

      setTree(builtTree);

      // Open first course by default
      if (builtTree.length > 0 && Object.keys(openCourses).length === 0) {
        setOpenCourses({ [builtTree[0].id]: true });
        if (builtTree[0].years.length > 0) {
          setOpenYears({ [builtTree[0].years[0].id]: true });
        }
      }
    } catch (err) {
      console.warn('Failed to load courses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCourses();
  }, [orgId]);

  // Add new Course Program (and auto-provision Year 1..N > Section A)
  const addCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourseName.trim()) return;

    try {
      setSubmitting(true);
      const duration = Math.max(1, Math.min(6, Number(newDurationYears) || 4));

      // 1. Insert Course Program
      const { data: courseRow, error: cErr } = await (supabase.from('courses') as any)
        .insert({
          org_id: orgId,
          level: 'COURSE',
          name: newCourseName.trim(),
          code: newCourseCode.trim().toUpperCase() || 'COURSE',
          degree_code: newDegreeCode.trim().toUpperCase() || 'DEGREE',
          duration_years: duration,
        })
        .select()
        .single();

      if (cErr) throw cErr;

      // 2. Auto-provision all Academic Years with Section A
      const yearLabels = ['Freshman', 'Sophomore', 'Junior', 'Senior', 'Final', 'Specialization'];
      for (let y = 1; y <= duration; y++) {
        const yearSub = y <= yearLabels.length ? ` (${yearLabels[y - 1]})` : '';
        const { data: yearRow, error: yErr } = await (supabase.from('courses') as any)
          .insert({
            org_id: orgId,
            parent_id: courseRow.id,
            level: 'YEAR',
            name: `Year ${y}${yearSub}`,
            year: y,
          })
          .select()
          .single();

        if (yErr) throw yErr;

        // 3. Provision Section A in each year
        await (supabase.from('courses') as any).insert({
          org_id: orgId,
          parent_id: yearRow.id,
          level: 'SECTION',
          name: 'Section A',
          section: 'A',
        });
      }

      setNewCourseName('');
      setNewCourseCode('');
      setNewDegreeCode('BTECH');
      setNewDurationYears(4);
      setModalOpen(false);
      await loadCourses();
    } catch (err) {
      console.error('Failed to create course:', err);
      alert('Error creating course. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Add next section (e.g. Section B, C...) to a Year
  const addSection = async (yearId: string, currentSections: SectionNode[]) => {
    const nextChar = String.fromCharCode(65 + currentSections.length);
    try {
      const { error } = await (supabase.from('courses') as any).insert({
        org_id: orgId,
        parent_id: yearId,
        level: 'SECTION',
        name: `Section ${nextChar}`,
        section: nextChar,
      });

      if (error) throw error;
      await loadCourses();
    } catch (err) {
      console.error('Failed to add section:', err);
      alert('Error adding section.');
    }
  };

  // Add next Year (e.g. Year 2, Year 3...) to a Course
  const addYear = async (courseId: string, currentYears: YearNode[]) => {
    const nextYearNum = currentYears.length + 1;
    try {
      const { data: yRow, error: yErr } = await (supabase.from('courses') as any)
        .insert({
          org_id: orgId,
          parent_id: courseId,
          level: 'YEAR',
          name: `Year ${nextYearNum}`,
          year: nextYearNum,
        })
        .select()
        .single();

      if (yErr) throw yErr;

      // Provision Section A in new year
      await (supabase.from('courses') as any).insert({
        org_id: orgId,
        parent_id: yRow.id,
        level: 'SECTION',
        name: 'Section A',
        section: 'A',
      });

      await loadCourses();
    } catch (err) {
      console.error('Failed to add year:', err);
      alert('Error adding academic year.');
    }
  };

  // Delete node with cascade
  const deleteNode = async (nodeId: string, label: string) => {
    if (!window.confirm(`Are you sure you want to delete "${label}" and all child sections?`)) {
      return;
    }
    try {
      const { error } = await (supabase.from('courses') as any).delete().eq('id', nodeId);
      if (error) throw error;
      await loadCourses();
    } catch (err) {
      console.error('Failed to delete node:', err);
      alert('Error deleting. Make sure no tests are exclusively locked to this section.');
    }
  };

  return (
    <PortalShell persona="org">
      <div className="space-y-7">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="font-label text-xs text-primary font-bold uppercase tracking-wider mb-1">
              Academic Taxonomy • Live Supabase Hierarchy
            </p>
            <h1 className="font-headline font-bold text-2xl sm:text-3xl text-slate-900">
              Courses &gt; Years &gt; Sections
            </h1>
          </div>

          <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setModalOpen(true)}>
            Add Course Program
          </Button>
        </header>

        {loading ? (
          <div className="p-12 text-center text-slate-500 font-label">
            Loading live academic taxonomy...
          </div>
        ) : tree.length === 0 ? (
          <div className={`p-10 text-center ${classes.card} space-y-3`}>
            <FolderTree className="w-10 h-10 text-slate-400 mx-auto" />
            <h3 className="font-headline font-bold text-lg text-slate-800">No Course Programs Found</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Define your academic hierarchy (Course &gt; Year &gt; Section) so faculty can claim classes and assign tests.
            </p>
            <Button size="sm" onClick={() => setModalOpen(true)}>
              Create First Program
            </Button>
          </div>
        ) : (
          <section className="space-y-4">
            {tree.map((course) => {
              const isCourseOpen = Boolean(openCourses[course.id]);
              const totalStudents = course.years.reduce(
                (sum, y) => sum + y.sections.reduce((s, sec) => s + sec.students, 0),
                0,
              );

              return (
                <div key={course.id} className={`overflow-hidden ${classes.card}`}>
                  {/* Level 1: COURSE */}
                  <div className="w-full px-6 py-4 flex items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors">
                    <button
                      type="button"
                      onClick={() =>
                        setOpenCourses((prev) => ({ ...prev, [course.id]: !prev[course.id] }))
                      }
                      className="flex items-center gap-3.5 min-w-0 text-left flex-1"
                    >
                      <span className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <FolderTree className="w-4 h-4" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                            {course.code}
                          </span>
                          {course.degreeCode && (
                            <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200">
                              {course.degreeCode}
                            </span>
                          )}
                          <h2 className="font-headline font-bold text-base text-slate-900 truncate">
                            {course.name}
                          </h2>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {course.durationYears || 4} Years ({(course.durationYears || 4) * 2} Semesters) • {course.years.length} Academic Years • {totalStudents} Enrolled Students
                        </p>
                      </div>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void addYear(course.id, course.years)}
                        className="text-xs font-label font-bold text-primary hover:underline px-2 py-1 rounded bg-teal-50 border border-teal-200"
                      >
                        + Add Year
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteNode(course.id, course.name)}
                        className="text-slate-400 hover:text-rose-600 p-1.5 transition-colors"
                        title="Delete Course Program"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setOpenCourses((prev) => ({ ...prev, [course.id]: !prev[course.id] }))
                        }
                        className="text-slate-400 p-1"
                      >
                        {isCourseOpen ? (
                          <ChevronDown className="w-5 h-5" />
                        ) : (
                          <ChevronRight className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Level 2: YEARS */}
                  {isCourseOpen && (
                    <div className="px-6 pb-5 pt-1 space-y-3 border-t border-slate-100 bg-slate-50/40">
                      {course.years.map((year) => {
                        const isYearOpen = openYears[year.id] ?? true;
                        return (
                          <div
                            key={year.id}
                            className={`bg-white border border-slate-200/90 overflow-hidden ${cardRadius}`}
                          >
                            <div className="px-4 py-3 flex items-center justify-between gap-3">
                              <button
                                type="button"
                                onClick={() =>
                                  setOpenYears((prev) => ({ ...prev, [year.id]: !isYearOpen }))
                                }
                                className="flex items-center gap-2.5 font-headline font-semibold text-sm text-slate-800"
                              >
                                {isYearOpen ? (
                                  <ChevronDown className="w-4 h-4 text-primary" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 text-slate-400" />
                                )}
                                <BookOpen className="w-4 h-4 text-primary" />
                                <span>{year.label}</span>
                                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200">
                                  Sem {year.yearNumber * 2 - 1} & Sem {year.yearNumber * 2}
                                </span>
                                <span className="text-xs font-normal text-slate-400">
                                  ({year.sections.length} sections)
                                </span>
                              </button>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => void addSection(year.id, year.sections)}
                                  className="text-xs font-label font-bold text-primary hover:underline inline-flex items-center gap-1"
                                >
                                  <Plus className="w-3.5 h-3.5" /> Add Section
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void deleteNode(year.id, year.label)}
                                  className="text-slate-400 hover:text-rose-600 p-1 transition-colors"
                                  title="Delete Year"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Level 3: SECTIONS */}
                            {isYearOpen && (
                              <div className="px-4 pb-4 pt-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {year.sections.map((sec) => (
                                  <div
                                    key={sec.id}
                                    className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between group"
                                  >
                                    <div>
                                      <p className="font-headline font-bold text-sm text-slate-900">
                                        {sec.name}
                                      </p>
                                      <p className="text-xs text-slate-500 font-mono">
                                        UUID: {sec.id.slice(0, 8)}...
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-slate-200 text-xs font-mono font-semibold text-slate-700">
                                        <Users className="w-3 h-3 text-primary" />
                                        {sec.students}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => void deleteNode(sec.id, sec.name)}
                                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 transition-opacity p-1"
                                        title="Delete Section"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </section>
        )}

        <BaseModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Add Academic Program"
          description="Creates a top-level degree program with all academic years and Section A auto-provisioned."
        >
          <form onSubmit={addCourse} className="space-y-4">
            <div>
              <label className="block text-xs font-label font-semibold text-slate-700 mb-1.5">
                Program Name
              </label>
              <input
                type="text"
                required
                value={newCourseName}
                onChange={(e) => setNewCourseName(e.target.value)}
                placeholder="B.Tech Artificial Intelligence & Data Science"
                className={`w-full px-3.5 py-2.5 text-sm ${classes.input}`}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-label font-semibold text-slate-700 mb-1.5">
                  Course Code
                </label>
                <input
                  type="text"
                  required
                  value={newCourseCode}
                  onChange={(e) => setNewCourseCode(e.target.value)}
                  placeholder="BTECH-AIDS"
                  className={`w-full px-3.5 py-2.5 text-sm font-mono ${classes.input}`}
                />
              </div>
              <div>
                <label className="block text-xs font-label font-semibold text-slate-700 mb-1.5">
                  Degree Level
                </label>
                <select
                  value={newDegreeCode}
                  onChange={(e) => setNewDegreeCode(e.target.value)}
                  className={`w-full px-3 py-2 text-sm font-medium ${classes.input}`}
                >
                  <option value="BTECH">B.Tech / B.E. (Undergrad)</option>
                  <option value="BCA">BCA (Computer Apps)</option>
                  <option value="BBA">BBA (Business Admin)</option>
                  <option value="BSC">B.Sc (Sciences)</option>
                  <option value="MCA">MCA (Postgraduate)</option>
                  <option value="MBA">MBA (Management)</option>
                  <option value="MTECH">M.Tech (Engineering PG)</option>
                  <option value="DIPLOMA">Polytechnic / Diploma</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-label font-semibold text-slate-700 mb-1.5">
                Duration & Semesters
              </label>
              <select
                value={newDurationYears}
                onChange={(e) => setNewDurationYears(Number(e.target.value))}
                className={`w-full px-3 py-2 text-sm font-medium ${classes.input}`}
              >
                <option value={4}>4 Years (8 Semesters) — Standard Engineering</option>
                <option value={3}>3 Years (6 Semesters) — BCA, BBA, B.Sc</option>
                <option value={2}>2 Years (4 Semesters) — M.Tech, MBA, MCA</option>
                <option value={5}>5 Years (10 Semesters) — Dual Degree / Architecture</option>
                <option value={1}>1 Year (2 Semesters) — Certificate / Foundation</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Creating...' : 'Create Program'}
              </Button>
            </div>
          </form>
        </BaseModal>
      </div>
    </PortalShell>
  );
}
