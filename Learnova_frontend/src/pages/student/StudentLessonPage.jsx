import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import StudentLayout from "../../components/student/StudentLayout";
import VideoPlayer from "../../components/student/VideoPlayer";
import TabsSection from "../../components/student/TabsSection";
import AIChatBox from "../../components/student/AIChatBox";
import { Button } from "../../components/ui/button";
import { notifyError, notifySuccess } from "../../lib/notify";
import {
  createLessonComment,
  fetchLessonAttachments,
  fetchLessonComments,
  fetchLessonDetails,
  fetchSubjectLessons,
} from "../../services/studentService";

const safeError = (error) => error?.response?.data?.message || error?.message || "Request failed";

export default function StudentLessonPage() {
  const { lessonId } = useParams();
  const [searchParams] = useSearchParams();
  const subjectId = searchParams.get("subjectId") || "";
  const courseId = searchParams.get("courseId") || "";
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [lesson, setLesson] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [activeTab, setActiveTab] = useState("comments");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const [lessonDetails, lessonList, commentsData, attachmentsData] = await Promise.all([
          fetchLessonDetails(lessonId, subjectId),
          fetchSubjectLessons(subjectId),
          fetchLessonComments(lessonId),
          fetchLessonAttachments(lessonId),
        ]);

        if (cancelled) {
          return;
        }

        setLesson(lessonDetails);
        setLessons(lessonList);
        setComments(commentsData);
        setAttachments(attachmentsData);
      } catch (err) {
        if (!cancelled) {
          setError(safeError(err));
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
  }, [lessonId, subjectId]);

  useEffect(() => {
    if (error) {
      notifyError(error);
    }
  }, [error]);

  const tabs = useMemo(
    () => [
      { id: "comments", label: "Comments" },
      { id: "attachments", label: "Attachments" },
      { id: "ai", label: "AI Assistant" },
    ],
    [],
  );

  return (
    <StudentLayout mode="ACADEMY" title={lesson?.name || `Lesson #${lessonId}`} subtitle="Watch lesson content and interact with learning tools.">
      {loading ? <p className="text-sm font-semibold text-slate-500">Loading...</p> : null}

      <div className="mb-6">
        <Button type="button" variant="secondary" onClick={() => navigate(`/student/subjects/${subjectId}?courseId=${courseId}`)}>
          Back to Subject
        </Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[300px_1fr]">
        <aside className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#2379c3]">Lessons</p>
          <div className="mt-4 space-y-2">
            {lessons.length ? (
              lessons.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => navigate(`/student/lessons/${entry.id}?subjectId=${subjectId}&courseId=${courseId}`)}
                  className={`w-full rounded-2xl px-3 py-3 text-left text-sm font-semibold transition ${
                    String(entry.id) === String(lessonId)
                      ? "bg-[#2379c3] text-white"
                      : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {entry.name}
                </button>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 px-3 py-6 text-sm text-slate-500">No lessons found.</div>
            )}
          </div>
        </aside>

        <section className="space-y-6">
          <VideoPlayer src={lesson?.videoUrl} title={lesson?.name} />

          <TabsSection tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

          {activeTab === "comments" ? (
            <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-black text-slate-900">Comments</h3>
              <form
                className="mt-4 space-y-3"
                onSubmit={async (event) => {
                  event.preventDefault();
                  if (!commentText.trim()) {
                    return;
                  }

                  try {
                    await createLessonComment(lessonId, commentText.trim());
                    setCommentText("");
                    const refreshed = await fetchLessonComments(lessonId);
                    setComments(refreshed);
                    notifySuccess("Comment posted.");
                  } catch (err) {
                    notifyError(safeError(err));
                  }
                }}
              >
                <textarea
                  value={commentText}
                  onChange={(event) => setCommentText(event.target.value)}
                  placeholder="Write a comment..."
                  className="min-h-28 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-[#2379c3] focus:bg-white"
                />
                <div className="flex justify-end">
                  <Button type="submit" size="sm" disabled={!commentText.trim()}>Post Comment</Button>
                </div>
              </form>

              <div className="mt-5 space-y-3">
                {comments.length ? (
                  comments.map((comment) => (
                    <article key={comment.id} className="rounded-2xl bg-slate-50 px-4 py-3">
                      <p className="text-sm font-semibold text-slate-900">{comment.user?.name || "Student"}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{comment.content}</p>
                    </article>
                  ))
                ) : (
                  <p className="rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-500">No comments yet.</p>
                )}
              </div>
            </article>
          ) : null}

          {activeTab === "attachments" ? (
            <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-black text-slate-900">Attachments</h3>
              <div className="mt-4 space-y-2">
                {attachments.length ? (
                  attachments.map((item) => (
                    <div key={item.id} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                      <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                      <span className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">{item.type || "FILE"}</span>
                    </div>
                  ))
                ) : (
                  <p className="rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-500">No attachments available.</p>
                )}
              </div>
            </article>
          ) : null}

          {activeTab === "ai" ? (
            <AIChatBox
              courseId={courseId ? Number(courseId) : lesson?.courseId}
              subjectId={subjectId ? Number(subjectId) : lesson?.subjectId}
              lessonId={lessonId ? Number(lessonId) : undefined}
              labels={{
                title: "AI Assistant",
                subtitle: "Ask questions about this lesson.",
                placeholder: "Ask about this lesson...",
                send: "Send",
                sending: "Thinking...",
                noAnswer: "Start asking and the assistant will respond based on lesson context.",
                notAvailable: "Select lesson context first.",
                answer: "Answer",
                confidence: "Confidence",
              }}
            />
          ) : null}
        </section>
      </div>
    </StudentLayout>
  );
}
