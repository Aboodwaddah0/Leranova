import { useEffect, useRef, useState } from "react";
import PptxGenJS from "pptxgenjs";
import PPTX_TEMPLATES from "../../utils/pptxTemplates";
import { makeHelpers } from "../../utils/pptxTemplates/helpers";
import {
  ChevronRight, ChevronLeft, FolderOpen, Plus, Pencil, Trash2,
  Video, FileText, X, BookOpen, Upload, Sparkles, Brain,
  Map, HelpCircle, Layers, Paperclip, RefreshCw, Download,
  CheckCircle2, Circle, Eye, EyeOff, ZapOff, Zap,
} from "lucide-react";
import InstructorLayout from "../../components/instructor/InstructorLayout";
import {
  fetchInstructorCourses, fetchInstructorLessons, fetchInstructorLessonAttachments,
  fetchInstructorSubjects, fetchInstructorProfile,
  createInstructorLesson, updateInstructorLessonMeta, deleteInstructorLesson,
  uploadInstructorLessonAttachments, deleteInstructorLessonAttachment, reprocessLessonRag,
  fetchLessonAiContentInstructor, generateLessonFlashcardsOnly, generateLessonMindmapOnly,
  updateLessonFlashcards, updateLessonMindmap, deleteLessonFlashcards, deleteLessonMindmap,
  publishLessonAiContent, unpublishLessonAiContent,
  fetchLessonQuiz, createLessonQuiz, updateLessonQuiz, deleteLessonQuiz,
  generateLessonQuizQuestions, addLessonQuizQuestion, deleteLessonQuizQuestion,
  generateLessonPowerSlides, deleteLessonPowerSlides,
} from "../../services/instructorService";
import EducationLoading from "../../components/ui/EducationLoading";
import { useLanguage } from "../../utils/i18n";
import { notifyError, notifySuccess } from "../../lib/notify";
import { useSelector } from "react-redux";
import { formatGradeName } from "../../utils/gradeHelpers";
import { ORG_TYPES } from "../../utils/constants";

const safeError = (e) => e?.response?.data?.message || e?.message || "Request failed";
const DEFAULT_THUMB = "https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=600&auto=format&fit=crop";
const ACCENTS = ["from-cyan-500 to-blue-600","from-violet-500 to-fuchsia-600","from-amber-500 to-orange-500","from-emerald-500 to-teal-500"];
const AUTO_RE = /^Auto-created grade course for level (\d+)$/i;
const LEVEL_LABELS = {
  BEGINNER:     { en:"Beginner",     ar:"مبتدئ",  cls:"bg-emerald-100 text-emerald-700" },
  INTERMEDIATE: { en:"Intermediate", ar:"متوسط",  cls:"bg-sky-100 text-sky-700"         },
  ADVANCED:     { en:"Advanced",     ar:"متقدم",  cls:"bg-violet-100 text-violet-700"   },
  EXPERT:       { en:"Expert",       ar:"خبير",   cls:"bg-rose-100 text-rose-700"       },
};
const TABS = [
  { id:"overview",     icon: BookOpen,   en:"Overview",    ar:"نظرة عامة"   },
  { id:"attachments",  icon: Paperclip,  en:"Attachments", ar:"المرفقات"    },
  { id:"flashcards",   icon: Sparkles,   en:"Flashcards",  ar:"فلاش كاردز" },
  { id:"mindmap",      icon: Map,        en:"Mind Map",    ar:"خريطة ذهنية" },
  { id:"quiz",         icon: HelpCircle, en:"Quiz",        ar:"اختبار"      },
  { id:"slides",       icon: Layers,     en:"Slides",      ar:"الشرائح"     },
];
const SLIDE_THEMES = [
  { v:"minimalist",     c1:"#FFFFFF", c2:"#2563EB", en:"Minimalist",  ar:"بسيط"       },
  { v:"darkExec",       c1:"#0F172A", c2:"#38BDF8", en:"Dark Exec",   ar:"تنفيذي"    },
  { v:"geometric",      c1:"#FAFAFA", c2:"#7C3AED", en:"Geometric",   ar:"هندسي"     },
  { v:"gradientModern", c1:"#1B2B4B", c2:"#60A5FA", en:"Gradient",    ar:"تدرجي"     },
  { v:"magazine",       c1:"#FFFFFF", c2:"#E11D48", en:"Magazine",    ar:"مجلة"      },
];
const CSS = `
  @keyframes si-r { from{transform:translateX(100%);opacity:0} to{transform:translateX(0);opacity:1} }
  @keyframes si-l { from{transform:translateX(-100%);opacity:0} to{transform:translateX(0);opacity:1} }
  .si-r { animation:si-r .28s cubic-bezier(.22,1,.36,1) forwards; }
  .si-l { animation:si-l .28s cubic-bezier(.22,1,.36,1) forwards; }
`;

export default function InstructorCoursesPage() {
  const { isArabic } = useLanguage();
  const authUser = useSelector((s) => s.auth.user);
  const orgType = String(authUser?.organizationType || authUser?.organization?.Role || "").toUpperCase();
  const isSchool  = orgType === ORG_TYPES.SCHOOL;
  const isAcademy = orgType === ORG_TYPES.ACADEMY;

  /* ── Core data ── */
  const [loading,   setLoading]   = useState(true);
  const [items,     setItems]     = useState([]);
  const [resolvedIsAcademy, setResolvedIsAcademy] = useState(isAcademy);

  /* ── Drill-down levels ── */
  const [drillTrack,    setDrillTrack]    = useState(null);
  const [drillCourse,   setDrillCourse]   = useState(null);
  const [drillLesson,   setDrillLesson]   = useState(null); // Level 3
  const [drillSubjects, setDrillSubjects] = useState([]);
  const [drillLessons,  setDrillLessons]  = useState([]);
  const [drillSubjectsLoading, setDrillSubjectsLoading] = useState(false);
  const [drillLessonsLoading,  setDrillLessonsLoading]  = useState(false);
  const [slideDir,  setSlideDir]  = useState("right");
  const [slideKey,  setSlideKey]  = useState(0);
  const [activeTab, setActiveTab] = useState("overview");

  /* ── Lesson CRUD modal ── */
  const [lessonModal,    setLessonModal]    = useState({ open:false, mode:"create", lesson:null });
  const [lessonTitle,    setLessonTitle]    = useState("");
  const [lessonDesc,     setLessonDesc]     = useState("");
  const [videoFile,      setVideoFile]      = useState(null);
  const [uploadPct,      setUploadPct]      = useState(0);
  const [saving,         setSaving]         = useState(false);
  const [deleteConfirm,  setDeleteConfirm]  = useState({ open:false, lessonId:null, title:"" });
  const videoInputRef = useRef(null);
  const attachInputRef = useRef(null);

  /* ── Level 3: Lesson detail state ── */
  const [attachments,     setAttachments]     = useState([]);
  const [attachLoading,   setAttachLoading]   = useState(false);
  const [uploadingAttach, setUploadingAttach] = useState(false);
  const [attachUploadPct, setAttachUploadPct] = useState(0);
  const [playingVideo,    setPlayingVideo]    = useState(null);

  const [aiContent,     setAiContent]     = useState(null);
  const [aiLoading,     setAiLoading]     = useState(false);
  const [aiGenerating,  setAiGenerating]  = useState("");  // "flashcards"|"mindmap"|""
  const [aiLang,        setAiLang]        = useState(isArabic ? "ar" : "en");

  const [quiz,          setQuiz]          = useState(null);
  const [quizLoading,   setQuizLoading]   = useState(false);
  const [quizGenerating,setQuizGenerating]= useState(false);
  const [quizLang,      setQuizLang]      = useState(isArabic ? "ar" : "en");
  const [quizForm,      setQuizForm]      = useState({ numMCQ:5, numTrueFalse:3, numShortAnswer:2, difficulty:"MEDIUM" });
  const [addQForm,      setAddQForm]      = useState({ type:"MULTIPLE_CHOICE", question:"", options:["","","",""], correctAnswer:0, expectedAnswer:"", explanation:"" });
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [periodForm,      setPeriodForm]      = useState({ availableFrom: "", availableTo: "" });
  const [showAddQ,      setShowAddQ]      = useState(false);
  const [expandedQ,     setExpandedQ]     = useState(null);
  /* ── Edit states ── */
  const [editingFlashcard, setEditingFlashcard] = useState(null); // { index, front, back }
  const [showMindmapEdit,  setShowMindmapEdit]  = useState(false);
  const [mindmapDraft,     setMindmapDraft]     = useState(null); // editable copy
  const [editingQuestion,  setEditingQuestion]  = useState(null); // { id, ...addQForm fields }

  const [slidesData,    setSlidesData]    = useState(null);
  const [slidesGenerating, setSlidesGenerating] = useState(false);
  const [slidesForm,    setSlidesForm]    = useState({ lang: isArabic?"ar":"en", numSlides:10, theme:"minimalist" });

  /* ── AI generation modals ── */
  const [showFlashcardsModal, setShowFlashcardsModal] = useState(false);
  const [showMindmapModal,    setShowMindmapModal]    = useState(false);
  const [showQuizModal,       setShowQuizModal]       = useState(false);
  const [showSlidesModal,     setShowSlidesModal]     = useState(false);
  const [aiGenTopic,          setAiGenTopic]          = useState("");

  /* ─────────────────── DATA LOADING ─────────────────── */
  useEffect(() => {
    let c = false;
    const load = async () => {
      setLoading(true);
      try {
        let academy = isAcademy;
        if (!isSchool && !isAcademy) {
          const p = await fetchInstructorProfile().catch(() => null);
          const role = String(p?.organization?.role || p?.organization?.Role || "").toUpperCase();
          academy = role === ORG_TYPES.ACADEMY;
          if (!c) setResolvedIsAcademy(academy);
        }
        const data = academy ? await fetchInstructorSubjects() : await fetchInstructorCourses();
        if (!c) setItems(data || []);
      } catch (err) { if (!c) notifyError(safeError(err)); }
      finally { if (!c) setLoading(false); }
    };
    load();
    return () => { c = true; };
  }, [isAcademy, isSchool]);

  /* ─────────────────── NAVIGATION ─────────────────── */
  const slide = (dir, fn) => { setSlideDir(dir); setSlideKey((k) => k + 1); fn(); };

  const enterTrack = async (track) => {
    slide("right", () => { setDrillTrack(track); setDrillCourse(null); setDrillLesson(null); setDrillSubjects([]); setDrillLessons([]); });
    setDrillSubjectsLoading(true);
    try {
      const all  = await fetchInstructorSubjects();
      const mine = (all || []).filter((s) => (s.Course_id ?? s.course_id ?? s.track?.id) === track.id);
      setDrillSubjects(mine);
    } catch { setDrillSubjects([]); }
    finally { setDrillSubjectsLoading(false); }
  };

  const enterCourse = async (course) => {
    slide("right", () => { setDrillCourse(course); setDrillLesson(null); setDrillLessons([]); setActiveTab("overview"); });
    setDrillLessonsLoading(true);
    try {
      const data = await fetchInstructorLessons({ Subject_id: course.id });
      setDrillLessons(data || []);
    } catch { setDrillLessons([]); }
    finally { setDrillLessonsLoading(false); }
  };

  const enterLesson = async (lesson) => {
    slide("right", () => { setDrillLesson(lesson); setActiveTab("overview"); setAttachments([]); setAiContent(null); setQuiz(null); setSlidesData(null); setPlayingVideo(null); });
    // Preload attachments
    setAttachLoading(true);
    try {
      const data = await fetchInstructorLessonAttachments(lesson.id);
      setAttachments(data || []);
    } catch { setAttachments([]); }
    finally { setAttachLoading(false); }
  };

  const goBack = () => {
    if (drillLesson) slide("left", () => { setDrillLesson(null); });
    else if (drillCourse) slide("left", () => { setDrillCourse(null); setDrillLessons([]); });
    else if (drillTrack) slide("left", () => { setDrillTrack(null); setDrillSubjects([]); });
  };

  const resetAll = () => slide("left", () => { setDrillTrack(null); setDrillCourse(null); setDrillLesson(null); setDrillSubjects([]); setDrillLessons([]); });

  /* ─────────────────── LESSON CRUD ─────────────────── */
  const refreshLessons = async () => {
    if (!drillCourse) return;
    try { const d = await fetchInstructorLessons({ Subject_id: drillCourse.id }); setDrillLessons(d || []); }
    catch { /* silent */ }
  };

  const openCreate = () => { setLessonTitle(""); setLessonDesc(""); setVideoFile(null); setUploadPct(0); setLessonModal({ open:true, mode:"create", lesson:null }); };
  const openEdit = (l) => { setLessonTitle(l.title||l.name||""); setLessonDesc(l.description||""); setVideoFile(null); setLessonModal({ open:true, mode:"edit", lesson:l }); };
  const closeModal = () => { setLessonModal({ open:false, mode:"create", lesson:null }); setVideoFile(null); if (videoInputRef.current) videoInputRef.current.value = ""; };

  const saveLesson = async (e) => {
    e.preventDefault();
    if (!lessonTitle.trim()) return;
    setSaving(true);
    try {
      if (lessonModal.mode === "create") {
        await createInstructorLesson({ subjectId: drillCourse.id, title: lessonTitle.trim(), description: lessonDesc.trim()||undefined, videoFile: videoFile||undefined, onProgress: setUploadPct });
        notifySuccess(isArabic ? "تم إنشاء الدرس" : "Lesson created");
      } else {
        await updateInstructorLessonMeta(drillCourse.id, lessonModal.lesson.id, { title: lessonTitle.trim(), description: lessonDesc.trim()||undefined });
        if (drillLesson?.id === lessonModal.lesson.id) setDrillLesson((l) => ({ ...l, title: lessonTitle.trim(), description: lessonDesc.trim() }));
        notifySuccess(isArabic ? "تم تحديث الدرس" : "Lesson updated");
      }
      closeModal();
      await refreshLessons();
    } catch (err) { notifyError(safeError(err)); }
    finally { setSaving(false); setUploadPct(0); }
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.lessonId) return;
    setSaving(true);
    try {
      await deleteInstructorLesson(drillCourse.id, deleteConfirm.lessonId);
      setDeleteConfirm({ open:false, lessonId:null, title:"" });
      if (drillLesson?.id === deleteConfirm.lessonId) slide("left", () => setDrillLesson(null));
      notifySuccess(isArabic ? "تم الحذف" : "Lesson deleted");
      await refreshLessons();
    } catch (err) { notifyError(safeError(err)); }
    finally { setSaving(false); }
  };

  /* ─────────────────── ATTACHMENTS ─────────────────── */
  const handleAttachUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length || !drillLesson) return;
    setUploadingAttach(true); setAttachUploadPct(0);
    try {
      await uploadInstructorLessonAttachments({ lessonId: drillLesson.id, files, onProgress: setAttachUploadPct });
      const data = await fetchInstructorLessonAttachments(drillLesson.id);
      setAttachments(data || []);
      notifySuccess(isArabic ? "تم رفع الملفات" : "Files uploaded");
    } catch (err) { notifyError(safeError(err)); }
    finally { setUploadingAttach(false); setAttachUploadPct(0); if (attachInputRef.current) attachInputRef.current.value = ""; }
  };

  const deleteAttachment = async (attId) => {
    try {
      await deleteInstructorLessonAttachment({ lessonId: drillLesson.id, attachmentId: attId });
      setAttachments((a) => a.filter((x) => x.id !== attId));
    } catch (err) { notifyError(safeError(err)); }
  };

  /* ─────────────────── AI CONTENT ─────────────────── */
  const loadAiContent = async (lang) => {
    if (!drillLesson) return;
    setAiLoading(true);
    try { const d = await fetchLessonAiContentInstructor(drillLesson.id, lang || aiLang); setAiContent(d); }
    catch { setAiContent(null); }
    finally { setAiLoading(false); }
  };

  const generateFlashcards = async () => {
    if (!drillLesson) return;
    setAiGenerating("flashcards");
    setShowFlashcardsModal(false);
    try {
      await generateLessonFlashcardsOnly(drillLesson.id, aiLang, aiGenTopic || undefined);
      await loadAiContent();
      notifySuccess(isArabic ? "تم توليد الفلاش كاردز" : "Flashcards generated");
    } catch (err) { notifyError(safeError(err)); }
    finally { setAiGenerating(""); }
  };

  const generateMindmap = async () => {
    if (!drillLesson) return;
    setAiGenerating("mindmap");
    setShowMindmapModal(false);
    try {
      await generateLessonMindmapOnly(drillLesson.id, aiLang, aiGenTopic || undefined);
      await loadAiContent();
      notifySuccess(isArabic ? "تم توليد الخريطة الذهنية" : "Mind map generated");
    } catch (err) { notifyError(safeError(err)); }
    finally { setAiGenerating(""); }
  };

  const togglePublish = async () => {
    if (!drillLesson || !aiContent) return;
    try {
      if (aiContent.published) { await unpublishLessonAiContent(drillLesson.id); }
      else { await publishLessonAiContent(drillLesson.id); }
      await loadAiContent();
    } catch (err) { notifyError(safeError(err)); }
  };

  /* ── Save edited flashcard ── */
  const saveFlashcardEdit = async () => {
    if (!drillLesson || !aiContent?.flashcards || editingFlashcard === null) return;
    setSaving(true);
    try {
      const updated = aiContent.flashcards.map((fc, i) =>
        i === editingFlashcard.index
          ? { ...fc, front: editingFlashcard.front, question: editingFlashcard.front, back: editingFlashcard.back, answer: editingFlashcard.back }
          : fc
      );
      await updateLessonFlashcards(drillLesson.id, updated, aiLang);
      setAiContent((prev) => ({ ...prev, flashcards: updated }));
      setEditingFlashcard(null);
      notifySuccess(isArabic ? "تم تحديث البطاقة" : "Card updated");
    } catch (err) { notifyError(safeError(err)); }
    finally { setSaving(false); }
  };

  /* ── Save edited mind map ── */
  const saveMindmapEdit = async () => {
    if (!drillLesson || !mindmapDraft) return;
    setSaving(true);
    try {
      await updateLessonMindmap(drillLesson.id, mindmapDraft, aiLang);
      setAiContent((prev) => ({ ...prev, mindmap: mindmapDraft }));
      setShowMindmapEdit(false);
      notifySuccess(isArabic ? "تم تحديث الخريطة" : "Mind map updated");
    } catch (err) { notifyError(safeError(err)); }
    finally { setSaving(false); }
  };

  /* ── Save edited quiz question (delete old + add new) ── */
  const saveQuestionEdit = async (e) => {
    e.preventDefault();
    if (!quiz || !drillLesson || !drillCourse || !editingQuestion) return;
    setSaving(true);
    try {
      await deleteLessonQuizQuestion(drillCourse.id, drillLesson.id, quiz.id, editingQuestion.id);
      await addLessonQuizQuestion(drillCourse.id, drillLesson.id, quiz.id, {
        type: editingQuestion.type,
        question: editingQuestion.question,
        options: editingQuestion.options,
        correctAnswer: editingQuestion.correctAnswer,
        expectedAnswer: editingQuestion.expectedAnswer,
        explanation: editingQuestion.explanation,
      }, quizLang);
      await loadQuiz();
      setEditingQuestion(null);
      notifySuccess(isArabic ? "تم تحديث السؤال" : "Question updated");
    } catch (err) { notifyError(safeError(err)); }
    finally { setSaving(false); }
  };

  const deleteFlashcards = async () => {
    if (!drillLesson) return;
    setSaving(true);
    try {
      await deleteLessonFlashcards(drillLesson.id);
      setAiContent((prev) => prev ? { ...prev, flashcards: [] } : null);
      notifySuccess(isArabic ? "تم حذف الفلاش كاردز" : "Flashcards deleted");
    } catch (err) { notifyError(safeError(err)); }
    finally { setSaving(false); }
  };

  const deleteMindmap = async () => {
    if (!drillLesson) return;
    setSaving(true);
    try {
      await deleteLessonMindmap(drillLesson.id);
      setAiContent((prev) => prev ? { ...prev, mindmap: null } : null);
      notifySuccess(isArabic ? "تم حذف الخريطة الذهنية" : "Mind map deleted");
    } catch (err) { notifyError(safeError(err)); }
    finally { setSaving(false); }
  };

  const deleteQuizFull = async () => {
    if (!quiz || !drillLesson || !drillCourse) return;
    setSaving(true);
    try {
      await deleteLessonQuiz(drillCourse.id, drillLesson.id, quiz.id);
      setQuiz(null);
      notifySuccess(isArabic ? "تم حذف الاختبار" : "Quiz deleted");
    } catch (err) { notifyError(safeError(err)); }
    finally { setSaving(false); }
  };

  /* ─────────────────── QUIZ ─────────────────── */
  const loadQuiz = async (lang) => {
    if (!drillLesson || !drillCourse) return;
    setQuizLoading(true);
    try { const d = await fetchLessonQuiz(drillCourse.id, drillLesson.id, lang || quizLang); setQuiz(d); }
    catch { setQuiz(null); }
    finally { setQuizLoading(false); }
  };

  const createQuiz = async () => {
    if (!drillLesson || !drillCourse) return;
    setSaving(true);
    try {
      await createLessonQuiz(drillCourse.id, drillLesson.id, { title: drillLesson.title || "Quiz", lang: quizLang });
      await loadQuiz();
      notifySuccess(isArabic ? "تم إنشاء الاختبار" : "Quiz created");
    } catch (err) { notifyError(safeError(err)); }
    finally { setSaving(false); }
  };

  const generateQuestionsAI = async () => {
    if (!quiz || !drillLesson || !drillCourse) return;
    setQuizGenerating(true);
    setShowQuizModal(false);
    try {
      await generateLessonQuizQuestions(drillCourse.id, drillLesson.id, quiz.id, { ...quizForm, lang: quizLang });
      await loadQuiz();
      notifySuccess(isArabic ? "تم توليد الأسئلة" : "Questions generated");
    } catch (err) { notifyError(safeError(err)); }
    finally { setQuizGenerating(false); }
  };

  const createQuizAndGenerate = async () => {
    if (!drillLesson || !drillCourse) return;
    setShowQuizModal(false);
    setSaving(true);
    try {
      const created = await createLessonQuiz(drillCourse.id, drillLesson.id, { title: drillLesson.title || "Quiz", lang: quizLang });
      const quizId = created?.id || created?.quiz?.id;
      if (quizId) {
        setQuizGenerating(true);
        await generateLessonQuizQuestions(drillCourse.id, drillLesson.id, quizId, { ...quizForm, lang: quizLang });
      }
      await loadQuiz();
      notifySuccess(isArabic ? "تم إنشاء الاختبار وتوليد الأسئلة" : "Quiz created and questions generated");
    } catch (err) { notifyError(safeError(err)); }
    finally { setSaving(false); setQuizGenerating(false); }
  };

  const addManualQuestion = async (e) => {
    e.preventDefault();
    if (!quiz || !drillLesson || !drillCourse) return;
    setSaving(true);
    try {
      await addLessonQuizQuestion(drillCourse.id, drillLesson.id, quiz.id, addQForm, quizLang);
      await loadQuiz();
      setShowAddQ(false);
      setAddQForm({ type:"MULTIPLE_CHOICE", question:"", options:["","","",""], correctAnswer:0, expectedAnswer:"", explanation:"" });
      notifySuccess(isArabic ? "تمت إضافة السؤال" : "Question added");
    } catch (err) { notifyError(safeError(err)); }
    finally { setSaving(false); }
  };

  const deleteQuestion = async (qId) => {
    if (!quiz || !drillLesson || !drillCourse) return;
    try {
      await deleteLessonQuizQuestion(drillCourse.id, drillLesson.id, quiz.id, qId);
      await loadQuiz();
    } catch (err) { notifyError(safeError(err)); }
  };

  /* ─────────────────── SLIDES ─────────────────── */
  const generateSlides = async () => {
    if (!drillLesson) return;
    setSlidesGenerating(true);
    setShowSlidesModal(false);
    try {
      const d = await generateLessonPowerSlides(drillLesson.id, { lang: slidesForm.lang, numSlides: slidesForm.numSlides, theme: slidesForm.theme });
      setSlidesData(d);
      notifySuccess(isArabic ? "تم توليد الشرائح" : "Slides generated");
    } catch (err) { notifyError(safeError(err)); }
    finally { setSlidesGenerating(false); }
  };

  const downloadPptx = async () => {
    if (!slidesData?.slides?.length) return;
    try {
      const pptx = new PptxGenJS();
      const template = PPTX_TEMPLATES[slidesData.theme] || PPTX_TEMPLATES.minimalist;
      const helpers = makeHelpers(pptx);
      for (const slide of slidesData.slides) {
        const s = pptx.addSlide();
        template(s, slide, helpers);
      }
      await pptx.writeFile({ fileName: `${drillLesson?.title || "lesson"}-slides.pptx` });
    } catch (err) { notifyError(safeError(err)); }
  };

  /* ─────────────────── TAB SWITCH (lazy load) ─────────────────── */
  const switchTab = (tabId) => {
    setActiveTab(tabId);
    setPlayingVideo(null);
    if (!drillLesson) return;
    if (tabId === "attachments" && !attachments.length && !attachLoading) {
      setAttachLoading(true);
      fetchInstructorLessonAttachments(drillLesson.id).then((d) => setAttachments(d || [])).catch(() => {}).finally(() => setAttachLoading(false));
    }
    if ((tabId === "flashcards" || tabId === "mindmap") && !aiContent && !aiLoading) {
      loadAiContent();
    }
    if (tabId === "quiz" && !quiz && !quizLoading) {
      loadQuiz();
    }
    if (tabId === "slides" && slidesData?.lessonId !== drillLesson.id) {
      setSlidesData(null);
    }
  };

  /* ─────────────────── HELPERS ─────────────────── */
  const trackLabel = (t) => formatGradeName(t, isSchool, isArabic) || t.Name || t.name || "-";
  const pageTitle  = resolvedIsAcademy ? (isArabic?"الكورسات":"My Courses") : isSchool ? (isArabic?"الصفوف":"My Grades") : (isArabic?"تخصصاتي":"My Specializations");
  const level = drillLesson ? 3 : drillCourse ? 2 : drillTrack ? 1 : 0;

  const getExt = (a) => { const n = a.originalName||a.name||""; const d = n.lastIndexOf("."); return d !== -1 ? n.slice(d+1).toUpperCase() : "FILE"; };
  const isVideo = (a) => String(a.fileType||a.type||a.mimeType||"").toUpperCase().includes("VIDEO");

  /* ════════════════════════════════════════════════════════ */
  return (
    <InstructorLayout title={pageTitle} subtitle={isArabic?"استعرض وأدر محتوى دروسك":"Browse and manage your lesson content"}>
      <style>{CSS}</style>

      {loading && <EducationLoading isArabic={isArabic} title={isArabic?"جاري التحميل":"Loading"} subtitle={isArabic?"نجهز بياناتك":"Preparing your data"} fullscreen />}

      {/* ── Lesson create/edit modal ── */}
      {lessonModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h3 className="font-black text-slate-900">{lessonModal.mode==="create"?(isArabic?"إضافة درس جديد":"Add New Lesson"):(isArabic?"تعديل الدرس":"Edit Lesson")}</h3>
              <button type="button" onClick={closeModal} className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100"><X size={16}/></button>
            </div>
            <form onSubmit={saveLesson} className="space-y-4 p-6">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">{isArabic?"عنوان الدرس":"Lesson title"} *</label>
                <input value={lessonTitle} onChange={(e)=>setLessonTitle(e.target.value)} placeholder={isArabic?"أدخل العنوان...":"Enter title..."} className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm focus:border-indigo-400 focus:outline-none" required />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">{isArabic?"الوصف":"Description"}</label>
                <textarea value={lessonDesc} onChange={(e)=>setLessonDesc(e.target.value)} rows={3} className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-indigo-400 focus:outline-none" />
              </div>
              {lessonModal.mode==="create" && (
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">{isArabic?"ملف الفيديو (اختياري)":"Video file (optional)"}</label>
                  <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 hover:border-indigo-300 hover:bg-indigo-50 transition">
                    <Upload size={16} className="shrink-0 text-slate-400"/>
                    <span className="text-sm text-slate-500">{videoFile?videoFile.name:(isArabic?"اختر ملف فيديو":"Choose a video file")}</span>
                    <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={(e)=>setVideoFile(e.target.files?.[0]||null)} />
                  </label>
                  {saving && uploadPct>0 && (
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-slate-500 mb-1"><span>{isArabic?"جاري الرفع...":"Uploading..."}</span><span>{uploadPct}%</span></div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-indigo-500 transition-all" style={{width:`${uploadPct}%`}}/></div>
                    </div>
                  )}
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving||!lessonTitle.trim()} className="flex-1 rounded-2xl bg-indigo-600 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50">
                  {saving?(isArabic?"جاري الحفظ...":"Saving..."):(isArabic?"حفظ":"Save")}
                </button>
                <button type="button" onClick={closeModal} className="flex-1 rounded-2xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">{isArabic?"إلغاء":"Cancel"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Flashcards generation modal ── */}
      {showFlashcardsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-violet-600 to-purple-600 px-6 py-5 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20"><Sparkles size={18}/></div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-violet-200">{isArabic?"الذكاء الاصطناعي":"AI-Powered"}</p>
                  <h3 className="font-black">{isArabic?"توليد فلاش كاردز":"Generate Flashcards"}</h3>
                </div>
              </div>
              <button type="button" onClick={()=>setShowFlashcardsModal(false)} className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/15 hover:bg-white/25"><X size={15}/></button>
            </div>
            <div className="space-y-4 p-6">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">{isArabic?"اللغة":"Language"}</label>
                <div className="flex overflow-hidden rounded-xl border border-slate-200">
                  {[{v:"ar",l:"🇸🇦 العربية"},{v:"en",l:"🇺🇸 English"}].map(({v,l})=>(
                    <button key={v} type="button" onClick={()=>setAiLang(v)} className={`flex-1 py-2.5 text-sm font-semibold transition ${aiLang===v?"bg-violet-600 text-white":"bg-white text-slate-500 hover:bg-slate-50"}`}>{l}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">{isArabic?"موضوع محدد (اختياري)":"Specific topic (optional)"}</label>
                <input value={aiGenTopic} onChange={(e)=>setAiGenTopic(e.target.value)} placeholder={isArabic?"مثال: المعادلات التربيعية...":"e.g. Quadratic equations..."} className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm focus:border-violet-400 focus:outline-none"/>
              </div>
              <button type="button" onClick={generateFlashcards} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 py-3 text-sm font-bold text-white hover:bg-violet-700 transition">
                <Sparkles size={15}/>{isArabic?"توليد الفلاش كاردز":"Generate Flashcards"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Mind Map generation modal ── */}
      {showMindmapModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-teal-600 to-emerald-600 px-6 py-5 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20"><Map size={18}/></div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-teal-200">{isArabic?"الذكاء الاصطناعي":"AI-Powered"}</p>
                  <h3 className="font-black">{isArabic?"توليد خريطة ذهنية":"Generate Mind Map"}</h3>
                </div>
              </div>
              <button type="button" onClick={()=>setShowMindmapModal(false)} className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/15 hover:bg-white/25"><X size={15}/></button>
            </div>
            <div className="space-y-4 p-6">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">{isArabic?"اللغة":"Language"}</label>
                <div className="flex overflow-hidden rounded-xl border border-slate-200">
                  {[{v:"ar",l:"🇸🇦 العربية"},{v:"en",l:"🇺🇸 English"}].map(({v,l})=>(
                    <button key={v} type="button" onClick={()=>setAiLang(v)} className={`flex-1 py-2.5 text-sm font-semibold transition ${aiLang===v?"bg-teal-600 text-white":"bg-white text-slate-500 hover:bg-slate-50"}`}>{l}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">{isArabic?"موضوع محدد (اختياري)":"Specific topic (optional)"}</label>
                <input value={aiGenTopic} onChange={(e)=>setAiGenTopic(e.target.value)} placeholder={isArabic?"مثال: دورة الماء في الطبيعة...":"e.g. Water cycle in nature..."} className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm focus:border-teal-400 focus:outline-none"/>
              </div>
              <button type="button" onClick={generateMindmap} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-teal-600 py-3 text-sm font-bold text-white hover:bg-teal-700 transition">
                <Map size={15}/>{isArabic?"توليد الخريطة الذهنية":"Generate Mind Map"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Quiz generation modal ── */}
      {showQuizModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-5 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20"><HelpCircle size={18}/></div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-amber-200">{isArabic?"الذكاء الاصطناعي":"AI-Powered"}</p>
                  <h3 className="font-black">{quiz?(isArabic?"توليد أسئلة":"Generate Questions"):(isArabic?"إنشاء اختبار":"Create Quiz")}</h3>
                </div>
              </div>
              <button type="button" onClick={()=>setShowQuizModal(false)} className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/15 hover:bg-white/25"><X size={15}/></button>
            </div>
            <div className="space-y-4 p-6">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">{isArabic?"لغة الأسئلة":"Question Language"}</label>
                <div className="flex overflow-hidden rounded-xl border border-slate-200">
                  {[{v:"ar",l:"🇸🇦 العربية"},{v:"en",l:"🇺🇸 English"}].map(({v,l})=>(
                    <button key={v} type="button" onClick={()=>setQuizLang(v)} className={`flex-1 py-2.5 text-sm font-semibold transition ${quizLang===v?"bg-amber-500 text-white":"bg-white text-slate-500 hover:bg-slate-50"}`}>{l}</button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { key:"numMCQ",        label:isArabic?"اختيار متعدد":"MCQ",      max:15 },
                  { key:"numTrueFalse",  label:isArabic?"صح / خطأ":"True/False",   max:10 },
                  { key:"numShortAnswer",label:isArabic?"إجابة قصيرة":"Short Ans.", max:10 },
                ].map(({key,label,max})=>(
                  <div key={key} className="rounded-xl border border-slate-200 p-3 text-center">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
                    <input type="number" min={0} max={max} value={quizForm[key]} onChange={(e)=>setQuizForm(f=>({...f,[key]:Number(e.target.value)}))} className="w-full rounded-lg border border-slate-200 py-1.5 text-center text-lg font-black text-slate-900 focus:border-amber-400 focus:outline-none"/>
                  </div>
                ))}
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">{isArabic?"مستوى الصعوبة":"Difficulty"}</label>
                <div className="flex overflow-hidden rounded-xl border border-slate-200">
                  {[{v:"EASY",en:"Easy",ar:"سهل"},{v:"MEDIUM",en:"Medium",ar:"متوسط"},{v:"HARD",en:"Hard",ar:"صعب"}].map(({v,en:el,ar:ar_})=>(
                    <button key={v} type="button" onClick={()=>setQuizForm(f=>({...f,difficulty:v}))} className={`flex-1 py-2.5 text-xs font-bold transition ${quizForm.difficulty===v?"bg-amber-500 text-white":"bg-white text-slate-500 hover:bg-slate-50"}`}>{isArabic?ar_:el}</button>
                  ))}
                </div>
              </div>
              <button type="button" onClick={quiz?generateQuestionsAI:createQuizAndGenerate} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-500 py-3 text-sm font-bold text-white hover:bg-amber-600 transition">
                <Sparkles size={15}/>{quiz?(isArabic?"توليد الأسئلة":"Generate Questions"):(isArabic?"إنشاء وتوليد":"Create & Generate")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Slides generation modal ── */}
      {showSlidesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-violet-700 via-purple-600 to-indigo-600 px-6 py-5 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20"><Layers size={18}/></div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-violet-200">{isArabic?"الذكاء الاصطناعي":"AI-Powered"}</p>
                  <h3 className="font-black">{isArabic?"توليد الشرائح التقديمية":"Generate Presentation Slides"}</h3>
                </div>
              </div>
              <button type="button" onClick={()=>setShowSlidesModal(false)} className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/15 hover:bg-white/25"><X size={15}/></button>
            </div>
            <div className="space-y-5 p-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">{isArabic?"اللغة":"Language"}</label>
                  <div className="flex overflow-hidden rounded-xl border border-slate-200">
                    {[{v:"ar",l:"🇸🇦 العربية"},{v:"en",l:"🇺🇸 English"}].map(({v,l})=>(
                      <button key={v} type="button" onClick={()=>setSlidesForm(f=>({...f,lang:v}))} className={`flex-1 py-2.5 text-xs font-semibold transition ${slidesForm.lang===v?"bg-indigo-600 text-white":"bg-white text-slate-500 hover:bg-slate-50"}`}>{l}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">{isArabic?"عدد الشرائح":"Slide Count"}</label>
                  <div className="flex gap-2">
                    {[5,10,15].map(n=>(
                      <button key={n} type="button" onClick={()=>setSlidesForm(f=>({...f,numSlides:n}))} className={`flex-1 rounded-xl border-2 py-2.5 text-sm font-black transition ${slidesForm.numSlides===n?"border-indigo-500 bg-indigo-50 text-indigo-700":"border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}>{n}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <label className="mb-3 block text-xs font-bold uppercase tracking-wider text-slate-500">{isArabic?"القالب":"Template"}</label>
                <div className="flex flex-wrap gap-2">
                  {SLIDE_THEMES.map(({v,c1,c2,en:el,ar:ar_})=>(
                    <button key={v} type="button" onClick={()=>setSlidesForm(f=>({...f,theme:v}))}
                      className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2 text-xs font-semibold transition ${slidesForm.theme===v?"border-indigo-500 bg-indigo-50 text-indigo-700":"border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}>
                      <span className="flex gap-1 shrink-0">
                        <span className="h-3 w-3 rounded-full border border-slate-200" style={{background:c1}}/>
                        <span className="h-3 w-3 rounded-full border border-slate-200" style={{background:c2}}/>
                      </span>
                      {isArabic?ar_:el}
                    </button>
                  ))}
                </div>
              </div>
              <button type="button" onClick={generateSlides} disabled={slidesGenerating} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-3 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50 transition">
                {slidesGenerating?<><RefreshCw size={15} className="animate-spin"/>{isArabic?"جاري التوليد...":"Generating..."}</>:<><Sparkles size={15}/>{isArabic?"توليد الشرائح":"Generate Slides"}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Mind Map Edit Modal ── */}
      {showMindmapEdit && mindmapDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm">
          <div className="flex w-full max-w-xl flex-col rounded-3xl border border-slate-200 bg-white shadow-2xl" style={{maxHeight:"85vh"}}>
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h3 className="font-black text-slate-900">{isArabic?"تعديل الخريطة الذهنية":"Edit Mind Map"}</h3>
              <button type="button" onClick={()=>setShowMindmapEdit(false)} className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100"><X size={15}/></button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-4 p-6">
              {/* Central node */}
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-teal-600">{isArabic?"العقدة الرئيسية":"Central Node"}</label>
                <input
                  value={mindmapDraft.central || mindmapDraft.root || ""}
                  onChange={(e)=>setMindmapDraft(d=>({...d, central: e.target.value, root: e.target.value}))}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold focus:border-teal-400 focus:outline-none"
                />
              </div>
              {/* Branches */}
              {(mindmapDraft.branches || mindmapDraft.nodes || []).map((branch, bi)=>(
                <div key={bi} className="rounded-xl border border-teal-200 bg-teal-50 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      value={branch.label || branch.title || branch.name || ""}
                      onChange={(e)=>setMindmapDraft(d=>{
                        const arr = [...(d.branches||d.nodes||[])];
                        arr[bi] = {...arr[bi], label: e.target.value, title: e.target.value, name: e.target.value};
                        return {...d, branches: arr, nodes: arr};
                      })}
                      className="flex-1 h-9 rounded-xl border border-teal-200 bg-white px-3 text-sm font-semibold focus:border-teal-400 focus:outline-none"
                      placeholder={`${isArabic?"فرع":"Branch"} ${bi+1}`}
                    />
                    <button type="button" onClick={()=>setMindmapDraft(d=>{
                      const arr = (d.branches||d.nodes||[]).filter((_,i)=>i!==bi);
                      return {...d, branches: arr, nodes: arr};
                    })} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-rose-400 hover:bg-rose-100"><Trash2 size={13}/></button>
                  </div>
                  {/* Children */}
                  <div className="space-y-1.5 ps-3">
                    {(branch.children || branch.subtopics || []).map((child, ci)=>(
                      <div key={ci} className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-teal-400"/>
                        <input
                          value={child.label || child.title || child || ""}
                          onChange={(e)=>setMindmapDraft(d=>{
                            const arr = [...(d.branches||d.nodes||[])];
                            const kids = [...(arr[bi].children||arr[bi].subtopics||[])];
                            kids[ci] = typeof kids[ci]==="string" ? e.target.value : {...kids[ci], label: e.target.value, title: e.target.value};
                            arr[bi] = {...arr[bi], children: kids, subtopics: kids};
                            return {...d, branches: arr, nodes: arr};
                          })}
                          className="flex-1 h-8 rounded-xl border border-teal-100 bg-white px-3 text-xs focus:border-teal-400 focus:outline-none"
                          placeholder={`${isArabic?"عنصر":"Item"} ${ci+1}`}
                        />
                        <button type="button" onClick={()=>setMindmapDraft(d=>{
                          const arr = [...(d.branches||d.nodes||[])];
                          const kids = (arr[bi].children||arr[bi].subtopics||[]).filter((_,i)=>i!==ci);
                          arr[bi] = {...arr[bi], children: kids, subtopics: kids};
                          return {...d, branches: arr, nodes: arr};
                        })} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-rose-400 hover:bg-rose-100"><X size={11}/></button>
                      </div>
                    ))}
                    <button type="button" onClick={()=>setMindmapDraft(d=>{
                      const arr = [...(d.branches||d.nodes||[])];
                      const kids = [...(arr[bi].children||arr[bi].subtopics||[]), ""];
                      arr[bi] = {...arr[bi], children: kids, subtopics: kids};
                      return {...d, branches: arr, nodes: arr};
                    })} className="mt-1 flex items-center gap-1 text-xs font-semibold text-teal-600 hover:underline"><Plus size={11}/>{isArabic?"إضافة عنصر":"Add item"}</button>
                  </div>
                </div>
              ))}
              <button type="button" onClick={()=>setMindmapDraft(d=>{
                const newBranch = {label:"",title:"",name:"",children:[],subtopics:[]};
                const arr = [...(d.branches||d.nodes||[]), newBranch];
                return {...d, branches: arr, nodes: arr};
              })} className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-teal-300 py-2.5 text-sm font-semibold text-teal-600 hover:border-teal-400 hover:bg-teal-50 transition">
                <Plus size={14}/>{isArabic?"إضافة فرع":"Add Branch"}
              </button>
            </div>
            <div className="flex gap-3 border-t border-slate-100 p-5">
              <button type="button" onClick={saveMindmapEdit} disabled={saving} className="flex-1 rounded-2xl bg-teal-600 py-2.5 text-sm font-bold text-white hover:bg-teal-700 disabled:opacity-50 transition">
                {saving?(isArabic?"جاري الحفظ...":"Saving..."):(isArabic?"حفظ التعديلات":"Save Changes")}
              </button>
              <button type="button" onClick={()=>setShowMindmapEdit(false)} className="flex-1 rounded-2xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">{isArabic?"إلغاء":"Cancel"}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirm ── */}
      {deleteConfirm.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-8 shadow-2xl text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100"><Trash2 size={20} className="text-rose-600"/></div>
            <h3 className="font-black text-slate-900">{isArabic?"حذف الدرس؟":"Delete Lesson?"}</h3>
            <p className="mt-2 text-sm text-slate-500">"{deleteConfirm.title}" {isArabic?"سيتم حذفه نهائياً.":"will be permanently deleted."}</p>
            <div className="mt-6 flex gap-3">
              <button type="button" onClick={()=>setDeleteConfirm({open:false,lessonId:null,title:""})} className="flex-1 rounded-2xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">{isArabic?"إلغاء":"Cancel"}</button>
              <button type="button" onClick={confirmDelete} disabled={saving} className="flex-1 rounded-2xl bg-rose-600 py-2.5 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-50">{saving?"...":(isArabic?"حذف":"Delete")}</button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ MAIN PANEL ══════════ */}
      <div className="rounded-[28px] border border-slate-200 bg-white shadow-sm overflow-hidden">

        {/* ── Top navigation bar ── */}
        <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/60 px-5 py-3.5">
          {level > 0 && (
            <button type="button" onClick={goBack} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 transition">
              {isArabic?<ChevronRight size={15}/>:<ChevronLeft size={15}/>}
            </button>
          )}
          {/* Breadcrumb */}
          <nav className="flex flex-1 flex-wrap items-center gap-1 text-sm min-w-0">
            <button type="button" onClick={resetAll} className={`font-semibold truncate transition ${level===0?"text-slate-700 cursor-default":"text-indigo-600 hover:underline"}`}>{pageTitle}</button>
            {drillTrack && (<><ChevronRight size={12} className="shrink-0 text-slate-300"/><button type="button" onClick={()=>drillCourse||drillLesson?slide("left",()=>{setDrillCourse(null);setDrillLesson(null);setDrillLessons([]);}):undefined} className={`font-semibold truncate max-w-[120px] transition ${drillCourse||drillLesson?"text-indigo-600 hover:underline":"text-slate-700 cursor-default"}`}>{trackLabel(drillTrack)}</button></>)}
            {drillCourse && (<><ChevronRight size={12} className="shrink-0 text-slate-300"/><button type="button" onClick={()=>drillLesson?slide("left",()=>setDrillLesson(null)):undefined} className={`font-semibold truncate max-w-[120px] transition ${drillLesson?"text-indigo-600 hover:underline":"text-slate-700 cursor-default"}`}>{drillCourse.name}</button></>)}
            {drillLesson && (<><ChevronRight size={12} className="shrink-0 text-slate-300"/><span className="font-semibold text-slate-700 truncate max-w-[140px]">{drillLesson.title||drillLesson.name}</span></>)}
          </nav>
          {/* Right actions */}
          <div className="flex shrink-0 items-center gap-2">
            {level===2&&<button type="button" onClick={openCreate} className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition"><Plus size={14}/>{isArabic?"إضافة درس":"Add Lesson"}</button>}
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
              {level===0&&`${items.length} ${isArabic?(resolvedIsAcademy?"كورس":"صف"):(resolvedIsAcademy?"courses":"grades")}`}
              {level===1&&`${drillSubjects.length} ${isArabic?"مادة":"subjects"}`}
              {level===2&&`${drillLessons.length} ${isArabic?"درس":"lessons"}`}
              {level===3&&TABS.find(t=>t.id===activeTab)?.[isArabic?"ar":"en"]}
            </span>
          </div>
        </div>

        {/* ── Animated content ── */}
        <div key={slideKey} className={`${slideDir==="right"?"si-r":"si-l"}`}>

          {/* ══ LEVEL 0 — Courses/Grades ══ */}
          {level===0&&(
            <div className="p-6">
              {items.length===0?(
                <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-16 text-center">
                  <BookOpen size={32} className="mx-auto mb-3 text-slate-300"/>
                  <p className="text-sm font-semibold text-slate-400">{isArabic?"لا توجد مواد مرتبطة بحسابك.":"No courses assigned yet."}</p>
                </div>
              ):(
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {items.map((item,i)=>{
                    const acc=ACCENTS[i%ACCENTS.length];
                    const label=resolvedIsAcademy?item.name:trackLabel(item);
                    const li=item.level?LEVEL_LABELS[item.level]:null;
                    return(
                      <article key={item.id} className="group overflow-hidden rounded-[22px] bg-white shadow-sm cursor-pointer transition hover:-translate-y-1 hover:shadow-lg" onClick={()=>resolvedIsAcademy?enterCourse(item):enterTrack(item)}>
                        <div className={`relative h-40 bg-gradient-to-br ${acc} overflow-hidden`}>
                          {item.Thumbnail||item.imageUrl?(
                            <img src={item.Thumbnail||item.imageUrl} alt={label} onError={(e)=>{e.currentTarget.src=DEFAULT_THUMB;}} className="h-full w-full object-contain"/>
                          ):<span className="absolute inset-0 flex items-center justify-center text-5xl text-white/30">📚</span>}
                          <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/25">
                            <span className="translate-y-3 rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-900 opacity-0 shadow transition group-hover:translate-y-0 group-hover:opacity-100">{isArabic?"فتح":"Open →"}</span>
                          </div>
                        </div>
                        <div className="p-4">
                          <h3 className="truncate font-black text-slate-900">{label}</h3>
                          <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{item.Description||item.description||(isArabic?"لا يوجد وصف":"No description")}</p>
                          {li&&<span className={`mt-2 inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${li.cls}`}>{isArabic?li.ar:li.en}</span>}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ══ LEVEL 1 — Subjects ══ */}
          {level===1&&(
            <div className="p-6">
              {drillSubjectsLoading?(
                <div className="space-y-3">{[1,2,3].map(i=><div key={i} className="h-16 animate-pulse rounded-xl border border-slate-200 bg-slate-50"/>)}</div>
              ):drillSubjects.length===0?(
                <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-16 text-center"><p className="text-sm font-semibold text-slate-400">{isArabic?"لا توجد مواد في هذا الصف.":"No subjects in this grade."}</p></div>
              ):(
                <div className="space-y-2">
                  {drillSubjects.map((s,i)=>(
                    <button key={s.id} type="button" onClick={()=>enterCourse(s)} className="group flex w-full items-center gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-left transition hover:border-indigo-300 hover:bg-indigo-50">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-sm font-black text-indigo-700 group-hover:bg-indigo-200">{i+1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-900">{s.name}</p>
                        {s.Description&&<p className="mt-0.5 truncate text-xs text-slate-400">{s.Description}</p>}
                      </div>
                      <span className="text-xs text-slate-400 group-hover:text-indigo-600">{isArabic?"عرض الدروس":"View Lessons"}</span>
                      {isArabic?<ChevronLeft size={14} className="text-slate-300 group-hover:text-indigo-500"/>:<ChevronRight size={14} className="text-slate-300 group-hover:text-indigo-500"/>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ══ LEVEL 2 — Lessons list ══ */}
          {level===2&&(
            <div className="p-6">
              {drillLessonsLoading?(
                <div className="space-y-3">{[1,2,3].map(i=><div key={i} className="h-16 animate-pulse rounded-xl border border-slate-200 bg-slate-50"/>)}</div>
              ):drillLessons.length===0?(
                <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-16 text-center">
                  <BookOpen size={32} className="mx-auto mb-3 text-slate-300"/>
                  <p className="text-sm font-semibold text-slate-400">{isArabic?"لا توجد دروس.":"No lessons yet."}</p>
                  <button type="button" onClick={openCreate} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-700"><Plus size={15}/>{isArabic?"إضافة أول درس":"Add first lesson"}</button>
                </div>
              ):(
                <div className="space-y-2">
                  {drillLessons.map((lesson,i)=>(
                    <div key={lesson.id} className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 transition hover:border-indigo-200 hover:shadow-sm">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-xs font-black text-indigo-700">{i+1}</span>
                      <button type="button" onClick={()=>enterLesson(lesson)} className="min-w-0 flex-1 text-left">
                        <p className="font-semibold text-slate-900 group-hover:text-indigo-700 transition">{lesson.title||lesson.name||"-"}</p>
                        {lesson.description&&<p className="mt-0.5 truncate text-xs text-slate-400">{lesson.description}</p>}
                      </button>
                      <div className="flex shrink-0 items-center gap-2">
                        {lesson.videoUrl&&<span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700"><Video size={9}/>{isArabic?"فيديو":"Video"}</span>}
                        <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-bold text-indigo-600 opacity-0 group-hover:opacity-100 transition">{isArabic?"فتح":"Open →"}</span>
                        <button type="button" onClick={()=>openEdit(lesson)} className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-900 transition" title={isArabic?"تعديل":"Edit"}><Pencil size={13}/></button>
                        <button type="button" onClick={()=>setDeleteConfirm({open:true,lessonId:lesson.id,title:lesson.title||lesson.name||""})} className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition" title={isArabic?"حذف":"Delete"}><Trash2 size={13}/></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ══ LEVEL 3 — Lesson Detail ══ */}
          {level===3&&drillLesson&&(
            <div>
              {/* Tab bar */}
              <div className="flex overflow-x-auto border-b border-slate-100 px-5">
                {TABS.map((tab)=>(
                  <button key={tab.id} type="button" onClick={()=>switchTab(tab.id)}
                    className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3.5 text-sm font-semibold transition whitespace-nowrap ${activeTab===tab.id?"border-indigo-600 text-indigo-700":"border-transparent text-slate-500 hover:text-slate-900"}`}>
                    <tab.icon size={15}/>
                    {isArabic?tab.ar:tab.en}
                  </button>
                ))}
              </div>

              {/* ─ Tab: Overview ─ */}
              {activeTab==="overview"&&(
                <div className="p-6 space-y-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-black text-slate-900">{drillLesson.title||drillLesson.name}</h2>
                      {drillLesson.description&&<p className="mt-2 text-sm leading-7 text-slate-500">{drillLesson.description}</p>}
                    </div>
                    <button type="button" onClick={()=>openEdit(drillLesson)} className="flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"><Pencil size={14}/>{isArabic?"تعديل":"Edit"}</button>
                  </div>
                  {drillLesson.videoUrl&&(
                    <div>
                      <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500"><Video size={13}/>{isArabic?"الفيديو":"Video"}</p>
                      <video controls src={drillLesson.videoUrl} className="w-full rounded-2xl bg-slate-900" style={{maxHeight:360}}/>
                    </div>
                  )}
                  {/* Quick links */}
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                    {TABS.slice(1).map((tab)=>(
                      <button key={tab.id} type="button" onClick={()=>switchTab(tab.id)}
                        className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-indigo-200 hover:bg-indigo-50 hover:shadow-sm">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-100"><tab.icon size={16} className="text-indigo-600"/></div>
                        <span className="text-sm font-semibold text-slate-700">{isArabic?tab.ar:tab.en}</span>
                        {isArabic?<ChevronLeft size={13} className="ms-auto text-slate-300"/>:<ChevronRight size={13} className="ms-auto text-slate-300"/>}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ─ Tab: Attachments ─ */}
              {activeTab==="attachments"&&(
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-black text-slate-900">{isArabic?"المرفقات والملفات":"Attachments & Files"}</h3>
                    <label className="flex cursor-pointer items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 transition">
                      <Upload size={14}/>{isArabic?"رفع ملف":"Upload File"}
                      <input ref={attachInputRef} type="file" multiple className="hidden" onChange={handleAttachUpload}/>
                    </label>
                  </div>
                  {uploadingAttach&&(
                    <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
                      <div className="flex justify-between text-xs text-indigo-700 mb-1.5"><span>{isArabic?"جاري الرفع...":"Uploading..."}</span><span>{attachUploadPct}%</span></div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-indigo-200"><div className="h-full rounded-full bg-indigo-600 transition-all" style={{width:`${attachUploadPct}%`}}/></div>
                    </div>
                  )}
                  {attachLoading?(
                    <div className="space-y-2">{[1,2,3].map(i=><div key={i} className="h-12 animate-pulse rounded-xl bg-slate-100"/>)}</div>
                  ):attachments.length===0?(
                    <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 py-12 text-center">
                      <FileText size={28} className="mx-auto mb-2 text-slate-300"/>
                      <p className="text-sm text-slate-400">{isArabic?"لا توجد ملفات مرفقة.":"No attachments yet."}</p>
                    </div>
                  ):(
                    <div className="space-y-3">
                      {attachments.map((att)=>{
                        const vid = isVideo(att);
                        const src = att.fileUrl||att.url||"";
                        const isPlaying = playingVideo === att.id;
                        return(
                          <div key={att.id} className={`overflow-hidden rounded-2xl border transition ${vid?"border-emerald-200":"border-slate-200"} ${isPlaying?"shadow-md":""}`}>
                            {/* File row */}
                            <div className={`flex items-center gap-3 px-4 py-3 ${vid?"bg-emerald-50":"bg-white"}`}>
                              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[10px] font-black ${vid?"bg-emerald-200 text-emerald-800":"bg-indigo-100 text-indigo-700"}`}>
                                {vid ? <Video size={14}/> : getExt(att)}
                              </span>
                              <span className="flex-1 truncate text-sm font-medium text-slate-700">{att.originalName||att.name||"File"}</span>
                              <div className="flex items-center gap-1.5">
                                {vid && (
                                  <button
                                    type="button"
                                    onClick={()=>setPlayingVideo(isPlaying ? null : att.id)}
                                    className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition ${isPlaying?"bg-emerald-600 text-white hover:bg-emerald-700":"border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"}`}
                                  >
                                    {isPlaying ? (
                                      <>{isArabic ? "إغلاق" : "Close"}</>
                                    ) : (
                                      <><Video size={12}/>{isArabic ? "تشغيل" : "Play"}</>
                                    )}
                                  </button>
                                )}
                                <a href={src} target="_blank" rel="noreferrer" download={att.originalName||att.name}
                                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-100 transition">
                                  <Download size={13}/>
                                </a>
                                <button type="button" onClick={()=>deleteAttachment(att.id)}
                                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition">
                                  <Trash2 size={13}/>
                                </button>
                              </div>
                            </div>
                            {/* Inline video player */}
                            {vid && isPlaying && (
                              <div className="border-t border-emerald-200 bg-slate-900 px-0 py-0">
                                <video
                                  controls
                                  autoPlay
                                  src={src}
                                  className="w-full"
                                  style={{maxHeight:400,display:"block"}}
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ─ Tab: Flashcards ─ */}
              {activeTab==="flashcards"&&(
                <div className="p-6 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="font-black text-slate-900">{isArabic?"فلاش كاردز AI":"AI Flashcards"}</h3>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={()=>{setAiGenTopic("");setShowFlashcardsModal(true);}} disabled={aiGenerating==="flashcards"} className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-violet-700 disabled:opacity-50 transition">
                        {aiGenerating==="flashcards"?<RefreshCw size={13} className="animate-spin"/>:<Sparkles size={13}/>}
                        {aiGenerating==="flashcards"?(isArabic?"جاري التوليد...":"Generating..."):(isArabic?"توليد":"Generate")}
                      </button>
                      {aiContent?.flashcards?.length>0&&<button type="button" onClick={togglePublish} className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition ${aiContent.published?"border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100":"border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"}`}>
                        {aiContent.published?<EyeOff size={13}/>:<Eye size={13}/>}
                        {aiContent.published?(isArabic?"إلغاء النشر":"Unpublish"):(isArabic?"نشر":"Publish")}
                      </button>}
                      {aiContent?.flashcards?.length>0&&<button type="button" onClick={()=>loadAiContent()} disabled={aiLoading} className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"><RefreshCw size={13} className={aiLoading?"animate-spin":""}/>{isArabic?"تحديث":"Refresh"}</button>}
                      {aiContent?.flashcards?.length>0&&<button type="button" onClick={deleteFlashcards} disabled={saving} className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-100 disabled:opacity-50 transition"><Trash2 size={13}/>{isArabic?"حذف":"Delete"}</button>}
                    </div>
                  </div>
                  {aiLoading?(
                    <div className="grid gap-3 sm:grid-cols-2">{[1,2,3,4].map(i=><div key={i} className="h-24 animate-pulse rounded-xl bg-slate-100"/>)}</div>
                  ):!aiContent?.flashcards?.length?(
                    <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 py-12 text-center">
                      <Sparkles size={28} className="mx-auto mb-2 text-slate-300"/>
                      <p className="text-sm text-slate-400">{isArabic?"اضغط توليد لإنشاء فلاش كاردز من محتوى الدرس.":"Click Generate to create flashcards from lesson content."}</p>
                    </div>
                  ):(
                    <>
                      <p className="text-xs text-slate-500">{aiContent.flashcards.length} {isArabic?"بطاقة":"cards"}</p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {aiContent.flashcards.map((fc,i)=>{
                          const isEditing = editingFlashcard?.index === i;
                          return(
                            <div key={i} className={`rounded-2xl border p-4 ${isEditing?"border-violet-400 bg-violet-100":"border-violet-200 bg-violet-50"}`}>
                              <div className="mb-1.5 flex items-center justify-between">
                                <p className="text-xs font-black uppercase tracking-wider text-violet-500">{isArabic?"سؤال":"Q"} {i+1}</p>
                                {!isEditing ? (
                                  <button type="button" onClick={()=>setEditingFlashcard({index:i, front:fc.front||fc.question||"", back:fc.back||fc.answer||""})}
                                    className="flex h-7 w-7 items-center justify-center rounded-lg text-violet-400 hover:bg-violet-200 transition">
                                    <Pencil size={12}/>
                                  </button>
                                ) : (
                                  <button type="button" onClick={()=>setEditingFlashcard(null)} className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200 transition"><X size={12}/></button>
                                )}
                              </div>
                              {isEditing ? (
                                <div className="space-y-2">
                                  <textarea value={editingFlashcard.front} onChange={(e)=>setEditingFlashcard(f=>({...f,front:e.target.value}))} rows={2} className="w-full resize-none rounded-xl border border-violet-300 bg-white px-3 py-2 text-sm focus:border-violet-500 focus:outline-none" placeholder={isArabic?"السؤال...":"Question..."}/>
                                  <textarea value={editingFlashcard.back} onChange={(e)=>setEditingFlashcard(f=>({...f,back:e.target.value}))} rows={2} className="w-full resize-none rounded-xl border border-violet-300 bg-white px-3 py-2 text-xs focus:border-violet-500 focus:outline-none" placeholder={isArabic?"الجواب...":"Answer..."}/>
                                  <button type="button" onClick={saveFlashcardEdit} disabled={saving} className="w-full rounded-xl bg-violet-600 py-2 text-xs font-bold text-white hover:bg-violet-700 disabled:opacity-50 transition">
                                    {saving?(isArabic?"حفظ...":"Saving..."):(isArabic?"حفظ":"Save")}
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <p className="text-sm font-semibold text-slate-900">{fc.front||fc.question}</p>
                                  <div className="mt-3 rounded-xl border border-violet-200 bg-white px-3 py-2">
                                    <p className="text-xs font-black uppercase tracking-wider text-violet-400 mb-1">{isArabic?"الجواب":"Answer"}</p>
                                    <p className="text-xs text-slate-600">{fc.back||fc.answer}</p>
                                  </div>
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ─ Tab: Mind Map ─ */}
              {activeTab==="mindmap"&&(
                <div className="p-6 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="font-black text-slate-900">{isArabic?"الخريطة الذهنية AI":"AI Mind Map"}</h3>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={()=>{setAiGenTopic("");setShowMindmapModal(true);}} disabled={aiGenerating==="mindmap"} className="flex items-center gap-1.5 rounded-xl bg-teal-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-teal-700 disabled:opacity-50 transition">
                        {aiGenerating==="mindmap"?<RefreshCw size={13} className="animate-spin"/>:<Map size={13}/>}
                        {aiGenerating==="mindmap"?(isArabic?"جاري التوليد...":"Generating..."):(isArabic?"توليد":"Generate")}
                      </button>
                      {aiContent?.mindmap&&<button type="button" onClick={togglePublish} className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition ${aiContent.published?"border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100":"border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"}`}>
                        {aiContent.published?<EyeOff size={13}/>:<Eye size={13}/>}
                        {aiContent.published?(isArabic?"إلغاء النشر":"Unpublish"):(isArabic?"نشر":"Publish")}
                      </button>}
                      {aiContent?.mindmap&&<button type="button" onClick={()=>{ setMindmapDraft(JSON.parse(JSON.stringify(aiContent.mindmap))); setShowMindmapEdit(true); }} className="flex items-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50 px-3.5 py-2 text-xs font-semibold text-teal-700 hover:bg-teal-100 transition"><Pencil size={13}/>{isArabic?"تعديل":"Edit"}</button>}
                      {aiContent?.mindmap&&<button type="button" onClick={deleteMindmap} disabled={saving} className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-100 disabled:opacity-50 transition"><Trash2 size={13}/>{isArabic?"حذف":"Delete"}</button>}
                    </div>
                  </div>
                  {aiLoading?(
                    <div className="h-48 animate-pulse rounded-2xl bg-slate-100"/>
                  ):!aiContent?.mindmap?(
                    <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 py-12 text-center">
                      <Map size={28} className="mx-auto mb-2 text-slate-300"/>
                      <p className="text-sm text-slate-400">{isArabic?"اضغط توليد لإنشاء خريطة ذهنية.":"Click Generate to create a mind map."}</p>
                    </div>
                  ):(
                    <div className="rounded-2xl border border-teal-200 bg-teal-50 p-5">
                      {/* Root node */}
                      <div className="mb-4 flex justify-center">
                        <span className="rounded-2xl bg-teal-700 px-5 py-2.5 text-sm font-black text-white shadow-lg">{aiContent.mindmap.central||aiContent.mindmap.root||drillLesson.title}</span>
                      </div>
                      {/* Branches */}
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {(aiContent.mindmap.branches||aiContent.mindmap.nodes||[]).map((branch,i)=>(
                          <div key={i} className="rounded-xl border border-teal-200 bg-white p-3">
                            <p className="mb-2 text-xs font-black text-teal-700">{branch.label||branch.title||branch.name}</p>
                            {(branch.children||branch.subtopics||[]).map((child,j)=>(
                              <div key={j} className="mt-1 flex items-start gap-1.5">
                                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-400"/>
                                <p className="text-xs text-slate-600">{child.label||child.title||child}</p>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ─ Tab: Quiz ─ */}
              {activeTab==="quiz"&&(
                <div className="p-6 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="font-black text-slate-900">{isArabic?"الاختبار":"Quiz"}</h3>
                    <div className="flex flex-wrap items-center gap-2">
                      <button type="button" onClick={()=>setShowQuizModal(true)} disabled={quizGenerating||saving} className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-bold text-white hover:bg-amber-600 disabled:opacity-50 transition">
                        {quizGenerating?<RefreshCw size={13} className="animate-spin"/>:<Sparkles size={13}/>}
                        {quizGenerating?(isArabic?"جاري التوليد...":"Generating..."):(quiz?(isArabic?"توليد أسئلة":"Generate Questions"):(isArabic?"إنشاء اختبار":"Create Quiz"))}
                      </button>
                      {quiz&&<span className="flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-700">
                        <Eye size={13}/>{isArabic?"منشور":"Published"}
                      </span>}
                      {quiz&&<button type="button" onClick={()=>{
                        setPeriodForm({
                          availableFrom: quiz.availableFrom ? new Date(quiz.availableFrom).toISOString().slice(0,16) : "",
                          availableTo:   quiz.availableTo   ? new Date(quiz.availableTo).toISOString().slice(0,16)   : "",
                        });
                        setShowPeriodModal(true);
                      }} className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition ${(quiz.availableFrom||quiz.availableTo)?"border border-amber-400 bg-amber-100 text-amber-800 hover:bg-amber-200":"border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"}`}>
                        ⏰ {isArabic?"وقت الاختبار":"Quiz Time"}
                      </button>}
                      {quiz&&<button type="button" onClick={()=>setShowAddQ(v=>!v)} className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"><Plus size={13}/>{isArabic?"إضافة سؤال":"Add Question"}</button>}
                      {quiz&&<button type="button" onClick={deleteQuizFull} disabled={saving} className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-100 disabled:opacity-50 transition"><Trash2 size={13}/>{isArabic?"حذف الاختبار":"Delete Quiz"}</button>}
                    </div>
                  </div>
                  {quizLoading?(
                    <div className="h-32 animate-pulse rounded-2xl bg-slate-100"/>
                  ):!quiz?(
                    <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 py-12 text-center">
                      <HelpCircle size={28} className="mx-auto mb-2 text-slate-300"/>
                      <p className="text-sm text-slate-400">{isArabic?"لا يوجد اختبار بعد. اضغط إنشاء اختبار.":"No quiz yet. Click Create Quiz."}</p>
                    </div>
                  ):(
                    <>
                      {(quiz.availableFrom||quiz.availableTo)&&(
                        <div className="flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-700 w-fit">
                          ⏰ {quiz.availableFrom&&<span>{new Date(quiz.availableFrom).toLocaleDateString()}</span>}
                          <span>→</span>
                          {quiz.availableTo?<span>{new Date(quiz.availableTo).toLocaleDateString()}</span>:<span>∞</span>}
                        </div>
                      )}

                      {/* Add question form */}
                      {showAddQ&&(
                        <form onSubmit={addManualQuestion} className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
                          <div className="flex gap-2">
                            {["MULTIPLE_CHOICE","TRUE_FALSE","SHORT_ANSWER"].map(t=>(
                              <button key={t} type="button" onClick={()=>setAddQForm(f=>({...f,type:t}))} className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${addQForm.type===t?"bg-amber-600 text-white":"border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                                {{MULTIPLE_CHOICE:isArabic?"اختيار":"MCQ",TRUE_FALSE:isArabic?"صح/خطأ":"T/F",SHORT_ANSWER:isArabic?"قصير":"Short"}[t]}
                              </button>
                            ))}
                          </div>
                          <textarea value={addQForm.question} onChange={(e)=>setAddQForm(f=>({...f,question:e.target.value}))} placeholder={isArabic?"نص السؤال...":"Question text..."} rows={2} className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-amber-400 focus:outline-none" required/>
                          {addQForm.type==="MULTIPLE_CHOICE"&&(
                            <div className="space-y-2">
                              {addQForm.options.map((opt,i)=>(
                                <div key={i} className="flex items-center gap-2">
                                  <button type="button" onClick={()=>setAddQForm(f=>({...f,correctAnswer:i}))} className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition ${addQForm.correctAnswer===i?"border-emerald-500 bg-emerald-500":"border-slate-300"}`}>
                                    {addQForm.correctAnswer===i&&<CheckCircle2 size={12} className="text-white"/>}
                                  </button>
                                  <input value={opt} onChange={(e)=>setAddQForm(f=>{const o=[...f.options];o[i]=e.target.value;return{...f,options:o};})} placeholder={`${isArabic?"خيار":"Option"} ${i+1}`} className="flex-1 h-9 rounded-xl border border-slate-200 px-3 text-sm focus:border-amber-400 focus:outline-none"/>
                                </div>
                              ))}
                            </div>
                          )}
                          {addQForm.type==="TRUE_FALSE"&&(
                            <div className="flex gap-3">
                              {[{v:"true",l:isArabic?"صحيح":"True"},{v:"false",l:isArabic?"خطأ":"False"}].map(({v,l})=>(
                                <button key={v} type="button" onClick={()=>setAddQForm(f=>({...f,expectedAnswer:v}))} className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${addQForm.expectedAnswer===v?"bg-emerald-600 text-white":"border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                                  <Circle size={14}/>{l}
                                </button>
                              ))}
                            </div>
                          )}
                          {addQForm.type==="SHORT_ANSWER"&&(
                            <input value={addQForm.expectedAnswer} onChange={(e)=>setAddQForm(f=>({...f,expectedAnswer:e.target.value}))} placeholder={isArabic?"الإجابة المتوقعة...":"Expected answer..."} className="w-full h-9 rounded-xl border border-slate-200 px-3 text-sm focus:border-amber-400 focus:outline-none"/>
                          )}
                          <div className="flex gap-2">
                            <button type="submit" disabled={saving} className="flex-1 rounded-xl bg-amber-600 py-2 text-sm font-bold text-white hover:bg-amber-700 disabled:opacity-50">{saving?"...":(isArabic?"حفظ":"Save")}</button>
                            <button type="button" onClick={()=>setShowAddQ(false)} className="flex-1 rounded-xl border border-slate-200 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">{isArabic?"إلغاء":"Cancel"}</button>
                          </div>
                        </form>
                      )}

                      {/* Questions list */}
                      {(quiz.questions||[]).length===0?(
                        <p className="text-center text-sm text-slate-400 py-6">{isArabic?"لا توجد أسئلة بعد.":"No questions yet."}</p>
                      ):(
                        <div className="space-y-2">
                          {(quiz.questions||[]).map((q,i)=>{
                            const isEditingThis = editingQuestion?.id === q.id;
                            return(
                              <div key={q.id} className={`rounded-2xl border overflow-hidden ${isEditingThis?"border-amber-400":"border-slate-200 bg-white"}`}>
                                {/* Row header */}
                                <div className="flex items-center gap-3 px-4 py-3">
                                  <button type="button" onClick={()=>setExpandedQ(expandedQ===q.id?null:q.id)} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-black text-amber-700">{i+1}</button>
                                  <button type="button" onClick={()=>setExpandedQ(expandedQ===q.id?null:q.id)} className="flex-1 text-left text-sm font-semibold text-slate-900 truncate">{q.question}</button>
                                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${q.type==="MULTIPLE_CHOICE"?"bg-blue-100 text-blue-700":q.type==="TRUE_FALSE"?"bg-purple-100 text-purple-700":"bg-slate-100 text-slate-600"}`}>
                                    {{MULTIPLE_CHOICE:"MCQ",TRUE_FALSE:"T/F",SHORT_ANSWER:"Short"}[q.type]||q.type}
                                  </span>
                                  <button type="button" onClick={(e)=>{e.stopPropagation(); if(isEditingThis){setEditingQuestion(null);}else{setEditingQuestion({id:q.id,type:q.type,question:q.question||"",options:q.options||["","","",""],correctAnswer:q.correctAnswer??0,expectedAnswer:q.expectedAnswer||"",explanation:q.explanation||""}); setExpandedQ(null);}}}
                                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl transition ${isEditingThis?"bg-amber-100 text-amber-700":"text-slate-400 hover:bg-amber-100 hover:text-amber-700"}`}>
                                    {isEditingThis?<X size={12}/>:<Pencil size={12}/>}
                                  </button>
                                  <button type="button" onClick={(e)=>{e.stopPropagation();deleteQuestion(q.id);}} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-rose-100 hover:text-rose-600 transition"><Trash2 size={12}/></button>
                                </div>

                                {/* Edit form */}
                                {isEditingThis&&(
                                  <form onSubmit={saveQuestionEdit} className="border-t border-amber-200 bg-amber-50 px-4 py-4 space-y-3">
                                    <div className="flex gap-2">
                                      {["MULTIPLE_CHOICE","TRUE_FALSE","SHORT_ANSWER"].map(t=>(
                                        <button key={t} type="button" onClick={()=>setEditingQuestion(f=>({...f,type:t}))} className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${editingQuestion.type===t?"bg-amber-600 text-white":"border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                                          {{MULTIPLE_CHOICE:isArabic?"اختيار":"MCQ",TRUE_FALSE:isArabic?"صح/خطأ":"T/F",SHORT_ANSWER:isArabic?"قصير":"Short"}[t]}
                                        </button>
                                      ))}
                                    </div>
                                    <textarea value={editingQuestion.question} onChange={(e)=>setEditingQuestion(f=>({...f,question:e.target.value}))} rows={2} className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-amber-400 focus:outline-none" required/>
                                    {editingQuestion.type==="MULTIPLE_CHOICE"&&(
                                      <div className="space-y-2">
                                        {editingQuestion.options.map((opt,j)=>(
                                          <div key={j} className="flex items-center gap-2">
                                            <button type="button" onClick={()=>setEditingQuestion(f=>({...f,correctAnswer:j}))} className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition ${editingQuestion.correctAnswer===j?"border-emerald-500 bg-emerald-500":"border-slate-300"}`}>
                                              {editingQuestion.correctAnswer===j&&<CheckCircle2 size={12} className="text-white"/>}
                                            </button>
                                            <input value={opt} onChange={(e)=>setEditingQuestion(f=>{const o=[...f.options];o[j]=e.target.value;return{...f,options:o};})} className="flex-1 h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm focus:border-amber-400 focus:outline-none"/>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                    {editingQuestion.type==="TRUE_FALSE"&&(
                                      <div className="flex gap-3">
                                        {[{v:"true",l:isArabic?"صحيح":"True"},{v:"false",l:isArabic?"خطأ":"False"}].map(({v,l})=>(
                                          <button key={v} type="button" onClick={()=>setEditingQuestion(f=>({...f,expectedAnswer:v}))} className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${editingQuestion.expectedAnswer===v?"bg-emerald-600 text-white":"border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>{l}</button>
                                        ))}
                                      </div>
                                    )}
                                    {editingQuestion.type==="SHORT_ANSWER"&&(
                                      <input value={editingQuestion.expectedAnswer} onChange={(e)=>setEditingQuestion(f=>({...f,expectedAnswer:e.target.value}))} className="w-full h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm focus:border-amber-400 focus:outline-none" placeholder={isArabic?"الإجابة المتوقعة...":"Expected answer..."}/>
                                    )}
                                    <div className="flex gap-2">
                                      <button type="submit" disabled={saving} className="flex-1 rounded-xl bg-amber-600 py-2 text-sm font-bold text-white hover:bg-amber-700 disabled:opacity-50">{saving?"...":(isArabic?"حفظ":"Save")}</button>
                                      <button type="button" onClick={()=>setEditingQuestion(null)} className="flex-1 rounded-xl border border-slate-200 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">{isArabic?"إلغاء":"Cancel"}</button>
                                    </div>
                                  </form>
                                )}

                                {/* Expand view */}
                                {expandedQ===q.id&&!isEditingThis&&(
                                  <div className="border-t border-slate-100 bg-slate-50 px-4 py-3 space-y-2">
                                    {q.type==="MULTIPLE_CHOICE"&&(q.options||[]).map((opt,j)=>(
                                      <div key={j} className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${j===q.correctAnswer?"bg-emerald-100 font-semibold text-emerald-800":"text-slate-600"}`}>
                                        {j===q.correctAnswer?<CheckCircle2 size={14} className="text-emerald-600 shrink-0"/>:<Circle size={14} className="text-slate-300 shrink-0"/>}
                                        {opt}
                                      </div>
                                    ))}
                                    {q.type==="TRUE_FALSE"&&<p className="text-sm text-slate-700"><span className="font-semibold">{isArabic?"الإجابة:":"Answer:"}</span> {String(q.expectedAnswer||q.correctAnswer)}</p>}
                                    {q.type==="SHORT_ANSWER"&&<p className="text-sm text-slate-700"><span className="font-semibold">{isArabic?"الإجابة المتوقعة:":"Expected:"}</span> {q.expectedAnswer}</p>}
                                    {q.explanation&&<p className="text-xs text-slate-400 italic">{q.explanation}</p>}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* ─ Tab: Slides ─ */}
              {activeTab==="slides"&&(
                <div className="p-6 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="font-black text-slate-900">{isArabic?"الشرائح التقديمية":"Presentation Slides"}</h3>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={()=>setShowSlidesModal(true)} disabled={slidesGenerating} className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-violet-700 disabled:opacity-50 transition">
                      {slidesGenerating?<RefreshCw size={13} className="animate-spin"/>:<Sparkles size={13}/>}
                      {slidesGenerating?(isArabic?"جاري التوليد...":"Generating..."):(isArabic?"توليد الشرائح":"Generate Slides")}
                    </button>
                      {slidesData?.slides?.length>0&&<button type="button" onClick={downloadPptx} className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition"><Download size={13}/>{isArabic?"تنزيل PPTX":"Download PPTX"}</button>}
                    </div>
                  </div>

                  {!slidesData&&(
                    <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 py-12 text-center">
                      <Layers size={28} className="mx-auto mb-2 text-slate-300"/>
                      <p className="text-sm text-slate-400">{isArabic?"اضغط إعدادات التوليد لإنشاء شرائح من محتوى الدرس.":"Click Generation Settings to create slides from lesson content."}</p>
                    </div>
                  )}

                  {slidesData?.slides?.length>0&&(
                    <div>
                      <p className="mb-3 text-xs text-slate-500">{slidesData.slides.length} {isArabic?"شريحة":"slides"} · {slidesData.theme}</p>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {slidesData.slides.map((sl,i)=>(
                          <div key={i} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">{isArabic?"شريحة":"Slide"} {i+1}</p>
                            <p className="text-sm font-semibold text-slate-900 truncate">{sl.title}</p>
                            {sl.bullets?.length>0&&<p className="mt-1 text-xs text-slate-500 truncate">{sl.bullets[0]}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {/* ── Set Quiz Time Modal ── */}
      {showPeriodModal&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4">
              <h2 className="text-lg font-black text-white">⏰ {isArabic?"تحديد وقت الاختبار":"Set Quiz Time Period"}</h2>
              <p className="mt-0.5 text-xs text-amber-100">{isArabic?"اتركه فارغاً لإزالة القيد الزمني":"Leave empty to remove the time restriction"}</p>
            </div>
            <div className="space-y-4 p-6">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-600">{isArabic?"يبدأ من":"Available From"}</label>
                <input type="datetime-local" value={periodForm.availableFrom}
                  onChange={(e)=>setPeriodForm(p=>({...p,availableFrom:e.target.value}))}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"/>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-600">{isArabic?"ينتهي في":"Available Until"}</label>
                <input type="datetime-local" value={periodForm.availableTo}
                  onChange={(e)=>setPeriodForm(p=>({...p,availableTo:e.target.value}))}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"/>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={async()=>{
                  try {
                    const u = await updateLessonQuiz(drillCourse.id, drillLesson.id, quiz.id, {
                      availableFrom: periodForm.availableFrom || null,
                      availableTo:   periodForm.availableTo   || null,
                    });
                    setQuiz(u); setShowPeriodModal(false);
                  } catch(err){ notifyError(safeError(err)); }
                }} className="flex-1 rounded-xl bg-amber-500 py-2.5 text-sm font-bold text-white hover:bg-amber-600">
                  {isArabic?"حفظ":"Save"}
                </button>
                <button type="button" onClick={async()=>{
                  try {
                    const u = await updateLessonQuiz(drillCourse.id, drillLesson.id, quiz.id, { availableFrom: null, availableTo: null });
                    setQuiz(u); setPeriodForm({availableFrom:"",availableTo:""}); setShowPeriodModal(false);
                  } catch(err){ notifyError(safeError(err)); }
                }} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-50">
                  {isArabic?"إزالة الوقت":"Clear"}
                </button>
                <button type="button" onClick={()=>setShowPeriodModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-50">
                  {isArabic?"إلغاء":"Cancel"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </InstructorLayout>
  );
}
