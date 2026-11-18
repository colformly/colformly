import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { CheckCircle2, GripVertical, Plus, Send, ShieldCheck, Sparkles, Trash2, } from 'lucide-react';
import { useTheme } from '@colformly/theme';
import { BaseModal, Button } from '@colformly/ui';
import { PortalShell } from '../../layouts/PortalShell';
const INITIAL_BLOCKS = [
    {
        id: 'b-1',
        type: 'heading',
        content: 'Section A — Algorithms & Complexity Analysis',
    },
    {
        id: 'b-2',
        type: 'mcq',
        content: 'What is the worst-case time complexity of searching in a balanced AVL Tree?',
        options: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'],
        correctAnswer: 'O(log n)',
        marks: 5,
        topic: 'Balanced Trees',
    },
    {
        id: 'b-3',
        type: 'mcq',
        content: 'Which data structure guarantees shortest path discovery in an unweighted graph (BFS)?',
        options: ['Stack', 'FIFO Queue', 'Min-Heap', 'Disjoint Set'],
        correctAnswer: 'FIFO Queue',
        marks: 5,
        topic: 'Graph Algorithms',
    },
];
export default function TeacherTestStudio() {
    const { classes, cardRadius } = useTheme();
    const [title, setTitle] = useState('CS-301 Mid-Semester Assessment');
    const [antiCheat, setAntiCheat] = useState(true);
    const [blocks, setBlocks] = useState(INITIAL_BLOCKS);
    const [aiOpen, setAiOpen] = useState(false);
    const [aiTopic, setAiTopic] = useState('Dynamic Programming & PostgreSQL Indexing');
    const [aiCount, setAiCount] = useState(2);
    const [published, setPublished] = useState(false);
    const addBlock = (type) => {
        const next = type === 'heading'
            ? { id: `b-${Date.now()}`, type: 'heading', content: 'New Section Heading' }
            : type === 'short_answer'
                ? {
                    id: `b-${Date.now()}`,
                    type: 'short_answer',
                    content: 'Explain the role of Row Level Security in multi-tenant databases.',
                    correctAnswer: 'Enforces tenant isolation at the database row level via org_id policies.',
                    marks: 10,
                    topic: 'Database Security',
                }
                : {
                    id: `b-${Date.now()}`,
                    type: 'mcq',
                    content: 'New multiple-choice question...',
                    options: ['Option A', 'Option B', 'Option C', 'Option D'],
                    correctAnswer: 'Option A',
                    marks: 5,
                    topic: 'General',
                };
        setBlocks((prev) => [...prev, next]);
    };
    const updateBlock = (id, patch) => {
        setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
    };
    const deleteBlock = (id) => {
        setBlocks((prev) => prev.filter((b) => b.id !== id));
    };
    const runAiGenerator = (e) => {
        e.preventDefault();
        const generated = Array.from({ length: aiCount }).map((_, idx) => ({
            id: `ai-${Date.now()}-${idx}`,
            type: 'mcq',
            content: idx === 0
                ? `[AI Generated] In ${aiTopic}, which principle prevents redundant subproblem recomputation?`
                : `[AI Generated] Which index structure accelerates range queries in ${aiTopic}?`,
            options: idx === 0
                ? ['Memoization / Overlapping Subproblems', 'Greedy Pruning', 'Random Pivoting', 'Busy Waiting']
                : ['B-Tree Index', 'Hash Ring', 'Bloom Filter', 'Heap Scan'],
            correctAnswer: idx === 0 ? 'Memoization / Overlapping Subproblems' : 'B-Tree Index',
            marks: 5,
            topic: aiTopic.split('&')[0].trim(),
        }));
        setBlocks((prev) => [...prev, ...generated]);
        setAiOpen(false);
    };
    const totalMarks = blocks.reduce((sum, b) => sum + (b.marks || 0), 0);
    return (_jsx(PortalShell, { persona: "teacher", children: _jsxs("div", { className: "space-y-6", children: [_jsxs("header", { className: "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4", children: [_jsxs("div", { children: [_jsx("p", { className: "font-label text-xs text-primary font-bold uppercase tracking-wider mb-1", children: "Notion-Style Block Editor" }), _jsx("h1", { className: "font-headline font-bold text-2xl sm:text-3xl text-slate-900", children: "Test Studio" })] }), _jsxs("div", { className: "flex flex-wrap items-center gap-2.5", children: [_jsx(Button, { size: "sm", variant: "secondary", leftIcon: _jsx(Sparkles, { className: "w-4 h-4" }), onClick: () => setAiOpen(true), children: "AI Test Generator" }), _jsx(Button, { size: "sm", leftIcon: published ? _jsx(CheckCircle2, { className: "w-4 h-4" }) : _jsx(Send, { className: "w-4 h-4" }), onClick: () => setPublished(true), children: published ? 'Published to Sec-A!' : `Publish (${totalMarks} Marks)` })] })] }), _jsxs("section", { className: `p-6 sm:p-8 space-y-6 ${classes.card}`, children: [_jsxs("div", { className: "space-y-3 pb-5 border-b border-slate-100", children: [_jsx("input", { type: "text", value: title, onChange: (e) => setTitle(e.target.value), className: "w-full text-2xl sm:text-3xl font-headline font-extrabold text-slate-900 bg-transparent border-0 focus:outline-none focus:ring-0 p-0" }), _jsxs("div", { className: "flex flex-wrap items-center gap-4 text-xs text-slate-600", children: [_jsxs("label", { className: "inline-flex items-center gap-2 cursor-pointer font-semibold", children: [_jsx("input", { type: "checkbox", checked: antiCheat, onChange: (e) => setAntiCheat(e.target.checked), className: "rounded border-slate-300 text-primary focus:ring-primary" }), _jsx(ShieldCheck, { className: "w-4 h-4 text-primary" }), _jsx("span", { children: "Enforce Fullscreen & Tab-Switch Anti-Cheat" })] }), _jsx("span", { className: "font-mono text-slate-400", children: "\u2022" }), _jsxs("span", { className: "font-mono font-semibold text-primary", children: [blocks.length, " blocks \u2022 ", totalMarks, " total marks"] })] })] }), _jsx("div", { className: "space-y-4", children: blocks.map((block, index) => (_jsx("div", { className: `group p-4 sm:p-5 bg-slate-50/70 border border-slate-200/80 hover:border-primary/40 transition-colors ${cardRadius}`, children: _jsxs("div", { className: "flex items-start gap-3", children: [_jsx(GripVertical, { className: "w-4 h-4 text-slate-400 mt-1.5 shrink-0" }), _jsxs("div", { className: "flex-1 space-y-3 min-w-0", children: [_jsxs("div", { className: "flex items-center justify-between gap-2", children: [_jsx("span", { className: "px-2 py-0.5 rounded bg-white border border-slate-200 font-mono text-[10px] font-bold uppercase text-slate-500", children: block.type === 'heading' ? 'Heading Block' : `Q${index} • ${block.type}` }), _jsxs("div", { className: "flex items-center gap-2", children: [block.type !== 'heading' && (_jsxs(_Fragment, { children: [_jsx("input", { type: "text", value: block.topic || '', onChange: (e) => updateBlock(block.id, { topic: e.target.value }), placeholder: "Topic tag", className: "px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-label text-slate-700 w-32" }), _jsx("input", { type: "number", min: 1, value: block.marks || 5, onChange: (e) => updateBlock(block.id, { marks: Number(e.target.value) || 1 }), className: "px-2 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-mono text-primary font-bold w-16" })] })), _jsx("button", { type: "button", onClick: () => deleteBlock(block.id), "aria-label": "Delete block", className: "p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors", children: _jsx(Trash2, { className: "w-4 h-4" }) })] })] }), _jsx("textarea", { rows: block.type === 'heading' ? 1 : 2, value: block.content, onChange: (e) => updateBlock(block.id, { content: e.target.value }), className: `w-full bg-white px-3.5 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 ${block.type === 'heading'
                                                        ? 'font-headline font-bold text-lg text-slate-900'
                                                        : 'text-sm text-slate-800'}` }), block.type === 'mcq' && block.options && (_jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-2", children: block.options.map((opt, optIdx) => {
                                                        const isCorrect = block.correctAnswer === opt;
                                                        return (_jsxs("div", { className: `flex items-center gap-2 px-3 py-2 rounded-xl border text-xs ${isCorrect
                                                                ? 'bg-teal-50 border-primary text-primary font-semibold'
                                                                : 'bg-white border-slate-200 text-slate-700'}`, children: [_jsx("input", { type: "radio", name: `correct-${block.id}`, checked: isCorrect, onChange: () => updateBlock(block.id, { correctAnswer: opt }), className: "text-primary focus:ring-primary" }), _jsx("input", { type: "text", value: opt, onChange: (e) => {
                                                                        const updated = [...(block.options || [])];
                                                                        const wasCorrect = block.correctAnswer === opt;
                                                                        updated[optIdx] = e.target.value;
                                                                        updateBlock(block.id, {
                                                                            options: updated,
                                                                            ...(wasCorrect ? { correctAnswer: e.target.value } : {}),
                                                                        });
                                                                    }, className: "w-full bg-transparent focus:outline-none" })] }, optIdx));
                                                    }) }))] })] }) }, block.id))) }), _jsxs("div", { className: "pt-4 border-t border-slate-100 flex flex-wrap items-center gap-2", children: [_jsx("span", { className: "text-xs font-label font-bold text-slate-500 mr-1", children: "/ Insert block:" }), _jsx(Button, { size: "sm", variant: "outline", leftIcon: _jsx(Plus, { className: "w-3.5 h-3.5" }), onClick: () => addBlock('mcq'), children: "MCQ Question" }), _jsx(Button, { size: "sm", variant: "outline", leftIcon: _jsx(Plus, { className: "w-3.5 h-3.5" }), onClick: () => addBlock('short_answer'), children: "Short Answer" }), _jsx(Button, { size: "sm", variant: "outline", leftIcon: _jsx(Plus, { className: "w-3.5 h-3.5" }), onClick: () => addBlock('heading'), children: "Section Heading" })] })] }), _jsx(BaseModal, { open: aiOpen, onClose: () => setAiOpen(false), title: "AI Test Generator (Cloudflare Worker Router)", description: "Generates cheat-proof MCQ blocks with topic tags & sealed answer keys.", children: _jsxs("form", { onSubmit: runAiGenerator, className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-xs font-label font-semibold text-slate-700 mb-1.5", children: "Syllabus Topics or Lecture Notes" }), _jsx("input", { type: "text", required: true, value: aiTopic, onChange: (e) => setAiTopic(e.target.value), className: `w-full px-3.5 py-2.5 text-sm ${classes.input}` })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-label font-semibold text-slate-700 mb-1.5", children: "Number of Questions" }), _jsxs("select", { value: aiCount, onChange: (e) => setAiCount(Number(e.target.value)), className: `w-full px-3.5 py-2.5 text-sm ${classes.input}`, children: [_jsx("option", { value: 2, children: "2 Questions (Quick Add)" }), _jsx("option", { value: 5, children: "5 Questions (Quiz)" }), _jsx("option", { value: 10, children: "10 Questions (Full Section)" })] })] }), _jsxs("div", { className: "flex justify-end gap-2 pt-2", children: [_jsx(Button, { type: "button", variant: "ghost", onClick: () => setAiOpen(false), children: "Cancel" }), _jsx(Button, { type: "submit", leftIcon: _jsx(Sparkles, { className: "w-4 h-4" }), children: "Generate Blocks" })] })] }) })] }) }));
}
//# sourceMappingURL=TeacherTestStudio.js.map