import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileText, MessageCircle, PlayCircle, ArrowLeft, Settings, CircleCheckBig } from 'lucide-react';
import StudentLayout from '../../components/student/StudentLayout';
import { useLanguage } from '../../utils/i18n';
import {
  createLessonComment,
  fetchLessonComments,
  fetchLessonDetails,
  fetchSubjectLessons,
  updateStudentLessonProgress,
} from '../../services/studentService';
import {
  calculateProgressForLessons,
  isLessonCompleted,
  setLessonCompleted,
  subscribeToProgress,
} from '../../utils/studentProgress';

export default function StudentLessonPage() {
  const { isArabic } = useLanguage();
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const videoRef = useRef(null);
  const numericLessonId = Number(lessonId);
  const [lesson, setLesson] = useState(null);
  const [subjectLessons, setSubjectLessons] = useState([]);
  const [comments, setComments] = useState([]);
  const [tab, setTab] = useState('comments');
  const [commentText, setCommentText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [progressTick, setProgressTick] = useState(0);
  const [autoNextCountdown, setAutoNextCountdown] = useState(null);
  const autoNextIntervalRef = useRef(null);

  const tabs = useMemo(() => ([
    { id: 'comments', label: isArabic ? 'التعليقات' : 'Comments', icon: MessageCircle },
    { id: 'attachments', label: isArabic ? 'المرفقات' : 'Attachments', icon: FileText },
    { id: 'notes', label: isArabic ? 'ملاحظات' : 'Notes', icon: Settings },
  ]), [isArabic]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        const details = await fetchLessonDetails(numericLessonId);
        const lessons = details?.subject?.id ? await fetchSubjectLessons(details.subject.id) : [];
        const lessonComments = await fetchLessonComments(numericLessonId);

        if (cancelled) return;
        setLesson(details);
        setSubjectLessons(lessons || []);
        setComments(lessonComments || []);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError?.message || (isArabic ? 'فشل تحميل الدرس.' : 'Failed to load lesson.'));
          setLesson(null);
          setSubjectLessons([]);
          setComments([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    if (Number.isFinite(numericLessonId)) {
      load();
    }

    return () => {
      cancelled = true;
    };
  }, [isArabic, numericLessonId]);

  const courseTitle = lesson?.course?.name || lesson?.course?.Name || (isArabic ? 'الكورس' : 'Course');
  const subjectTitle = lesson?.subject?.name || lesson?.subject?.Name || (isArabic ? 'المادة' : 'Subject');
  const lessonTitle = lesson?.title || lesson?.name || (isArabic ? 'تفاصيل الدرس' : 'Lesson details');

  const escapeRegex = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const normalizeLessonText = (value, removableText = '') => {
    const withSpacing = String(value || '')
      .replace(/([\u0600-\u06FF])([A-Za-z])/g, '$1 $2')
      .replace(/([A-Za-z])([\u0600-\u06FF])/g, '$1 $2')
      .replace(/\s+/g, ' ')
      .trim();

    if (!withSpacing) return '';

    if (!removableText) {
      return withSpacing;
    }

    const pattern = new RegExp(escapeRegex(removableText), 'gi');
    return withSpacing.replace(pattern, '').replace(/\s{2,}/g, ' ').trim();
  };

  const lessonDescription = normalizeLessonText(
    lesson?.content || lesson?.description || '',
    courseTitle,
  ) || (isArabic ? 'شاهد واقرأ واسأل دون مغادرة الصفحة.' : 'Watch, read, and ask questions without leaving the page.');

  useEffect(() => subscribeToProgress(() => setProgressTick((current) => current + 1)), []);

  const courseLessonIds = useMemo(
    () => subjectLessons.map((item) => Number(item.id)).filter((id) => Number.isInteger(id) && id > 0),
    [subjectLessons],
  );

  const courseProgress = useMemo(
    () => calculateProgressForLessons(courseLessonIds),
    [courseLessonIds, progressTick],
  );

  const currentLessonIndex = useMemo(
    () => subjectLessons.findIndex((item) => Number(item.id) === numericLessonId),
    [subjectLessons, numericLessonId],
  );

  const nextLessonId = useMemo(() => {
    if (currentLessonIndex < 0) return null;
    const next = subjectLessons[currentLessonIndex + 1];
    return next ? Number(next.id) : null;
  }, [subjectLessons, currentLessonIndex]);

  const onVideoEnded = () => {
    setLessonCompleted(numericLessonId, true);
    void updateStudentLessonProgress(numericLessonId, true).catch((updateError) => {
      setError(updateError?.message || (isArabic ? 'فشل تحديث تقدم الدرس.' : 'Failed to update lesson progress.'));
    });

    if (Number.isInteger(nextLessonId) && nextLessonId > 0) {
      let remaining = 5;
      setAutoNextCountdown(remaining);

      if (autoNextIntervalRef.current) {
        window.clearInterval(autoNextIntervalRef.current);
      }

      autoNextIntervalRef.current = window.setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) {
          window.clearInterval(autoNextIntervalRef.current);
          autoNextIntervalRef.current = null;
          setAutoNextCountdown(null);
          navigate(`/lessons/${nextLessonId}`, { state: { autoPlay: true } });
          return;
        }

        setAutoNextCountdown(remaining);
      }, 1000);
    }
  };

  useEffect(() => () => {
    if (autoNextIntervalRef.current) {
      window.clearInterval(autoNextIntervalRef.current);
      autoNextIntervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    const shouldAutoPlay = Boolean(location.state?.autoPlay);
    const videoElement = videoRef.current;
    if (!shouldAutoPlay || !videoElement || !lesson?.videoUrl) return;

    const tryPlay = async () => {
      try {
        await videoElement.play();
      } catch {
        // Ignore autoplay blocking by browser policy.
      }
    };

    tryPlay();
    navigate(location.pathname, { replace: true, state: {} });
  }, [location.state, location.pathname, lesson?.videoUrl, navigate]);

  const selectedAttachment = useMemo(() => {
    const list = Array.isArray(lesson?.attachments) ? lesson.attachments : [];
    // Filter out video attachments since they're displayed separately
    return list.filter((att) => String(att.fileType || '').toUpperCase() !== 'VIDEO');
  }, [lesson]);

  const resolveFallbackNameFromMime = (mimeType) => {
    const mimeToExt = {
      'application/pdf': '.pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
      'application/zip': '.zip',
      'text/plain': '.txt',
    };

    return `file${mimeToExt[String(mimeType || '').toLowerCase()] || ''}`;
  };

  const resolveDownloadName = (attachment) => {
    if (attachment?.originalName) {
      return attachment.originalName;
    }

    return resolveFallbackNameFromMime(attachment?.mimeType);
  };

  const onPostComment = async () => {
    if (!commentText.trim()) return;
    const payload = {
      lesson_id: numericLessonId,
      user_id: lesson?.currentUser?.id || null,
      content: commentText.trim(),
    };

    console.log('[LESSON PAGE] Comment submit started', payload);

    try {
      const created = await createLessonComment(numericLessonId, payload.content);
      setCommentText('');
      setComments((current) => [created, ...current]);
      console.log('[LESSON PAGE] Comment submit succeeded', {
        lesson_id: numericLessonId,
        created_comment_id: created?.id || null,
      });
    } catch (submitError) {
      console.error('[LESSON PAGE] Comment submit failed', {
        lesson_id: numericLessonId,
        contentLength: payload.content.length,
        status: submitError?.response?.status,
        message: submitError?.response?.data?.message || submitError?.message,
      });
      setError(submitError?.response?.data?.message || submitError?.message || (isArabic ? 'فشل نشر التعليق.' : 'Failed to post comment.'));
    }
  };

  return (
    <StudentLayout showAIAssistant>
      {loading ? <div className="h-[34rem] animate-pulse rounded-[1.75rem] border border-white/70 bg-white/85 shadow-xl shadow-indigo-500/5" /> : null}
      {error ? <div className="mb-5 rounded-[1.75rem] border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">{error}</div> : null}
      <div className="grid gap-8 xl:grid-cols-[1.4fr_0.75fr]">
        <section className="space-y-6">
          <div className="flex items-center justify-between gap-3">
            <Link to={lesson?.subject?.id && lesson?.course?.id ? `/courses/${lesson.course.id}/subjects/${lesson.subject.id}` : '/courses'} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
              <ArrowLeft size={16} /> {isArabic ? 'رجوع' : 'Back'}
            </Link>
            <div className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm">
              {isArabic
                ? `${courseProgress.completed}/${courseProgress.total} منجز`
                : `${courseProgress.completed}/${courseProgress.total} completed`}
            </div>
          </div>

          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="overflow-hidden rounded-[2rem] border border-white/70 bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-500 p-6 text-white shadow-xl shadow-indigo-500/15"
          >
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold tracking-[0.2em] text-blue-100">
              <span className="rounded-full bg-white/10 px-3 py-1 uppercase">{courseTitle}</span>
            </div>
            <h1 className="mt-3 text-3xl font-black">{lessonTitle}</h1>
            <p className="mt-2 max-w-3xl text-sm text-blue-50/90">{lessonDescription}</p>
          </motion.section>

          <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-slate-950 shadow-2xl">
            {lesson?.videoUrl ? (
              <div>
                <video
                  ref={videoRef}
                  controls
                  preload="auto"
                  src={lesson.videoUrl}
                  className="h-[360px] w-full object-cover"
                  onEnded={onVideoEnded}
                />
                {autoNextCountdown ? (
                  <div className="border-t border-slate-800 bg-slate-900/90 px-4 py-2 text-xs font-semibold text-cyan-200">
                    {isArabic
                      ? `المحاضرة التالية ستبدأ خلال ${autoNextCountdown} ثوانٍ...`
                      : `Next lesson starts in ${autoNextCountdown}s...`}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="flex h-[360px] items-center justify-center bg-[radial-gradient(circle_at_top,_#1e293b_0%,_#020617_75%)] text-slate-200">
                <div className="text-center">
                  <PlayCircle size={54} className="mx-auto text-cyan-300" />
                  <p className="mt-3 text-xl font-black">{isArabic ? 'معاينة فيديو الدرس' : 'Lesson video preview'}</p>
                  <p className="mt-2 text-sm text-slate-400">{isArabic ? 'الصفحة جاهزة حتى لو لم يوجد رابط فيديو للدرس الحالي.' : 'The page is ready even if the current lesson has no video URL.'}</p>
                </div>
              </div>
            )}
            {null}
          </div>

          <div className="rounded-[1.75rem] border border-white/70 bg-white/85 p-4 shadow-xl shadow-indigo-500/5 backdrop-blur-xl">
            <div className="flex flex-wrap gap-2 border-b border-slate-100 pb-4">
              {tabs.map((item) => {
                const Icon = item.icon;
                const active = tab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTab(item.id)}
                    className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition ${active ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                  >
                    <Icon size={15} />
                    {item.label}
                  </button>
                );
              })}
            </div>

            {tab === 'comments' ? (
              <div className="mt-4 space-y-4">
                <div className="flex gap-3">
                  <input
                    value={commentText}
                    onChange={(event) => setCommentText(event.target.value)}
                    placeholder={isArabic ? 'اكتب تعليقًا...' : 'Write a comment...'}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-400"
                  />
                  <button onClick={onPostComment} className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90">
                    {isArabic ? 'نشر' : 'Post'}
                  </button>
                </div>
                <div className="space-y-3">
                  {comments.length ? comments.map((comment) => (
                    <article key={comment.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                      <p className="text-sm font-semibold text-slate-900">{comment.user?.name || (isArabic ? 'طالب' : 'Student')}</p>
                      <p className="mt-1 text-sm text-slate-600">{comment.content}</p>
                    </article>
                  )) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">{isArabic ? 'لا توجد تعليقات بعد.' : 'No comments yet.'}</div>
                  )}
                </div>
              </div>
            ) : null}

            {tab === 'attachments' ? (
              <div className="mt-4 space-y-3">
                {selectedAttachment.length ? selectedAttachment.map((attachment) => (
                  <a key={attachment.id} href={attachment.url || undefined} download={resolveDownloadName(attachment)} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 transition hover:bg-slate-50">
                    <span className="truncate">{resolveDownloadName(attachment)}</span>
                    <FileText size={16} className="flex-shrink-0 text-indigo-600" />
                  </a>
                )) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">{isArabic ? 'لا توجد مرفقات متاحة.' : 'No attachments available.'}</div>
                )}
              </div>
            ) : null}

            {tab === 'notes' ? (
              <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-600">
                {isArabic
                  ? `هذا الدرس يتبع مادة ${subjectTitle}. تابع بالترتيب للحفاظ على توافق سياق المساعد الذكي.`
                  : `This lesson belongs to ${subjectTitle}. Continue in order to keep the AI tutor context aligned.`}
              </div>
            ) : null}
          </div>
        </section>

        <aside className="space-y-6">
          <div className="rounded-[1.75rem] border border-white/70 bg-white/85 p-5 shadow-xl shadow-indigo-500/5 backdrop-blur-xl">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-indigo-600">{isArabic ? 'محتوى الكورس' : 'Course content'}</p>
            <div className="mt-4 space-y-3">
              {subjectLessons.length ? subjectLessons.map((item) => (
                <div
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    if (Number(item.id) !== numericLessonId) {
                      navigate(`/lessons/${item.id}`);
                    }
                  }}
                  onKeyDown={(event) => {
                    if ((event.key === 'Enter' || event.key === ' ') && Number(item.id) !== numericLessonId) {
                      event.preventDefault();
                      navigate(`/lessons/${item.id}`);
                    }
                  }}
                  className={`flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold transition ${Number(item.id) === numericLessonId ? 'bg-indigo-600 text-white' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
                >
                  <input
                    type="checkbox"
                    checked={isLessonCompleted(item.id)}
                    onClick={(event) => {
                      event.stopPropagation();
                    }}
                    onChange={(event) => {
                      event.stopPropagation();
                      setLessonCompleted(item.id, event.target.checked);
                      void updateStudentLessonProgress(Number(item.id), event.target.checked).catch((updateError) => {
                        setError(updateError?.message || (isArabic ? 'فشل تحديث تقدم الدرس.' : 'Failed to update lesson progress.'));
                      });
                    }}
                    className="h-4 w-4 cursor-pointer"
                  />
                  {isLessonCompleted(item.id) ? <CircleCheckBig size={15} /> : <PlayCircle size={15} />}
                  <span className="line-clamp-1">{item.title || item.name}</span>
                </div>
              )) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">{isArabic ? 'لا توجد دروس متاحة.' : 'No lessons available.'}</div>
              )}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-white/70 bg-gradient-to-br from-indigo-600 to-cyan-500 p-5 text-white shadow-xl shadow-indigo-500/15 backdrop-blur-xl">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-blue-100">{isArabic ? 'معلومات الدرس' : 'Lesson info'}</p>
            <div className="mt-3 space-y-2 text-sm text-blue-50/95">
              <p><span className="font-semibold">{isArabic ? 'العنوان:' : 'Title:'}</span> {lessonTitle}</p>
              <p><span className="font-semibold">{isArabic ? 'المادة:' : 'Subject:'}</span> {subjectTitle}</p>
              <p><span className="font-semibold">{isArabic ? 'المرفقات:' : 'Attachments:'}</span> {selectedAttachment.length}</p>
              <p><span className="font-semibold">{isArabic ? 'التعليقات:' : 'Comments:'}</span> {comments.length}</p>
            </div>
            <p className="mt-4 rounded-xl bg-white/10 px-3 py-2 text-sm leading-6 text-blue-50/90">
              {lessonDescription}
            </p>
          </div>
        </aside>
      </div>
    </StudentLayout>
  );
}
