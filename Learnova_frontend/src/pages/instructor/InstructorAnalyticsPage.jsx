import { useEffect, useState, useCallback } from "react";
import { useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import InstructorLayout from "../../components/instructor/InstructorLayout";
import { fetchInstructorAnalytics, fetchInstructorSubjects } from "../../services/instructorService";
import { useLanguage } from "../../utils/i18n";
import { getArabicOrdinal, getCourseLabel } from "../../utils/gradeHelpers";
import { ORG_TYPES } from "../../utils/constants";

// ── helpers ───────────────────────────────────────────────────────────────────
const fmt = (n) => (n ?? 0).toLocaleString();
const pct = (n) => `${Math.round(n ?? 0)}%`;

function timeAgo(isoString) {
  if (!isoString) return "—";
  const d = new Date(isoString).getTime();
  if (isNaN(d)) return "—";
  const diff = Date.now() - d;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const isLive = (iso) => iso && Date.now() - new Date(iso).getTime() < 300_000;

const ICON = {
  INSIGHT:    "💡", WARNING: "⚠️", ACTION: "🎯", RISK: "🚨",
  FLAME:      "🔥", TROPHY: "🏆", TARGET: "🎯", STAR: "⭐",
  TREND_UP:   "📈", TREND_DOWN: "📉",
  BRAIN:      "🧠", TREND: "📈", QUIZ: "✅", LESSON: "📖",
};
const EVENT_ICONS = {
  LESSON_COMPLETE: "📖", QUIZ_PASS: "✅", QUIZ_PERFECT: "🏆",
  DAILY_LOGIN: "🌅", FLASHCARD_SESSION: "🃏", MINDMAP_SESSION: "🗺️", CHATBOT_SESSION: "🤖",
};
const EVENT_LABELS = {
  LESSON_COMPLETE: "Completed a lesson", QUIZ_PASS: "Passed a quiz",
  QUIZ_PERFECT: "Perfect quiz score", DAILY_LOGIN: "Logged in",
  FLASHCARD_SESSION: "Used flashcards", MINDMAP_SESSION: "Opened mindmap", CHATBOT_SESSION: "Used AI chat",
};
const MEDALS = ["🥇", "🥈", "🥉"];

// ── animation presets ─────────────────────────────────────────────────────────
const fadeUp = {
  hidden:  { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0,  transition: { duration: 0.38, ease: [0.25, 0.46, 0.45, 0.94] } },
};
const staggerGrid = { visible: { transition: { staggerChildren: 0.06 } } };

// ── skeleton ──────────────────────────────────────────────────────────────────
function Skeleton({ className }) {
  return <div className={`ln-skeleton ${className ?? ""}`} />;
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-[90px] rounded-2xl" />)}
      </div>
      <Skeleton className="h-44 rounded-2xl" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-52 rounded-2xl" />
        <Skeleton className="h-52 rounded-2xl" />
      </div>
      <Skeleton className="h-12 rounded-2xl" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}

// ── stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, accent, delta }) {
  return (
    <motion.div
      variants={fadeUp}
      className={`group relative overflow-hidden rounded-2xl border bg-white p-4 shadow-sm transition-shadow hover:shadow-md ${accent || "border-slate-200"}`}
    >
      {/* accent left bar */}
      <div className={`absolute inset-y-0 left-0 w-0.5 rounded-r ${accent ? "bg-violet-500" : "bg-slate-200"} group-hover:bg-violet-500 transition-colors`} />
      <p className="pl-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="pl-2 mt-1.5 text-2xl font-black text-slate-900 tabular-nums">{value}</p>
      {sub && <p className="pl-2 mt-0.5 text-[10px] text-slate-400">{sub}</p>}
    </motion.div>
  );
}

// ── subject bar ───────────────────────────────────────────────────────────────
function SubjectBar({ name, rate, rank }) {
  const colors = ["bg-violet-500", "bg-indigo-400", "bg-sky-400", "bg-teal-400", "bg-slate-300"];
  const color = colors[Math.min(rank, colors.length - 1)];
  return (
    <div className="flex items-center gap-3 group">
      <span className="w-32 shrink-0 truncate text-xs font-medium text-slate-600 group-hover:text-slate-900 transition-colors">{name}</span>
      <div className="relative flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
        <motion.div
          className={`absolute inset-y-0 left-0 rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(rate, 100)}%` }}
          transition={{ duration: 0.7, ease: "easeOut", delay: rank * 0.05 }}
        />
      </div>
      <span className="w-9 shrink-0 text-right text-xs font-bold text-slate-600">{pct(rate)}</span>
    </div>
  );
}

// ── trend chart ───────────────────────────────────────────────────────────────
function TrendChart({ trend }) {
  if (!trend?.length) return (
    <div className="flex h-40 items-center justify-center text-sm text-slate-400">No trend data yet.</div>
  );

  const overallMax = Math.max(...trend.flatMap(d => [d.completions, d.quizPasses]), 1);
  const H = 110;

  return (
    <div className="space-y-4">
      {/* grid + bars */}
      <div className="relative">
        {/* grid lines */}
        <div className="absolute inset-x-0 top-0 flex flex-col justify-between pointer-events-none" style={{ height: H }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="w-full border-t border-slate-100" />
          ))}
        </div>
        <div className="relative flex items-end gap-1 pb-1" style={{ height: H + 20 }}>
          {trend.map((day, i) => {
            const cH = Math.max(Math.round((day.completions / overallMax) * H), 2);
            const qH = Math.max(Math.round((day.quizPasses  / overallMax) * H), 2);
            const label = day.date?.slice(5);
            return (
              <div key={i} className="flex flex-1 flex-col items-center gap-1 group">
                <div className="flex items-end gap-0.5 w-full justify-center" style={{ height: H }}>
                  <motion.div
                    title={`Completions: ${day.completions}`}
                    className="w-3 rounded-t-sm bg-violet-400 hover:bg-violet-500 cursor-pointer transition-colors"
                    initial={{ height: 2 }}
                    animate={{ height: cH }}
                    transition={{ duration: 0.5, delay: i * 0.04, ease: "easeOut" }}
                  />
                  <motion.div
                    title={`Quiz passes: ${day.quizPasses}`}
                    className="w-3 rounded-t-sm bg-sky-400 hover:bg-sky-500 cursor-pointer transition-colors"
                    initial={{ height: 2 }}
                    animate={{ height: qH }}
                    transition={{ duration: 0.5, delay: i * 0.04 + 0.05, ease: "easeOut" }}
                  />
                </div>
                <span className="text-[9px] text-slate-400 group-hover:text-slate-600 transition-colors">{label}</span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex items-center gap-5 text-xs text-slate-500">
        <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-3 rounded-sm bg-violet-400" />Lesson completions</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-3 rounded-sm bg-sky-400" />Quiz passes</span>
      </div>
    </div>
  );
}

// ── AI coaching card ──────────────────────────────────────────────────────────
function AICoachingCard({ coaching, isArabic }) {
  if (!coaching) return null;
  const { summary, insights = [], aiPowered } = coaching;

  return (
    <motion.div variants={fadeUp} className="relative overflow-hidden rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 via-indigo-50 to-white p-6 shadow-sm">
      {/* decorative blob */}
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-violet-200/30 blur-2xl" />

      <div className="relative">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-md shadow-violet-200 text-lg">🤖</div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-violet-400">AI Analysis</p>
              <h3 className="text-sm font-black text-slate-900">
                {isArabic ? "نصائح الذكاء الاصطناعي للمعلم" : "AI Teaching Coach"}
              </h3>
            </div>
          </div>
          <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${aiPowered ? "bg-violet-100 text-violet-700" : "bg-amber-100 text-amber-700"}`}>
            {aiPowered ? "✨ AI" : "Algorithmic"}
          </span>
        </div>

        {summary && (
          <p className="mb-5 text-sm leading-relaxed text-slate-600 border-l-2 border-violet-300 pl-3">{summary}</p>
        )}

        {insights.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Insights</p>
            {insights.map((ins, i) => (
              <div
                key={i}
                className={`flex items-start gap-2 rounded-xl bg-white/80 border px-3 py-2 text-sm text-slate-700 shadow-sm ${
                  ins.type === "warning" ? "border-rose-100" : ins.type === "success" ? "border-emerald-100" : "border-slate-100"
                }`}
              >
                <span className="mt-0.5 shrink-0 text-base">{ICON[ins.icon] ?? "💡"}</span>
                <span className="leading-snug">{ins.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── leaderboard row ───────────────────────────────────────────────────────────
function LeaderboardRow({ student, index }) {
  const gradients = [
    "from-amber-100 to-yellow-50 border-amber-200",
    "from-slate-100 to-slate-50 border-slate-200",
    "from-orange-100 to-amber-50 border-orange-200",
  ];
  const isTop = index < 3;

  return (
    <motion.div
      variants={fadeUp}
      className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-shadow hover:shadow-sm
        ${isTop ? gradients[index] : "bg-white border-slate-100 hover:border-slate-200"}`}
    >
      <span className="w-8 text-center text-base font-black">
        {index < 3 ? MEDALS[index] : <span className="text-sm text-slate-400">#{student.rank}</span>}
      </span>
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-semibold text-slate-800">{student.name}</p>
        <p className="text-xs text-slate-400">Lv {student.level} · {student.completedLessons} lessons · {student.streak}🔥</p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-black text-violet-700">{fmt(student.xp)}</p>
        <p className="text-[10px] text-slate-400">XP</p>
      </div>
    </motion.div>
  );
}

// ── at-risk row ───────────────────────────────────────────────────────────────
function AtRiskRow({ student }) {
  const lastSeen = student.lastActive ? timeAgo(student.lastActive) : "Never";
  return (
    <motion.div variants={fadeUp} className="flex items-center gap-3 rounded-xl border border-rose-100 bg-rose-50/60 px-4 py-3 hover:bg-rose-50 transition-colors">
      <span className="text-base shrink-0">⚠️</span>
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-semibold text-slate-800">{student.name}</p>
        <p className="text-xs text-slate-500">Last seen: {lastSeen} · {pct(student.completionRate)} complete</p>
      </div>
      <span className="shrink-0 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">
        {student.daysSince}d inactive
      </span>
    </motion.div>
  );
}

// ── feed item ─────────────────────────────────────────────────────────────────
function FeedItem({ item, index }) {
  return (
    <motion.div
      variants={fadeUp}
      className="flex items-start gap-3 py-2.5 hover:bg-slate-50/50 -mx-2 px-2 rounded-lg transition-colors"
    >
      <div className="relative mt-0.5 shrink-0">
        <span className="text-base">{EVENT_ICONS[item.eventType] ?? "⚡"}</span>
        {isLive(item.createdAt) && (
          <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-700 leading-snug">
          <span className="font-semibold text-slate-800">{item.studentName}</span>
          {" — "}{item.label ?? EVENT_LABELS[item.eventType] ?? item.eventType}
        </p>
        <p className="text-xs text-slate-400 mt-0.5">{timeAgo(item.createdAt)}</p>
      </div>
    </motion.div>
  );
}

// ── engagement bar ────────────────────────────────────────────────────────────
function EngagementBar({ active, total }) {
  const inactiveCount = (total ?? 0) - (active ?? 0);
  const activePct = total > 0 ? (active / total) * 100 : 0;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex-1 h-4 rounded-full bg-slate-100 overflow-hidden flex shadow-inner">
          {total > 0 && (
            <>
              <motion.div
                className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-l-full"
                initial={{ width: 0 }}
                animate={{ width: `${activePct}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                title={`Active: ${active}`}
              />
              <motion.div
                className="h-full bg-gradient-to-r from-slate-200 to-rose-200 rounded-r-full"
                initial={{ width: 0 }}
                animate={{ width: `${100 - activePct}%` }}
                transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
                title={`Inactive: ${inactiveCount}`}
              />
            </>
          )}
        </div>
        <span className="shrink-0 text-sm font-bold text-slate-700">{Math.round(activePct)}%</span>
      </div>
      <div className="flex items-center gap-5 text-xs text-slate-500">
        <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-400" />Active ({fmt(active)})</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full bg-rose-200" />Inactive ({fmt(inactiveCount)})</span>
      </div>
    </div>
  );
}

// ── empty state ───────────────────────────────────────────────────────────────
function EmptyPanel({ icon, message }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
      <span className="text-3xl">{icon}</span>
      <p className="text-sm text-slate-400">{message}</p>
    </div>
  );
}

// ── section card wrapper ──────────────────────────────────────────────────────
function Panel({ title, children, className }) {
  return (
    <motion.div variants={fadeUp} className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow ${className ?? ""}`}>
      {title && <h3 className="mb-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">{title}</h3>}
      {children}
    </motion.div>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────
export default function InstructorAnalyticsPage() {
  const { isArabic } = useLanguage();
  const authUser = useSelector((s) => s.auth.user);
  const orgType  = String(authUser?.organizationType || authUser?.organization?.Role || "").toUpperCase();
  const isSchool = orgType === ORG_TYPES.SCHOOL;
  const [analytics, setAnalytics] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async (subjectId) => {
    try {
      setError(null);
      const data = await fetchInstructorAnalytics(subjectId ?? undefined);
      setAnalytics(data);
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to load analytics.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchInstructorSubjects().then(setSubjects).catch(() => {}); }, []);
  useEffect(() => { load(selectedSubjectId); }, [load, selectedSubjectId]);

  const subjectChipLabel = (s) => {
    const grade = s.track?.GradeLevel;
    if (isSchool && grade != null) {
      return isArabic ? `${s.name} (الصف ${getArabicOrdinal(grade)})` : `${s.name} (Class ${grade})`;
    }
    return s.name;
  };

  const ov   = analytics?.overview ?? {};
  const subj = analytics?.subjectPerformance ?? [];
  const risk = analytics?.atRiskStudents ?? [];
  const top  = analytics?.topStudents ?? [];
  const feed = analytics?.activityFeed ?? [];
  const trend = analytics?.performanceTrend ?? [];

  return (
    <InstructorLayout
      title={isArabic ? "التحليلات" : "Analytics"}
      subtitle={isArabic ? "أداء الفصل والطلاب" : "Class performance & student engagement"}
    >
      {subjects.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSelectedSubjectId(null)}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition-colors ${
              selectedSubjectId === null ? "bg-violet-600 text-white" : "bg-white text-slate-600 border border-slate-200 hover:border-violet-300"
            }`}
          >
            {isArabic ? `كل ${getCourseLabel(isSchool, isArabic)}` : `All ${getCourseLabel(isSchool, isArabic)}`}
          </button>
          {subjects.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSelectedSubjectId(s.id)}
              className={`rounded-full px-4 py-1.5 text-xs font-bold transition-colors ${
                selectedSubjectId === s.id ? "bg-violet-600 text-white" : "bg-white text-slate-600 border border-slate-200 hover:border-violet-300"
              }`}
            >
              {subjectChipLabel(s)}
            </button>
          ))}
        </div>
      )}
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div key="skeleton" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <AnalyticsSkeleton />
          </motion.div>
        ) : error ? (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex h-52 flex-col items-center justify-center gap-3 rounded-2xl border border-rose-200 bg-rose-50"
          >
            <span className="text-3xl">⚠️</span>
            <p className="text-sm text-rose-700 font-medium">{error}</p>
            <button
              type="button"
              onClick={() => { setLoading(true); load(selectedSubjectId); }}
              className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 transition-colors"
            >
              Retry
            </button>
          </motion.div>
        ) : (
          <motion.div key="content" variants={staggerGrid} initial="hidden" animate="visible" className="space-y-5">

            {/* ── overview stats ── */}
            <motion.div variants={staggerGrid} className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <StatCard label="Total Students" value={fmt(ov.totalStudents)} />
              <StatCard label="Active (7d)" value={fmt(ov.activeStudents)} sub={`of ${fmt(ov.totalStudents)}`} accent="border-emerald-300" />
              <StatCard label="Avg XP" value={fmt(ov.avgXp)} />
              <StatCard label="Avg Level" value={ov.avgLevel ?? "—"} />
              <StatCard label="Completion" value={pct(ov.avgCompletionRate)} />
              <StatCard label="Quiz Pass Rate" value={pct(ov.quizPassRate)} />
            </motion.div>

            {/* ── AI coaching ── */}
            <AICoachingCard coaching={analytics?.aiCoaching} isArabic={isArabic} />

            {/* ── subject performance + trend ── */}
            <div className="grid gap-4 lg:grid-cols-2">
              <Panel title="Subject Performance">
                {subj.length === 0
                  ? <EmptyPanel icon="📚" message="No subject data yet." />
                  : <div className="space-y-3">{subj.map((s, i) => <SubjectBar key={s.id} name={s.name} rate={s.completionRate} rank={i} />)}</div>
                }
              </Panel>
              <Panel title="7-Day Activity Trend">
                <TrendChart trend={trend} />
              </Panel>
            </div>

            {/* ── engagement snapshot ── */}
            <Panel title="Engagement Snapshot">
              <EngagementBar active={ov.activeStudents} total={ov.totalStudents} />
            </Panel>

            {/* ── at-risk + leaderboard ── */}
            <div className="grid gap-4 lg:grid-cols-2">
              <Panel title="⚠️ At-Risk Students">
                {risk.length === 0
                  ? <EmptyPanel icon="🎉" message="No at-risk students — great work!" />
                  : <motion.div variants={staggerGrid} className="space-y-2">{risk.map(s => <AtRiskRow key={s.id} student={s} />)}</motion.div>
                }
              </Panel>
              <Panel title="🏆 Top Students">
                {top.length === 0
                  ? <EmptyPanel icon="📊" message="No student data yet." />
                  : <motion.div variants={staggerGrid} className="space-y-2">{top.map((s, i) => <LeaderboardRow key={s.id} student={s} index={i} />)}</motion.div>
                }
              </Panel>
            </div>

            {/* ── activity feed ── */}
            <Panel title="📡 Recent Activity">
              {feed.length === 0
                ? <EmptyPanel icon="📭" message="No recent activity from your class." />
                : (
                  <motion.div variants={staggerGrid} className="divide-y divide-slate-50">
                    {feed.map((item, i) => <FeedItem key={i} item={item} index={i} />)}
                  </motion.div>
                )
              }
            </Panel>

            {analytics?.generatedAt && (
              <p className="text-center text-[11px] text-slate-400">
                Data as of {new Date(analytics.generatedAt).toLocaleTimeString()} · refreshes every 15 min
              </p>
            )}

          </motion.div>
        )}
      </AnimatePresence>
    </InstructorLayout>
  );
}
