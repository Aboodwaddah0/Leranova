import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Clock3, CreditCard, Lock, PlayCircle } from 'lucide-react';
import StudentLayout from '../../components/student/StudentLayout';
import {
  fetchAcademyTrackSubjects,
  fetchCourseSubjects,
  fetchStudentContext,
  fetchStudentCourseCatalog,
  fetchSubjectLessons,
  subscribeAcademyMaterial,
  updateStudentLessonProgress,
} from '../../services/studentService';
import { useLanguage } from '../../utils/i18n';
import { isLessonCompleted, setLessonCompleted, subscribeToProgress } from '../../utils/studentProgress';

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
  const [selectedLessonId, setSelectedLessonId] = useState('');
  const [autoNextCountdown, setAutoNextCountdown] = useState(null);
  const autoNextIntervalRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        const [context, courses, subjects, trackData] = await Promise.all([
          fetchStudentContext(),
          fetchStudentCourseCatalog(),
          fetchCourseSubjects(numericCourseId),
          fetchAcademyTrackSubjects(numericCourseId).catch(() => null),
        ]);
        setStudentContext(context);
        const matchedCourse = (courses || []).find((item) => Number(item.id) === numericCourseId) || null;
        let matchedSubject = (subjects || []).find((item) => Number(item.id) === numericSubjectId) || null;

        if (context?.mode === 'ACADEMY') {
          const academySubject = (trackData?.subjects || []).find((item) => Number(item.id) === numericSubjectId) || null;
          if (academySubject) {
            matchedSubject = matchedSubject || academySubject;
            setIsLocked(Boolean(academySubject.isPaid && !academySubject.isSubscribed));
          } else {
            setIsLocked(Boolean(matchedSubject?.isPaid && !matchedSubject?.isSubscribed));
          }
        } else {
          setIsLocked(false);
        }

        let lessonData = [];
        if (!(context?.mode === 'ACADEMY' && matchedSubject?.isPaid && !matchedSubject?.isSubscribed)) {
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

  const courseName = course?.name || course?.Name || (isArabic ? 'الكورس' : 'Course');
  const lessonItems = useMemo(() => lessons || [], [lessons]);
  const selectedLesson = useMemo(() => {
    if (!lessonItems.length) {
      return null;
    }

    return lessonItems.find((item) => String(item.id) === String(selectedLessonId)) || lessonItems[0] || null;
  }, [lessonItems, selectedLessonId]);
  const nextLessonId = useMemo(() => {
    if (!selectedLesson) {
      return null;
    }

    const currentIndex = lessonItems.findIndex((item) => Number(item.id) === Number(selectedLesson.id));
    if (currentIndex < 0) {
      return null;
    }

    const next = lessonItems[currentIndex + 1];
    return next ? Number(next.id) : null;
  }, [lessonItems, selectedLesson]);
  const selectedLessonVideoUrl = selectedLesson?.videoUrl || selectedLesson?.attachments?.find((attachment) => String(attachment.fileType || attachment.type || '').toUpperCase() === 'VIDEO')?.url || '';
  const lessonProgress = useMemo(() => {
    const total = lessonItems.length;
    if (!total) {
      return { total: 0, completed: 0, percent: 0 };
    }

    const completed = lessonItems.filter((lesson) => Boolean(lesson.isCompleted) || isLessonCompleted(lesson.id)).length;
    const percent = Math.round((completed / total) * 100);

    return {
      total,
      completed,
      percent,
    };
  }, [lessonItems, progressTick]);

  const clearAutoNext = () => {
    if (autoNextIntervalRef.current) {
      window.clearInterval(autoNextIntervalRef.current);
      autoNextIntervalRef.current = null;
    }
    setAutoNextCountdown(null);
  };

  const markLessonCompletion = async (lessonId, completed) => {
    const numericLessonId = Number(lessonId);
    if (!Number.isInteger(numericLessonId) || numericLessonId <= 0) {
      return;
    }

    setLessonCompleted(numericLessonId, completed);
    setLessons((current) => current.map((lesson) => (
      Number(lesson.id) === numericLessonId
        ? { ...lesson, isCompleted: Boolean(completed) }
        : lesson
    )));

    try {
      await updateStudentLessonProgress(numericLessonId, completed);
    } catch (updateError) {
      setError(updateError?.message || (isArabic ? 'فشل تحديث تقدم الدرس.' : 'Failed to update lesson progress.'));
    }
  };

  const startAutoNext = (targetLessonId) => {
    clearAutoNext();

    let remaining = 5;
    setAutoNextCountdown(remaining);

    autoNextIntervalRef.current = window.setInterval(() => {
      remaining -= 1;

      if (remaining <= 0) {
        clearAutoNext();
        setSelectedLessonId(String(targetLessonId));
        return;
      }

      setAutoNextCountdown(remaining);
    }, 1000);
  };

  const handleVideoEnded = () => {
    if (!selectedLesson?.id) {
      return;
    }

    void markLessonCompletion(selectedLesson.id, true);

    if (Number.isInteger(nextLessonId) && nextLessonId > 0) {
      startAutoNext(nextLessonId);
    }
  };

  useEffect(() => {
    if (!lessonItems.length) {
      setSelectedLessonId('');
      clearAutoNext();
      return;
    }

    setSelectedLessonId((current) => {
      const currentExists = lessonItems.some((item) => String(item.id) === String(current));
      return currentExists ? current : String(lessonItems[0].id);
    });
  }, [lessonItems]);

  useEffect(() => {
    lessonItems.forEach((lesson) => {
      const numericLessonId = Number(lesson.id);
      if (Number.isInteger(numericLessonId) && numericLessonId > 0) {
        setLessonCompleted(numericLessonId, Boolean(lesson.isCompleted));
      }
    });
  }, [lessonItems]);

  useEffect(() => () => clearAutoNext(), []);

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
    <StudentLayout>
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
        <InfoChip label={isArabic ? 'الكورس' : 'Course'} value={courseName} />
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
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="overflow-hidden rounded-[1.75rem] border border-white/70 bg-white/85 shadow-xl shadow-indigo-500/5 backdrop-blur-xl">
          <div className="bg-slate-950">
            {selectedLessonVideoUrl ? (
              <video
                key={selectedLesson?.id || 'lesson-video'}
                controls
                preload="metadata"
                src={selectedLessonVideoUrl}
                className="h-[360px] w-full object-cover"
                onEnded={handleVideoEnded}
              />
            ) : (
              <div className="flex h-[360px] items-center justify-center bg-[radial-gradient(circle_at_top,_#1e293b_0%,_#020617_75%)] text-slate-200">
                <div className="text-center">
                  <PlayCircle size={54} className="mx-auto text-cyan-300" />
                  <p className="mt-3 text-xl font-black">{isArabic ? 'معاينة الفيديو' : 'Video preview'}</p>
                  <p className="mt-2 text-sm text-slate-400">{isArabic ? 'اختر درسًا لتشغيل الفيديو هنا.' : 'Select a lesson to play the video here.'}</p>
                </div>
              </div>
            )}
          </div>

          <div className="p-5">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-indigo-600">{isArabic ? 'الدرس الحالي' : 'Current lesson'}</p>
            <h3 className="mt-2 text-2xl font-black text-slate-900">{selectedLesson?.title || selectedLesson?.name || (isArabic ? 'اختر درسًا' : 'Select a lesson')}</h3>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              {selectedLesson?.description || (isArabic ? 'سيظهر وصف الدرس هنا بعد الاختيار.' : 'Lesson details will appear here after selection.')}
            </p>
            {autoNextCountdown ? (
              <p className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700">
                {isArabic
                  ? `سيتم تشغيل المحاضرة التالية تلقائيًا خلال ${autoNextCountdown} ثوانٍ...`
                  : `Next lesson will autoplay in ${autoNextCountdown}s...`}
              </p>
            ) : null}
          </div>
        </section>

        <aside className="rounded-[1.75rem] border border-white/70 bg-white/85 p-5 shadow-xl shadow-indigo-500/5 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-indigo-600">{isArabic ? 'المحاضرات' : 'Lessons'}</p>
              <h3 className="mt-2 text-xl font-black text-slate-900">{subject?.name || (isArabic ? 'دروس المادة' : 'Subject lessons')}</h3>
            </div>
            <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">{lessonItems.length}</span>
          </div>

          <div className="mt-4 space-y-3 max-h-[58vh] overflow-auto pr-1">
            {lessonItems.length ? lessonItems.map((lesson, index) => {
              const active = String(lesson.id) === String(selectedLesson?.id);
              return (
                <button
                  key={lesson.id}
                  type="button"
                  onClick={() => {
                    clearAutoNext();
                    setSelectedLessonId(String(lesson.id));
                  }}
                  className={`group flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left transition ${active ? 'border-indigo-300 bg-indigo-50 shadow-sm' : 'border-slate-200 bg-white hover:border-indigo-200 hover:bg-slate-50'}`}
                >
                  <div className="mt-1">
                    <input
                      type="checkbox"
                      checked={Boolean(lesson.isCompleted) || isLessonCompleted(lesson.id)}
                      onChange={(event) => {
                        event.stopPropagation();
                        void markLessonCompletion(lesson.id, event.target.checked);
                      }}
                      onClick={(event) => event.stopPropagation()}
                      className="h-4 w-4 cursor-pointer"
                    />
                  </div>
                  <div className={`mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${active ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    <PlayCircle size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <p className={`truncate text-sm font-bold ${active ? 'text-indigo-700' : 'text-slate-900'}`}>{lesson.title || lesson.name}</p>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                      <Clock3 size={13} />
                      <span>{lesson.duration || (isArabic ? `محاضرة ${index + 1}` : `Lesson ${index + 1}`)}</span>
                    </div>
                  </div>
                </button>
              );
            }) : (
              <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">{isArabic ? 'لا توجد دروس متاحة بعد.' : 'No lessons are available yet.'}</div>
            )}
          </div>
        </aside>
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
