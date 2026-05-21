import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import StudentLayout from '../../components/student/StudentLayout';
import { fetchStudentSocial } from '../../services/studentService';
import { useLanguage } from '../../utils/i18n';

// ── helpers ───────────────────────────────────────────────────────────────────
const fmt = (n) => (n ?? 0).toLocaleString();
const ordinal = (n) => {
  if (!n) return '—';
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

const EVENT_ICONS = {
  LESSON_COMPLETE: '📖', QUIZ_PASS: '✅', QUIZ_PERFECT: '🏆',
  DAILY_LOGIN: '🌅', FLASHCARD_SESSION: '🃏', MINDMAP_SESSION: '🗺️', CHATBOT_SESSION: '🤖',
};
const MEDALS = ['🥇', '🥈', '🥉'];

function timeAgo(iso) {
  if (!iso) return '—';
  const d = new Date(iso).getTime();
  if (isNaN(d)) return '—';
  const m = Math.floor((Date.now() - d) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const isLive = (iso) => iso && Date.now() - new Date(iso).getTime() < 300_000;

// ── animation presets ─────────────────────────────────────────────────────────
const fadeUp = {
  hidden:  { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0,  transition: { duration: 0.38, ease: [0.25, 0.46, 0.45, 0.94] } },
};
const stagger = { visible: { transition: { staggerChildren: 0.07 } } };

// ── skeleton ──────────────────────────────────────────────────────────────────
function Skel({ className }) {
  return <div className={`ln-skeleton ${className ?? ''}`} />;
}

function SocialSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {[...Array(4)].map((_, i) => <Skel key={i} className="h-10 w-28 rounded-2xl" />)}
      </div>
      <Skel className="h-80 rounded-3xl" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skel className="h-56 rounded-2xl" />
        <Skel className="h-56 rounded-2xl" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Skel className="h-64 rounded-2xl" />
        <Skel className="h-64 rounded-2xl" />
      </div>
      <Skel className="h-72 rounded-2xl" />
    </div>
  );
}

// ── countdown ─────────────────────────────────────────────────────────────────
function useCountdown(iso) {
  const [rem, setRem] = useState(0);
  useEffect(() => {
    if (!iso) return;
    const tick = () => setRem(Math.max(0, new Date(iso).getTime() - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [iso]);
  const s = Math.floor(rem / 1000);
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
    done: rem === 0,
  };
}

function CountUnit({ value, label }) {
  return (
    <div className="flex flex-col items-center min-w-[40px]">
      <span className="text-2xl font-black tabular-nums leading-none text-white drop-shadow">
        {String(value).padStart(2, '0')}
      </span>
      <span className="mt-1 text-[10px] font-bold uppercase tracking-widest text-white/60">{label}</span>
    </div>
  );
}

function Divider() {
  return <span className="text-xl font-black text-white/40 self-start mt-0.5">:</span>;
}

// ── rank badges ───────────────────────────────────────────────────────────────
function MyRankBadge({ myRank }) {
  if (!myRank) return null;
  const chips = [
    myRank.rank      && { label: ordinal(myRank.rank),    sub: 'overall',    cls: 'bg-violet-100 border-violet-200 text-violet-800' },
    myRank.weeklyRank && { label: ordinal(myRank.weeklyRank), sub: 'this week', cls: 'bg-amber-100 border-amber-200 text-amber-800'   },
    { label: `${fmt(myRank.totalXp)} XP`, sub: 'total',    cls: 'bg-slate-100 border-slate-200 text-slate-700' },
    { label: `+${fmt(myRank.weeklyXp)} XP`, sub: 'this week', cls: 'bg-slate-100 border-slate-200 text-slate-700' },
  ].filter(Boolean);

  return (
    <motion.div variants={fadeUp} className="flex flex-wrap gap-2">
      {chips.map((chip, i) => (
        <div key={i} className={`flex items-baseline gap-1.5 rounded-2xl border px-4 py-2 ${chip.cls}`}>
          <span className="text-sm font-black">{chip.label}</span>
          <span className="text-[10px] opacity-60">{chip.sub}</span>
        </div>
      ))}
    </motion.div>
  );
}

// ── weekly challenge ──────────────────────────────────────────────────────────
function WeeklyChallengeCard({ challenge }) {
  const { days, hours, minutes, seconds, done } = useCountdown(challenge?.endsAt);
  if (!challenge) return null;
  const { title, description, myRank, myWeeklyXp, leader, leaderboard } = challenge;
  const progress = leader?.weeklyXp > 0 ? Math.min((myWeeklyXp / leader.weeklyXp) * 100, 100) : 0;

  return (
    <motion.div variants={fadeUp} className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-700 via-indigo-700 to-violet-900 p-6 shadow-2xl shadow-violet-900/30 text-white">
      {/* orbs */}
      <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/5 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/4 h-32 w-32 rounded-full bg-fuchsia-400/10 blur-2xl" />

      <div className="relative">
        {/* header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex-1">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[10px] font-bold uppercase tracking-wider backdrop-blur">
              ⚡ Weekly Challenge
            </span>
            <h2 className="mt-3 text-xl font-black leading-tight sm:text-2xl">{title}</h2>
            <p className="mt-1 text-sm text-white/60">{description}</p>
          </div>
          {myRank && (
            <div className="shrink-0 rounded-2xl bg-white/15 px-4 py-3 text-center backdrop-blur-sm border border-white/10">
              <p className="text-2xl font-black">{ordinal(myRank)}</p>
              <p className="text-[10px] text-white/60 mt-0.5">my rank</p>
            </div>
          )}
        </div>

        {/* countdown */}
        {!done && (
          <div className="mt-5 flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/50 mr-1">Ends in</span>
            {days > 0 && <><CountUnit value={days} label="days" /><Divider /></>}
            <CountUnit value={hours} label="hrs" />
            <Divider />
            <CountUnit value={minutes} label="min" />
            <Divider />
            <CountUnit value={seconds} label="sec" />
          </div>
        )}

        {/* progress bar */}
        {leader && leader.weeklyXp > 0 && (
          <div className="mt-5">
            <div className="flex items-center justify-between text-xs text-white/60 mb-1.5">
              <span>Me: <span className="font-bold text-white">{fmt(myWeeklyXp)} XP</span></span>
              <span>Leader: <span className="font-bold text-yellow-300">{fmt(leader.weeklyXp)} XP</span> ({leader.name})</span>
            </div>
            <div className="h-2.5 rounded-full bg-white/15 overflow-hidden shadow-inner">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-yellow-300 to-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
          </div>
        )}

        {/* mini leaderboard */}
        {leaderboard.length > 0 && (
          <div className="mt-5">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-white/50">Top this week</p>
            <div className="space-y-1.5">
              {leaderboard.slice(0, 5).map((s) => (
                <div key={s.studentId} className="flex items-center gap-2.5 rounded-xl bg-white/10 px-3 py-2 backdrop-blur-sm border border-white/5">
                  <span className="w-6 text-center text-base font-bold shrink-0">
                    {s.rank <= 3 ? MEDALS[s.rank - 1] : `#${s.rank}`}
                  </span>
                  <span className="flex-1 truncate text-sm font-medium">{s.name}</span>
                  <span className="shrink-0 text-xs font-black text-yellow-300">+{fmt(s.weeklyXp)} XP</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── xp race ───────────────────────────────────────────────────────────────────
function XpRaceWidget({ xpRace }) {
  if (!xpRace?.me) return null;
  const { me, above, below, xpToOvertake } = xpRace;

  return (
    <motion.div variants={fadeUp} className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow h-full">
      <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3.5">
        <span className="text-base">🏁</span>
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">XP Race</h3>
      </div>
      <div className="flex-1 p-4 space-y-2.5">
        {above && (
          <div className="flex items-center gap-3 rounded-xl bg-amber-50 border border-amber-100 px-4 py-3">
            <span className="text-lg shrink-0">⬆️</span>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-semibold text-slate-800">{above.name}</p>
              <p className="text-xs text-slate-400">Rank #{above.rank} · Lv {above.level}</p>
            </div>
            <span className="shrink-0 text-sm font-black text-amber-700">{fmt(above.totalXp)}</span>
          </div>
        )}
        <div className="flex items-center gap-3 rounded-xl bg-violet-100 border border-violet-200 px-4 py-3">
          <span className="text-lg shrink-0">⚡</span>
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-black text-violet-900">{me.name} (You)</p>
            <p className="text-xs text-violet-500">Rank #{me.rank} · Lv {me.level}</p>
          </div>
          <span className="shrink-0 text-sm font-black text-violet-700">{fmt(me.totalXp)}</span>
        </div>
        {below && (
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 border border-slate-100 px-4 py-3">
            <span className="text-lg shrink-0">⬇️</span>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium text-slate-500">{below.name}</p>
              <p className="text-xs text-slate-400">Rank #{below.rank} · Lv {below.level}</p>
            </div>
            <span className="shrink-0 text-sm font-semibold text-slate-400">{fmt(below.totalXp)}</span>
          </div>
        )}
        {xpToOvertake != null && above ? (
          <div className="mt-2 rounded-xl bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-200 px-4 py-3 text-center">
            <p className="text-[11px] text-slate-500">
              Need to overtake <span className="font-semibold text-violet-700">{above.name}</span>
            </p>
            <p className="mt-0.5 text-2xl font-black text-violet-700">+{fmt(xpToOvertake)} XP</p>
          </div>
        ) : !above ? (
          <div className="mt-2 rounded-xl bg-gradient-to-r from-yellow-50 to-amber-50 border border-amber-200 px-4 py-3 text-center">
            <p className="text-xl">🥇</p>
            <p className="text-sm font-bold text-amber-700">You're #1! Keep the lead.</p>
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}

// ── top performer ─────────────────────────────────────────────────────────────
function TopPerformerCard({ performer }) {
  if (!performer) return null;
  return (
    <motion.div variants={fadeUp} className="flex flex-col rounded-2xl border border-yellow-200 bg-gradient-to-br from-yellow-50 to-amber-50 shadow-sm hover:shadow-md transition-shadow h-full">
      <div className="flex items-center gap-2 border-b border-amber-100 px-5 py-3.5">
        <span className="text-base">🌟</span>
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-amber-500">Top of the Week</h3>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 text-3xl shadow-lg shadow-amber-200/50">
          🏆
        </div>
        <p className="text-lg font-black text-slate-900 text-center">{performer.name}</p>
        <p className="text-sm font-semibold text-amber-700">+{fmt(performer.weeklyXp)} XP this week</p>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="rounded-full bg-white border border-slate-200 px-2.5 py-1 font-semibold">Lv {performer.level}</span>
          {performer.currentStreak > 0 && (
            <span className="rounded-full bg-orange-50 border border-orange-200 px-2.5 py-1 font-semibold text-orange-700">
              🔥 {performer.currentStreak}d streak
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ── competition page header ───────────────────────────────────────────────────
function CompetitionPageHeader({ isArabic }) {
  return (
    <motion.div variants={fadeUp} className="flex items-start justify-between gap-3">
      <div>
        <h1 className="text-[22px] font-semibold text-slate-900">{isArabic ? 'المنافسة' : 'Competition'}</h1>
        <p className="mt-0.5 text-sm text-slate-500">{isArabic ? 'أفضل الطلاب هذا الأسبوع' : 'Top students this week'}</p>
      </div>
    </motion.div>
  );
}

// ── your ranking summary card ─────────────────────────────────────────────────
function YourRankingSummary({ myRank, xpRace, isArabic }) {
  if (!myRank && !xpRace?.me) return null;
  const rank   = myRank?.rank ?? xpRace?.me?.rank;
  const level  = xpRace?.me?.level;
  const totalXp = myRank?.totalXp ?? xpRace?.me?.totalXp;
  const weeklyXp = myRank?.weeklyXp;

  return (
    <motion.div
      variants={fadeUp}
      className="rounded-2xl border-2 border-indigo-500 p-4"
      style={{ background: 'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)' }}
    >
      <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-indigo-600">
        {isArabic ? 'ترتيبك' : 'Your ranking'}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        {rank && (
          <>
            <div className="flex items-center gap-2">
              <span className="text-xl">🏆</span>
              <span className="text-xl font-semibold text-slate-900">#{rank}</span>
            </div>
            <div className="h-6 w-px bg-indigo-200" />
          </>
        )}
        {level != null && (
          <>
            <span className="text-sm text-slate-500">
              {isArabic ? 'المستوى ' : 'Level '}<strong className="text-slate-900">{level}</strong>
            </span>
            <div className="h-6 w-px bg-indigo-200" />
          </>
        )}
        {totalXp != null && (
          <>
            <span className="text-sm text-slate-500">
              <strong className="text-slate-900">{fmt(totalXp)}</strong> XP
            </span>
          </>
        )}
        {weeklyXp > 0 && (
          <>
            <div className="h-6 w-px bg-indigo-200" />
            <span className="text-sm text-slate-500">
              <strong className="text-slate-900">+{fmt(weeklyXp)}</strong> {isArabic ? 'هذا الأسبوع' : 'this week'}
            </span>
          </>
        )}
      </div>
    </motion.div>
  );
}

// ── competition leaderboard (new design matching reference) ───────────────────
function CompetitionLeaderboard({ streakBoard, achieveShowcase, myStudentId, xpRace, isArabic }) {
  if (!streakBoard?.length) return null;

  const achieveMap = new Map();
  (achieveShowcase?.topAchievers || []).forEach(a => achieveMap.set(a.studentId, a.count));
  const meXp    = xpRace?.me?.totalXp ?? null;
  const meLevel = xpRace?.me?.level   ?? null;

  return (
    <motion.div variants={fadeUp} className="overflow-hidden rounded-2xl" style={{ border: '0.5px solid #E2E8F0' }}>
      {streakBoard.map((s) => {
        const isMe     = s.studentId === myStudentId;
        const rank     = s.rank;
        const initials = (s.name || '??').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
        const achCount = achieveMap.get(s.studentId) ?? 0;
        const streakBarFill = s.currentStreak > 0 ? Math.min(100, (s.currentStreak / 30) * 100) : 0;

        const rankIcon = rank === 1 ? '👑' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : isMe ? '⭐' : null;

        let rowStyle = { background: 'white' };
        let rankColor = '#6B7280';
        if (isMe) {
          rowStyle = { background: '#EEF2FF', border: '2px solid #6366F1', boxShadow: '0 2px 8px rgba(99,102,241,0.1)' };
          rankColor = '#6366F1';
        } else if (rank === 1) {
          rowStyle = { background: 'linear-gradient(90deg, #FEF3C7, transparent 70%)', borderLeft: '4px solid #F59E0B' };
          rankColor = '#D97706';
        } else if (rank === 2) {
          rowStyle = { background: 'linear-gradient(90deg, #F1F5F9, transparent 70%)', borderLeft: '4px solid #94A3B8' };
          rankColor = '#64748B';
        } else if (rank === 3) {
          rowStyle = { background: 'linear-gradient(90deg, #FED7AA, transparent 70%)', borderLeft: '4px solid #D97706' };
          rankColor = '#C2410C';
        }

        let avatarGradient = 'linear-gradient(135deg, #6366F1, #8B5CF6)';
        if (rank === 1) avatarGradient = 'linear-gradient(135deg, #F59E0B, #D97706)';
        else if (rank === 2) avatarGradient = 'linear-gradient(135deg, #94A3B8, #64748B)';
        else if (rank === 3) avatarGradient = 'linear-gradient(135deg, #F59E0B, #D97706)';

        const barBg    = rank === 1 ? '#FEF3C7' : rank === 2 ? '#F1F5F9' : rank === 3 ? '#FED7AA' : isMe ? '#DDD6FE' : '#F1F5F9';
        const barFill  = rank === 1 ? '#F59E0B' : rank === 2 ? '#94A3B8' : rank === 3 ? '#D97706' : isMe ? '#6366F1' : '#94A3B8';
        const lvBg     = rank === 1 ? '#FEF3C7' : rank === 2 ? '#F1F5F9' : rank === 3 ? '#FED7AA' : isMe ? '#DDD6FE' : '#F8FAFC';
        const lvColor  = rank === 1 ? '#92400E' : rank === 2 ? '#475569' : rank === 3 ? '#92400E' : isMe ? '#6366F1' : '#64748B';

        return (
          <div
            key={s.studentId}
            className="flex items-center gap-3 transition-all duration-150 hover:opacity-90"
            style={{ padding: rank <= 3 ? '18px 20px' : '14px 20px', borderBottom: '0.5px solid #E5E7EB', cursor: 'pointer', ...rowStyle }}
          >
            {/* Rank */}
            <div className="flex min-w-[52px] items-center gap-1.5">
              {rankIcon && <span className="text-[17px]">{rankIcon}</span>}
              <span className="text-[15px] font-semibold" style={{ color: rankColor }}>#{rank}</span>
            </div>

            {/* Avatar */}
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-medium text-white"
              style={{ background: avatarGradient, ...(isMe ? { boxShadow: '0 0 0 2px white, 0 0 0 4px #6366F1' } : {}) }}
            >
              {initials}
            </div>

            {/* Name + sub */}
            <div className="flex-1 min-w-0">
              <p className="truncate text-[15px]" style={{ color: isMe ? '#6366F1' : '#1E293B', fontWeight: isMe ? 600 : 500 }}>
                {isMe ? `${isArabic ? 'أنت' : 'You'} (${s.name.split(' ')[0]})` : s.name}
              </p>
              <p className="mt-0.5 text-xs text-slate-400">
                {s.longestStreak > 0 ? `${isArabic ? 'أفضل سلسلة' : 'Best'}: ${s.longestStreak}d` : (isArabic ? 'لا توجد سلسلة' : 'No streak yet')}
              </p>
            </div>

            {/* Level badge */}
            <div className="hidden sm:block rounded-md px-2.5 py-[3px] text-[12px] font-semibold whitespace-nowrap" style={{ background: lvBg, color: lvColor }}>
              {isMe && meLevel ? `Lv. ${meLevel}` : `—`}
            </div>

            {/* Streak bar */}
            <div className="hidden md:block w-[110px]">
              <div className="h-2 overflow-hidden rounded-full" style={{ background: barBg }}>
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${streakBarFill}%`, background: barFill }} />
              </div>
            </div>

            {/* XP or achievements */}
            <span className="hidden lg:block min-w-[80px] text-right text-sm font-medium text-slate-700">
              {isMe && meXp != null ? `${fmt(meXp)} XP` : achCount > 0 ? `${achCount} 🏅` : '—'}
            </span>

            {/* Streak count */}
            <span className="min-w-[48px] text-right text-sm font-medium" style={{ color: '#F59E0B' }}>
              🔥 {s.currentStreak}
            </span>
          </div>
        );
      })}
    </motion.div>
  );
}

// ── recent activity card ──────────────────────────────────────────────────────
function RecentActivityCard({ feed, isArabic }) {
  const AVATAR_COLORS = [
    'linear-gradient(135deg, #F59E0B, #D97706)',
    'linear-gradient(135deg, #6366F1, #8B5CF6)',
    'linear-gradient(135deg, #14B8A6, #0D9488)',
    'linear-gradient(135deg, #EC4899, #DB2777)',
  ];
  const items = (feed || []).slice(0, 10);

  return (
    <motion.div variants={fadeUp} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
        <span className="text-base">🎯</span>
        <h2 className="text-[15px] font-medium text-slate-900">{isArabic ? 'الإنجازات الأخيرة' : 'Recent achievements'}</h2>
        {items.length > 0 && (
          <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">{items.length}</span>
        )}
      </div>

      <div className="p-4">
        {items.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">{isArabic ? 'لا يوجد نشاط حديث' : 'No recent activity'}</p>
        ) : (
          <div className="space-y-2.5">
            {items.map((item, i) => {
              const initials = (item.studentName || '?').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
              return (
                <div key={i} className="flex items-center gap-3 rounded-xl p-3" style={{ background: '#F8FAFC' }}>
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-medium text-white" style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}>
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700">
                      <strong className="text-slate-900">{item.studentName}</strong>{' '}{item.label}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-400">{timeAgo(item.occurredAt)}</p>
                  </div>
                  {item.xpAwarded > 0 && (
                    <span className="shrink-0 text-xs font-semibold text-violet-600">+{item.xpAwarded} XP</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <button type="button" className="mt-4 w-full rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-700">
          {isArabic ? 'عرض كل النشاطات' : 'View all activity'}
        </button>
      </div>
    </motion.div>
  );
}

// ── streak competition ────────────────────────────────────────────────────────
function StreakCompetitionCard({ leaderboard, myStudentId }) {
  return (
    <motion.div variants={fadeUp} className="rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3.5">
        <span className="text-base">🔥</span>
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Streak Competition</h3>
      </div>
      <div className="p-4">
        {!leaderboard?.length ? (
          <p className="py-4 text-center text-sm text-slate-400">No streak data yet.</p>
        ) : (
          <motion.div variants={stagger} className="space-y-2">
            {leaderboard.map((s) => {
              const isMe = s.studentId === myStudentId;
              return (
                <motion.div
                  key={s.studentId}
                  variants={fadeUp}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors
                    ${isMe ? 'bg-orange-100 border border-orange-200' : 'bg-slate-50 border border-slate-100 hover:bg-slate-100'}`}
                >
                  <span className="w-7 text-center text-base font-bold shrink-0">
                    {s.rank <= 3 ? MEDALS[s.rank - 1] : <span className="text-xs text-slate-400">#{s.rank}</span>}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`truncate text-sm font-semibold ${isMe ? 'text-orange-800' : 'text-slate-700'}`}>
                      {s.name}{isMe ? ' (You)' : ''}
                    </p>
                    <p className="text-[10px] text-slate-400">Best: {s.longestStreak}d</p>
                  </div>
                  <div className="shrink-0 flex items-center gap-1">
                    <span className="text-base">🔥</span>
                    <span className={`text-sm font-black ${isMe ? 'text-orange-700' : 'text-slate-600'}`}>{s.currentStreak}</span>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

// ── achievement showcase ──────────────────────────────────────────────────────
function AchievementShowcase({ showcase, myStudentId }) {
  if (!showcase) return null;
  const { myCount, topAchievers } = showcase;

  return (
    <motion.div variants={fadeUp} className="rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3.5">
        <span className="text-base">🏅</span>
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Achievement Leaders</h3>
      </div>
      <div className="p-4 space-y-3">
        <div className="rounded-xl bg-violet-50 border border-violet-100 px-4 py-3 text-center">
          <p className="text-[10px] text-violet-500 font-semibold uppercase tracking-wider">Your badges</p>
          <p className="text-3xl font-black text-violet-700 mt-0.5">{myCount}</p>
        </div>
        {topAchievers.length === 0 ? (
          <p className="text-center text-sm text-slate-400">No achievement data yet.</p>
        ) : (
          <motion.div variants={stagger} className="space-y-2">
            {topAchievers.map((a) => (
              <motion.div
                key={a.studentId}
                variants={fadeUp}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 transition-colors
                  ${a.isMe ? 'bg-violet-100 border border-violet-200' : 'bg-slate-50 border border-slate-100 hover:bg-slate-100'}`}
              >
                <span className="w-7 text-center text-base shrink-0">
                  {a.rank <= 3 ? MEDALS[a.rank - 1] : <span className="text-xs text-slate-400">#{a.rank}</span>}
                </span>
                <p className={`flex-1 truncate text-sm font-semibold ${a.isMe ? 'text-violet-800' : 'text-slate-700'}`}>
                  {a.name}{a.isMe ? ' (You)' : ''}
                </p>
                <span className={`shrink-0 text-xs font-bold rounded-full px-2 py-0.5 border
                  ${a.isMe ? 'bg-violet-200 text-violet-800 border-violet-300' : 'bg-slate-200 text-slate-600 border-slate-300'}`}>
                  {a.count} 🏅
                </span>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

// ── social feed ───────────────────────────────────────────────────────────────
function SocialFeedCard({ feed }) {
  return (
    <motion.div variants={fadeUp} className="rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3.5">
        <span className="text-base">📡</span>
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Class Feed</h3>
        {feed.length > 0 && (
          <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
            {feed.length} events
          </span>
        )}
      </div>
      <div className="p-4">
        {!feed?.length ? (
          <p className="py-6 text-center text-sm text-slate-400">No class activity in the last 3 days.</p>
        ) : (
          <motion.div variants={stagger} className="divide-y divide-slate-50">
            {feed.map((item, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                className="flex items-start gap-3 py-2.5 -mx-2 px-2 rounded-lg hover:bg-slate-50/60 transition-colors"
              >
                <div className="relative mt-0.5 shrink-0">
                  <span className="text-base">{EVENT_ICONS[item.eventType] ?? '⚡'}</span>
                  {isLive(item.occurredAt) && (
                    <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700 leading-snug">
                    <span className="font-semibold text-slate-800">{item.studentName}</span>
                    {' — '}{item.label}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{timeAgo(item.occurredAt)}</p>
                </div>
                {item.xpAwarded > 0 && (
                  <span className="shrink-0 rounded-full bg-violet-50 border border-violet-200 px-2 py-0.5 text-[10px] font-bold text-violet-600">
                    +{item.xpAwarded} XP
                  </span>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────
export default function StudentSocialPage() {
  const { isArabic } = useLanguage();
  const [social, setSocial]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const pollRef               = useRef(null);
  const myStudentId           = social?.xpRace?.me?.studentId ?? null;

  const load = useCallback(async (silent = false) => {
    if (!silent) setError(null);
    try {
      const data = await fetchStudentSocial();
      if (data) setSocial(data);
    } catch {
      if (!silent) setError('Failed to load social data.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    pollRef.current = setInterval(() => load(true), 30_000);
    return () => clearInterval(pollRef.current);
  }, [load]);

  return (
    <StudentLayout
      title={isArabic ? 'المنافسة والتحديات' : 'Competition & Challenges'}
      subtitle={isArabic ? 'تحدَّ زملاءك واكسب المزيد من XP' : 'Compete with classmates and earn more XP'}
    >
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div key="skel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <SocialSkeleton />
          </motion.div>
        ) : error ? (
          <motion.div
            key="err"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex h-52 flex-col items-center justify-center gap-3 rounded-2xl border border-rose-200 bg-rose-50"
          >
            <span className="text-3xl">⚠️</span>
            <p className="text-sm text-rose-700 font-medium">{error}</p>
            <button
              type="button"
              onClick={() => { setLoading(true); load(); }}
              className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 transition-colors"
            >
              Retry
            </button>
          </motion.div>
        ) : !social ? (
          <motion.p
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-16 text-center text-sm text-slate-400"
          >
            No competition data yet — start earning XP!
          </motion.p>
        ) : (
          <motion.div key="content" variants={stagger} initial="hidden" animate="visible" className="space-y-5">

            {/* Competition page header */}
            <CompetitionPageHeader isArabic={isArabic} />

            {/* Your ranking summary */}
            <YourRankingSummary myRank={social.myRank} xpRace={social.xpRace} isArabic={isArabic} />

            {/* Vertical leaderboard */}
            <CompetitionLeaderboard
              streakBoard={social.streakCompetition}
              achieveShowcase={social.achievementShowcase}
              myStudentId={myStudentId}
              xpRace={social.xpRace}
              isArabic={isArabic}
            />

            {/* XP Race + Recent Activity */}
            <div className="grid gap-4 md:grid-cols-2">
              <XpRaceWidget xpRace={social.xpRace} />
              <RecentActivityCard feed={social.socialFeed} isArabic={isArabic} />
            </div>

            {/* Weekly challenge (secondary) */}
            {social.weeklyChallenge && (
              <WeeklyChallengeCard challenge={social.weeklyChallenge} />
            )}

            <p className="text-center text-[11px] text-slate-400">Refreshes every 30 seconds</p>

          </motion.div>
        )}
      </AnimatePresence>
    </StudentLayout>
  );
}
