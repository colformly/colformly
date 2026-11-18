import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useRef, useState } from 'react';
import { Check, Eraser, PenTool, Plus, Sparkles, X } from 'lucide-react';
import { useTheme } from '@colformly/theme';
import { Button } from '@colformly/ui';
import { PortalShell } from '../../layouts/PortalShell';
const INITIAL_BLESSINGS = [
    'Outstanding clarity and rigor — keep pushing! 🌟',
    'Strong algorithmic thinking — review edge cases on DP!',
    'Great improvement since the last quiz! Proud of your effort.',
];
export default function TeacherSettings() {
    const { classes, cardRadius } = useTheme();
    const canvasRef = useRef(null);
    const [drawing, setDrawing] = useState(false);
    const [signatureData, setSignatureData] = useState(null);
    const [blessings, setBlessings] = useState(INITIAL_BLESSINGS);
    const [newBlessing, setNewBlessing] = useState('');
    const [saved, setSaved] = useState(false);
    const getCoords = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const startDraw = (e) => {
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx)
            return;
        const { x, y } = getCoords(e);
        ctx.strokeStyle = '#0F766E';
        ctx.lineWidth = 2.6;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(x, y);
        setDrawing(true);
    };
    const moveDraw = (e) => {
        if (!drawing)
            return;
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx)
            return;
        const { x, y } = getCoords(e);
        ctx.lineTo(x, y);
        ctx.stroke();
    };
    const endDraw = () => {
        if (!drawing)
            return;
        setDrawing(false);
        if (canvasRef.current) {
            setSignatureData(canvasRef.current.toDataURL('image/png'));
        }
    };
    const clearSignature = () => {
        const canvas = canvasRef.current;
        if (!canvas)
            return;
        canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
        setSignatureData(null);
    };
    const addBlessing = (e) => {
        e.preventDefault();
        if (!newBlessing.trim())
            return;
        setBlessings((prev) => [newBlessing.trim(), ...prev]);
        setNewBlessing('');
    };
    return (_jsx(PortalShell, { persona: "teacher", children: _jsxs("div", { className: "space-y-7", children: [_jsxs("header", { className: "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4", children: [_jsxs("div", { children: [_jsx("p", { className: "font-label text-xs text-primary font-bold uppercase tracking-wider mb-1", children: "Human Touch in Automated Grading" }), _jsx("h1", { className: "font-headline font-bold text-2xl sm:text-3xl text-slate-900", children: "Handwriting Signature & Grading Blessings" })] }), _jsx(Button, { size: "sm", leftIcon: _jsx(Check, { className: "w-4 h-4" }), onClick: () => {
                                setSaved(true);
                                setTimeout(() => setSaved(false), 2400);
                            }, children: saved ? 'Saved to Profile!' : 'Save Faculty Preferences' })] }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-12 gap-7 items-start", children: [_jsxs("section", { className: `lg:col-span-6 p-6 space-y-4 ${classes.card}`, children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("h2", { className: "font-headline font-bold text-base text-slate-900 flex items-center gap-2", children: [_jsx(PenTool, { className: "w-4 h-4 text-primary" }), _jsx("span", { children: "Handwriting Signature Pad" })] }), _jsxs("button", { type: "button", onClick: clearSignature, className: "inline-flex items-center gap-1 text-xs font-label font-semibold text-slate-500 hover:text-rose-600", children: [_jsx(Eraser, { className: "w-3.5 h-3.5" }), " Clear"] })] }), _jsx("p", { className: "text-xs text-slate-500", children: "Draw your signature below. It automatically stamps onto student SVG graded scorecards." }), _jsx("div", { className: `border-2 border-dashed border-slate-300 bg-cream-bg paper-grid overflow-hidden ${cardRadius}`, children: _jsx("canvas", { ref: canvasRef, width: 480, height: 180, onPointerDown: startDraw, onPointerMove: moveDraw, onPointerUp: endDraw, onPointerLeave: endDraw, className: "w-full h-44 touch-none cursor-crosshair block" }) }), _jsxs("div", { className: "p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("span", { className: "text-[10px] font-label uppercase tracking-wider font-bold text-slate-400 block", children: "Student Scorecard Stamp Preview" }), signatureData ? (_jsx("img", { src: signatureData, alt: "Drawn faculty signature", className: "h-12 mt-1" })) : (_jsx("p", { className: "font-signature text-3xl text-primary mt-1", children: "Prof. Sarah Mitchell" }))] }), _jsx("span", { className: "px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-primary font-mono text-xs font-bold", children: "Verified Ink" })] })] }), _jsxs("section", { className: `lg:col-span-6 p-6 space-y-4 ${classes.card}`, children: [_jsxs("h2", { className: "font-headline font-bold text-base text-slate-900 flex items-center gap-2", children: [_jsx(Sparkles, { className: "w-4 h-4 text-primary" }), _jsx("span", { children: "Custom Grading Blessings" })] }), _jsx("p", { className: "text-xs text-slate-500", children: "Colformly automatically attaches a personalized encouraging remark from your curated list based on student performance bands." }), _jsxs("form", { onSubmit: addBlessing, className: "flex gap-2", children: [_jsx("input", { type: "text", value: newBlessing, onChange: (e) => setNewBlessing(e.target.value), placeholder: "Write a custom note (e.g., Stellar proofs!)", className: `flex-1 px-3.5 py-2.5 text-sm ${classes.input}` }), _jsx(Button, { type: "submit", size: "sm", leftIcon: _jsx(Plus, { className: "w-4 h-4" }), children: "Add" })] }), _jsx("div", { className: "space-y-2.5 pt-2", children: blessings.map((b, idx) => (_jsxs("div", { className: "p-3.5 rounded-2xl bg-teal-50/60 border border-teal-200/80 flex items-center justify-between gap-3", children: [_jsxs("p", { className: "text-sm text-slate-800 italic", children: ["\u201C", b, "\u201D"] }), _jsx("button", { type: "button", onClick: () => setBlessings((prev) => prev.filter((_, i) => i !== idx)), "aria-label": "Remove blessing", className: "p-1 rounded-full text-slate-400 hover:text-rose-600", children: _jsx(X, { className: "w-4 h-4" }) })] }, `${b}-${idx}`))) })] })] })] }) }));
}
//# sourceMappingURL=TeacherSettings.js.map