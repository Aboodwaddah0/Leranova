import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Flame, TrendingUp, Trophy, Medal, Target } from 'lucide-react';
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

  useEffect(() => subscribeToProgress(() => setProgressTick((value) => value + 1)), []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        const [courseData, marksData, purchaseData, profileData, gamData, lbData, achData, missData] = await Promise.all([
          fetchStudentCourseCatalog(),
          fetchMyStudentMarks(),
          fetchMyStudentPurchases(),
          fetchStudentProfile(),
          fetchGamificationStats(),
          fetchGamificationLeaderboard(),
          fetchAchievements(),
          fetchMissions(),
        ]);

        if (cancelled) return;

        const safeCourses = normalizeCourses(Array.isArray(courseData) ? courseData : [], isArabic);
        const safeMarks = Array.isArray(marksData) ? marksData : [];
        const safePurchases = Array.isArray(purchaseData) ? purchaseData : [];
        const coursesWithProgress = await Promise.all(
          safeCourses.map(async (course) => {
            try {
              const subjects = await fetchCourseSubjects(course.id);
              const lessonsBySubject = await Promise.all(
                (subjects || []).map((subject) => fetchSubjectLessons(subject.id)),
              );

              const lessonIds = lessonsBySubject
                .flatMap((items) => (Array.isArray(items) ? items : []))
                .map((lesson) => Number(lesson?.id))
                .filter((id) => Number.isInteger(id) && id > 0);
              const allLessons = lessonsBySubject.flatMap((items) => (Array.isArray(items) ? items : []));
              const hasBackendCompletion = allLessons.some((lesson) => Object.prototype.hasOwnProperty.call(lesson || {}, 'isCompleted'));
              const backendCompleted = allLessons.filter((lesson) => Boolean(lesson?.isCompleted)).length;

              const lessonProgress = hasBackendCompletion
                ? {
                    total: lessonIds.length,
                    completed: backendCompleted,
                    percent: lessonIds.length ? Math.round((backendCompleted / lessonIds.length) * 100) : 0,
                  }
                : calculateProgressForLessons(lessonIds);

              return {
                ...course,
                progress: lessonProgress.percent,
                completedLessons: lessonProgress.completed,
                totalLessons: lessonProgress.total,
              };
            } catch {
              return course;
            }
          }),
        );

        setEnrolledCourses(coursesWithProgress);
        setMarks(safeMarks);
        setPurchases(safePurchases);
        setProfile(profileData || null);
        setGamification(gamData || { totalXp: 0, level: 1, currentStreak: 0, longestStreak: 0 });
        setLeaderboard(lbData?.leaderboard || []);
        setCurrentStudentId(lbData?.currentStudentId || null);
        setCurrentRank(lbData?.currentRank || null);
        setAchievements(achData || { unlocked: [], locked: [], latestUnlocked: null });
        setMissions(missData || { daily: [], weekly: [] });
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError?.message || (isArabic ? 'فشل تحميل لوحة الطالب.' : 'Failed to load dashboard.'));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [isArabic, progressTick]);

  if (!t?.student) {
    return <div className="m-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">{isArabic ? 'جاري تحميل الترجمة...' : 'Loading translations...'}</div>;
  }

  if (!Array.isArray(enrolledCourses)) {
    return <div className="m-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">{t.student.common.noData}</div>;
  }

  const activityByCourseId = useMemo(() => {
    const map = new Map();

    marks.forEach((mark) => {
      const courseId = Number(mark?.subject?.course?.id || mark?.subject?.Course_id || mark?.subject?.courseId);
      if (!Number.isFinite(courseId)) return;

      const rawDate = mark?.time || mark?.createdAt || mark?.updatedAt;
      const lastActivity = rawDate ? new Date(rawDate).getTime() : 0;
      const previous = map.get(courseId) || 0;
      map.set(courseId, Math.max(previous, Number.isFinite(lastActivity) ? lastActivity : 0));
    });

    return map;
  }, [marks]);

  const continueLearning = useMemo(() => {
    return enrolledCourses
      .map((course) => ({
        ...course,
        progress: Number(course?.progress || 0),
        lastActivity: activityByCourseId.get(Number(course.id)) || 0,
      }))
      .filter((course) => course.progress > 0)
      .sort((a, b) => {
        if (b.lastActivity !== a.lastActivity) {
          return b.lastActivity - a.lastActivity;
        }
        return b.progress - a.progress;
      });
  }, [enrolledCourses, activityByCourseId]);

  const continueIds = new Set(continueLearning.map((course) => Number(course.id)));

  const myCourses = useMemo(
    () => enrolledCourses.filter((course) => !continueIds.has(Number(course.id))),
    [enrolledCourses, continueIds],
  );

  const avgMark = summarizeAverageMark(marks);

  return (
    <StudentLayout>
      <div className="space-y-8">
        {loading && (
          <div className="flex items-center gap-3 rounded-2xl border border-indigo-100 bg-indigo-50 px-5 py-4">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-300 border-t-indigo-600" />
            <span className="text-sm font-medium text-indigo-700">
              {isArabic ? 'جاري تحميل البيانات...' : 'Loading your dashboard...'}
            </span>
          </div>
        )}

        {error ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
            {error}
          </div>
        ) : null}

        {/* XP Hero */}
        <section className="overflow-hidden rounded-[2rem] border border-white/70 bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-500 p-6 text-white shadow-[0_24px_65px_-35px_rgba(79,70,229,0.55)] md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-100">
                {isArabic ? 'لوحة الطالب' : 'Student dashboard'} ✨
              </p>
              <h2 className="mt-1 text-3xl font-black text-white">
                {isArabic ? 'مرحبًا' : 'Welcome back,'} {profile?.name || profile?.fullName || (isArabic ? 'طالب' : 'Student')}
              </h2>
              <p className="mt-1 text-sm text-indigo-100">
                {isArabic
                  ? `المستوى ${gamification.level} • #${currentRank?.rank ?? '—'} في مؤسستك`
                  : `Level ${gamification.level} • Rank #${currentRank?.rank ?? '—'} in your org`}
              </p>
            </div>
            <Link
              to="/dashboard/student/courses"
              className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:opacity-90"
            >
              {isArabic ? 'إدارة الكورسات' : 'Manage courses'}
              <ArrowRight size={14} />
            </Link>
          </div>

          <div className="mt-5">
            <div className="mb-1 flex items-center justify-between text-xs text-indigo-100">
              <span>{gamification.totalXp} XP total</span>
              <span>{gamification.totalXp % 100}/100 {isArabic ? 'للمستوى التالي' : 'to next level'}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-white/80"
                style={{ width: `${Math.min(100, gamification.totalXp % 100)}%` }}
              />
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <HeroStat label={isArabic ? 'الترتيب' : 'Rank'} value={currentRank ? `#${currentRank.rank}` : '—'} icon={Trophy} />
            <HeroStat label={isArabic ? 'السلسلة' : 'Streak'} value={`${gamification.currentStreak}d`} icon={Flame} />
            <HeroStat label={isArabic ? 'الإنجازات' : 'Achievements'} value={`${achievements.unlocked.length}/11`} icon={Medal} />
            <HeroStat label={isArabic ? 'متوسط الدرجات' : 'Avg mark'} value={`${Math.round(avgMark)}%`} icon={TrendingUp} />
          </div>
        </section>

        {/* Achievements + Missions */}
        <section className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-teal-50 p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-600">{isArabic ? 'الإنجازات' : 'Achievements'}</p>
                <p className="mt-1 text-lg font-black text-emerald-700">
                  {achievements.unlocked.length}/11
                  <span className="ml-1 text-sm font-semibold text-emerald-400">{isArabic ? 'مفتوحة' : 'unlocked'}</span>
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md">
                <Medal size={20} />
              </div>
            </div>
            {achievements.latestUnlocked && (
              <div className="mb-3 flex items-center gap-2 rounded-xl bg-emerald-100 px-3 py-2">
                <span className="text-xs font-black text-emerald-700">{achievements.latestUnlocked.label}</span>
                <span className="ml-auto rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-black text-white">NEW</span>
              </div>
            )}
            <div className="h-2 overflow-hidden rounded-full bg-emerald-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all"
                style={{ width: `${Math.round((achievements.unlocked.length / 11) * 100)}%` }}
              />
            </div>
            <p className="mt-1 text-[10px] text-emerald-400">
              {achievements.locked.length > 0
                ? `${achievements.locked.length} ${isArabic ? 'إنجاز متبقٍّ' : 'more to unlock'}`
                : (isArabic ? 'أتممت جميع الإنجازات!' : 'All achievements unlocked!')}
            </p>
          </div>

          <div className="rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50 to-fuchsia-50 p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-purple-600">{isArabic ? 'المهام' : 'Missions'}</p>
              <Target size={16} className="text-purple-500" />
            </div>
            <p className="mb-1 text-[10px] font-black uppercase tracking-wider text-purple-400">{isArabic ? 'يومية' : 'Daily'}</p>
            <div className="mb-3 space-y-2">
              {missions.daily.map(m => (
                <div key={m.key}>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className={`font-semibold ${m.completed ? 'text-purple-300 line-through' : 'text-purple-700'}`}>{m.label}</span>
                    <span className="font-black text-purple-500">{m.progress}/{m.goal} · +{m.xp}XP</span>
                  </div>
                  <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-purple-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-purple-500 to-fuchsia-500 transition-all"
                      style={{ width: `${Math.min(100, Math.round((m.progress / m.goal) * 100))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="mb-1 text-[10px] font-black uppercase tracking-wider text-purple-400">{isArabic ? 'أسبوعية' : 'Weekly'}</p>
            <div className="space-y-2">
              {missions.weekly.map(m => (
                <div key={m.key}>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className={`font-semibold ${m.completed ? 'text-purple-300 line-through' : 'text-purple-700'}`}>{m.label}</span>
                    <span className="font-black text-purple-500">{m.progress}/{m.goal} · +{m.xp}XP</span>
                  </div>
                  <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-purple-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-purple-500 to-fuchsia-500 transition-all"
                      style={{ width: `${Math.min(100, Math.round((m.progress / m.goal) * 100))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Full Leaderboard */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                🏆 {isArabic ? 'لوحة الصدارة' : 'Leaderboard'}
              </p>
              <h2 className="mt-1 text-xl font-black text-slate-900">
                {isArabic ? 'أفضل الطلاب في مؤسستك' : 'Top students in your org'}
              </h2>
            </div>
            <Trophy size={18} className="text-amber-400" />
          </div>

          {leaderboard.length === 0 ? (
            <EmptyState
              title={isArabic ? 'لا توجد بيانات بعد' : 'No leaderboard data yet'}
              description={isArabic ? 'أكمل درسًا أو اجتز اختبارًا لتظهر هنا.' : 'Complete a lesson or pass a quiz to appear here.'}
            />
          ) : (
            <div className="space-y-1.5">
              {leaderboard.map((entry) => {
                const isMe = entry.studentId === currentStudentId;
                return (
                  <div
                    key={entry.studentId}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${isMe ? 'border border-indigo-200 bg-indigo-50' : 'hover:bg-slate-50'}`}
                  >
                    <span className="w-7 shrink-0 text-center text-base font-black">
                      {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : <span className="text-xs text-slate-400">#{entry.rank}</span>}
                    </span>
                    <span className={`flex-1 truncate font-semibold ${isMe ? 'text-indigo-700' : 'text-slate-900'}`}>
                      {isMe ? (isArabic ? 'أنت' : 'You') : entry.name}
                    </span>
                    <span className="hidden text-xs text-slate-500 sm:block">Lv.{entry.level}</span>
                    <span className="flex items-center gap-0.5 text-xs text-orange-500">
                      <Flame size={11} />
                      {entry.currentStreak}
                    </span>
                    <span className="flex items-center gap-0.5 text-xs text-emerald-600">
                      <Medal size={11} />
                      {entry.achievementsCount}
                    </span>
                    <span className={`shrink-0 font-black ${isMe ? 'text-indigo-600' : 'text-slate-700'}`}>
                      {entry.totalXp} XP
                    </span>
                  </div>
                );
              })}

              {currentStudentId && currentRank && !leaderboard.some(e => e.studentId === currentStudentId) && (
                <>
                  <p className="py-1 text-center text-[10px] text-slate-300">···</p>
                  <div className="flex items-center gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2.5 text-sm">
                    <span className="w-7 shrink-0 text-center text-xs font-black text-slate-400">#{currentRank.rank}</span>
                    <span className="flex-1 truncate font-black text-indigo-700">{isArabic ? 'أنت' : 'You'}</span>
                    <span className="font-black text-indigo-600">{currentRank.totalXp} XP</span>
                  </div>
                </>
              )}
            </div>
          )}
        </section>

        {/* Continue Learning */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">▶️ Continue Learning</p>
              <h2 className="mt-2 text-xl font-black text-slate-900">{isArabic ? 'أكمل من حيث توقفت' : 'Resume where you left off'}</h2>
              <p className="mt-1 text-sm text-slate-600">
                {isArabic
                  ? 'هذه القائمة تعرض فقط الكورسات التي بدأت فيها (تقدم أكبر من 0%).'
                  : 'Only started courses appear here (progress above 0%).'}
              </p>
            </div>
          </div>

          {continueLearning.length ? (
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {continueLearning.slice(0, 6).map((course) => (
                <DashboardCourseCard key={course.id} course={course} actionLabel={isArabic ? 'متابعة' : 'Continue'} actionHref={`/student/courses/${course.id}`} showProgress />
              ))}
            </div>
          ) : (
            <EmptyState
              title={isArabic ? 'لا توجد كورسات بدأت بها بعد' : 'No started courses yet'}
              description={
                isArabic
                  ? 'عند بدء أول درس ستظهر هنا تلقائيًا ضمن قسم Continue Learning.'
                  : 'Once you start your first lesson, it will appear here automatically.'
              }
            />
          )}
        </section>

        {/* My Courses */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{isArabic ? '📚 كورساتي' : '📚 My Courses'}</p>
              <h2 className="mt-2 text-xl font-black text-slate-900">{isArabic ? 'كل الكورسات المسجلة غير المبدوءة' : 'Enrolled but not started'}</h2>
              <p className="mt-1 text-sm text-slate-600">
                {isArabic
                  ? 'لتفادي التكرار، الكورسات التي ظهرت في Continue Learning لا تُعرض هنا.'
                  : 'To avoid duplication, courses in Continue Learning are not shown again here.'}
              </p>
            </div>
            <BookOpen size={18} className="text-slate-400" />
          </div>

          {myCourses.length ? (
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {myCourses.slice(0, 6).map((course) => (
                <DashboardCourseCard key={course.id} course={course} actionLabel={isArabic ? 'ابدأ الآن' : 'Start now'} actionHref={`/student/courses/${course.id}`} />
              ))}
            </div>
          ) : (
            <EmptyState
              title={isArabic ? 'لا توجد كورسات في هذا القسم' : 'Nothing in this section'}
              description={
                isArabic
                  ? 'كل كورساتك الحالية تحت Continue Learning لأن لديها تقدم فعلي.'
                  : 'All your enrolled courses currently have progress and appear in Continue Learning.'
              }
            />
          )}
        </section>

      </div>
    </StudentLayout>
  );
}

function DashboardCourseCard({ course, actionLabel, actionHref, showProgress = false }) {
  const { isArabic } = useLanguage();
  const progress = Math.min(100, Math.max(0, Number(course?.progress || 0)));
  const isContinue = showProgress;

  return (
    <article className="flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-md">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          {isContinue ? (isArabic ? '🔥 قيد التقدم' : '🔥 In Progress') : '🧩'} {course?.category || (isArabic ? 'أكاديمية' : 'Academy')}
        </p>
        <h3 className="mt-2 line-clamp-2 text-lg font-bold text-slate-900">{course?.name || (isArabic ? 'كورس بدون عنوان' : 'Untitled course')}</h3>
        <p className="mt-2 line-clamp-3 text-sm text-slate-600">{course?.description || (isArabic ? 'تفاصيل الكورس متاحة في صفحة الكورس.' : 'Course details are available on the course page.')}</p>
      </div>

      <div className="mt-4 space-y-3">
        {showProgress ? (
          <>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
              <span>{isArabic ? 'التقدم 📌' : 'Progress 📌'}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-fuchsia-500" style={{ width: `${progress}%` }} />
            </div>
          </>
        ) : null}

        <Link to={actionHref} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
          {actionLabel}
          <ArrowRight size={14} />
        </Link>
      </div>
    </article>
  );
}

function HeroStat({ label, value, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-indigo-100">{label}</p>
      <div className="mt-1 flex items-center gap-2">
        <Icon size={14} className="text-white/70" />
        <p className="text-xl font-black text-white">{value}</p>
      </div>
    </div>
  );
}

function EmptyState({ title, description }) {
  return (
    <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
      <p className="font-semibold text-slate-800">{title}</p>
      <p className="mt-1">{description}</p>
    </div>
  );
}
