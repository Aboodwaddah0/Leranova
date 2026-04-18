import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, BadgeCheck, BookOpenText, Clock3, Layers3, PlayCircle, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import StudentLayout from '../../components/student/StudentLayout';
import { fetchAcademyTeachersForCourses, fetchCourseSubjects, fetchStudentCourseCatalog } from '../../services/studentService';
import { useLanguage } from '../../utils/i18n';

const fallbackCover = 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1600&q=80';

const getCourseCover = (course) => course?.cover || course?.thumbnail || fallbackCover;

const getCourseCategory = (course) => course?.category || 'Academy';

export default function StudentCourseDetailsPage() {
  const { isArabic } = useLanguage();
  const { courseId } = useParams();
  const numericCourseId = Number(courseId);
  const [course, setCourse] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        const [catalog, subjectData] = await Promise.all([
          fetchStudentCourseCatalog(),
          fetchCourseSubjects(numericCourseId),
        ]);

        if (cancelled) return;

        const matchedCourse = (catalog || []).find((item) => Number(item.id) === numericCourseId) || null;
        const normalizedSubjects = subjectData || [];
        setCourse(matchedCourse);
        setSubjects(normalizedSubjects);
        setTeachers(await fetchAcademyTeachersForCourses([numericCourseId]));
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError?.message || (isArabic ? 'فشل تحميل تفاصيل الكورس.' : 'Failed to load course details.'));
          setCourse(null);
          setSubjects([]);
          setTeachers([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    if (Number.isFinite(numericCourseId)) {
      load();
    }

    return () => {
      cancelled = true;
    };
  }, [isArabic, numericCourseId]);

  const subjectCount = subjects.length;
  const lessonStyleCount = Math.max(1, subjectCount * 4);
  const startedProgress = Math.max(0, Number(course?.progress || 0));

  const teacherCards = useMemo(() => teachers.slice(0, 4), [teachers]);

  if (loading) {
    return (
      <StudentLayout title={isArabic ? 'تفاصيل الكورس' : 'Course details'} subtitle={isArabic ? 'جاري تحميل نظرة عامة عن الكورس' : 'Loading course overview'}>
        <div className="space-y-6">
          <div className="h-16 animate-pulse rounded-[1.75rem] border border-white/70 bg-white/85 shadow-xl shadow-indigo-500/5" />
          <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
            <div className="h-[26rem] animate-pulse rounded-[1.75rem] border border-white/70 bg-white/85 shadow-xl shadow-indigo-500/5" />
            <div className="h-[26rem] animate-pulse rounded-[1.75rem] border border-white/70 bg-white/85 shadow-xl shadow-indigo-500/5" />
          </div>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout title={isArabic ? 'تفاصيل الكورس' : 'Course details'} subtitle={course?.name || (isArabic ? 'نظرة عامة عن الكورس' : 'Course overview')}>
      {error ? <div className="mb-5 rounded-[1.75rem] border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">{error}</div> : null}
      <div className="flex items-center justify-between gap-3">
        <Link to="/courses" className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
          <ArrowLeft size={16} /> {isArabic ? 'العودة للكورسات' : 'Back to courses'}
        </Link>
      </div>

      <div className="mt-5 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/90 shadow-xl shadow-indigo-500/5 backdrop-blur-xl">
          <div className="grid gap-0 md:grid-cols-[1fr_0.92fr]">
            <div className="relative group min-h-[280px] overflow-hidden bg-slate-950">
              <motion.img
                src={getCourseCover(course)}
                alt={course?.name || 'Course cover'}
                initial={{ scale: 1 }}
                animate={{ scale: 1 }}
                whileHover={{ scale: 1.06 }}
                transition={{ duration: 0.45, ease: 'easeOut' }}
                className="h-full w-full object-cover opacity-90"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
              <div className="absolute left-5 top-5 rounded-full bg-white/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-white backdrop-blur">
                {getCourseCategory(course)}
              </div>
              <div className="absolute bottom-5 left-5 right-5">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-blue-100">{isArabic ? 'رحلة الكورس' : 'Course journey'}</p>
                <h1 className="mt-2 text-3xl font-black text-white">{course?.name || (isArabic ? 'تفاصيل الكورس' : 'Course details')}</h1>
                <p className="mt-2 max-w-xl text-sm leading-7 text-slate-100/90">{course?.description || (isArabic ? 'المواد والمدرسون ومسار التعلّم.' : 'Subjects, teachers, and learning path.')}</p>
              </div>
            </div>

            <div className="flex flex-col justify-between p-6 md:p-7">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                    <Layers3 size={13} /> {isArabic ? `${subjectCount} مواد` : `${subjectCount} subjects`}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                    <BadgeCheck size={13} /> {isArabic ? `تقدم ${Math.round(startedProgress)}%` : `${Math.round(startedProgress)}% progress`}
                  </span>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <DetailMetric icon={BookOpenText} label={isArabic ? 'المواد' : 'Subjects'} value={subjectCount || 0} tone="bg-indigo-50 text-indigo-600" />
                  <DetailMetric icon={Clock3} label={isArabic ? 'وحدات التعلم' : 'Learning blocks'} value={lessonStyleCount} tone="bg-fuchsia-50 text-fuchsia-600" />
                </div>

                <p className="mt-5 text-sm leading-7 text-slate-600">
                  {isArabic
                    ? 'حافظ على نفس تدفق الواجهة: الإطار ثابت بينما صورة الغلاف تحتفظ بحركة التكبير عند المرور.'
                    : 'Keep the same visual flow: the container stays still, but the cover image keeps the animated hover zoom.'}
                </p>
              </div>

              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">{isArabic ? 'ملاحظة دراسية' : 'Study note'}</p>
                <p className="mt-2 text-sm leading-7 text-slate-700">
                  {isArabic
                    ? 'إكمال المواد بالترتيب يمنح المساعد الذكي سياقًا أفضل ويجعل تقدمك أوضح.'
                    : 'Completing subjects in order gives the AI tutor better context and keeps your progress visually clean.'}
                </p>
              </div>
            </div>
          </div>
        </section>

        <aside className="space-y-6">
          <div className="rounded-[1.75rem] border border-white/70 bg-white/85 p-5 shadow-xl shadow-indigo-500/5 backdrop-blur-xl">
            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.25em] text-indigo-600">
              <Users size={16} /> {isArabic ? 'مدرسو الأكاديمية' : 'Academy teachers'}
            </div>
            <div className="mt-4 space-y-3">
              {teacherCards.length ? teacherCards.map((teacher) => (
                <div key={teacher.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="font-semibold text-slate-900">{teacher.name}</p>
                  <p className="text-xs text-indigo-600">{teacher.title}</p>
                </div>
              )) : (
                <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">{isArabic ? 'لا يوجد مدرسون مرتبطون بعد.' : 'No teachers linked yet.'}</div>
              )}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-white/70 bg-gradient-to-br from-slate-900 to-indigo-950 p-5 text-white shadow-xl shadow-indigo-500/10">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-blue-100">{isArabic ? 'ملاحظة دراسية' : 'Study note'}</p>
            <p className="mt-3 text-sm leading-7 text-slate-200">
              {isArabic
                ? 'صفحة تفاصيل الكورس أصبحت أكثر تركيزًا: حاوية ثابتة وغلاف متحرك وبيانات واقعية للكورس.'
                : 'The course detail page is now more focused: one static container, one animated cover, and real course metadata.'}
            </p>
          </div>
        </aside>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-[1.75rem] border border-white/70 bg-white/85 p-5 shadow-xl shadow-indigo-500/5 backdrop-blur-xl md:p-6">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.25em] text-indigo-600">
            <BookOpenText size={16} /> {isArabic ? 'المواد' : 'Subjects'}
          </div>
          <div className="mt-4 space-y-3">
            {subjects.length ? subjects.map((subject, index) => (
              <Link
                key={subject.id}
                to={`/courses/${numericCourseId}/subjects/${subject.id}`}
                className="group flex items-start justify-between rounded-2xl border border-slate-200 bg-white px-4 py-4 transition hover:border-indigo-200 hover:shadow-md"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 text-xs font-black text-indigo-600">{String(index + 1).padStart(2, '0')}</span>
                    <p className="font-bold text-slate-900 group-hover:text-indigo-700">{subject.name}</p>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{subject.description || (isArabic ? 'استكشف الدروس والمواد' : 'Explore lessons and materials')}</p>
                </div>
                <PlayCircle className="mt-1 shrink-0 text-indigo-500 transition group-hover:translate-x-1" size={18} />
              </Link>
            )) : (
              <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">{isArabic ? 'لا توجد مواد متاحة بعد.' : 'No subjects available yet.'}</div>
            )}
          </div>
        </section>

        <div className="space-y-6">
          <div className="rounded-[1.75rem] border border-white/70 bg-white/85 p-5 shadow-xl shadow-indigo-500/5 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-indigo-600">{isArabic ? 'لقطة الكورس' : 'Course snapshot'}</p>
                <h3 className="mt-2 text-xl font-black text-slate-900">{isArabic ? 'ما الذي ستستكشفه' : "What you'll explore"}</h3>
              </div>
              <BadgeCheck className="text-emerald-500" size={18} />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <SnapshotPill label={isArabic ? 'عمق المواد' : 'Subject depth'} value={`${subjectCount || 0}`} />
              <SnapshotPill label={isArabic ? 'عدد المدرسين' : 'Teacher voices'} value={`${teacherCards.length || 0}`} />
              <SnapshotPill label={isArabic ? 'التقدم' : 'Progress'} value={`${Math.round(startedProgress)}%`} />
              <SnapshotPill label={isArabic ? 'النمط' : 'Style'} value={isArabic ? 'نظيف' : 'Clean'} />
            </div>
          </div>
        </div>
      </div>
    </StudentLayout>
  );
}

function DetailMetric({ icon: Icon, label, value, tone }) {
  return (
    <div className={`rounded-2xl border border-slate-200 p-4 ${tone}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-black text-slate-900">{value}</p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-sm">
          <Icon size={18} />
        </div>
      </div>
    </div>
  );
}

function SnapshotPill({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-black text-slate-900">{value}</p>
    </div>
  );
}
