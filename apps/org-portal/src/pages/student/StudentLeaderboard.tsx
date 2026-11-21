import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Award, Crown, Flame, Trophy } from 'lucide-react';
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

const SUBJECT_THEMES = [
  { emoji: '⚡', color: 'from-teal-50 to-emerald-50 border-teal-200' },
  { emoji: '🧠', color: 'from-purple-50 to-indigo-50 border-purple-200' },
  { emoji: '🗄️', color: 'from-amber-50 to-orange-50 border-amber-200' },
  { emoji: '🌐', color: 'from-sky-50 to-cyan-50 border-sky-200' },
  { emoji: '🔬', color: 'from-rose-50 to-pink-50 border-rose-200' },
];

const AVATARS = ['🦁', '🦉', '🐼', '🦊', '🦅', '🐺', '🐬', '🐯'];

export default function StudentLeaderboard() {
  const { user, activeOrg } = useAuth();
  const orgId = activeOrg?.id || 'a0000000-0000-0000-0000-000000000001';

  const [podium, setPodium] = useState<PodiumUser[]>([]);
  const [rankings, setRankings] = useState<RankedUser[]>([]);
  const [subjectMasters, setSubjectMasters] = useState<SubjectMaster[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [myTotalXp, setMyTotalXp] = useState<string>('0 XP');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    const loadLeaderboard = async () => {
      try {
        setLoading(true);

        const [{ data: resultsData, error: resultsErr }, { data: usersData }, { data: orgUsersData }] =
          await Promise.all([
            (supabase.from('student_results') as any)
              .select('id, org_id, test_id, student_id, score, total, percentage, tests(subject)')
              .eq('org_id', orgId),
            (supabase.from('users') as any).select('id, full_name, email'),
            (supabase.from('org_users') as any).select('user_id, roll_number, invited_name').eq('org_id', orgId),
          ]);

        if (resultsErr) throw resultsErr;

        const results = resultsData || [];
        if (!isMounted) return;

        if (results.length === 0) {
          setPodium([]);
          setRankings([]);
          setSubjectMasters([]);
          setMyRank(null);
          setMyTotalXp('0 XP');
          return;
        }

        const userMap = new Map((usersData || []).map((u: any) => [u.id, u]));
        const orgUserMap = new Map((orgUsersData || []).map((ou: any) => [ou.user_id, ou]));

        // Group results by student_id
        const studentMap: Record<
          string,
          {
            id: string;
            name: string;
            roll: string;
            totalScore: number;
            totalPossible: number;
            testCount: number;
            subjects: Record<string, { earned: number; total: number }>;
          }
        > = {};

        // Track subject champions
        const subjectStats: Record<string, Record<string, { earned: number; total: number }>> = {};

        results.forEach((r: any) => {
          const sid = r.student_id;
          if (!sid) return;

          const u = userMap.get(sid) as any;
          const ou = orgUserMap.get(sid) as any;
          const sName = u?.full_name || ou?.invited_name || (u?.email ? u.email.split('@')[0] : 'Scholar');
          const sRoll = ou?.roll_number || 'Enrolled';

          if (!studentMap[sid]) {
            studentMap[sid] = {
              id: sid,
              name: sName,
              roll: sRoll,
              totalScore: 0,
              totalPossible: 0,
              testCount: 0,
              subjects: {},
            };
          }

          const scoreVal = Number(r.score || 0);
          const totalVal = Number(r.total || 10);

          studentMap[sid].totalScore += scoreVal;
          studentMap[sid].totalPossible += totalVal;
          studentMap[sid].testCount += 1;

          const sub = r.tests?.subject || 'General Assessment';
          if (!studentMap[sid].subjects[sub]) {
            studentMap[sid].subjects[sub] = { earned: 0, total: 0 };
          }
          studentMap[sid].subjects[sub].earned += scoreVal;
          studentMap[sid].subjects[sub].total += totalVal;

          if (!subjectStats[sub]) {
            subjectStats[sub] = {};
          }
          if (!subjectStats[sub][sid]) {
            subjectStats[sub][sid] = { earned: 0, total: 0 };
          }
          subjectStats[sub][sid].earned += scoreVal;
          subjectStats[sub][sid].total += totalVal;
        });

        // Sort students by average percentage descending
        const sorted = Object.values(studentMap)
          .map((s) => {
            const avgPct = s.totalPossible > 0 ? (s.totalScore / s.totalPossible) * 100 : 0;
            const xpVal = Math.round(s.totalScore * 20);
            return {
              id: s.id,
              name: s.name,
              roll: s.roll,
              avgPct,
              xp: `${xpVal.toLocaleString()} XP`,
              rawXp: xpVal,
              tests: s.testCount,
            };
          })
          .sort((a, b) => b.avgPct - a.avgPct);

        // Find current logged in student's rank
        const meIndex = sorted.findIndex((s) => s.id === user?.id);
        if (meIndex !== -1) {
          setMyRank(meIndex + 1);
          setMyTotalXp(sorted[meIndex].xp);
        } else {
          setMyRank(null);
          setMyTotalXp('0 XP');
        }

        // Build Podium (Top 3)
        const newPodium: PodiumUser[] = [];
        if (sorted.length >= 1) {
          // Rank 2 (left) if exists
          if (sorted.length >= 2) {
            newPodium.push({
              rank: 2,
              name: sorted[1].name,
              avatar: AVATARS[1 % AVATARS.length],
              xp: sorted[1].xp,
              avg: `${sorted[1].avgPct.toFixed(1)}%`,
              height: 'h-32',
              ring: 'border-slate-300 bg-slate-50',
            });
          }
          // Rank 1 (center)
          newPodium.push({
            rank: 1,
            name: sorted[0].name,
            avatar: AVATARS[0],
            xp: sorted[0].xp,
            avg: `${sorted[0].avgPct.toFixed(1)}%`,
            height: 'h-40',
            ring: 'border-amber-300 bg-amber-50',
          });
          // Rank 3 (right) if exists
          if (sorted.length >= 3) {
            newPodium.push({
              rank: 3,
              name: sorted[2].name,
              avatar: AVATARS[2 % AVATARS.length],
              xp: sorted[2].xp,
              avg: `${sorted[2].avgPct.toFixed(1)}%`,
              height: 'h-28',
              ring: 'border-orange-300 bg-orange-50',
            });
          }
        }
        setPodium(newPodium);

        // Build Cohort Table (all students)
        const newRankings: RankedUser[] = sorted.map((s, idx) => ({
          rank: idx + 1,
          name: s.id === user?.id ? `${s.name} (You)` : s.name,
          roll: s.roll,
          tests: s.tests,
          avg: `${s.avgPct.toFixed(1)}%`,
          xp: s.xp,
          isMe: s.id === user?.id,
        }));
        setRankings(newRankings);

        // Build Subject Masters
        const computedMasters: SubjectMaster[] = Object.entries(subjectStats)
          .map(([subName, studentScores], idx) => {
            let topSid = '';
            let topAvg = -1;
            Object.entries(studentScores).forEach(([sid, scores]) => {
              const avg = scores.total > 0 ? (scores.earned / scores.total) * 100 : 0;
              if (avg > topAvg) {
                topAvg = avg;
                topSid = sid;
              }
            });

            const champ = studentMap[topSid]?.name || 'Scholar';
            const theme = SUBJECT_THEMES[idx % SUBJECT_THEMES.length];
            return {
              subject: subName,
              champion: champ,
              score: `${topAvg.toFixed(1)}%`,
              emoji: theme.emoji,
              color: theme.color,
            };
          })
          .slice(0, 4);

        setSubjectMasters(computedMasters);
      } catch (err) {
        console.warn('Error loading real student leaderboard:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void loadLeaderboard();
    return () => {
      isMounted = false;
    };
  }, [orgId, user?.id]);

  const orgName = activeOrg?.name || 'Campus';

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
                  Live Standings
                </span>
              </div>
              <p className="text-sm text-slate-600 mt-0.5">
                Real-time assessment rankings for {orgName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-teal-50 border-2 border-teal-200 shrink-0">
            <span className="text-2xl">🦊</span>
            <div>
              <p className="font-headline font-extrabold text-sm text-slate-900">
                {myRank !== null ? `Your Rank #${myRank}` : 'Unranked'}
              </p>
              <p className="text-xs text-primary font-semibold">
                {myRank !== null ? `${myTotalXp} Earned` : 'Complete tests to rank'}
              </p>
            </div>
          </div>
        </header>

        {loading ? (
          <div className="rounded-3xl bg-white border border-slate-200/90 p-12 text-center shadow-student-card text-sm text-slate-500">
            Loading live leaderboard standings...
          </div>
        ) : rankings.length === 0 ? (
          <div className="rounded-3xl bg-white border border-slate-200/90 p-12 text-center shadow-student-card space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto text-3xl">
              🏆
            </div>
            <div className="max-w-md mx-auto">
              <h2 className="font-headline font-extrabold text-xl text-slate-900">
                No Graded Assessments Yet
              </h2>
              <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
                The Class Hall of Fame and Campus Podium will populate automatically as soon as students complete assigned exams and scores are recorded.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* OVERALL PODIUM */}
            {podium.length > 0 && (
              <section className="rounded-3xl bg-white border border-slate-200/90 p-6 sm:p-8 shadow-student-card">
                <h2 className="font-headline font-extrabold text-lg text-slate-900 mb-8 flex items-center gap-2">
                  <Crown className="w-5 h-5 text-amber-500" />
                  <span>Overall Campus Podium</span>
                </h2>

                <div
                  className={`grid gap-3 sm:gap-6 items-end max-w-2xl mx-auto ${
                    podium.length === 1
                      ? 'grid-cols-1 max-w-xs'
                      : podium.length === 2
                      ? 'grid-cols-2 max-w-md'
                      : 'grid-cols-3'
                  }`}
                >
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
            )}

            {/* SUBJECT MASTERS GRID */}
            {subjectMasters.length > 0 && (
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
            )}

            {/* SCHOLAR RANKINGS TABLE */}
            <section className="rounded-3xl bg-white border border-slate-200/90 overflow-hidden shadow-student-card">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <h2 className="font-headline font-extrabold text-base text-slate-900 flex items-center gap-2">
                  <Flame className="w-4 h-4 text-orange-500" />
                  <span>Full Cohort Leaderboard</span>
                </h2>
                <span className="text-xs font-label font-semibold text-slate-500">
                  {rankings.length} {rankings.length === 1 ? 'Scholar Ranked' : 'Scholars Ranked'}
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
                        <td className="py-3.5 px-5 font-mono text-xs text-primary font-bold">
                          {r.avg}
                        </td>
                        <td className="py-3.5 px-5 text-right font-mono text-xs font-bold text-slate-900">
                          {r.xp}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </PortalShell>
  );
}
