import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  ArrowRight, ChevronRight, BookOpen, Flame, TrendingUp, Trophy, Medal, Target,
  Zap, Star, Play, CheckCircle2, Lock, GraduationCap,
  CalendarDays, Sun, Brain, Sparkles, BarChart3, MessageSquare,
  Layers, AlertCircle, MapPin, Lightbulb, ChevronUp, ChevronDown, Minus,
} from 'lucide-react';
import StudentLayout from '../../components/student/StudentLayout';
import {
  fetchMyStudentMarks,
  fetchMyStudentPurchases,
  fetchCourseSubjects,
  fetchSubjectLessons,
  fetchStudentCourseCatalog,
  fetchStudentProfile,
  fetchGamificationStats,
  fetchGamificationLeaderboard,
  fetchAchievements,
  fetchMissions,
  fetchLearningProfile,
  fetchAdaptiveMissions,
  fetchAIMentor,
  fetchActivityFeed,
  fetchAdaptiveInsights,
} from '../../services/studentService';
import { useLanguage } from '../../utils/i18n';
import { calculateProgressForLessons, subscribeToProgress } from '../../utils/studentProgress';
import { sound } from '../../utils/soundHelper';
import { notifyXpGained, notifyAchievement, notifyLevelUp, notifyStreakMilestone } from '../../lib/notify';

const getCourseId = (course) => Number(course?.id || course?.courseId || course?.Course_id || 0);
const getCourseName = (course, isArabic) => course?.name || course?.Name || (isArabic ? 'كورس بدون عنوان' : 'Untitled course');

const COVER_GRADIENTS = [
  'from-indigo-500 via-violet-500 to-purple-600',
  'from-violet-500 via-fuchsia-500 to-pink-600',
  'from-blue-500 via-indigo-500 to-violet-600',
  'from-cyan-500 via-blue-500 to-indigo-600',
  'from-fuchsia-500 via-purple-500 to-indigo-600',
  'from-emerald-500 via-teal-500 to-cyan-600',
];

const normalizeCourses = (courses = [], isArabic = false) => {
  const unique = new Map();
  courses.forEach((course) => {
    const id = getCourseId(course);
    if (!Number.isFinite(id) || id <= 0) return;
    if (!unique.has(id)) {
      unique.set(id, {
        id,
        name: getCourseName(course, isArabic),
        description: course?.description || course?.Description || '',
        category: course?.category || (isArabic ? 'أكاديمية' : 'Academy'),
        progress: Number(course?.progress || 0),
        cover: course?.cover || course?.thumbnail || '',
        priceStatus: String(course?.priceStatus || '').toUpperCase() || null,
      });
      return;
    }
    const current = unique.get(id);
    unique.set(id, {
      ...current,
      name: current.name || getCourseName(course, isArabic),
      description: current.description || course?.description || course?.Description || '',
      category: current.category || course?.category || (isArabic ? 'أكاديمية' : 'Academy'),
      progress: Math.max(current.progress || 0, Number(course?.progress || 0)),
      cover: current.cover || course?.cover || course?.thumbnail || '',
      priceStatus: current.priceStatus || String(course?.priceStatus || '').toUpperCase() || null,
    });
  });
  return Array.from(unique.values());
};

const summarizeAverageMark = (marks = []) => {
  if (!marks.length) return 0;
  const total = marks.reduce((sum, mark) => {
    const numbers = Number(mark?.Numbers || 0);
    const outOf = Math.max(1, Number(mark?.OutOf || 0));
    return sum + (numbers / outOf) * 100;
  }, 0);
  return total / marks.length;
};

export default function StudentDashboardPage() {
  const { t, isArabic } = useLanguage();
  const authUser = useSelector((state) => state.auth.user);
  const _orgType = String(authUser?.organizationType || authUser?.organization?.Role || '').toUpperCase();
  const isSchoolStudent = _orgType === 'SCHOOL' || (_orgType !== 'ACADEMY' && !authUser?.academyUser);
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [marks, setMarks] = useState([]);
  const [profile, setProfile] = useState(null);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [progressTick, setProgressTick] = useState(0);
  const [gamification, setGamification] = useState({ totalXp: 0, level: 1, currentStreak: 0, longestStreak: 0 });
  const [leaderboard, setLeaderboard] = useState([]);
  const [currentStudentId, setCurrentStudentId] = useState(null);
  const [currentRank, setCurrentRank] = useState(null);
  const [achievements, setAchievements] = useState({ unlocked: [], locked: [], latestUnlocked: null });
  const [missions, setMissions] = useState({ daily: [], weekly: [] });
  const [learningProfile, setLearningProfile] = useState(null);
  const [adaptiveMissions, setAdaptiveMissions] = useState(null);
  const [adaptiveInsights, setAdaptiveInsights] = useState(null);
  const [aiMentor, setAiMentor] = useState(null);
  const [activityFeed, setActivityFeed] = useState([]);
  const [engagedToday, setEngagedToday] = useState(false);
  const [floatingXps, setFloatingXps] = useState([]);
  const [achievementModal, setAchievementModal] = useState(null);
  const [levelUpModal, setLevelUpModal] = useState(null);
  const [showStreakBanner, setShowStreakBanner] = useState(false);

  const prevRef = useRef({ level: 0, totalXp: 0, streak: 0, lastAchKey: null, pollCount: 0 });
  const streakDismissedRef = useRef(sessionStorage.getItem('lnv_streak_dismissed') === '1');
  const shownAchievementsRef = useRef(new Set(JSON.parse(sessionStorage.getItem('lnv_shown_ach') || '[]')));

  const dismissStreakBanner = () => {
    setShowStreakBanner(false);
    if (!streakDismissedRef.current) {
      streakDismissedRef.current = true;
      sessionStorage.setItem('lnv_streak_dismissed', '1');
      sound.dismiss();
    }
  };

  useEffect(() => subscribeToProgress(() => setProgressTick((v) => v + 1)), []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const [courseData, marksData, purchaseData, profileData, gamData, lbData, achData, missData, lpData, adaptMissData, mentorData, feedData, insightsData] = await Promise.all([
          fetchStudentCourseCatalog(), fetchMyStudentMarks(), fetchMyStudentPurchases(),
          fetchStudentProfile(), fetchGamificationStats(), fetchGamificationLeaderboard(),
          fetchAchievements(), fetchMissions(), fetchLearningProfile(), fetchAdaptiveMissions(), fetchAIMentor(), fetchActivityFeed(), fetchAdaptiveInsights(),
        ]);
        if (cancelled) return;

        const safeCourses = normalizeCourses(Array.isArray(courseData) ? courseData : [], isArabic);
        const safeMarks = Array.isArray(marksData) ? marksData : [];
        const coursesWithProgress = await Promise.all(
          safeCourses.map(async (course) => {
            try {
              const subjects = await fetchCourseSubjects(course.id);
              const lessonsBySubject = await Promise.all((subjects || []).map((s) => fetchSubjectLessons(s.id)));
              const lessonIds = lessonsBySubject.flatMap((items) => (Array.isArray(items) ? items : []))
                .map((l) => Number(l?.id)).filter((id) => Number.isInteger(id) && id > 0);
              const allLessons = lessonsBySubject.flatMap((items) => (Array.isArray(items) ? items : []));
              const hasBackend = allLessons.some((l) => Object.prototype.hasOwnProperty.call(l || {}, 'isCompleted'));
              const backendDone = allLessons.filter((l) => Boolean(l?.isCompleted)).length;
              const lp = hasBackend
                ? { total: lessonIds.length, completed: backendDone, percent: lessonIds.length ? Math.round((backendDone / lessonIds.length) * 100) : 0 }
                : calculateProgressForLessons(lessonIds);
              return { ...course, progress: lp.percent, completedLessons: lp.completed, totalLessons: lp.total, firstSubjectId: subjects?.[0]?.id ?? null };
            } catch { return course; }
          }),
        );

        setEnrolledCourses(coursesWithProgress);
        setMarks(safeMarks);
        setPurchases(Array.isArray(purchaseData) ? purchaseData : []);
        setProfile(profileData || null);
        setGamification(gamData || { totalXp: 0, level: 1, currentStreak: 0, longestStreak: 0 });
        setLeaderboard(lbData?.leaderboard || []);
        setCurrentStudentId(lbData?.currentStudentId || null);
        setCurrentRank(lbData?.currentRank || null);
        setAchievements(achData || { unlocked: [], locked: [], latestUnlocked: null });
        setMissions(missData || { daily: [], weekly: [] });
        setLearningProfile(lpData || null);
        setAdaptiveMissions(adaptMissData || null);
        setAdaptiveInsights(insightsData || null);
        setAiMentor(mentorData || null);
        if (feedData) {
          setActivityFeed(feedData.feed || []);
          setEngagedToday(Boolean(feedData.engagedToday));
        }

        // ── Calibrate prevRef + detect cross-page XP gains ──────────────────
        // prevRef starts at 0, which causes `prev.totalXp > 0` to fail on the
        // first poll.  Seed it with real values so any XP gained while the
        // dashboard was unmounted (the student was on the lesson page) is
        // detected the moment they navigate back here.
        const currentXp    = gamData?.totalXp    || 0;
        const currentLevel = gamData?.level       || 1;
        const currentStrk  = gamData?.currentStreak || 0;

        const storedXp    = Number(sessionStorage.getItem('lnv_last_xp')    || '0');
        const storedLevel = Number(sessionStorage.getItem('lnv_last_level') || '0');

        if (storedXp > 0 && currentXp > storedXp) {
          const gained = currentXp - storedXp;
          const id = Date.now();
          setFloatingXps(p => [...p.slice(-4), { id, amount: gained }]);
          setTimeout(() => setFloatingXps(p => p.filter(x => x.id !== id)), 2800);
          sound.xp();
          notifyXpGained(gained);
        }
        if (storedLevel > 0 && currentLevel > storedLevel) {
          setLevelUpModal(currentLevel);
          sound.levelUp();
          notifyLevelUp(currentLevel);
        }

        sessionStorage.setItem('lnv_last_xp',    String(currentXp));
        sessionStorage.setItem('lnv_last_level',  String(currentLevel));

        prevRef.current = {
          ...prevRef.current,
          totalXp: currentXp,
          level:   currentLevel,
          streak:  currentStrk,
        };
      } catch (err) {
        if (!cancelled) setError(err?.message || (isArabic ? 'فشل تحميل لوحة الطالب.' : 'Failed to load dashboard.'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [isArabic, progressTick]);

  // ── 30-second engagement polling ───────────────────────────────────────────
  useEffect(() => {
    let active = true;

    const poll = async () => {
      const feed = await fetchActivityFeed();
      if (!active || !feed) return;

      const prev = prevRef.current;
      prev.pollCount += 1;

      // Level-up detection
      if (feed.level > prev.level && prev.level > 0) {
        setLevelUpModal(feed.level);
        sound.levelUp();
        notifyLevelUp(feed.level);
      }

      // New achievement (unlocked in last 2 minutes, shown only once per key per session)
      const freshAch = (feed.recentAchievements || []).find(
        a => Date.now() - new Date(a.unlockedAt).getTime() < 120_000 && !shownAchievementsRef.current.has(a.key),
      );
      if (freshAch) {
        setAchievementModal(freshAch);
        shownAchievementsRef.current.add(freshAch.key);
        sessionStorage.setItem('lnv_shown_ach', JSON.stringify([...shownAchievementsRef.current]));
        sound.achievement();
        notifyAchievement(freshAch.label || freshAch.key);
        prev.lastAchKey = freshAch.key;
        setTimeout(() => setAchievementModal(null), 5000);
      }

      // Floating XP indicator
      if (feed.totalXp > prev.totalXp && prev.totalXp > 0) {
        const gained = feed.totalXp - prev.totalXp;
        const id = Date.now();
        setFloatingXps(p => [...p.slice(-4), { id, amount: gained }]);
        setTimeout(() => setFloatingXps(p => p.filter(x => x.id !== id)), 2800);
        sound.xp();
        notifyXpGained(gained);
      }

      // Streak milestones (3 / 7 / 30)
      const STREAK_MILESTONES = new Set([3, 7, 30]);
      if (
        feed.currentStreak > prev.streak &&
        prev.streak > 0 &&
        STREAK_MILESTONES.has(feed.currentStreak)
      ) {
        notifyStreakMilestone(feed.currentStreak);
      }

      // Streak warning banner — show only when student has NOT engaged today.
      // Auto-dismiss the moment the backend confirms engagement (lastActivityAt === today).
      setEngagedToday(Boolean(feed.engagedToday));
      if (feed.engagedToday) {
        if (!streakDismissedRef.current) dismissStreakBanner();
      } else if (!streakDismissedRef.current) {
        setShowStreakBanner(true);
      }

      // Live-update gamification header values
      setGamification(g => ({ ...g, totalXp: feed.totalXp, level: feed.level, currentStreak: feed.currentStreak }));
      setActivityFeed(feed.feed || []);

      prevRef.current = { ...prev, level: feed.level, totalXp: feed.totalXp, streak: feed.currentStreak };
      sessionStorage.setItem('lnv_last_xp',   String(feed.totalXp));
      sessionStorage.setItem('lnv_last_level', String(feed.level));
    };

    // Refresh adaptive missions every other poll (60s)
    const pollWithMissions = async () => {
      await poll();
      if (prevRef.current.pollCount % 2 === 0) {
        const am = await fetchAdaptiveMissions();
        if (am) setAdaptiveMissions(am);
      }
    };

    const timer   = setTimeout(pollWithMissions, 3000);
    const interval = setInterval(pollWithMissions, 30_000);
    return () => { active = false; clearTimeout(timer); clearInterval(interval); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!t?.student) return <div className="m-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">{isArabic ? 'جاري تحميل الترجمة...' : 'Loading translations...'}</div>;
  if (!Array.isArray(enrolledCourses)) return <div className="m-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">{t.student.common.noData}</div>;

  const activityByCourseId = useMemo(() => {
    const map = new Map();
    marks.forEach((mark) => {
      const courseId = Number(mark?.subject?.course?.id || mark?.subject?.Course_id || mark?.subject?.courseId);
      if (!Number.isFinite(courseId)) return;
      const rawDate = mark?.time || mark?.createdAt || mark?.updatedAt;
      const lastActivity = rawDate ? new Date(rawDate).getTime() : 0;
      map.set(courseId, Math.max(map.get(courseId) || 0, Number.isFinite(lastActivity) ? lastActivity : 0));
    });
    return map;
  }, [marks]);

  const continueLearning = useMemo(() =>
    enrolledCourses
      .map((c) => ({ ...c, progress: Number(c?.progress || 0), lastActivity: activityByCourseId.get(Number(c.id)) || 0 }))
      .filter((c) => c.progress > 0)
      .sort((a, b) => b.lastActivity !== a.lastActivity ? b.lastActivity - a.lastActivity : b.progress - a.progress),
    [enrolledCourses, activityByCourseId]);

  const continueIds = new Set(continueLearning.map((c) => Number(c.id)));
  const myCourses = useMemo(() => enrolledCourses.filter((c) => !continueIds.has(Number(c.id))), [enrolledCourses, continueIds]);
  const prioritySubjectId = adaptiveInsights?.nextLesson?.subjectId ?? null;
  const avgMark = summarizeAverageMark(marks);
  const xpInLevel = gamification.totalXp % 100;

  return (
    <StudentLayout>
      {/* Custom animation keyframes */}
      <style>{`
        @keyframes slideInRight {
          from { opacity:0; transform:translateX(28px) scale(0.92); }
          to   { opacity:1; transform:translateX(0) scale(1); }
        }
        @keyframes fadeOut {
          0%   { opacity:1; }
          70%  { opacity:1; }
          100% { opacity:0; transform:translateX(16px); }
        }
        @keyframes scaleIn {
          from { opacity:0; transform:scale(0.8); }
          to   { opacity:1; transform:scale(1); }
        }
        @keyframes slideDown {
          from { opacity:0; transform:translateY(-10px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes floatUp {
          0%   { opacity:0.8; transform:translateY(0) scale(1); }
          100% { opacity:0;   transform:translateY(-60px) scale(0.5); }
        }
        @keyframes livePulse {
          0%, 100% { opacity:1; }
          50%       { opacity:0.3; }
        }
        @keyframes lnRotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes lnShimmer { 0% { transform: translateX(-100%) skewX(-15deg); } 100% { transform: translateX(200%) skewX(-15deg); } }
        @keyframes lnPulseGlow { 0%, 100% { opacity: 0.35; } 50% { opacity: 0.6; } }
        @keyframes lnGradShift { 0%, 100% { opacity: 0.35; } 50% { opacity: 0.55; } }
        @keyframes lnAccentSlide { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
      `}</style>

      {/* ── Global overlays ── */}
      {levelUpModal && <LevelUpOverlay level={levelUpModal} onClose={() => setLevelUpModal(null)} isArabic={isArabic} />}
      {achievementModal && <AchievementModal achievement={achievementModal} onClose={() => setAchievementModal(null)} isArabic={isArabic} />}
      <FloatingXPLayer items={floatingXps} />

      <div className="space-y-5 pb-8 ln-page-enter">

        {/* Streak warning banner */}
        {showStreakBanner && (
          <StreakBanner streak={gamification.currentStreak} onDismiss={dismissStreakBanner} isArabic={isArabic} />
        )}

        {/* Skeleton (first load) */}
        {loading && enrolledCourses.length === 0 && (
          <div className="space-y-4">
            <div className="ln-skeleton h-48 rounded-[2rem]" />
            <div className="ln-skeleton h-48 rounded-3xl" />
            <div className="grid grid-cols-2 gap-3">
              <div className="ln-skeleton h-52 rounded-3xl" />
              <div className="ln-skeleton h-52 rounded-3xl" />
            </div>
          </div>
        )}

        {/* Inline refresh indicator */}
        {loading && enrolledCourses.length > 0 && (
          <div className="flex items-center gap-2.5 rounded-2xl border border-indigo-100 bg-indigo-50/70 px-4 py-3 backdrop-blur">
            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-indigo-300 border-t-indigo-600 shrink-0" />
            <span className="text-sm font-medium text-indigo-600">{isArabic ? 'جاري التحديث...' : 'Refreshing...'}</span>
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-800">{error}</div>
        )}

        {/* ─── Dashboard Header ─── */}
        <DashboardHeader
          profile={profile}
          gamification={gamification}
          currentRank={currentRank}
          achievements={achievements}
          avgMark={avgMark}
          xpInLevel={xpInLevel}
          isSchoolStudent={isSchoolStudent}
          isArabic={isArabic}
        />

        {/* ─── Resume Learning ─── */}
        {continueLearning.length > 0 && (
          <section className="space-y-3">
            <DarkContinueLearningCard
              course={continueLearning[0]}
              actionHref={`/student/courses/${continueLearning[0].id}`}
              isArabic={isArabic}
            />
            {continueLearning.length > 1 && (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {continueLearning.slice(1, 4).map((course, i) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    index={i + 1}
                    actionLabel={isArabic ? 'متابعة' : 'Continue'}
                    actionHref={`/student/courses/${course.id}`}
                    variant="continue"
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* ─── AI Mentor Card ─── */}
        {aiMentor && <DarkAIMentorCard mentor={aiMentor} engagedToday={engagedToday} isArabic={isArabic} />}

        {/* ─── Today's Focus ─── */}
        <DarkTodaysFocusCard missions={missions} adaptiveMissions={adaptiveMissions} isArabic={isArabic} />

        {/* ─── This Week's Progress ─── */}
        <DarkWeekProgressCard gamification={gamification} activityFeed={activityFeed} isArabic={isArabic} />

        {/* ─── My Specializations (not started) ─── */}
        {myCourses.length > 0 && (
          <DarkEnrolledTracksSection courses={myCourses} isArabic={isArabic} />
        )}

        {/* ─── Activity Feed ─── */}
        {activityFeed.length > 0 && <DarkActivityFeedSection feed={activityFeed} isArabic={isArabic} />}

      </div>
    </StudentLayout>
  );
}

/* ─────────────── Sub-components ─────────────── */

function HeroStat({ label, value, icon: Icon, iconCls, bg }) {
  return (
    <div className={`rounded-2xl border border-white/15 ${bg} px-4 py-3.5 backdrop-blur`}>
      <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/60">{label}</p>
      <div className="mt-1.5 flex items-center gap-2">
        <Icon size={15} className={iconCls} />
        <p className="text-xl font-black text-white">{value}</p>
      </div>
    </div>
  );
}

const MISSION_ICONS = {
  DAILY_LESSON_1:    BookOpen,
  DAILY_LESSON_3:    BookOpen,
  DAILY_QUIZ_1:      Zap,
  DAILY_FLASHCARD_1: Layers,
  DAILY_CHATBOT_1:   MessageSquare,
  WEEKLY_LESSON_5:   BookOpen,
  WEEKLY_LESSON_10:  BookOpen,
  WEEKLY_QUIZ_3:     Zap,
  WEEKLY_PERFECT_2:  Star,
  WEEKLY_FLASHCARD_3: Layers,
};

// MISSION_COLORS removed — MissionRow uses inline logic

const DIFFICULTY_CONFIG = {
  BEGINNER:     { label: 'Beginner',     labelAr: 'مبتدئ',   cls: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  MEDIUM:       { label: 'Medium',       labelAr: 'متوسط',   cls: 'bg-blue-50 text-blue-600 border-blue-200'          },
  INTERMEDIATE: { label: 'Intermediate', labelAr: 'متوسط',   cls: 'bg-blue-50 text-blue-600 border-blue-200'          },
  HARD:         { label: 'Hard',         labelAr: 'صعب',     cls: 'bg-amber-50 text-amber-600 border-amber-200'       },
  ADVANCED:     { label: 'Advanced',     labelAr: 'متقدم',   cls: 'bg-amber-50 text-amber-600 border-amber-200'       },
  ELITE:        { label: 'Elite',        labelAr: 'نخبة',    cls: 'bg-fuchsia-50 text-fuchsia-600 border-fuchsia-200' },
};

const UNIT_LABEL = (key, isArabic) =>
  key.includes('QUIZ') ? (isArabic ? 'اختبارات' : 'quizzes') :
  key.includes('FLASHCARD') || key.includes('CHATBOT') ? (isArabic ? 'جلسات' : 'sessions') : (isArabic ? 'دروس' : 'lessons');

function MissionRow({ mission: m, period }) {
  const { isArabic } = useLanguage();
  const pct  = Math.min(100, m.goal > 0 ? Math.round((m.progress / m.goal) * 100) : 0);
  const Icon = MISSION_ICONS[m.key] || Target;
  const diff = m.difficulty ? DIFFICULTY_CONFIG[m.difficulty] : null;
  const isDone = m.completed;

  const iconGrad = isDone
    ? 'from-emerald-400 to-teal-500'
    : period === 'daily'
    ? 'from-amber-400 to-orange-500'
    : 'from-indigo-500 to-violet-600';

  const barGrad = isDone
    ? 'from-emerald-400 to-teal-400'
    : period === 'daily'
    ? 'from-amber-400 to-orange-400'
    : 'from-indigo-500 to-violet-500';

  const ringStroke = isDone ? '#34d399' : period === 'daily' ? '#f59e0b' : '#818cf8';
  const circumference = 2 * Math.PI * 11;
  const strokeDash = (pct / 100) * circumference;

  return (
    <div className={`group relative flex items-center gap-3 rounded-xl border px-3 py-2.5 transition duration-150
      ${isDone ? 'border-emerald-100 bg-emerald-50/40' : 'border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm'}`}
    >
      {/* Recommended accent line */}
      {m.recommended && !isDone && (
        <div className="absolute left-0 top-2 bottom-2 w-0.5 rounded-r-full bg-gradient-to-b from-violet-500 to-fuchsia-500" />
      )}

      {/* Icon */}
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${iconGrad} shadow-sm ${isDone ? 'opacity-70' : ''}`}>
        {isDone
          ? <CheckCircle2 size={14} className="text-white" />
          : <Icon size={14} className="text-white" />
        }
      </div>

      {/* Label + progress bar */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          {m.recommended && !isDone && (
            <span className="flex items-center gap-0.5 rounded-full bg-violet-100 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-violet-600">
              <Sparkles size={7} /> AI
            </span>
          )}
          <p className={`text-xs font-black leading-none text-slate-800 ${isDone ? 'line-through opacity-50' : ''}`}>
            {m.label}
          </p>
          {diff && (
            <span className={`rounded-full border px-1.5 py-0.5 text-[8px] font-bold ${diff.cls}`}>{isArabic ? diff.labelAr : diff.label}</span>
          )}
        </div>
        {/* thin progress bar */}
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-slate-100">
          <div className={`h-full rounded-full bg-gradient-to-r ${barGrad} transition-all duration-700`}
            style={{ width: `${pct}%` }} />
        </div>
        <p className={`mt-0.5 text-[10px] font-semibold ${isDone ? 'text-emerald-500' : 'text-slate-400'}`}>
          {isDone ? (isArabic ? '✓ مكتمل' : '✓ Complete') : `${m.progress}/${m.goal} ${UNIT_LABEL(m.key, isArabic)}`}
        </p>
      </div>

      {/* Mini ring + XP */}
      <div className="flex shrink-0 flex-col items-end gap-1">
        <div className="relative">
          <svg className="-rotate-90" width="26" height="26" viewBox="0 0 26 26">
            <circle cx="13" cy="13" r="11" fill="none" stroke={isDone ? '#d1fae5' : '#f1f5f9'} strokeWidth="2.5" />
            <circle cx="13" cy="13" r="11" fill="none" stroke={ringStroke} strokeWidth="2.5"
              strokeLinecap="round" strokeDasharray={`${strokeDash} ${circumference}`} />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[7px] font-black text-slate-500">{pct}%</span>
        </div>
        <span className={`rounded-full px-1.5 py-0.5 text-[8px] font-black
          ${isDone ? 'bg-emerald-100 text-emerald-700' : period === 'daily' ? 'bg-amber-50 text-amber-600 border border-amber-200' : 'bg-indigo-50 text-indigo-600 border border-indigo-200'}`}>
          +{m.xp}
        </span>
      </div>
    </div>
  );
}

const TIER_BADGE_CONFIG = {
  BEGINNER:     { cls: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  INTERMEDIATE: { cls: 'bg-blue-100 text-blue-700 border-blue-200',          dot: 'bg-blue-500'    },
  ADVANCED:     { cls: 'bg-amber-100 text-amber-700 border-amber-200',       dot: 'bg-amber-500'   },
  ELITE:        { cls: 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200', dot: 'bg-fuchsia-500' },
};

const TIER_LABELS_AR = { BEGINNER: 'مبتدئ', INTERMEDIATE: 'متوسط', ADVANCED: 'متقدم', ELITE: 'نخبة' };

function TierBadge({ tier, isArabic }) {
  const cfg = TIER_BADGE_CONFIG[tier] || TIER_BADGE_CONFIG.BEGINNER;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wider ${cfg.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {isArabic ? `المستوى: ${TIER_LABELS_AR[tier] || tier}` : `Tier: ${tier}`}
    </span>
  );
}

/* ─────────────── AI Mentor Section ─────────────── */

const MENTOR_COACHING_ICONS = {
  BRAIN:   Brain,
  TREND:   TrendingUp,
  FOCUS:   MapPin,
  QUIZ:    Zap,
  LESSON:  BookOpen,
  TARGET:  Target,
};

const MENTOR_ACTION_ICONS = {
  FLAME:  Flame,
  QUIZ:   Zap,
  BRAIN:  Brain,
  BOOK:   BookOpen,
  TARGET: Target,
};

const URGENCY_CONFIG = {
  HIGH:   { border: 'border-red-200',   bg: 'from-red-50 to-rose-50',     icon: 'text-red-500',   badge: 'bg-red-500',   label: 'Urgent',    labelAr: 'عاجل'  },
  MEDIUM: { border: 'border-amber-200', bg: 'from-amber-50 to-orange-50', icon: 'text-amber-500', badge: 'bg-amber-500', label: 'Today',     labelAr: 'اليوم' },
  LOW:    { border: 'border-indigo-200', bg: 'from-indigo-50 to-violet-50', icon: 'text-indigo-500', badge: 'bg-indigo-500', label: 'Suggested', labelAr: 'مقترح' },
};

const COACHING_TYPE_CONFIG = {
  warning:    { border: 'border-amber-100', bg: 'bg-amber-50/70',   text: 'text-amber-800',   dot: 'bg-amber-400'   },
  success:    { border: 'border-emerald-100', bg: 'bg-emerald-50/70', text: 'text-emerald-800', dot: 'bg-emerald-400' },
  suggestion: { border: 'border-indigo-100', bg: 'bg-indigo-50/70',  text: 'text-indigo-800',  dot: 'bg-indigo-400'  },
};

const STREAK_WARN_TYPES = new Set(['STREAK_BROKEN', 'STREAK_AT_RISK']);
const STREAK_DANGER_RE  = /fragile|protect it|study.*today|streak.*risk|every comeback|study something/i;

const ENGAGED_SUCCESS = (isArabic) => ({ message: isArabic ? 'أنت ملتزم — السلسلة في أمان وزخمك يتصاعد.' : "You're showing up — streak is safe and momentum is building.", type: 'ENGAGED' });
const ENGAGED_ACTION  = (isArabic) => ({ action: isArabic ? 'واصل استكشاف كورساتك' : 'Keep exploring your courses', reason: isArabic ? 'لقد تفاعلت اليوم — الاستمرارية تتراكم' : 'You already engaged today — consistency compounds', urgency: 'LOW', icon: 'TARGET' });

function _splitNarrative(text) {
  if (!text) return [];
  return text.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0).slice(0, 3);
}

function AIMentorSection({ mentor, isArabic, engagedToday }) {
  // ── Apply engagedToday overrides ────────────────────────────────────────────
  const isStreakWarn = mentor.urgentWarning && STREAK_WARN_TYPES.has(mentor.urgentWarning.type);
  const urgentWarning   = engagedToday && isStreakWarn ? null : mentor.urgentWarning;
  const successHighlight = engagedToday && isStreakWarn
    ? ENGAGED_SUCCESS(isArabic)
    : mentor.successHighlight;

  const rawAction = mentor.nextBestAction;
  const isStreakAction = rawAction?.icon === 'FLAME';
  const nextBestAction = engagedToday && isStreakAction ? ENGAGED_ACTION(isArabic) : rawAction;

  const coachingPoints = (mentor.coachingPoints ?? []).filter(
    p => !(engagedToday && STREAK_DANGER_RE.test(p.message)),
  );
  if (engagedToday && coachingPoints.length < (mentor.coachingPoints?.length ?? 0)) {
    coachingPoints.unshift({ icon: 'TREND', type: 'success', message: isArabic ? 'تفاعلت اليوم — السلسلة محمية وعادتك تتعزز.' : "Engaged today — streak is protected and your habit is getting stronger." });
  }

  const urgCfg    = URGENCY_CONFIG[nextBestAction?.urgency] || URGENCY_CONFIG.LOW;
  const ActionIcon = MENTOR_ACTION_ICONS[nextBestAction?.icon] || Target;
  const narrativeParts = _splitNarrative(mentor.narrative);

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-violet-300/20 bg-gradient-to-br from-slate-900 via-violet-950 to-fuchsia-950 shadow-[0_20px_56px_-16px_rgba(139,92,246,0.4)]">
      {/* decorative orbs */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-violet-500/8 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-12 left-1/3 h-48 w-48 rounded-full bg-fuchsia-500/8 blur-3xl" />

      {/* ── Header ── */}
      <div className="relative flex items-center justify-between gap-3 border-b border-white/8 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <div className="absolute inset-0 animate-ping rounded-full bg-violet-400/25" style={{ animationDuration: '2.8s' }} />
            <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600 shadow-[0_0_18px_rgba(167,139,250,0.55)]">
              <Brain size={17} className="text-white" />
            </div>
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-violet-400">
              {isArabic ? 'المرشد الذكي' : 'AI Mentor'}
            </p>
            <h2 className="text-sm font-black leading-tight text-white">
              {isArabic ? 'تحليل مخصص لك' : 'Your coaching report'}
            </h2>
          </div>
        </div>
        {mentor.aiPowered ? (
          <span className="flex shrink-0 items-center gap-1 rounded-full border border-violet-400/25 bg-violet-500/15 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-violet-300">
            <Sparkles size={7} /> Groq AI
          </span>
        ) : (
          <span className="flex shrink-0 items-center gap-1 rounded-full border border-white/8 bg-white/4 px-2 py-0.5 text-[8px] font-semibold text-white/35">
            Algorithmic
          </span>
        )}
      </div>

      <div className="relative space-y-3 p-5">

        {/* ── Narrative ── */}
        <div className="rounded-xl border border-white/8 bg-white/4 px-4 py-3">
          {narrativeParts.map((sentence, i) => (
            <p key={i} className={`text-xs font-medium leading-relaxed text-violet-100 ${i > 0 ? 'mt-1.5' : ''}`}>
              {i === 0 ? <>&ldquo;{sentence}</> : sentence}
              {i === narrativeParts.length - 1 ? <>&rdquo;</> : ''}
            </p>
          ))}
        </div>

        {/* ── Warning + Success row ── */}
        {(urgentWarning || successHighlight) && (
          <div className="grid gap-2 sm:grid-cols-2">
            {urgentWarning && (
              <div className="flex items-start gap-2 rounded-xl border border-amber-400/25 bg-amber-400/8 px-3 py-2.5">
                <AlertCircle size={12} className="mt-0.5 shrink-0 text-amber-300" />
                <p className="text-[11px] font-semibold leading-snug text-amber-100">{urgentWarning.message}</p>
              </div>
            )}
            {successHighlight && (
              <div className="flex items-start gap-2 rounded-xl border border-emerald-400/25 bg-emerald-400/8 px-3 py-2.5">
                <CheckCircle2 size={12} className="mt-0.5 shrink-0 text-emerald-300" />
                <p className="text-[11px] font-semibold leading-snug text-emerald-100">{successHighlight.message}</p>
              </div>
            )}
          </div>
        )}

        {/* ── Next Best Action ── */}
        {nextBestAction && (
          <div className={`overflow-hidden rounded-xl border ${urgCfg.border} bg-gradient-to-r ${urgCfg.bg}`}>
            <div className="flex items-center gap-3 px-3.5 py-3">
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${urgCfg.badge} shadow-sm`}>
                <ActionIcon size={15} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-[8px] font-black uppercase tracking-[0.18em] text-slate-400">
                    {isArabic ? 'الخطوة التالية' : 'Next action'}
                  </p>
                  <span className={`rounded-full ${urgCfg.badge} px-1.5 py-px text-[7px] font-black uppercase tracking-wider text-white`}>
                    {isArabic ? urgCfg.labelAr : urgCfg.label}
                  </span>
                </div>
                <p className="mt-0.5 text-xs font-black leading-tight text-slate-800">{nextBestAction.action}</p>
                <p className="text-[10px] font-medium text-slate-500">{nextBestAction.reason}</p>
              </div>
            </div>
          </div>
        )}

        {/* ── Coaching points ── */}
        {coachingPoints.length > 0 && (
          <div className="grid gap-1.5 sm:grid-cols-2">
            {coachingPoints.slice(0, 4).map((point, i) => {
              const CoachIcon = MENTOR_COACHING_ICONS[point.icon] || Lightbulb;
              const cfg = COACHING_TYPE_CONFIG[point.type] || COACHING_TYPE_CONFIG.suggestion;
              return (
                <div key={i} className={`flex items-start gap-2 rounded-xl border ${cfg.border} ${cfg.bg} px-2.5 py-2`}>
                  <CoachIcon size={11} className={`mt-0.5 shrink-0 ${cfg.text}`} />
                  <p className={`text-[10px] font-semibold leading-snug ${cfg.text}`}>{point.message}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

/* ─────────────── AI Profile Section ─────────────── */

const ENGAGEMENT_CONFIG = {
  VERY_HIGH: { label: 'Very High', labelAr: 'مرتفع جداً', bar: 'from-emerald-400 to-teal-400',    pill: 'bg-emerald-100 text-emerald-700', score: 100 },
  HIGH:      { label: 'High',      labelAr: 'مرتفع',      bar: 'from-indigo-400 to-violet-500',   pill: 'bg-indigo-100 text-indigo-700',  score: 75  },
  MEDIUM:    { label: 'Medium',    labelAr: 'متوسط',      bar: 'from-amber-400 to-orange-400',    pill: 'bg-amber-100 text-amber-700',    score: 45  },
  LOW:       { label: 'Low',       labelAr: 'منخفض',      bar: 'from-slate-300 to-slate-400',     pill: 'bg-slate-100 text-slate-500',    score: 15  },
};

const TREND_ICON = { IMPROVING: ChevronUp, DECLINING: ChevronDown, STABLE: Minus };
const TREND_CLS  = { IMPROVING: 'text-emerald-500', DECLINING: 'text-red-400', STABLE: 'text-slate-400' };

function ProfileStatCard({ icon: Icon, iconGradient, label, value, sub }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${iconGradient} shadow`}>
        <Icon size={16} className="text-white" />
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">{label}</p>
        <p className="mt-0.5 text-lg font-black text-slate-900 leading-none">{value}</p>
        {sub && <p className="mt-0.5 text-[11px] font-semibold text-slate-400">{sub}</p>}
      </div>
    </div>
  );
}

function AIProfileSection({ profile, isArabic }) {
  const eng    = ENGAGEMENT_CONFIG[profile.engagementLevel] || ENGAGEMENT_CONFIG.MEDIUM;
  const TrendIcon = TREND_ICON[profile.learningVelocity?.trend] || Minus;
  const trendCls  = TREND_CLS[profile.learningVelocity?.trend] || 'text-slate-400';
  const pct    = profile.engagementScore ?? 0;

  return (
    <section className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 shadow-md">
            <Brain size={18} className="text-white" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
              {isArabic ? 'ملف التعلم الذكي' : 'AI Learning Profile'}
            </p>
            <h2 className="text-lg font-black text-slate-900">
              {isArabic ? 'رؤى مخصصة لك' : 'Your personalized insights'}
            </h2>
          </div>
        </div>
        <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ${eng.pill}`}>
          {isArabic ? eng.labelAr : eng.label}
        </span>
      </div>

      {/* Engagement score bar */}
      <div className="overflow-hidden rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 to-fuchsia-50 p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-violet-500" />
            <span className="text-sm font-black text-violet-900">
              {isArabic ? 'مستوى التفاعل' : 'Engagement Score'}
            </span>
          </div>
          <span className="text-2xl font-black text-violet-700">{pct}<span className="text-sm font-semibold text-violet-400">/100</span></span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-violet-100">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${eng.bar} shadow-[0_0_8px_rgba(139,92,246,0.3)] transition-all duration-700`}
            style={{ width: `${pct}%` }}
          />
        </div>
        {profile.summary && (
          <p className="mt-3 text-sm font-medium leading-relaxed text-violet-700 italic">
            &ldquo;{profile.summary}&rdquo;
          </p>
        )}
      </div>

      {/* 4 stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <ProfileStatCard
          icon={BookOpen}
          iconGradient="from-indigo-500 to-violet-500"
          label={isArabic ? 'دروس هذا الأسبوع' : 'Lessons / week'}
          value={profile.learningVelocity?.lessonsThisWeek ?? 0}
          sub={
            <span className={`flex items-center gap-0.5 ${trendCls}`}>
              <TrendIcon size={10} />
              {isArabic
                ? ({ IMPROVING: 'تحسّن', DECLINING: 'تراجع', STABLE: 'مستقر' }[profile.learningVelocity?.trend] ?? '')
                : (profile.learningVelocity?.trend?.toLowerCase() ?? '')}
            </span>
          }
        />
        <ProfileStatCard
          icon={Flame}
          iconGradient="from-amber-400 to-orange-500"
          label={isArabic ? 'الانتظام' : 'Consistency'}
          value={`${profile.consistency?.consistencyScore ?? 0}`}
          sub={`${profile.consistency?.activeDays30 ?? 0} ${isArabic ? 'يوم نشط' : 'active days'}`}
        />
        <ProfileStatCard
          icon={BarChart3}
          iconGradient="from-cyan-500 to-blue-500"
          label={isArabic ? 'متوسط الاختبارات' : 'Quiz avg'}
          value={`${profile.quizPerformance?.avgScore ?? 0}%`}
          sub={`${profile.quizPerformance?.passRate ?? 0}% ${isArabic ? 'نسبة النجاح' : 'pass rate'}`}
        />
        <ProfileStatCard
          icon={Brain}
          iconGradient="from-fuchsia-500 to-pink-500"
          label={isArabic ? 'أداة الذكاء الاصطناعي' : 'AI preference'}
          value={profile.aiUsage?.preferredTool === 'NONE' ? '—' : (profile.aiUsage?.preferredTool ?? '—')}
          sub={`${(profile.aiUsage?.flashcards ?? 0) + (profile.aiUsage?.chatbot ?? 0) + (profile.aiUsage?.mindmaps ?? 0)} ${isArabic ? 'جلسة' : 'sessions'}`}
        />
      </div>

      {/* Strengths + Weaknesses */}
      <div className="grid gap-3 sm:grid-cols-2">
        {/* Strengths */}
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 shadow-sm">
              <CheckCircle2 size={13} className="text-white" />
            </div>
            <span className="text-sm font-black text-emerald-800">{isArabic ? 'نقاط القوة' : 'Strengths'}</span>
          </div>
          <ul className="space-y-2">
            {(profile.strengths || []).map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-sm font-medium text-emerald-700">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                {s}
              </li>
            ))}
          </ul>
        </div>

        {/* Focus areas + recommendations */}
        <div className="space-y-3">
          {/* Focus areas */}
          {profile.focusAreas?.length > 0 && (
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 shadow-sm">
                  <MapPin size={13} className="text-white" />
                </div>
                <span className="text-sm font-black text-indigo-800">{isArabic ? 'مجالات التركيز' : 'Focus Areas'}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {profile.focusAreas.map((f, i) => (
                  <span key={i} className="rounded-full border border-indigo-200 bg-white px-3 py-1 text-xs font-bold text-indigo-700 shadow-sm">
                    {f.name} <span className="text-indigo-400">· {f.count}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Smart Recommendation */}
          {profile.weaknesses?.length > 0 && (
            <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-sm">
                  <Lightbulb size={13} className="text-white" />
                </div>
                <span className="text-sm font-black text-amber-800">{isArabic ? 'توصيات ذكية' : 'Smart Recommendations'}</span>
              </div>
              <ul className="space-y-1.5">
                {(profile.weaknesses || []).slice(0, 2).map((w, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm font-medium text-amber-700">
                    <AlertCircle size={13} className="mt-0.5 shrink-0 text-amber-400" />
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function SectionHeader({ icon: Icon, iconBg, badge, title, count }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br ${iconBg} shadow-md`}>
          <Icon size={18} className="text-white" />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">{badge}</p>
          <h2 className="text-lg font-black text-slate-900">{title}</h2>
        </div>
      </div>
      {count > 0 && (
        <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">{count}</span>
      )}
    </div>
  );
}

function CourseCard({ course, index, actionLabel, actionHref, variant, priority = false, priorityLabel }) {
  const { isArabic } = useLanguage();
  const progress = Math.min(100, Math.max(0, Number(course?.progress || 0)));
  const gradient = COVER_GRADIENTS[index % COVER_GRADIENTS.length];
  const isContinue = variant === 'continue';

  const circumference = 2 * Math.PI * 18;
  const strokeDash = (progress / 100) * circumference;

  return (
    <article className={`group flex flex-col overflow-hidden rounded-3xl border bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-[0_16px_40px_-12px_rgba(99,51,211,0.18)] ${priority ? 'border-indigo-300 ring-2 ring-indigo-200/60 shadow-indigo-100' : 'border-slate-200'}`}>
      {/* Banner */}
      <div className={`relative h-32 bg-gradient-to-br ${gradient} flex items-center justify-center overflow-hidden`}>
        {course.cover ? (
          <img src={course.cover} alt="" className="absolute inset-0 h-full w-full object-cover opacity-90" />
        ) : (
          <GraduationCap size={40} className="text-white/30" />
        )}
        {/* overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

        {/* category badge */}
        <span className="absolute left-3 top-3 rounded-full border border-white/20 bg-white/20 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-white backdrop-blur-sm">
          {course.category}
        </span>
        {priority && (
          <span className="absolute bottom-3 left-3 flex items-center gap-1 rounded-full bg-indigo-600 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-white shadow">
            <Sparkles size={8} /> {isArabic ? 'أولوية' : 'Priority'}
          </span>
        )}

        {/* progress ring (continue) or start icon */}
        {isContinue ? (
          <div className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center">
            <svg className="-rotate-90" width="44" height="44" viewBox="0 0 44 44">
              <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="3" />
              <circle
                cx="22" cy="22" r="18" fill="none"
                stroke="white" strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={`${strokeDash} ${circumference}`}
              />
            </svg>
            <span className="absolute text-[10px] font-black text-white">{Math.round(progress)}%</span>
          </div>
        ) : (
          <div className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-white/20 backdrop-blur">
            <Play size={14} className="text-white" />
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 text-sm font-black leading-snug text-slate-900">{course.name}</h3>

        {isContinue && (
          <div className="mt-2.5">
            <div className="mb-1 flex justify-between text-[10px] font-bold text-slate-400">
              <span>{isArabic ? 'التقدم' : 'Progress'}</span>
              <span className="text-indigo-600">{Math.round(progress)}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <div className="mt-auto pt-3">
          <Link
            to={actionHref}
            className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
              isContinue
                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-200 hover:shadow-lg hover:shadow-indigo-300'
                : 'border border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700'
            }`}
          >
            {actionLabel}
            <ChevronRight size={14} />
          </Link>
        </div>
      </div>
    </article>
  );
}

function EmptyState({ title, description, icon: Icon }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-8 text-center">
      {Icon && (
        <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm">
          <Icon size={18} className="text-slate-400" />
        </div>
      )}
      <p className="text-xs font-bold text-slate-600">{title}</p>
      {description && <p className="mt-0.5 max-w-xs text-[10px] text-slate-400">{description}</p>}
    </div>
  );
}

/* ─────────────── Floating XP Layer ─────────────── */

function FloatingXPLayer({ items }) {
  return (
    <div className="pointer-events-none fixed bottom-6 right-5 z-50 flex flex-col items-end gap-1.5">
      {items.map(item => (
        <div key={item.id}
          className="flex items-center gap-1.5 rounded-full border border-amber-200 bg-white px-3 py-1.5 shadow-md shadow-amber-100/80"
          style={{ animation: 'slideInRight 0.25s ease-out, fadeOut 2.8s ease-out forwards' }}>
          <Zap size={11} className="text-amber-500" />
          <span className="text-xs font-black text-amber-700">+{item.amount} XP</span>
        </div>
      ))}
    </div>
  );
}

/* ─────────────── Achievement Modal ─────────────── */

const ACHIEVEMENT_LABELS_FE = {
  FIRST_LESSON: 'First Step',   LESSON_10:  'Eager Learner',   LESSON_50:    'Knowledge Seeker',
  FIRST_QUIZ:   'Quiz Taker',   QUIZ_5:     'Quiz Master',      PERFECT_QUIZ: 'Perfectionist',
  STREAK_3:     'On a Roll',    STREAK_7:   'Week Warrior',     STREAK_30:    'Unstoppable',
  XP_100:       'Century Club', XP_500:     'XP Hunter',
};

const ACHIEVEMENT_LABELS_AR = {
  FIRST_LESSON: 'الخطوة الأولى', LESSON_10:  'متحمس للتعلم',   LESSON_50:    'باحث عن المعرفة',
  FIRST_QUIZ:   'خاض أول اختبار', QUIZ_5:   'سيد الاختبارات', PERFECT_QUIZ: 'المثالي',
  STREAK_3:     'في الطريق الصحيح', STREAK_7: 'محارب الأسبوع', STREAK_30:    'لا يُوقف',
  XP_100:       'نادي المئة',    XP_500:     'صياد XP',
};

function AchievementModal({ achievement, onClose, isArabic }) {
  const label = achievement?.label
    || (isArabic ? ACHIEVEMENT_LABELS_AR[achievement?.key] : ACHIEVEMENT_LABELS_FE[achievement?.key])
    || achievement?.key
    || (isArabic ? 'إنجاز' : 'Achievement');

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}>
      <div className="relative w-full max-w-xs overflow-hidden rounded-3xl bg-gradient-to-br from-violet-500 via-indigo-600 to-violet-700 p-8 text-center text-white shadow-2xl"
        style={{ animation: 'scaleIn 0.22s ease-out' }}
        onClick={e => e.stopPropagation()}>
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.15),transparent_70%)]" />
        <div className="text-5xl">🏆</div>
        <p className="mt-3 text-[10px] font-black uppercase tracking-[0.25em] text-violet-200">
          {isArabic ? 'تم فتح إنجاز' : 'Achievement Unlocked'}
        </p>
        <h2 className="mt-1 text-2xl font-black">{label}</h2>
        {achievement?.xp > 0 && (
          <p className="mt-1 text-sm font-semibold text-violet-200">+{achievement.xp} {isArabic ? 'XP إضافي' : 'bonus XP'}</p>
        )}
        <button onClick={onClose}
          className="mt-6 rounded-full border border-white/30 bg-white/20 px-6 py-2.5 text-sm font-black backdrop-blur transition hover:bg-white/30">
          {isArabic ? '!احتفل 🎉' : 'Claim! 🎉'}
        </button>
      </div>
    </div>
  );
}

/* ─────────────── Level-Up Overlay ─────────────── */

function LevelUpOverlay({ level, onClose, isArabic }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4500);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[70] flex cursor-pointer items-center justify-center bg-gradient-to-br from-indigo-950/95 via-violet-950/95 to-fuchsia-950/95 backdrop-blur-sm"
      onClick={onClose}>
      <div className="text-center text-white" style={{ animation: 'scaleIn 0.3s cubic-bezier(0.175,0.885,0.32,1.275)' }}>
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {[...Array(18)].map((_, i) => (
            <div key={i} className="absolute rounded-full"
              style={{
                width: `${6 + (i % 3) * 4}px`,
                height: `${6 + (i % 3) * 4}px`,
                left: `${5 + i * 5.2}%`,
                top: `${40 + (i % 4) * 15}%`,
                background: ['#a78bfa', '#f472b6', '#34d399', '#60a5fa', '#fbbf24'][i % 5],
                animation: `floatUp ${1.2 + (i % 4) * 0.35}s ease-out ${i * 0.08}s both`,
              }} />
          ))}
        </div>
        <div className="text-7xl">⚡</div>
        <p className="mt-3 text-xs font-black uppercase tracking-[0.3em] text-violet-300">
          {isArabic ? '!ترقٍ' : 'Level Up!'}
        </p>
        <p className="mt-1 text-7xl font-black tracking-tight">
          <span className="text-3xl font-bold text-violet-300">{isArabic ? 'مستوى ' : 'Lv.'}</span>{level}
        </p>
        <p className="mt-3 text-base font-semibold text-violet-200">
          {isArabic ? 'أنت تتقدم أكثر فأكثر' : 'You keep getting stronger'}
        </p>
        <p className="mt-6 animate-pulse text-xs text-violet-500">
          {isArabic ? 'انقر للمتابعة' : 'tap to continue'}
        </p>
      </div>
    </div>
  );
}

/* ─────────────── Streak Warning Banner ─────────────── */

function StreakBanner({ streak, onDismiss, isArabic }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-amber-100 bg-amber-50/80 px-3.5 py-2.5"
      style={{ animation: 'slideDown 0.2s ease-out' }}>
      <Flame size={13} className="shrink-0 text-amber-500" />
      <p className="flex-1 text-xs font-semibold text-amber-700">
        {streak > 0
          ? (isArabic ? `سلسلة ${streak} أيام في خطر — تفاعل مع أي شيء اليوم للحفاظ عليها.` : `${streak}-day streak at risk — engage with anything today to keep it going.`)
          : (isArabic ? 'انقطعت السلسلة. أي درس أو اختبار أو أداة ذكاء اصطناعي ستبدأ سلسلة جديدة.' : 'Streak broken. Any lesson, quiz, or AI tool will start a new one.')}
      </p>
      <button onClick={onDismiss}
        className="shrink-0 text-[10px] font-bold text-amber-400 transition hover:text-amber-600">
        ✕
      </button>
    </div>
  );
}

/* ─────────────── Adaptive Insights Section ─────────────── */

const SUGGESTION_CONFIG = {
  WEAK_SUBJECT: { icon: BarChart3,     cls: 'text-red-500',    bg: 'bg-red-50    border-red-100'    },
  VELOCITY:     { icon: TrendingUp,    cls: 'text-amber-500',  bg: 'bg-amber-50  border-amber-100'  },
  AI_TOOL:      { icon: Sparkles,      cls: 'text-violet-500', bg: 'bg-violet-50 border-violet-100' },
  STREAK:       { icon: Flame,         cls: 'text-orange-500', bg: 'bg-orange-50 border-orange-100' },
  MOMENTUM:     { icon: Star,          cls: 'text-indigo-500', bg: 'bg-indigo-50 border-indigo-100' },
};

const MOMENTUM_GRADIENT = (score) =>
  score >= 70 ? 'from-emerald-400 to-teal-400'
  : score >= 40 ? 'from-amber-400 to-orange-400'
  : 'from-red-400 to-rose-500';

const MOMENTUM_LABEL = (score, trend, isArabic) => {
  if (isArabic) {
    if (score >= 70) return trend === 'IMPROVING' ? 'قوي ومتصاعد' : 'قوي';
    if (score >= 40) return trend === 'DECLINING' ? 'يتراجع' : 'يتحسن';
    return 'منخفض';
  }
  if (score >= 70) return trend === 'IMPROVING' ? 'Strong & rising' : 'Strong';
  if (score >= 40) return trend === 'DECLINING' ? 'Declining' : 'Building';
  return 'Low — take action';
};

function MomentumGauge({ score, trend, isArabic }) {
  const grad = MOMENTUM_GRADIENT(score);
  const label = MOMENTUM_LABEL(score, trend, isArabic);
  const TrendIcon = TREND_ICON[trend] || Minus;
  const trendCls  = TREND_CLS[trend] || 'text-slate-400';

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 shadow-sm">
            <TrendingUp size={13} className="text-white" />
          </div>
          <span className="text-sm font-black text-slate-800">
            {isArabic ? 'زخم التعلم' : 'Learning Momentum'}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <TrendIcon size={12} className={trendCls} />
          <span className={`text-[10px] font-bold ${trendCls}`}>{label}</span>
        </div>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${grad} shadow-sm transition-all duration-700`}
          style={{ width: `${score}%` }}
        />
      </div>
      <div className="mt-1.5 flex items-center justify-between">
        <span className="text-[10px] font-semibold text-slate-400">0</span>
        <span className="text-sm font-black text-slate-800">{score}<span className="text-xs font-semibold text-slate-400">/100</span></span>
        <span className="text-[10px] font-semibold text-slate-400">100</span>
      </div>
    </div>
  );
}

function WeakSubjectList({ subjects, isArabic }) {
  if (!subjects || subjects.length === 0) return null;
  return (
    <div className="rounded-2xl border border-red-100 bg-red-50/60 p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-red-400 to-rose-500 shadow-sm">
          <AlertCircle size={13} className="text-white" />
        </div>
        <span className="text-sm font-black text-red-800">
          {isArabic ? 'مواد تحتاج تحسين' : 'Needs Improvement'}
        </span>
      </div>
      <div className="space-y-2">
        {subjects.map((s) => (
          <div key={s.subjectId} className="flex items-center gap-2.5">
            <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
            <span className="flex-1 truncate text-xs font-semibold text-red-700">{s.subjectName}</span>
            <span className={`rounded-full px-2 py-0.5 text-[9px] font-black ${
              s.avgScore < 50 ? 'bg-red-500 text-white' : 'bg-amber-100 text-amber-700'
            }`}>
              {s.avgScore}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdaptiveInsightsSection({ insights, profile, isArabic }) {
  const momentumScore = insights?.momentumScore ?? (profile ? Math.max(0, Math.min(100, Math.round(
    (profile.engagementScore ?? 0) * 0.5 + (profile.consistency?.consistencyScore ?? 0) * 0.35
  ))) : null);

  const momentumTrend = insights?.momentumTrend ?? profile?.learningVelocity?.trend ?? 'STABLE';
  const suggestions   = insights?.studySuggestions ?? [];
  const weakSubjects  = insights?.weakSubjects ?? [];

  if (momentumScore === null && suggestions.length === 0 && weakSubjects.length === 0) return null;

  return (
    <section className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-md">
          <Zap size={18} className="text-white" />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
            {isArabic ? 'رؤى التكيف' : 'Adaptive Insights'}
            <span className="ml-1.5 text-indigo-500">· AI</span>
          </p>
          <h2 className="text-lg font-black text-slate-900">
            {isArabic ? 'بياناتك تتحدث' : 'Your data, personalized'}
          </h2>
        </div>
      </div>

      {/* Momentum + Weak subjects */}
      <div className={`grid gap-3 ${weakSubjects.length > 0 ? 'sm:grid-cols-2' : ''}`}>
        {momentumScore !== null && (
          <MomentumGauge score={momentumScore} trend={momentumTrend} isArabic={isArabic} />
        )}
        {weakSubjects.length > 0 && (
          <WeakSubjectList subjects={weakSubjects} isArabic={isArabic} />
        )}
      </div>

      {/* Study suggestions */}
      {suggestions.length > 0 && (
        <div className={`grid gap-2 ${suggestions.length >= 2 ? 'sm:grid-cols-2' : ''} ${suggestions.length === 3 ? 'lg:grid-cols-3' : ''}`}>
          {suggestions.map((s, i) => {
            const cfg = SUGGESTION_CONFIG[s.type] || SUGGESTION_CONFIG.MOMENTUM;
            const SugIcon = cfg.icon;
            return (
              <div key={i} className={`flex items-start gap-2.5 rounded-xl border px-3 py-2.5 ${cfg.bg}`}>
                <SugIcon size={13} className={`mt-0.5 shrink-0 ${cfg.cls}`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-[10px] font-bold uppercase tracking-wider ${cfg.cls}`}>
                    {s.priority === 'HIGH' ? (isArabic ? 'عالي الأولوية' : 'High Priority')
                      : s.priority === 'MEDIUM' ? (isArabic ? 'مقترح' : 'Suggested')
                      : (isArabic ? 'اختياري' : 'Optional')}
                  </p>
                  <p className="mt-0.5 text-xs font-semibold leading-snug text-slate-700">{s.text}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

/* ─────────────── Activity Feed ─────────────── */

const FEED_ICONS = {
  LESSON_COMPLETE:   BookOpen,
  QUIZ_PASS:         Zap,
  QUIZ_PERFECT:      Star,
  DAILY_LOGIN:       Sun,
  FLASHCARD_SESSION: Layers,
  MINDMAP_SESSION:   Brain,
  CHATBOT_SESSION:   MessageSquare,
};

const FEED_GRADIENTS = {
  LESSON_COMPLETE:   'from-indigo-500 to-violet-500',
  QUIZ_PASS:         'from-amber-400 to-orange-500',
  QUIZ_PERFECT:      'from-emerald-400 to-teal-500',
  DAILY_LOGIN:       'from-cyan-400 to-blue-500',
  FLASHCARD_SESSION: 'from-fuchsia-500 to-pink-500',
  MINDMAP_SESSION:   'from-violet-500 to-purple-600',
  CHATBOT_SESSION:   'from-blue-500 to-indigo-600',
};

function relativeTime(iso, isArabic) {
  const diff = Date.now() - new Date(iso).getTime();
  if (isArabic) {
    if (diff < 60_000)     return 'الآن';
    if (diff < 3_600_000)  return `${Math.floor(diff / 60_000)} د`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} س`;
    return `${Math.floor(diff / 86_400_000)} ي`;
  }
  if (diff < 60_000)       return 'just now';
  if (diff < 3_600_000)    return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000)   return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

const isLive = (iso) => iso && Date.now() - new Date(iso).getTime() < 300_000;

function ActivityFeedSection({ feed, isArabic }) {
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-md shadow-indigo-100">
            <TrendingUp size={16} className="text-white" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
              {isArabic ? 'النشاط الأخير' : 'Recent Activity'}
            </p>
            <h2 className="text-base font-black leading-tight text-slate-900">
              {isArabic ? 'سجل نشاطك' : 'Your activity timeline'}
            </h2>
          </div>
        </div>
      </div>

      <div className="divide-y divide-slate-50 px-5 py-1">
        {feed.slice(0, 10).map((item, i) => {
          const Icon = FEED_ICONS[item.type] || Zap;
          const grad = FEED_GRADIENTS[item.type] || 'from-slate-400 to-slate-500';
          return (
            <div key={i} className="flex items-center gap-3 py-3">
              <div className="relative shrink-0">
                <div className={`flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br ${grad} shadow-sm`}>
                  <Icon size={12} className="text-white" />
                </div>
                {isLive(item.createdAt) && (
                  <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-400"
                    style={{ animation: 'livePulse 1.8s ease-in-out infinite' }} />
                )}
              </div>
              <p className="flex-1 min-w-0 truncate text-sm font-semibold text-slate-700">{item.label}</p>
              <div className="flex shrink-0 items-center gap-2">
                {item.xp > 0 && (
                  <span className="rounded-full border border-amber-100 bg-amber-50 px-2 py-0.5 text-[9px] font-black text-amber-600">+{item.xp}</span>
                )}
                <span className="text-[10px] font-semibold text-slate-400 tabular-nums">{relativeTime(item.createdAt, isArabic)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ─────────────── Compact AI Mentor Card (Dashboard widget) ─────────────── */

function CompactAIMentorCard({ mentor, isArabic, engagedToday }) {
  const isStreakWarn = mentor.urgentWarning && STREAK_WARN_TYPES.has(mentor.urgentWarning.type);
  const rawAction = mentor.nextBestAction;
  const isStreakAction = rawAction?.icon === 'FLAME';
  const nextBestAction = engagedToday && isStreakAction ? ENGAGED_ACTION(isArabic) : rawAction;
  const urgCfg = URGENCY_CONFIG[nextBestAction?.urgency] || URGENCY_CONFIG.LOW;
  const ActionIcon = MENTOR_ACTION_ICONS[nextBestAction?.icon] || Target;
  const successHighlight = engagedToday && isStreakWarn ? ENGAGED_SUCCESS(isArabic) : mentor.successHighlight;
  const firstSentence = _splitNarrative(mentor.narrative)[0] || '';

  return (
    <section className="relative flex flex-col overflow-hidden rounded-3xl border border-violet-300/20 bg-gradient-to-br from-slate-900 via-violet-950 to-fuchsia-950 shadow-[0_16px_40px_-12px_rgba(139,92,246,0.35)]">
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-violet-500/8 blur-3xl" />

      {/* Header */}
      <div className="flex items-center gap-3 border-b border-white/8 px-5 py-3.5">
        <div className="relative shrink-0">
          <div className="absolute inset-0 animate-ping rounded-full bg-violet-400/20" style={{ animationDuration: '3s' }} />
          <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600 shadow-[0_0_14px_rgba(167,139,250,0.45)]">
            <Brain size={15} className="text-white" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-violet-400">{isArabic ? 'المرشد الذكي' : 'AI Mentor'}</p>
          <h2 className="text-xs font-black text-white">{isArabic ? 'تحليل مخصص لك' : 'Your coaching report'}</h2>
        </div>
        {mentor.aiPowered && (
          <span className="shrink-0 flex items-center gap-1 rounded-full border border-violet-400/25 bg-violet-500/15 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-violet-300">
            <Sparkles size={7} /> AI
          </span>
        )}
      </div>

      <div className="relative flex flex-1 flex-col gap-3 p-4">
        {/* Narrative */}
        {firstSentence && (
          <div className="rounded-xl border border-white/8 bg-white/4 px-3.5 py-3">
            <p className="text-[11px] font-medium leading-relaxed text-violet-100">&ldquo;{firstSentence}&rdquo;</p>
          </div>
        )}

        {/* Next best action */}
        {nextBestAction && (
          <div className={`overflow-hidden rounded-xl border ${urgCfg.border} bg-gradient-to-r ${urgCfg.bg}`}>
            <div className="flex items-center gap-2.5 px-3 py-2.5">
              <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${urgCfg.badge} shadow-sm`}>
                <ActionIcon size={13} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 flex-wrap">
                  <p className="text-[8px] font-black uppercase tracking-[0.18em] text-slate-400">{isArabic ? 'الخطوة التالية' : 'Next action'}</p>
                  <span className={`rounded-full ${urgCfg.badge} px-1.5 py-px text-[7px] font-black uppercase tracking-wider text-white`}>
                    {isArabic ? urgCfg.labelAr : urgCfg.label}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] font-black leading-tight text-slate-800">{nextBestAction.action}</p>
                <p className="text-[9px] font-medium text-slate-500">{nextBestAction.reason}</p>
              </div>
            </div>
          </div>
        )}

        {/* Success highlight */}
        {successHighlight && (
          <div className="flex items-start gap-2 rounded-xl border border-emerald-400/25 bg-emerald-400/8 px-3 py-2.5">
            <CheckCircle2 size={11} className="mt-0.5 shrink-0 text-emerald-300" />
            <p className="text-[10px] font-semibold leading-snug text-emerald-100">{successHighlight.message}</p>
          </div>
        )}
      </div>
    </section>
  );
}

/* ─────────────── Achievement Preview Card (Dashboard widget) ─────────────── */

function AchievementPreviewCard({ achievements, isArabic }) {
  const pct = Math.round((achievements.unlocked.length / 11) * 100);
  return (
    <section className="flex flex-col overflow-hidden rounded-3xl border border-violet-100 bg-gradient-to-br from-violet-50 via-indigo-50 to-violet-50 shadow-sm">
      <div className="flex items-center justify-between border-b border-violet-100 px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-md shadow-violet-100">
            <Medal size={15} className="text-white" />
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-violet-400">{isArabic ? 'الإنجازات' : 'Achievements'}</p>
            <h3 className="text-sm font-black text-violet-900">
              {achievements.unlocked.length}<span className="text-xs font-semibold text-violet-400">/11</span> {isArabic ? 'مفتوح' : 'unlocked'}
            </h3>
          </div>
        </div>
        <span className="text-lg font-black text-violet-600">{pct}%</span>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        {/* Overall progress bar */}
        <div className="h-2 overflow-hidden rounded-full bg-violet-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-400 to-indigo-500 transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Latest unlock */}
        {achievements.latestUnlocked ? (
          <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-white/80 px-3 py-2.5 backdrop-blur">
            <CheckCircle2 size={14} className="shrink-0 text-emerald-500" />
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-500">{isArabic ? 'آخر إنجاز' : 'Latest unlock'}</p>
              <p className="truncate text-xs font-black text-emerald-800">{achievements.latestUnlocked.label}</p>
            </div>
            <span className="shrink-0 rounded-full bg-violet-500 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-white shadow">NEW</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-xl bg-violet-100/60 px-3 py-2.5">
            <Lock size={12} className="shrink-0 text-violet-400" />
            <span className="text-[11px] font-semibold text-violet-500">
              {isArabic ? 'أكمل دروسًا لفتح الإنجازات' : 'Complete lessons to unlock achievements'}
            </span>
          </div>
        )}

        {achievements.locked.length > 0 && (
          <p className="text-center text-[10px] font-semibold text-violet-400">
            {achievements.locked.length} {isArabic ? 'إنجاز متبقٍّ للفتح' : 'more to unlock'}
          </p>
        )}
      </div>
    </section>
  );
}

/* ─────────────── Leaderboard Preview Card (Dashboard widget) ─────────────── */

function LeaderboardPreviewCard({ leaderboard, currentStudentId, currentRank, isArabic }) {
  const LB_MEDALS = ['🥇', '🥈', '🥉'];
  const preview = leaderboard.slice(0, 5);
  const meInTop = preview.some(e => e.studentId === currentStudentId);

  return (
    <section className="flex flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-md shadow-amber-100">
            <Trophy size={15} className="text-white" />
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">{isArabic ? 'لوحة الصدارة' : 'Leaderboard'}</p>
            <h3 className="text-sm font-black text-slate-900">{isArabic ? 'أفضل الطلاب' : 'Top Students'}</h3>
          </div>
        </div>
        <Link to="/student/social" className="flex items-center gap-1 text-[10px] font-bold text-violet-600 transition-colors hover:text-violet-800">
          {isArabic ? 'المنافسة' : 'Competition'} <ChevronRight size={11} />
        </Link>
      </div>

      <div className="flex-1 px-3 pb-3 pt-2">
        {preview.length === 0 ? (
          <EmptyState title={isArabic ? 'لا توجد بيانات بعد' : 'No data yet'} description="" icon={Trophy} />
        ) : (
          <div className="space-y-1">
            {preview.map((entry) => {
              const isMe = entry.studentId === currentStudentId;
              const medal = entry.rank <= 3 ? LB_MEDALS[entry.rank - 1] : null;
              return (
                <div
                  key={entry.studentId}
                  className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs transition ${
                    isMe ? 'border border-indigo-200 bg-gradient-to-r from-indigo-50 to-violet-50' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg font-black ${
                    entry.rank === 1 ? 'bg-amber-100 text-amber-600' :
                    entry.rank === 2 ? 'bg-slate-100 text-slate-600' :
                    entry.rank === 3 ? 'bg-orange-100 text-orange-600' : 'bg-slate-50 text-slate-400'
                  }`}>
                    {medal || <span className="text-[9px]">#{entry.rank}</span>}
                  </div>
                  <span className={`flex-1 truncate font-semibold ${isMe ? 'text-indigo-700' : 'text-slate-800'}`}>
                    {isMe ? (isArabic ? '⚡ أنت' : '⚡ You') : entry.name}
                  </span>
                  <div className="hidden items-center gap-1.5 sm:flex">
                    <span className="rounded-full border border-slate-100 bg-slate-50 px-1.5 py-0.5 text-[9px] font-bold text-slate-400">Lv.{entry.level}</span>
                    <span className="flex items-center gap-0.5 rounded-full border border-orange-100 bg-orange-50 px-1.5 py-0.5 text-[9px] font-bold text-orange-500">
                      <Flame size={8} />{entry.currentStreak}d
                    </span>
                  </div>
                  <span className={`shrink-0 text-xs font-black ${isMe ? 'text-indigo-600' : 'text-slate-600'}`}>
                    {entry.totalXp} <span className="text-[9px] opacity-50">XP</span>
                  </span>
                </div>
              );
            })}
            {currentStudentId && currentRank && !meInTop && (
              <>
                <p className="py-1 text-center text-[9px] font-bold tracking-widest text-slate-200">• • •</p>
                <div className="flex items-center gap-2.5 rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-violet-50 px-2.5 py-2 text-xs">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-[9px] font-black text-indigo-600">#{currentRank.rank}</div>
                  <span className="flex-1 truncate font-black text-indigo-700">{isArabic ? '⚡ أنت' : '⚡ You'}</span>
                  <span className="font-black text-indigo-600">{currentRank.totalXp} <span className="text-[9px] font-semibold opacity-50">XP</span></span>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

/* ─────────────── Dark Continue Learning Card ─────────────── */

function DarkContinueLearningCard({ course, actionHref, isArabic }) {
  const initial = (course.name || 'C').charAt(0).toUpperCase();
  const totalSegs = 8;
  const filledSegs = Math.max(0, Math.min(totalSegs, Math.round((course.progress / 100) * totalSegs)));

  return (
    <div
      className="relative overflow-hidden rounded-2xl text-white"
      style={{ background: 'rgba(25,35,55,0.65)', backdropFilter: 'blur(20px)', border: '1px solid rgba(99,102,241,0.4)', boxShadow: '0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)' }}
    >
      {/* Animated top accent line */}
      <div className="absolute left-0 right-0 top-0 h-[2px] overflow-hidden">
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, transparent, #6366F1, #8B5CF6, transparent)', animation: 'lnAccentSlide 3s linear infinite' }} />
      </div>
      {/* Right radial glow */}
      <div className="pointer-events-none absolute top-0 h-full w-[420px]" style={{ right: '-110px', background: 'radial-gradient(circle at center, rgba(99,102,241,0.14), transparent 60%)' }} />

      <div className="relative z-10 p-5">
        {/* Header row */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-teal-400" style={{ boxShadow: '0 0 10px #14B8A6', animation: 'livePulse 2s infinite' }} />
            <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-white/60">
              {isArabic ? 'متابعة التعلم' : 'Continue Learning'}
            </span>
          </div>
          {course.progress > 0 && (
            <span className="text-[10px] font-semibold text-white/30">{course.progress}%</span>
          )}
        </div>

        {/* Course row */}
        <div className="flex items-center gap-4">
          {/* 3D icon */}
          <div className="relative shrink-0">
            <div className="absolute rounded-2xl opacity-40" style={{ inset: '-3px', background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', filter: 'blur(10px)', animation: 'lnGradShift 3s ease-in-out infinite' }} />
            <div
              className="relative flex h-[76px] w-[76px] items-center justify-center overflow-hidden rounded-2xl text-3xl font-black"
              style={{ background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)', boxShadow: '0 8px 24px rgba(99,102,241,0.5), inset 0 2px 4px rgba(255,255,255,0.15)', transform: 'perspective(1000px) rotateY(-4deg)' }}
            >
              {course.cover ? <img src={course.cover} alt="" className="h-full w-full object-cover" /> : initial}
              {course.completedLessons != null && (
                <div
                  className="absolute -right-1.5 -top-1.5 flex h-[24px] w-[24px] items-center justify-center rounded-full text-[10px] font-black"
                  style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)', border: '2px solid rgba(12,11,35,0.9)', boxShadow: '0 3px 8px rgba(245,158,11,0.5)' }}
                >
                  {course.completedLessons}
                </div>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h3 className="truncate text-[17px] font-bold" style={{ letterSpacing: '-0.3px' }}>{course.name}</h3>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {course.totalLessons != null && (
                <span className="text-xs text-white/45">
                  {isArabic ? 'الدرس ' : 'Lesson '}<strong className="text-white/80">{course.completedLessons ?? 0}</strong>
                  {isArabic ? ' من ' : ' of '}<strong className="text-white/80">{course.totalLessons}</strong>
                </span>
              )}
              {course.progress > 0 && (
                <>
                  <span className="text-white/20">|</span>
                  <span className="inline-flex items-center gap-1.5 rounded-lg border px-2 py-0.5 text-[11px] font-semibold" style={{ background: 'rgba(99,102,241,0.2)', borderColor: 'rgba(99,102,241,0.38)', color: '#A78BFA' }}>
                    <span className="h-1.5 w-1.5 rounded-full bg-violet-400" style={{ boxShadow: '0 0 5px #8B5CF6' }} />
                    {course.progress}% {isArabic ? 'مكتمل' : 'complete'}
                  </span>
                </>
              )}
            </div>
            {/* Segmented bar */}
            <div className="mt-2.5 flex h-[9px] gap-[3px]">
              {Array.from({ length: totalSegs }, (_, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-[3px]"
                  style={i < filledSegs ? {
                    background: i < filledSegs - 1 ? 'linear-gradient(180deg, #6366F1, #4F46E5)' : 'linear-gradient(180deg, #8B5CF6, #7C3AED)',
                    boxShadow: '0 1px 6px rgba(99,102,241,0.45)',
                  } : { background: 'rgba(255,255,255,0.08)' }}
                />
              ))}
            </div>
          </div>

          {/* Resume button */}
          <Link
            to={actionHref}
            className="relative shrink-0 overflow-hidden rounded-[13px] px-5 py-3 text-sm font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', boxShadow: '0 6px 20px rgba(99,102,241,0.4), inset 0 1px 0 rgba(255,255,255,0.18)' }}
          >
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)', animation: 'lnShimmer 3s infinite' }} />
            </div>
            <span className="relative z-10">{isArabic ? 'متابعة' : 'Resume'}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ─────────────── Dashboard Header (dark glassmorphism) ─────────────── */

function _getGreeting(isArabic) {
  const h = new Date().getHours();
  if (isArabic) return 'مرحبًا';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function DashboardHeader({ profile, gamification, currentRank, achievements, avgMark, xpInLevel, isSchoolStudent, isArabic }) {
  const name = profile?.name || profile?.fullName || (isArabic ? 'طالب' : 'Student');
  const greeting = _getGreeting(isArabic);
  const level = gamification.level;
  const tierLabel = level >= 15 ? (isArabic ? 'خبير' : 'Expert')
    : level >= 10 ? (isArabic ? 'متقدم' : 'Advanced')
    : level >= 5  ? (isArabic ? 'متوسط' : 'Intermediate')
    :               (isArabic ? 'مبتدئ' : 'Beginner');
  const initials = (name.split(' ').slice(0, 2).map(w => w[0]).join('') || 'ST').toUpperCase();
  const filledSegs = Math.min(5, Math.round((xpInLevel / 100) * 5));
  const xpToNext = 100 - xpInLevel;
  const levelBase = (level - 1) * 100;

  return (
    <section
      className="relative overflow-hidden rounded-3xl text-white shadow-2xl"
      style={{ padding: '24px', background: 'linear-gradient(135deg, rgba(12,11,35,0.97) 0%, rgba(18,16,48,0.99) 100%)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      {/* Animated gradient glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #EC4899 100%)', opacity: 0.38, filter: 'blur(48px)', animation: 'lnGradShift 8s ease infinite' }}
      />
      {/* Subtle grid overlay */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ opacity: 0.025, backgroundImage: 'linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)', backgroundSize: '22px 22px' }}
      />

      <div className="relative z-10">
        {/* ── Top row ── */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Avatar with spinning conic ring */}
            <div className="relative shrink-0">
              <div
                className="absolute rounded-full"
                style={{ inset: '-5px', background: 'conic-gradient(from 180deg at 50% 50%, #14B8A6, #06B6D4, #6366F1, #8B5CF6, #14B8A6)', opacity: 0.85, animation: 'lnRotate 4s linear infinite' }}
              />
              <div
                className="relative flex h-[68px] w-[68px] items-center justify-center rounded-full text-xl font-black"
                style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', border: '2.5px solid rgba(255,255,255,0.9)', boxShadow: '0 8px 24px rgba(0,0,0,0.35), inset 0 2px 4px rgba(255,255,255,0.35)' }}
              >
                {initials}
              </div>
            </div>

            {/* Greeting + badges */}
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-white/35">
                {isArabic ? 'لوحة الطالب' : 'Student Dashboard'}
              </p>
              <h1
                className="mt-0.5 text-[22px] font-bold tracking-tight"
                style={{ background: 'linear-gradient(135deg, #ffffff, #d0d0d0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.4px' }}
              >
                {greeting}, {name}!
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-[5px] text-[11px] font-semibold" style={{ background: 'rgba(255,255,255,0.11)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.17)' }}>
                  <Zap size={10} className="text-amber-400" />
                  {isArabic ? `المستوى ${level}` : `Level ${level}`}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-[5px] text-[11px] font-semibold" style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)', boxShadow: '0 3px 10px rgba(245,158,11,0.35)', border: '1px solid rgba(255,255,255,0.18)' }}>
                  <Trophy size={10} className="text-white" />
                  {tierLabel}
                </span>
                {currentRank?.rank && (
                  <span className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-[5px] text-[11px] font-semibold" style={{ background: 'rgba(255,255,255,0.09)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.13)' }}>
                    <Medal size={10} className="text-violet-300" />
                    #{currentRank.rank}
                  </span>
                )}
                {gamification.currentStreak > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-xl px-2.5 py-[5px] text-[11px] font-semibold" style={{ background: 'rgba(255,255,255,0.09)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.13)' }}>
                    🔥 {gamification.currentStreak}d
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Progress % mini card */}
          <div className="shrink-0 rounded-2xl px-4 py-3 text-center" style={{ background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.09)', minWidth: '72px' }}>
            <div className="text-[22px] font-bold leading-none">
              {Math.round(avgMark)}<span className="text-sm font-normal text-white/35">%</span>
            </div>
            <div className="mt-0.5 text-[9px] font-semibold uppercase tracking-wider text-white/35">
              {isArabic ? 'التقدم' : 'Progress'}
            </div>
          </div>
        </div>

        {/* ── XP progress bar ── */}
        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-baseline gap-1.5">
              <span className="text-[17px] font-bold">{gamification.totalXp.toLocaleString()}</span>
              <span className="text-[12px] text-white/35">/ {(level * 100).toLocaleString()} XP</span>
            </div>
            <div className="flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-semibold" style={{ background: 'rgba(20,184,166,0.17)', border: '1px solid rgba(20,184,166,0.28)', color: '#5EEAD4' }}>
              <TrendingUp size={9} />
              +{xpToNext} {isArabic ? 'للتالي' : 'to go'}
            </div>
          </div>

          {/* 5-segment bar */}
          <div className="relative h-[15px] overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.3)' }}>
            <div className="absolute inset-[2px] flex gap-[3px]">
              {[0, 1, 2, 3, 4].map(i => (
                <div
                  key={i}
                  className="flex-1 rounded-[4px] transition-all duration-700"
                  style={i < filledSegs ? {
                    background: i % 2 === 0 ? 'linear-gradient(180deg, #14B8A6, #0D9488)' : 'linear-gradient(180deg, #06B6D4, #0891B2)',
                    boxShadow: '0 0 10px rgba(20,184,166,0.55)',
                  } : { background: 'rgba(255,255,255,0.07)' }}
                />
              ))}
            </div>
          </div>

          {/* Milestone labels */}
          <div className="mt-1.5 flex justify-between px-0.5">
            {[levelBase, levelBase + 25, levelBase + 50, levelBase + 75, level * 100].map((v, i) => (
              <span key={i} className="text-[10px]" style={{ color: i >= 3 ? 'rgba(255,255,255,0.42)' : 'rgba(255,255,255,0.22)' }}>
                {v.toLocaleString()}
              </span>
            ))}
          </div>
        </div>

        {/* Optional CTA */}
        {!isSchoolStudent && (
          <div className="mt-4 border-t border-white/[0.08] pt-3">
            <Link
              to="/dashboard/student/courses"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-300 transition hover:text-indigo-200"
            >
              {isArabic ? 'عرض جميع تخصصاتي' : 'View all my specializations'}
              <ArrowRight size={12} />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

/* ─────────────── Today's Tasks Card (compact daily checklist) ─────────────── */

function TodayTasksCard({ missions, adaptiveMissions, isArabic }) {
  const daily = adaptiveMissions?.daily ?? missions.daily;
  const weekly = adaptiveMissions?.weekly ?? missions.weekly;
  const list = daily.slice(0, 5);
  const done = list.filter(m => m.completed).length;
  const weeklyDone = weekly.filter(m => m.completed).length;

  return (
    <section className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
            <Target size={12} className="text-slate-500" />
          </div>
          <span className="text-sm font-semibold text-slate-800">
            {isArabic ? 'مهام اليوم' : "Today's tasks"}
            {adaptiveMissions && (
              <span className="ml-1.5 rounded-full bg-violet-50 border border-violet-100 px-1.5 py-0.5 text-[9px] font-bold text-violet-500">AI</span>
            )}
          </span>
        </div>
        <span className="text-xs font-semibold text-slate-400">{done}/{list.length}</span>
      </div>

      {/* Task list */}
      <div className="flex-1 divide-y divide-slate-50">
        {list.length === 0 ? (
          <p className="px-4 py-6 text-center text-xs text-slate-400">
            {isArabic ? 'لا توجد مهام لليوم' : 'No tasks for today'}
          </p>
        ) : (
          list.map((m) => (
            <div key={m.key} className={`flex items-center gap-3 px-4 py-2.5 transition ${m.completed ? 'opacity-50' : 'hover:bg-slate-50/60'}`}>
              <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition ${
                m.completed ? 'border-emerald-400 bg-emerald-400' : 'border-slate-300 bg-white'
              }`}>
                {m.completed && <CheckCircle2 size={10} className="text-white" strokeWidth={3} />}
              </div>
              <span className={`flex-1 min-w-0 truncate text-xs font-medium ${
                m.completed ? 'text-slate-400 line-through' : 'text-slate-700'
              }`}>
                {m.label}
              </span>
              <span className="shrink-0 text-[9px] font-bold text-slate-300">+{m.xp} XP</span>
            </div>
          ))
        )}
      </div>

      {/* Weekly footer peek */}
      {weekly.length > 0 && (
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5">
          <span className="text-[10px] font-medium text-slate-400">
            {isArabic ? `الأسبوعي: ${weeklyDone}/${weekly.length}` : `Weekly: ${weeklyDone}/${weekly.length} done`}
          </span>
          <div className="h-1 w-16 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-indigo-300 transition-all duration-700"
              style={{ width: weekly.length ? `${Math.round((weeklyDone / weekly.length) * 100)}%` : '0%' }}
            />
          </div>
        </div>
      )}
    </section>
  );
}

/* ─────────────── AI Insight Card (quiet, minimal) ─────────────── */

function AIInsightCard({ mentor, isArabic, engagedToday }) {
  const isStreakWarn = mentor.urgentWarning && STREAK_WARN_TYPES.has(mentor.urgentWarning.type);
  const rawAction = mentor.nextBestAction;
  const nextBestAction = engagedToday && rawAction?.icon === 'FLAME' ? ENGAGED_ACTION(isArabic) : rawAction;
  const successHighlight = engagedToday && isStreakWarn ? ENGAGED_SUCCESS(isArabic) : mentor.successHighlight;
  const urgCfg = URGENCY_CONFIG[nextBestAction?.urgency] || URGENCY_CONFIG.LOW;
  const ActionIcon = MENTOR_ACTION_ICONS[nextBestAction?.icon] || Target;
  const firstSentence = _splitNarrative(mentor.narrative)[0] || '';

  return (
    <section className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
        <div className="flex h-6 w-6 items-center justify-center rounded-lg border border-violet-100 bg-violet-50">
          <Brain size={12} className="text-violet-500" />
        </div>
        <span className="text-sm font-semibold text-slate-800">{isArabic ? 'رؤية ذكية' : 'AI insight'}</span>
        {mentor.aiPowered && (
          <span className="ml-auto rounded-full border border-violet-100 bg-violet-50 px-2 py-0.5 text-[9px] font-bold text-violet-500">
            Groq AI
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        {/* Narrative sentence */}
        {firstSentence && (
          <p className="text-xs font-medium leading-relaxed text-slate-600">
            {firstSentence}
          </p>
        )}

        {/* Next action */}
        {nextBestAction && (
          <div className={`flex items-start gap-2.5 rounded-xl border px-3 py-2.5 bg-gradient-to-r ${urgCfg.bg} ${urgCfg.border}`}>
            <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-lg ${urgCfg.badge}`}>
              <ActionIcon size={10} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-800 leading-snug">{nextBestAction.action}</p>
              {nextBestAction.reason && (
                <p className="mt-0.5 text-[10px] text-slate-500">{nextBestAction.reason}</p>
              )}
            </div>
          </div>
        )}

        {/* Success note */}
        {successHighlight && (
          <div className="flex items-start gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2">
            <CheckCircle2 size={12} className="mt-0.5 shrink-0 text-emerald-500" />
            <p className="text-[11px] font-medium text-emerald-700 leading-snug">{successHighlight.message}</p>
          </div>
        )}
      </div>
    </section>
  );
}

/* ─────────────── Dark AI Mentor Card ─────────────── */

function DarkAIMentorCard({ mentor, engagedToday, isArabic }) {
  const isStreakWarn = mentor.urgentWarning && STREAK_WARN_TYPES.has(mentor.urgentWarning.type);
  const successHighlight = engagedToday && isStreakWarn ? ENGAGED_SUCCESS(isArabic) : mentor.successHighlight;
  const narrative = mentor.narrative || '';

  return (
    <section
      className="rounded-2xl p-6"
      style={{ background: 'var(--ln-sec-bg)', border: '1px solid rgba(139,92,246,0.3)', borderLeft: '4px solid #8B5CF6' }}
    >
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <Brain size={22} className="shrink-0 text-violet-400" />
        <h2 className="text-base font-semibold" style={{ color: 'var(--ln-sec-text)' }}>{isArabic ? 'المرشد الذكي' : 'AI mentor'}</h2>
        <span
          className="ml-auto rounded-lg px-2.5 py-1 text-[11px] font-medium"
          style={{ background: 'rgba(34,197,94,0.15)', color: '#22C55E' }}
        >
          {isArabic ? 'رؤية اليوم' : "Today's insight"}
        </span>
      </div>
      {/* Narrative */}
      {narrative && (
        <p className="text-sm leading-relaxed" style={{ color: 'var(--ln-sec-text)' }}>
          {narrative}
        </p>
      )}
      {/* Success highlight */}
      {successHighlight && (
        <div className="mt-3 flex items-start gap-2 rounded-xl p-3" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)' }}>
          <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-emerald-400" />
          <p className="text-[12px] leading-snug" style={{ color: 'var(--ln-sec-subtext)' }}>{successHighlight.message}</p>
        </div>
      )}
    </section>
  );
}

/* ─────────────── Dark Today's Focus Card ─────────────── */

const _FOCUS_ICON_STYLES = [
  { bg: '#FEF3C7', color: '#D97706' },
  { bg: '#DBEAFE', color: '#2563EB' },
  { bg: '#D1FAE5', color: '#059669' },
  { bg: '#EDE9FE', color: '#7C3AED' },
  { bg: '#FEE2E2', color: '#DC2626' },
];

function _getFocusIcon(key = '') {
  const k = key.toLowerCase();
  if (k.includes('lesson'))    return BookOpen;
  if (k.includes('quiz'))      return CheckCircle2;
  if (k.includes('flash'))     return Layers;
  if (k.includes('chat'))      return MessageSquare;
  return Target;
}

function DarkTodaysFocusCard({ missions, adaptiveMissions, isArabic }) {
  const daily = adaptiveMissions?.daily ?? missions.daily;
  const list  = daily.slice(0, 5);

  return (
    <section
      className="rounded-2xl p-7"
      style={{ background: 'var(--ln-sec-bg)', border: '1px solid var(--ln-sec-border)' }}
    >
      <h2 className="mb-5 text-[17px] font-semibold" style={{ color: 'var(--ln-sec-text)' }}>{isArabic ? 'تركيز اليوم' : "Today's focus"}</h2>

      {list.length === 0 ? (
        <p className="py-6 text-center text-sm" style={{ color: 'rgba(167,139,250,0.6)' }}>
          {isArabic ? 'لا توجد مهام لليوم' : 'No tasks for today — enjoy your progress!'}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {list.map((m, i) => {
            const Icon = _getFocusIcon(m.key);
            const iconStyle = _FOCUS_ICON_STYLES[i % _FOCUS_ICON_STYLES.length];
            return (
              <div
                key={m.key}
                className="flex items-center gap-4 rounded-xl p-4 transition-all duration-200 hover:scale-[1.01]"
                style={{
                  background: 'var(--ln-item-bg)',
                  border: '1px solid var(--ln-item-border)',
                  opacity: m.completed ? 0.6 : 1,
                }}
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl" style={{ background: iconStyle.bg }}>
                  <Icon size={22} style={{ color: iconStyle.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-[15px] font-semibold ${m.completed ? 'line-through opacity-60' : ''}`} style={{ color: 'var(--ln-sec-text)' }}>
                    {m.label}
                  </p>
                </div>
                <span className="shrink-0 rounded-lg px-3 py-1.5 text-[13px] font-semibold" style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B' }}>
                  +{m.xp} XP
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

/* ─────────────── Dark This Week's Progress Card ─────────────── */

function DarkWeekProgressCard({ gamification, activityFeed, isArabic }) {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const weekFeed = activityFeed.filter(item => new Date(item.createdAt).getTime() > weekAgo);
  const lessonsThisWeek = weekFeed.filter(item => item.type === 'LESSON_COMPLETE').length;
  const xpThisWeek = weekFeed.reduce((sum, item) => sum + (item.xp || 0), 0);

  const stats = [
    { icon: '🔥', value: gamification.currentStreak, label: isArabic ? 'سلسلة أيام' : 'Day streak' },
    { icon: '📚', value: lessonsThisWeek, label: isArabic ? 'دروس مكتملة' : 'Lessons done' },
    { icon: '🏆', value: xpThisWeek, label: isArabic ? 'XP مكتسب' : 'XP earned' },
  ];

  return (
    <section
      className="rounded-2xl p-7"
      style={{ background: 'var(--ln-sec-bg)', border: '1px solid var(--ln-sec-border)' }}
    >
      <h2 className="mb-5 text-[17px] font-semibold" style={{ color: 'var(--ln-sec-text)' }}>{isArabic ? 'تقدم هذا الأسبوع' : "This week's progress"}</h2>
      <div className="grid grid-cols-3 gap-4">
        {stats.map((s, i) => (
          <div key={i} className="rounded-xl p-6 text-center" style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}>
            <div className="mb-3 text-3xl">{s.icon}</div>
            <div className="text-[32px] font-bold" style={{ color: 'var(--ln-sec-text)' }}>{s.value.toLocaleString()}</div>
            <div className="mt-1 text-[13px]" style={{ color: 'var(--ln-sec-subtext)' }}>{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─────────────── Dark Enrolled Tracks Section ─────────────── */

const _TRACK_GRADIENTS = [
  'linear-gradient(135deg, #6366F1, #8B5CF6)',
  'linear-gradient(135deg, #14B8A6, #0D9488)',
  'linear-gradient(135deg, #F59E0B, #D97706)',
  'linear-gradient(135deg, #EC4899, #DB2777)',
  'linear-gradient(135deg, #06B6D4, #0891B2)',
  'linear-gradient(135deg, #22C55E, #16A34A)',
];
const _TRACK_EMOJIS = ['🎓', '🤖', '📱', '💻', '🔬', '📊'];

function DarkEnrolledTracksSection({ courses, isArabic }) {
  return (
    <section
      className="rounded-2xl p-7"
      style={{ background: 'var(--ln-sec-bg)', border: '1px solid var(--ln-sec-border)' }}
    >
      <h2 className="mb-5 text-[17px] font-semibold" style={{ color: 'var(--ln-sec-text)' }}>{isArabic ? 'تخصصاتي' : 'My specializations'}</h2>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {courses.slice(0, 6).map((course, i) => (
          <Link
            key={course.id}
            to={course.firstSubjectId ? `/courses/${course.id}/subjects/${course.firstSubjectId}` : `/student/courses/${course.id}`}
            className="group block overflow-hidden rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
            style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.22)' }}
          >
            {/* Banner */}
            <div
              className="relative flex h-[140px] items-center justify-center overflow-hidden"
              style={{ background: _TRACK_GRADIENTS[i % _TRACK_GRADIENTS.length] }}
            >
              {course.cover ? (
                <img src={course.cover} alt="" className="h-full w-full object-cover opacity-40" />
              ) : (
                <span className="text-6xl opacity-30">{_TRACK_EMOJIS[i % _TRACK_EMOJIS.length]}</span>
              )}
              <div
                className="absolute left-3 top-3 rounded-lg px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-white"
                style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)' }}
              >
                {course.category || 'Track'}
              </div>
            </div>
            {/* Content */}
            <div className="p-5">
              <h3 className="mb-4 truncate text-[16px] font-semibold" style={{ color: 'var(--ln-sec-text)' }}>{course.name}</h3>
              <div
                className="flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all duration-200"
                style={{ border: '1px solid rgba(99,102,241,0.35)', color: 'rgba(167,139,250,0.9)' }}
              >
                {isArabic ? 'ابدأ الآن' : 'Start now'}
                <ArrowRight size={15} />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

/* ─────────────── Dark Activity Feed Section ─────────────── */

const _FEED_ICON_MAP = {
  DAILY_LOGIN:       { bg: 'linear-gradient(135deg, #06B6D4, #0891B2)', Icon: Sun },
  QUIZ_PASS:         { bg: 'linear-gradient(135deg, #22C55E, #16A34A)', Icon: CheckCircle2 },
  QUIZ_PERFECT:      { bg: 'linear-gradient(135deg, #14B8A6, #0D9488)', Icon: Star },
  LESSON_COMPLETE:   { bg: 'linear-gradient(135deg, #6366F1, #4F46E5)', Icon: BookOpen },
  FLASHCARD_SESSION: { bg: 'linear-gradient(135deg, #8B5CF6, #7C3AED)', Icon: Layers },
  MINDMAP_SESSION:   { bg: 'linear-gradient(135deg, #F59E0B, #D97706)', Icon: MapPin },
  CHATBOT_SESSION:   { bg: 'linear-gradient(135deg, #EC4899, #DB2777)', Icon: MessageSquare },
};
const _FEED_FALLBACK = { bg: 'linear-gradient(135deg, #14B8A6, #0D9488)', Icon: Zap };

function DarkActivityFeedSection({ feed, isArabic }) {
  const [activeFilter, setActiveFilter] = useState('all');
  const [pickerDate, setPickerDate] = useState('');

  const filteredFeed = useMemo(() => {
    if (pickerDate) {
      const [y, mo, d] = pickerDate.split('-').map(Number);
      const start = new Date(y, mo - 1, d).getTime();
      const end   = start + 86400000;
      return feed.filter(item => {
        const t = new Date(item.createdAt).getTime();
        return t >= start && t < end;
      });
    }
    const now = Date.now();
    return feed.filter(item => {
      const t = new Date(item.createdAt).getTime();
      if (activeFilter === 'today')     return t > now - 86400000;
      if (activeFilter === 'yesterday') {
        const todayStart = new Date(); todayStart.setHours(0,0,0,0);
        const e = todayStart.getTime();
        return t >= e - 86400000 && t < e;
      }
      if (activeFilter === 'week')  return t > now - 7 * 86400000;
      if (activeFilter === 'month') return t > now - 30 * 86400000;
      return true; // 'all'
    });
  }, [feed, activeFilter, pickerDate]);

  const filters = [
    { key: 'all',       label: isArabic ? 'الكل'        : 'All'        },
    { key: 'today',     label: isArabic ? 'اليوم'        : 'Today'      },
    { key: 'yesterday', label: isArabic ? 'أمس'          : 'Yesterday'  },
    { key: 'week',      label: isArabic ? 'هذا الأسبوع'  : 'This week'  },
    { key: 'month',     label: isArabic ? 'هذا الشهر'    : 'This month' },
  ];

  const timeAgoLocal = (iso) => {
    if (!iso) return '—';
    const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (m < 1)  return isArabic ? 'الآن'              : 'just now';
    if (m < 60) return isArabic ? `${m}د`             : `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return isArabic ? `${h}س`             : `${h}h ago`;
    return isArabic ? `${Math.floor(h / 24)}ي`        : `${Math.floor(h / 24)}d ago`;
  };

  const handleFilterClick = (key) => {
    setActiveFilter(key);
    setPickerDate('');
  };

  const handleDateChange = (e) => {
    setPickerDate(e.target.value);
    setActiveFilter('');
  };

  return (
    <section
      className="rounded-2xl p-7"
      style={{ background: 'var(--ln-sec-bg)', border: '1px solid var(--ln-sec-border)' }}
    >
      {/* Header */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[17px] font-semibold text-white">{isArabic ? 'النشاط الأخير' : 'Recent activity'}</h2>
        <div className="flex flex-wrap items-center gap-2">
          {filters.map(f => (
            <button
              key={f.key}
              type="button"
              onClick={() => handleFilterClick(f.key)}
              className="rounded-lg px-3 py-1.5 text-[13px] font-medium transition-all duration-150"
              style={activeFilter === f.key && !pickerDate ? {
                background: 'rgba(99,102,241,0.25)',
                border: '1px solid rgba(99,102,241,0.45)',
                color: '#A78BFA',
              } : {
                background: 'rgba(99,102,241,0.06)',
                border: '1px solid rgba(99,102,241,0.2)',
                color: 'rgba(167,139,250,0.7)',
              }}
            >
              {f.label}
            </button>
          ))}
          {/* Date picker */}
          <input
            type="date"
            value={pickerDate}
            onChange={handleDateChange}
            className="rounded-lg px-3 py-1.5 text-[13px] font-medium transition-all duration-150 outline-none"
            style={{
              background: pickerDate ? 'rgba(99,102,241,0.25)' : 'rgba(99,102,241,0.06)',
              border: pickerDate ? '1px solid rgba(99,102,241,0.45)' : '1px solid rgba(99,102,241,0.2)',
              color: pickerDate ? '#A78BFA' : 'rgba(167,139,250,0.7)',
              colorScheme: 'dark',
            }}
          />
        </div>
      </div>

      {/* Feed items */}
      {filteredFeed.length === 0 ? (
        <p className="py-6 text-center text-sm" style={{ color: 'var(--ln-sec-subtext)' }}>
          {isArabic ? 'لا يوجد نشاط في هذه الفترة' : 'No activity in this period'}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredFeed.slice(0, 20).map((item, i) => {
            const { bg, Icon } = _FEED_ICON_MAP[item.type] || _FEED_FALLBACK;
            return (
              <div
                key={i}
                className="flex items-center gap-4 rounded-xl p-4"
                style={{ background: 'var(--ln-item-bg)', border: '1px solid var(--ln-item-border)' }}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ background: bg }}>
                  <Icon size={17} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm" style={{ color: 'var(--ln-sec-text)' }}>{item.label}</p>
                  <p className="mt-0.5 text-[12px]" style={{ color: 'var(--ln-sec-subtext)' }}>{timeAgoLocal(item.createdAt)}</p>
                </div>
                {item.xp > 0 && (
                  <span className="shrink-0 rounded-lg px-2.5 py-1 text-[13px] font-semibold" style={{ background: 'rgba(34,197,94,0.15)', color: '#22C55E' }}>
                    +{item.xp}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
