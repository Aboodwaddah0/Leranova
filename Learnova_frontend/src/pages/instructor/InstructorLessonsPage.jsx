import { useEffect, useMemo, useRef, useState } from "react";
import PptxGenJS from "pptxgenjs";
import PPTX_TEMPLATES from "../../utils/pptxTemplates";
import { makeHelpers } from "../../utils/pptxTemplates/helpers";
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
  generateLessonFlashcardsOnly,
  generateLessonMindmapOnly,
  updateLessonFlashcards,
  updateLessonMindmap,
  deleteLessonFlashcards,
  deleteLessonMindmap,
  generateLessonPowerSlides,
  deleteLessonPowerSlides,
  publishLessonAiContent,
  unpublishLessonAiContent,
  updateInstructorLessonMeta,
  suggestLessonMetadata,
  suggestLessonMetadataFromContent,
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

const TEMPLATE_PREVIEWS = {
  minimalist: {
    bg: '#FFFFFF',
    accent: '#2563EB',
    text: '#1E293B',
    layout: 'minimalist',
  },
  darkExec: {
    bg: '#0F172A',
    accent: '#38BDF8',
    text: '#E2E8F0',
    layout: 'darkExec',
  },
  splitScreen: {
    bg: '#FFFFFF',
    accent: '#F97316',
    text: '#1E293B',
    layout: 'splitScreen',
  },
  geometric: {
    bg: '#FAFAFA',
    accent: '#7C3AED',
    text: '#1E293B',
    layout: 'geometric',
  },
  gradientModern: {
    bg: '#1B2B4B',
    accent: '#60A5FA',
    text: '#FFFFFF',
    layout: 'gradientModern',
  },
  dashboard: {
    bg: '#F8FAFC',
    accent: '#3B82F6',
    text: '#1E293B',
    layout: 'dashboard',
  },
  diagonal: {
    bg: '#FFFFFF',
    accent: '#C8A951',
    text: '#1E293B',
    layout: 'diagonal',
  },
  fullBleed: {
    bg: '#1A1A2E',
    accent: '#F97316',
    text: '#FFFFFF',
    layout: 'fullBleed',
  },
  magazine: {
    bg: '#FFFFFF',
    accent: '#E11D48',
    text: '#1E293B',
    layout: 'magazine',
  },
  timelineJourney: {
    bg: '#F0F9FF',
    accent: '#0284C7',
    text: '#1E293B',
    layout: 'timelineJourney',
  },
};

const buildTemplatePreviewSvg = (templateKey) => {
  const spec = TEMPLATE_PREVIEWS[templateKey] || TEMPLATE_PREVIEWS.minimalist;
  const svg = (() => {
    switch (spec.layout) {
      case 'darkExec':
        return `
          <rect width="100%" height="100%" rx="18" fill="${spec.bg}"/>
          <rect x="0" y="0" width="100%" height="12" rx="18" fill="${spec.accent}"/>
          <rect x="14" y="24" width="54" height="8" rx="4" fill="#ffffff" opacity="0.9"/>
          <rect x="14" y="40" width="92" height="10" rx="5" fill="#ffffff" opacity="0.2"/>
          <rect x="14" y="58" width="72" height="10" rx="5" fill="#ffffff" opacity="0.15"/>
          <rect x="14" y="76" width="82" height="10" rx="5" fill="#ffffff" opacity="0.12"/>
          <rect x="84" y="26" width="86" height="64" rx="10" fill="#0B1220" stroke="${spec.accent}" stroke-width="2"/>
        `;
      case 'splitScreen':
        return `
          <rect width="100%" height="100%" rx="18" fill="${spec.bg}"/>
          <rect x="0" y="0" width="52%" height="100%" rx="18" fill="#1B3A5C"/>
          <rect x="52%" y="0" width="48%" height="100%" rx="18" fill="#FFFFFF"/>
          <circle cx="32" cy="36" r="18" fill="${spec.accent}" opacity="0.85"/>
          <rect x="104" y="28" width="66" height="10" rx="5" fill="#1B3A5C"/>
          <rect x="104" y="46" width="48" height="8" rx="4" fill="#1B3A5C" opacity="0.45"/>
          <rect x="104" y="60" width="58" height="8" rx="4" fill="#1B3A5C" opacity="0.35"/>
        `;
      case 'geometric':
        return `
          <rect width="100%" height="100%" rx="18" fill="${spec.bg}"/>
          <circle cx="170" cy="18" r="44" fill="${spec.accent}" opacity="0.18"/>
          <circle cx="18" cy="164" r="34" fill="${spec.accent}" opacity="0.12"/>
          <rect x="18" y="18" width="70" height="18" rx="9" fill="${spec.accent}"/>
          <rect x="18" y="52" width="126" height="10" rx="5" fill="${spec.text}" opacity="0.2"/>
          <rect x="18" y="70" width="108" height="10" rx="5" fill="${spec.text}" opacity="0.16"/>
          <rect x="114" y="26" width="60" height="76" rx="14" fill="${spec.accent}" opacity="0.16" stroke="${spec.accent}" stroke-width="2"/>
        `;
      case 'gradientModern':
        return `
          <defs>
            <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stop-color="#2563EB" stop-opacity="0.95"/>
              <stop offset="100%" stop-color="#1E40AF" stop-opacity="0.9"/>
            </linearGradient>
          </defs>
          <rect width="100%" height="100%" rx="18" fill="url(#g)"/>
          <rect x="14" y="18" width="86" height="8" rx="4" fill="#FFFFFF" opacity="0.85"/>
          <rect x="14" y="36" width="122" height="10" rx="5" fill="#FFFFFF" opacity="0.22"/>
          <rect x="14" y="54" width="92" height="10" rx="5" fill="#FFFFFF" opacity="0.18"/>
          <rect x="104" y="18" width="66" height="90" rx="14" fill="#FFFFFF" opacity="0.12" stroke="#FFFFFF" stroke-opacity="0.18"/>
        `;
      case 'dashboard':
        return `
          <rect width="100%" height="100%" rx="18" fill="${spec.bg}"/>
          <rect x="0" y="0" width="100%" height="24" rx="18" fill="#1E293B"/>
          <rect x="14" y="34" width="70" height="24" rx="8" fill="${spec.accent}" opacity="0.9"/>
          <rect x="14" y="66" width="58" height="18" rx="6" fill="#E2E8F0"/>
          <rect x="82" y="34" width="90" height="52" rx="12" fill="#FFFFFF" stroke="#CBD5E1"/>
          <rect x="86" y="40" width="38" height="8" rx="4" fill="${spec.accent}"/>
          <rect x="86" y="56" width="62" height="6" rx="3" fill="#CBD5E1"/>
          <rect x="86" y="68" width="50" height="6" rx="3" fill="#CBD5E1"/>
        `;
      case 'diagonal':
        return `
          <rect width="100%" height="100%" rx="18" fill="${spec.bg}"/>
          <polygon points="0,122 122,0 176,0 176,48 58,166 0,166" fill="#1B2B4B"/>
          <polygon points="0,150 150,0 176,0 176,20 20,166 0,166" fill="${spec.accent}" opacity="0.55"/>
          <rect x="18" y="20" width="60" height="10" rx="5" fill="#FFFFFF" opacity="0.9"/>
          <rect x="18" y="40" width="94" height="8" rx="4" fill="#FFFFFF" opacity="0.2"/>
          <rect x="18" y="56" width="76" height="8" rx="4" fill="#FFFFFF" opacity="0.15"/>
        `;
      case 'fullBleed':
        return `
          <defs>
            <linearGradient id="fb" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stop-color="#1A1A2E"/>
              <stop offset="100%" stop-color="#0F172A"/>
            </linearGradient>
          </defs>
          <rect width="100%" height="100%" rx="18" fill="url(#fb)"/>
          <rect x="0" y="0" width="100%" height="60%" rx="18" fill="#F97316" opacity="0.18"/>
          <rect x="14" y="102" width="110" height="8" rx="4" fill="#FFFFFF" opacity="0.92"/>
          <rect x="14" y="118" width="72" height="8" rx="4" fill="#FFFFFF" opacity="0.45"/>
        `;
      case 'magazine':
        return `
          <rect width="100%" height="100%" rx="18" fill="${spec.bg}"/>
          <rect x="0" y="0" width="100%" height="26" rx="18" fill="${spec.accent}"/>
          <rect x="16" y="36" width="82" height="9" rx="4" fill="${spec.accent}"/>
          <rect x="16" y="54" width="66" height="7" rx="3" fill="#64748B" opacity="0.35"/>
          <rect x="16" y="68" width="52" height="7" rx="3" fill="#64748B" opacity="0.28"/>
          <rect x="104" y="36" width="56" height="84" rx="12" fill="#FCE7F3" stroke="${spec.accent}" stroke-width="2"/>
        `;
      case 'timelineJourney':
        return `
          <rect width="100%" height="100%" rx="18" fill="${spec.bg}"/>
          <rect x="0" y="92" width="100%" height="18" rx="9" fill="${spec.accent}" opacity="0.22"/>
          <circle cx="30" cy="101" r="8" fill="${spec.accent}"/>
          <circle cx="84" cy="101" r="8" fill="#CBD5E1"/>
          <circle cx="138" cy="101" r="8" fill="#CBD5E1"/>
          <rect x="16" y="20" width="92" height="10" rx="5" fill="${spec.text}" opacity="0.22"/>
          <rect x="16" y="40" width="120" height="8" rx="4" fill="${spec.text}" opacity="0.16"/>
          <rect x="118" y="18" width="40" height="56" rx="12" fill="#FFFFFF" stroke="${spec.accent}" stroke-width="2"/>
        `;
      default:
        return `
          <rect width="100%" height="100%" rx="18" fill="${spec.bg}"/>
          <rect x="0" y="0" width="100%" height="14" rx="18" fill="${spec.accent}"/>
          <rect x="16" y="28" width="82" height="10" rx="5" fill="${spec.text}" opacity="0.22"/>
          <rect x="16" y="46" width="116" height="8" rx="4" fill="${spec.text}" opacity="0.16"/>
          <rect x="16" y="62" width="92" height="8" rx="4" fill="${spec.text}" opacity="0.12"/>
        `;
    }
  })();

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 176 128" preserveAspectRatio="none">
      ${svg}
    </svg>
  `)}`;
};

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
  const [aiGenTopic, setAiGenTopic] = useState('');
  const [aiGenLang, setAiGenLang] = useState(isArabic ? 'ar' : 'en');
  const [showAiGenModal, setShowAiGenModal] = useState(false);
  const [aiGenType, setAiGenType] = useState('flashcards');
  const [slidesGenerating, setSlidesGenerating] = useState(false);
  const [showSlidesModal, setShowSlidesModal] = useState(false);
  const [slidesForm, setSlidesForm] = useState({ lang: isArabic ? 'ar' : 'en', numSlides: 10, theme: 'minimalist', topic: '' });
  const [instructorSection, setInstructorSection] = useState(null);
  const [editingCardIdx, setEditingCardIdx] = useState(null);
  const [editCardDraft, setEditCardDraft] = useState({ question: '', answer: '' });
  const [showMindmapEditor, setShowMindmapEditor] = useState(false);
  const [mindmapDraft, setMindmapDraft] = useState(null);

  // ── Suggest from content state ───────────────────────────────────────────────
  const [suggestingMeta, setSuggestingMeta] = useState(false);
  const [suggestMetaLang, setSuggestMetaLang] = useState(isArabic ? 'ar' : 'en');

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
    setInstructorSection(null);
    setAiContent(null);
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

  const onWizardSuggest = async (subjectId, filename, lang, hint) =>
    suggestLessonMetadata(subjectId, filename, lang, hint).catch(() => null);

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

  const onOpenAiGenModal = (type) => {
    setAiGenType(type);
    setAiGenTopic('');
    setAiGenLang(isArabic ? 'ar' : 'en');
    setShowAiGenModal(true);
  };

  const onConfirmAiGen = async () => {
    if (!selectedLessonId) return;
    setShowAiGenModal(false);
    setAiContentLoading(true);
    try {
      if (aiGenType === 'flashcards') {
        const d = await generateLessonFlashcardsOnly(selectedLessonId, aiGenLang, aiGenTopic);
        setAiContent((prev) => ({ ...prev, ...d, flashcards: d?.flashcards ?? prev?.flashcards }));
      } else {
        const d = await generateLessonMindmapOnly(selectedLessonId, aiGenLang, aiGenTopic);
        setAiContent((prev) => ({ ...prev, ...d, mindmap: d?.mindmap ?? prev?.mindmap }));
      }
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

  const onDeleteFlashcards = async () => {
    if (!window.confirm(isArabic ? 'هل تريد حذف جميع البطاقات التعليمية؟' : 'Delete all flashcards?')) return;
    try {
      await deleteLessonFlashcards(selectedLessonId);
      setAiContent((prev) => ({ ...prev, flashcards: null }));
    } catch (err) { setError(safeError(err)); }
  };

  const onDeleteMindmap = async () => {
    if (!window.confirm(isArabic ? 'هل تريد حذف الخريطة الذهنية؟' : 'Delete the mind map?')) return;
    try {
      await deleteLessonMindmap(selectedLessonId);
      setAiContent((prev) => ({ ...prev, mindmap: null }));
    } catch (err) { setError(safeError(err)); }
  };

  const onGeneratePowerSlides = async () => {
    if (!selectedLessonId) return;
    setShowSlidesModal(false);
    setSlidesGenerating(true);
    try {
      const d = await generateLessonPowerSlides(selectedLessonId, slidesForm);
      setAiContent((prev) => ({ ...prev, powerSlides: d?.powerSlides ?? null }));
    } catch (err) { setError(safeError(err)); } finally { setSlidesGenerating(false); }
  };

  const onDeletePowerSlides = async () => {
    if (!window.confirm(isArabic ? 'هل تريد حذف الشرائح؟' : 'Delete the slides?')) return;
    try {
      await deleteLessonPowerSlides(selectedLessonId);
      setAiContent((prev) => ({ ...prev, powerSlides: null }));
    } catch (err) { setError(safeError(err)); }
  };

  const onDownloadPptx = async () => {
    const slides = aiContent?.powerSlides;
    if (!slides?.slides?.length) return;

    const pptx = new PptxGenJS();
    pptx.layout = 'LAYOUT_WIDE';
    const W = 13.33, H = 7.5, total = slides.slides.length;
    const isRTL = slidesForm.lang === 'ar';
    const al = isRTL ? 'right' : 'left';
    const ctx = { pptx, W, H, total, isRTL, al, ...makeHelpers({ pptx, W, H, isRTL, al }) };

    const tplKey = slides.theme in PPTX_TEMPLATES ? slides.theme : 'minimalist';
    slides.slides.forEach((slide, idx) => {
      const s = pptx.addSlide();
      PPTX_TEMPLATES[tplKey](s, slide, idx, ctx);

    });

    const filename = `${(slides.title || 'slides').replace(/[^a-zA-Z0-9؀-ۿ\s]/g, '').trim().slice(0, 40)}.pptx`;
    await pptx.writeFile({ fileName: filename });
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

  const onSuggestFromContent = async () => {
    if (!selectedLessonId || suggestingMeta) return;
    const lesson = lessons.find((l) => String(l.id) === String(selectedLessonId));
    const subjectId = lesson?.subject?.id || lesson?.subjectId;
    if (!subjectId) return;
    setSuggestingMeta(true);
    try {
      const suggestion = await suggestLessonMetadataFromContent(subjectId, selectedLessonId, suggestMetaLang);
      if (!suggestion?.title && !suggestion?.description) return;
      const confirmed = window.confirm(
        isArabic
          ? `تطبيق الاقتراح المبني على محتوى الفيديو؟\n\nالعنوان: ${suggestion.title}\nالوصف: ${suggestion.description}`
          : `Apply suggestion based on video content?\n\nTitle: ${suggestion.title}\nDescription: ${suggestion.description}`
      );
      if (confirmed) {
        await updateInstructorLessonMeta(subjectId, selectedLessonId, {
          title: suggestion.title || '',
          description: suggestion.description || '',
        });
        await refreshLessons();
      }
    } catch (err) { setError(safeError(err)); }
    finally { setSuggestingMeta(false); }
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
            {/* Suggest title & description from actual video content (available after RAG indexing) */}
            {selectedLessonId && attachments.length > 0 ? (
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex overflow-hidden rounded-lg border border-slate-200 text-[11px] font-bold">
                  {['ar', 'en'].map((l) => (
                    <button key={l} type="button"
                      onClick={() => setSuggestMetaLang(l)}
                      className={`px-2.5 py-1.5 transition ${suggestMetaLang === l ? 'bg-indigo-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>
                      {l === 'ar' ? 'عربي' : 'EN'}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={onSuggestFromContent}
                  disabled={suggestingMeta}
                  title={isArabic ? 'اقتراح عنوان ووصف بناءً على محتوى الفيديو الفعلي' : 'Suggest title & description from actual video content'}
                  className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 whitespace-nowrap"
                >
                  {suggestingMeta ? '⏳' : '✨'} {isArabic ? 'اقتراح من المحتوى' : 'Suggest from Content'}
                </button>
              </div>
            ) : null}
          </div>

          {/* ── Section navigation ── */}
          {selectedLessonId ? (
            <div className="flex flex-wrap gap-2 border-b border-slate-100 pb-3">
              {[
                { id: 'attachments',    label: isArabic ? 'المرفقات' : 'Attachments',     badge: attachments.length || null },
                { id: 'comments',       label: isArabic ? 'التعليقات' : 'Comments',       badge: comments.length || null },
                { id: 'flashcards',     label: isArabic ? 'البطاقات' : 'Flashcards',      badge: aiContent?.flashcards?.length || null },
                { id: 'mindmap',        label: isArabic ? 'الخريطة' : 'Mind Map',         badge: null },
                { id: 'quiz',           label: isArabic ? 'الاختبار' : 'Quiz',             badge: quiz?.questionCount || null },
                { id: 'slides',         label: isArabic ? 'الشرائح' : 'Slides',            badge: aiContent?.powerSlides?.slides?.length || null },
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
              {/* Shared: publish status */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {aiContent ? (
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${aiContent.published ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {aiContent.published ? (isArabic ? '● منشور' : '● Published') : (isArabic ? '● مسودة' : '● Draft')}
                    </span>
                  ) : null}
                </div>
                {(aiContent?.flashcards?.length || aiContent?.mindmap) ? (
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

              {/* ── Flashcards list (shown only in flashcards section) ── */}
              {instructorSection === 'flashcards' && (
                <>
                  {/* Flashcards generate button */}
                  <div className="flex items-center justify-between">
                    <h4 className="font-black text-slate-900">{isArabic ? `🃏 البطاقات التعليمية${aiContent?.flashcards?.length ? ` (${aiContent.flashcards.length})` : ''}` : `🃏 Flashcards${aiContent?.flashcards?.length ? ` (${aiContent.flashcards.length})` : ''}`}</h4>
                    <div className="flex gap-2">
                      {aiContent?.flashcards?.length ? (
                        <>
                          <button type="button" onClick={onAddCard}
                            className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 hover:bg-indigo-100">
                            {isArabic ? '+ إضافة' : '+ Add'}
                          </button>
                          <button type="button" onClick={onDeleteFlashcards}
                            className="rounded-lg border border-red-200 bg-red-50 px-3 py-1 text-xs font-bold text-red-600 hover:bg-red-100">
                            {isArabic ? '🗑 حذف' : '🗑 Delete'}
                          </button>
                        </>
                      ) : null}
                      <button type="button" onClick={() => onOpenAiGenModal('flashcards')} disabled={aiContentLoading}
                        className="rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50">
                        {aiContentLoading ? '...' : (aiContent?.flashcards?.length ? (isArabic ? '🔄 إعادة توليد' : '🔄 Regenerate') : (isArabic ? '✨ توليد' : '✨ Generate'))}
                      </button>
                    </div>
                  </div>
                  {!aiContent?.flashcards?.length ? (
                    <p className="rounded-2xl bg-white px-4 py-6 text-center text-sm text-slate-500">
                      {isArabic ? 'لا توجد بطاقات بعد. اضغط "توليد" لإنشائها.' : 'No flashcards yet. Click "Generate" to create them.'}
                    </p>
                  ) : (
                  <div>
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
                  </div>
                  )}
                </>
              )}

              {/* ── Mind Map section ── */}
              {instructorSection === 'mindmap' && (
                <>
                  {/* Mindmap generate button */}
                  <div className="flex items-center justify-between">
                    <h4 className="font-black text-slate-900">{isArabic ? '🗺️ الخريطة الذهنية' : '🗺️ Mind Map'}</h4>
                    <div className="flex gap-2">
                      {aiContent?.mindmap ? (
                        <>
                          <button type="button" onClick={() => { setMindmapDraft(JSON.parse(JSON.stringify(aiContent.mindmap))); setShowMindmapEditor(true); }}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-600 hover:bg-slate-50">
                            {isArabic ? 'تعديل' : 'Edit'}
                          </button>
                          <button type="button" onClick={onDeleteMindmap}
                            className="rounded-lg border border-red-200 bg-red-50 px-3 py-1 text-xs font-bold text-red-600 hover:bg-red-100">
                            {isArabic ? '🗑 حذف' : '🗑 Delete'}
                          </button>
                        </>
                      ) : null}
                      <button type="button" onClick={() => onOpenAiGenModal('mindmap')} disabled={aiContentLoading}
                        className="rounded-xl bg-purple-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-purple-700 disabled:opacity-50">
                        {aiContentLoading ? '...' : (aiContent?.mindmap ? (isArabic ? '🔄 إعادة توليد' : '🔄 Regenerate') : (isArabic ? '✨ توليد' : '✨ Generate'))}
                      </button>
                    </div>
                  </div>
                  {!aiContent?.mindmap ? (
                    <p className="rounded-2xl bg-white px-4 py-6 text-center text-sm text-slate-500">
                      {isArabic ? 'لا توجد خريطة بعد. اضغط "توليد" لإنشائها.' : 'No mind map yet. Click "Generate" to create it.'}
                    </p>
                  ) : (
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm space-y-1">
                      <p className="font-bold text-slate-900">{aiContent.mindmap.title}</p>
                      {(aiContent.mindmap.branches || []).slice(0, 5).map((b, i) => (
                        <div key={i}>
                          <p className="text-xs font-semibold text-purple-600">▸ {b.label}</p>
                          {(b.children || []).slice(0, 3).map((c, j) => (
                            <p key={j} className="text-xs text-slate-500 ml-3">• {c}</p>
                          ))}
                        </div>
                      ))}
                      {(aiContent.mindmap.branches || []).length > 5 ? (
                        <p className="text-xs text-slate-400">+{aiContent.mindmap.branches.length - 5} {isArabic ? 'أفرع أخرى' : 'more branches'}</p>
                      ) : null}
                    </div>
                  )}
                </>
              )}

              {/* AI Generation Options Modal */}
              {showAiGenModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                  <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">

                    {/* Header */}
                    <div className="bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-600 px-6 py-6 text-white">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20 text-xl backdrop-blur-sm">✨</div>
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-purple-200">{isArabic ? 'الذكاء الاصطناعي' : 'AI-Powered'}</p>
                            <h3 className="text-lg font-black">
                              {aiGenType === 'flashcards'
                                ? (isArabic ? 'توليد البطاقات التعليمية' : 'Generate Flashcards')
                                : (isArabic ? 'توليد الخريطة الذهنية' : 'Generate Mind Map')}
                            </h3>
                          </div>
                        </div>
                        <button type="button" onClick={() => setShowAiGenModal(false)}
                          className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-white/80 hover:bg-white/20">✕</button>
                      </div>
                      <p className="mt-2 text-xs text-purple-200">
                        {isArabic
                          ? 'سيولّد الذكاء الاصطناعي المحتوى بناءً على محتوى الدرس'
                          : 'AI will generate content based on the lesson material'}
                      </p>
                    </div>

                    <div className="space-y-5 px-6 py-6">
                      {/* Language */}
                      <div>
                        <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                          {isArabic ? 'لغة التوليد' : 'Language'}
                        </label>
                        <div className="flex overflow-hidden rounded-xl border border-slate-200">
                          {[{ v: 'ar', flag: '🇸🇦', label: 'العربية' }, { v: 'en', flag: '🇺🇸', label: 'English' }].map(({ v, flag, label }) => {
                            const active = aiGenLang === v;
                            return (
                              <button key={v} type="button" onClick={() => setAiGenLang(v)}
                                className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-bold transition ${active ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
                                {flag} {label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Topic guidance */}
                      <div>
                        <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                          {isArabic ? 'توجيه الذكاء الاصطناعي (اختياري)' : 'AI Guidance (optional)'}
                        </label>
                        <textarea
                          value={aiGenTopic}
                          onChange={(e) => setAiGenTopic(e.target.value.slice(0, 300))}
                          placeholder={isArabic
                            ? 'مثال: ركّز على الوراثة والتغليف، وتجنب المفاهيم العامة'
                            : 'e.g. Focus on inheritance and encapsulation, avoid general concepts'}
                          rows={3}
                          autoFocus
                          className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-purple-400 focus:bg-white focus:ring-2 focus:ring-purple-100"
                        />
                        <p className="mt-1 text-right text-[10px] text-slate-400">{aiGenTopic.length}/300</p>
                      </div>

                      {/* Generate button */}
                      <button type="button" onClick={onConfirmAiGen}
                        className="relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-purple-400/30 transition hover:opacity-90">
                        ✨ {isArabic
                          ? (aiGenType === 'flashcards' ? 'توليد البطاقات' : 'توليد الخريطة')
                          : (aiGenType === 'flashcards' ? 'Generate Flashcards' : 'Generate Mind Map')}
                      </button>
                    </div>
                  </div>
                </div>
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

          {/* ── Slides Panel ── */}
          {instructorSection === 'slides' && selectedLessonId ? (
            <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-black text-slate-900">{isArabic ? `📊 الشرائح التقديمية${aiContent?.powerSlides?.slides?.length ? ` (${aiContent.powerSlides.slides.length})` : ''}` : `📊 Presentation Slides${aiContent?.powerSlides?.slides?.length ? ` (${aiContent.powerSlides.slides.length})` : ''}`}</h4>
                <div className="flex gap-2">
                  {aiContent?.powerSlides?.slides?.length ? (
                    <>
                      <button type="button" onClick={onDownloadPptx}
                        className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 shadow-sm">
                        ⬇ {isArabic ? 'تحميل PPTX' : 'Download PPTX'}
                      </button>
                      <button type="button" onClick={onDeletePowerSlides}
                        className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-100">
                        {isArabic ? '🗑 حذف' : '🗑 Delete'}
                      </button>
                    </>
                  ) : null}
                  <button type="button" onClick={() => { setSlidesForm(f => ({ ...f, lang: isArabic ? 'ar' : 'en', topic: '' })); setShowSlidesModal(true); }} disabled={slidesGenerating}
                    className="rounded-xl bg-violet-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-violet-700 disabled:opacity-50">
                    {slidesGenerating ? (isArabic ? '⏳ جارٍ التوليد...' : '⏳ Generating...') : (aiContent?.powerSlides?.slides?.length ? (isArabic ? '🔄 إعادة توليد' : '🔄 Regenerate') : (isArabic ? '✨ توليد' : '✨ Generate'))}
                  </button>
                </div>
              </div>

              {!aiContent?.powerSlides?.slides?.length ? (
                <div className="rounded-2xl bg-white px-4 py-10 text-center space-y-2">
                  <p className="text-3xl">📊</p>
                  <p className="text-sm font-bold text-slate-700">{isArabic ? 'لا توجد شرائح بعد' : 'No slides yet'}</p>
                  <p className="text-xs text-slate-400">{isArabic ? 'اضغط "توليد" لإنشاء عرض تقديمي احترافي من محتوى الدرس' : 'Click "Generate" to create a professional presentation from lesson content'}</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                  {aiContent.powerSlides.slides.map((slide, idx) => {
                    const THEME_PREVIEW = {
                      minimalist:     { header: '#2563EB', accent: '#2563EB', bg: '#FFFFFF',  text: '#FFFFFF' },
                      darkExec:       { header: '#1E293B', accent: '#38BDF8', bg: '#0F172A',  text: '#38BDF8' },
                      splitScreen:    { header: '#1B3A5C', accent: '#F97316', bg: '#FFFFFF',  text: '#FFFFFF' },
                      geometric:      { header: '#7C3AED', accent: '#7C3AED', bg: '#FAFAFA',  text: '#FFFFFF' },
                      gradientModern: { header: '#1B2B4B', accent: '#60A5FA', bg: '#1B2B4B',  text: '#60A5FA' },
                      dashboard:      { header: '#1E293B', accent: '#3B82F6', bg: '#F8FAFC',  text: '#FFFFFF' },
                      diagonal:       { header: '#1B2B4B', accent: '#C8A951', bg: '#FFFFFF',  text: '#FFFFFF' },
                      fullBleed:      { header: '#000000', accent: '#F97316', bg: '#1A1A2E',  text: '#F97316' },
                      magazine:       { header: '#E11D48', accent: '#E11D48', bg: '#FFFFFF',  text: '#FFFFFF' },
                      timelineJourney:{ header: '#0284C7', accent: '#0284C7', bg: '#F0F9FF',  text: '#FFFFFF' },
                      // legacy
                      corporate: { header: '#1B2B4B', accent: '#C8A951', bg: '#F4F6FB', text: '#FFFFFF' },
                      minimal:   { header: '#7C3AED', accent: '#7C3AED', bg: '#FAFAFA', text: '#FFFFFF' },
                    };
                    const colors = THEME_PREVIEW[aiContent.powerSlides.theme] ?? THEME_PREVIEW.corporate;
                    return (
                      <div key={idx} className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm" style={{ background: colors.bg }}>
                        <div className="px-4 py-2.5 flex items-center gap-2" style={{ background: colors.header }}>
                          <span className="text-[10px] font-black opacity-60" style={{ color: colors.text }}>{idx + 1}</span>
                          <span className="text-xs font-bold truncate" style={{ color: colors.text }}>{slide.title}</span>
                          {['title','summary','comparison','timeline','process','hierarchy','code','chart'].includes(slide.type) && (
                            <span className="ml-auto rounded-full bg-white/20 px-2 py-0.5 text-[9px] font-bold uppercase" style={{ color: colors.text }}>
                              {{ title: isArabic?'عنوان':'TITLE', summary: isArabic?'خلاصة':'SUMMARY', comparison: isArabic?'مقارنة':'COMPARE', timeline: isArabic?'جدول زمني':'TIMELINE', process: isArabic?'خطوات':'PROCESS', hierarchy: isArabic?'هيكل':'TREE', code: 'CODE', chart: isArabic?'رسم بياني':'CHART' }[slide.type]}
                            </span>
                          )}
                        </div>
                        <div className="flex gap-3 px-4 py-3">
                          <div className="flex-1 min-w-0 space-y-1">
                            {/* title */}
                            {slide.type === 'title' && slide.subtitle && <p className="text-sm italic" style={{ color: colors.accent }}>{slide.subtitle}</p>}
                            {/* content / summary */}
                            {(slide.type === 'content' || slide.type === 'summary') && (slide.bullets || []).map((b, bi) => (
                              <div key={bi} className="flex items-start gap-1.5">
                                <span className="mt-0.5 text-[8px] shrink-0" style={{ color: colors.accent }}>{slide.type === 'summary' ? '✓' : '▸'}</span>
                                <span className="text-xs text-slate-600">{b}</span>
                              </div>
                            ))}
                            {/* comparison */}
                            {slide.type === 'comparison' && (
                              <div className="grid grid-cols-2 gap-2">
                                <div><p className="text-[10px] font-bold mb-0.5" style={{ color: colors.accent }}>{slide.left?.label}</p>{(slide.left?.points || []).slice(0, 2).map((p, i) => <p key={i} className="text-[9px] text-slate-500">▸ {p}</p>)}</div>
                                <div><p className="text-[10px] font-bold mb-0.5" style={{ color: colors.accent }}>{slide.right?.label}</p>{(slide.right?.points || []).slice(0, 2).map((p, i) => <p key={i} className="text-[9px] text-slate-500">▸ {p}</p>)}</div>
                              </div>
                            )}
                            {/* timeline */}
                            {slide.type === 'timeline' && (
                              <div className="flex gap-2 overflow-x-auto py-0.5">
                                {(slide.steps || []).slice(0, 5).map((st, i) => (
                                  <div key={i} className="text-center shrink-0 min-w-[52px]">
                                    <p className="text-[9px] font-bold" style={{ color: colors.accent }}>{st.year}</p>
                                    <p className="text-[9px] text-slate-600">{st.label}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                            {/* process */}
                            {slide.type === 'process' && (
                              <div className="flex items-center gap-1 flex-wrap">
                                {(slide.steps || []).slice(0, 5).map((st, i) => (
                                  <span key={i} className="flex items-center gap-0.5">
                                    <span className="rounded px-1.5 py-0.5 text-[9px] font-bold text-white" style={{ background: colors.accent }}>{st}</span>
                                    {i < (slide.steps?.length ?? 0) - 1 && <span className="text-[10px]" style={{ color: colors.accent }}>→</span>}
                                  </span>
                                ))}
                              </div>
                            )}
                            {/* hierarchy */}
                            {slide.type === 'hierarchy' && (
                              <div className="text-center space-y-1">
                                <span className="inline-block rounded px-2 py-0.5 text-[9px] font-bold text-white" style={{ background: colors.accent }}>{slide.root}</span>
                                <div className="flex gap-1 justify-center flex-wrap">{(slide.children || []).slice(0, 4).map((c, i) => <span key={i} className="rounded border px-1.5 py-0.5 text-[9px]" style={{ borderColor: colors.accent, color: colors.accent }}>{c.label}</span>)}</div>
                              </div>
                            )}
                            {/* code */}
                            {slide.type === 'code' && (
                              <div className="rounded bg-slate-900 px-2 py-1.5">
                                <p className="text-[9px] font-mono font-bold" style={{ color: colors.accent }}>{slide.language}</p>
                                <p className="text-[9px] font-mono text-emerald-400 truncate">{(slide.code || '').split('\n')[0]}</p>
                              </div>
                            )}
                            {/* chart */}
                            {slide.type === 'chart' && (
                              <div className="flex items-center gap-2">
                                <span className="text-base">📊</span>
                                <div><p className="text-[9px] font-bold capitalize" style={{ color: colors.accent }}>{slide.chartType} chart</p><p className="text-[9px] text-slate-500 truncate">{(slide.labels || []).join(' · ')}</p></div>
                              </div>
                            )}
                            {slide.notes && <p className="text-[10px] italic text-slate-400 border-t border-slate-100 pt-1.5 mt-1">📝 {slide.notes}</p>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </article>
          ) : null}

          {/* ── Slides Generation Modal ── */}
          {showSlidesModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
              <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
                <div className="bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-600 px-6 py-6 text-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20 text-xl backdrop-blur-sm">📊</div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-purple-200">{isArabic ? 'الذكاء الاصطناعي' : 'AI-Powered'}</p>
                        <h3 className="text-lg font-black">{isArabic ? 'توليد الشرائح التقديمية' : 'Generate Presentation Slides'}</h3>
                      </div>
                    </div>
                    <button type="button" onClick={() => setShowSlidesModal(false)}
                      className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-white/80 hover:bg-white/20">✕</button>
                  </div>
                  <p className="mt-2 text-xs text-purple-200">
                    {isArabic ? 'سيولّد الذكاء الاصطناعي عرضاً تقديمياً احترافياً بناءً على محتوى الدرس' : 'AI will generate a professional presentation based on lesson content'}
                  </p>
                </div>

                <div className="space-y-5 px-6 py-6">
                  {/* Language */}
                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">{isArabic ? 'لغة الشرائح' : 'Language'}</label>
                    <div className="flex overflow-hidden rounded-xl border border-slate-200">
                      {[{ v: 'ar', flag: '🇸🇦', label: 'العربية' }, { v: 'en', flag: '🇺🇸', label: 'English' }].map(({ v, flag, label }) => (
                        <button key={v} type="button" onClick={() => setSlidesForm(f => ({ ...f, lang: v }))}
                          className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-bold transition ${slidesForm.lang === v ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
                          {flag} {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Slide count row */}
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">{isArabic ? 'عدد الشرائح' : 'Slide Count'}</label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[5, 10, 15].map(n => (
                          <button key={n} type="button" onClick={() => setSlidesForm(f => ({ ...f, numSlides: n }))}
                            className={`rounded-xl py-2.5 text-sm font-black transition border-2 ${slidesForm.numSlides === n ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}>
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">{isArabic ? 'القالب' : 'Template'}</label>
                      <div className="grid grid-cols-2 gap-3 md:grid-cols-5 md:gap-2">
                        {[
                          { v:'minimalist',     c1:'#FFFFFF', c2:'#2563EB', label: isArabic?'بسيط':'Minimalist' },
                          { v:'darkExec',       c1:'#0F172A', c2:'#38BDF8', label: isArabic?'تنفيذي':'Dark Exec' },
                          { v:'splitScreen',    c1:'#1B3A5C', c2:'#F97316', label: isArabic?'مقسوم':'Split' },
                          { v:'geometric',      c1:'#FAFAFA', c2:'#7C3AED', label: isArabic?'هندسي':'Geometric' },
                          { v:'gradientModern', c1:'#1B2B4B', c2:'#60A5FA', label: isArabic?'تدرجي':'Gradient' },
                          { v:'dashboard',      c1:'#1E293B', c2:'#3B82F6', label: isArabic?'لوحة':'Dashboard' },
                          { v:'diagonal',       c1:'#1B2B4B', c2:'#C8A951', label: isArabic?'قطري':'Diagonal' },
                          { v:'fullBleed',      c1:'#1A1A2E', c2:'#F97316', label: isArabic?'صورة كاملة':'Full Bleed' },
                          { v:'magazine',       c1:'#E11D48', c2:'#FFFFFF', label: isArabic?'مجلة':'Magazine' },
                          { v:'timelineJourney',c1:'#F0F9FF', c2:'#0284C7', label: isArabic?'رحلة':'Timeline' },
                        ].map(({ v, label }) => (
                          <button key={v} type="button" onClick={() => setSlidesForm(f => ({ ...f, theme: v }))}
                            className={`overflow-hidden rounded-2xl border-2 p-1.5 text-left transition ${slidesForm.theme === v ? 'border-indigo-500 bg-indigo-50 shadow-sm shadow-indigo-500/10' : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'}`}>
                            <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                              <img
                                src={buildTemplatePreviewSvg(v)}
                                alt={label}
                                className="h-full w-full object-cover"
                                loading="lazy"
                              />
                              {slidesForm.theme === v ? (
                                <div className="absolute inset-0 ring-2 ring-inset ring-indigo-500/80" />
                              ) : null}
                            </div>
                            <span className="mt-1.5 block truncate px-0.5 text-center text-[10px] font-bold leading-tight text-slate-700">{label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Topic */}
                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">{isArabic ? 'توجيه الذكاء الاصطناعي (اختياري)' : 'AI Guidance (optional)'}</label>
                    <textarea value={slidesForm.topic}
                      onChange={(e) => setSlidesForm(f => ({ ...f, topic: e.target.value.slice(0, 300) }))}
                      placeholder={isArabic ? 'مثال: ركّز على الوراثة والتغليف، وابدأ بمقدمة عن البرمجة الكائنية' : 'e.g. Focus on inheritance and encapsulation, start with OOP introduction'}
                      rows={3}
                      className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-purple-400 focus:bg-white focus:ring-2 focus:ring-purple-100" />
                    <p className="mt-1 text-right text-[10px] text-slate-400">{slidesForm.topic.length}/300</p>
                  </div>

                  {/* Generate button */}
                  <button type="button" onClick={onGeneratePowerSlides}
                    className="relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-purple-400/30 transition hover:opacity-90">
                    ✨ {isArabic ? `توليد ${slidesForm.numSlides} شريحة` : `Generate ${slidesForm.numSlides} Slides`}
                  </button>
                </div>
              </div>
            </div>
          )}

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
