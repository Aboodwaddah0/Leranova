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
              return { ...course, progress: lp.percent, completedLessons: lp.completed, totalLessons: lp.total };
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
      `}</style>

      {/* ── Global overlays ── */}
      {levelUpModal && <LevelUpOverlay level={levelUpModal} onClose={() => setLevelUpModal(null)} isArabic={isArabic} />}
      {achievementModal && <AchievementModal achievement={achievementModal} onClose={() => setAchievementModal(null)} isArabic={isArabic} />}
      <FloatingXPLayer items={floatingXps} />

      <div className="space-y-6 pb-8 ln-page-enter">

        {/* Streak warning banner */}
        {showStreakBanner && (
          <StreakBanner streak={gamification.currentStreak} onDismiss={dismissStreakBanner} isArabic={isArabic} />
        )}

        {/* ── Skeleton loading state (first load only) ── */}
        {loading && enrolledCourses.length === 0 && (
          <div className="space-y-4">
            <div className="ln-skeleton h-64 rounded-[2rem]" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[...Array(4)].map((_, i) => <div key={i} className="ln-skeleton h-20 rounded-2xl" />)}
            </div>
            <div className="ln-skeleton h-40 rounded-3xl" />
            <div className="grid gap-3 md:grid-cols-2">
              <div className="ln-skeleton h-56 rounded-3xl" />
              <div className="ln-skeleton h-56 rounded-3xl" />
            </div>
          </div>
        )}

        {/* Inline loading indicator (subsequent loads / refreshes) */}
        {loading && enrolledCourses.length > 0 && (
          <div className="flex items-center gap-2.5 rounded-2xl border border-indigo-100 bg-indigo-50/70 px-4 py-3 backdrop-blur">
            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-indigo-300 border-t-indigo-600 shrink-0" />
            <span className="text-sm font-medium text-indigo-600">{isArabic ? 'جاري التحديث...' : 'Refreshing...'}</span>
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-800">{error}</div>
        )}

        {/* ─── XP Hero ─── */}
        <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-6 text-white shadow-[0_32px_80px_-20px_rgba(99,51,211,0.5)] md:p-8">
          {/* decorative orbs */}
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/5 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-12 left-1/3 h-48 w-48 rounded-full bg-fuchsia-400/10 blur-2xl" />

          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-100 backdrop-blur">
                <Star size={9} className="fill-amber-300 text-amber-300" />
                {isArabic ? 'لوحة الطالب' : 'Student Dashboard'}
              </div>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white">
                {isArabic ? 'مرحبًا،' : 'Hey,'} {profile?.name || profile?.fullName || (isArabic ? 'طالب' : 'Student')} 👋
              </h2>
              <p className="mt-1 text-sm font-medium text-indigo-200">
                {isArabic
                  ? `المستوى ${gamification.level} · الترتيب #${currentRank?.rank ?? '—'} في مؤسستك`
                  : `Level ${gamification.level} · Rank #${currentRank?.rank ?? '—'} in your org`}
              </p>
            </div>
            {!isSchoolStudent && (
              <Link
                to="/dashboard/student/courses"
                className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-indigo-700 shadow-lg transition hover:shadow-indigo-200 hover:scale-[1.02]"
              >
                {isArabic ? 'تخصصاتي' : 'My Specializations'}
                <ArrowRight size={14} />
              </Link>
            )}
          </div>

          {/* XP bar */}
          <div className="relative mt-6">
            <div className="mb-2 flex items-center justify-between text-xs font-semibold text-indigo-200">
              <span className="flex items-center gap-1"><Zap size={11} className="text-amber-300" />{gamification.totalXp} XP</span>
              <span>{xpInLevel}/100 {isArabic ? 'للمستوى التالي' : 'to next level'}</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-white/15 shadow-inner">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-300 via-white to-white/80 shadow-[0_0_12px_rgba(255,255,255,0.4)] transition-all duration-700"
                style={{ width: `${Math.min(100, xpInLevel)}%` }}
              />
            </div>
          </div>

          {/* 4 stat chips */}
          <div className="relative mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <HeroStat label={isArabic ? 'الترتيب' : 'Rank'} value={currentRank ? `#${currentRank.rank}` : '—'} icon={Trophy} iconCls="text-amber-300" bg="bg-amber-400/15" />
            <HeroStat label={isArabic ? 'السلسلة' : 'Streak'} value={`${gamification.currentStreak}d`} icon={Flame} iconCls="text-orange-300" bg="bg-orange-400/15" />
            <HeroStat label={isArabic ? 'الإنجازات' : 'Achievements'} value={`${achievements.unlocked.length}/11`} icon={Medal} iconCls="text-emerald-300" bg="bg-emerald-400/15" />
            <HeroStat label={isArabic ? 'متوسط الدرجات' : 'Avg Mark'} value={`${Math.round(avgMark)}%`} icon={TrendingUp} iconCls="text-cyan-300" bg="bg-cyan-400/15" />
          </div>
        </section>

        {/* ─── AI Mentor ─── */}
        {aiMentor && <AIMentorSection mentor={aiMentor} isArabic={isArabic} engagedToday={engagedToday} />}

        {/* ─── Achievements ─── */}
        <section className="relative overflow-hidden rounded-3xl border border-violet-100 bg-gradient-to-br from-violet-50 via-indigo-50 to-violet-50 p-6 shadow-sm">
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-violet-200/25 blur-2xl" />
          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-violet-700">
                <Medal size={9} /> {isArabic ? 'الإنجازات' : 'Achievements'}
              </span>
              <p className="mt-2 text-4xl font-black text-violet-700">
                {achievements.unlocked.length}
                <span className="text-lg font-semibold text-violet-400">/11</span>
              </p>
              <p className="text-sm font-semibold text-violet-500">
                {achievements.locked.length > 0
                  ? `${achievements.locked.length} ${isArabic ? 'إنجاز متبقٍّ' : 'more to unlock'}`
                  : (isArabic ? '🎉 أتممت جميع الإنجازات!' : '🎉 All achievements unlocked!')}
              </p>
            </div>
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-200">
              <Medal size={28} className="text-white" />
            </div>
          </div>

          {achievements.latestUnlocked ? (
            <div className="relative mt-4 flex items-center gap-2.5 rounded-2xl border border-emerald-200 bg-white/70 px-4 py-3 backdrop-blur">
              <CheckCircle2 size={16} className="shrink-0 text-emerald-500" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">{isArabic ? 'آخر إنجاز' : 'Latest unlock'}</p>
                <p className="truncate text-sm font-black text-emerald-800">{achievements.latestUnlocked.label}</p>
              </div>
              <span className="rounded-full bg-violet-500 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-white shadow">{isArabic ? 'جديد' : 'NEW'}</span>
            </div>
          ) : (
            <div className="relative mt-4 flex items-center gap-2 rounded-2xl bg-violet-100/60 px-4 py-3">
              <Lock size={13} className="shrink-0 text-violet-400" />
              <span className="text-xs font-semibold text-violet-500">{isArabic ? 'أكمل دروسًا لفتح الإنجازات' : 'Complete lessons to unlock achievements'}</span>
            </div>
          )}

          <div className="relative mt-5">
            <div className="mb-1.5 flex justify-between text-[10px] font-bold text-violet-600">
              <span>{isArabic ? 'إجمالي التقدم' : 'Overall progress'}</span>
              <span>{Math.round((achievements.unlocked.length / 11) * 100)}%</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-violet-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-400 to-indigo-500 transition-all duration-700"
                style={{ width: `${Math.round((achievements.unlocked.length / 11) * 100)}%` }}
              />
            </div>
          </div>
        </section>

        {/* ─── AI Learning Profile ─── */}
        {learningProfile && <AIProfileSection profile={learningProfile} isArabic={isArabic} />}

        {/* ─── Adaptive Insights ─── */}
        {(adaptiveInsights || learningProfile) && (
          <AdaptiveInsightsSection
            insights={adaptiveInsights}
            profile={learningProfile}
            isArabic={isArabic}
          />
        )}

        {/* ─── Missions ─── */}
        <section className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
          {/* Header */}
          <div className="border-b border-slate-100 px-6 py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 shadow-md shadow-violet-200">
                  <Target size={16} className="text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                    {isArabic ? 'المهام' : 'Missions'}
                    {adaptiveMissions && <span className="ml-1.5 text-violet-500">· AI</span>}
                  </p>
                  <h2 className="text-base font-black leading-tight text-slate-900">
                    {isArabic ? 'مهامك اليومية والأسبوعية' : 'Daily & Weekly Goals'}
                  </h2>
                </div>
              </div>
              {adaptiveMissions && <TierBadge tier={adaptiveMissions.tier} isArabic={isArabic} />}
            </div>
            {adaptiveMissions && (
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-violet-100 bg-violet-50/70 px-3 py-1.5">
                <Sparkles size={11} className="shrink-0 text-violet-500" />
                <p className="text-[10px] font-semibold text-violet-600">
                  {isArabic
                    ? `مخصص لمستواك · تفاعل ${adaptiveMissions.engagementScore}/100`
                    : `Personalized for your level · Engagement ${adaptiveMissions.engagementScore}/100`}
                </p>
              </div>
            )}
          </div>

          {/* Two-panel layout */}
          <div className="grid divide-y divide-slate-100 md:grid-cols-2 md:divide-x md:divide-y-0">
            {/* Daily panel */}
            {(() => {
              const list = adaptiveMissions?.daily ?? missions.daily;
              const done = list.filter(m => m.completed).length;
              return (
                <div className="p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 shadow-sm">
                      <Sun size={11} className="text-white" />
                    </div>
                    <span className="text-xs font-black text-slate-700">{isArabic ? 'يومي' : 'Daily'}</span>
                    <div className="ml-auto flex items-center gap-1.5">
                      <div className="h-1.5 w-14 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-400 transition-all duration-700"
                          style={{ width: list.length ? `${Math.round((done / list.length) * 100)}%` : '0%' }} />
                      </div>
                      <span className="text-[10px] font-bold text-amber-600">{done}/{list.length}</span>
                    </div>
                  </div>
                  {list.length === 0
                    ? <EmptyState title={isArabic ? 'لا توجد مهام' : 'No missions'} description="" icon={Sun} />
                    : <div className="space-y-2">{list.map(m => <MissionRow key={m.key} mission={m} period="daily" />)}</div>
                  }
                </div>
              );
            })()}

            {/* Weekly panel */}
            {(() => {
              const list = adaptiveMissions?.weekly ?? missions.weekly;
              const done = list.filter(m => m.completed).length;
              return (
                <div className="p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 shadow-sm">
                      <CalendarDays size={11} className="text-white" />
                    </div>
                    <span className="text-xs font-black text-slate-700">{isArabic ? 'أسبوعي' : 'Weekly'}</span>
                    <div className="ml-auto flex items-center gap-1.5">
                      <div className="h-1.5 w-14 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-violet-500 transition-all duration-700"
                          style={{ width: list.length ? `${Math.round((done / list.length) * 100)}%` : '0%' }} />
                      </div>
                      <span className="text-[10px] font-bold text-indigo-600">{done}/{list.length}</span>
                    </div>
                  </div>
                  {list.length === 0
                    ? <EmptyState title={isArabic ? 'لا توجد مهام' : 'No missions'} description="" icon={CalendarDays} />
                    : <div className="space-y-2">{list.map(m => <MissionRow key={m.key} mission={m} period="weekly" />)}</div>
                  }
                </div>
              );
            })()}
          </div>
        </section>

        {/* ─── Leaderboard ─── */}
        <section className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-700">
                  <Trophy size={9} className="text-amber-500" />
                  {isArabic ? 'لوحة الصدارة' : 'Leaderboard'}
                </div>
                <h2 className="mt-1.5 text-xl font-black text-slate-900">{isArabic ? 'أفضل الطلاب في مؤسستك' : 'Top students in your org'}</h2>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-md shadow-amber-200">
                <Trophy size={18} className="text-white" />
              </div>
            </div>
          </div>

          {leaderboard.length === 0 ? (
            <div className="px-6 py-6">
              <EmptyState
                title={isArabic ? 'لا توجد بيانات بعد' : 'No leaderboard data yet'}
                description={isArabic ? 'أكمل درسًا أو اجتز اختبارًا لتظهر هنا.' : 'Complete a lesson or pass a quiz to appear here.'}
                icon={Trophy}
              />
            </div>
          ) : (
            <div className="divide-y divide-slate-50 px-4 pb-4 pt-2">
              {leaderboard.map((entry) => {
                const isMe = entry.studentId === currentStudentId;
                const medal = entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : null;
                return (
                  <div
                    key={entry.studentId}
                    className={`flex items-center gap-3 rounded-2xl px-3 py-3 text-sm transition ${
                      isMe
                        ? 'my-1 border border-indigo-200 bg-gradient-to-r from-indigo-50 to-violet-50 shadow-sm'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-sm font-black ${
                      entry.rank === 1 ? 'bg-amber-100 text-amber-600' :
                      entry.rank === 2 ? 'bg-slate-100 text-slate-600' :
                      entry.rank === 3 ? 'bg-orange-100 text-orange-600' :
                      'bg-slate-50 text-slate-400'
                    }`}>
                      {medal || <span className="text-xs">#{entry.rank}</span>}
                    </div>

                    <span className={`flex-1 truncate font-bold ${isMe ? 'text-indigo-700' : 'text-slate-900'}`}>
                      {isMe ? (isArabic ? '⚡ أنت' : '⚡ You') : entry.name}
                    </span>

                    <div className="hidden items-center gap-2 sm:flex">
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-500">Lv.{entry.level}</span>
                      <span className="flex items-center gap-0.5 rounded-full border border-orange-100 bg-orange-50 px-2 py-0.5 text-[10px] font-bold text-orange-500">
                        <Flame size={9} />{entry.currentStreak}d
                      </span>
                      <span className="flex items-center gap-0.5 rounded-full border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                        <Medal size={9} />{entry.achievementsCount}
                      </span>
                    </div>

                    <span className={`shrink-0 text-sm font-black ${isMe ? 'text-indigo-600' : 'text-slate-700'}`}>
                      {entry.totalXp} <span className="text-[10px] font-semibold opacity-60">XP</span>
                    </span>
                  </div>
                );
              })}

              {currentStudentId && currentRank && !leaderboard.some((e) => e.studentId === currentStudentId) && (
                <>
                  <p className="py-1.5 text-center text-xs font-bold tracking-widest text-slate-300">• • •</p>
                  <div className="flex items-center gap-3 rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-violet-50 px-3 py-3 text-sm shadow-sm">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-xs font-black text-indigo-600">#{currentRank.rank}</div>
                    <span className="flex-1 truncate font-black text-indigo-700">{isArabic ? '⚡ أنت' : '⚡ You'}</span>
                    <span className="font-black text-indigo-600">{currentRank.totalXp} <span className="text-[10px] font-semibold opacity-60">XP</span></span>
                  </div>
                </>
              )}
            </div>
          )}
        </section>

        {/* ─── Activity Feed ─── */}
        {activityFeed.length > 0 && <ActivityFeedSection feed={activityFeed} isArabic={isArabic} />}

        {/* ─── Continue Learning ─── */}
        <section>
          <SectionHeader
            icon={Play}
            iconBg="from-indigo-500 to-violet-500"
            badge={isArabic ? 'متابعة التعلم' : 'Continue Learning'}
            title={isArabic ? 'أكمل من حيث توقفت' : 'Resume where you left off'}
            count={continueLearning.length}
          />
          {continueLearning.length ? (
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {continueLearning.slice(0, 6).map((course, i) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  index={i}
                  actionLabel={isArabic ? 'متابعة' : 'Continue'}
                  actionHref={`/student/courses/${course.id}`}
                  variant="continue"
                  priority={adaptiveInsights?.nextLesson && i === 0}
                  priorityLabel={adaptiveInsights?.nextLesson?.subjectName}
                />
              ))}
            </div>
          ) : (
            <div className="mt-4">
              <EmptyState
                title={isArabic ? 'لا توجد كورسات بدأت بها بعد' : 'No started courses yet'}
                description={isArabic ? 'عند بدء أول درس ستظهر هنا تلقائيًا.' : 'Once you start your first lesson, it will appear here automatically.'}
                icon={Play}
              />
            </div>
          )}
        </section>

        {/* ─── My Courses ─── */}
        <section>
          <SectionHeader
            icon={BookOpen}
            iconBg="from-violet-500 to-fuchsia-500"
            badge={isArabic ? 'تخصصاتي' : 'My Specializations'}
            title={isArabic ? 'المسارات المسجلة' : 'Enrolled tracks'}
            count={myCourses.length}
          />
          {myCourses.length ? (
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {myCourses.slice(0, 6).map((course, i) => (
                <CourseCard key={course.id} course={course} index={i} actionLabel={isArabic ? 'ابدأ الآن' : 'Start now'} actionHref={`/student/courses/${course.id}`} variant="start" />
              ))}
            </div>
          ) : (
            <div className="mt-4">
              <EmptyState
                title={isArabic ? 'لا توجد كورسات هنا' : 'Nothing here yet'}
                description={isArabic ? 'كل كورساتك تحت Continue Learning.' : 'All your enrolled courses have progress and appear above.'}
                icon={GraduationCap}
              />
            </div>
          )}
        </section>

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
