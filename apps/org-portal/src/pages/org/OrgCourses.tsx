import { useState } from 'react';
import { BookOpen, ChevronDown, ChevronRight, FolderTree, Plus, Users } from 'lucide-react';
import { useTheme } from '@colformly/theme';
import { BaseModal, Button } from '@colformly/ui';
import { PortalShell } from '../../layouts/PortalShell';

interface SectionNode {
  id: string;
  name: string;
  students: number;
  mentor: string;
}

interface YearNode {
  id: string;
  label: string;
  sections: SectionNode[];
}

interface CourseTree {
  id: string;
  code: string;
  name: string;
  years: YearNode[];
}

const INITIAL_TREE: CourseTree[] = [
  {
    id: 'cse',
    code: 'BTECH-CSE',
    name: 'B.Tech Computer Science & Engineering',
    years: [
      {
        id: 'cse-y1',
        label: 'Year 1 (Freshman)',
        sections: [
          { id: 'cse-y1-a', name: 'Section A', students: 64, mentor: 'Prof. A. Kapoor' },
          { id: 'cse-y1-b', name: 'Section B', students: 62, mentor: 'Prof. R. Verma' },
        ],
      },
      {
        id: 'cse-y2',
        label: 'Year 2 (Sophomore)',
        sections: [
          { id: 'cse-y2-a', name: 'Section A', students: 64, mentor: 'Prof. Sarah Mitchell' },
          { id: 'cse-y2-b', name: 'Section B', students: 60, mentor: 'Prof. D. Joshi' },
        ],
      },
      {
        id: 'cse-y3',
        label: 'Year 3 (Junior)',
        sections: [{ id: 'cse-y3-a', name: 'Section A', students: 58, mentor: 'Dr. M. Sen' }],
      },
    ],
  },
  {
    id: 'ece',
    code: 'BTECH-ECE',
    name: 'B.Tech Electronics & Communication',
    years: [
      {
        id: 'ece-y1',
        label: 'Year 1',
        sections: [{ id: 'ece-y1-a', name: 'Section A', students: 55, mentor: 'Dr. Vikram Rao' }],
      },
      {
        id: 'ece-y2',
        label: 'Year 2',
        sections: [{ id: 'ece-y2-a', name: 'Section A', students: 52, mentor: 'Prof. N. Gill' }],
      },
    ],
  },
];

export default function OrgCourses() {
  const { classes, cardRadius } = useTheme();
  const [tree, setTree] = useState<CourseTree[]>(INITIAL_TREE);
  const [openCourses, setOpenCourses] = useState<Record<string, boolean>>({ cse: true, ece: true });
  const [openYears, setOpenYears] = useState<Record<string, boolean>>({ 'cse-y2': true });
  const [modalOpen, setModalOpen] = useState(false);
  const [newCourseName, setNewCourseName] = useState('');
  const [newCourseCode, setNewCourseCode] = useState('');

  const addCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourseName.trim()) return;
    const id = `course-${Date.now()}`;
    setTree((prev) => [
      ...prev,
      {
        id,
        code: newCourseCode.trim().toUpperCase() || 'NEW-COURSE',
        name: newCourseName.trim(),
        years: [
          {
            id: `${id}-y1`,
            label: 'Year 1',
            sections: [{ id: `${id}-y1-a`, name: 'Section A', students: 0, mentor: 'Unassigned' }],
          },
        ],
      },
    ]);
    setOpenCourses((prev) => ({ ...prev, [id]: true }));
    setNewCourseName('');
    setNewCourseCode('');
    setModalOpen(false);
  };

  const addSection = (courseId: string, yearId: string) => {
    setTree((prev) =>
      prev.map((c) => {
        if (c.id !== courseId) return c;
        return {
          ...c,
          years: c.years.map((y) => {
            if (y.id !== yearId) return y;
            const nextLetter = String.fromCharCode(65 + y.sections.length);
            return {
              ...y,
              sections: [
                ...y.sections,
                {
                  id: `${yearId}-${nextLetter.toLowerCase()}`,
                  name: `Section ${nextLetter}`,
                  students: 0,
                  mentor: 'Assign Faculty',
                },
              ],
            };
          }),
        };
      }),
    );
  };

  return (
    <PortalShell persona="org">
      <div className="space-y-7">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="font-label text-xs text-primary font-bold uppercase tracking-wider mb-1">
              Academic Taxonomy
            </p>
            <h1 className="font-headline font-bold text-2xl sm:text-3xl text-slate-900">
              Courses &gt; Years &gt; Sections
            </h1>
          </div>

          <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setModalOpen(true)}>
            Add Course Program
          </Button>
        </header>

        {/* Hierarchical Accordion */}
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
                <button
                  type="button"
                  onClick={() =>
                    setOpenCourses((prev) => ({ ...prev, [course.id]: !prev[course.id] }))
                  }
                  className="w-full px-6 py-4 flex items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors text-left"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <span className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <FolderTree className="w-4 h-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                          {course.code}
                        </span>
                        <h2 className="font-headline font-bold text-base text-slate-900 truncate">
                          {course.name}
                        </h2>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {course.years.length} Academic Years • {totalStudents} Enrolled Students
                      </p>
                    </div>
                  </div>
                  {isCourseOpen ? (
                    <ChevronDown className="w-5 h-5 text-slate-400 shrink-0" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
                  )}
                </button>

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
                              <span className="text-xs font-normal text-slate-400">
                                ({year.sections.length} sections)
                              </span>
                            </button>

                            <button
                              type="button"
                              onClick={() => addSection(course.id, year.id)}
                              className="text-xs font-label font-bold text-primary hover:underline inline-flex items-center gap-1"
                            >
                              <Plus className="w-3.5 h-3.5" /> Add Section
                            </button>
                          </div>

                          {/* Level 3: SECTIONS */}
                          {isYearOpen && (
                            <div className="px-4 pb-4 pt-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                              {year.sections.map((sec) => (
                                <div
                                  key={sec.id}
                                  className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between"
                                >
                                  <div>
                                    <p className="font-headline font-bold text-sm text-slate-900">
                                      {sec.name}
                                    </p>
                                    <p className="text-xs text-slate-500">{sec.mentor}</p>
                                  </div>
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-slate-200 text-xs font-mono font-semibold text-slate-700">
                                    <Users className="w-3 h-3 text-primary" />
                                    {sec.students}
                                  </span>
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

        <BaseModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Add Course Program"
          description="Creates a new top-level Course node scoped to your organization's org_id."
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
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Create Course</Button>
            </div>
          </form>
        </BaseModal>
      </div>
    </PortalShell>
  );
}
