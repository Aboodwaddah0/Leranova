import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChartColumn, Clock3, Flame, MessageCircle, Sparkles, Users, PlayCircle, BadgeCheck } from 'lucide-react';
import StudentLayout from '../../components/student/StudentLayout';
import CourseCard from '../../components/student/CourseCard';
import {
  fetchAcademyTeachersForCourses,
  fetchMyStudentMarks,
  fetchMyStudentPurchases,
  fetchStudentCourseCatalog,
  fetchStudentProfile,
} from '../../services/studentService';
import { useLanguage } from '../../utils/i18n';

const summarizeAverage = (marks = []) => {
  if (!marks.length) return 0;
  const total = marks.reduce((sum, mark) => sum + (Number(mark.Numbers) / Math.max(1, Number(mark.OutOf))) * 100, 0);
  return total / marks.length;
};

export default function StudentDashboardPage() {
  console.log('StudentDashboardPage: render start');
  const { t, isArabic } = useLanguage();
  const [courses, setCourses] = useState([]);
  const [marks, setMarks] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [profile, setProfile] = useState(null);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    console.log('StudentDashboardPage: mounted');
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        const [courseData, marksData, purchaseData, profileData] = await Promise.all([
          fetchStudentCourseCatalog(),
          fetchMyStudentMarks(),
          fetchMyStudentPurchases(),
          fetchStudentProfile(),
        ]);

        console.log('StudentDashboardPage: API resolved', {
          courseData,
          marksData,
          purchaseData,
          profileData,
        });

        if (cancelled) return;

        const safeCourses = Array.isArray(courseData) ? courseData : [];
        const safeMarks = Array.isArray(marksData) ? marksData : [];
        const safePurchases = Array.isArray(purchaseData) ? purchaseData : [];
        const safeTeachers = await fetchAcademyTeachersForCourses((safeCourses || []).map((course) => course?.id));

        setCourses(safeCourses);
        setMarks(safeMarks);
        setPurchases(safePurchases);
        setProfile(profileData || null);
        setTeachers(Array.isArray(safeTeachers) ? safeTeachers : []);
      } catch (loadError) {
        if (!cancelled) {
          console.error('Dashboard error:', loadError);
          setError(loadError?.message || 'Failed to load dashboard.');
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
  }, []);

  const stats = useMemo(() => {
    const safeCourses = Array.isArray(courses) ? courses : [];
    const safePurchases = Array.isArray(purchases) ? purchases : [];
    const safeMarks = Array.isArray(marks) ? marks : [];
    const safeTeachers = Array.isArray(teachers) ? teachers : [];

    const enrolled = safeCourses.length;
    const paid = safePurchases.filter((purchase) => String(purchase?.status || '').toUpperCase() === 'PAID').length;
    const average = summarizeAverage(safeMarks);
    const progress = safeCourses.length ? Math.round(safeCourses.reduce((sum, course) => sum + Number(course?.progress || 0), 0) / safeCourses.length) : 0;

    return [
      { label: isArabic ? 'الكورسات المسجلة' : 'Enrolled courses', value: enrolled, icon: BookIcon },
      { label: isArabic ? 'المواد النشطة' : 'Active subjects', value: Math.max(safeTeachers.length, 1), icon: Users },
      { label: isArabic ? 'متوسط الدرجات' : 'Average mark', value: `${average.toFixed(0)}%`, icon: ChartColumn },
      { label: isArabic ? 'التقدم العام' : 'Overall progress', value: `${progress}%`, icon: Clock3 },
      { label: isArabic ? 'مدفوعات مؤكدة' : 'Paid courses', value: paid, icon: BadgeCheck },
    ];
  }, [courses, marks, teachers.length, purchases, isArabic]);

  if (!t?.student) {
    console.error('Dashboard error: missing translation object');
    return <div className="m-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">Loading translations...</div>;
  }

  if (!Array.isArray(courses)) {
    console.error('Dashboard error: courses is not an array', courses);
    return <div className="m-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">No data</div>;
  }

  const featuredCourse = courses?.[0] || null;
  const recentCourses = (courses || []).slice(0, 3);

  console.log('StudentDashboardPage: before return', {
    loading,
    error,
    coursesCount: courses?.length,
    marksCount: Array.isArray(marks) ? marks.length : 0,
    purchasesCount: Array.isArray(purchases) ? purchases.length : 0,
  });

  return (
    <StudentLayout
      title={t.student.badge}
      subtitle={t.student.title}
      actions={
        <>
          <Link to="/student/profile" className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
            {isArabic ? 'الملف الشخصي' : 'Profile'}
          </Link>
          <Link to="/dashboard/student/courses" className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700">
            {isArabic ? 'استكشف الكورسات' : 'Explore courses'}
          </Link>
        </>
      }
    >
      <div className="space-y-6">
        {loading ? (
          <div className="rounded-[1.5rem] border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm font-medium text-indigo-700">
            Loading latest academy data...
          </div>
        ) : null}

        {error ? (
          <div className="rounded-[1.75rem] border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
            {error}
          </div>
        ) : null}

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="overflow-hidden rounded-[2.25rem] border border-white/70 bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-500 p-6 text-white shadow-[0_24px_70px_-30px_rgba(79,70,229,0.55)] md:p-8"
        >
          <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-blue-100">Premium Learning</p>
              <h1 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">
                {isArabic ? 'مرحبًا بك من جديد' : 'Welcome back'} {profile?.fullName || profile?.name || 'Academy Student'}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-blue-50/90 md:text-base">
                {isArabic
                  ? 'هذه مساحة الطالب الأكاديمي الحديثة لمتابعة الكورسات والدروس والأسئلة بسرعة وبواجهة أنيقة.'
                  : 'This is the modern academy student space for tracking courses, lessons, and tutor questions in one polished flow.'}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[320px] xl:grid-cols-1">
              <div className="rounded-3xl border border-white/20 bg-white/10 p-4 backdrop-blur-xl">
                <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-blue-100">Weekly streak</span>
                <div className="mt-2 flex items-center gap-3 text-2xl font-black">
                  <Flame className="text-orange-300" size={24} /> 12 days
                </div>
              </div>
              <div className="rounded-3xl border border-white/20 bg-white/10 p-4 backdrop-blur-xl">
                <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-blue-100">XP earned</span>
                <div className="mt-2 flex items-center gap-3 text-2xl font-black">
                  <Sparkles className="text-yellow-200" size={24} /> 4,280
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {stats.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.article
                key={item.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: index * 0.03 }}
                className="rounded-[1.75rem] border border-white/70 bg-white/85 p-5 shadow-lg shadow-indigo-500/5 backdrop-blur-xl"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">{item.label}</p>
                    <p className="mt-3 text-2xl font-black text-slate-900">{item.value}</p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-cyan-500 text-white shadow-lg">
                    <Icon size={18} />
                  </div>
                </div>
              </motion.article>
            );
          })}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
          <div className="rounded-[2rem] border border-white/70 bg-white/85 p-5 shadow-xl shadow-indigo-500/5 backdrop-blur-xl md:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-indigo-600">Current lesson</p>
                <h2 className="mt-2 text-2xl font-black text-slate-900">{featuredCourse?.name || 'Learning path'}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{featuredCourse?.description || 'Continue where you stopped and keep your momentum going.'}</p>
              </div>
              <div className="hidden sm:flex h-14 w-14 items-center justify-center rounded-3xl bg-indigo-50 text-indigo-600">
                <PlayCircle size={24} />
              </div>
            </div>

            <div className="mt-5 overflow-hidden rounded-[1.5rem] bg-slate-950 text-white shadow-2xl">
              <div className="relative aspect-video bg-gradient-to-br from-slate-950 via-indigo-950 to-cyan-950">
                <img
                  src={featuredCourse?.cover || 'https://images.unsplash.com/photo-1553877522-43269d4ea984?auto=format&fit=crop&w=1600&q=80'}
                  alt={featuredCourse?.name || 'Course preview'}
                  className="h-full w-full object-cover opacity-70"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/35 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-5 md:p-6">
                  <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-blue-100">Current track</p>
                  <h3 className="mt-2 text-xl font-black md:text-3xl">{featuredCourse?.name || 'Course preview'}</h3>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/20">
                    <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-300" style={{ width: `${Math.min(100, Math.max(0, featuredCourse?.progress || 0))}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-[2rem] border border-white/70 bg-white/85 p-5 shadow-xl shadow-indigo-500/5 backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-indigo-600">Academy teachers</p>
                  <h3 className="mt-2 text-xl font-black text-slate-900">Your mentors</h3>
                </div>
                <Users className="text-indigo-500" size={20} />
              </div>
              <div className="mt-4 space-y-3">
                {teachers.slice(0, 4).map((teacher) => (
                  <div key={teacher.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="font-semibold text-slate-900">{teacher.name}</p>
                    <p className="text-xs text-indigo-600">{teacher.title}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/70 bg-gradient-to-br from-indigo-600 to-cyan-500 p-5 text-white shadow-xl shadow-indigo-500/15 backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
                  <MessageCircle size={20} />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-blue-100">AI Learning Buddy</p>
                  <h3 className="mt-1 text-lg font-black">Online & ready</h3>
                </div>
              </div>
              <p className="mt-4 text-sm leading-7 text-blue-50/90">
                {isArabic
                  ? 'يمكنك طرح سؤال على المساعد الذكي من صفحة الدرس وسيجيبك اعتمادًا على سياق الكورس.'
                  : 'Ask the AI tutor from any lesson page and it will answer from the course context.'}
              </p>
              <Link to="/student/lessons/301" className="mt-5 inline-flex rounded-full bg-white px-4 py-2 text-sm font-semibold text-indigo-600 transition hover:opacity-90">
                {isArabic ? 'ابدأ سؤالًا' : 'Start chat'}
              </Link>
            </div>
          </aside>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
          <div className="rounded-[2rem] border border-white/70 bg-white/85 p-5 shadow-xl shadow-indigo-500/5 backdrop-blur-xl md:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-indigo-600">Your enrolled courses</p>
                <h2 className="mt-2 text-xl font-black text-slate-900">Study tracks</h2>
              </div>
              <Link to="/dashboard/student/courses" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">View all</Link>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              {recentCourses.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  isPaid={String(course.priceStatus || '').toUpperCase() === 'PAID'}
                  progress={course.progress}
                  continueHref={`/student/courses/${course.id}`}
                  subscribeHref={`/payment-success?courseId=${course.id}`}
                />
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[2rem] border border-white/70 bg-white/85 p-5 shadow-xl shadow-indigo-500/5 backdrop-blur-xl">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-indigo-600">Learning activity</p>
              <h3 className="mt-2 text-xl font-black text-slate-900">This week</h3>
              <div className="mt-5 flex h-40 items-end gap-2">
                {[42, 60, 90, 54, 100, 32, 14].map((height, index) => (
                  <div key={index} className="flex-1 rounded-t-2xl bg-gradient-to-t from-indigo-300 to-indigo-600" style={{ height: `${height}%` }} />
                ))}
              </div>
              <div className="mt-3 flex justify-between text-[10px] font-bold tracking-[0.2em] text-slate-400">
                <span>MON</span><span>TUE</span><span>WED</span><span>THU</span><span>FRI</span><span>SAT</span><span>SUN</span>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/70 bg-white/85 p-5 shadow-xl shadow-indigo-500/5 backdrop-blur-xl">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-indigo-600">Recent community</p>
              <h3 className="mt-2 text-xl font-black text-slate-900">What others are doing</h3>
              <div className="mt-4 space-y-4 text-sm text-slate-600">
                <div className="rounded-2xl bg-slate-50 p-4">Elena R. shared a new UI kit.</div>
                <div className="rounded-2xl bg-slate-50 p-4">Marcus T. asked about Redux vs Context.</div>
                <div className="rounded-2xl bg-slate-50 p-4">Jessica W. completed Python Basics.</div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </StudentLayout>
  );
}

function BookIcon(props) {
  return <PlayCircle {...props} />;
}
