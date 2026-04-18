import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import StudentLayout from "../../components/student/StudentLayout";
import LessonSidebar from "../../components/student/LessonSidebar";
import AIChatBox from "../../components/student/AIChatBox";
import VideoPlayer from "../../components/student/VideoPlayer";
import EducationLoading from "../../components/ui/EducationLoading";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  createLessonComment,
  fetchLessonComments,
  fetchMyStudentMarks,
  fetchMyStudentPurchases,
} from "../../services/studentService";
import { ORG_TYPES } from "../../utils/constants";
import { useLanguage } from "../../utils/i18n";
import { notifyError, notifySuccess } from "../../lib/notify";

const safeError = (error, isArabic) => error?.response?.data?.message || error?.message || (isArabic ? 'فشل الطلب.' : 'Request failed');

const getStudentMode = (user) => {
  if (String(user?.organizationType || user?.organization?.Role || "").toUpperCase() === ORG_TYPES.SCHOOL) {
    return ORG_TYPES.SCHOOL;
  }

  if (String(user?.organizationType || user?.organization?.Role || "").toUpperCase() === ORG_TYPES.ACADEMY) {
    return ORG_TYPES.ACADEMY;
  }

  return user?.academyUser ? ORG_TYPES.ACADEMY : ORG_TYPES.SCHOOL;
};

const buildCoursesFromMarks = (marks = []) => {
  const grouped = new Map();

  marks.forEach((mark) => {
    const course = mark.subject?.course;
    const courseId = course?.id || mark.subject?.Course_id;

    if (!courseId) {
      return;
    }

    if (!grouped.has(courseId)) {
      grouped.set(courseId, {
        id: courseId,
        name: course?.Name || course?.name || `#${courseId}`,
        description: course?.Description || course?.description || "",
        status: "ACTIVE",
        source: "marks",
      });
    }
  });

  return Array.from(grouped.values());
};

const buildCoursesFromPurchases = (purchases = []) => purchases.map((purchase) => ({
  id: purchase.course?.id,
  name: purchase.course?.Name || purchase.course?.name || `#${purchase.course?.id}`,
  description: purchase.course?.Description || purchase.course?.description || "",
  status: purchase.status,
  source: "purchase",
})).filter((course) => course.id);

const buildSubjects = (marks = []) => {
  const grouped = new Map();

  marks.forEach((mark) => {
    const subject = mark.subject;
    if (!subject?.id) {
      return;
    }

    grouped.set(subject.id, {
      id: subject.id,
      name: subject.name || subject.Name,
      course: subject.course || null,
    });
  });

  return Array.from(grouped.values());
};

export default function StudentLessonsPage() {
  const { t, isArabic } = useLanguage();
  const user = useSelector((state) => state.auth.user);
  const mode = getStudentMode(user);
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [marks, setMarks] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const courseId = searchParams.get("courseId") || "";
  const subjectId = searchParams.get("subjectId") || "";
  const lessonId = searchParams.get("lessonId") || "";

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        const [marksData, purchasesData] = await Promise.all([
          fetchMyStudentMarks(),
          fetchMyStudentPurchases(),
        ]);

        if (!cancelled) {
          setMarks(marksData);
          setPurchases(purchasesData);
        }
      } catch (err) {
        if (!cancelled) {
          setError(safeError(err, isArabic));
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

  useEffect(() => {
    if (error) {
      notifyError(error);
    }
  }, [error]);

  useEffect(() => {
    let cancelled = false;

    const loadComments = async () => {
      if (!lessonId) {
        setComments([]);
        return;
      }

      try {
        const commentsData = await fetchLessonComments(lessonId);
        if (!cancelled) {
          setComments(commentsData);
        }
      } catch (err) {
        if (!cancelled) {
          setError(safeError(err, isArabic));
        }
      }
    };

    loadComments();

    return () => {
      cancelled = true;
    };
  }, [lessonId]);

  const courses = useMemo(
    () => (mode === ORG_TYPES.SCHOOL ? buildCoursesFromMarks(marks) : buildCoursesFromPurchases(purchases)),
    [marks, mode, purchases],
  );

  const subjects = useMemo(() => buildSubjects(marks), [marks]);

  const selectedCourse = courses.find((course) => String(course.id) === String(courseId)) || courses[0] || null;
  const selectedSubject = subjects.find((subject) => String(subject.id) === String(subjectId)) || subjects[0] || null;

  const onPostComment = async (event) => {
    event.preventDefault();

    if (!lessonId || !commentText.trim()) {
      return;
    }

    try {
      const payload = {
        lesson_id: Number(lessonId),
        user_id: user?.id || user?.userId || null,
        content: commentText.trim(),
      };

      console.log('[LESSONS PAGE] Comment submit started', payload);

      const created = await createLessonComment(lessonId, payload.content);
      setCommentText("");
      const commentsData = await fetchLessonComments(lessonId);
      setComments(commentsData);
      console.log('[LESSONS PAGE] Comment submit succeeded', {
        lesson_id: Number(lessonId),
        created_comment_id: created?.id || null,
        refreshed_comments_count: Array.isArray(commentsData) ? commentsData.length : 0,
      });
      notifySuccess(isArabic ? "تم نشر التعليق." : "Comment posted successfully.");
    } catch (err) {
      console.error('[LESSONS PAGE] Comment submit failed', {
        lesson_id: Number(lessonId),
        status: err?.response?.status,
        message: err?.response?.data?.message || err?.message,
      });
      setError(safeError(err, isArabic));
    }
  };

  return (
    <StudentLayout mode={mode} title={t.student.lessons.title} subtitle={t.student.lessons.subtitle}>
      {loading ? (
        <EducationLoading
          isArabic={isArabic}
          title={isArabic ? "جاري تحميل الدروس" : "Loading lessons"}
          subtitle={isArabic ? "نجهز محتوى الدرس والمحادثة التعليمية" : "Preparing lesson content and learning chat"}
          fullscreen
        />
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
        <LessonSidebar
          isArabic={isArabic}
          courses={courses}
          subjects={subjects}
          selectedCourseId={courseId}
          selectedSubjectId={subjectId}
          onCourseChange={(value) => {
            const nextParams = new URLSearchParams(searchParams);
            if (value) {
              nextParams.set("courseId", value);
            } else {
              nextParams.delete("courseId");
            }
            nextParams.delete("subjectId");
            nextParams.delete("lessonId");
            setSearchParams(nextParams);
          }}
          onSubjectChange={(value) => {
            const nextParams = new URLSearchParams(searchParams);
            if (value) {
              nextParams.set("subjectId", value);
            } else {
              nextParams.delete("subjectId");
            }
            setSearchParams(nextParams);
          }}
        />

        <div className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
            <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#2379c3]">{selectedCourse?.name || t.student.lessons.noContext}</p>
              <h3 className="mt-2 text-2xl font-black text-slate-900">{selectedSubject?.name || (isArabic ? "اختر مادة" : "Select a subject")}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                {selectedCourse?.description || selectedSubject?.course?.Description || t.student.lessons.lessonHint}
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">{t.student.common.status}</p>
                  <p className="mt-2 font-semibold text-slate-900">{mode === ORG_TYPES.SCHOOL ? t.student.mode.school : t.student.mode.academy}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">{t.student.common.latest}</p>
                  <p className="mt-2 font-semibold text-slate-900">{selectedSubject?.name || t.student.common.noData}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">{t.student.lessons.chooseLesson}</p>
                  <p className="mt-2 font-semibold text-slate-900">{lessonId || "-"}</p>
                </div>
              </div>
            </article>

            <VideoPlayer isArabic={isArabic} title={selectedSubject?.name || t.student.lessons.title} />
          </div>

          <AIChatBox
            isArabic={isArabic}
            courseId={selectedCourse?.id}
            subjectId={selectedSubject?.id}
            lessonId={lessonId || undefined}
            labels={t.student.ai}
          />

          {lessonId ? (
            <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#2379c3]">{t.student.comments.title}</p>
                  <h3 className="mt-2 text-xl font-black text-slate-900">{t.student.comments.subtitle}</h3>
                </div>
                <Badge variant="subtle">{comments.length}</Badge>
              </div>

              <form onSubmit={onPostComment} className="mt-4 space-y-3">
                <textarea
                  value={commentText}
                  onChange={(event) => setCommentText(event.target.value)}
                  placeholder={t.student.comments.placeholder}
                  className="min-h-28 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#2379c3] focus:bg-white"
                />
                <div className="flex justify-end">
                  <Button type="submit" size="sm" disabled={!commentText.trim()}>
                    {t.student.comments.submit}
                  </Button>
                </div>
              </form>

              <div className="mt-5 space-y-3">
                {comments.length ? (
                  comments.map((comment) => (
                    <article key={comment.id} className="rounded-2xl bg-slate-50 px-4 py-3">
                      <p className="text-sm font-semibold text-slate-900">{comment.user?.name || comment.user?.Name || t.student.common.noData}</p>
                      <p className="mt-2 text-sm leading-7 text-slate-600">{comment.content}</p>
                    </article>
                  ))
                ) : (
                  <p className="rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-500">{t.student.comments.empty}</p>
                )}
              </div>
            </article>
          ) : null}
        </div>
      </div>
    </StudentLayout>
  );
}