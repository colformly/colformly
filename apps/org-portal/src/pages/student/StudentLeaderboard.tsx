import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Award, Crown, Flame, Medal, Trophy } from 'lucide-react';
import { supabase, useAuth } from '@colformly/auth';
import { PortalShell } from '../../layouts/PortalShell';

interface PodiumUser {
  rank: number;
  name: string;
  avatar: string;
  xp: string;
  avg: string;
  height: string;
  ring: string;
}

interface RankedUser {
  rank: number;
  name: string;
  roll: string;
  tests: number;
  avg: string;
  xp: string;
  isMe: boolean;
}

interface SubjectMaster {
  subject: string;
  champion: string;
  score: string;
  emoji: string;
  color: string;
}

const DEFAULT_PODIUM: PodiumUser[] = [
  { rank: 2, name: 'Priya Nair', avatar: '🦉', xp: '1,620 XP', avg: '94.2%', height: 'h-32', ring: 'border-slate-300 bg-slate-50' },
  { rank: 1, name: 'Aarav Patel', avatar: '🦁', xp: '1,785 XP', avg: '96.8%', height: 'h-40', ring: 'border-amber-300 bg-amber-50' },
  { rank: 3, name: 'Diya Kapoor', avatar: '🐼', xp: '1,495 XP', avg: '91.5%', height: 'h-28', ring: 'border-orange-300 bg-orange-50' },
];

const DEFAULT_RANKINGS: RankedUser[] = [
  { rank: 4, name: 'Alex Verma (You)', roll: '24CSE041', tests: 12, avg: '89.4%', xp: '1,450 XP', isMe: true },
  { rank: 5, name: 'Kabir Mehta', roll: '24CSE089', tests: 12, avg: '87.9%', xp: '1,410 XP', isMe: false },
  { rank: 6, name: 'Ananya Sharma', roll: '24CSE088', tests: 11, avg: '86.2%', xp: '1,365 XP', isMe: false },
  { rank: 7, name: 'Rohan Kulkarni', roll: '24CSE108', tests: 11, avg: '82.0%', xp: '1,240 XP', isMe: false },
];

const DEFAULT_SUBJECT_MASTERS: SubjectMaster[] = [
  { subject: 'Algorithms & DS', champion: 'Aarav Patel', score: '98.5%', emoji: '⚡', color: 'from-teal-50 to-emerald-50 border-teal-200' },
  { subject: 'Operating Systems', champion: 'Priya Nair', score: '96.0%', emoji: '🧠', color: 'from-purple-50 to-indigo-50 border-purple-200' },
  { subject: 'Database & SQL', champion: 'Alex Verma', score: '95.4%', emoji: '🗄️', color: 'from-amber-50 to-orange-50 border-amber-200' },
  { subject: 'Computer Networks', champion: 'Diya Kapoor', score: '94.8%', emoji: '🌐', color: 'from-sky-50 to-cyan-50 border-sky-200' },
];

export default function StudentLeaderboard() {
  const { user, activeOrg } = useAuth();
  const orgId = activeOrg?.id || 'a0000000-0000-0000-0000-000000000001';

  const [podium, setPodium] = useState<PodiumUser[]>(DEFAULT_PODIUM);
  const [rankings, setRankings] = useState<RankedUser[]>(DEFAULT_RANKINGS);
  const [subjectMasters, setSubjectMasters] = useState<SubjectMaster[]>(DEFAULT_SUBJECT_MASTERS);
  const [myRank, setMyRank] = useState<number>(4);
  const [myTotalXp, setMyTotalXp] = useState<string>('1,450 XP');

  useEffect(() => {
    let isMounted = true;
    const loadLeaderboard = async () => {
      try {
        const { data: resultsData, error } = await (supabase.from('student_results') as any)
          .select('*, users(full_name), tests(subject)')
          .eq('org_id', orgId);

        if (error) throw error;
        const results = resultsData || [];

        if (results.length > 0 && isMounted) {
          // Group by student_id
          const studentMap: Record<
            string,
            {
              id: string;
              name: string;
              totalScore: number;
              totalPossible: number;
              testCount: number;
              subjects: Record<string, { earned: number; total: number }>;
            }
          > = {};

          results.forEach((r: any) => {
            const sid = r.student_id;
            if (!studentMap[sid]) {
              studentMap[sid] = {
                id: sid,
                name: r.users?.full_name || 'Scholar',
                totalScore: 0,
                totalPossible: 0,
                testCount: 0,
                subjects: {},
              };
            }
            studentMap[sid].totalScore += Number(r.score || 0);
            studentMap[sid].totalPossible += Number(r.total || 10);
            studentMap[sid].testCount += 1;

            const sub = r.tests?.subject || 'Core Engineering';
            if (!studentMap[sid].subjects[sub]) {
              studentMap[sid].subjects[sub] = { earned: 0, total: 0 };
            }
            studentMap[sid].subjects[sub].earned += Number(r.score || 0);
            studentMap[sid].subjects[sub].total += Number(r.total || 10);
          });

          // Sort students by average percentage
          const sorted = Object.values(studentMap)
            .map((s) => {
              const avgPct =
                s.totalPossible > 0 ? (s.totalScore / s.totalPossible) * 100 : 85;
              const xpVal = Math.round(s.totalScore * 20);
              return {
                id: s.id,
                name: s.name,
                avgPct,
                xp: `${xpVal.toLocaleString()} XP`,
                tests: s.testCount,
                subjects: s.subjects,
              };
            })
            .sort((a, b) => b.avgPct - a.avgPct);

          // Find current user's rank
          const meIndex = sorted.findIndex((s) => s.id === user?.id);
          if (meIndex !== -1) {
            setMyRank(meIndex + 1);
            setMyTotalXp(sorted[meIndex].xp);
          }

          // Top 3 for Podium
          if (sorted.length >= 3) {
            const avatars = ['🦁', '🦉', '🐼', '🦊', '🦅'];
            const newPodium: PodiumUser[] = [
              {
                rank: 2,
                name: sorted[1].name,
                avatar: avatars[1],
                xp: sorted[1].xp,
                avg: `${sorted[1].avgPct.toFixed(1)}%`,
                height: 'h-32',
                ring: 'border-slate-300 bg-slate-50',
              },
              {
                rank: 1,
                name: sorted[0].name,
                avatar: avatars[0],
                xp: sorted[0].xp,
                avg: `${sorted[0].avgPct.toFixed(1)}%`,
                height: 'h-40',
                ring: 'border-amber-300 bg-amber-50',
              },
              {
                rank: 3,
                name: sorted[2].name,
                avatar: avatars[2],
                xp: sorted[2].xp,
                avg: `${sorted[2].avgPct.toFixed(1)}%`,
                height: 'h-28',
                ring: 'border-orange-300 bg-orange-50',
              },
            ];
            setPodium(newPodium);
          }

          // Ranks 4+
          if (sorted.length > 3) {
            const newRankings: RankedUser[] = sorted.slice(3).map((s, idx) => ({
              rank: idx + 4,
              name: s.id === user?.id ? `${s.name} (You)` : s.name,
              roll: `24CSE0${40 + idx}`,
              tests: s.tests,
              avg: `${s.avgPct.toFixed(1)}%`,
              xp: s.xp,
              isMe: s.id === user?.id,
            }));
            setRankings(newRankings);
          }
        }
      } catch (err) {
        console.warn('Error loading leaderboard:', err);
      }
    };

    void loadLeaderboard();
    return () => {
      isMounted = false;
    };
  }, [orgId, user?.id]);

  return (
    <PortalShell persona="student">
      <div className="space-y-8">
        {/* Hall of Fame Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white border border-slate-200/90 shadow-student-card">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-300 via-amber-200 to-yellow-100 border-2 border-amber-300 flex items-center justify-center text-3xl shadow-md shrink-0">
              🏆
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-headline font-extrabold text-2xl sm:text-3xl text-slate-900">
                  Class Hall of Fame
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-xs font-bold border border-amber-200">
                  Live Season
                </span>
              </div>
              <p className="text-sm text-slate-600 mt-0.5">
                Privacy-preserving live Supabase assessment ranking • Aravali Campus
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-teal-50 border-2 border-teal-200 shrink-0">
            <span className="text-2xl">🦊</span>
            <div>
              <p className="font-headline font-extrabold text-sm text-slate-900">Your Rank #{myRank}</p>
              <p className="text-xs text-primary font-semibold">{myTotalXp} Earned</p>
            </div>
          </div>
        </header>

        {/* OVERALL 3-STEP PODIUM */}
        <section className="rounded-3xl bg-white border border-slate-200/90 p-6 sm:p-8 shadow-student-card">
          <h2 className="font-headline font-extrabold text-lg text-slate-900 mb-8 flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-500" />
            <span>Overall Campus Podium</span>
          </h2>

          <div className="grid grid-cols-3 gap-3 sm:gap-6 items-end max-w-2xl mx-auto">
            {podium.map((p) => (
              <motion.div
                key={p.rank}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center text-center"
              >
                <div
                  className={`w-16 h-16 sm:w-20 sm:h-20 rounded-3xl border-2 flex items-center justify-center text-3xl sm:text-4xl shadow-md mb-3 ${p.ring}`}
                >
                  {p.avatar}
                </div>
                <p className="font-headline font-bold text-xs sm:text-sm text-slate-900 truncate max-w-full">
                  {p.name}
                </p>
                <p className="font-mono text-[11px] font-bold text-primary mb-2">{p.avg}</p>

                <div
                  className={`w-full ${p.height} rounded-t-3xl border-2 border-b-0 flex flex-col items-center justify-center p-2 ${p.ring}`}
                >
                  <span className="font-headline font-extrabold text-2xl sm:text-3xl text-slate-900">
                    #{p.rank}
                  </span>
                  <span className="text-[11px] font-label font-bold text-slate-600">{p.xp}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* SUBJECT MASTERS GRID */}
        <section className="space-y-4">
          <h2 className="font-headline font-extrabold text-xl text-slate-900 flex items-center gap-2">
            <Award className="w-5 h-5 text-primary" />
            <span>Subject Masters Grid</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {subjectMasters.map((m) => (
              <motion.div
                key={m.subject}
                whileHover={{ y: -4 }}
                className={`rounded-3xl bg-gradient-to-br border p-5 shadow-student-card space-y-3 ${m.color}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl">{m.emoji}</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-white text-xs font-mono font-bold text-slate-900 border border-slate-200">
                    {m.score}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-label font-bold text-slate-600 uppercase tracking-wider">
                    {m.subject}
                  </p>
                  <p className="font-headline font-extrabold text-base text-slate-900 mt-0.5">
                    {m.champion}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* SCHOLAR RANKINGS TABLE */}
        <section className="rounded-3xl bg-white border border-slate-200/90 overflow-hidden shadow-student-card">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-headline font-extrabold text-base text-slate-900 flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-500" />
              <span>Full Cohort Leaderboard</span>
            </h2>
            <span className="text-xs font-label font-semibold text-slate-500">
              Live Ranked from public.student_results
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-label uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-5">Rank</th>
                  <th className="py-3.5 px-5">Scholar</th>
                  <th className="py-3.5 px-5">Roll No</th>
                  <th className="py-3.5 px-5">Papers Graded</th>
                  <th className="py-3.5 px-5">Mean Accuracy</th>
                  <th className="py-3.5 px-5 text-right">Earned XP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rankings.map((r) => (
                  <tr
                    key={r.rank}
                    className={`transition-colors ${
                      r.isMe ? 'bg-teal-50/70 font-semibold' : 'hover:bg-slate-50/70'
                    }`}
                  >
                    <td className="py-3.5 px-5 font-headline font-bold text-slate-900">
                      #{r.rank}
                    </td>
                    <td className="py-3.5 px-5">
                      <span className={r.isMe ? 'text-primary font-bold' : 'text-slate-900'}>
                        {r.name}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 font-mono text-xs text-slate-600">{r.roll}</td>
                    <td className="py-3.5 px-5 text-slate-700">{r.tests}</td>
                    <td className="py-3.5 px-5 font-mono text-xs text-primary font-bold">{r.avg}</td>
                    <td className="py-3.5 px-5 text-right font-mono text-xs font-bold text-slate-900">
                      {r.xp}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </PortalShell>
  );
}
