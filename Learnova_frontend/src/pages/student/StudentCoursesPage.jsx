import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Sparkles } from 'lucide-react';
import StudentLayout from '../../components/student/StudentLayout';
import CourseCard from '../../components/student/CourseCard';
import { fetchMyStudentPurchases, fetchStudentCourseCatalog } from '../../services/studentService';
import { useLanguage } from '../../utils/i18n';

export default function StudentCoursesPage() {
  console.log('StudentCoursesPage: render start');
  const { t, isArabic } = useLanguage();
  const [courses, setCourses] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    console.log('StudentCoursesPage: mounted');
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        const [courseData, purchaseData] = await Promise.all([fetchStudentCourseCatalog(), fetchMyStudentPurchases()]);
        console.log('StudentCoursesPage: API resolved', { courseData, purchaseData });
        if (cancelled) return;
        setCourses(Array.isArray(courseData) ? courseData : []);
        setPurchases(Array.isArray(purchaseData) ? purchaseData : []);
      } catch (loadError) {
        if (!cancelled) {
          console.error('Courses error:', loadError);
          setError(loadError?.message || 'Failed to load courses.');
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

  if (!t?.student) {
    console.error('Courses error: missing translation object');
    return <div className="m-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">Loading translations...</div>;
  }

  if (!Array.isArray(courses)) {
    console.error('Courses error: courses is not an array', courses);
    return <div className="m-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">No data</div>;
  }

  if (!Array.isArray(purchases)) {
    console.error('Courses error: purchases is not an array', purchases);
    return <div className="m-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">No data</div>;
  }

  const paidCourseIds = useMemo(
    () => new Set((purchases || []).map((purchase) => Number(purchase?.course?.id || purchase?.courseId)).filter(Boolean)),
    [purchases],
  );

  const filteredCourses = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return courses;
    return (courses || []).filter((course) => `${course?.name || ''} ${course?.description || ''}`.toLowerCase().includes(needle));
  }, [courses, query]);

  console.log('StudentCoursesPage: before return', {
    loading,
    error,
    coursesCount: courses?.length,
    purchasesCount: purchases?.length,
    filteredCount: filteredCourses?.length,
  });

  return (
    <StudentLayout
      title={t.student.courses.title}
      subtitle={t.student.courses.subtitle}
      actions={
        <Link to="/dashboard/student" className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
          {isArabic ? 'العودة للوحة' : 'Back to dashboard'}
        </Link>
      }
    >
      {error ? (
        <div className="mb-5 rounded-[1.75rem] border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="mb-5 rounded-[1.5rem] border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm font-medium text-indigo-700">
          Loading latest academy catalog...
        </div>
      ) : null}

      <section className="rounded-[2rem] border border-white/70 bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-500 p-6 text-white shadow-xl shadow-indigo-500/15">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-blue-100">Academy catalog</p>
            <h1 className="mt-2 text-2xl font-black">{isArabic ? 'استعرض كورسات الأكاديمية' : 'Explore the academy catalog'}</h1>
            <p className="mt-2 max-w-2xl text-sm text-blue-50/90">
              {isArabic
                ? 'اختر كورسًا وتابع تعلمك أو انتقل مباشرة إلى صفحة التفاصيل.'
                : 'Choose a course, continue learning, or jump straight into details.'}
            </p>
          </div>
          <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm backdrop-blur">
            <Sparkles className="mr-2 inline-block" size={16} /> {courses.length} courses
          </div>
        </div>
      </section>

      <div className="mt-5 rounded-[1.75rem] border border-white/70 bg-white/85 p-4 shadow-lg shadow-indigo-500/5 backdrop-blur-xl">
        <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <Search size={16} className="text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={isArabic ? 'ابحث عن كورس...' : 'Search a course...'}
            className="w-full bg-transparent text-sm outline-none"
          />
        </label>
      </div>

      {filteredCourses.length ? (
        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {(filteredCourses || []).map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              isPaid={String(course.priceStatus || '').toUpperCase() === 'PAID' || paidCourseIds.has(Number(course.id))}
              progress={course.progress}
              continueHref={`/courses/${course.id}`}
              subscribeHref={`/payment-success?courseId=${course.id}`}
            />
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-[1.75rem] border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-sm text-slate-500">
          {t.student.courses.noCourses}
        </div>
      )}
    </StudentLayout>
  );
}
