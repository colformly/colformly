import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Mail, Send, Sparkles } from 'lucide-react';
import { useTheme } from '@colformly/theme';
import { BaseModal, Button, MetricCard } from '@colformly/ui';
import { PortalShell } from '../../layouts/PortalShell';
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
    const [cohort, setCohort] = useState('CSE Sec-A (Algorithms)');
    const [messageTarget, setMessageTarget] = useState(null);
    const [messageBody, setMessageBody] = useState('');
    const [sentIds, setSentIds] = useState({});
    const openMessage = (student) => {
        setMessageTarget(student);
        setMessageBody(`Hi ${student.name.split(' ')[0]}, I noticed ${student.weakTopic} was tricky on the midterm. Let's review it during Thursday's 4 PM lab clinic!`);
    };
    const sendMessage = (e) => {
        e.preventDefault();
        if (!messageTarget)
            return;
        setSentIds((prev) => ({ ...prev, [messageTarget.id]: true }));
        setMessageTarget(null);
    };
    return (_jsx(PortalShell, { persona: "teacher", children: _jsxs("div", { className: "space-y-8", children: [_jsxs("header", { className: "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4", children: [_jsxs("div", { children: [_jsx("p", { className: "font-label text-xs text-primary font-bold uppercase tracking-wider mb-1", children: "Diagnostic Intelligence" }), _jsx("h1", { className: "font-headline font-bold text-2xl sm:text-3xl text-slate-900", children: "Class Averages, Topic Autopsy & Intervention" })] }), _jsxs("select", { value: cohort, onChange: (e) => setCohort(e.target.value), className: `px-4 py-2 text-xs font-label font-semibold ${classes.input}`, children: [_jsx("option", { children: "CSE Sec-A (Algorithms)" }), _jsx("option", { children: "CSE Sec-B (Operating Systems)" }), _jsx("option", { children: "All Enrolled Cohorts" })] })] }), _jsxs("section", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4", children: [_jsx(MetricCard, { title: "Exam Takers", value: "128", delta: "100% submitted", trend: "up" }), _jsx(MetricCard, { title: "Median Score", value: "74.2%", delta: "+3.1%", trend: "up" }), _jsx(MetricCard, { title: "Weakest Topic", value: "42%", delta: "DP Recurrence", trend: "down" }), _jsx(MetricCard, { title: "Intervention Needed", value: "3 Students", delta: "< 55% score", trend: "down" })] }), _jsxs("section", { className: "grid grid-cols-1 lg:grid-cols-12 gap-6 items-start", children: [_jsxs("div", { className: `lg:col-span-7 p-6 space-y-5 ${classes.card}`, children: [_jsx("div", { className: "flex items-center justify-between", children: _jsxs("div", { children: [_jsxs("h2", { className: "font-headline font-bold text-lg text-slate-900 flex items-center gap-2", children: [_jsx(Sparkles, { className: "w-5 h-5 text-primary" }), _jsxs("span", { children: ["Topic Autopsy (", cohort, ")"] })] }), _jsxs("p", { className: "text-xs text-slate-500 mt-0.5", children: ["Auto-grouped by syllabus tag from ", _jsx("code", { className: "font-mono", children: "test_answer_keys.topic" })] })] }) }), _jsx("div", { className: "space-y-4", children: TOPIC_AUTOPSY.map((item) => {
                                        const barColor = item.severity === 'critical'
                                            ? 'bg-rose-500'
                                            : item.severity === 'warning'
                                                ? 'bg-amber-500'
                                                : item.severity === 'moderate'
                                                    ? 'bg-sky-500'
                                                    : 'bg-primary';
                                        return (_jsxs("div", { className: "space-y-1.5", children: [_jsxs("div", { className: "flex items-center justify-between text-xs gap-2", children: [_jsx("span", { className: "font-headline font-semibold text-slate-900", children: item.topic }), _jsxs("span", { className: "font-mono text-slate-600 shrink-0", children: [_jsxs("strong", { className: "text-slate-900", children: [item.accuracy, "%"] }), " accuracy \u2022", ' ', item.missedBy, " missed"] })] }), _jsx("div", { className: "h-3 rounded-full bg-slate-100 overflow-hidden", children: _jsx("div", { className: `h-full rounded-full transition-all ${barColor}`, style: { width: `${item.accuracy}%` } }) })] }, item.topic));
                                    }) })] }), _jsxs("div", { className: `lg:col-span-5 p-6 space-y-4 ${classes.card}`, children: [_jsx("div", { className: "flex items-center justify-between", children: _jsxs("div", { children: [_jsxs("h2", { className: "font-headline font-bold text-lg text-slate-900 flex items-center gap-2", children: [_jsx(AlertTriangle, { className: "w-5 h-5 text-amber-600" }), _jsx("span", { children: "Intervention Needed" })] }), _jsx("p", { className: "text-xs text-slate-500 mt-0.5", children: "Students scoring below 55% or showing anti-cheat flags" })] }) }), _jsx("div", { className: "space-y-3", children: INTERVENTION_LIST.map((s) => (_jsxs("div", { className: "p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3", children: [_jsxs("div", { className: "min-w-0", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("p", { className: "font-headline font-bold text-sm text-slate-900 truncate", children: s.name }), _jsx("span", { className: "font-mono text-[11px] font-bold text-rose-600", children: s.score })] }), _jsxs("p", { className: "text-xs text-slate-500 truncate", children: [s.roll, " \u2022 Struggled on ", _jsx("strong", { className: "text-slate-700", children: s.weakTopic })] }), s.tabSwitches > 0 && (_jsxs("span", { className: "inline-block mt-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold", children: [s.tabSwitches, " tab switch flag(s)"] }))] }), sentIds[s.id] ? (_jsxs("span", { className: "inline-flex items-center gap-1 text-xs font-label font-bold text-emerald-700 shrink-0", children: [_jsx(CheckCircle2, { className: "w-4 h-4" }), " Sent"] })) : (_jsx(Button, { size: "sm", variant: "outline", leftIcon: _jsx(Mail, { className: "w-3.5 h-3.5" }), onClick: () => openMessage(s), children: "Message" }))] }, s.id))) })] })] }), _jsx(BaseModal, { open: Boolean(messageTarget), onClose: () => setMessageTarget(null), title: messageTarget ? `Message ${messageTarget.name}` : '', description: "Send a targeted remedial study note directly to the student's portal inbox.", children: _jsxs("form", { onSubmit: sendMessage, className: "space-y-4", children: [_jsx("textarea", { rows: 4, required: true, value: messageBody, onChange: (e) => setMessageBody(e.target.value), className: `w-full p-3.5 text-sm ${classes.input}` }), _jsxs("div", { className: "flex justify-end gap-2", children: [_jsx(Button, { type: "button", variant: "ghost", onClick: () => setMessageTarget(null), children: "Cancel" }), _jsx(Button, { type: "submit", leftIcon: _jsx(Send, { className: "w-4 h-4" }), children: "Send Intervention Note" })] })] }) })] }) }));
}
//# sourceMappingURL=TeacherClasses.js.map