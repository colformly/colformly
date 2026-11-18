import { motion } from 'framer-motion';
import { Award, Crown, Flame, Medal, Trophy } from 'lucide-react';
import { PortalShell } from '../../layouts/PortalShell';

const PODIUM = [
  { rank: 2, name: 'Priya Nair', avatar: '🦉', xp: '1,620 XP', avg: '94.2%', height: 'h-32', ring: 'border-slate-300 bg-slate-50' },
  { rank: 1, name: 'Aarav Patel', avatar: '🦁', xp: '1,785 XP', avg: '96.8%', height: 'h-40', ring: 'border-amber-300 bg-amber-50' },
  { rank: 3, name: 'Diya Kapoor', avatar: '🐼', xp: '1,495 XP', avg: '91.5%', height: 'h-28', ring: 'border-orange-300 bg-orange-50' },
];

const RANKINGS = [
  { rank: 4, name: 'Alex Verma (You)', roll: '24CSE041', tests: 12, avg: '89.4%', xp: '1,450 XP', isMe: true },
  { rank: 5, name: 'Kabir Mehta', roll: '24CSE089', tests: 12, avg: '87.9%', xp: '1,410 XP', isMe: false },
  { rank: 6, name: 'Ananya Sharma', roll: '24CSE088', tests: 11, avg: '86.2%', xp: '1,365 XP', isMe: false },
  { rank: 7, name: 'Rohan Kulkarni', roll: '24CSE108', tests: 11, avg: '82.0%', xp: '1,240 XP', isMe: false },
];

const SUBJECT_MASTERS = [
  { subject: 'Algorithms & DS', champion: 'Aarav Patel', score: '98.5%', emoji: '⚡', color: 'from-teal-50 to-emerald-50 border-teal-200' },
  { subject: 'Operating Systems', champion: 'Priya Nair', score: '96.0%', emoji: '🧠', color: 'from-purple-50 to-indigo-50 border-purple-200' },
  { subject: 'Database & SQL', champion: 'Alex Verma', score: '95.4%', emoji: '🗄️', color: 'from-amber-50 to-orange-50 border-amber-200' },
  { subject: 'Computer Networks', champion: 'Diya Kapoor', score: '94.8%', emoji: '🌐', color: 'from-sky-50 to-cyan-50 border-sky-200' },
];

export default function StudentLeaderboard() {
  return (
    <PortalShell persona="student">
      <div className="space-y-8">
        {/* Hall of Fame Header (all ui/leaderboard-stu.html) */}
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
                  Season 4
                </span>
              </div>
              <p className="text-sm text-slate-600 mt-0.5">
                Powered by privacy-preserving <code className="font-mono text-xs text-primary">get_org_leaderboard()</code> • 64 Scholars
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-teal-50 border-2 border-teal-200 shrink-0">
            <span className="text-2xl">🦊</span>
            <div>
              <p className="font-headline font-extrabold text-sm text-slate-900">Your Rank #4</p>
              <p className="text-xs text-primary font-semibold">45 XP to Podium!</p>
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
            {PODIUM.map((p) => (
              <motion.div
                key={p.rank}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center text-center"
              >
                <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-3xl border-2 flex items-center justify-center text-3xl sm:text-4xl shadow-md mb-3 ${p.ring}`}>
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
            {SUBJECT_MASTERS.map((m) => (
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

        {/* CLASS RANKINGS LIST */}
        <section className="rounded-3xl bg-white border border-slate-200/90 p-6 shadow-student-card space-y-3">
          <h2 className="font-headline font-extrabold text-lg text-slate-900 mb-3 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            <span>CSE Year 2 • Section A Standings</span>
          </h2>

          {RANKINGS.map((row) => (
            <div
              key={row.roll}
              className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${
                row.isMe
                  ? 'bg-teal-50/80 border-primary shadow-sm'
                  : 'bg-slate-50/70 border-slate-200/70'
              }`}
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <span className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center font-headline font-extrabold text-sm text-slate-900 shrink-0">
                  #{row.rank}
                </span>
                <div className="min-w-0">
                  <p className="font-headline font-bold text-sm text-slate-900 truncate">
                    {row.name}
                  </p>
                  <p className="text-xs text-slate-500 font-mono">
                    {row.roll} • {row.tests} exams graded
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className="font-mono text-sm font-bold text-primary">{row.avg}</span>
                <span className="hidden sm:inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white border border-slate-200 text-xs font-label font-bold text-slate-700">
                  {row.isMe ? <Flame className="w-3.5 h-3.5 text-orange-500" /> : <Medal className="w-3.5 h-3.5 text-primary" />}
                  {row.xp}
                </span>
              </div>
            </div>
          ))}
        </section>
      </div>
    </PortalShell>
  );
}
