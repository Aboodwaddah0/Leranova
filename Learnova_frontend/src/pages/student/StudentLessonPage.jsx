import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileText, MessageCircle, PlayCircle, ArrowLeft, CircleCheckBig, Brain, ClipboardList, Map, BookOpen, Send } from 'lucide-react';
import StudentLayout from '../../components/student/StudentLayout';
import Flashcards from '../../components/student/Flashcards';
import MindMap from '../../components/student/MindMap';
import Quiz from '../../components/student/Quiz';
import { useLanguage } from '../../utils/i18n';
import {
  createLessonComment,
  fetchLessonComments,
  fetchLessonDetails,
  fetchSubjectLessons,
  updateStudentLessonProgress,
  fetchLessonAiContent,
  fetchStudentLessonQuiz,
  submitStudentQuizAttempt,
  fetchLessonRagStatus,
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
  const [commentText, setCommentText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [progressTick, setProgressTick] = useState(0);
  const [autoNextCountdown, setAutoNextCountdown] = useState(null);
  const autoNextIntervalRef = useRef(null);
  const [aiContent, setAiContent] = useState(null);
  const [flashcardsLoading, setFlashcardsLoading] = useState(false);
  const [mindmapLoading, setMindmapLoading] = useState(false);
  const [flashcardsError, setFlashcardsError] = useState('');
  const [mindmapError, setMindmapError] = useState('');
  const [lessonQuiz, setLessonQuiz] = useState(null);
  const [quizSubmitting, setQuizSubmitting] = useState(false);
  const [ragStatus, setRagStatus] = useState(null);
  const ragPollRef = useRef(null);
  const [activeSection, setActiveSection] = useState(null);


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

  useEffect(() => {
    if (!numericLessonId) return;
    if (ragPollRef.current) { clearInterval(ragPollRef.current); ragPollRef.current = null; }
    setRagStatus(null);

    const poll = async () => {
      try {
        const res = await fetchLessonRagStatus(numericLessonId, 0);
        if (res?.ready) {
          setRagStatus({ status: 'ready', chunkCount: res.chunkCount });
          if (ragPollRef.current) { clearInterval(ragPollRef.current); ragPollRef.current = null; }
        } else if (res?.status === 'failed') {
          setRagStatus({ status: 'failed' });
          if (ragPollRef.current) { clearInterval(ragPollRef.current); ragPollRef.current = null; }
        } else {
          setRagStatus({ status: 'processing' });
        }
      } catch { /* silent */ }
    };

    poll();
    ragPollRef.current = setInterval(poll, 6000);

    return () => { if (ragPollRef.current) { clearInterval(ragPollRef.current); ragPollRef.current = null; } };
  }, [numericLessonId]);

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

  const lang = isArabic ? 'ar' : 'en';

  const loadInitialAiContent = async () => {
    setFlashcardsLoading(true);
    setMindmapLoading(true);
    setFlashcardsError('');
    setMindmapError('');
    try {
      const data = await fetchLessonAiContent(numericLessonId, lang);
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

  useEffect(() => {
    if (Number.isFinite(numericLessonId) && numericLessonId > 0) {
      setAiContent(null);
      loadInitialAiContent();
      // Load quiz (published only — null if no quiz or not published)
      fetchStudentLessonQuiz(numericLessonId, lang).then(setLessonQuiz).catch(() => setLessonQuiz(null));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numericLessonId, lang]);

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

  const videoPlayFiredRef = useRef(false);

  // Reset per-lesson on lessonId change
  useEffect(() => { videoPlayFiredRef.current = false; }, [numericLessonId]);

  const onVideoPlay = () => {
    if (videoPlayFiredRef.current) return;
    videoPlayFiredRef.current = true;
    // Fire lesson.viewed → touchStreak (no XP, streak-safe)
    void updateStudentLessonProgress(numericLessonId, false).catch(() => {});
  };

  const onVideoEnded = () => {
    videoPlayFiredRef.current = true; // prevent duplicate view dispatch
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
      {loading ? (
        <div className="space-y-4">
          <div className="h-10 w-48 animate-pulse rounded-full bg-white/60" />
          <div className="h-[380px] animate-pulse rounded-3xl bg-white/60" />
          <div className="h-32 animate-pulse rounded-3xl bg-white/60" />
        </div>
      ) : null}
      {error ? <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-900">{error}</div> : null}

      {!loading && (
      <div className="grid gap-6 xl:grid-cols-[1fr_300px]">
        {/* ── Main content ─────────────────────────────────────────── */}
        <section className="min-w-0 space-y-5">
          {/* ── Top nav ── */}
          <div className="flex items-center justify-between gap-3">
            <Link
              to={lesson?.subject?.id && lesson?.course?.id ? `/courses/${lesson.course.id}/subjects/${lesson.subject.id}` : '/courses'}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 shadow-sm"
            >
              <ArrowLeft size={16} />
              {isArabic ? 'رجوع' : 'Back'}
            </Link>
            <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-bold text-slate-600 shadow-sm">
              <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: courseProgress.total ? `${(courseProgress.completed / courseProgress.total) * 100}%` : '0%' }} />
              </div>
              {courseProgress.completed}/{courseProgress.total} {isArabic ? 'منجز' : 'done'}
            </div>
          </div>

          {/* ── Lesson header card ── */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl bg-gradient-to-br from-indigo-600 via-purple-600 to-cyan-500 p-6 text-white shadow-xl shadow-indigo-500/20">
            <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold tracking-widest text-blue-200 uppercase">
              <span className="rounded-full bg-white/15 px-3 py-1">{courseTitle}</span>
              <span className="text-white/40">›</span>
              <span className="rounded-full bg-white/15 px-3 py-1">{subjectTitle}</span>
            </div>
            <h1 className="mt-3 text-2xl font-black leading-snug">{lessonTitle}</h1>
            {lessonDescription ? <p className="mt-2 text-sm text-blue-100/90 leading-relaxed max-w-2xl">{lessonDescription}</p> : null}
          </motion.div>

          {/* ── Video player ── */}
          <div className="overflow-hidden rounded-3xl bg-slate-950 shadow-2xl">
            {lesson?.videoUrl ? (
              <>
                <video ref={videoRef} controls preload="auto" src={lesson.videoUrl}
                  className="w-full max-h-[420px] object-cover"
                  onPlay={onVideoPlay} onEnded={onVideoEnded} />
                {autoNextCountdown ? (
                  <div className="border-t border-slate-800 bg-slate-900/90 px-5 py-2.5 text-xs font-semibold text-cyan-300">
                    {isArabic ? `الدرس التالي خلال ${autoNextCountdown}ث...` : `Next lesson in ${autoNextCountdown}s...`}
                  </div>
                ) : null}
              </>
            ) : (
              <div className="flex h-72 items-center justify-center bg-[radial-gradient(circle_at_top,_#1e293b_0%,_#020617_75%)]">
                <div className="text-center text-slate-400">
                  <PlayCircle size={48} className="mx-auto text-slate-600" />
                  <p className="mt-3 text-sm font-semibold">{isArabic ? 'لا يوجد فيديو لهذا الدرس' : 'No video for this lesson'}</p>
                </div>
              </div>
            )}
            {ragStatus ? (
              <div className={`flex items-center gap-2 border-t px-5 py-2.5 text-xs font-semibold ${
                ragStatus.status === 'ready' ? 'border-emerald-800 bg-emerald-950/80 text-emerald-300'
                : ragStatus.status === 'failed' ? 'border-red-800 bg-red-950/80 text-red-300'
                : 'border-slate-700 bg-slate-900/80 text-blue-300'}`}>
                <span>{ragStatus.status === 'ready' ? '✅' : ragStatus.status === 'failed' ? '❌' : <span className="inline-block animate-spin">⏳</span>}</span>
                <span>{ragStatus.status === 'ready'
                  ? (isArabic ? `جاهز للمساعد الذكي — ${ragStatus.chunkCount} مقطع` : `AI ready — ${ragStatus.chunkCount} chunks`)
                  : ragStatus.status === 'failed'
                  ? (isArabic ? 'فشل فهرسة المحتوى' : 'Content indexing failed')
                  : (isArabic ? 'جارٍ فهرسة المحتوى...' : 'Indexing content...')}</span>
              </div>
            ) : null}
          </div>

          {/* ── Section navigation bar ── */}
          {(() => {
            const isPublished = aiContent?.published === true;
            const navItems = [
              { id: 'flashcards', label: isArabic ? 'البطاقات' : 'Flashcards', icon: Brain,        color: 'indigo', available: isPublished && aiContent?.flashcards?.length > 0 },
              { id: 'mindmap',    label: isArabic ? 'الخريطة'  : 'Mind Map',   icon: Map,          color: 'purple', available: isPublished && !!aiContent?.mindmap },
              ...(lessonQuiz         ? [{ id: 'quiz',        label: isArabic ? 'الاختبار'  : 'Quiz',        icon: ClipboardList, color: 'amber',  available: true }] : []),
              { id: 'comments',   label: isArabic ? 'التعليقات' : 'Comments',  icon: MessageCircle, color: 'slate',  available: true },
              ...(selectedAttachment.length ? [{ id: 'attachments', label: isArabic ? 'الملفات' : 'Files', icon: FileText, color: 'blue', available: true }] : []),
            ];
            const colorMap = {
              indigo: { active: 'bg-indigo-600 text-white shadow-indigo-200', dot: 'bg-indigo-500' },
              purple: { active: 'bg-purple-600 text-white shadow-purple-200', dot: 'bg-purple-500' },
              amber:  { active: 'bg-amber-500  text-white shadow-amber-200',  dot: 'bg-amber-400'  },
              slate:  { active: 'bg-slate-800  text-white shadow-slate-200',  dot: 'bg-slate-500'  },
              blue:   { active: 'bg-blue-600   text-white shadow-blue-200',   dot: 'bg-blue-500'   },
            };
            return (
              <div className="flex flex-wrap gap-2">
                {navItems.map(({ id, label, icon: Icon, color, available }) => {
                  const active = activeSection === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setActiveSection(activeSection === id ? null : id)}
                      className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition-all ${
                        active
                          ? `${colorMap[color].active} shadow-md`
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Icon size={15} />
                      {label}
                      {available && !active && (
                        <span className="h-2 w-2 rounded-full bg-emerald-400" title={isArabic ? 'متاح' : 'Available'} />
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })()}

          {/* ── Active section content ── */}

          {/* 🃏 Flashcards */}
          {activeSection === 'flashcards' && (
            <section className="overflow-hidden rounded-3xl border border-indigo-100 bg-white shadow-sm">
              <div className="flex items-center gap-3 border-b border-indigo-50 bg-gradient-to-r from-indigo-50 to-white px-6 py-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-sm shadow-indigo-300">
                  <Brain size={17} />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-900">{isArabic ? 'البطاقات التعليمية' : 'Flashcards'}</h2>
                  <p className="text-xs text-slate-500">{isArabic ? 'اضغط على البطاقة لرؤية الإجابة' : 'Tap a card to reveal the answer'}</p>
                </div>
                {aiContent?.flashcards?.length ? (
                  <span className="ms-auto rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700">
                    {aiContent.flashcards.length} {isArabic ? 'بطاقة' : 'cards'}
                  </span>
                ) : null}
              </div>
              <div className="p-6">
                <Flashcards
                  cards={aiContent?.flashcards || []}
                  isArabic={isArabic}
                  loading={flashcardsLoading}
                  error={flashcardsError}
                  published={aiContent?.published === true}
                />
              </div>
            </section>
          )}

          {/* 🗺️ Mind Map */}
          {activeSection === 'mindmap' && (
            <section className="overflow-hidden rounded-3xl border border-purple-100 bg-white shadow-sm">
              <div className="flex items-center gap-3 border-b border-purple-50 bg-gradient-to-r from-purple-50 to-white px-6 py-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-purple-600 text-white shadow-sm shadow-purple-300">
                  <Map size={17} />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-900">{isArabic ? 'الخريطة الذهنية' : 'Mind Map'}</h2>
                  <p className="text-xs text-slate-500">{isArabic ? 'اسحب العقد لإعادة الترتيب' : 'Drag nodes to rearrange'}</p>
                </div>
              </div>
              <div className="p-6">
                <MindMap
                  mindmap={aiContent?.mindmap || null}
                  lessonTitle={lessonTitle}
                  isArabic={isArabic}
                  loading={mindmapLoading}
                  error={mindmapError}
                  published={aiContent?.published === true}
                />
              </div>
            </section>
          )}

          {/* 🧠 Quiz */}
          {activeSection === 'quiz' && lessonQuiz && (
            <section className="overflow-hidden rounded-3xl border border-amber-100 bg-white shadow-sm">
              <div className="flex items-center gap-3 border-b border-amber-50 bg-gradient-to-r from-amber-50 to-white px-6 py-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-sm shadow-amber-300">
                  <ClipboardList size={17} />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-900">{isArabic ? 'الاختبار' : 'Quiz'}</h2>
                  <p className="text-xs text-slate-500">{isArabic ? 'أجب على الأسئلة وسجّل درجتك' : 'Answer questions and record your score'}</p>
                </div>
              </div>
              <div className="p-6">
                <Quiz
                  quiz={lessonQuiz}
                  isArabic={isArabic}
                  submitting={quizSubmitting}
                  onSubmit={async (answers) => {
                    setQuizSubmitting(true);
                    try { return await submitStudentQuizAttempt(numericLessonId, answers, lang); }
                    catch { return null; } finally { setQuizSubmitting(false); }
                  }}
                />
              </div>
            </section>
          )}

          {/* 📎 Attachments */}
          {activeSection === 'attachments' && selectedAttachment.length > 0 && (
            <section className="overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-sm">
              <div className="flex items-center gap-3 border-b border-blue-50 bg-gradient-to-r from-blue-50 to-white px-6 py-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm shadow-blue-300">
                  <FileText size={17} />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-900">{isArabic ? 'المرفقات' : 'Attachments'}</h2>
                  <p className="text-xs text-slate-500">{selectedAttachment.length} {isArabic ? 'ملف' : 'files'}</p>
                </div>
              </div>
              <div className="space-y-2 p-4">
                {selectedAttachment.map((att) => (
                  <a key={att.id} href={att.url || undefined} download={resolveDownloadName(att)}
                    className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-blue-50 hover:border-blue-200">
                    <FileText size={16} className="shrink-0 text-blue-500" />
                    <span className="flex-1 truncate">{resolveDownloadName(att)}</span>
                    <span className="shrink-0 text-xs text-slate-400">{isArabic ? 'تحميل' : 'Download'}</span>
                  </a>
                ))}
              </div>
            </section>
          )}

          {/* 💬 Comments */}
          {activeSection === 'comments' && (
            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-6 py-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-800 text-white shadow-sm">
                  <MessageCircle size={17} />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-900">{isArabic ? 'التعليقات' : 'Comments'}</h2>
                  <p className="text-xs text-slate-500">{comments.length} {isArabic ? 'تعليق' : 'comments'}</p>
                </div>
              </div>
              <div className="space-y-4 p-5">
                <div className="flex gap-3">
                  <input
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onPostComment(); } }}
                    placeholder={isArabic ? 'اكتب تعليقًا...' : 'Write a comment...'}
                    dir={isArabic ? 'rtl' : 'ltr'}
                    className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-indigo-400 focus:bg-white"
                  />
                  <button onClick={onPostComment}
                    className="flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-700">
                    <Send size={14} />
                    {isArabic ? 'نشر' : 'Post'}
                  </button>
                </div>
                <div className="space-y-3">
                  {comments.length ? comments.map((comment) => (
                    <article key={comment.id} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                      <p className="text-xs font-bold text-indigo-600">{comment.user?.name || (isArabic ? 'طالب' : 'Student')}</p>
                      <p className="mt-1 text-sm text-slate-700 leading-relaxed">{comment.content}</p>
                    </article>
                  )) : (
                    <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-400">
                      {isArabic ? 'لا توجد تعليقات بعد. كن أول من يعلّق!' : 'No comments yet. Be the first!'}
                    </p>
                  )}
                </div>
              </div>
            </section>
          )}

        </section>

        {/* ── Sidebar: lesson navigation ── */}
        <aside className="space-y-4">
          <div className="sticky top-4 space-y-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <BookOpen size={14} className="text-indigo-500" />
                <p className="text-xs font-bold uppercase tracking-widest text-indigo-600">{isArabic ? 'محتوى المادة' : 'Course Content'}</p>
              </div>
              <div className="space-y-1.5 max-h-[60vh] overflow-y-auto pr-1">
                {subjectLessons.length ? subjectLessons.map((item) => {
                  const isCurrent = Number(item.id) === numericLessonId;
                  const done = isLessonCompleted(item.id);
                  return (
                    <div
                      key={item.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => { if (!isCurrent) navigate(`/lessons/${item.id}`); }}
                      onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !isCurrent) { e.preventDefault(); navigate(`/lessons/${item.id}`); } }}
                      className={`flex items-center gap-2.5 rounded-2xl px-3 py-2.5 text-sm transition cursor-pointer ${
                        isCurrent ? 'bg-indigo-600 text-white font-bold' : 'text-slate-700 hover:bg-slate-50 font-medium'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={done}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          e.stopPropagation();
                          setLessonCompleted(item.id, e.target.checked);
                          void updateStudentLessonProgress(Number(item.id), e.target.checked).catch(() => {});
                        }}
                        className="h-3.5 w-3.5 shrink-0 cursor-pointer accent-indigo-600"
                      />
                      {done
                        ? <CircleCheckBig size={13} className={isCurrent ? 'text-green-300 shrink-0' : 'text-emerald-500 shrink-0'} />
                        : <PlayCircle size={13} className="shrink-0 opacity-60" />}
                      <span className="line-clamp-2 leading-tight">{item.title || item.name}</span>
                    </div>
                  );
                }) : (
                  <p className="px-3 py-4 text-xs text-center text-slate-400">{isArabic ? 'لا توجد دروس.' : 'No lessons.'}</p>
                )}
              </div>
            </div>

            {/* Lesson meta card */}
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm text-sm space-y-2">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">{isArabic ? 'معلومات' : 'Info'}</p>
              <div className="flex justify-between text-slate-600">
                <span className="text-xs">{isArabic ? 'المادة' : 'Subject'}</span>
                <span className="text-xs font-semibold text-slate-900 truncate max-w-[130px]">{subjectTitle}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span className="text-xs">{isArabic ? 'المرفقات' : 'Attachments'}</span>
                <span className="text-xs font-semibold text-slate-900">{selectedAttachment.length}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span className="text-xs">{isArabic ? 'التعليقات' : 'Comments'}</span>
                <span className="text-xs font-semibold text-slate-900">{comments.length}</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
      )}

    </StudentLayout>
  );
}