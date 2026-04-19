import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BarChart3, BookOpen, CalendarDays, Flame, PlusCircle, Sparkles, TrendingUp } from 'lucide-react';
import StudentLayout from '../../components/student/StudentLayout';
import {
  fetchMyStudentMarks,
  fetchMyStudentPurchases,
  fetchCourseSubjects,
  fetchSubjectLessons,
  fetchStudentCourseCatalog,
  fetchStudentProfile,
} from '../../services/studentService';
import api from '../../utils/api';
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

const buildWeeklyActivity = (marks = []) => {
  const formatter = new Intl.DateTimeFormat('en-US', { weekday: 'short' });
  const buckets = [];
  const now = new Date();

  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date(now);
    date.setHours(0, 0, 0, 0);
    date.setDate(now.getDate() - offset);
    buckets.push({
      key: date.toISOString().slice(0, 10),
      label: formatter.format(date).toUpperCase(),
      count: 0,
    });
  }

  const byDate = new Map(buckets.map((item) => [item.key, item]));

  marks.forEach((mark) => {
    const time = new Date(mark?.time || mark?.createdAt || mark?.updatedAt || '');
    if (Number.isNaN(time.getTime())) return;
    const key = time.toISOString().slice(0, 10);
    const bucket = byDate.get(key);
    if (bucket) bucket.count += 1;
  });

  return buckets;
};

const stableFallbackScore = (id) => ((Number(id) * 9301 + 49297) % 233280) / 233280;

const summarizeAverageMark = (marks = []) => {
  if (!marks.length) return 0;
  const total = marks.reduce((sum, mark) => {
    const numbers = Number(mark?.Numbers || 0);
    const outOf = Math.max(1, Number(mark?.OutOf || 0));
    return sum + (numbers / outOf) * 100;
  }, 0);
  return total / marks.length;
};

const buildWeeklyChart = (weeklyActivity = []) => {
  const values = weeklyActivity.map((item) => Number(item.count || 0));
  const max = Math.max(1, ...values);
  const width = 320;
  const height = 120;
  const points = values.map((value, index) => {
    const x = values.length > 1 ? (index / (values.length - 1)) * width : width / 2;
    const y = height - (value / max) * (height - 12) - 6;
    return { x, y, value };
  });

  if (!points.length) {
    return { linePath: '', areaPath: '', points: [], max };
  }

  const linePath = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(' ');

  const areaPath = [
    `M 0 ${height}`,
    `L ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`,
    ...points.slice(1).map((point) => `L ${point.x.toFixed(2)} ${point.y.toFixed(2)}`),
    `L ${width} ${height}`,
    'Z',
  ].join(' ');

  return { linePath, areaPath, points, max };
};

export default function StudentDashboardPage() {
  const { t, isArabic } = useLanguage();
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [catalogCourses, setCatalogCourses] = useState([]);
  const [marks, setMarks] = useState([]);
  const [profile, setProfile] = useState(null);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [progressTick, setProgressTick] = useState(0);

  useEffect(() => subscribeToProgress(() => setProgressTick((value) => value + 1)), []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        const [courseData, marksData, purchaseData, profileData, catalogResponse] = await Promise.all([
          fetchStudentCourseCatalog(),
          fetchMyStudentMarks(),
          fetchMyStudentPurchases(),
          fetchStudentProfile(),
          api.get('/courses').catch(() => null),
        ]);

        if (cancelled) return;

        const safeCourses = normalizeCourses(Array.isArray(courseData) ? courseData : [], isArabic);
        const safeMarks = Array.isArray(marksData) ? marksData : [];
        const safePurchases = Array.isArray(purchaseData) ? purchaseData : [];
        const rawCatalog = catalogResponse?.data?.data || catalogResponse?.data || [];
        const safeCatalog = normalizeCourses(Array.isArray(rawCatalog) ? rawCatalog : [], isArabic);

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

              const lessonProgress = calculateProgressForLessons(lessonIds);

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
        setCatalogCourses(safeCatalog);
        setMarks(safeMarks);
        setPurchases(safePurchases);
        setProfile(profileData || null);
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

  const enrolledCourseIds = new Set(enrolledCourses.map((course) => Number(course.id)).filter(Number.isFinite));

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

  const recommendedCourses = useMemo(() => {
    if (!catalogCourses.length) return [];

    const preferredCategories = new Map();
    enrolledCourses.forEach((course) => {
      const category = String(course?.category || '').trim().toLowerCase();
      if (!category) return;
      preferredCategories.set(category, (preferredCategories.get(category) || 0) + 1);
    });

    return catalogCourses
      .filter((course) => !enrolledCourseIds.has(Number(course.id)))
      .sort((a, b) => {
        const aWeight = preferredCategories.get(String(a?.category || '').toLowerCase()) || 0;
        const bWeight = preferredCategories.get(String(b?.category || '').toLowerCase()) || 0;

        if (bWeight !== aWeight) return bWeight - aWeight;
        return stableFallbackScore(a.id) - stableFallbackScore(b.id);
      })
      .slice(0, 6);
  }, [catalogCourses, enrolledCourseIds, enrolledCourses]);

  const weeklyActivity = useMemo(() => buildWeeklyActivity(marks), [marks]);
  const weeklyChart = useMemo(() => buildWeeklyChart(weeklyActivity), [weeklyActivity]);
  const maxWeeklyCount = Math.max(1, ...weeklyActivity.map((item) => item.count));

  const paidCount = purchases.filter((purchase) => String(purchase?.status || '').toUpperCase() === 'PAID').length;
  const weeklyActivityTotal = weeklyActivity.reduce((sum, item) => sum + item.count, 0);
  const startedCoursesCount = continueLearning.length;
  const avgMark = summarizeAverageMark(marks);
  const overallProgress = enrolledCourses.length
    ? enrolledCourses.reduce((sum, course) => sum + Number(course?.progress || 0), 0) / enrolledCourses.length
    : 0;

  return (
    <StudentLayout
      title={t.student.badge}
      subtitle={t.student.title}
      actions={
        <>
          <Link to="/student/profile" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
            {isArabic ? 'الملف الشخصي' : 'Profile'}
          </Link>
          <Link to="/dashboard/student/courses" className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800">
            {isArabic ? 'استكشف الكورسات' : 'Explore courses'}
          </Link>
        </>
      }
    >
      <div className="space-y-8">
        {loading ? (
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm font-medium text-indigo-700">
            {isArabic ? 'جاري تحميل أحدث بيانات الأكاديمية...' : 'Loading latest academy data...'}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
            {error}
          </div>
        ) : null}

        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="overflow-hidden rounded-[2rem] border border-white/70 bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-500 p-6 text-white shadow-[0_24px_65px_-35px_rgba(79,70,229,0.55)] md:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-100">{isArabic ? 'لوحة الطالب' : 'Student dashboard'} ✨</p>
                <h2 className="mt-2 text-3xl font-black text-white">
                  {isArabic ? 'مرحبًا' : 'Welcome'} 👋 {profile?.fullName || profile?.name || (isArabic ? 'طالب' : 'Student')}
                </h2>
                <p className="mt-2 text-sm leading-7 text-indigo-50">
                  {isArabic
                    ? `المسجلة: ${enrolledCourses.length} • المدفوعة: ${paidCount} • بدأت: ${startedCoursesCount}`
                    : `Enrolled: ${enrolledCourses.length} • Paid: ${paidCount} • Started: ${startedCoursesCount}`}
                </p>
              </div>
              <Link to="/dashboard/student/courses" className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:opacity-90">
                {isArabic ? 'إدارة الكورسات' : 'Manage courses'}
                <ArrowRight size={14} />
              </Link>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <SummaryChip label={isArabic ? 'متوسط الدرجات' : 'Average mark'} value={`${Math.round(avgMark)}%`} icon={TrendingUp} accent="from-emerald-300 to-cyan-300" />
              <SummaryChip label={isArabic ? 'التقدم العام' : 'Overall progress'} value={`${Math.round(overallProgress)}%`} icon={Sparkles} accent="from-amber-300 to-pink-300" />
              <SummaryChip label={isArabic ? 'نشاط الأسبوع' : 'Weekly activity'} value={`${weeklyActivityTotal}`} icon={Flame} accent="from-orange-300 to-red-300" />
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{isArabic ? 'شارت النشاط' : 'Activity chart'} 📈</p>
                <h3 className="mt-2 text-xl font-black text-slate-900">{isArabic ? 'الأسبوع الحالي' : 'This week'}</h3>
              </div>
              <div className="rounded-2xl bg-indigo-50 p-3 text-indigo-600">
                <BarChart3 size={18} />
              </div>
            </div>

            <div className="mt-5 rounded-[1.5rem] bg-slate-950 p-4 text-white">
              {weeklyActivity.some((item) => item.count > 0) ? (
                <svg viewBox="0 0 320 150" className="h-44 w-full overflow-visible">
                  <defs>
                    <linearGradient id="dashboard-area-gradient" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.65" />
                      <stop offset="100%" stopColor="#ec4899" stopOpacity="0.05" />
                    </linearGradient>
                    <linearGradient id="dashboard-line-gradient" x1="0" x2="1" y1="0" y2="0">
                      <stop offset="0%" stopColor="#22c55e" />
                      <stop offset="50%" stopColor="#60a5fa" />
                      <stop offset="100%" stopColor="#f472b6" />
                    </linearGradient>
                  </defs>
                  <path d={weeklyChart.areaPath} fill="url(#dashboard-area-gradient)" />
                  <path d={weeklyChart.linePath} fill="none" stroke="url(#dashboard-line-gradient)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                  {weeklyChart.points.map((point, index) => (
                    <circle key={weeklyActivity[index].key} cx={point.x} cy={point.y} r="4.5" fill="#fff" stroke="#111827" strokeWidth="2" />
                  ))}
                </svg>
              ) : (
                <div className="flex h-44 items-center justify-center rounded-[1.25rem] border border-white/10 bg-white/5 text-sm text-slate-200">
                  {isArabic ? 'لا توجد بيانات نشاط كافية بعد.' : 'No activity data yet.'}
                </div>
              )}

              <div className="mt-4 grid grid-cols-7 gap-2 text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                {weeklyActivity.map((item) => (
                  <div key={item.key}>
                    <div className="mb-1 h-2 rounded-full bg-white/10">
                      <div className="h-2 rounded-full bg-white/70" style={{ width: `${Math.max(10, (item.count / maxWeeklyCount) * 100)}%` }} />
                    </div>
                    <div>{item.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <MiniStat label={isArabic ? 'أيام نشطة' : 'Active days'} value={weeklyActivity.filter((item) => item.count > 0).length} icon={CalendarDays} />
              <MiniStat label={isArabic ? 'إجمالي النشاط' : 'Activity total'} value={weeklyActivityTotal} icon={BookOpen} />
            </div>
          </div>
        </section>

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

            <div className="w-full rounded-2xl border border-indigo-100 bg-indigo-50/55 p-3 sm:w-[330px]">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-700">{isArabic ? 'نشاط هذا الأسبوع' : 'Weekly activity'} 📈</p>
              {weeklyActivity.some((item) => item.count > 0) ? (
                <div className="mt-3 flex h-24 items-end gap-1.5">
                  {weeklyActivity.map((item) => (
                    <div key={item.key} className="flex flex-1 flex-col items-center gap-1">
                      <div className="w-full rounded-t bg-gradient-to-t from-indigo-500 to-fuchsia-400" style={{ height: `${Math.max(10, (item.count / maxWeeklyCount) * 100)}%` }} />
                      <span className="text-[10px] font-semibold text-slate-500">{item.label}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-xs text-slate-500">{isArabic ? 'لا توجد أنشطة درجات خلال هذا الأسبوع.' : 'No graded activity recorded this week.'}</p>
              )}
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

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{isArabic ? '✨ كورسات مقترحة' : '✨ Recommended Courses'}</p>
              <h2 className="mt-2 text-xl font-black text-slate-900">{isArabic ? 'مقترح لك (غير مسجل)' : 'Not enrolled yet'}</h2>
              <p className="mt-1 text-sm text-slate-600">
                {isArabic
                  ? 'التوصيات تعتمد على تصنيف كورساتك الحالية، مع fallback عشوائي ثابت.'
                  : 'Recommendations are category-based from your current courses, with a stable random fallback.'}
              </p>
            </div>
            <PlusCircle size={18} className="text-slate-400" />
          </div>

          {recommendedCourses.length ? (
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {recommendedCourses.map((course) => (
                <DashboardCourseCard key={course.id} course={course} actionLabel={isArabic ? 'سجل الآن' : 'Enroll'} actionHref={`/payment-success?courseId=${course.id}`} />
              ))}
            </div>
          ) : (
            <EmptyState
              title={isArabic ? 'لا توجد توصيات متاحة الآن' : 'No recommendations available'}
              description={
                isArabic
                  ? 'إما أن كل الكورسات مسجَّلة بالفعل أو أن كتالوج الكورسات غير متاح لحساب الطالب الحالي.'
                  : 'Either all courses are already enrolled, or the course catalog is not available for this student account.'
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

function SummaryChip({ label, value, icon: Icon, accent }) {
  return (
    <div className="rounded-2xl border border-white/20 bg-white/12 p-4 backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-indigo-100">{label}</p>
          <p className="mt-1 text-2xl font-black text-white">{value}</p>
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${accent} text-slate-900`}>
          <Icon size={18} />
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
          <p className="mt-1 text-lg font-black text-slate-900">{value}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm">
          <Icon size={16} />
        </div>
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
