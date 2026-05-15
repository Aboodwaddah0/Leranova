import { useEffect, useState, useCallback } from "react";
import InstructorLayout from "../../components/instructor/InstructorLayout";
import { fetchInstructorAnalytics } from "../../services/instructorService";
import { useLanguage } from "../../utils/i18n";

// ── helpers ──────────────────────────────────────────────────────────────────
const fmt = (n) => (n ?? 0).toLocaleString();
const pct = (n) => `${Math.round(n ?? 0)}%`;

const ICON = {
  INSIGHT:    "💡",
  WARNING:    "⚠️",
  ACTION:     "🎯",
  RISK:       "🚨",
  FLAME:      "🔥",
  TROPHY:     "🏆",
  TARGET:     "🎯",
  STAR:       "⭐",
  TREND_UP:   "📈",
  TREND_DOWN: "📉",
};

const EVENT_LABELS = {
  LESSON_COMPLETE:  "Completed a lesson",
  QUIZ_PASS:        "Passed a quiz",
  QUIZ_PERFECT:     "Perfect quiz score",
  DAILY_LOGIN:      "Logged in",
  FLASHCARD_SESSION:"Used flashcards",
  MINDMAP_SESSION:  "Opened mindmap",
  CHATBOT_SESSION:  "Used AI chat",
};

function timeAgo(isoString) {
  const diff = Date.now() - new Date(isoString).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, accent }) {
  return (
    <div className={`rounded-2xl border bg-white/60 p-5 backdrop-blur-sm ${accent || ""}`}>
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-black text-slate-900">{value}</p>
      {sub ? <p className="mt-1 text-xs text-slate-500">{sub}</p> : null}
    </div>
  );
}

function SubjectBar({ name, rate, rank }) {
  const color = rank === 0 ? "bg-violet-500" : rank === 1 ? "bg-indigo-400" : rank < 4 ? "bg-sky-400" : "bg-slate-300";
  return (
    <div className="flex items-center gap-3">
      <span className="w-36 truncate text-sm font-medium text-slate-700">{name}</span>
      <div className="relative flex-1 h-2.5 rounded-full bg-slate-100 overflow-hidden">
        <div
          className={`absolute inset-y-0 left-0 rounded-full ${color} transition-all duration-700`}
          style={{ width: `${Math.min(rate, 100)}%` }}
        />
      </div>
      <span className="w-10 text-right text-xs font-semibold text-slate-600">{pct(rate)}</span>
    </div>
  );
}

function TrendChart({ trend }) {
  if (!trend || trend.length === 0) return null;
  const maxCompletions = Math.max(...trend.map((d) => d.completions), 1);
  const maxPasses = Math.max(...trend.map((d) => d.quizPasses), 1);
  const overallMax = Math.max(maxCompletions, maxPasses, 1);
  const H = 80;

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-1 h-24">
        {trend.map((day, i) => {
          const cH = Math.round((day.completions / overallMax) * H);
          const qH = Math.round((day.quizPasses / overallMax) * H);
          const label = day.date?.slice(5); // MM-DD
          return (
            <div key={i} className="flex flex-1 flex-col items-center gap-0.5">
              <div className="flex items-end gap-0.5 w-full justify-center" style={{ height: H }}>
                <div
                  title={`Completions: ${day.completions}`}
                  className="w-3 rounded-t bg-violet-400 transition-all duration-700"
                  style={{ height: cH || 2 }}
                />
                <div
                  title={`Quiz passes: ${day.quizPasses}`}
                  className="w-3 rounded-t bg-sky-400 transition-all duration-700"
                  style={{ height: qH || 2 }}
                />
              </div>
              <span className="text-[10px] text-slate-400">{label}</span>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-3 rounded-sm bg-violet-400" />Lesson completions</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-3 rounded-sm bg-sky-400" />Quiz passes</span>
      </div>
    </div>
  );
}

function AICoachingCard({ coaching, isArabic }) {
  if (!coaching) return null;
  const { summary, keyInsights = [], actionItems = [], fallback } = coaching;
  return (
    <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-indigo-50 p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <span className="text-lg">🤖</span>
        <h3 className="text-base font-bold text-violet-900">
          {isArabic ? "نصائح الذكاء الاصطناعي للمعلم" : "AI Teaching Coach"}
        </h3>
        {fallback ? (
          <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">Algorithmic</span>
        ) : (
          <span className="ml-auto rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700">AI</span>
        )}
      </div>
      {summary ? <p className="mb-4 text-sm leading-relaxed text-slate-700">{summary}</p> : null}
      {keyInsights.length > 0 && (
        <div className="mb-3 space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Key Insights</p>
          {keyInsights.map((ins, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-slate-700">
              <span className="mt-0.5 shrink-0">{ICON[ins.icon] ?? "💡"}</span>
              <span>{ins.text}</span>
            </div>
          ))}
        </div>
      )}
      {actionItems.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Action Items</p>
          {actionItems.map((act, i) => (
            <div key={i} className="flex items-start gap-2 rounded-xl bg-white/70 px-3 py-2 text-sm text-slate-700">
              <span className="mt-0.5 shrink-0">{ICON[act.icon] ?? "🎯"}</span>
              <div>
                <p className="font-medium">{act.action}</p>
                {act.reason ? <p className="text-xs text-slate-500">{act.reason}</p> : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LeaderboardRow({ student, index }) {
  const medalColors = ["text-yellow-500", "text-slate-400", "text-amber-600"];
  const medals = ["🥇", "🥈", "🥉"];
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white/60 px-4 py-3">
      <span className={`text-lg font-black ${medalColors[index] ?? "text-slate-400"}`}>
        {index < 3 ? medals[index] : `#${student.rank}`}
      </span>
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-semibold text-slate-800">{student.name}</p>
        <p className="text-xs text-slate-500">Lv {student.level} · {fmt(student.xp)} XP · {student.streak}🔥</p>
      </div>
      <div className="text-right">
        <p className="text-xs text-slate-500">{student.completedLessons} lessons</p>
      </div>
    </div>
  );
}

function AtRiskRow({ student }) {
  const lastSeen = student.lastActivityAt ? timeAgo(student.lastActivityAt) : "Never";
  return (
    <div className="flex items-center gap-3 rounded-xl border border-rose-100 bg-rose-50/60 px-4 py-3">
      <span className="text-base">⚠️</span>
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-semibold text-slate-800">{student.name}</p>
        <p className="text-xs text-slate-500">Last seen: {lastSeen} · {pct(student.completionRate)} complete</p>
      </div>
      <span className="shrink-0 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
        {student.daysInactive}d inactive
      </span>
    </div>
  );
}

function FeedItem({ item }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <span className="mt-0.5 shrink-0 text-sm">
        {item.eventType === "LESSON_COMPLETE" ? "📖"
          : item.eventType === "QUIZ_PASS" ? "✅"
          : item.eventType === "QUIZ_PERFECT" ? "🏆"
          : "⚡"}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-700">
          <span className="font-semibold">{item.studentName}</span>
          {" — "}{EVENT_LABELS[item.eventType] ?? item.eventType}
        </p>
        <p className="text-xs text-slate-400">{timeAgo(item.occurredAt)}</p>
      </div>
    </div>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────
export default function InstructorAnalyticsPage() {
  const { isArabic } = useLanguage();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchInstructorAnalytics();
      setAnalytics(data);
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to load analytics.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const ov = analytics?.overview ?? {};
  const subjects = analytics?.subjectPerformance ?? [];
  const atRisk = analytics?.atRiskStudents ?? [];
  const top = analytics?.topStudents ?? [];
  const feed = analytics?.activityFeed ?? [];
  const trend = analytics?.performanceTrend ?? [];

  return (
    <InstructorLayout
      title={isArabic ? "التحليلات" : "Analytics"}
      subtitle={isArabic ? "أداء الفصل والطلاب" : "Class performance & student engagement"}
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
            onClick={load}
            className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="space-y-6">

          {/* ── overview stat row ── */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard label="Total Students" value={fmt(ov.totalStudents)} />
            <StatCard label="Active (7d)" value={fmt(ov.activeStudents)} sub={`of ${fmt(ov.totalStudents)}`} accent="border-emerald-200" />
            <StatCard label="Avg XP" value={fmt(ov.avgXp)} />
            <StatCard label="Avg Level" value={ov.avgLevel ?? "—"} />
            <StatCard label="Completion" value={pct(ov.avgCompletionRate)} />
            <StatCard label="Quiz Pass Rate" value={pct(ov.quizPassRate)} />
          </div>

          {/* ── AI coaching ── */}
          <AICoachingCard coaching={analytics?.aiCoaching} isArabic={isArabic} />

          {/* ── subject performance + trend ── */}
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border bg-white/60 p-5 backdrop-blur-sm">
              <h3 className="mb-4 text-sm font-bold text-slate-700 uppercase tracking-wider">Subject Performance</h3>
              {subjects.length === 0 ? (
                <p className="text-sm text-slate-400">No subject data yet.</p>
              ) : (
                <div className="space-y-3">
                  {subjects.map((s, i) => (
                    <SubjectBar key={s.subjectId} name={s.subjectName} rate={s.completionRate} rank={i} />
                  ))}
                </div>
              )}
            </div>
            <div className="rounded-2xl border bg-white/60 p-5 backdrop-blur-sm">
              <h3 className="mb-4 text-sm font-bold text-slate-700 uppercase tracking-wider">7-Day Trend</h3>
              <TrendChart trend={trend} />
            </div>
          </div>

          {/* ── active vs inactive visual ── */}
          <div className="rounded-2xl border bg-white/60 p-5 backdrop-blur-sm">
            <h3 className="mb-3 text-sm font-bold text-slate-700 uppercase tracking-wider">Engagement Snapshot</h3>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-5 rounded-full bg-slate-100 overflow-hidden flex">
                {ov.totalStudents > 0 && (
                  <>
                    <div
                      className="h-full bg-emerald-400 transition-all duration-700"
                      style={{ width: `${(ov.activeStudents / ov.totalStudents) * 100}%` }}
                      title={`Active: ${ov.activeStudents}`}
                    />
                    <div
                      className="h-full bg-rose-300"
                      style={{ width: `${((ov.totalStudents - ov.activeStudents) / ov.totalStudents) * 100}%` }}
                      title={`Inactive: ${ov.totalStudents - ov.activeStudents}`}
                    />
                  </>
                )}
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-500 shrink-0">
                <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-400" />Active ({fmt(ov.activeStudents)})</span>
                <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full bg-rose-300" />Inactive ({fmt((ov.totalStudents ?? 0) - (ov.activeStudents ?? 0))})</span>
              </div>
            </div>
          </div>

          {/* ── at-risk + leaderboard ── */}
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border bg-white/60 p-5 backdrop-blur-sm">
              <h3 className="mb-4 text-sm font-bold text-rose-600 uppercase tracking-wider">⚠️ At-Risk Students</h3>
              {atRisk.length === 0 ? (
                <p className="text-sm text-slate-400">No at-risk students. Great job! 🎉</p>
              ) : (
                <div className="space-y-2">
                  {atRisk.map((s) => <AtRiskRow key={s.studentId} student={s} />)}
                </div>
              )}
            </div>
            <div className="rounded-2xl border bg-white/60 p-5 backdrop-blur-sm">
              <h3 className="mb-4 text-sm font-bold text-slate-700 uppercase tracking-wider">🏆 Top Students</h3>
              {top.length === 0 ? (
                <p className="text-sm text-slate-400">No student data yet.</p>
              ) : (
                <div className="space-y-2">
                  {top.map((s, i) => <LeaderboardRow key={s.studentId} student={s} index={i} />)}
                </div>
              )}
            </div>
          </div>

          {/* ── activity feed ── */}
          <div className="rounded-2xl border bg-white/60 p-5 backdrop-blur-sm">
            <h3 className="mb-3 text-sm font-bold text-slate-700 uppercase tracking-wider">Recent Activity</h3>
            {feed.length === 0 ? (
              <p className="text-sm text-slate-400">No recent activity.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {feed.map((item, i) => <FeedItem key={i} item={item} />)}
              </div>
            )}
          </div>

          {analytics?.generatedAt && (
            <p className="text-center text-xs text-slate-400">
              Data as of {new Date(analytics.generatedAt).toLocaleTimeString()} · refreshes every 15 min
            </p>
          )}
        </div>
      )}
    </InstructorLayout>
  );
}
