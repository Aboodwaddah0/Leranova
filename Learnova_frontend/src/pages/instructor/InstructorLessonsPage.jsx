import { useEffect, useMemo, useState } from "react";
import InstructorLayout from "../../components/instructor/InstructorLayout";
import {
  createInstructorLesson,
  fetchInstructorLessonAttachments,
  fetchInstructorLessonComments,
  fetchInstructorSubjects,
  fetchInstructorLessons,
  deleteInstructorLesson,
} from "../../services/instructorService";
import { useLanguage } from "../../utils/i18n";
import { notifyError } from "../../lib/notify";

const safeError = (error) => error?.response?.data?.message || error?.message || "Request failed";

export default function InstructorLessonsPage() {
  const { isArabic } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [error, setError] = useState("");
  const [lessons, setLessons] = useState([]);
  const [selectedLessonId, setSelectedLessonId] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [comments, setComments] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ subjectId: "", title: "", description: "", videoFile: null });

  const selectedLesson = useMemo(
    () => lessons.find((lesson) => String(lesson.id) === String(selectedLessonId)) || null,
    [lessons, selectedLessonId],
  );

  useEffect(() => {
    let cancelled = false;

    const loadLessons = async () => {
      setLoading(true);
      setError("");

      try {
        const [lessonsData, subjectsData] = await Promise.all([
          fetchInstructorLessons(),
          fetchInstructorSubjects(),
        ]);
        if (cancelled) {
          return;
        }

        setLessons(lessonsData);
        setSubjects(subjectsData);
        setForm((current) => ({
          ...current,
          subjectId: current.subjectId || String(subjectsData[0]?.id || ""),
        }));
        setSelectedLessonId((current) => current || String(lessonsData[0]?.id || ""));
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

    loadLessons();

    return () => {
      cancelled = true;
    };
  }, []);

  const refreshLessons = async () => {
    const [lessonsData] = await Promise.all([fetchInstructorLessons()]);
    setLessons(lessonsData);
  };

  useEffect(() => {
    let cancelled = false;

    const loadDetails = async () => {
      if (!selectedLessonId) {
        setAttachments([]);
        setComments([]);
        return;
      }

      setDetailsLoading(true);

      try {
        const [attachmentsData, commentsData] = await Promise.all([
          fetchInstructorLessonAttachments(selectedLessonId),
          fetchInstructorLessonComments(selectedLessonId),
        ]);

        if (!cancelled) {
          setAttachments(attachmentsData);
          setComments(commentsData);
        }
      } catch (err) {
        if (!cancelled) {
          setError(safeError(err));
        }
      } finally {
        if (!cancelled) {
          setDetailsLoading(false);
        }
      }
    };

    loadDetails();

    return () => {
      cancelled = true;
    };
  }, [selectedLessonId]);

  useEffect(() => {
    if (error) {
      notifyError(error);
    }
  }, [error]);

  const onCreateLesson = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const createdLesson = await createInstructorLesson({
        subjectId: form.subjectId,
        title: form.title,
        description: form.description,
        videoFile: form.videoFile,
      });

      setForm((current) => ({ ...current, title: "", description: "", videoFile: null }));
      if (createdLesson?.id) {
        setSelectedLessonId(String(createdLesson.id));
      }
      await refreshLessons();
    } catch (err) {
      setError(safeError(err));
    } finally {
      setSaving(false);
    }
  };

  const onDeleteLesson = async (lesson) => {
    const subjectId = lesson.subject?.id || lesson.subjectId || lesson.Subject_id;
    const confirmed = window.confirm(
      isArabic
        ? `هل تريد حذف الدرس \"${lesson.title || lesson.name}\"؟`
        : `Delete lesson \"${lesson.title || lesson.name}\"?`,
    );
    if (!confirmed) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      await deleteInstructorLesson(subjectId, lesson.id);
      await refreshLessons();
      if (String(selectedLessonId) === String(lesson.id)) {
        setSelectedLessonId("");
      }
    } catch (err) {
      setError(safeError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <InstructorLayout
      title={isArabic ? "الدروس" : "Lessons"}
      subtitle={isArabic ? "استعراض الدروس والمرفقات وتعليقات الطلاب" : "Review lessons, attachments, and student comments."}
    >
      {loading && <p className="text-sm font-semibold text-slate-500">{isArabic ? "جاري التحميل..." : "Loading..."}</p>}

      <form onSubmit={onCreateLesson} className="mb-6 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-lg font-black text-slate-900">{isArabic ? "إضافة درس" : "Add lesson"}</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <select
            value={form.subjectId}
            onChange={(event) => setForm((current) => ({ ...current, subjectId: event.target.value }))}
            className="h-11 rounded-xl border border-slate-200 px-3 text-sm"
            required
          >
            <option value="">{isArabic ? "اختر المادة" : "Select subject"}</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>{subject.name}</option>
            ))}
          </select>
          <input
            value={form.title}
            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            className="h-11 rounded-xl border border-slate-200 px-3 text-sm"
            placeholder={isArabic ? "عنوان الدرس" : "Lesson title"}
            required
          />
          <input
            value={form.description}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            className="h-11 rounded-xl border border-slate-200 px-3 text-sm"
            placeholder={isArabic ? "الوصف" : "Description"}
          />
          <input
            type="file"
            accept="video/*"
            onChange={(event) => setForm((current) => ({ ...current, videoFile: event.target.files?.[0] || null }))}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs"
          />
          <div className="md:col-span-4 flex justify-end">
            <button type="submit" disabled={saving} className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
              {isArabic ? "إضافة" : "Add"}
            </button>
          </div>
        </div>
      </form>

      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-lg font-black text-slate-900">{isArabic ? "قائمة الدروس" : "Lessons list"}</h3>
          <div className="mt-4 space-y-3 max-h-[68vh] overflow-auto pr-1">
            {lessons.length === 0 ? (
              <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">{isArabic ? "لا توجد دروس." : "No lessons found."}</p>
            ) : lessons.map((lesson) => {
              const isActive = String(lesson.id) === String(selectedLessonId);
              return (
                <div
                  key={lesson.id}
                  className={`rounded-2xl border px-4 py-3 transition ${
                    isActive
                      ? "border-[#2379c3] bg-[#e8f2fb]"
                      : "border-slate-200 bg-slate-50 hover:bg-white"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedLessonId(String(lesson.id))}
                    className="w-full text-left"
                  >
                    <p className="text-sm font-bold text-slate-900">{lesson.title || lesson.name}</p>
                    <p className="mt-1 text-xs text-slate-500">{lesson.subject?.name} • {lesson.subject?.course?.Name}</p>
                  </button>
                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={() => onDeleteLesson(lesson)}
                      disabled={saving}
                      className="rounded-xl border border-rose-200 px-3 py-1.5 text-xs font-bold text-rose-700 disabled:opacity-50"
                    >
                      {isArabic ? "حذف" : "Delete"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div>
            <h3 className="text-xl font-black text-slate-900">{selectedLesson ? (selectedLesson.title || selectedLesson.name) : (isArabic ? "اختر درسًا" : "Select a lesson")}</h3>
            <p className="mt-1 text-sm text-slate-600">{selectedLesson?.subject?.name || "-"}</p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <article className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <h4 className="font-black text-slate-900">{isArabic ? "المرفقات" : "Attachments"}</h4>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#2379c3]">{attachments.length}</span>
              </div>
              <div className="mt-4 space-y-3">
                {detailsLoading && <p className="text-sm text-slate-500">{isArabic ? "جاري التحميل..." : "Loading..."}</p>}
                {!detailsLoading && attachments.length === 0 ? (
                  <p className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-500">{isArabic ? "لا توجد مرفقات." : "No attachments found."}</p>
                ) : attachments.map((attachment) => (
                  <a
                    key={attachment.id}
                    href={attachment.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-2xl border border-slate-200 bg-white px-4 py-3"
                  >
                    <p className="text-sm font-bold text-slate-900">{attachment.originalName || attachment.fileType || (isArabic ? "مرفق" : "Attachment")}</p>
                    <p className="mt-1 text-xs text-slate-500">{attachment.mimeType || attachment.type || (isArabic ? "ملف" : "file")}</p>
                  </a>
                ))}
              </div>
            </article>

            <article className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <h4 className="font-black text-slate-900">{isArabic ? "تعليقات الطلاب" : "Student comments"}</h4>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#2379c3]">{comments.length}</span>
              </div>
              <div className="mt-4 space-y-3 max-h-[52vh] overflow-auto pr-1">
                {!detailsLoading && comments.length === 0 ? (
                  <p className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-500">{isArabic ? "لا توجد تعليقات." : "No comments found."}</p>
                ) : comments.map((comment) => (
                  <article key={comment.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-bold text-slate-900">{comment.userName || (isArabic ? "مستخدم" : "User")}</p>
                      <span className="text-xs text-slate-500">{comment.userRole || "-"}</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-700">{comment.content}</p>
                  </article>
                ))}
              </div>
            </article>
          </div>
        </section>
      </div>
    </InstructorLayout>
  );
}
