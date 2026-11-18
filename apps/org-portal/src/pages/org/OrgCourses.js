import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { BookOpen, ChevronDown, ChevronRight, FolderTree, Plus, Users } from 'lucide-react';
import { useTheme } from '@colformly/theme';
import { BaseModal, Button } from '@colformly/ui';
import { PortalShell } from '../../layouts/PortalShell';
const INITIAL_TREE = [
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
    const [tree, setTree] = useState(INITIAL_TREE);
    const [openCourses, setOpenCourses] = useState({ cse: true, ece: true });
    const [openYears, setOpenYears] = useState({ 'cse-y2': true });
    const [modalOpen, setModalOpen] = useState(false);
    const [newCourseName, setNewCourseName] = useState('');
    const [newCourseCode, setNewCourseCode] = useState('');
    const addCourse = (e) => {
        e.preventDefault();
        if (!newCourseName.trim())
            return;
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
    const addSection = (courseId, yearId) => {
        setTree((prev) => prev.map((c) => {
            if (c.id !== courseId)
                return c;
            return {
                ...c,
                years: c.years.map((y) => {
                    if (y.id !== yearId)
                        return y;
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
        }));
    };
    return (_jsx(PortalShell, { persona: "org", children: _jsxs("div", { className: "space-y-7", children: [_jsxs("header", { className: "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4", children: [_jsxs("div", { children: [_jsx("p", { className: "font-label text-xs text-primary font-bold uppercase tracking-wider mb-1", children: "Academic Taxonomy" }), _jsx("h1", { className: "font-headline font-bold text-2xl sm:text-3xl text-slate-900", children: "Courses > Years > Sections" })] }), _jsx(Button, { size: "sm", leftIcon: _jsx(Plus, { className: "w-4 h-4" }), onClick: () => setModalOpen(true), children: "Add Course Program" })] }), _jsx("section", { className: "space-y-4", children: tree.map((course) => {
                        const isCourseOpen = Boolean(openCourses[course.id]);
                        const totalStudents = course.years.reduce((sum, y) => sum + y.sections.reduce((s, sec) => s + sec.students, 0), 0);
                        return (_jsxs("div", { className: `overflow-hidden ${classes.card}`, children: [_jsxs("button", { type: "button", onClick: () => setOpenCourses((prev) => ({ ...prev, [course.id]: !prev[course.id] })), className: "w-full px-6 py-4 flex items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors text-left", children: [_jsxs("div", { className: "flex items-center gap-3.5 min-w-0", children: [_jsx("span", { className: "w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0", children: _jsx(FolderTree, { className: "w-4 h-4" }) }), _jsxs("div", { className: "min-w-0", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600", children: course.code }), _jsx("h2", { className: "font-headline font-bold text-base text-slate-900 truncate", children: course.name })] }), _jsxs("p", { className: "text-xs text-slate-500 mt-0.5", children: [course.years.length, " Academic Years \u2022 ", totalStudents, " Enrolled Students"] })] })] }), isCourseOpen ? (_jsx(ChevronDown, { className: "w-5 h-5 text-slate-400 shrink-0" })) : (_jsx(ChevronRight, { className: "w-5 h-5 text-slate-400 shrink-0" }))] }), isCourseOpen && (_jsx("div", { className: "px-6 pb-5 pt-1 space-y-3 border-t border-slate-100 bg-slate-50/40", children: course.years.map((year) => {
                                        const isYearOpen = openYears[year.id] ?? true;
                                        return (_jsxs("div", { className: `bg-white border border-slate-200/90 overflow-hidden ${cardRadius}`, children: [_jsxs("div", { className: "px-4 py-3 flex items-center justify-between gap-3", children: [_jsxs("button", { type: "button", onClick: () => setOpenYears((prev) => ({ ...prev, [year.id]: !isYearOpen })), className: "flex items-center gap-2.5 font-headline font-semibold text-sm text-slate-800", children: [isYearOpen ? (_jsx(ChevronDown, { className: "w-4 h-4 text-primary" })) : (_jsx(ChevronRight, { className: "w-4 h-4 text-slate-400" })), _jsx(BookOpen, { className: "w-4 h-4 text-primary" }), _jsx("span", { children: year.label }), _jsxs("span", { className: "text-xs font-normal text-slate-400", children: ["(", year.sections.length, " sections)"] })] }), _jsxs("button", { type: "button", onClick: () => addSection(course.id, year.id), className: "text-xs font-label font-bold text-primary hover:underline inline-flex items-center gap-1", children: [_jsx(Plus, { className: "w-3.5 h-3.5" }), " Add Section"] })] }), isYearOpen && (_jsx("div", { className: "px-4 pb-4 pt-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3", children: year.sections.map((sec) => (_jsxs("div", { className: "p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "font-headline font-bold text-sm text-slate-900", children: sec.name }), _jsx("p", { className: "text-xs text-slate-500", children: sec.mentor })] }), _jsxs("span", { className: "inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-slate-200 text-xs font-mono font-semibold text-slate-700", children: [_jsx(Users, { className: "w-3 h-3 text-primary" }), sec.students] })] }, sec.id))) }))] }, year.id));
                                    }) }))] }, course.id));
                    }) }), _jsx(BaseModal, { open: modalOpen, onClose: () => setModalOpen(false), title: "Add Course Program", description: "Creates a new top-level Course node scoped to your organization's org_id.", children: _jsxs("form", { onSubmit: addCourse, className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-xs font-label font-semibold text-slate-700 mb-1.5", children: "Program Name" }), _jsx("input", { type: "text", required: true, value: newCourseName, onChange: (e) => setNewCourseName(e.target.value), placeholder: "B.Tech Artificial Intelligence & Data Science", className: `w-full px-3.5 py-2.5 text-sm ${classes.input}` })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-label font-semibold text-slate-700 mb-1.5", children: "Course Code" }), _jsx("input", { type: "text", required: true, value: newCourseCode, onChange: (e) => setNewCourseCode(e.target.value), placeholder: "BTECH-AIDS", className: `w-full px-3.5 py-2.5 text-sm font-mono ${classes.input}` })] }), _jsxs("div", { className: "flex justify-end gap-2 pt-2", children: [_jsx(Button, { type: "button", variant: "ghost", onClick: () => setModalOpen(false), children: "Cancel" }), _jsx(Button, { type: "submit", children: "Create Course" })] })] }) })] }) }));
}
//# sourceMappingURL=OrgCourses.js.map