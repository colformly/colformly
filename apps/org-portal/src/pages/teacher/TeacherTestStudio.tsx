import { useState } from 'react';
import {
  CheckCircle2,
  GripVertical,
  Plus,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
} from 'lucide-react';
import type { TestBlock } from '@colformly/types';
import { useTheme } from '@colformly/theme';
import { BaseModal, Button } from '@colformly/ui';
import { PortalShell } from '../../layouts/PortalShell';

const INITIAL_BLOCKS: TestBlock[] = [
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
  const [blocks, setBlocks] = useState<TestBlock[]>(INITIAL_BLOCKS);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiTopic, setAiTopic] = useState('Dynamic Programming & PostgreSQL Indexing');
  const [aiCount, setAiCount] = useState(2);
  const [published, setPublished] = useState(false);

  const addBlock = (type: TestBlock['type']) => {
    const next: TestBlock =
      type === 'heading'
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

  const updateBlock = (id: string, patch: Partial<TestBlock>) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  };

  const deleteBlock = (id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  };

  const runAiGenerator = (e: React.FormEvent) => {
    e.preventDefault();
    const generated: TestBlock[] = Array.from({ length: aiCount }).map((_, idx) => ({
      id: `ai-${Date.now()}-${idx}`,
      type: 'mcq',
      content:
        idx === 0
          ? `[AI Generated] In ${aiTopic}, which principle prevents redundant subproblem recomputation?`
          : `[AI Generated] Which index structure accelerates range queries in ${aiTopic}?`,
      options:
        idx === 0
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

  return (
    <PortalShell persona="teacher">
      <div className="space-y-6">
        {/* Studio Top Bar */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="font-label text-xs text-primary font-bold uppercase tracking-wider mb-1">
              Notion-Style Block Editor
            </p>
            <h1 className="font-headline font-bold text-2xl sm:text-3xl text-slate-900">
              Test Studio
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              size="sm"
              variant="secondary"
              leftIcon={<Sparkles className="w-4 h-4" />}
              onClick={() => setAiOpen(true)}
            >
              AI Test Generator
            </Button>
            <Button
              size="sm"
              leftIcon={published ? <CheckCircle2 className="w-4 h-4" /> : <Send className="w-4 h-4" />}
              onClick={() => setPublished(true)}
            >
              {published ? 'Published to Sec-A!' : `Publish (${totalMarks} Marks)`}
            </Button>
          </div>
        </header>

        {/* Document Canvas */}
        <section className={`p-6 sm:p-8 space-y-6 ${classes.card}`}>
          {/* Document Header */}
          <div className="space-y-3 pb-5 border-b border-slate-100">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-2xl sm:text-3xl font-headline font-extrabold text-slate-900 bg-transparent border-0 focus:outline-none focus:ring-0 p-0"
            />
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
              <label className="inline-flex items-center gap-2 cursor-pointer font-semibold">
                <input
                  type="checkbox"
                  checked={antiCheat}
                  onChange={(e) => setAntiCheat(e.target.checked)}
                  className="rounded border-slate-300 text-primary focus:ring-primary"
                />
                <ShieldCheck className="w-4 h-4 text-primary" />
                <span>Enforce Fullscreen &amp; Tab-Switch Anti-Cheat</span>
              </label>
              <span className="font-mono text-slate-400">•</span>
              <span className="font-mono font-semibold text-primary">
                {blocks.length} blocks • {totalMarks} total marks
              </span>
            </div>
          </div>

          {/* Notion-Style Blocks */}
          <div className="space-y-4">
            {blocks.map((block, index) => (
              <div
                key={block.id}
                className={`group p-4 sm:p-5 bg-slate-50/70 border border-slate-200/80 hover:border-primary/40 transition-colors ${cardRadius}`}
              >
                <div className="flex items-start gap-3">
                  <GripVertical className="w-4 h-4 text-slate-400 mt-1.5 shrink-0" />
                  <div className="flex-1 space-y-3 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2 py-0.5 rounded bg-white border border-slate-200 font-mono text-[10px] font-bold uppercase text-slate-500">
                        {block.type === 'heading' ? 'Heading Block' : `Q${index} • ${block.type}`}
                      </span>
                      <div className="flex items-center gap-2">
                        {block.type !== 'heading' && (
                          <>
                            <input
                              type="text"
                              value={block.topic || ''}
                              onChange={(e) => updateBlock(block.id, { topic: e.target.value })}
                              placeholder="Topic tag"
                              className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-label text-slate-700 w-32"
                            />
                            <input
                              type="number"
                              min={1}
                              value={block.marks || 5}
                              onChange={(e) =>
                                updateBlock(block.id, { marks: Number(e.target.value) || 1 })
                              }
                              className="px-2 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-mono text-primary font-bold w-16"
                            />
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => deleteBlock(block.id)}
                          aria-label="Delete block"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <textarea
                      rows={block.type === 'heading' ? 1 : 2}
                      value={block.content}
                      onChange={(e) => updateBlock(block.id, { content: e.target.value })}
                      className={`w-full bg-white px-3.5 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 ${
                        block.type === 'heading'
                          ? 'font-headline font-bold text-lg text-slate-900'
                          : 'text-sm text-slate-800'
                      }`}
                    />

                    {block.type === 'mcq' && block.options && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {block.options.map((opt, optIdx) => {
                          const isCorrect = block.correctAnswer === opt;
                          return (
                            <div
                              key={optIdx}
                              className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs ${
                                isCorrect
                                  ? 'bg-teal-50 border-primary text-primary font-semibold'
                                  : 'bg-white border-slate-200 text-slate-700'
                              }`}
                            >
                              <input
                                type="radio"
                                name={`correct-${block.id}`}
                                checked={isCorrect}
                                onChange={() => updateBlock(block.id, { correctAnswer: opt })}
                                className="text-primary focus:ring-primary"
                              />
                              <input
                                type="text"
                                value={opt}
                                onChange={(e) => {
                                  const updated = [...(block.options || [])];
                                  const wasCorrect = block.correctAnswer === opt;
                                  updated[optIdx] = e.target.value;
                                  updateBlock(block.id, {
                                    options: updated,
                                    ...(wasCorrect ? { correctAnswer: e.target.value } : {}),
                                  });
                                }}
                                className="w-full bg-transparent focus:outline-none"
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Slash-style Quick Add Bar */}
          <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center gap-2">
            <span className="text-xs font-label font-bold text-slate-500 mr-1">/ Insert block:</span>
            <Button size="sm" variant="outline" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={() => addBlock('mcq')}>
              MCQ Question
            </Button>
            <Button size="sm" variant="outline" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={() => addBlock('short_answer')}>
              Short Answer
            </Button>
            <Button size="sm" variant="outline" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={() => addBlock('heading')}>
              Section Heading
            </Button>
          </div>
        </section>

        {/* AI Test Generator Modal */}
        <BaseModal
          open={aiOpen}
          onClose={() => setAiOpen(false)}
          title="AI Test Generator (Cloudflare Worker Router)"
          description="Generates cheat-proof MCQ blocks with topic tags & sealed answer keys."
        >
          <form onSubmit={runAiGenerator} className="space-y-4">
            <div>
              <label className="block text-xs font-label font-semibold text-slate-700 mb-1.5">
                Syllabus Topics or Lecture Notes
              </label>
              <input
                type="text"
                required
                value={aiTopic}
                onChange={(e) => setAiTopic(e.target.value)}
                className={`w-full px-3.5 py-2.5 text-sm ${classes.input}`}
              />
            </div>
            <div>
              <label className="block text-xs font-label font-semibold text-slate-700 mb-1.5">
                Number of Questions
              </label>
              <select
                value={aiCount}
                onChange={(e) => setAiCount(Number(e.target.value))}
                className={`w-full px-3.5 py-2.5 text-sm ${classes.input}`}
              >
                <option value={2}>2 Questions (Quick Add)</option>
                <option value={5}>5 Questions (Quiz)</option>
                <option value={10}>10 Questions (Full Section)</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setAiOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" leftIcon={<Sparkles className="w-4 h-4" />}>
                Generate Blocks
              </Button>
            </div>
          </form>
        </BaseModal>
      </div>
    </PortalShell>
  );
}
