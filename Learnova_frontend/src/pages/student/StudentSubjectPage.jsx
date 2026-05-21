import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Brain, ClipboardList, Clock3, CreditCard, FileText, Lock, Map, MessageCircle, PlayCircle, SendHorizontal } from 'lucide-react';
import StudentLayout from '../../components/student/StudentLayout';
import AIAssistantSidebar from '../../components/student/AIAssistantSidebar';
import Flashcards from '../../components/student/Flashcards';
import MindMap from '../../components/student/MindMap';
import Quiz from '../../components/student/Quiz';
import {
  createLessonComment,
  fetchAcademyTrackSubjects,
  fetchCourseSubjects,
  fetchLessonAiContent,
  fetchLessonComments,
  fetchStudentContext,
  fetchStudentCourseCatalog,
  fetchSubjectLessons,
  regenerateLessonFlashcards,
  regenerateLessonMindmap,
  fetchStudentLessonQuiz,
  submitStudentQuizAttempt,
  subscribeAcademyMaterial,
  updateStudentLessonProgress,
} from '../../services/studentService';
import { useLanguage } from '../../utils/i18n';
import { isLessonCompleted, setLessonCompleted, subscribeToProgress } from '../../utils/studentProgress';
import { useTheme } from '../../contexts/ThemeContext';

export default function StudentSubjectPage() {
  const { isArabic } = useLanguage();
  const { isDark } = useTheme();
  const T = {
    wrap:        isDark ? '#0d0c22'                 : 'rgba(255,255,255,0.85)',
    wrapBorder:  isDark ? 'rgba(255,255,255,0.08)'  : 'rgba(255,255,255,0.7)',
    card:        isDark ? '#111029'                 : '#ffffff',
    cardBorder:  isDark ? 'rgba(255,255,255,0.08)'  : '#e2e8f0',
    panel:       isDark ? '#111029'                 : 'rgba(255,255,255,0.85)',
    innerBg:     isDark ? 'rgba(255,255,255,0.04)'  : '#f8fafc',
    innerBorder: isDark ? 'rgba(255,255,255,0.07)'  : '#e2e8f0',
    text:        isDark ? '#f1f0f5'                 : '#0f172a',
    sub:         isDark ? 'rgba(255,255,255,0.5)'   : '#475569',
    muted:       isDark ? 'rgba(255,255,255,0.32)'  : '#64748b',
    accent:      isDark ? '#818cf8'                 : '#4f46e5',
    tabInactive: isDark ? 'rgba(255,255,255,0.07)'  : '#f1f5f9',
    tabText:     isDark ? 'rgba(255,255,255,0.6)'   : '#374151',
    divider:     isDark ? 'rgba(255,255,255,0.07)'  : '#f1f5f9',
    badge:       isDark ? 'rgba(129,140,248,0.15)'  : '#eef2ff',
    badgeText:   isDark ? '#818cf8'                 : '#4338ca',
    inputBg:     isDark ? 'rgba(255,255,255,0.05)'  : '#ffffff',
    inputBorder: isDark ? 'rgba(255,255,255,0.1)'   : '#e2e8f0',
    lessonActive:isDark ? 'rgba(99,102,241,0.15)'   : '#eef2ff',
    lessonActiveBorder: isDark ? 'rgba(129,140,248,0.5)' : '#a5b4fc',
    lessonIconAct: isDark ? '#818cf8'               : '#ffffff',
    lessonIconActBg: isDark ? 'rgba(129,140,248,0.2)' : '#4f46e5',
    lessonIconBg:isDark ? 'rgba(255,255,255,0.07)'  : '#f1f5f9',
    lessonIconTx:isDark ? 'rgba(255,255,255,0.5)'   : '#475569',
    autoNext:    isDark ? 'rgba(99,102,241,0.12)'   : '#eef2ff',
    autoNextBorder: isDark ? 'rgba(129,140,248,0.3)' : '#c7d2fe',
    autoNextText:isDark ? '#818cf8'                 : '#4338ca',
    errBg:       isDark ? 'rgba(251,191,36,0.08)'   : '#fffbeb',
    errBorder:   isDark ? 'rgba(251,191,36,0.3)'    : '#fde68a',
    errText:     isDark ? '#fbbf24'                 : '#92400e',
    lockBg:      isDark ? 'rgba(251,191,36,0.08)'   : '#fffbeb',
    lockBorder:  isDark ? 'rgba(251,191,36,0.3)'    : '#fde68a',
    lockText:    isDark ? '#fbbf24'                 : '#92400e',
    emptyBorder: isDark ? 'rgba(255,255,255,0.12)'  : '#e2e8f0',
    emptyText:   isDark ? 'rgba(255,255,255,0.3)'   : '#94a3b8',
    commentUser: isDark ? '#f1f0f5'                 : '#0f172a',
    commentBody: isDark ? 'rgba(255,255,255,0.6)'   : '#374151',
  };
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
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [lessonTab, setLessonTab] = useState('attachments');
  const autoNextIntervalRef = useRef(null);
  const [aiContent, setAiContent] = useState(null);
  const [flashcardsLoading, setFlashcardsLoading] = useState(false);
  const [mindmapLoading, setMindmapLoading] = useState(false);
  const [flashcardsError, setFlashcardsError] = useState('');
  const [mindmapError, setMindmapError] = useState('');
  const [lessonQuiz, setLessonQuiz] = useState(null);
  const [quizSubmitting, setQuizSubmitting] = useState(false);

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

        let isEffectivelyLocked = false;
        if (context?.mode === 'ACADEMY') {
          const academySubject = (trackData?.subjects || []).find((item) => Number(item.id) === numericSubjectId) || null;
          // academySubject has isSubscribed; matchedSubject (from getSubjects) does not
          const refSubject = academySubject || matchedSubject;
          isEffectivelyLocked = Boolean(refSubject?.isPaid && !refSubject?.isSubscribed);
          if (academySubject) {
            matchedSubject = matchedSubject || academySubject;
          }
          setIsLocked(isEffectivelyLocked);
        } else {
          setIsLocked(false);
        }

        let lessonData = [];
        if (!isEffectivelyLocked) {
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
  const selectedAttachments = useMemo(() => {
    const list = Array.isArray(selectedLesson?.attachments) ? selectedLesson.attachments : [];
    return list.filter((attachment) => String(attachment.fileType || attachment.type || '').toUpperCase() !== 'VIDEO');
  }, [selectedLesson]);
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
        setLessonTab('attachments');
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

  useEffect(() => {
    let cancelled = false;

    const loadComments = async () => {
      if (!selectedLesson?.id) {
        setComments([]);
        return;
      }

      setCommentsLoading(true);
      try {
        const commentItems = await fetchLessonComments(selectedLesson.id);
        if (!cancelled) {
          setComments(Array.isArray(commentItems) ? commentItems : []);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError?.message || (isArabic ? 'فشل تحميل التعليقات.' : 'Failed to load comments.'));
          setComments([]);
        }
      } finally {
        if (!cancelled) {
          setCommentsLoading(false);
        }
      }
    };

    loadComments();

    return () => {
      cancelled = true;
    };
  }, [isArabic, selectedLesson?.id]);

  const onPostComment = async () => {
    const normalized = String(commentText || '').trim();
    if (!selectedLesson?.id || !normalized) {
      return;
    }

    try {
      const created = await createLessonComment(selectedLesson.id, normalized);
      setComments((current) => [created, ...current]);
      setCommentText('');
    } catch (submitError) {
      setError(submitError?.message || (isArabic ? 'فشل نشر التعليق.' : 'Failed to post comment.'));
    }
  };

  const lang = isArabic ? 'ar' : 'en';

  const loadInitialAiContent = async (lessonId) => {
    setFlashcardsLoading(true);
    setMindmapLoading(true);
    setFlashcardsError('');
    setMindmapError('');
    try {
      const data = await fetchLessonAiContent(lessonId, lang);
      setAiContent(data);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || (isArabic ? 'فشل توليد المحتوى.' : 'Failed to generate content.');
      setFlashcardsError(msg);
      setMindmapError(msg);
    } finally {
      setFlashcardsLoading(false);
      setMindmapLoading(false);
    }
  };

  const regenFlashcards = async () => {
    const lessonId = selectedLesson?.id;
    if (!lessonId) return;
    setFlashcardsLoading(true);
    setFlashcardsError('');
    try {
      const data = await regenerateLessonFlashcards(lessonId, lang);
      setAiContent((prev) => ({ ...prev, flashcards: data?.flashcards ?? [] }));
    } catch (err) {
      setFlashcardsError(err?.response?.data?.message || err?.message || (isArabic ? 'فشل توليد البطاقات.' : 'Failed to generate flashcards.'));
    } finally {
      setFlashcardsLoading(false);
    }
  };

  const regenMindmap = async () => {
    const lessonId = selectedLesson?.id;
    if (!lessonId) return;
    setMindmapLoading(true);
    setMindmapError('');
    try {
      const data = await regenerateLessonMindmap(lessonId, lang);
      setAiContent((prev) => ({ ...prev, mindmap: data?.mindmap ?? null }));
    } catch (err) {
      setMindmapError(err?.response?.data?.message || err?.message || (isArabic ? 'فشل توليد الخريطة.' : 'Failed to generate mind map.'));
    } finally {
      setMindmapLoading(false);
    }
  };

  useEffect(() => {
    if (selectedLesson?.id) {
      setAiContent(null);
      setFlashcardsError('');
      setMindmapError('');
      setLessonQuiz(null);
      loadInitialAiContent(selectedLesson.id);
      fetchStudentLessonQuiz(selectedLesson.id, lang).then(setLessonQuiz).catch(() => setLessonQuiz(null));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLesson?.id, lang]);

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
      {loading ? <div className="ln-skeleton h-64 rounded-[1.75rem]" /> : null}
      {error ? <div className="mb-5 rounded-[1.75rem] px-5 py-4 text-sm" style={{ background: T.errBg, border: `1px solid ${T.errBorder}`, color: T.errText }}>{error}</div> : null}
      <section className="rounded-[2rem] p-5 shadow-xl shadow-indigo-500/5 backdrop-blur-xl" style={{ border: `1px solid ${T.wrapBorder}`, background: T.wrap }}>
        <div className="relative overflow-hidden rounded-[1.5rem] bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-500 p-5 text-white">
          {subject?.imageUrl && (
            <img src={subject.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-20" />
          )}
          <div className="relative flex flex-wrap items-start justify-between gap-3">
            <Link to={`/courses/${numericCourseId}`} className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20">
              <ArrowLeft size={16} /> {isArabic ? 'العودة للمسار' : 'Back to track'}
            </Link>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-blue-100">{isArabic ? 'تركيز المادة' : 'Subject focus'}</p>
          </div>
          <div className="relative mt-4 flex items-center gap-4">
            {subject?.imageUrl && (
              <img src={subject.imageUrl} alt={subject.name} className="h-16 w-16 flex-shrink-0 rounded-2xl object-cover shadow-lg ring-2 ring-white/30" />
            )}
            <div>
              <h1 className="text-3xl font-black">{subject?.name || (isArabic ? 'دروس المادة' : 'Subject lessons')}</h1>
              <p className="mt-1 max-w-3xl text-sm text-blue-50/90">{subject?.description || (isArabic ? 'اختر درسًا لفتح مساحة الدراسة الكاملة.' : 'Pick a lesson to open the full study view.')}</p>
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            { label: isArabic ? 'الكورس' : 'Course', value: courseName },
            { label: isArabic ? 'المادة' : 'Subject', value: subject?.name || (isArabic ? 'مادة غير معروفة' : 'Unknown subject'), level: subject?.level },
            { label: isArabic ? 'الإنجاز' : 'Completion', value: `${lessonProgress.completed}/${lessonProgress.total} (${lessonProgress.percent}%)` },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl p-4 shadow-sm" style={{ border: `1px solid ${T.cardBorder}`, background: T.card }}>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: T.muted }}>{item.label}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold" style={{ color: T.text }}>{item.value}</p>
                {item.level && (
                  <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${
                    item.level === 'BEGINNER' ? 'bg-emerald-100 text-emerald-700' :
                    item.level === 'INTERMEDIATE' ? 'bg-blue-100 text-blue-700' :
                    item.level === 'ADVANCED' ? 'bg-violet-100 text-violet-700' : 'bg-rose-100 text-rose-700'
                  }`}>
                    {isArabic ? (item.level === 'BEGINNER' ? 'مبتدئ' : item.level === 'INTERMEDIATE' ? 'متوسط' : item.level === 'ADVANCED' ? 'متقدم' : 'خبير') : item.level.charAt(0) + item.level.slice(1).toLowerCase()}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

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
        <section className="space-y-6 overflow-hidden rounded-[1.75rem] border border-white/70 bg-white/85 p-0 shadow-xl shadow-indigo-500/5 backdrop-blur-xl">
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

          <div className="px-5 pb-5">
            <div className="flex flex-wrap gap-2 border-b border-slate-100 pb-4">
              <button
                type="button"
                onClick={() => setLessonTab('attachments')}
                className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition ${lessonTab === 'attachments' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
              >
                <FileText size={15} /> {isArabic ? 'المرفقات' : 'Attachments'}
                <span className={`rounded-full px-2 py-0.5 text-[11px] ${lessonTab === 'attachments' ? 'bg-white/20 text-white' : 'bg-white text-indigo-700'}`}>{selectedAttachments.length}</span>
              </button>
              <button
                type="button"
                onClick={() => setLessonTab('comments')}
                className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition ${lessonTab === 'comments' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
              >
                <MessageCircle size={15} /> {isArabic ? 'التعليقات' : 'Comments'}
                <span className={`rounded-full px-2 py-0.5 text-[11px] ${lessonTab === 'comments' ? 'bg-white/20 text-white' : 'bg-white text-indigo-700'}`}>{comments.length}</span>
              </button>
              <button
                type="button"
                onClick={() => setLessonTab('flashcards')}
                className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition ${lessonTab === 'flashcards' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
              >
                <Brain size={15} /> {isArabic ? 'البطاقات التعليمية' : 'Flashcards'}
              </button>
              <button
                type="button"
                onClick={() => setLessonTab('mindmap')}
                className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition ${lessonTab === 'mindmap' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
              >
                <Map size={15} /> {isArabic ? 'الخريطة الذهنية' : 'Mind Map'}
              </button>
              {lessonQuiz ? (
                <button
                  type="button"
                  onClick={() => setLessonTab('quiz')}
                  className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition ${lessonTab === 'quiz' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                >
                  <ClipboardList size={15} /> 🧠 {isArabic ? 'الاختبار' : 'Quiz'}
                </button>
              ) : null}
            </div>

            {lessonTab === 'attachments' ? (
              <article className="mt-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="space-y-3 max-h-64 overflow-auto pr-1">
                  {selectedAttachments.length ? selectedAttachments.map((attachment) => (
                    <a
                      key={attachment.id}
                      href={attachment.url || attachment.fileUrl || '#'}
                      target="_blank"
                      rel="noreferrer"
                      className="block rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm transition hover:bg-slate-50"
                    >
                      <p className="font-bold text-slate-900">{attachment.name || attachment.originalName || (isArabic ? 'مرفق' : 'Attachment')}</p>
                      <p className="mt-1 text-xs text-slate-500">{attachment.mimeType || attachment.fileType || attachment.type || (isArabic ? 'ملف' : 'file')}</p>
                    </a>
                  )) : (
                    <p className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-500">{isArabic ? 'لا توجد مرفقات لهذا الدرس.' : 'No attachments for this lesson.'}</p>
                  )}
                </div>
              </article>
            ) : null}

            {lessonTab === 'comments' ? (
              <article className="mt-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex gap-2">
                  <input
                    value={commentText}
                    onChange={(event) => setCommentText(event.target.value)}
                    placeholder={isArabic ? 'اكتب تعليق...' : 'Write a comment...'}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-400"
                  />
                  <button
                    type="button"
                    onClick={onPostComment}
                    className="inline-flex h-10 items-center justify-center rounded-xl bg-slate-900 px-3 text-white transition hover:opacity-90"
                    aria-label={isArabic ? 'إرسال التعليق' : 'Send comment'}
                  >
                    <SendHorizontal size={16} />
                  </button>
                </div>

                <div className="mt-3 space-y-2 max-h-64 overflow-auto pr-1">
                  {commentsLoading ? (
                    <p className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-500">{isArabic ? 'جاري تحميل التعليقات...' : 'Loading comments...'}</p>
                  ) : comments.length ? comments.map((comment) => (
                    <article key={comment.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm">
                      <p className="font-semibold text-slate-900">{comment.user?.name || comment.userName || (isArabic ? 'مستخدم' : 'User')}</p>
                      <p className="mt-1 text-slate-700">{comment.content}</p>
                    </article>
                  )) : (
                    <p className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-500">{isArabic ? 'لا توجد تعليقات بعد.' : 'No comments yet.'}</p>
                  )}
                </div>
              </article>
            ) : null}

            {lessonTab === 'flashcards' ? (
              <div className="mt-4">
                <Flashcards
                  cards={aiContent?.flashcards || []}
                  isArabic={isArabic}
                  loading={flashcardsLoading}
                  error={flashcardsError}
                  published={aiContent?.published === true}
                />
              </div>
            ) : null}

            {lessonTab === 'mindmap' ? (
              <div className="mt-4">
                <MindMap
                  mindmap={aiContent?.mindmap || null}
                  lessonTitle={selectedLesson?.title || selectedLesson?.name || ''}
                  isArabic={isArabic}
                  loading={mindmapLoading}
                  error={mindmapError}
                  published={aiContent?.published === true}
                />
              </div>
            ) : null}

            {lessonTab === 'quiz' ? (
              <div className="mt-4">
                <Quiz
                  quiz={lessonQuiz}
                  isArabic={isArabic}
                  submitting={quizSubmitting}
                  onSubmit={async (answers) => {
                    setQuizSubmitting(true);
                    try {
                      return await submitStudentQuizAttempt(selectedLesson?.id, answers, lang);
                    } catch { return null; } finally { setQuizSubmitting(false); }
                  }}
                />
              </div>
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
                    setLessonTab('attachments');
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
                      <div className="flex items-center gap-1.5">
                        <p className={`truncate text-sm font-bold ${active ? 'text-indigo-700' : 'text-slate-900'}`}>{lesson.title || lesson.name}</p>
                        {lesson.quiz?.isPublished ? <span className="flex-shrink-0 text-xs" title={isArabic ? 'يحتوي على اختبار' : 'Has quiz'}>🧠</span> : null}
                      </div>
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

      <AIAssistantSidebar isArabic={isArabic} lessonId={selectedLesson?.id} />
    </StudentLayout>
  );
}
