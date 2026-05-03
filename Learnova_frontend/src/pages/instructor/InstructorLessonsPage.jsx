import { useEffect, useMemo, useRef, useState } from "react";
import InstructorLayout from "../../components/instructor/InstructorLayout";
import {
  createInstructorLesson,
  fetchInstructorLessonAttachments,
  fetchInstructorLessonComments,
  fetchInstructorSubjects,
  fetchInstructorLessons,
  deleteInstructorLesson,
  uploadInstructorLessonAttachments,
  deleteInstructorLessonAttachment,
  fetchLessonRagStatus,
} from "../../services/instructorService";
import EducationLoading from "../../components/ui/EducationLoading";
import Modal from "../../components/ui/Modal";
import { useLanguage } from "../../utils/i18n";
import { notifyError } from "../../lib/notify";
import LessonForm from "../../components/forms/LessonForm";
import { useSelector } from "react-redux";
import { ORG_TYPES } from "../../utils/constants";
import { formatGradeName } from "../../utils/gradeHelpers";

const safeError = (error) => error?.response?.data?.message || error?.message || "Request failed";

export default function InstructorLessonsPage() {
  const { isArabic } = useLanguage();
  const authUser = useSelector((state) => state.auth.user);
  const orgType = String(
    authUser?.organizationType || authUser?.organization?.Role || ""
  ).toUpperCase();
  const isSchool = orgType === ORG_TYPES.SCHOOL;
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
  const [lessonModalOpen, setLessonModalOpen] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);
  const [ragStatus, setRagStatus] = useState(null);
  const ragPollRef = useRef(null);
  const ragStartRef = useRef(null);

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
        if (cancelled) return;

        setLessons(lessonsData);
        setSubjects(subjectsData);
        setForm((current) => ({
          ...current,
          subjectId: current.subjectId || String(subjectsData[0]?.id || ""),
        }));
        setSelectedLessonId((current) => current || String(lessonsData[0]?.id || ""));
      } catch (err) {
        if (!cancelled) setError(safeError(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadLessons();
    return () => { cancelled = true; };
  }, []);

  const refreshLessons = async () => {
    const [lessonsData] = await Promise.all([fetchInstructorLessons()]);
    setLessons(lessonsData);
  };

  useEffect(() => {
    let cancelled = false;

    const loadDetails = async () => {
      if (!selectedLessonId) { setAttachments([]); setComments([]); return; }
      setDetailsLoading(true);

      try {
        const [attachmentsData, commentsData] = await Promise.all([
          fetchInstructorLessonAttachments(selectedLessonId),
          fetchInstructorLessonComments(selectedLessonId),
        ]);
        if (!cancelled) { setAttachments(attachmentsData); setComments(commentsData); }
      } catch (err) {
        if (!cancelled) setError(safeError(err));
      } finally {
        if (!cancelled) setDetailsLoading(false);
      }
    };

    loadDetails();
    return () => { cancelled = true; };
  }, [selectedLessonId]);

  useEffect(() => { if (error) notifyError(error); }, [error]);

  const onCreateLesson = async (formData) => {
    setSaving(true);
    setError("");
    const hadVideo = Boolean(formData.videoFile);
    const videoFileRef = formData.videoFile;

    try {
      const createdLesson = await createInstructorLesson({
        subjectId: formData.subjectId,
        title: formData.title,
        description: formData.description,
        videoFile: formData.videoFile,
      });

      setForm((current) => ({ ...current, title: "", description: "", videoFile: null }));
      setLessonModalOpen(false);

      if (createdLesson?.id) setSelectedLessonId(String(createdLesson.id));
      await refreshLessons();

      if (hadVideo && createdLesson?.id) {
        if (ragPollRef.current) { clearInterval(ragPollRef.current); ragPollRef.current = null; }
        setRagStatus({ status: 'queued', estimatedTime: estimatedTime([videoFileRef]) });
        setTimeout(() => startRagPolling(createdLesson.id, 0, true), 3000);
      }
    } catch (err) {
      setError(safeError(err));
    } finally {
      setSaving(false);
    }
  };

  const RAG_FILE_TYPES = ['pdf', 'docx', 'txt', 'video', 'audio'];
  const estimatedTime = (files) => {
    const hasVideo = Array.from(files).some((f) => f.type.startsWith('video/'));
    if (hasVideo) return isArabic ? 'الفيديو يحتاج 3-8 دقائق' : 'Video takes 3–8 min';
    return isArabic ? 'معالجة تستغرق 1-2 دقيقة' : 'Processing takes 1–2 min';
  };

  const startRagPolling = (lessonId, baseline, hasRagFiles) => {
    if (!hasRagFiles) return;
    if (ragPollRef.current) clearInterval(ragPollRef.current);
    ragStartRef.current = Date.now();
    setRagStatus({ status: 'processing', chunkCount: baseline, elapsed: 0 });

    ragPollRef.current = setInterval(async () => {
      try {
        const res = await fetchLessonRagStatus(lessonId, baseline);
        const elapsed = Math.floor((Date.now() - ragStartRef.current) / 1000);
        if (res?.ready) {
          clearInterval(ragPollRef.current);
          ragPollRef.current = null;
          setRagStatus({ status: 'ready', chunkCount: res.chunkCount, elapsed });
          setTimeout(() => setRagStatus(null), 8000);
        } else {
          setRagStatus({ status: 'processing', chunkCount: res?.chunkCount ?? baseline, elapsed });
          if (elapsed > 600) {
            clearInterval(ragPollRef.current);
            ragPollRef.current = null;
            setRagStatus({ status: 'timeout', elapsed });
          }
        }
      } catch { /* keep polling silently */ }
    }, 5000);
  };

  const onUploadAttachments = async (files) => {
    if (!selectedLessonId || !files?.length) return;
    setUploadingFiles(true);
    setUploadProgress(0);
    setError("");
    setRagStatus(null);
    if (ragPollRef.current) { clearInterval(ragPollRef.current); ragPollRef.current = null; }

    try {
      const baseline = (await fetchLessonRagStatus(selectedLessonId, 0).catch(() => ({ chunkCount: 0 }))).chunkCount ?? 0;
      const fileArray = Array.from(files);
      const hasRagFiles = fileArray.some((f) =>
        RAG_FILE_TYPES.some((t) => f.type.includes(t) || f.name.toLowerCase().match(/\.(pdf|docx|txt|mp4|mov|avi|webm|mp3|wav)$/))
      );

      await uploadInstructorLessonAttachments({ lessonId: selectedLessonId, files: fileArray, onProgress: setUploadProgress });
      const updated = await fetchInstructorLessonAttachments(selectedLessonId);
      setAttachments(updated);
      if (fileInputRef.current) fileInputRef.current.value = "";

      if (hasRagFiles) {
        setRagStatus({ status: 'queued', estimatedTime: estimatedTime(files) });
        setTimeout(() => startRagPolling(selectedLessonId, baseline, true), 3000);
      }
    } catch (err) {
      setError(safeError(err));
    } finally {
      setUploadingFiles(false);
      setUploadProgress(0);
    }
  };

  const onDeleteAttachment = async (attachmentId) => {
    if (!selectedLessonId) return;
    const confirmed = window.confirm(isArabic ? "هل تريد حذف هذا المرفق؟" : "Delete this attachment?");
    if (!confirmed) return;
    try {
      await deleteInstructorLessonAttachment({ lessonId: selectedLessonId, attachmentId });
      setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
    } catch (err) {
      setError(safeError(err));
    }
  };

  const onDeleteLesson = async (lesson) => {
    const subjectId = lesson.subject?.id || lesson.subjectId || lesson.Subject_id;
    const confirmed = window.confirm(
      isArabic
        ? `هل تريد حذف الدرس "${lesson.title || lesson.name}"؟`
        : `Delete lesson "${lesson.title || lesson.name}"?`,
    );
    if (!confirmed) return;

    setSaving(true);
    setError("");
    try {
      await deleteInstructorLesson(subjectId, lesson.id);
      await refreshLessons();
      if (String(selectedLessonId) === String(lesson.id)) setSelectedLessonId("");
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
      {loading ? (
        <EducationLoading
          isArabic={isArabic}
          title={isArabic ? "جاري تحميل الدروس" : "Loading lessons"}
          subtitle={isArabic ? "نرتب الدروس والمرفقات والتعليقات" : "Preparing lessons, attachments, and comments"}
          fullscreen
        />
      ) : null}

      {/* Add Lesson Modal */}
      <Modal
        open={lessonModalOpen}
        onClose={() => setLessonModalOpen(false)}
        title={isArabic ? "إضافة درس جديد" : "Add New Lesson"}
        maxWidth="max-w-xl"
      >
        <LessonForm subjects={subjects} initialValues={form} onSubmit={onCreateLesson} saving={saving} />
      </Modal>

      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="text-lg font-black text-slate-900">{isArabic ? "قائمة الدروس" : "Lessons list"}</h3>
            <button
              type="button"
              onClick={() => setLessonModalOpen(true)}
              className="rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-slate-700"
            >
              {isArabic ? "+ إضافة درس" : "+ Add Lesson"}
            </button>
          </div>
          <div className="space-y-3 max-h-[68vh] overflow-auto pr-1">
            {lessons.length === 0 ? (
              <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">{isArabic ? "لا توجد دروس." : "No lessons found."}</p>
            ) : lessons.map((lesson) => {
              const isActive = String(lesson.id) === String(selectedLessonId);
              return (
                <div
                  key={lesson.id}
                  className={`rounded-2xl border px-4 py-3 transition ${
                    isActive ? "border-[#2379c3] bg-[#e8f2fb]" : "border-slate-200 bg-slate-50 hover:bg-white"
                  }`}
                >
                  <button type="button" onClick={() => setSelectedLessonId(String(lesson.id))} className="w-full text-left">
                    <p className="text-sm font-bold text-slate-900">{lesson.title || lesson.name}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {lesson.subject?.name} • {formatGradeName(lesson.subject?.course, isSchool, isArabic) || lesson.subject?.course?.Name || ""}
                    </p>
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

              {selectedLessonId ? (
                <div className="mt-3 space-y-2">
                  <label className={`flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-3 text-sm font-semibold transition ${uploadingFiles ? 'border-slate-200 text-slate-400' : 'border-[#2379c3] text-[#2379c3] hover:bg-blue-50'}`}>
                    <input ref={fileInputRef} type="file" multiple className="hidden" disabled={uploadingFiles} onChange={(e) => onUploadAttachments(e.target.files)} />
                    {uploadingFiles
                      ? `${isArabic ? 'جاري الرفع' : 'Uploading'} ${uploadProgress}%`
                      : (isArabic ? '+ رفع ملفات (PDF، Word، فيديو، صور...)' : '+ Upload files (PDF, Word, video, images...)')}
                  </label>

                  {ragStatus ? (
                    <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm ${
                      ragStatus.status === 'ready' ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : ragStatus.status === 'timeout' ? 'border-amber-200 bg-amber-50 text-amber-700'
                        : 'border-blue-200 bg-blue-50 text-blue-700'
                    }`}>
                      {ragStatus.status === 'ready' ? (
                        <><span className="text-lg">✅</span><div><p className="font-bold">{isArabic ? 'جاهز للبحث الذكي!' : 'Ready for AI search!'}</p><p className="text-xs opacity-75">{isArabic ? `${ragStatus.chunkCount} مقطع • ${ragStatus.elapsed}ث` : `${ragStatus.chunkCount} chunks • ${ragStatus.elapsed}s`}</p></div></>
                      ) : ragStatus.status === 'timeout' ? (
                        <><span className="text-lg">⚠️</span><div><p className="font-bold">{isArabic ? 'المعالجة تأخذ وقتاً' : 'Processing taking longer'}</p><p className="text-xs opacity-75">{isArabic ? 'يستمر في الخلفية' : 'Continues in background'}</p></div></>
                      ) : (
                        <><span className="animate-spin text-lg">⚙️</span><div className="flex-1"><p className="font-bold">{ragStatus.status === 'queued' ? (isArabic ? 'في الانتظار للمعالجة...' : 'Queued for AI processing...') : (isArabic ? `يُعالج للبحث الذكي • ${ragStatus.elapsed}ث` : `Processing for AI search • ${ragStatus.elapsed}s`)}</p><p className="text-xs opacity-75">{ragStatus.estimatedTime || (isArabic ? 'يرجى الانتظار' : 'Please wait')}</p></div></>
                      )}
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="mt-3 space-y-2">
                {detailsLoading ? (
                  <EducationLoading isArabic={isArabic} title={isArabic ? "جاري تحميل التفاصيل" : "Loading details"} subtitle={isArabic ? "نسترجع المرفقات وتعليقات الدرس" : "Fetching lesson attachments and comments"} compact className="mb-3" />
                ) : null}
                {!detailsLoading && attachments.length === 0 ? (
                  <p className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-500">{isArabic ? "لا توجد مرفقات." : "No attachments found."}</p>
                ) : attachments.map((attachment) => (
                  <div key={attachment.id} className="flex items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <a href={attachment.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-900">{attachment.name || attachment.originalName || attachment.fileType || (isArabic ? "مرفق" : "Attachment")}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{attachment.mimeType || attachment.type || (isArabic ? "ملف" : "file")}</p>
                    </a>
                    <button type="button" onClick={() => onDeleteAttachment(attachment.id)} className="shrink-0 rounded-lg border border-rose-200 px-2 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-50">
                      {isArabic ? "حذف" : "Delete"}
                    </button>
                  </div>
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
