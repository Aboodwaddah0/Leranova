import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bot, FileText, MessageCircle, PlayCircle, ArrowLeft, Settings, Search, Bell } from 'lucide-react';
import StudentLayout from '../../components/student/StudentLayout';
import {
  askStudentTutor,
  createLessonComment,
  fetchLessonComments,
  fetchLessonDetails,
  fetchSubjectLessons,
} from '../../services/studentService';

const tabs = [
  { id: 'assistant', label: 'AI Assistant', icon: Bot },
  { id: 'comments', label: 'Comments', icon: MessageCircle },
  { id: 'attachments', label: 'Attachments', icon: FileText },
  { id: 'notes', label: 'Notes', icon: Settings },
];

export default function StudentLessonPage() {
  const { lessonId } = useParams();
  const numericLessonId = Number(lessonId);
  const [lesson, setLesson] = useState(null);
  const [subjectLessons, setSubjectLessons] = useState([]);
  const [comments, setComments] = useState([]);
  const [tab, setTab] = useState('assistant');
  const [commentText, setCommentText] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
          setError(loadError?.message || 'Failed to load lesson.');
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
  }, [numericLessonId]);

  const courseTitle = lesson?.course?.name || lesson?.course?.Name || 'Course';
  const subjectTitle = lesson?.subject?.name || lesson?.subject?.Name || 'Subject';

  const selectedAttachment = useMemo(() => {
    const list = Array.isArray(lesson?.attachments) ? lesson.attachments : [];
    return list;
  }, [lesson]);

  const onAsk = async () => {
    if (!question.trim()) return;
    const response = await askStudentTutor({
      question,
      courseId: lesson?.course?.id,
      subjectId: lesson?.subject?.id,
      lessonId: numericLessonId,
    });
    setAnswer(response?.answer || 'Not found in lesson materials.');
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
      setError(submitError?.response?.data?.message || submitError?.message || 'Failed to post comment.');
    }
  };

  return (
    <StudentLayout title="Lesson view" subtitle={lesson?.title || lesson?.name || 'Study space'}>
      {loading ? <div className="h-[34rem] animate-pulse rounded-[1.75rem] border border-white/70 bg-white/85 shadow-xl shadow-indigo-500/5" /> : null}
      {error ? <div className="mb-5 rounded-[1.75rem] border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">{error}</div> : null}
      <div className="grid gap-8 xl:grid-cols-[1.4fr_0.75fr]">
        <section className="space-y-6">
          <div className="flex items-center justify-between gap-3">
            <Link to={lesson?.subject?.id && lesson?.course?.id ? `/courses/${lesson.course.id}/subjects/${lesson.subject.id}` : '/courses'} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
              <ArrowLeft size={16} /> Back
            </Link>
            <div className="flex items-center gap-3 text-slate-500">
              <Search size={18} />
              <Bell size={18} />
              <div className="h-10 w-10 rounded-full border-2 border-indigo-100 bg-gradient-to-br from-indigo-500 to-cyan-500" />
            </div>
          </div>

          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="overflow-hidden rounded-[2rem] border border-white/70 bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-500 p-6 text-white shadow-xl shadow-indigo-500/15"
          >
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-blue-100">{courseTitle}</p>
            <h1 className="mt-2 text-3xl font-black">{lesson?.title || lesson?.name || 'Lesson details'}</h1>
            <p className="mt-2 max-w-3xl text-sm text-blue-50/90">{lesson?.content || lesson?.description || 'Watch, read, and ask questions without leaving the page.'}</p>
          </motion.section>

          <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-slate-950 shadow-2xl">
            {lesson?.videoUrl ? (
              <video controls src={lesson.videoUrl} className="h-[360px] w-full object-cover" />
            ) : (
              <div className="flex h-[360px] items-center justify-center bg-[radial-gradient(circle_at_top,_#1e293b_0%,_#020617_75%)] text-slate-200">
                <div className="text-center">
                  <PlayCircle size={54} className="mx-auto text-cyan-300" />
                  <p className="mt-3 text-xl font-black">Lesson video preview</p>
                  <p className="mt-2 text-sm text-slate-400">The page is ready even if the current lesson has no video URL.</p>
                </div>
              </div>
            )}
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

            {tab === 'assistant' ? (
              <div className="mt-4 space-y-4">
                <div className="rounded-2xl bg-indigo-50 p-4 text-sm text-indigo-900">
                  Ask about this lesson, and Learnova will answer from the current context.
                </div>
                <div className="flex gap-3">
                  <input
                    value={question}
                    onChange={(event) => setQuestion(event.target.value)}
                    placeholder="Ask anything about this lesson..."
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-400"
                  />
                  <button onClick={onAsk} className="rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700">
                    Send
                  </button>
                </div>
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                  {answer || 'Your answer will appear here.'}
                </div>
              </div>
            ) : null}

            {tab === 'comments' ? (
              <div className="mt-4 space-y-4">
                <div className="flex gap-3">
                  <input
                    value={commentText}
                    onChange={(event) => setCommentText(event.target.value)}
                    placeholder="Write a comment..."
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-400"
                  />
                  <button onClick={onPostComment} className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90">
                    Post
                  </button>
                </div>
                <div className="space-y-3">
                  {comments.length ? comments.map((comment) => (
                    <article key={comment.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                      <p className="text-sm font-semibold text-slate-900">{comment.user?.name || 'Student'}</p>
                      <p className="mt-1 text-sm text-slate-600">{comment.content}</p>
                    </article>
                  )) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">No comments yet.</div>
                  )}
                </div>
              </div>
            ) : null}

            {tab === 'attachments' ? (
              <div className="mt-4 space-y-3">
                {selectedAttachment.length ? selectedAttachment.map((attachment) => (
                  <a key={attachment.id} href={attachment.url} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 transition hover:bg-slate-50">
                    <span>{attachment.name}</span>
                    <FileText size={16} className="text-indigo-600" />
                  </a>
                )) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">No attachments available.</div>
                )}
              </div>
            ) : null}

            {tab === 'notes' ? (
              <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-600">
                This lesson belongs to {subjectTitle}. Continue in order to keep the AI tutor context aligned.
              </div>
            ) : null}
          </div>
        </section>

        <aside className="space-y-6">
          <div className="rounded-[1.75rem] border border-white/70 bg-white/85 p-5 shadow-xl shadow-indigo-500/5 backdrop-blur-xl">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-indigo-600">Course content</p>
            <div className="mt-4 space-y-3">
              {subjectLessons.length ? subjectLessons.map((item) => (
                <Link key={item.id} to={`/lessons/${item.id}`} className={`flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold transition ${Number(item.id) === numericLessonId ? 'bg-indigo-600 text-white' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}>
                  <PlayCircle size={15} />
                  <span className="line-clamp-1">{item.title || item.name}</span>
                </Link>
              )) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">No lessons available.</div>
              )}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-white/70 bg-gradient-to-br from-indigo-600 to-cyan-500 p-5 text-white shadow-xl shadow-indigo-500/15 backdrop-blur-xl">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-blue-100">Lesson summary</p>
            <h2 className="mt-2 text-xl font-black">{lesson?.title || 'Study summary'}</h2>
            <p className="mt-3 text-sm leading-7 text-blue-50/90">{lesson?.content || lesson?.description || 'Use this space to reinforce the key ideas before moving on.'}</p>
          </div>
        </aside>
      </div>
    </StudentLayout>
  );
}
