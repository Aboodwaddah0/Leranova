import { useEffect, useRef, useState, useCallback } from 'react';
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
  LESSON_COMPLETE:   '📖',
  QUIZ_PASS:         '✅',
  QUIZ_PERFECT:      '🏆',
  DAILY_LOGIN:       '🌅',
  FLASHCARD_SESSION: '🃏',
  MINDMAP_SESSION:   '🗺️',
  CHATBOT_SESSION:   '🤖',
};

const MEDALS = ['🥇', '🥈', '🥉'];

function timeAgo(iso) {
  const d = Date.now() - new Date(iso).getTime();
  const m = Math.floor(d / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── countdown hook ────────────────────────────────────────────────────────────
function useCountdown(isoTarget) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!isoTarget) return;
    const tick = () => {
      const diff = Math.max(0, new Date(isoTarget).getTime() - Date.now());
      setRemaining(diff);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [isoTarget]);

  const s = Math.floor(remaining / 1000);
  const days    = Math.floor(s / 86400);
  const hours   = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  return { days, hours, minutes, seconds, done: remaining === 0 };
}

// ── sub-components ────────────────────────────────────────────────────────────

function CountdownUnit({ value, label }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-2xl font-black tabular-nums text-violet-700 leading-none">
        {String(value).padStart(2, '0')}
      </span>
      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mt-0.5">{label}</span>
    </div>
  );
}

function WeeklyChallengeCard({ challenge }) {
  const { days, hours, minutes, seconds, done } = useCountdown(challenge?.endsAt);

  if (!challenge) return null;
  const { title, description, myRank, myWeeklyXp, leader, leaderboard } = challenge;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-violet-200 bg-gradient-to-br from-violet-600 via-indigo-600 to-violet-800 p-6 shadow-xl text-white">
      {/* background decoration */}
      <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/5" />
      <div className="pointer-events-none absolute -bottom-8 -left-6 h-36 w-36 rounded-full bg-white/5" />

      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wider">
              ⚡ Weekly Challenge
            </span>
            <h2 className="mt-3 text-2xl font-black">{title}</h2>
            <p className="mt-1 text-sm text-white/70">{description}</p>
          </div>
          {myRank && (
            <div className="shrink-0 rounded-2xl bg-white/15 px-4 py-3 text-center backdrop-blur-sm">
              <p className="text-2xl font-black">{ordinal(myRank)}</p>
              <p className="text-xs text-white/70">my rank</p>
            </div>
          )}
        </div>

        {/* Countdown */}
        {!done && (
          <div className="mt-5 flex items-center gap-4">
            <span className="text-xs text-white/60 font-medium">Ends in</span>
            <div className="flex items-center gap-3">
              {days > 0 && <CountdownUnit value={days} label="days" />}
              <CountdownUnit value={hours} label="hrs" />
              <CountdownUnit value={minutes} label="min" />
              <CountdownUnit value={seconds} label="sec" />
            </div>
          </div>
        )}

        {/* My progress bar */}
        {leader && leader.weeklyXp > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-white/70 mb-1">
              <span>My XP: {fmt(myWeeklyXp)}</span>
              <span>Leader: {fmt(leader.weeklyXp)} ({leader.name})</span>
            </div>
            <div className="h-2 rounded-full bg-white/20 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-yellow-300 to-amber-400 transition-all duration-700"
                style={{ width: `${Math.min((myWeeklyXp / leader.weeklyXp) * 100, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Mini leaderboard */}
        {leaderboard.length > 0 && (
          <div className="mt-5 space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-white/60">Top this week</p>
            {leaderboard.slice(0, 5).map((s) => (
              <div key={s.studentId} className="flex items-center gap-3 rounded-xl bg-white/10 px-3 py-2 backdrop-blur-sm">
                <span className="text-base font-bold w-6 text-center">
                  {s.rank <= 3 ? MEDALS[s.rank - 1] : `#${s.rank}`}
                </span>
                <span className="flex-1 truncate text-sm font-medium">{s.name}</span>
                <span className="shrink-0 text-xs font-bold text-yellow-300">+{fmt(s.weeklyXp)} XP</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function XpRaceWidget({ xpRace }) {
  if (!xpRace?.me) return null;
  const { me, above, below, xpToOvertake } = xpRace;

  return (
    <div className="rounded-2xl border bg-white/70 p-5 backdrop-blur-sm shadow-sm h-full">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-700 uppercase tracking-wider">
        <span>🏁</span> XP Race
      </h3>

      <div className="space-y-3">
        {above && (
          <div className="flex items-center gap-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
            <span className="text-lg">⬆️</span>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-semibold text-slate-800">{above.name}</p>
              <p className="text-xs text-slate-500">Rank #{above.rank} · Lv {above.level}</p>
            </div>
            <span className="shrink-0 text-sm font-black text-amber-600">{fmt(above.totalXp)} XP</span>
          </div>
        )}

        <div className="flex items-center gap-3 rounded-xl bg-violet-100 border border-violet-300 px-4 py-3">
          <span className="text-lg">⚡</span>
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-black text-violet-900">{me.name} (You)</p>
            <p className="text-xs text-violet-700">Rank #{me.rank} · Lv {me.level}</p>
          </div>
          <span className="shrink-0 text-sm font-black text-violet-700">{fmt(me.totalXp)} XP</span>
        </div>

        {below && (
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
            <span className="text-lg">⬇️</span>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-semibold text-slate-600">{below.name}</p>
              <p className="text-xs text-slate-400">Rank #{below.rank} · Lv {below.level}</p>
            </div>
            <span className="shrink-0 text-sm font-bold text-slate-500">{fmt(below.totalXp)} XP</span>
          </div>
        )}
      </div>

      {xpToOvertake != null && above && (
        <div className="mt-4 rounded-xl bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-200 px-4 py-3 text-center">
          <p className="text-xs text-slate-500">Need to overtake <span className="font-semibold text-violet-700">{above.name}</span></p>
          <p className="mt-0.5 text-2xl font-black text-violet-700">+{fmt(xpToOvertake)} XP</p>
        </div>
      )}

      {!above && (
        <div className="mt-4 rounded-xl bg-gradient-to-r from-yellow-50 to-amber-50 border border-amber-200 px-4 py-3 text-center">
          <p className="text-xl">🥇</p>
          <p className="text-sm font-bold text-amber-700">You're #1! Keep the lead.</p>
        </div>
      )}
    </div>
  );
}

function TopPerformerCard({ performer }) {
  if (!performer) return null;
  return (
    <div className="rounded-2xl border border-yellow-200 bg-gradient-to-br from-yellow-50 to-amber-50 p-5 shadow-sm h-full">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-amber-700 uppercase tracking-wider">
        🌟 Top of the Week
      </h3>
      <div className="flex flex-col items-center text-center gap-2 py-3">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 text-3xl shadow-lg">
          🏆
        </div>
        <p className="text-lg font-black text-slate-900">{performer.name}</p>
        <p className="text-sm text-amber-700 font-semibold">+{fmt(performer.weeklyXp)} XP this week</p>
        <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
          <span>Lv {performer.level}</span>
          {performer.currentStreak > 0 && <span>🔥 {performer.currentStreak} day streak</span>}
        </div>
      </div>
    </div>
  );
}

function StreakCompetitionCard({ leaderboard, myStudentId }) {
  if (!leaderboard?.length) return (
    <div className="rounded-2xl border bg-white/70 p-5 text-sm text-slate-400">No streak data yet.</div>
  );

  return (
    <div className="rounded-2xl border bg-white/70 p-5 backdrop-blur-sm shadow-sm">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-700 uppercase tracking-wider">
        🔥 Streak Competition
      </h3>
      <div className="space-y-2">
        {leaderboard.map((s) => {
          const isMe = s.studentId === myStudentId;
          return (
            <div
              key={s.studentId}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${isMe ? 'bg-orange-100 border border-orange-300' : 'bg-slate-50 border border-slate-100'}`}
            >
              <span className="text-base font-bold w-6 text-center text-slate-600">
                {s.rank <= 3 ? MEDALS[s.rank - 1] : `#${s.rank}`}
              </span>
              <div className="flex-1 min-w-0">
                <p className={`truncate text-sm font-semibold ${isMe ? 'text-orange-800' : 'text-slate-700'}`}>
                  {s.name}{isMe ? ' (You)' : ''}
                </p>
                <p className="text-xs text-slate-400">Best: {s.longestStreak}d</p>
              </div>
              <div className="shrink-0 flex items-center gap-1">
                <span className="text-lg">🔥</span>
                <span className={`text-sm font-black ${isMe ? 'text-orange-700' : 'text-slate-600'}`}>{s.currentStreak}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AchievementShowcase({ showcase, myStudentId }) {
  if (!showcase) return null;
  const { myCount, topAchievers } = showcase;

  return (
    <div className="rounded-2xl border bg-white/70 p-5 backdrop-blur-sm shadow-sm">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-700 uppercase tracking-wider">
        🏅 Achievement Leaders
      </h3>
      <div className="mb-4 rounded-xl bg-violet-50 border border-violet-200 px-4 py-3 text-center">
        <p className="text-xs text-violet-600">Your achievements</p>
        <p className="text-3xl font-black text-violet-700">{myCount}</p>
      </div>
      {topAchievers.length === 0 ? (
        <p className="text-sm text-slate-400">No achievement data yet.</p>
      ) : (
        <div className="space-y-2">
          {topAchievers.map((a) => (
            <div
              key={a.studentId}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 ${a.isMe ? 'bg-violet-100 border border-violet-300' : 'bg-slate-50 border border-slate-100'}`}
            >
              <span className="text-base font-bold w-6 text-center">
                {a.rank <= 3 ? MEDALS[a.rank - 1] : `#${a.rank}`}
              </span>
              <p className={`flex-1 truncate text-sm font-semibold ${a.isMe ? 'text-violet-800' : 'text-slate-700'}`}>
                {a.name}{a.isMe ? ' (You)' : ''}
              </p>
              <span className={`shrink-0 text-xs font-bold rounded-full px-2 py-0.5 ${a.isMe ? 'bg-violet-200 text-violet-800' : 'bg-slate-200 text-slate-600'}`}>
                {a.count} 🏅
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SocialFeedCard({ feed }) {
  if (!feed?.length) return (
    <div className="rounded-2xl border bg-white/70 p-5 text-sm text-slate-400">
      No class activity in the last 3 days.
    </div>
  );

  return (
    <div className="rounded-2xl border bg-white/70 p-5 backdrop-blur-sm shadow-sm">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-700 uppercase tracking-wider">
        📡 Class Feed
      </h3>
      <div className="divide-y divide-slate-100">
        {feed.map((item, i) => (
          <div key={i} className="flex items-start gap-3 py-2.5">
            <span className="mt-0.5 text-base shrink-0">{EVENT_ICONS[item.eventType] ?? '⚡'}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-700">
                <span className="font-semibold">{item.studentName}</span>
                {' — '}{item.label}
              </p>
              <p className="text-xs text-slate-400">{timeAgo(item.occurredAt)}</p>
            </div>
            {item.xpAwarded > 0 && (
              <span className="shrink-0 text-xs font-bold text-violet-600 rounded-full bg-violet-50 px-2 py-0.5">
                +{item.xpAwarded} XP
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function MyRankBadge({ myRank }) {
  if (!myRank) return null;
  return (
    <div className="flex flex-wrap items-center gap-3">
      {myRank.rank && (
        <div className="flex items-center gap-2 rounded-2xl bg-violet-100 border border-violet-200 px-4 py-2">
          <span className="text-sm font-black text-violet-700">{ordinal(myRank.rank)}</span>
          <span className="text-xs text-violet-500">overall</span>
        </div>
      )}
      {myRank.weeklyRank && (
        <div className="flex items-center gap-2 rounded-2xl bg-amber-100 border border-amber-200 px-4 py-2">
          <span className="text-sm font-black text-amber-700">{ordinal(myRank.weeklyRank)}</span>
          <span className="text-xs text-amber-600">this week</span>
        </div>
      )}
      <div className="flex items-center gap-2 rounded-2xl bg-slate-100 border border-slate-200 px-4 py-2">
        <span className="text-sm font-black text-slate-700">{fmt(myRank.totalXp)}</span>
        <span className="text-xs text-slate-500">total XP</span>
      </div>
      <div className="flex items-center gap-2 rounded-2xl bg-slate-100 border border-slate-200 px-4 py-2">
        <span className="text-sm font-black text-slate-700">+{fmt(myRank.weeklyXp)}</span>
        <span className="text-xs text-slate-500">this week</span>
      </div>
    </div>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────
export default function StudentSocialPage() {
  const { isArabic } = useLanguage();
  const [social, setSocial]     = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const pollRef                 = useRef(null);
  const myStudentId             = social?.xpRace?.me?.studentId ?? null;

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
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-400 border-t-transparent" />
        </div>
      ) : error ? (
        <div className="flex h-48 flex-col items-center justify-center gap-3 text-center">
          <span className="text-3xl">⚠️</span>
          <p className="text-sm text-slate-600">{error}</p>
          <button
            type="button"
            onClick={() => { setLoading(true); load(); }}
            className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
          >
            Retry
          </button>
        </div>
      ) : !social ? (
        <p className="text-center text-sm text-slate-400 py-16">No competition data yet — start earning XP!</p>
      ) : (
        <div className="space-y-5">

          {/* My rank summary */}
          <MyRankBadge myRank={social.myRank} />

          {/* Weekly Challenge (hero) */}
          <WeeklyChallengeCard challenge={social.weeklyChallenge} />

          {/* XP Race + Top Performer */}
          <div className="grid gap-4 md:grid-cols-2">
            <XpRaceWidget xpRace={social.xpRace} />
            <TopPerformerCard performer={social.topPerformer} />
          </div>

          {/* Streak + Achievements */}
          <div className="grid gap-4 md:grid-cols-2">
            <StreakCompetitionCard leaderboard={social.streakCompetition} myStudentId={myStudentId} />
            <AchievementShowcase showcase={social.achievementShowcase} myStudentId={myStudentId} />
          </div>

          {/* Social feed */}
          <SocialFeedCard feed={social.socialFeed} />

          <p className="text-center text-xs text-slate-400">Refreshes every 30 seconds</p>
        </div>
      )}
    </StudentLayout>
  );
}
