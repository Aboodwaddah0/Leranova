import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BookCheck, ChevronDown, Clock3, CreditCard, Lock, PlayCircle } from 'lucide-react';
import StudentLayout from '../../components/student/StudentLayout';
import {
  fetchAcademyTrackSubjects,
  fetchCourseSubjects,
  fetchStudentContext,
  fetchStudentCourseCatalog,
  fetchSubjectLessons,
  subscribeAcademyMaterial,
} from '../../services/studentService';
import { useLanguage } from '../../utils/i18n';
import { calculateProgressForLessons, isLessonCompleted, setLessonCompleted, subscribeToProgress } from '../../utils/studentProgress';

export default function StudentSubjectPage() {
  const { isArabic } = useLanguage();
  const navigate = useNavigate();
  const { courseId } = useParams();
  const { subjectId } = useParams();
  const numericCourseId = Number(courseId);
  const numericSubjectId = Number(subjectId);
  const [subject, setSubject] = useState(null);
  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [studentContext, setStudentContext] = useState(null);
  const [isLocked, setIsLocked] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [progressTick, setProgressTick] = useState(0);
  const [openSections, setOpenSections] = useState({});
  const autoOpenedFirstSectionRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        const [context, courses, subjects] = await Promise.all([
          fetchStudentContext(),
          fetchStudentCourseCatalog(),
          fetchCourseSubjects(numericCourseId),
        ]);
        setStudentContext(context);
        const matchedCourse = (courses || []).find((item) => Number(item.id) === numericCourseId) || null;
        let matchedSubject = (subjects || []).find((item) => Number(item.id) === numericSubjectId) || null;

        if (!matchedSubject && context?.mode === 'ACADEMY') {
          const trackData = await fetchAcademyTrackSubjects(numericCourseId);
          matchedSubject = (trackData?.subjects || []).find((item) => Number(item.id) === numericSubjectId) || null;
          setIsLocked(Boolean(matchedSubject && !matchedSubject.isSubscribed));
        } else {
          setIsLocked(false);
        }

        let lessonData = [];
        if (!(context?.mode === 'ACADEMY' && matchedSubject && !matchedSubject.isSubscribed)) {
          lessonData = await fetchSubjectLessons(numericSubjectId);
        }

        if (cancelled) return;
        setCourse(matchedCourse);
        setSubject(matchedSubject);
        setLessons(lessonData || []);
      } catch (loadError) {
        if (!cancelled) {
            setError(loadError?.message || (isArabic ? 'فشل تحميل دروس المادة.' : 'Failed to load subject lessons.'));
          setSubject(null);
          setLessons([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    if (Number.isFinite(numericCourseId) && Number.isFinite(numericSubjectId)) {
      load();
    }

    return () => {
      cancelled = true;
    };
  }, [isArabic, numericCourseId, numericSubjectId]);

  const lessonItems = useMemo(() => lessons || [], [lessons]);
  const sections = useMemo(() => groupLessonsBySection(lessonItems, isArabic), [isArabic, lessonItems]);
  const lessonProgress = useMemo(
    () => calculateProgressForLessons(lessonItems.map((item) => item.id)),
    [lessonItems, progressTick],
  );

  useEffect(() => {
    if (loading || isLocked || autoOpenedFirstSectionRef.current) return;
    const firstSection = sections[0];
    if (!firstSection?.key) return;
    autoOpenedFirstSectionRef.current = true;
    setOpenSections({ [firstSection.key]: true });
  }, [isLocked, loading, sections]);

  const handleBuySubject = async () => {
    try {
      setIsPurchasing(true);
      const result = await subscribeAcademyMaterial(numericSubjectId);
      if (result?.checkoutUrl) {
        window.location.assign(result.checkoutUrl);
      }
    } catch (purchaseError) {
      setError(purchaseError?.message || (isArabic ? 'فشل بدء الدفع.' : 'Failed to start payment.'));
    } finally {
      setIsPurchasing(false);
    }
  };

  useEffect(() => subscribeToProgress(() => setProgressTick((value) => value + 1)), []);

  return (
    <StudentLayout title={isArabic ? 'المادة' : 'Subject'} subtitle={subject?.name || (isArabic ? 'دروس المادة' : 'Subject lessons')}>
      {loading ? <div className="h-64 animate-pulse rounded-[1.75rem] border border-white/70 bg-white/85 shadow-xl shadow-indigo-500/5" /> : null}
      {error ? <div className="mb-5 rounded-[1.75rem] border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">{error}</div> : null}
      <div className="flex items-center justify-between gap-3">
        <Link to={`/courses/${numericCourseId}`} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
          <ArrowLeft size={16} /> {isArabic ? 'العودة للكورس' : 'Back to course'}
        </Link>
      </div>

      <section className="mt-5 rounded-[2rem] border border-white/70 bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-500 p-6 text-white shadow-xl shadow-indigo-500/15">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-blue-100">{isArabic ? 'تركيز المادة' : 'Subject focus'}</p>
        <h1 className="mt-2 text-3xl font-black">{subject?.name || (isArabic ? 'دروس المادة' : 'Subject lessons')}</h1>
        <p className="mt-2 max-w-3xl text-sm text-blue-50/90">{subject?.description || (isArabic ? 'اختر درسًا لفتح مساحة الدراسة الكاملة.' : 'Pick a lesson to open the full study view.')}</p>
      </section>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <InfoChip label={isArabic ? 'الكورس' : 'Course'} value={course?.name || (isArabic ? 'كورس غير معروف' : 'Unknown course')} />
        <InfoChip label={isArabic ? 'المادة' : 'Subject'} value={subject?.name || (isArabic ? 'مادة غير معروفة' : 'Unknown subject')} />
        <InfoChip label={isArabic ? 'الإنجاز' : 'Completion'} value={`${lessonProgress.completed}/${lessonProgress.total} (${lessonProgress.percent}%)`} />
      </div>

      {studentContext?.mode === 'ACADEMY' && isLocked ? (
        <div className="mt-6 rounded-[1.75rem] border border-amber-200 bg-amber-50 p-6 text-amber-900">
          <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em]">
            <Lock size={16} /> {isArabic ? 'المادة مقفلة' : 'Subject Locked'}
          </div>
          <p className="mt-3 text-sm leading-7">
            {isArabic ? 'يجب شراء هذه المادة أولاً عبر Stripe لفتح الدروس والمرفقات والدردشة الخاصة بها.' : 'You must purchase this subject via Stripe first to unlock lessons, attachments, and its dedicated chat.'}
          </p>
          <button
            type="button"
            onClick={handleBuySubject}
            disabled={isPurchasing}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2 text-sm font-bold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <CreditCard size={16} />
            {isPurchasing
              ? (isArabic ? 'جاري التحويل للدفع...' : 'Redirecting to checkout...')
              : (isArabic ? 'اشترِ الآن' : 'Buy Now')}
          </button>
        </div>
      ) : null}

      {!(studentContext?.mode === 'ACADEMY' && isLocked) ? (
      <div className="mt-6 rounded-[1.75rem] border border-white/70 bg-white/85 p-5 shadow-xl shadow-indigo-500/5 backdrop-blur-xl">
        <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.25em] text-indigo-600">
          <BookCheck size={16} /> {isArabic ? 'السيكشنات والمحاضرات' : 'Sections and lectures'}
        </div>
        <div className="mt-4 space-y-3">
          {sections.length ? sections.map((section) => {
            const isOpen = Boolean(openSections[section.key]);

            return (
              <article key={section.key} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <button
                  type="button"
                  onClick={() => {
                    setOpenSections((prev) => ({ ...prev, [section.key]: !prev[section.key] }));
                  }}
                  className="flex w-full items-center justify-between gap-3 px-4 py-4 text-start transition hover:bg-slate-50"
                >
                  <div>
                    <p className="text-sm font-black text-slate-900">{section.title}</p>
                    <p className="mt-1 text-xs text-slate-500">{section.lessons.length} {isArabic ? 'محاضرات' : 'lectures'}</p>
                  </div>
                  <ChevronDown size={16} className={`text-slate-500 transition ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {isOpen ? (
                  <div className="space-y-2 border-t border-slate-100 bg-slate-50/40 p-3">
                    {section.lessons.map((lesson) => (
                      <div
                        key={lesson.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          navigate(`/lessons/${lesson.id}`);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            navigate(`/lessons/${lesson.id}`);
                          }
                        }}
                        className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 transition hover:border-indigo-200 hover:shadow-sm"
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={isLessonCompleted(lesson.id)}
                            onChange={(event) => {
                              event.stopPropagation();
                              setLessonCompleted(lesson.id, event.target.checked);
                            }}
                            onClick={(event) => event.stopPropagation()}
                            className="mt-1 h-4 w-4 cursor-pointer"
                          />
                          <div>
                            <p className="font-bold text-slate-900 group-hover:text-indigo-700">{lesson.displayTitle}</p>
                            <p className="mt-1 flex items-center gap-1 text-sm text-slate-500"><Clock3 size={14} /> {lesson.duration || (isArabic ? '15 دقيقة' : '15 min')}</p>
                          </div>
                        </div>

                        <PlayCircle className="text-indigo-500" size={16} />
                      </div>
                    ))}
                  </div>
                ) : null}
              </article>
            );
          }) : (
            <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">{isArabic ? 'لا توجد دروس متاحة بعد.' : 'No lessons are available yet.'}</div>
          )}
        </div>
      </div>
      ) : null}
    </StudentLayout>
  );
}

function groupLessonsBySection(lessons = [], isArabic = false) {
  const sectionMap = new Map();

  lessons.forEach((lesson, index) => {
    const rawTitle = String(lesson?.title || lesson?.name || '').trim();

    let sectionTitle = isArabic ? 'المحتوى العام' : 'General';
    let displayTitle = rawTitle || (isArabic ? `محاضرة ${index + 1}` : `Lecture ${index + 1}`);

    if (rawTitle.includes('::')) {
      const [sectionPart, lecturePart] = rawTitle.split('::').map((value) => value.trim());
      if (sectionPart) sectionTitle = sectionPart;
      if (lecturePart) displayTitle = lecturePart;
    } else if (rawTitle.includes(' - ')) {
      const [prefix, rest] = rawTitle.split(' - ').map((value) => value.trim());
      if (/^section\s*\d+/i.test(prefix) || /^سيكشن\s*\d+/i.test(prefix) || /^القسم\s*\d+/i.test(prefix)) {
        sectionTitle = prefix;
        if (rest) displayTitle = rest;
      }
    }

    const key = sectionTitle.toLowerCase();
    if (!sectionMap.has(key)) {
      sectionMap.set(key, {
        key,
        title: sectionTitle,
        lessons: [],
      });
    }

    sectionMap.get(key).lessons.push({
      ...lesson,
      displayTitle,
    });
  });

  return Array.from(sectionMap.values());
}

function InfoChip({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}
