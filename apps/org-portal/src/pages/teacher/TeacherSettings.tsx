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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [blessings, setBlessings] = useState<string[]>(INITIAL_BLESSINGS);
  const [newBlessing, setNewBlessing] = useState('');
  const [saved, setSaved] = useState(false);

  const getCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCoords(e);
    ctx.strokeStyle = '#0F766E';
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    setDrawing(true);
  };

  const moveDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCoords(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const endDraw = () => {
    if (!drawing) return;
    setDrawing(false);
    if (canvasRef.current) {
      setSignatureData(canvasRef.current.toDataURL('image/png'));
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureData(null);
  };

  const addBlessing = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBlessing.trim()) return;
    setBlessings((prev) => [newBlessing.trim(), ...prev]);
    setNewBlessing('');
  };

  return (
    <PortalShell persona="teacher">
      <div className="space-y-7">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="font-label text-xs text-primary font-bold uppercase tracking-wider mb-1">
              Human Touch in Automated Grading
            </p>
            <h1 className="font-headline font-bold text-2xl sm:text-3xl text-slate-900">
              Handwriting Signature &amp; Grading Blessings
            </h1>
          </div>

          <Button
            size="sm"
            leftIcon={<Check className="w-4 h-4" />}
            onClick={() => {
              setSaved(true);
              setTimeout(() => setSaved(false), 2400);
            }}
          >
            {saved ? 'Saved to Profile!' : 'Save Faculty Preferences'}
          </Button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
          {/* Left: Handwriting Signature Canvas */}
          <section className={`lg:col-span-6 p-6 space-y-4 ${classes.card}`}>
            <div className="flex items-center justify-between">
              <h2 className="font-headline font-bold text-base text-slate-900 flex items-center gap-2">
                <PenTool className="w-4 h-4 text-primary" />
                <span>Handwriting Signature Pad</span>
              </h2>
              <button
                type="button"
                onClick={clearSignature}
                className="inline-flex items-center gap-1 text-xs font-label font-semibold text-slate-500 hover:text-rose-600"
              >
                <Eraser className="w-3.5 h-3.5" /> Clear
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Draw your signature below. It automatically stamps onto student SVG graded scorecards.
            </p>

            <div className={`border-2 border-dashed border-slate-300 bg-cream-bg paper-grid overflow-hidden ${cardRadius}`}>
              <canvas
                ref={canvasRef}
                width={480}
                height={180}
                onPointerDown={startDraw}
                onPointerMove={moveDraw}
                onPointerUp={endDraw}
                onPointerLeave={endDraw}
                className="w-full h-44 touch-none cursor-crosshair block"
              />
            </div>

            {/* Live Stamp Preview */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-label uppercase tracking-wider font-bold text-slate-400 block">
                  Student Scorecard Stamp Preview
                </span>
                {signatureData ? (
                  <img src={signatureData} alt="Drawn faculty signature" className="h-12 mt-1" />
                ) : (
                  <p className="font-signature text-3xl text-primary mt-1">Prof. Sarah Mitchell</p>
                )}
              </div>
              <span className="px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-primary font-mono text-xs font-bold">
                Verified Ink
              </span>
            </div>
          </section>

          {/* Right: Custom Grading Blessings */}
          <section className={`lg:col-span-6 p-6 space-y-4 ${classes.card}`}>
            <h2 className="font-headline font-bold text-base text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span>Custom Grading Blessings</span>
            </h2>
            <p className="text-xs text-slate-500">
              Colformly automatically attaches a personalized encouraging remark from your curated
              list based on student performance bands.
            </p>

            <form onSubmit={addBlessing} className="flex gap-2">
              <input
                type="text"
                value={newBlessing}
                onChange={(e) => setNewBlessing(e.target.value)}
                placeholder="Write a custom note (e.g., Stellar proofs!)"
                className={`flex-1 px-3.5 py-2.5 text-sm ${classes.input}`}
              />
              <Button type="submit" size="sm" leftIcon={<Plus className="w-4 h-4" />}>
                Add
              </Button>
            </form>

            <div className="space-y-2.5 pt-2">
              {blessings.map((b, idx) => (
                <div
                  key={`${b}-${idx}`}
                  className="p-3.5 rounded-2xl bg-teal-50/60 border border-teal-200/80 flex items-center justify-between gap-3"
                >
                  <p className="text-sm text-slate-800 italic">“{b}”</p>
                  <button
                    type="button"
                    onClick={() => setBlessings((prev) => prev.filter((_, i) => i !== idx))}
                    aria-label="Remove blessing"
                    className="p-1 rounded-full text-slate-400 hover:text-rose-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </PortalShell>
  );
}
