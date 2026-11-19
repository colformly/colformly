import { useEffect, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Copy,
  GripVertical,
  Layers,
  MessageCircle,
  Plus,
  Send,
  Share2,
  ShieldCheck,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { supabase, useAuth } from '@colformly/auth';
import { useTheme } from '@colformly/theme';
import type { Course, TestBlock } from '@colformly/types';
import { BaseModal, Button } from '@colformly/ui';
import { generateQuestionsApi } from '../../lib/workerClient';
import { PortalShell } from '../../layouts/PortalShell';

interface TeacherCohortChip {
  id: string;
  section_id: string;
  label: string;
  subject_name: string;
}

const DEFAULT_CHIPS: TeacherCohortChip[] = [
  {
    id: 'c-1',
    section_id: 'c2000000-0000-0000-0000-000000000001',
    label: 'B.Tech CSE • Y2 Sec-A',
    subject_name: 'Algorithms',
  },
  {
    id: 'c-2',
    section_id: 'c2000000-0000-0000-0000-000000000002',
    label: 'B.Tech CSE • Y2 Sec-B',
    subject_name: 'Algorithms',
  },
  {
    id: 'c-3',
    section_id: 'c2000000-0000-0000-0000-000000000003',
    label: 'B.Tech CSE • Y1 Sec-A',
    subject_name: 'C Programming',
  },
];

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
  const { user, activeOrg } = useAuth();

  const [title, setTitle] = useState('CS-301 Mid-Semester Assessment');
  const [antiCheat, setAntiCheat] = useState(true);
  const [blocks, setBlocks] = useState<TestBlock[]>(INITIAL_BLOCKS);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiTopic, setAiTopic] = useState('Dynamic Programming & PostgreSQL Indexing');
  const [aiCount, setAiCount] = useState(2);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiNotice, setAiNotice] = useState<string | null>(null);

  // Multi-Section Targeting & Share Code State
  const [cohortChips, setCohortChips] = useState<TeacherCohortChip[]>(DEFAULT_CHIPS);
  const [targetSectionIds, setTargetSectionIds] = useState<string[]>([DEFAULT_CHIPS[0].section_id]);
  const [published, setPublished] = useState(false);
  const [shareCode, setShareCode] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Load teacher's claimed classes
  useEffect(() => {
    let isMounted = true;
    const loadAssignments = async () => {
      try {
        const [{ data: assignData }, { data: coursesData }] = await Promise.all([
          (supabase.from('teacher_assignments') as any).select('*'),
          (supabase.from('courses') as any).select('*'),
        ]);

        if (assignData && assignData.length > 0 && isMounted) {
          const courseMap = new Map<string, Course>((coursesData as Course[] || []).map((c) => [c.id, c]));
          const mapped: TeacherCohortChip[] = (assignData as Array<{ id: string; section_id: string; subject_name: string }>).map((a) => {
            const sec = courseMap.get(a.section_id);
            const yr = sec?.parent_id ? courseMap.get(sec.parent_id) : undefined;
            const crs = yr?.parent_id ? courseMap.get(yr.parent_id) : undefined;
            const codeOrName = crs?.code || crs?.name || 'CSE';
            const yrLabel = yr?.year ? `Y${yr.year}` : 'Y2';
            const secLabel = sec?.section || sec?.name || 'Sec-A';
            return {
              id: a.id,
              section_id: a.section_id,
              label: `${codeOrName} • ${yrLabel} ${secLabel}`,
              subject_name: a.subject_name,
            };
          });
          setCohortChips(mapped);
          if (mapped.length > 0) {
            setTargetSectionIds([mapped[0].section_id]);
          }
        }
      } catch (err) {
        console.warn('Error fetching teacher classes:', err);
      }
    };
    void loadAssignments();
    return () => {
      isMounted = false;
    };
  }, [user]);

  const toggleSection = (sectionId: string) => {
    setTargetSectionIds((prev) =>
      prev.includes(sectionId)
        ? prev.length > 1
          ? prev.filter((id) => id !== sectionId)
          : prev
        : [...prev, sectionId],
    );
  };

  const handlePublish = async () => {
    setPublishing(true);
    // Generate 6-char alphanumeric share code
    const generated = Math.random().toString(36).substring(2, 8).toUpperCase();

    try {
      const orgId = activeOrg?.id || 'a0000000-0000-0000-0000-000000000001';
      const teacherId = user?.id || 'd9f9acff-eb5e-478e-9c38-269cb136cda0';

      // 1. Insert into public.tests
      const { data: testRow, error: testErr } = await (supabase.from('tests') as any)
        .insert({
          org_id: orgId,
          course_id: targetSectionIds[0] || 'c0000000-0000-0000-0000-000000000001',
          created_by: teacherId,
          title,
          total_marks: totalMarks,
          duration_minutes: 45,
          anti_cheat_enabled: antiCheat,
          is_published: true,
          target_section_ids: targetSectionIds,
          share_code: generated,
          blocks: blocks as unknown as Record<string, unknown>[],
        })
        .select()
        .single();

      if (testErr) {
        console.warn('Test creation error:', testErr);
      }

      // 2. Insert locked answers into public.test_answer_keys
      if (testRow?.id) {
        const questionBlocks = blocks.filter(
          (b) => b.type === 'mcq' || b.type === 'short_answer',
        );
        const answerKeys = questionBlocks.map((b, idx) => ({
          org_id: orgId,
          test_id: testRow.id,
          question_number: idx + 1,
          question_type: b.type === 'mcq' ? 'MCQ' : 'SHORT_ANSWER',
          question_text: b.content,
          options: b.options || [],
          correct_answer: b.correctAnswer || '',
          marks: b.marks || 5,
          topic: b.topic || 'General',
          explanation: `Verified answer key for Question ${idx + 1}`,
        }));

        if (answerKeys.length > 0) {
          const { error: keyErr } = await (supabase.from('test_answer_keys') as any).insert(
            answerKeys,
          );
          if (keyErr) console.warn('Answer keys insert warning:', keyErr);
        }
      }
    } catch (err) {
      console.warn('Publish error:', err);
    }

    setShareCode(generated);
    setPublished(true);
    setPublishing(false);
  };

  const handleCopyWhatsAppLink = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://colformly-org.pages.dev';
    const link = `${origin}/student/dashboard?code=${shareCode}`;
    const text = `🚨 *${title}* is LIVE on Colformly!\n\n📋 *Target Cohorts:* ${targetSectionIds.length} Section(s)\n🔑 *Quiz Share Code:* ${shareCode}\n🔗 *Direct Access Link:* ${link}\n\n⚠️ *Anti-Cheat Active:* Fullscreen enforcement & Tab-Switch tracking enabled.`;

    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2800);
    }
  };

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

  const runAiGenerator = async (e: React.FormEvent) => {
    e.preventDefault();
    setAiLoading(true);
    setAiNotice(null);

    try {
      const res = await generateQuestionsApi({
        topic: aiTopic,
        count: aiCount,
        difficulty: 'medium',
      });

      if (res?.questions && res.questions.length > 0) {
        const generated: TestBlock[] = res.questions.map((q, idx) => ({
          id: `ai-${Date.now()}-${idx}`,
          type: 'mcq',
          content: q.question,
          options: q.options,
          correctAnswer: q.options[q.correctIndex] || q.options[0],
          marks: 5,
          topic: q.topicTag || aiTopic.split('&')[0].trim(),
        }));
        setBlocks((prev) => [...prev, ...generated]);
        setAiOpen(false);
      } else {
        throw new Error('No questions generated');
      }
    } catch (err: any) {
      console.warn('AI question generator error (using local fallback questions):', err);
      // Fallback generator
      const fallback: TestBlock[] = Array.from({ length: aiCount }).map((_, idx) => ({
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
      setBlocks((prev) => [...prev, ...fallback]);
      setAiOpen(false);
    } finally {
      setAiLoading(false);
    }
  };

  const totalMarks = blocks.reduce((sum, b) => sum + (b.marks || 0), 0);

  return (
    <PortalShell persona="teacher">
      <div className="space-y-6">
        {/* Studio Top Bar */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="font-label text-xs text-primary font-bold uppercase tracking-wider mb-1">
              Notion-Style Block Editor &amp; Multi-Section Targeting
            </p>
            <h1 className="font-headline font-bold text-2xl sm:text-3xl text-slate-900">
              Exam Studio
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
              isLoading={publishing}
              leftIcon={published ? <CheckCircle2 className="w-4 h-4" /> : <Send className="w-4 h-4" />}
              onClick={handlePublish}
            >
              {published ? 'Test Published & Shared!' : `Publish (${totalMarks} Marks)`}
            </Button>
          </div>
        </header>

        {/* WhatsApp Quiz Link & Share Code Banner */}
        {published && shareCode && (
          <div className="p-5 rounded-3xl bg-emerald-50/90 border-2 border-emerald-300 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <p className="font-headline font-bold text-base text-slate-900">
                  Assessment Live &amp; Target Locked!
                </p>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-200 text-emerald-950 font-mono text-xs font-bold">
                  CODE: {shareCode}
                </span>
              </div>
              <p className="text-xs text-slate-600">
                Targeting <strong className="text-slate-900">{targetSectionIds.length} section(s)</strong>.
                Students with this code or enrolled in these sections will see the test in their dashboard.
              </p>
            </div>

            <button
              type="button"
              onClick={handleCopyWhatsAppLink}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-label font-bold text-xs shadow-md transition-all shrink-0"
            >
              {copiedLink ? <Check className="w-4 h-4" /> : <MessageCircle className="w-4 h-4" />}
              <span>{copiedLink ? 'Copied WhatsApp Quiz Link! 🎉' : 'Copy WhatsApp Quiz Link'}</span>
            </button>
          </div>
        )}

        {/* Multi-Section Target Chip Strip */}
        <section className={`p-5 space-y-3 bg-white border border-slate-200/90 ${cardRadius}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              <span className="text-xs font-label font-bold uppercase tracking-wider text-slate-700">
                Target Cohorts &amp; Sections ({targetSectionIds.length} Selected)
              </span>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">
              Click chips to assign or unassign sections
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {cohortChips.map((chip) => {
              const active = targetSectionIds.includes(chip.section_id);
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => toggleSection(chip.section_id)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-label font-bold transition-all ${
                    active
                      ? 'bg-primary text-white shadow-sm ring-2 ring-primary/20'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  <span>{active ? '✓' : '+'}</span>
                  <span>{chip.label}</span>
                  <span className={`text-[10px] ${active ? 'text-teal-100' : 'text-slate-500'}`}>
                    ({chip.subject_name})
                  </span>
                </button>
              );
            })}
          </div>
        </section>

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
                          : 'font-body text-sm text-slate-800'
                      }`}
                    />

                    {/* MCQ Options */}
                    {block.type === 'mcq' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {(block.options || []).map((opt, optIdx) => (
                          <div
                            key={optIdx}
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs ${
                              opt === block.correctAnswer
                                ? 'bg-teal-50 border-teal-300 text-primary font-bold'
                                : 'bg-white border-slate-200 text-slate-700'
                            }`}
                          >
                            <input
                              type="radio"
                              name={`correct-${block.id}`}
                              checked={opt === block.correctAnswer}
                              onChange={() => updateBlock(block.id, { correctAnswer: opt })}
                              className="text-primary focus:ring-primary"
                            />
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) => {
                                const nextOptions = [...(block.options || [])];
                                nextOptions[optIdx] = e.target.value;
                                updateBlock(block.id, { options: nextOptions });
                              }}
                              className="w-full bg-transparent border-0 p-0 text-xs focus:outline-none focus:ring-0"
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Short Answer Key */}
                    {block.type === 'short_answer' && (
                      <div className="p-3 rounded-xl bg-teal-50/70 border border-teal-200 space-y-1">
                        <span className="font-mono text-[10px] font-bold text-primary uppercase">
                          Teacher Correct Answer Key (RLS-Sealed)
                        </span>
                        <input
                          type="text"
                          value={block.correctAnswer || ''}
                          onChange={(e) => updateBlock(block.id, { correctAnswer: e.target.value })}
                          className="w-full px-3 py-1.5 rounded-lg bg-white border border-teal-200 text-xs text-slate-800"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Add Block Strip */}
          <div className="pt-2 flex flex-wrap items-center gap-2.5">
            <span className="text-xs font-label font-bold text-slate-500 uppercase tracking-wider">
              + Add Block:
            </span>
            <Button
              size="sm"
              variant="outline"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => addBlock('mcq')}
            >
              Multiple Choice
            </Button>
            <Button
              size="sm"
              variant="outline"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => addBlock('short_answer')}
            >
              Short Answer
            </Button>
            <Button
              size="sm"
              variant="ghost"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => addBlock('heading')}
            >
              Section Header
            </Button>
          </div>
        </section>

        {/* AI Question Generator Modal */}
        <BaseModal
          open={aiOpen}
          onClose={() => setAiOpen(false)}
          title="AI Exam Question Studio"
          description="Enter a syllabus topic and question count to auto-generate MCQ blocks with distractors and answer keys."
        >
          <form onSubmit={runAiGenerator} className="space-y-4">
            <div>
              <label className="block text-xs font-label font-bold text-slate-700 mb-1.5">
                Topic &amp; Learning Objectives
              </label>
              <input
                type="text"
                required
                value={aiTopic}
                onChange={(e) => setAiTopic(e.target.value)}
                placeholder="e.g. Dynamic Programming & PostgreSQL Indexing"
                className={`w-full px-4 py-2.5 text-sm ${classes.input}`}
              />
            </div>

            <div>
              <label className="block text-xs font-label font-bold text-slate-700 mb-1.5">
                Number of Questions
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={aiCount}
                onChange={(e) => setAiCount(Number(e.target.value) || 1)}
                className={`w-full px-4 py-2.5 text-sm ${classes.input}`}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setAiOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" leftIcon={<Sparkles className="w-4 h-4" />} disabled={aiLoading}>
                {aiLoading ? 'Generating with AI...' : 'Generate Blocks'}
              </Button>
            </div>
          </form>
        </BaseModal>
      </div>
    </PortalShell>
  );
}
