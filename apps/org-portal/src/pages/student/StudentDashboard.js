import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertTriangle, ArrowRight, CheckCircle2, Clock, Maximize2, ShieldAlert, ShieldCheck, Sparkles, } from 'lucide-react';
import { useAntiCheat } from '@colformly/auth';
import { BaseModal, Button } from '@colformly/ui';
import { PortalShell } from '../../layouts/PortalShell';
const PENDING_TESTS = [
    {
        id: 'os-deadlocks-quiz',
        subject: 'Operating Systems',
        title: 'Deadlocks, Semaphores & CPU Scheduling',
        duration: '30 mins',
        questions: 2,
        xpReward: '+180 XP',
        due: 'Due Today • 6:00 PM',
    },
    {
        id: 'dbms-bplus-lab',
        subject: 'Database Systems',
        title: 'B+ Trees, ACID & Postgres RLS Isolation',
        duration: '45 mins',
        questions: 2,
        xpReward: '+240 XP',
        due: 'Due Tomorrow • 11:59 PM',
    },
];
const COMPLETED_TESTS = [
    {
        id: 'cs-301-midterm',
        subject: 'Data Structures & Algorithms',
        title: 'CS-301 Algorithms Midterm Test',
        score: '85 / 100',
        pct: '85%',
        blessing: 'Strong algorithmic thinking — review DP transitions!',
        date: 'Graded Nov 16',
    },
    {
        id: 'cn-tcp-quiz',
        subject: 'Computer Networks',
        title: 'TCP Congestion Control & Routing Quiz',
        score: '46 / 50',
        pct: '92%',
        blessing: 'Outstanding clarity and rigor — keep pushing! 🌟',
        date: 'Graded Nov 11',
    },
];
const EXAM_QUESTIONS = [
    {
        id: 'q1',
        prompt: 'Which condition is NOT one of Coffman’s four necessary conditions for deadlock?',
        options: ['Mutual Exclusion', 'Hold and Wait', 'Preemptive Priority Boost', 'Circular Wait'],
    },
    {
        id: 'q2',
        prompt: 'In PostgreSQL, which feature isolates tenant rows directly at the database engine layer?',
        options: ['Row Level Security (RLS)', 'CSS Variables', 'Client-side localStorage', 'CORS Headers'],
    },
];
export default function StudentDashboard() {
    const navigate = useNavigate();
    const [activeExam, setActiveExam] = useState(null);
    const [answers, setAnswers] = useState({});
    const antiCheat = useAntiCheat({
        enabled: Boolean(activeExam),
        maxTabSwitches: 3,
    });
    const startProctoredExam = async (test) => {
        setAnswers({});
        setActiveExam(test);
        await antiCheat.enterFullscreen();
    };
    const submitExam = async () => {
        const targetId = activeExam?.id || 'cs-301-midterm';
        await antiCheat.exitFullscreen();
        setActiveExam(null);
        navigate(`/student/results/${targetId}`);
    };
    return (_jsx(PortalShell, { persona: "student", children: _jsxs("div", { className: "space-y-8", children: [_jsxs("header", { className: "flex flex-col sm:flex-row sm:items-center justify-between gap-5 p-6 rounded-3xl bg-white border border-slate-200/90 shadow-student-card", children: [_jsxs("div", { className: "flex items-center gap-4", children: [_jsxs("div", { className: "relative shrink-0", children: [_jsx("div", { className: "w-16 h-16 rounded-3xl bg-gradient-to-tr from-teal-400 via-amber-200 to-rose-300 p-0.5 shadow-md", children: _jsx("div", { className: "w-full h-full rounded-3xl bg-amber-50 flex items-center justify-center text-3xl select-none", children: "\uD83E\uDD8A" }) }), _jsx("span", { className: "absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-700 border-2 border-white flex items-center justify-center text-[10px] text-white font-bold", children: "\u2713" })] }), _jsxs("div", { children: [_jsx("h1", { className: "font-headline font-extrabold text-2xl sm:text-3xl text-slate-900 tracking-tight", children: "Hey, Alex! \uD83D\uDC4B" }), _jsx("p", { className: "text-sm text-slate-600 mt-0.5", children: "Ready to conquer today's cheat-proof challenges and climb the podium?" })] })] }), _jsxs("div", { className: "flex items-center gap-3 shrink-0", children: [_jsxs("div", { className: "flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-orange-50 border-2 border-orange-200", children: [_jsx("span", { className: "text-2xl leading-none", children: "\uD83D\uDD25" }), _jsxs("div", { children: [_jsx("p", { className: "font-headline font-extrabold text-base text-orange-950 leading-none", children: "12 Days" }), _jsx("p", { className: "text-[11px] font-label font-semibold text-orange-800", children: "Study Streak" })] })] }), _jsxs("div", { className: "flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-teal-50 border-2 border-teal-200", children: [_jsx("span", { className: "text-2xl leading-none", children: "\uD83D\uDC8E" }), _jsxs("div", { children: [_jsx("p", { className: "font-headline font-extrabold text-base text-teal-950 leading-none", children: "1,450 XP" }), _jsx("p", { className: "text-[11px] font-label font-semibold text-primary", children: "Rank #4" })] })] })] })] }), _jsxs("section", { className: "space-y-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("h2", { className: "font-headline font-extrabold text-xl text-slate-900 flex items-center gap-2", children: [_jsx("span", { children: "Pending Assessments" }), _jsxs("span", { className: "px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-xs font-bold border border-amber-200", children: [PENDING_TESTS.length, " Due"] })] }), _jsxs("span", { className: "text-xs font-label font-semibold text-slate-500 inline-flex items-center gap-1.5", children: [_jsx(ShieldCheck, { className: "w-4 h-4 text-primary" }), " Fullscreen Anti-Cheat Armed"] })] }), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-5", children: PENDING_TESTS.map((test) => (_jsxs(motion.article, { whileHover: { y: -4 }, className: "rounded-3xl bg-white border border-slate-200/90 p-6 shadow-student-card flex flex-col justify-between gap-5", children: [_jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "flex items-center justify-between gap-2", children: [_jsx("span", { className: "px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-primary text-xs font-label font-bold", children: test.subject }), _jsx("span", { className: "px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-xs font-mono font-bold", children: test.xpReward })] }), _jsx("h3", { className: "font-headline font-bold text-lg text-slate-900", children: test.title }), _jsxs("div", { className: "flex flex-wrap items-center gap-4 text-xs text-slate-500 font-medium", children: [_jsxs("span", { className: "inline-flex items-center gap-1", children: [_jsx(Clock, { className: "w-3.5 h-3.5 text-primary" }), " ", test.duration] }), _jsx("span", { children: "\u2022" }), _jsx("span", { children: test.due })] })] }), _jsx(Button, { className: "w-full rounded-full", leftIcon: _jsx(Maximize2, { className: "w-4 h-4" }), onClick: () => void startProctoredExam(test), children: "Start Fullscreen Exam" })] }, test.id))) })] }), _jsxs("section", { className: "space-y-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h2", { className: "font-headline font-extrabold text-xl text-slate-900", children: "Completed & Graded Papers" }), _jsx(Link, { to: "/student/leaderboard", className: "text-xs font-label font-bold text-primary hover:underline", children: "View Hall of Fame \u2192" })] }), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-5", children: COMPLETED_TESTS.map((test) => (_jsxs("article", { className: "rounded-3xl bg-white border border-slate-200/90 p-6 shadow-student-card flex flex-col justify-between gap-4", children: [_jsxs("div", { className: "flex items-start justify-between gap-3", children: [_jsxs("div", { children: [_jsx("span", { className: "text-xs font-label font-bold text-slate-500 uppercase tracking-wider", children: test.subject }), _jsx("h3", { className: "font-headline font-bold text-lg text-slate-900 mt-0.5", children: test.title }), _jsx("p", { className: "text-xs text-slate-500 mt-0.5", children: test.date })] }), _jsxs("div", { className: "px-3.5 py-2 rounded-2xl bg-emerald-50 border border-emerald-200 text-center shrink-0", children: [_jsx("p", { className: "font-headline font-extrabold text-lg text-emerald-800 leading-none", children: test.pct }), _jsx("p", { className: "text-[10px] font-mono text-emerald-700 mt-0.5", children: test.score })] })] }), _jsxs("div", { className: "p-3 rounded-2xl bg-cream-bg border border-amber-200/70 text-xs text-slate-700 italic flex items-center gap-2", children: [_jsx(Sparkles, { className: "w-4 h-4 text-primary shrink-0" }), _jsxs("span", { children: ["\u201C", test.blessing, "\u201D"] })] }), _jsxs(Link, { to: `/student/results/${test.id}`, className: "inline-flex items-center justify-between px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-label font-bold transition-colors", children: [_jsx("span", { children: "Open SVG Graded Sheet & BYOC AI Review" }), _jsx(ArrowRight, { className: "w-4 h-4" })] })] }, test.id))) })] }), _jsx(BaseModal, { open: Boolean(activeExam), onClose: () => { }, hideCloseButton: true, closeOnBackdrop: false, size: "lg", title: activeExam ? `🔒 Proctored Exam: ${activeExam.title}` : '', description: "Anti-Cheat Guard active: Fullscreen API, Document.visibilityState tab monitor, and right-click lock enabled.", children: _jsxs("div", { className: "space-y-5", children: [_jsxs("div", { className: `p-3.5 rounded-2xl border flex flex-wrap items-center justify-between gap-3 text-xs ${antiCheat.tabSwitchCount > 0 || !antiCheat.isFullscreen
                                    ? 'bg-amber-50 border-amber-300 text-amber-950'
                                    : 'bg-teal-50 border-teal-200 text-teal-900'}`, children: [_jsxs("div", { className: "flex items-center gap-2 font-semibold", children: [antiCheat.tabSwitchCount > 0 ? (_jsx(ShieldAlert, { className: "w-4 h-4 text-rose-600" })) : (_jsx(ShieldCheck, { className: "w-4 h-4 text-primary" })), _jsxs("span", { children: ["Tab Switches: ", _jsx("strong", { children: antiCheat.tabSwitchCount }), " \u2022 Fullscreen:", ' ', _jsx("strong", { children: antiCheat.isFullscreen ? 'Locked' : 'Exited' })] })] }), !antiCheat.isFullscreen && (_jsxs("button", { type: "button", onClick: () => void antiCheat.enterFullscreen(), className: "px-3 py-1 rounded-full bg-amber-600 text-white font-bold text-[11px] inline-flex items-center gap-1", children: [_jsx(AlertTriangle, { className: "w-3 h-3" }), " Re-enter Fullscreen"] }))] }), EXAM_QUESTIONS.map((q, idx) => (_jsxs("div", { className: "p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3", children: [_jsxs("p", { className: "font-headline font-bold text-sm text-slate-900", children: ["Q", idx + 1, ". ", q.prompt] }), _jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-2", children: q.options.map((opt) => (_jsx("button", { type: "button", onClick: () => setAnswers((prev) => ({ ...prev, [q.id]: opt })), className: `p-3 rounded-xl border text-left text-xs font-medium transition-all ${answers[q.id] === opt
                                                ? 'bg-primary text-white border-primary font-bold'
                                                : 'bg-white text-slate-700 border-slate-200 hover:border-primary/50'}`, children: opt }, opt))) })] }, q.id))), _jsxs("div", { className: "flex items-center justify-between pt-3 border-t border-slate-100", children: [_jsxs("span", { className: "text-xs text-slate-500", children: [Object.keys(answers).length, "/", EXAM_QUESTIONS.length, " answered \u2022 Right-click disabled"] }), _jsx(Button, { leftIcon: _jsx(CheckCircle2, { className: "w-4 h-4" }), onClick: () => void submitExam(), children: "Submit & Grade Instantly" })] })] }) })] }) }));
}
//# sourceMappingURL=StudentDashboard.js.map