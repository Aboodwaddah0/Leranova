import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, BookOpen, Flame, TrendingUp, Trophy, Medal, Target,
  Zap, Star, Play, ChevronRight, CheckCircle2, Lock, GraduationCap,
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
} from '../../services/studentService';
import { useLanguage } from '../../utils/i18n';
import { calculateProgressForLessons, subscribeToProgress } from '../../utils/studentProgress';

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

  useEffect(() => subscribeToProgress(() => setProgressTick((v) => v + 1)), []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const [courseData, marksData, purchaseData, profileData, gamData, lbData, achData, missData] = await Promise.all([
          fetchStudentCourseCatalog(), fetchMyStudentMarks(), fetchMyStudentPurchases(),
          fetchStudentProfile(), fetchGamificationStats(), fetchGamificationLeaderboard(),
          fetchAchievements(), fetchMissions(),
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
      } catch (err) {
        if (!cancelled) setError(err?.message || (isArabic ? 'فشل تحميل لوحة الطالب.' : 'Failed to load dashboard.'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [isArabic, progressTick]);

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
  const avgMark = summarizeAverageMark(marks);
  const xpInLevel = gamification.totalXp % 100;

  return (
    <StudentLayout>
      <div className="space-y-6 pb-8">

        {/* Loading */}
        {loading && (
          <div className="flex items-center gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/80 px-5 py-3.5 backdrop-blur">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-300 border-t-indigo-600" />
            <span className="text-sm font-semibold text-indigo-700">{isArabic ? 'جاري تحميل البيانات...' : 'Loading your dashboard...'}</span>
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
            <Link
              to="/dashboard/student/courses"
              className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-indigo-700 shadow-lg transition hover:shadow-indigo-200 hover:scale-[1.02]"
            >
              {isArabic ? 'الكورسات' : 'My Courses'}
              <ArrowRight size={14} />
            </Link>
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

        {/* ─── Achievements + Missions ─── */}
        <section className="grid gap-5 sm:grid-cols-2">

          {/* Achievements */}
          <div className="group relative overflow-hidden rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 p-5 shadow-sm transition hover:shadow-md">
            <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-emerald-200/30 blur-2xl" />
            <div className="relative flex items-start justify-between gap-3">
              <div>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">
                  <Medal size={9} /> {isArabic ? 'الإنجازات' : 'Achievements'}
                </span>
                <p className="mt-2 text-3xl font-black text-emerald-700">{achievements.unlocked.length}<span className="text-base font-semibold text-emerald-400">/11</span></p>
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg shadow-emerald-200">
                <Medal size={24} className="text-white" />
              </div>
            </div>

            {achievements.latestUnlocked ? (
              <div className="relative mt-3 flex items-center gap-2.5 rounded-2xl border border-emerald-200 bg-white/70 px-3.5 py-2.5 backdrop-blur">
                <CheckCircle2 size={16} className="shrink-0 text-emerald-500" />
                <span className="flex-1 truncate text-xs font-bold text-emerald-800">{achievements.latestUnlocked.label}</span>
                <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white">NEW</span>
              </div>
            ) : (
              <div className="relative mt-3 flex items-center gap-2 rounded-2xl bg-emerald-100/60 px-3.5 py-2.5">
                <Lock size={12} className="text-emerald-400" />
                <span className="text-xs font-semibold text-emerald-500">{isArabic ? 'أكمل دروسًا لفتح الإنجازات' : 'Complete lessons to unlock achievements'}</span>
              </div>
            )}

            <div className="relative mt-4">
              <div className="mb-1.5 flex justify-between text-[10px] font-bold text-emerald-600">
                <span>{isArabic ? 'التقدم' : 'Progress'}</span>
                <span>{Math.round((achievements.unlocked.length / 11) * 100)}%</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-emerald-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 transition-all duration-700"
                  style={{ width: `${Math.round((achievements.unlocked.length / 11) * 100)}%` }}
                />
              </div>
              <p className="mt-1.5 text-[10px] font-semibold text-emerald-400">
                {achievements.locked.length > 0 ? `${achievements.locked.length} ${isArabic ? 'إنجاز متبقٍّ' : 'remaining'}` : (isArabic ? '🎉 أتممت جميع الإنجازات!' : '🎉 All unlocked!')}
              </p>
            </div>
          </div>

          {/* Missions */}
          <div className="group relative overflow-hidden rounded-3xl border border-violet-100 bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 p-5 shadow-sm transition hover:shadow-md">
            <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-violet-200/30 blur-2xl" />
            <div className="relative mb-4 flex items-center justify-between">
              <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-violet-700">
                <Target size={9} /> {isArabic ? 'المهام' : 'Missions'}
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-md">
                <Target size={14} className="text-white" />
              </div>
            </div>

            <div className="relative space-y-4">
              <MissionGroup label={isArabic ? 'يومية' : 'Daily'} missions={missions.daily} />
              <MissionGroup label={isArabic ? 'أسبوعية' : 'Weekly'} missions={missions.weekly} />
            </div>
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
                <CourseCard key={course.id} course={course} index={i} actionLabel={isArabic ? 'متابعة' : 'Continue'} actionHref={`/student/courses/${course.id}`} variant="continue" />
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
            badge={isArabic ? 'كورساتي' : 'My Courses'}
            title={isArabic ? 'الكورسات المسجلة' : 'Enrolled courses'}
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

function MissionGroup({ label, missions }) {
  if (!missions.length) return null;
  return (
    <div>
      <p className="mb-2 text-[9px] font-black uppercase tracking-[0.2em] text-violet-500">{label}</p>
      <div className="space-y-2.5">
        {missions.map((m) => (
          <div key={m.key} className={`rounded-xl border px-3 py-2.5 transition ${m.completed ? 'border-emerald-100 bg-emerald-50/60' : 'border-violet-100 bg-white/60 backdrop-blur'}`}>
            <div className="flex items-center justify-between gap-2">
              <span className={`flex-1 truncate text-[11px] font-bold ${m.completed ? 'text-emerald-600 line-through' : 'text-violet-800'}`}>
                {m.completed && <CheckCircle2 size={10} className="mr-1 inline text-emerald-500" />}
                {m.label}
              </span>
              <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-black ${m.completed ? 'bg-emerald-100 text-emerald-600' : 'bg-violet-100 text-violet-600'}`}>
                +{m.xp}XP
              </span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-violet-100">
              <div
                className={`h-full rounded-full transition-all duration-500 ${m.completed ? 'bg-gradient-to-r from-emerald-400 to-teal-400' : 'bg-gradient-to-r from-violet-500 to-fuchsia-500'}`}
                style={{ width: `${Math.min(100, Math.round((m.progress / m.goal) * 100))}%` }}
              />
            </div>
            <p className="mt-0.5 text-[9px] font-semibold text-violet-400">{m.progress}/{m.goal}</p>
          </div>
        ))}
      </div>
    </div>
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

function CourseCard({ course, index, actionLabel, actionHref, variant }) {
  const { isArabic } = useLanguage();
  const progress = Math.min(100, Math.max(0, Number(course?.progress || 0)));
  const gradient = COVER_GRADIENTS[index % COVER_GRADIENTS.length];
  const isContinue = variant === 'continue';

  const circumference = 2 * Math.PI * 18;
  const strokeDash = (progress / 100) * circumference;

  return (
    <article className="group flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-[0_16px_40px_-12px_rgba(99,51,211,0.18)]">
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
    <div className="flex flex-col items-center rounded-3xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-10 text-center">
      {Icon && (
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
          <Icon size={20} className="text-slate-400" />
        </div>
      )}
      <p className="text-sm font-bold text-slate-700">{title}</p>
      <p className="mt-1 max-w-xs text-xs text-slate-400">{description}</p>
    </div>
  );
}
