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
  reprocessLessonRag,
  fetchLessonQuiz,
  createLessonQuiz,
  updateLessonQuiz,
  deleteLessonQuiz,
  generateLessonQuizQuestions,
  addLessonQuizQuestion,
  deleteLessonQuizQuestion,
  fetchLessonAiContentInstructor,
  generateLessonAiContentInstructor,
  updateLessonFlashcards,
  updateLessonMindmap,
  publishLessonAiContent,
  unpublishLessonAiContent,
  updateInstructorLessonMeta,
  suggestLessonMetadata,
} from "../../services/instructorService";
import EducationLoading from "../../components/ui/EducationLoading";
import Modal from "../../components/ui/Modal";
import { useLanguage } from "../../utils/i18n";
import { notifyError } from "../../lib/notify";
import LessonCreationWizard from "../../components/forms/LessonCreationWizard";
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

  // ── Quiz state ──────────────────────────────────────────────────────────────
  const [quiz, setQuiz] = useState(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizViewLang, setQuizViewLang] = useState(isArabic ? 'ar' : 'en');
  const [quizGenerating, setQuizGenerating] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showAddQuestionModal, setShowAddQuestionModal] = useState(false);
  const [generateForm, setGenerateForm] = useState({ numQuestions: 10, difficulty: 'MEDIUM', notes: '', lang: '' });
  const [addQuestionForm, setAddQuestionForm] = useState({ question: '', options: ['', '', '', ''], correctAnswer: 0, explanation: '' });
  const [expandedQuestionId, setExpandedQuestionId] = useState(null);

  // ── AI Content state (flashcards & mindmap) ─────────────────────────────────
  const [aiContent, setAiContent] = useState(null);
  const [aiContentLoading, setAiContentLoading] = useState(false);
  const [aiContentLang, setAiContentLang] = useState(isArabic ? 'ar' : 'en');
  const [instructorSection, setInstructorSection] = useState(null);
  const [editingCardIdx, setEditingCardIdx] = useState(null);
  const [editCardDraft, setEditCardDraft] = useState({ question: '', answer: '' });
  const [showMindmapEditor, setShowMindmapEditor] = useState(false);
  const [mindmapDraft, setMindmapDraft] = useState(null);

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
      if (!selectedLessonId) { setAttachments([]); setComments([]); setQuiz(null); return; }
      setDetailsLoading(true);
      setQuiz(null);

      const lesson = lessons.find((l) => String(l.id) === String(selectedLessonId));
      const subjectId = lesson?.subject?.id || lesson?.subjectId;

      try {
        const [attachmentsData, commentsData] = await Promise.all([
          fetchInstructorLessonAttachments(selectedLessonId),
          fetchInstructorLessonComments(selectedLessonId),
        ]);
        if (!cancelled) { setAttachments(attachmentsData); setComments(commentsData); }
        if (!cancelled && subjectId) {
          const quizData = await fetchLessonQuiz(subjectId, selectedLessonId, quizViewLang).catch(() => null);
          if (!cancelled) setQuiz(quizData);
        }
      } catch (err) {
        if (!cancelled) setError(safeError(err));
      } finally {
        if (!cancelled) setDetailsLoading(false);
      }
    };

    loadDetails();
    return () => { cancelled = true; };
  }, [selectedLessonId]);

  useEffect(() => {
    setInstructorSection(null); // Reset section nav when lesson changes
    setAiContent(null); // Always clear stale content when lesson changes
    if (!selectedLessonId) return;
    let cancelled = false;
    fetchLessonAiContentInstructor(selectedLessonId, aiContentLang)
      .then((d) => { if (!cancelled) setAiContent(d ?? null); })
      .catch(() => { if (!cancelled) setAiContent(null); });
    return () => { cancelled = true; };
  }, [selectedLessonId, aiContentLang]);

  useEffect(() => { if (error) notifyError(error); }, [error]);

  // Step 1 of wizard: upload video → creates lesson with temp title
  const onWizardUpload = async (subjectId, videoFile, onProgress) => {
    const tempTitle = videoFile.name.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ') || 'Untitled Lesson';
    const lesson = await createInstructorLesson({ subjectId, title: tempTitle, videoFile, onProgress });
    if (lesson?.id) setSelectedLessonId(String(lesson.id));
    await refreshLessons();
    return lesson;
  };

  // Step 2 of wizard: save title + description, start RAG polling
  const onWizardSave = async (subjectId, lessonId, { title, description }) => {
    await updateInstructorLessonMeta(subjectId, lessonId, { title, description });
    await refreshLessons();
    setLessonModalOpen(false);
    if (ragPollRef.current) { clearInterval(ragPollRef.current); ragPollRef.current = null; }
    setRagStatus({ status: 'queued', estimatedTime: isArabic ? 'الفيديو يحتاج 3-8 دقائق' : 'Video takes 3–8 min' });
    setTimeout(() => startRagPolling(lessonId, 0, true), 3000);
  };

  const onWizardSuggest = async (subjectId, filename, lang) =>
    suggestLessonMetadata(subjectId, filename, lang).catch(() => null);

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

  // ── AI Content handlers ──────────────────────────────────────────────────────
  const onGenerateAiContent = async () => {
    if (!selectedLessonId) return;
    setAiContentLoading(true);
    try {
      const d = await generateLessonAiContentInstructor(selectedLessonId, aiContentLang);
      setAiContent(d);
    } catch (err) { setError(safeError(err)); } finally { setAiContentLoading(false); }
  };

  const onSaveCard = async (idx) => {
    const cards = [...(aiContent?.flashcards || [])];
    cards[idx] = editCardDraft;
    try {
      const d = await updateLessonFlashcards(selectedLessonId, cards, aiContentLang);
      setAiContent((prev) => ({ ...prev, ...d }));
      setEditingCardIdx(null);
    } catch (err) { setError(safeError(err)); }
  };

  const onDeleteCard = async (idx) => {
    const cards = (aiContent?.flashcards || []).filter((_, i) => i !== idx);
    try {
      const d = await updateLessonFlashcards(selectedLessonId, cards, aiContentLang);
      setAiContent((prev) => ({ ...prev, ...d }));
    } catch (err) { setError(safeError(err)); }
  };

  const onAddCard = async () => {
    const blank = { question: isArabic ? 'سؤال جديد' : 'New question', answer: isArabic ? 'الإجابة' : 'Answer' };
    const cards = [...(aiContent?.flashcards || []), blank];
    try {
      const d = await updateLessonFlashcards(selectedLessonId, cards, aiContentLang);
      setAiContent((prev) => ({ ...prev, ...d }));
      setEditingCardIdx(cards.length - 1);
      setEditCardDraft(blank);
    } catch (err) { setError(safeError(err)); }
  };

  const onSaveMindmap = async () => {
    try {
      const d = await updateLessonMindmap(selectedLessonId, mindmapDraft, aiContentLang);
      setAiContent((prev) => ({ ...prev, ...d }));
      setShowMindmapEditor(false);
    } catch (err) { setError(safeError(err)); }
  };

  const onPublishAiContent = async () => {
    try {
      const d = await publishLessonAiContent(selectedLessonId);
      setAiContent((prev) => ({ ...prev, ...d, published: true }));
    } catch (err) { setError(safeError(err)); }
  };

  const onUnpublishAiContent = async () => {
    try {
      const d = await unpublishLessonAiContent(selectedLessonId);
      setAiContent((prev) => ({ ...prev, ...d, published: false }));
    } catch (err) { setError(safeError(err)); }
  };

  const onReprocessRag = async () => {
    if (!selectedLessonId) return;
    setRagStatus({ status: 'queued', estimatedTime: isArabic ? 'يرجى الانتظار' : 'Please wait' });
    try {
      await reprocessLessonRag(selectedLessonId);
      setTimeout(() => startRagPolling(selectedLessonId, 0, true), 3000);
    } catch (err) {
      setRagStatus(null);
      setError(safeError(err));
    }
  };

  // ── Quiz handlers ────────────────────────────────────────────────────────────
  const getSubjectId = () => {
    const lesson = lessons.find((l) => String(l.id) === String(selectedLessonId));
    return lesson?.subject?.id || lesson?.subjectId;
  };

  const onCreateQuiz = async () => {
    const subjectId = getSubjectId();
    if (!subjectId || !selectedLessonId) return;
    const title = isArabic ? `اختبار درس ${selectedLesson?.title || selectedLesson?.name || ''}` : `Quiz: ${selectedLesson?.title || selectedLesson?.name || ''}`;
    try {
      const created = await createLessonQuiz(subjectId, selectedLessonId, { title, difficulty: 'MEDIUM', passingScore: 70 });
      setQuiz(created);
    } catch (err) { setError(safeError(err)); }
  };

  const onDeleteQuiz = async () => {
    if (!quiz) return;
    const confirmed = window.confirm(isArabic ? 'هل تريد حذف هذا الاختبار؟' : 'Delete this quiz?');
    if (!confirmed) return;
    const subjectId = getSubjectId();
    try {
      await deleteLessonQuiz(subjectId, selectedLessonId, quiz.id);
      setQuiz(null);
    } catch (err) { setError(safeError(err)); }
  };

  const onTogglePublish = async () => {
    if (!quiz) return;
    const subjectId = getSubjectId();
    try {
      const updated = await updateLessonQuiz(subjectId, selectedLessonId, quiz.id, { isPublished: !quiz.isPublished });
      setQuiz(updated);
    } catch (err) { setError(safeError(err)); }
  };

  const onGenerateQuestions = async () => {
    if (!quiz) return;
    const subjectId = getSubjectId();
    setQuizGenerating(true);
    try {
      const updated = await generateLessonQuizQuestions(subjectId, selectedLessonId, quiz.id, {
        numQuestions: generateForm.numQuestions,
        difficulty: generateForm.difficulty,
        notes: generateForm.notes,
        lang: generateForm.lang || (isArabic ? 'ar' : 'en'),
      });
      setQuiz(updated);
      setShowGenerateModal(false);
    } catch (err) { setError(safeError(err)); } finally { setQuizGenerating(false); }
  };

  const onDeleteQuestion = async (questionId) => {
    if (!quiz) return;
    const confirmed = window.confirm(isArabic ? 'هل تريد حذف هذا السؤال؟' : 'Delete this question?');
    if (!confirmed) return;
    const subjectId = getSubjectId();
    try {
      await deleteLessonQuizQuestion(subjectId, selectedLessonId, quiz.id, questionId);
      setQuiz((prev) => prev ? { ...prev, questions: prev.questions.filter((q) => q.id !== questionId), questionCount: (prev.questionCount || 1) - 1 } : prev);
    } catch (err) { setError(safeError(err)); }
  };

  const onAddQuestion = async () => {
    if (!quiz) return;
    const subjectId = getSubjectId();
    if (!addQuestionForm.question.trim() || addQuestionForm.options.some((o) => !o.trim())) {
      return setError(isArabic ? 'يرجى ملء السؤال والخيارات الأربعة.' : 'Please fill in the question and all 4 options.');
    }
    try {
      const newQ = await addLessonQuizQuestion(subjectId, selectedLessonId, quiz.id, addQuestionForm, quizViewLang);
      setQuiz((prev) => prev ? { ...prev, questions: [...(prev.questions || []), newQ], questionCount: (prev.questionCount || 0) + 1 } : prev);
      setAddQuestionForm({ question: '', options: ['', '', '', ''], correctAnswer: 0, explanation: '' });
      setShowAddQuestionModal(false);
    } catch (err) { setError(safeError(err)); }
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

      {/* Add Lesson Wizard Modal */}
      <Modal
        open={lessonModalOpen}
        onClose={() => setLessonModalOpen(false)}
        title={isArabic ? "إضافة درس جديد" : "Add New Lesson"}
        maxWidth="max-w-lg"
      >
        <LessonCreationWizard
          subjects={subjects}
          onUpload={onWizardUpload}
          onSave={onWizardSave}
          onSuggest={onWizardSuggest}
        />
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
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-xl font-black text-slate-900">{selectedLesson ? (selectedLesson.title || selectedLesson.name) : (isArabic ? "اختر درسًا" : "Select a lesson")}</h3>
              <p className="mt-1 text-sm text-slate-600">{selectedLesson?.subject?.name || "-"}</p>
            </div>
          </div>

          {/* ── Section navigation ── */}
          {selectedLessonId ? (
            <div className="flex flex-wrap gap-2 border-b border-slate-100 pb-3">
              {[
                { id: 'attachments', label: isArabic ? 'المرفقات' : 'Attachments',  badge: attachments.length || null },
                { id: 'comments',    label: isArabic ? 'التعليقات' : 'Comments',    badge: comments.length || null },
                { id: 'flashcards',  label: isArabic ? 'البطاقات' : 'Flashcards',   badge: aiContent?.flashcards?.length || null },
                { id: 'mindmap',     label: isArabic ? 'الخريطة' : 'Mind Map',      badge: null },
                { id: 'quiz',        label: isArabic ? 'الاختبار' : 'Quiz',          badge: quiz?.questionCount || null },
              ].map(({ id, label, badge }) => {
                const active = instructorSection === id;
                return (
                  <button key={id} type="button"
                    onClick={() => setInstructorSection(active ? null : id)}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition ${active ? 'bg-slate-900 text-white shadow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                    {label}
                    {badge ? <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-black ${active ? 'bg-white/20 text-white' : 'bg-white text-slate-700'}`}>{badge}</span> : null}
                  </button>
                );
              })}
            </div>
          ) : null}

          {/* ── Attachments (hidden until selected) ── */}
          {instructorSection === 'attachments' && (
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

                  <button
                    type="button"
                    onClick={onReprocessRag}
                    disabled={uploadingFiles || ragStatus?.status === 'processing' || ragStatus?.status === 'queued'}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-semibold text-violet-700 transition hover:bg-violet-100 disabled:opacity-50"
                  >
                    <span>🔄</span>
                    {isArabic ? 'إعادة معالجة AI (إذا لم يعمل المساعد الذكي)' : 'Re-process for AI (if chatbot has no content)'}
                  </button>

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
          </div>
          )}

          {/* ── Comments (hidden until selected) ── */}
          {instructorSection === 'comments' && (
          <div>
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
          )}

          {/* ── Flashcards & Mind Map (hidden until selected) ── */}
          {(instructorSection === 'flashcards' || instructorSection === 'mindmap') && selectedLessonId ? (
            <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5 space-y-4">
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xl">🃏</span>
                  <h4 className="font-black text-slate-900">{isArabic ? 'البطاقات التعليمية والخريطة الذهنية' : 'Flashcards & Mind Map'}</h4>
                  {aiContent ? (
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${aiContent.published ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {aiContent.published ? (isArabic ? '● منشور' : '● Published') : (isArabic ? '● مسودة' : '● Draft')}
                    </span>
                  ) : null}
                  {/* Language switcher */}
                  <div className="flex overflow-hidden rounded-lg border border-slate-200 bg-white text-[11px] font-bold">
                    {['ar', 'en'].map((l) => (
                      <button key={l} type="button" onClick={() => setAiContentLang(l)}
                        className={`px-3 py-1 transition ${aiContentLang === l ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
                        {l === 'ar' ? 'عربي' : 'EN'}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button type="button" onClick={onGenerateAiContent} disabled={aiContentLoading}
                    className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50">
                    {aiContentLoading ? (isArabic ? 'جاري التوليد...' : 'Generating...') : (aiContent ? (isArabic ? '🔄 إعادة توليد' : '🔄 Regenerate') : (isArabic ? '✨ توليد بالذكاء الاصطناعي' : '✨ Generate with AI'))}
                  </button>
                  {aiContent?.flashcards?.length ? (
                    aiContent.published ? (
                      <button type="button" onClick={onUnpublishAiContent}
                        className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 hover:bg-amber-100">
                        {isArabic ? 'إلغاء النشر' : 'Unpublish'}
                      </button>
                    ) : (
                      <button type="button" onClick={onPublishAiContent}
                        className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100">
                        {isArabic ? 'نشر للطلاب' : 'Publish for Students'}
                      </button>
                    )
                  ) : null}
                </div>
              </div>

              {!aiContent || !aiContent.flashcards?.length ? (
                <p className="rounded-2xl bg-white px-4 py-6 text-center text-sm text-slate-500">
                  {isArabic ? 'لا يوجد محتوى بعد. اضغط "توليد بالذكاء الاصطناعي" لإنشاء البطاقات التعليمية والخريطة الذهنية.' : 'No content yet. Click "Generate with AI" to create flashcards and a mind map.'}
                </p>
              ) : (
                <>
                  {/* ── Flashcards list (shown only in flashcards section) ── */}
                  {instructorSection === 'flashcards' && <div>
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-sm font-bold text-slate-700">{isArabic ? `البطاقات التعليمية (${aiContent.flashcards.length})` : `Flashcards (${aiContent.flashcards.length})`}</p>
                      <button type="button" onClick={onAddCard}
                        className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 hover:bg-indigo-100">
                        {isArabic ? '+ إضافة بطاقة' : '+ Add Card'}
                      </button>
                    </div>
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                      {aiContent.flashcards.map((card, idx) => (
                        <div key={idx} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                          {editingCardIdx === idx ? (
                            <div className="space-y-2">
                              <textarea value={editCardDraft.question} onChange={(e) => setEditCardDraft((p) => ({ ...p, question: e.target.value }))}
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400" rows={2}
                                placeholder={isArabic ? 'السؤال' : 'Question'} />
                              <textarea value={editCardDraft.answer} onChange={(e) => setEditCardDraft((p) => ({ ...p, answer: e.target.value }))}
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400" rows={2}
                                placeholder={isArabic ? 'الإجابة' : 'Answer'} />
                              <div className="flex gap-2">
                                <button type="button" onClick={() => onSaveCard(idx)}
                                  className="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-bold text-white hover:bg-indigo-700">{isArabic ? 'حفظ' : 'Save'}</button>
                                <button type="button" onClick={() => setEditingCardIdx(null)}
                                  className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-bold text-slate-600 hover:bg-slate-50">{isArabic ? 'إلغاء' : 'Cancel'}</button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start gap-3">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-indigo-600 mb-0.5">{isArabic ? 'س:' : 'Q:'}</p>
                                <p className="text-sm text-slate-800">{card.question}</p>
                                <p className="mt-1 text-xs font-bold text-emerald-600 mb-0.5">{isArabic ? 'ج:' : 'A:'}</p>
                                <p className="text-sm text-slate-600">{card.answer}</p>
                              </div>
                              <div className="flex shrink-0 gap-1">
                                <button type="button"
                                  onClick={() => { setEditingCardIdx(idx); setEditCardDraft({ question: card.question, answer: card.answer }); }}
                                  className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-bold text-slate-600 hover:bg-slate-50">✎</button>
                                <button type="button" onClick={() => onDeleteCard(idx)}
                                  className="rounded-lg border border-rose-200 px-2 py-1 text-xs font-bold text-rose-600 hover:bg-rose-50">✕</button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>}

                  {/* ── Mind Map preview (shown only in mindmap section) ── */}
                  {instructorSection === 'mindmap' && aiContent.mindmap ? (
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-sm font-bold text-slate-700">{isArabic ? 'الخريطة الذهنية' : 'Mind Map'}</p>
                        <button type="button" onClick={() => { setMindmapDraft(JSON.parse(JSON.stringify(aiContent.mindmap))); setShowMindmapEditor(true); }}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-600 hover:bg-slate-50">
                          {isArabic ? 'تعديل' : 'Edit'}
                        </button>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm space-y-1">
                        <p className="font-bold text-slate-900">{aiContent.mindmap.title}</p>
                        {(aiContent.mindmap.branches || []).slice(0, 4).map((b, i) => (
                          <div key={i}>
                            <p className="text-xs font-semibold text-indigo-600">▸ {b.label}</p>
                            {(b.children || []).slice(0, 3).map((c, j) => (
                              <p key={j} className="text-xs text-slate-500 ml-3">• {c}</p>
                            ))}
                          </div>
                        ))}
                        {(aiContent.mindmap.branches || []).length > 4 ? (
                          <p className="text-xs text-slate-400">+{aiContent.mindmap.branches.length - 4} {isArabic ? 'أفرع أخرى' : 'more branches'}</p>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </>
              )}

              {/* Mind Map Editor Modal */}
              {showMindmapEditor && mindmapDraft ? (
                <Modal open onClose={() => setShowMindmapEditor(false)} title={isArabic ? 'تعديل الخريطة الذهنية' : 'Edit Mind Map'}>
                  <div className="space-y-3 p-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">{isArabic ? 'العنوان' : 'Title'}</label>
                      <input value={mindmapDraft.title} onChange={(e) => setMindmapDraft((p) => ({ ...p, title: e.target.value }))}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400" />
                    </div>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {(mindmapDraft.branches || []).map((branch, bi) => (
                        <div key={bi} className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
                          <input value={branch.label}
                            onChange={(e) => setMindmapDraft((p) => { const b = [...p.branches]; b[bi] = { ...b[bi], label: e.target.value }; return { ...p, branches: b }; })}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-bold outline-none focus:border-indigo-400"
                            placeholder={isArabic ? 'اسم الفرع' : 'Branch label'} />
                          <textarea value={(branch.children || []).join('\n')}
                            onChange={(e) => setMindmapDraft((p) => { const b = [...p.branches]; b[bi] = { ...b[bi], children: e.target.value.split('\n').filter(Boolean) }; return { ...p, branches: b }; })}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-indigo-400" rows={3}
                            placeholder={isArabic ? 'نقطة لكل سطر' : 'One point per line'} />
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2 justify-end pt-2">
                      <button type="button" onClick={() => setShowMindmapEditor(false)}
                        className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">
                        {isArabic ? 'إلغاء' : 'Cancel'}
                      </button>
                      <button type="button" onClick={onSaveMindmap}
                        className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700">
                        {isArabic ? 'حفظ' : 'Save'}
                      </button>
                    </div>
                  </div>
                </Modal>
              ) : null}
            </article>
          ) : null}

          {/* ── Quiz Management Panel (hidden until selected) ── */}
          {instructorSection === 'quiz' && selectedLessonId ? (
            <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xl">🧠</span>
                  <h4 className="font-black text-slate-900">{isArabic ? 'الاختبار' : 'Quiz'}</h4>
                  {quiz ? (
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${quiz.isPublished ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {quiz.isPublished ? (isArabic ? 'منشور' : 'Published') : (isArabic ? 'مسودة' : 'Draft')}
                    </span>
                  ) : null}
                  {/* Language switcher */}
                  <div className="flex overflow-hidden rounded-lg border border-slate-200 bg-white text-[11px] font-bold">
                    {['ar', 'en'].map((l) => (
                      <button key={l} type="button"
                        onClick={async () => {
                          setQuizViewLang(l);
                          const subjectId = getSubjectId();
                          if (subjectId && selectedLessonId) {
                            const q = await fetchLessonQuiz(subjectId, selectedLessonId, l).catch(() => null);
                            setQuiz(q);
                          }
                        }}
                        className={`px-3 py-1 transition ${quizViewLang === l ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
                        {l === 'ar' ? 'عربي' : 'EN'}
                      </button>
                    ))}
                  </div>
                </div>
                {!quiz ? (
                  <button type="button" onClick={onCreateQuiz}
                    className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700">
                    {isArabic ? '+ إنشاء اختبار' : '+ Create Quiz'}
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={onTogglePublish}
                      className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${quiz.isPublished ? 'border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100' : 'border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}>
                      {quiz.isPublished ? (isArabic ? 'إلغاء النشر' : 'Unpublish') : (isArabic ? 'نشر' : 'Publish')}
                    </button>
                    <button type="button" onClick={onDeleteQuiz}
                      className="rounded-xl border border-rose-200 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-50">
                      {isArabic ? 'حذف' : 'Delete'}
                    </button>
                  </div>
                )}
              </div>

              {quiz ? (
                <div className="space-y-4">
                  {/* Quiz info bar */}
                  <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-semibold text-slate-600">
                    <span>📊 {isArabic ? 'المستوى:' : 'Difficulty:'} {quiz.difficulty}</span>
                    <span className="flex items-center gap-1.5">
                      ✅ {isArabic ? 'درجة النجاح:' : 'Passing score:'}
                      <input
                        type="number"
                        min="1"
                        max="100"
                        defaultValue={quiz.passingScore}
                        onBlur={async (e) => {
                          const val = Math.min(100, Math.max(1, Number(e.target.value) || 70));
                          if (val === quiz.passingScore) return;
                          const subjectId = getSubjectId();
                          try {
                            const updated = await updateLessonQuiz(subjectId, selectedLessonId, quiz.id, { passingScore: val });
                            setQuiz(updated);
                          } catch (err) { setError(safeError(err)); }
                        }}
                        className="w-14 rounded-lg border border-slate-300 bg-slate-50 px-2 py-0.5 text-center text-xs font-bold text-slate-800 focus:border-indigo-400 focus:outline-none"
                      />
                      %
                    </span>
                    <span>❓ {isArabic ? 'الأسئلة:' : 'Questions:'} {(quiz.questions || []).length}</span>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => { setGenerateForm((p) => ({ ...p, lang: quizViewLang })); setShowGenerateModal(true); }} disabled={quizGenerating}
                      className="rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white hover:bg-purple-700 disabled:opacity-50">
                      {quizGenerating ? '⏳ ' : '✨ '}{isArabic ? 'توليد أسئلة بالذكاء الاصطناعي' : 'Generate with AI'}
                    </button>
                    <button type="button" onClick={() => setShowAddQuestionModal(true)}
                      className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">
                      {isArabic ? '+ إضافة سؤال يدوياً' : '+ Add Question Manually'}
                    </button>
                  </div>

                  {/* Questions list */}
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      {isArabic ? `الأسئلة (${(quiz.questions || []).length})` : `Questions (${(quiz.questions || []).length})`}
                    </p>
                  </div>

                  {(quiz.questions || []).length === 0 ? (
                    <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
                      <p className="text-2xl mb-2">❓</p>
                      <p className="text-sm font-semibold text-slate-500">
                        {isArabic ? 'لا توجد أسئلة بعد' : 'No questions yet'}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {isArabic ? 'استخدم "توليد بالذكاء الاصطناعي" أو أضف يدوياً' : 'Use "Generate with AI" or add manually'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-[45vh] overflow-auto pr-1">
                      {quiz.questions.map((q, idx) => (
                        <div key={q.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-indigo-200">
                          {/* Question header */}
                          <div role="button" tabIndex={0}
                            onClick={() => setExpandedQuestionId(expandedQuestionId === q.id ? null : q.id)}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setExpandedQuestionId(expandedQuestionId === q.id ? null : q.id); }}
                            className="flex cursor-pointer items-start gap-3 px-4 py-3 hover:bg-slate-50">
                            <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-xs font-black text-white mt-0.5">{idx + 1}</span>
                            <span className="flex-1 text-sm font-semibold leading-snug text-slate-800 line-clamp-2">{q.question}</span>
                            <div className="flex flex-shrink-0 items-center gap-2 pt-0.5">
                              <span className="text-slate-300 text-xs">{expandedQuestionId === q.id ? '▲' : '▼'}</span>
                              <button type="button" onClick={(e) => { e.stopPropagation(); onDeleteQuestion(q.id); }}
                                className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-[10px] font-bold text-rose-600 transition hover:bg-rose-100">
                                {isArabic ? 'حذف' : 'Remove'}
                              </button>
                            </div>
                          </div>

                          {/* Expanded answer view */}
                          {expandedQuestionId === q.id ? (
                            <div className="border-t border-slate-100 bg-slate-50 px-4 pb-4 pt-3 space-y-2">
                              {(q.options || []).map((opt, oi) => (
                                <div key={oi} className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs ${
                                  oi === q.correctAnswer
                                    ? 'bg-emerald-100 font-bold text-emerald-800 ring-1 ring-emerald-300'
                                    : 'bg-white text-slate-600 ring-1 ring-slate-200'
                                }`}>
                                  <span className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-black ${
                                    oi === q.correctAnswer ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'
                                  }`}>{oi === q.correctAnswer ? '✓' : String.fromCharCode(65 + oi)}</span>
                                  <span dir="auto">{opt}</span>
                                  {oi === q.correctAnswer ? <span className="ml-auto text-emerald-600 text-[10px] font-bold">{isArabic ? 'الإجابة الصحيحة' : 'Correct'}</span> : null}
                                </div>
                              ))}
                              {q.explanation ? (
                                <div className="mt-1 rounded-xl bg-indigo-50 px-3 py-2 text-xs text-indigo-700">
                                  💡 {q.explanation}
                                </div>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-slate-400 text-center py-4">
                  {isArabic ? 'لا يوجد اختبار لهذا الدرس بعد.' : 'No quiz for this lesson yet.'}
                </p>
              )}
            </article>
          ) : null}

          {/* ── Generate with AI — full overlay ── */}
          {showGenerateModal ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
              <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">

                {/* Header */}
                <div className="bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-600 px-6 py-6 text-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20 text-xl backdrop-blur-sm">✨</div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-purple-200">{isArabic ? 'الذكاء الاصطناعي' : 'AI-Powered'}</p>
                        <h3 className="text-lg font-black">{isArabic ? 'توليد أسئلة الاختبار' : 'Generate Quiz Questions'}</h3>
                      </div>
                    </div>
                    <button type="button" onClick={() => setShowGenerateModal(false)}
                      className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-white/80 hover:bg-white/20">✕</button>
                  </div>
                  <p className="mt-2 text-xs text-purple-200">
                    {isArabic
                      ? 'سيولّد الذكاء الاصطناعي أسئلة بلغة سليمة بناءً على محتوى الدرس'
                      : 'AI will generate well-written questions based on lesson content'}
                  </p>
                </div>

                <div className="space-y-5 px-6 py-6">
                  {/* Language + Count row */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                        {isArabic ? 'لغة الأسئلة' : 'Language'}
                      </label>
                      <div className="flex overflow-hidden rounded-xl border border-slate-200">
                        {[{ v: 'ar', label: 'العربية', flag: '🇸🇦' }, { v: 'en', label: 'English', flag: '🇺🇸' }].map(({ v, label, flag }) => {
                          const active = (generateForm.lang || (isArabic ? 'ar' : 'en')) === v;
                          return (
                            <button key={v} type="button" onClick={() => setGenerateForm((p) => ({ ...p, lang: v }))}
                              className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-bold transition ${active ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
                              {flag} {label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                        {isArabic ? 'عدد الأسئلة' : 'Questions'}
                      </label>
                      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
                        <button type="button" onClick={() => setGenerateForm((p) => ({ ...p, numQuestions: Math.max(3, p.numQuestions - 1) }))}
                          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-black text-slate-600 hover:bg-slate-200">−</button>
                        <span className="flex-1 text-center text-lg font-black text-slate-900">{generateForm.numQuestions}</span>
                        <button type="button" onClick={() => setGenerateForm((p) => ({ ...p, numQuestions: Math.min(20, p.numQuestions + 1) }))}
                          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-black text-slate-600 hover:bg-slate-200">+</button>
                      </div>
                      <p className="mt-1 text-center text-[10px] text-slate-400">3 – 20</p>
                    </div>
                  </div>

                  {/* Difficulty cards */}
                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                      {isArabic ? 'مستوى الصعوبة' : 'Difficulty'}
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { v: 'EASY',   icon: '🟢', ar: 'سهل',    en: 'Easy',   desc_ar: 'تذكر وفهم',        desc_en: 'Recall & Comprehension', cls: 'border-emerald-300 bg-emerald-50 text-emerald-800', selCls: 'ring-2 ring-emerald-500' },
                        { v: 'MEDIUM', icon: '🟡', ar: 'متوسط', en: 'Medium', desc_ar: 'تطبيق ومقارنة',    desc_en: 'Apply & Compare',        cls: 'border-amber-300   bg-amber-50   text-amber-800',   selCls: 'ring-2 ring-amber-500'   },
                        { v: 'HARD',   icon: '🔴', ar: 'صعب',    en: 'Hard',   desc_ar: 'تحليل وتركيب',    desc_en: 'Analyse & Synthesise',   cls: 'border-rose-300    bg-rose-50    text-rose-800',    selCls: 'ring-2 ring-rose-500'    },
                      ].map(({ v, icon, ar, en, desc_ar, desc_en, cls, selCls }) => {
                        const active = generateForm.difficulty === v;
                        return (
                          <button key={v} type="button" onClick={() => setGenerateForm((p) => ({ ...p, difficulty: v }))}
                            className={`flex flex-col items-center gap-1 rounded-2xl border-2 px-2 py-3 text-center transition ${cls} ${active ? selCls : 'opacity-60 hover:opacity-90'}`}>
                            <span className="text-xl">{icon}</span>
                            <span className="text-xs font-black">{isArabic ? ar : en}</span>
                            <span className="text-[9px] font-semibold opacity-70">{isArabic ? desc_ar : desc_en}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Topic notes */}
                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                      {isArabic ? 'توجيه الذكاء الاصطناعي (اختياري)' : 'AI Guidance (optional)'}
                    </label>
                    <textarea value={generateForm.notes}
                      onChange={(e) => setGenerateForm((p) => ({ ...p, notes: e.target.value }))}
                      placeholder={isArabic
                        ? 'مثال: ركّز على الفرق بين الوراثة والتغليف، وتجنب أسئلة التعريف المباشر'
                        : 'e.g. Focus on the difference between inheritance and encapsulation, avoid simple definition questions'}
                      rows={3}
                      className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-purple-400 focus:bg-white focus:ring-2 focus:ring-purple-100" />
                    <p className="mt-1 text-right text-[10px] text-slate-400">{generateForm.notes.length}/300</p>
                  </div>

                  {/* Generate button */}
                  <button type="button" onClick={onGenerateQuestions} disabled={quizGenerating}
                    className="relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-purple-400/30 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60">
                    {quizGenerating ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        {isArabic ? 'جارٍ التوليد بالذكاء الاصطناعي...' : 'Generating with AI...'}
                      </span>
                    ) : (
                      <span>✨ {isArabic ? `توليد ${generateForm.numQuestions} سؤال` : `Generate ${generateForm.numQuestions} Questions`}</span>
                    )}
                  </button>

                  {quizGenerating ? (
                    <p className="text-center text-xs text-slate-400">
                      {isArabic ? 'قد يستغرق ذلك 15-30 ثانية...' : 'This may take 15-30 seconds…'}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          {/* ── Add Question Manually Modal ── */}
          <Modal open={showAddQuestionModal} onClose={() => setShowAddQuestionModal(false)}
            title={isArabic ? 'إضافة سؤال يدوياً' : 'Add Question Manually'} maxWidth="max-w-lg">
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-600">{isArabic ? 'نص السؤال' : 'Question'}</label>
                <textarea value={addQuestionForm.question} onChange={(e) => setAddQuestionForm((p) => ({ ...p, question: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm min-h-[60px]"
                  placeholder={isArabic ? 'اكتب السؤال هنا...' : 'Enter question here...'} />
              </div>
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-2">
                  <input type="radio" name="correctAnswer" checked={addQuestionForm.correctAnswer === i}
                    onChange={() => setAddQuestionForm((p) => ({ ...p, correctAnswer: i }))}
                    className="accent-emerald-600" title={isArabic ? 'الإجابة الصحيحة' : 'Correct answer'} />
                  <input value={addQuestionForm.options[i]}
                    onChange={(e) => setAddQuestionForm((p) => { const opts = [...p.options]; opts[i] = e.target.value; return { ...p, options: opts }; })}
                    placeholder={`${isArabic ? 'الخيار' : 'Option'} ${String.fromCharCode(65 + i)}`}
                    className={`flex-1 h-9 rounded-xl border px-3 text-sm ${addQuestionForm.correctAnswer === i ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200'}`} />
                </div>
              ))}
              <p className="text-[10px] text-slate-400">{isArabic ? '🔘 حدد الإجابة الصحيحة بالنقر على الدائرة' : '🔘 Select the radio button next to the correct answer'}</p>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-600">{isArabic ? 'شرح الإجابة (اختياري)' : 'Explanation (optional)'}</label>
                <input value={addQuestionForm.explanation} onChange={(e) => setAddQuestionForm((p) => ({ ...p, explanation: e.target.value }))}
                  className="h-9 w-full rounded-xl border border-slate-200 px-3 text-sm"
                  placeholder={isArabic ? 'لماذا هذه الإجابة صحيحة؟' : 'Why is this answer correct?'} />
              </div>
              <button type="button" onClick={onAddQuestion}
                className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-bold text-white hover:bg-indigo-700">
                {isArabic ? '+ إضافة السؤال' : '+ Add Question'}
              </button>
            </div>
          </Modal>
        </section>
      </div>
    </InstructorLayout>
  );
}
