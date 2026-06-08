import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Alert, TextInput, Modal, ActivityIndicator, FlatList,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import {
  ArrowLeft, Paperclip, Zap, Brain, HelpCircle, Presentation,
  Plus, Trash2, Upload, RefreshCw, Eye, EyeOff, CheckCircle,
  X, Save, Cpu, FileText, MessageSquare, Edit2,
} from 'lucide-react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import { spacing, radius, fontSize, fontWeight } from '../../../shared/theme';
import { LoadingState, EmptyState } from '../../../shared/components';
import {
  fetchAttachments, uploadAttachments, deleteAttachment, fetchRagStatus, reprocessRag,
  fetchAiContent, regenerateFlashcards, regenerateMindmap,
  updateFlashcards, updateMindmap, deleteFlashcards, deleteMindmap,
  publishAiContent, unpublishAiContent,
  generateSlides, deleteSlides,
  fetchQuiz, createQuiz, updateQuiz, deleteQuiz,
  generateQuizQuestions, addQuizQuestion, deleteQuizQuestion,
  fetchLessonComments, updateLessonMeta,
} from '../services/instructorService';
import type {
  LessonAttachment, AiContent, Flashcard, Mindmap, PowerSlides, Quiz, QuizQuestion,
} from '../../../types/instructor';
import type { InstructorStackParamList } from '../../../types/navigation';

type Nav   = NativeStackNavigationProp<InstructorStackParamList>;
type Route = RouteProp<InstructorStackParamList, 'InstructorLessonDetail'>;

type LessonTab = 'overview' | 'attachments' | 'flashcards' | 'mindmap' | 'quiz' | 'slides';

const TABS: { key: LessonTab; label: string; icon: React.ComponentType<{ size: number; color: string }> }[] = [
  { key: 'overview',     label: 'Overview',     icon: FileText     },
  { key: 'attachments',  label: 'Attachments',  icon: Paperclip    },
  { key: 'flashcards',   label: 'Flashcards',   icon: Zap          },
  { key: 'mindmap',      label: 'Mind Map',     icon: Brain        },
  { key: 'quiz',         label: 'Quiz',         icon: HelpCircle   },
  { key: 'slides',       label: 'Slides',       icon: Presentation },
];

export function InstructorLessonDetailScreen() {
  const { T } = useTheme();
  const insets = useSafeAreaInsets();
  const nav = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { lessonId, lessonTitle, subjectId } = route.params;

  const [activeTab,  setActiveTab]  = useState<LessonTab>('overview');
  const [refreshing, setRefreshing] = useState(false);

  // ── Overview ───────────────────────────────────────────────────────────────
  const [comments,   setComments]   = useState<{ id: number; content: string; authorName?: string; createdAt: string }[]>([]);
  const [commLoading, setCommLoading] = useState(false);

  // ── Attachments ────────────────────────────────────────────────────────────
  const [attachments,  setAttachments]  = useState<LessonAttachment[]>([]);
  const [attLoading,   setAttLoading]   = useState(false);
  const [uploading,    setUploading]    = useState(false);
  const [uploadPct,    setUploadPct]    = useState(0);
  const [ragStatus,    setRagStatus]    = useState<{ processed: number; total: number } | null>(null);
  const [reprocessing, setReprocessing] = useState(false);

  // ── AI Content ─────────────────────────────────────────────────────────────
  const [aiContent,    setAiContent]    = useState<AiContent | null>(null);
  const [aiLoading,    setAiLoading]    = useState(false);
  const [generating,   setGenerating]   = useState(false);
  const [aiLang,       setAiLang]       = useState<'en' | 'ar'>('en');
  const [aiTopic,      setAiTopic]      = useState('');
  const [publishing,   setPublishing]   = useState(false);

  // Edit flashcards
  const [editCards,    setEditCards]    = useState<Flashcard[]>([]);
  const [savingCards,  setSavingCards]  = useState(false);
  const [editCardsMode, setEditCardsMode] = useState(false);

  // Edit mindmap
  const [editMM,  setEditMM]  = useState<Mindmap | null>(null);
  const [savingMM, setSavingMM] = useState(false);
  const [editMMMode, setEditMMMode] = useState(false);

  // ── Quiz ───────────────────────────────────────────────────────────────────
  const [quiz,         setQuiz]         = useState<Quiz | null>(null);
  const [quizLoading,  setQuizLoading]  = useState(false);
  const [quizLang,     setQuizLang]     = useState<'en' | 'ar'>('en');
  const [genModal,     setGenModal]     = useState(false);
  const [genForm,      setGenForm]      = useState({ numMCQ: '5', numTrueFalse: '3', numShortAnswer: '2', difficulty: 'MEDIUM', notes: '', lang: 'en' });
  const [generating2,  setGenerating2]  = useState(false);
  const [addQModal,    setAddQModal]    = useState(false);
  const [qForm,        setQForm]        = useState({ type: 'MULTIPLE_CHOICE' as QuizQuestion['type'], question: '', options: ['', '', '', ''], correctAnswer: '0', expectedAnswer: '', explanation: '' });
  const [savingQ,      setSavingQ]      = useState(false);

  // ── Slides ─────────────────────────────────────────────────────────────────
  const [slides,       setSlides]       = useState<PowerSlides | null>(null);
  const [slidesModal,  setSlidesModal]  = useState(false);
  const [slideForm,    setSlideForm]    = useState({ lang: 'en', numSlides: '10', theme: 'minimalist', topic: '' });
  const [genSlides,    setGenSlides]    = useState(false);

  // ── Load functions ─────────────────────────────────────────────────────────
  const loadAttachments = useCallback(async () => {
    setAttLoading(true);
    try {
      const [att, rag] = await Promise.all([
        fetchAttachments(lessonId),
        fetchRagStatus(lessonId).catch(() => null),
      ]);
      setAttachments(att);
      if (rag) setRagStatus(rag);
    } catch {}
    finally { setAttLoading(false); }
  }, [lessonId]);

  const loadAiContent = useCallback(async () => {
    setAiLoading(true);
    try {
      const data = await fetchAiContent(lessonId, aiLang);
      setAiContent(data);
      if (data?.flashcards) setEditCards(data.flashcards);
      if (data?.mindmap) setEditMM(data.mindmap);
    } catch {}
    finally { setAiLoading(false); }
  }, [lessonId, aiLang]);

  const loadQuiz = useCallback(async () => {
    setQuizLoading(true);
    try {
      const q = await fetchQuiz(subjectId, lessonId, quizLang);
      setQuiz(q);
    } catch {}
    finally { setQuizLoading(false); }
  }, [lessonId, subjectId, quizLang]);

  const loadComments = useCallback(async () => {
    setCommLoading(true);
    const c = await fetchLessonComments(lessonId).catch(() => []);
    setComments(c);
    setCommLoading(false);
  }, [lessonId]);

  useEffect(() => {
    if (activeTab === 'attachments') loadAttachments();
    else if (activeTab === 'flashcards' || activeTab === 'mindmap') loadAiContent();
    else if (activeTab === 'quiz') loadQuiz();
    else if (activeTab === 'overview') loadComments();
  }, [activeTab]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (activeTab === 'attachments') await loadAttachments();
    else if (activeTab === 'flashcards' || activeTab === 'mindmap') await loadAiContent();
    else if (activeTab === 'quiz') await loadQuiz();
    else if (activeTab === 'overview') await loadComments();
    setRefreshing(false);
  }, [activeTab, loadAttachments, loadAiContent, loadQuiz, loadComments]);

  // ── Attachments actions ────────────────────────────────────────────────────
  const handlePickAndUpload = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection: false,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setUploading(true);
    setUploadPct(0);
    try {
      const fd = new FormData();
      fd.append('files', { uri: asset.uri, name: asset.fileName ?? 'file', type: asset.mimeType ?? 'application/octet-stream' } as unknown as Blob);
      const uploaded = await uploadAttachments(lessonId, fd, setUploadPct);
      setAttachments(prev => [...prev, ...uploaded]);
      Alert.alert('Uploaded', 'File uploaded. RAG processing may take a moment.');
    } catch (e: unknown) {
      Alert.alert('Error', (e as Error).message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAtt = (att: LessonAttachment) => {
    Alert.alert('Delete', `Delete "${att.originalName ?? att.name ?? 'this file'}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await deleteAttachment(lessonId, att.id); setAttachments(prev => prev.filter(a => a.id !== att.id)); }
        catch { Alert.alert('Error', 'Failed to delete.'); }
      }},
    ]);
  };

  const handleReprocess = async () => {
    setReprocessing(true);
    try { await reprocessRag(lessonId); Alert.alert('Reprocessing', 'RAG reprocessing started.'); }
    catch { Alert.alert('Error', 'Failed to start reprocessing.'); }
    finally { setReprocessing(false); }
  };

  // ── Flashcards actions ─────────────────────────────────────────────────────
  const handleGenerateFlashcards = async () => {
    setGenerating(true);
    try {
      const data = await regenerateFlashcards(lessonId, aiLang, aiTopic);
      setAiContent(data);
      setEditCards(data?.flashcards ?? []);
      Alert.alert('Generated', `${data?.flashcards?.length ?? 0} flashcards generated.`);
    } catch (e: unknown) { Alert.alert('Error', (e as Error).message || 'Generation failed.'); }
    finally { setGenerating(false); }
  };

  const handleSaveFlashcards = async () => {
    setSavingCards(true);
    try {
      const data = await updateFlashcards(lessonId, editCards, aiLang);
      setAiContent(prev => prev ? { ...prev, flashcards: data?.flashcards ?? editCards } : prev);
      setEditCardsMode(false);
      Alert.alert('Saved', 'Flashcards updated.');
    } catch (e: unknown) { Alert.alert('Error', (e as Error).message || 'Save failed.'); }
    finally { setSavingCards(false); }
  };

  const handleDeleteFlashcards = () => {
    Alert.alert('Delete', 'Delete all flashcards?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await deleteFlashcards(lessonId); setAiContent(prev => prev ? { ...prev, flashcards: undefined } : null); setEditCards([]); }
        catch { Alert.alert('Error', 'Failed.'); }
      }},
    ]);
  };

  // ── Mindmap actions ────────────────────────────────────────────────────────
  const handleGenerateMindmap = async () => {
    setGenerating(true);
    try {
      const data = await regenerateMindmap(lessonId, aiLang, aiTopic);
      setAiContent(data);
      setEditMM(data?.mindmap ?? null);
      Alert.alert('Generated', 'Mind map generated.');
    } catch (e: unknown) { Alert.alert('Error', (e as Error).message || 'Generation failed.'); }
    finally { setGenerating(false); }
  };

  const handleSaveMindmap = async () => {
    if (!editMM) return;
    setSavingMM(true);
    try {
      const data = await updateMindmap(lessonId, editMM, aiLang);
      setAiContent(prev => prev ? { ...prev, mindmap: data?.mindmap ?? editMM } : prev);
      setEditMMMode(false);
      Alert.alert('Saved', 'Mind map updated.');
    } catch (e: unknown) { Alert.alert('Error', (e as Error).message || 'Save failed.'); }
    finally { setSavingMM(false); }
  };

  const handleDeleteMindmap = () => {
    Alert.alert('Delete', 'Delete mind map?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await deleteMindmap(lessonId); setAiContent(prev => prev ? { ...prev, mindmap: undefined } : null); setEditMM(null); }
        catch { Alert.alert('Error', 'Failed.'); }
      }},
    ]);
  };

  const handlePublishToggle = async () => {
    setPublishing(true);
    try {
      if (aiContent?.isPublished) await unpublishAiContent(lessonId);
      else await publishAiContent(lessonId);
      setAiContent(prev => prev ? { ...prev, isPublished: !prev.isPublished } : prev);
    } catch (e: unknown) { Alert.alert('Error', (e as Error).message || 'Failed.'); }
    finally { setPublishing(false); }
  };

  // ── Quiz actions ───────────────────────────────────────────────────────────
  const handleCreateQuiz = async () => {
    try {
      const q = await createQuiz(subjectId, lessonId, { title: `${lessonTitle} Quiz`, difficulty: 'MEDIUM', passingScore: 60 });
      setQuiz(q);
    } catch (e: unknown) { Alert.alert('Error', (e as Error).message || 'Failed to create quiz.'); }
  };

  const handleDeleteQuiz = () => {
    if (!quiz) return;
    Alert.alert('Delete Quiz', 'Delete this quiz and all its questions?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await deleteQuiz(subjectId, lessonId, quiz.id); setQuiz(null); }
        catch { Alert.alert('Error', 'Failed.'); }
      }},
    ]);
  };

  const handleGenQuestions = async () => {
    if (!quiz) return;
    setGenerating2(true);
    try {
      const q = await generateQuizQuestions(subjectId, lessonId, quiz.id, {
        numMCQ: Number(genForm.numMCQ) || 0,
        numTrueFalse: Number(genForm.numTrueFalse) || 0,
        numShortAnswer: Number(genForm.numShortAnswer) || 0,
        difficulty: genForm.difficulty,
        notes: genForm.notes || undefined,
        lang: genForm.lang,
      });
      setQuiz(q);
      setGenModal(false);
      Alert.alert('Generated', `${q?.questions?.length ?? 0} questions generated.`);
    } catch (e: unknown) { Alert.alert('Error', (e as Error).message || 'Generation failed.'); }
    finally { setGenerating2(false); }
  };

  const handleAddQuestion = async () => {
    if (!quiz) return;
    if (!qForm.question.trim()) { Alert.alert('Required', 'Question text is required.'); return; }
    setSavingQ(true);
    try {
      const payload: Partial<QuizQuestion> = {
        type: qForm.type,
        question: qForm.question,
        explanation: qForm.explanation || undefined,
      };
      if (qForm.type === 'MULTIPLE_CHOICE') {
        payload.options = qForm.options.filter(o => o.trim());
        payload.correctAnswer = Number(qForm.correctAnswer);
      } else if (qForm.type === 'TRUE_FALSE') {
        payload.correctAnswer = qForm.correctAnswer;
      } else {
        payload.expectedAnswer = qForm.expectedAnswer;
      }
      await addQuizQuestion(subjectId, lessonId, quiz.id, payload, quizLang);
      const q = await fetchQuiz(subjectId, lessonId, quizLang);
      setQuiz(q);
      setAddQModal(false);
      setQForm({ type: 'MULTIPLE_CHOICE', question: '', options: ['', '', '', ''], correctAnswer: '0', expectedAnswer: '', explanation: '' });
    } catch (e: unknown) { Alert.alert('Error', (e as Error).message || 'Failed to add question.'); }
    finally { setSavingQ(false); }
  };

  const handleDeleteQuestion = async (qId: number) => {
    if (!quiz) return;
    try {
      await deleteQuizQuestion(subjectId, lessonId, quiz.id, qId);
      setQuiz(prev => prev ? { ...prev, questions: (prev.questions ?? []).filter(q => q.id !== qId) } : prev);
    } catch { Alert.alert('Error', 'Failed to delete question.'); }
  };

  const handleTogglePublishQuiz = async () => {
    if (!quiz) return;
    try {
      const q = await updateQuiz(subjectId, lessonId, quiz.id, { isPublished: !quiz.isPublished });
      setQuiz(q);
    } catch (e: unknown) { Alert.alert('Error', (e as Error).message || 'Failed.'); }
  };

  // ── Slides actions ─────────────────────────────────────────────────────────
  const handleGenerateSlides = async () => {
    setGenSlides(true);
    try {
      const s = await generateSlides(lessonId, {
        lang: slideForm.lang, numSlides: Number(slideForm.numSlides) || 10,
        theme: slideForm.theme, topic: slideForm.topic || undefined,
      });
      setSlides(s);
      setSlidesModal(false);
      Alert.alert('Generated', `${s?.slides?.length ?? 0} slides generated.`);
    } catch (e: unknown) { Alert.alert('Error', (e as Error).message || 'Generation failed.'); }
    finally { setGenSlides(false); }
  };

  const handleDeleteSlides = () => {
    Alert.alert('Delete', 'Delete all slides?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await deleteSlides(lessonId); setSlides(null); }
        catch { Alert.alert('Error', 'Failed.'); }
      }},
    ]);
  };

  // ── Language toggle (for AI content) ──────────────────────────────────────
  const LangToggle = () => (
    <View style={styles.langRow}>
      {(['en', 'ar'] as const).map(l => (
        <TouchableOpacity
          key={l}
          style={[styles.langBtn, { backgroundColor: aiLang === l ? T.primary : T.elevated }]}
          onPress={() => setAiLang(l)}
        >
          <Text style={{ color: aiLang === l ? '#fff' : T.muted, fontSize: fontSize.xs, fontWeight: fontWeight.bold }}>
            {l === 'en' ? 'English' : 'عربي'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  // ── Tab content renderers ──────────────────────────────────────────────────
  const renderOverview = () => (
    <ScrollView contentContainerStyle={styles.tabBody} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.primary} />} showsVerticalScrollIndicator={false}>
      <View style={[styles.card, { backgroundColor: T.surface, borderColor: T.border }]}>
        <Text style={[styles.cardTitle, { color: T.text }]}>Lesson Info</Text>
        <Text style={[styles.lessonTitleText, { color: T.text }]}>{lessonTitle}</Text>
      </View>
      <View style={[styles.card, { backgroundColor: T.surface, borderColor: T.border }]}>
        <View style={styles.cardTitleRow}>
          <MessageSquare size={14} color="#6366f1" />
          <Text style={[styles.cardTitle, { color: T.text }]}>Student Comments ({comments.length})</Text>
        </View>
        {commLoading ? <ActivityIndicator size="small" color={T.primary} /> : comments.length === 0 ? (
          <Text style={[styles.emptyText, { color: T.muted }]}>No comments yet.</Text>
        ) : comments.map(c => (
          <View key={c.id} style={[styles.commentRow, { borderTopColor: T.border }]}>
            <Text style={[styles.commentAuthor, { color: T.text }]}>{c.authorName ?? 'Student'}</Text>
            <Text style={[styles.commentContent, { color: T.subtext }]}>{c.content}</Text>
            <Text style={[styles.commentDate, { color: T.muted }]}>{String(c.createdAt).slice(0, 10)}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );

  const renderAttachments = () => (
    <ScrollView contentContainerStyle={styles.tabBody} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.primary} />} showsVerticalScrollIndicator={false}>
      {/* RAG status */}
      {ragStatus && (
        <View style={[styles.ragBanner, { backgroundColor: ragStatus.processed === ragStatus.total ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.08)', borderColor: ragStatus.processed === ragStatus.total ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)' }]}>
          <Text style={{ color: ragStatus.processed === ragStatus.total ? '#10b981' : '#f59e0b', fontSize: fontSize.xs, fontWeight: fontWeight.bold }}>
            RAG: {ragStatus.processed}/{ragStatus.total} files processed
          </Text>
          <TouchableOpacity onPress={handleReprocess} disabled={reprocessing}>
            {reprocessing ? <ActivityIndicator size="small" color="#f59e0b" /> : <RefreshCw size={14} color="#f59e0b" />}
          </TouchableOpacity>
        </View>
      )}
      {/* Upload */}
      <TouchableOpacity style={[styles.uploadArea, { backgroundColor: T.surface, borderColor: T.border }]} onPress={handlePickAndUpload} disabled={uploading}>
        {uploading ? (
          <View style={{ alignItems: 'center', gap: spacing[2] }}>
            <ActivityIndicator size="small" color={T.primary} />
            <Text style={[styles.uploadText, { color: T.muted }]}>{uploadPct}% uploading…</Text>
          </View>
        ) : (
          <>
            <Upload size={24} color={T.muted} />
            <Text style={[styles.uploadText, { color: T.muted }]}>Tap to pick image or video</Text>
            <Text style={[styles.uploadSub, { color: T.muted }]}>PDFs and documents available on web</Text>
          </>
        )}
      </TouchableOpacity>
      {/* List */}
      {attLoading ? <LoadingState message="Loading attachments…" /> : attachments.length === 0 ? (
        <EmptyState emoji="📎" title="No attachments" subtitle="Upload files to power AI content generation." />
      ) : attachments.map(att => {
        const ext = (att.originalName ?? att.name ?? '').split('.').pop()?.toUpperCase() ?? 'FILE';
        return (
          <View key={att.id} style={[styles.attRow, { backgroundColor: T.surface, borderColor: T.border }]}>
            <View style={[styles.attIcon, { backgroundColor: T.elevated }]}>
              <Text style={[styles.attExt, { color: T.muted }]}>{ext.slice(0, 4)}</Text>
            </View>
            <Text style={[styles.attName, { color: T.text }]} numberOfLines={1}>{att.originalName ?? att.name ?? 'File'}</Text>
            <TouchableOpacity onPress={() => handleDeleteAtt(att)} style={styles.delBtn}>
              <Trash2 size={14} color="#ef4444" />
            </TouchableOpacity>
          </View>
        );
      })}
    </ScrollView>
  );

  const renderFlashcards = () => (
    <ScrollView contentContainerStyle={styles.tabBody} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.primary} />} showsVerticalScrollIndicator={false}>
      <LangToggle />
      <View style={[styles.topicRow, { backgroundColor: T.inputBg, borderColor: T.inputBorder }]}>
        <TextInput style={[styles.topicInput, { color: T.text }]} value={aiTopic} onChangeText={setAiTopic} placeholder="Specific topic (optional)" placeholderTextColor={T.placeholder} />
      </View>
      <View style={styles.aiActions}>
        <TouchableOpacity style={[styles.aiBtn, { backgroundColor: '#6366f1' }]} onPress={handleGenerateFlashcards} disabled={generating}>
          {generating ? <ActivityIndicator size="small" color="#fff" /> : <><Cpu size={14} color="#fff" /><Text style={styles.aiBtnText}>Generate</Text></>}
        </TouchableOpacity>
        {(aiContent?.flashcards ?? []).length > 0 && (
          <>
            <TouchableOpacity style={[styles.aiBtn, { backgroundColor: '#10b981' }]} onPress={() => setEditCardsMode(p => !p)}>
              <Edit2 size={14} color="#fff" /><Text style={styles.aiBtnText}>{editCardsMode ? 'Preview' : 'Edit'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.aiBtn, { backgroundColor: aiContent?.isPublished ? '#f59e0b' : '#8b5cf6' }]} onPress={handlePublishToggle} disabled={publishing}>
              {publishing ? <ActivityIndicator size="small" color="#fff" /> : aiContent?.isPublished ? <><EyeOff size={14} color="#fff" /><Text style={styles.aiBtnText}>Unpublish</Text></> : <><Eye size={14} color="#fff" /><Text style={styles.aiBtnText}>Publish</Text></>}
            </TouchableOpacity>
            <TouchableOpacity style={[styles.aiBtn, { backgroundColor: '#ef4444' }]} onPress={handleDeleteFlashcards}>
              <Trash2 size={14} color="#fff" /><Text style={styles.aiBtnText}>Delete</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
      {aiLoading ? <LoadingState message="Loading flashcards…" /> : (aiContent?.flashcards ?? []).length === 0 ? (
        <EmptyState emoji="🃏" title="No flashcards" subtitle="Generate flashcards from lesson content." />
      ) : editCardsMode ? (
        <>
          {editCards.map((card, i) => (
            <View key={i} style={[styles.card, { backgroundColor: T.surface, borderColor: T.border }]}>
              <View style={styles.cardTitleRow}>
                <Text style={[styles.cardTitle, { color: T.primary }]}>Card {i + 1}</Text>
                <TouchableOpacity onPress={() => setEditCards(prev => prev.filter((_, j) => j !== i))}>
                  <Trash2 size={14} color="#ef4444" />
                </TouchableOpacity>
              </View>
              <TextInput style={[styles.editInput, { backgroundColor: T.inputBg, borderColor: T.inputBorder, color: T.text }]} value={card.question} onChangeText={v => setEditCards(prev => prev.map((c, j) => j === i ? { ...c, question: v } : c))} placeholder="Question" placeholderTextColor={T.placeholder} multiline />
              <TextInput style={[styles.editInput, { backgroundColor: T.inputBg, borderColor: T.inputBorder, color: T.text }]} value={card.answer} onChangeText={v => setEditCards(prev => prev.map((c, j) => j === i ? { ...c, answer: v } : c))} placeholder="Answer" placeholderTextColor={T.placeholder} multiline />
            </View>
          ))}
          <TouchableOpacity style={[styles.addCardBtn, { borderColor: T.primary }]} onPress={() => setEditCards(prev => [...prev, { question: '', answer: '' }])}>
            <Plus size={14} color={T.primary} /><Text style={{ color: T.primary, fontSize: fontSize.xs, fontWeight: fontWeight.bold }}>Add Card</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.saveAllBtn, { backgroundColor: T.primary }]} onPress={handleSaveFlashcards} disabled={savingCards}>
            {savingCards ? <ActivityIndicator size="small" color="#fff" /> : <><Save size={16} color="#fff" /><Text style={styles.saveBtnText}>Save All Cards</Text></>}
          </TouchableOpacity>
        </>
      ) : (aiContent?.flashcards ?? []).map((card, i) => (
        <View key={i} style={[styles.card, { backgroundColor: T.surface, borderColor: T.border }]}>
          <Text style={[styles.qText, { color: '#6366f1' }]}>Q: {card.question}</Text>
          <Text style={[styles.aText, { color: T.subtext }]}>A: {card.answer}</Text>
        </View>
      ))}
    </ScrollView>
  );

  const renderMindmap = () => {
    const mm = editMM ?? aiContent?.mindmap;
    return (
      <ScrollView contentContainerStyle={styles.tabBody} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.primary} />} showsVerticalScrollIndicator={false}>
        <LangToggle />
        <View style={[styles.topicRow, { backgroundColor: T.inputBg, borderColor: T.inputBorder }]}>
          <TextInput style={[styles.topicInput, { color: T.text }]} value={aiTopic} onChangeText={setAiTopic} placeholder="Specific topic (optional)" placeholderTextColor={T.placeholder} />
        </View>
        <View style={styles.aiActions}>
          <TouchableOpacity style={[styles.aiBtn, { backgroundColor: '#8b5cf6' }]} onPress={handleGenerateMindmap} disabled={generating}>
            {generating ? <ActivityIndicator size="small" color="#fff" /> : <><Cpu size={14} color="#fff" /><Text style={styles.aiBtnText}>Generate</Text></>}
          </TouchableOpacity>
          {mm && (
            <>
              <TouchableOpacity style={[styles.aiBtn, { backgroundColor: '#10b981' }]} onPress={() => setEditMMMode(p => !p)}>
                <Edit2 size={14} color="#fff" /><Text style={styles.aiBtnText}>{editMMMode ? 'Preview' : 'Edit'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.aiBtn, { backgroundColor: aiContent?.isPublished ? '#f59e0b' : '#8b5cf6' }]} onPress={handlePublishToggle} disabled={publishing}>
                {publishing ? <ActivityIndicator size="small" color="#fff" /> : aiContent?.isPublished ? <><EyeOff size={14} color="#fff" /><Text style={styles.aiBtnText}>Unpublish</Text></> : <><Eye size={14} color="#fff" /><Text style={styles.aiBtnText}>Publish</Text></>}
              </TouchableOpacity>
              <TouchableOpacity style={[styles.aiBtn, { backgroundColor: '#ef4444' }]} onPress={handleDeleteMindmap}>
                <Trash2 size={14} color="#fff" /><Text style={styles.aiBtnText}>Delete</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
        {aiLoading ? <LoadingState message="Loading mind map…" /> : !mm ? (
          <EmptyState emoji="🧠" title="No mind map" subtitle="Generate a mind map from lesson content." />
        ) : editMMMode ? (
          <>
            <View style={[styles.card, { backgroundColor: T.surface, borderColor: T.border }]}>
              <Text style={[styles.fieldLabel, { color: T.subtext }]}>Central Node</Text>
              <TextInput style={[styles.editInput, { backgroundColor: T.inputBg, borderColor: T.inputBorder, color: T.text }]} value={editMM?.central ?? ''} onChangeText={v => setEditMM(prev => prev ? { ...prev, central: v } : prev)} placeholder="Central topic" placeholderTextColor={T.placeholder} />
            </View>
            {(editMM?.branches ?? []).map((branch, bi) => (
              <View key={bi} style={[styles.card, { backgroundColor: T.surface, borderColor: T.border }]}>
                <View style={styles.cardTitleRow}>
                  <Text style={[styles.fieldLabel, { color: T.primary }]}>Branch {bi + 1}</Text>
                  <TouchableOpacity onPress={() => setEditMM(prev => prev ? { ...prev, branches: prev.branches.filter((_, i) => i !== bi) } : prev)}>
                    <Trash2 size={14} color="#ef4444" />
                  </TouchableOpacity>
                </View>
                <TextInput style={[styles.editInput, { backgroundColor: T.inputBg, borderColor: T.inputBorder, color: T.text }]} value={branch.label} onChangeText={v => setEditMM(prev => { if (!prev) return prev; const b = [...prev.branches]; b[bi] = { ...b[bi], label: v }; return { ...prev, branches: b }; })} placeholder="Branch label" placeholderTextColor={T.placeholder} />
                {(branch.children ?? []).map((child, ci) => (
                  <View key={ci} style={styles.childRow}>
                    <TextInput style={[styles.childInput, { backgroundColor: T.inputBg, borderColor: T.inputBorder, color: T.text }]} value={child} onChangeText={v => setEditMM(prev => { if (!prev) return prev; const b = [...prev.branches]; const c = [...(b[bi].children ?? [])]; c[ci] = v; b[bi] = { ...b[bi], children: c }; return { ...prev, branches: b }; })} placeholder="Subtopic" placeholderTextColor={T.placeholder} />
                    <TouchableOpacity onPress={() => setEditMM(prev => { if (!prev) return prev; const b = [...prev.branches]; const c = (b[bi].children ?? []).filter((_, i) => i !== ci); b[bi] = { ...b[bi], children: c }; return { ...prev, branches: b }; })}>
                      <X size={14} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                ))}
                <TouchableOpacity onPress={() => setEditMM(prev => { if (!prev) return prev; const b = [...prev.branches]; b[bi] = { ...b[bi], children: [...(b[bi].children ?? []), ''] }; return { ...prev, branches: b }; })} style={styles.addChildBtn}>
                  <Plus size={12} color={T.primary} /><Text style={{ color: T.primary, fontSize: 11 }}>Add subtopic</Text>
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity style={[styles.addCardBtn, { borderColor: '#8b5cf6' }]} onPress={() => setEditMM(prev => prev ? { ...prev, branches: [...prev.branches, { label: '', children: [] }] } : prev)}>
              <Plus size={14} color="#8b5cf6" /><Text style={{ color: '#8b5cf6', fontSize: fontSize.xs, fontWeight: fontWeight.bold }}>Add Branch</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.saveAllBtn, { backgroundColor: '#8b5cf6' }]} onPress={handleSaveMindmap} disabled={savingMM}>
              {savingMM ? <ActivityIndicator size="small" color="#fff" /> : <><Save size={16} color="#fff" /><Text style={styles.saveBtnText}>Save Mind Map</Text></>}
            </TouchableOpacity>
          </>
        ) : (
          <View style={[styles.card, { backgroundColor: T.surface, borderColor: T.border }]}>
            <View style={[styles.centralNode, { backgroundColor: '#8b5cf6' }]}>
              <Text style={styles.centralText}>{mm.central}</Text>
            </View>
            {mm.branches.map((b, i) => (
              <View key={i} style={[styles.branchRow, { borderLeftColor: '#8b5cf6' }]}>
                <Text style={[styles.branchLabel, { color: '#8b5cf6' }]}>• {b.label}</Text>
                {(b.children ?? []).map((c, j) => (
                  <Text key={j} style={[styles.childLabel, { color: T.muted }]}>  – {c}</Text>
                ))}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    );
  };

  const renderQuiz = () => (
    <ScrollView contentContainerStyle={styles.tabBody} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.primary} />} showsVerticalScrollIndicator={false}>
      {/* Lang toggle */}
      <View style={styles.langRow}>
        {(['en', 'ar'] as const).map(l => (
          <TouchableOpacity key={l} style={[styles.langBtn, { backgroundColor: quizLang === l ? T.primary : T.elevated }]} onPress={() => setQuizLang(l)}>
            <Text style={{ color: quizLang === l ? '#fff' : T.muted, fontSize: fontSize.xs, fontWeight: fontWeight.bold }}>{l === 'en' ? 'English' : 'عربي'}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {quizLoading ? <LoadingState message="Loading quiz…" /> : !quiz ? (
        <>
          <EmptyState emoji="❓" title="No quiz yet" subtitle="Create a quiz for this lesson." />
          <TouchableOpacity style={[styles.saveAllBtn, { backgroundColor: T.primary }]} onPress={handleCreateQuiz}>
            <Plus size={16} color="#fff" /><Text style={styles.saveBtnText}>Create Quiz</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <View style={[styles.card, { backgroundColor: T.surface, borderColor: T.border }]}>
            <View style={styles.cardTitleRow}>
              <Text style={[styles.cardTitle, { color: T.text }]}>{quiz.title}</Text>
              <View style={[styles.pubBadge, { backgroundColor: quiz.isPublished ? 'rgba(16,185,129,0.12)' : T.elevated }]}>
                <Text style={{ color: quiz.isPublished ? '#10b981' : T.muted, fontSize: 10, fontWeight: '700' }}>
                  {quiz.isPublished ? 'PUBLISHED' : 'DRAFT'}
                </Text>
              </View>
            </View>
            <Text style={[styles.sub, { color: T.muted }]}>Difficulty: {quiz.difficulty ?? 'MEDIUM'} · Passing: {quiz.passingScore ?? 60}%</Text>
            <View style={styles.quizActRow}>
              <TouchableOpacity style={[styles.aiBtn, { backgroundColor: '#6366f1' }]} onPress={() => setGenModal(true)}>
                <Cpu size={14} color="#fff" /><Text style={styles.aiBtnText}>AI Generate</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.aiBtn, { backgroundColor: '#10b981' }]} onPress={() => setAddQModal(true)}>
                <Plus size={14} color="#fff" /><Text style={styles.aiBtnText}>Add Question</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.aiBtn, { backgroundColor: quiz.isPublished ? '#f59e0b' : '#8b5cf6' }]} onPress={handleTogglePublishQuiz}>
                {quiz.isPublished ? <><EyeOff size={14} color="#fff" /><Text style={styles.aiBtnText}>Unpublish</Text></> : <><Eye size={14} color="#fff" /><Text style={styles.aiBtnText}>Publish</Text></>}
              </TouchableOpacity>
              <TouchableOpacity style={[styles.aiBtn, { backgroundColor: '#ef4444' }]} onPress={handleDeleteQuiz}>
                <Trash2 size={14} color="#fff" /><Text style={styles.aiBtnText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
          {/* Questions */}
          {(quiz.questions ?? []).map((q, i) => (
            <View key={q.id ?? i} style={[styles.card, { backgroundColor: T.surface, borderColor: T.border }]}>
              <View style={styles.cardTitleRow}>
                <View style={[styles.qTypePill, { backgroundColor: q.type === 'MULTIPLE_CHOICE' ? 'rgba(99,102,241,0.1)' : q.type === 'TRUE_FALSE' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)' }]}>
                  <Text style={{ color: q.type === 'MULTIPLE_CHOICE' ? '#6366f1' : q.type === 'TRUE_FALSE' ? '#10b981' : '#f59e0b', fontSize: 10, fontWeight: '700' }}>{q.type}</Text>
                </View>
                <TouchableOpacity onPress={() => q.id && handleDeleteQuestion(q.id)}><Trash2 size={14} color="#ef4444" /></TouchableOpacity>
              </View>
              <Text style={[styles.qText, { color: T.text }]}>{i + 1}. {q.question}</Text>
              {q.type === 'MULTIPLE_CHOICE' && (q.options ?? []).map((o, oi) => (
                <Text key={oi} style={[styles.optionText, { color: oi === Number(q.correctAnswer) ? '#10b981' : T.subtext }]}>
                  {oi === Number(q.correctAnswer) ? '✓ ' : '○ '}{o}
                </Text>
              ))}
              {q.type === 'TRUE_FALSE' && (
                <Text style={[styles.optionText, { color: '#10b981' }]}>Answer: {String(q.correctAnswer)}</Text>
              )}
              {q.type === 'SHORT_ANSWER' && !!q.expectedAnswer && (
                <Text style={[styles.optionText, { color: T.muted }]}>Expected: {q.expectedAnswer}</Text>
              )}
              {!!q.explanation && (
                <Text style={[styles.optionText, { color: T.muted }]}>💡 {q.explanation}</Text>
              )}
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );

  const renderSlides = () => (
    <ScrollView contentContainerStyle={styles.tabBody} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.primary} />} showsVerticalScrollIndicator={false}>
      <View style={styles.aiActions}>
        <TouchableOpacity style={[styles.aiBtn, { backgroundColor: '#f59e0b' }]} onPress={() => setSlidesModal(true)}>
          <Cpu size={14} color="#fff" /><Text style={styles.aiBtnText}>Generate Slides</Text>
        </TouchableOpacity>
        {slides && (
          <TouchableOpacity style={[styles.aiBtn, { backgroundColor: '#ef4444' }]} onPress={handleDeleteSlides}>
            <Trash2 size={14} color="#fff" /><Text style={styles.aiBtnText}>Delete</Text>
          </TouchableOpacity>
        )}
      </View>
      {!slides ? (
        <EmptyState emoji="📊" title="No slides" subtitle="Generate presentation slides from this lesson." />
      ) : (
        <>
          <View style={[styles.card, { backgroundColor: T.surface, borderColor: T.border }]}>
            <Text style={[styles.cardTitle, { color: T.text }]}>{slides.title ?? 'Slides'}</Text>
            <Text style={[styles.sub, { color: T.muted }]}>{slides.slides?.length ?? 0} slides · Theme: {slides.theme ?? '—'} · Lang: {slides.lang ?? '—'}</Text>
          </View>
          {(slides.slides ?? []).map((s, i) => (
            <View key={i} style={[styles.slideCard, { backgroundColor: T.surface, borderColor: T.border }]}>
              <View style={[styles.slideNum, { backgroundColor: T.elevated }]}>
                <Text style={[styles.slideNumText, { color: T.muted }]}>{i + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                {!!s.title && <Text style={[styles.slideTitle, { color: T.text }]}>{s.title}</Text>}
                {!!s.content && <Text style={[styles.slideContent, { color: T.subtext }]} numberOfLines={3}>{s.content}</Text>}
                {(s.bulletPoints ?? []).map((bp, j) => (
                  <Text key={j} style={[styles.bulletPoint, { color: T.subtext }]}>• {bp}</Text>
                ))}
              </View>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );

  const tabContent = () => {
    switch (activeTab) {
      case 'overview':    return renderOverview();
      case 'attachments': return renderAttachments();
      case 'flashcards':  return renderFlashcards();
      case 'mindmap':     return renderMindmap();
      case 'quiz':        return renderQuiz();
      case 'slides':      return renderSlides();
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: T.background }]}>
      {/* Header */}
      <LinearGradient colors={['#4f46e5', '#1e1b4b']} style={[styles.header, { paddingTop: insets.top + spacing[2] }]}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{lessonTitle}</Text>
      </LinearGradient>

      {/* Tab bar */}
      <View style={[styles.tabBar, { backgroundColor: T.surface, borderBottomColor: T.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBarContent}>
          {TABS.map(({ key, label, icon: Icon }) => {
            const isActive = activeTab === key;
            return (
              <TouchableOpacity key={key} style={styles.tabItem} onPress={() => setActiveTab(key)}>
                <Icon size={14} color={isActive ? T.primary : T.muted} />
                <Text style={[styles.tabLabel, { color: isActive ? T.primary : T.muted }]}>{label}</Text>
                {isActive && <View style={[styles.tabIndicator, { backgroundColor: T.primary }]} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Content */}
      <View style={styles.content}>{tabContent()}</View>

      {/* AI Gen Quiz Modal */}
      <Modal visible={genModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modal, { backgroundColor: T.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: T.text }]}>Generate Quiz Questions</Text>
            <TouchableOpacity onPress={() => setGenModal(false)}><X size={22} color={T.muted} /></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody}>
            {[
              { key: 'numMCQ', label: 'MCQ Count (0–15)', kbType: 'number-pad' },
              { key: 'numTrueFalse', label: 'True/False Count (0–10)', kbType: 'number-pad' },
              { key: 'numShortAnswer', label: 'Short Answer Count (0–10)', kbType: 'number-pad' },
              { key: 'difficulty', label: 'Difficulty (EASY/MEDIUM/HARD)' },
              { key: 'notes', label: 'Additional Notes (optional)', multiline: true },
            ].map(({ key, label, kbType, multiline }: { key: string; label: string; kbType?: string; multiline?: boolean }) => (
              <View key={key} style={styles.field}>
                <Text style={[styles.fieldLabel, { color: T.subtext }]}>{label}</Text>
                <TextInput style={[styles.input, { backgroundColor: T.inputBg, borderColor: T.inputBorder, color: T.text }, multiline && { height: 60, textAlignVertical: 'top' }]} value={(genForm as Record<string, string>)[key]} onChangeText={v => setGenForm(prev => ({ ...prev, [key]: v }))} placeholderTextColor={T.placeholder} keyboardType={kbType as never ?? 'default'} multiline={multiline} />
              </View>
            ))}
            <View style={styles.langRow}>
              {['en', 'ar'].map(l => (
                <TouchableOpacity key={l} style={[styles.langBtn, { backgroundColor: genForm.lang === l ? T.primary : T.elevated }]} onPress={() => setGenForm(prev => ({ ...prev, lang: l }))}>
                  <Text style={{ color: genForm.lang === l ? '#fff' : T.muted, fontSize: fontSize.xs, fontWeight: fontWeight.bold }}>{l === 'en' ? 'English' : 'عربي'}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          <View style={[styles.modalFooter, { borderTopColor: T.border }]}>
            <TouchableOpacity style={[styles.footerBtn, { backgroundColor: T.elevated }]} onPress={() => setGenModal(false)}>
              <Text style={[styles.footerBtnText, { color: T.muted }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.footerBtn, { backgroundColor: '#6366f1' }]} onPress={handleGenQuestions} disabled={generating2}>
              {generating2 ? <ActivityIndicator size="small" color="#fff" /> : <><Cpu size={16} color="#fff" /><Text style={[styles.footerBtnText, { color: '#fff' }]}>Generate</Text></>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Add Question Modal */}
      <Modal visible={addQModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modal, { backgroundColor: T.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: T.text }]}>Add Question</Text>
            <TouchableOpacity onPress={() => setAddQModal(false)}><X size={22} color={T.muted} /></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody}>
            {/* Question type */}
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: T.subtext }]}>Question Type</Text>
              <View style={styles.qTypeRow}>
                {(['MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER'] as const).map(t => (
                  <TouchableOpacity key={t} style={[styles.qTypeBtn, { borderColor: qForm.type === t ? T.primary : T.inputBorder, backgroundColor: qForm.type === t ? T.primary : T.inputBg }]} onPress={() => setQForm(prev => ({ ...prev, type: t }))}>
                    <Text style={{ color: qForm.type === t ? '#fff' : T.muted, fontSize: 10, fontWeight: '700' }}>{t.replace('_', ' ')}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: T.subtext }]}>Question *</Text>
              <TextInput style={[styles.input, { backgroundColor: T.inputBg, borderColor: T.inputBorder, color: T.text, height: 70, textAlignVertical: 'top' }]} value={qForm.question} onChangeText={v => setQForm(prev => ({ ...prev, question: v }))} placeholder="Question text" placeholderTextColor={T.placeholder} multiline />
            </View>
            {qForm.type === 'MULTIPLE_CHOICE' && (
              <>
                {qForm.options.map((opt, i) => (
                  <View key={i} style={styles.field}>
                    <Text style={[styles.fieldLabel, { color: T.subtext }]}>Option {i + 1}{qForm.correctAnswer === String(i) ? ' ✓' : ''}</Text>
                    <TextInput style={[styles.input, { backgroundColor: T.inputBg, borderColor: T.inputBorder, color: T.text }]} value={opt} onChangeText={v => setQForm(prev => ({ ...prev, options: prev.options.map((o, j) => j === i ? v : o) }))} placeholderTextColor={T.placeholder} />
                  </View>
                ))}
                <View style={styles.field}>
                  <Text style={[styles.fieldLabel, { color: T.subtext }]}>Correct Option (0–3)</Text>
                  <TextInput style={[styles.input, { backgroundColor: T.inputBg, borderColor: T.inputBorder, color: T.text }]} value={qForm.correctAnswer} onChangeText={v => setQForm(prev => ({ ...prev, correctAnswer: v }))} keyboardType="number-pad" placeholderTextColor={T.placeholder} />
                </View>
              </>
            )}
            {qForm.type === 'TRUE_FALSE' && (
              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: T.subtext }]}>Answer</Text>
                <View style={styles.qTypeRow}>
                  {['true', 'false'].map(v => (
                    <TouchableOpacity key={v} style={[styles.qTypeBtn, { borderColor: qForm.correctAnswer === v ? T.primary : T.inputBorder, backgroundColor: qForm.correctAnswer === v ? T.primary : T.inputBg }]} onPress={() => setQForm(prev => ({ ...prev, correctAnswer: v }))}>
                      <Text style={{ color: qForm.correctAnswer === v ? '#fff' : T.muted, fontSize: fontSize.sm, fontWeight: fontWeight.bold }}>{v}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
            {qForm.type === 'SHORT_ANSWER' && (
              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: T.subtext }]}>Expected Answer</Text>
                <TextInput style={[styles.input, { backgroundColor: T.inputBg, borderColor: T.inputBorder, color: T.text }]} value={qForm.expectedAnswer} onChangeText={v => setQForm(prev => ({ ...prev, expectedAnswer: v }))} placeholderTextColor={T.placeholder} />
              </View>
            )}
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: T.subtext }]}>Explanation (optional)</Text>
              <TextInput style={[styles.input, { backgroundColor: T.inputBg, borderColor: T.inputBorder, color: T.text }]} value={qForm.explanation} onChangeText={v => setQForm(prev => ({ ...prev, explanation: v }))} placeholderTextColor={T.placeholder} />
            </View>
          </ScrollView>
          <View style={[styles.modalFooter, { borderTopColor: T.border }]}>
            <TouchableOpacity style={[styles.footerBtn, { backgroundColor: T.elevated }]} onPress={() => setAddQModal(false)}>
              <Text style={[styles.footerBtnText, { color: T.muted }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.footerBtn, { backgroundColor: T.primary }]} onPress={handleAddQuestion} disabled={savingQ}>
              {savingQ ? <ActivityIndicator size="small" color="#fff" /> : <><Save size={16} color="#fff" /><Text style={[styles.footerBtnText, { color: '#fff' }]}>Add</Text></>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Slides Generate Modal */}
      <Modal visible={slidesModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modal, { backgroundColor: T.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: T.text }]}>Generate Slides</Text>
            <TouchableOpacity onPress={() => setSlidesModal(false)}><X size={22} color={T.muted} /></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody}>
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: T.subtext }]}>Language</Text>
              <View style={styles.qTypeRow}>
                {[{ v: 'en', l: 'English' }, { v: 'ar', l: 'عربي' }].map(({ v, l }) => (
                  <TouchableOpacity key={v} style={[styles.qTypeBtn, { borderColor: slideForm.lang === v ? T.primary : T.inputBorder, backgroundColor: slideForm.lang === v ? T.primary : T.inputBg }]} onPress={() => setSlideForm(prev => ({ ...prev, lang: v }))}>
                    <Text style={{ color: slideForm.lang === v ? '#fff' : T.muted, fontSize: fontSize.xs, fontWeight: fontWeight.bold }}>{l}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: T.subtext }]}>Number of Slides</Text>
              <View style={styles.qTypeRow}>
                {['5', '10', '15'].map(n => (
                  <TouchableOpacity key={n} style={[styles.qTypeBtn, { borderColor: slideForm.numSlides === n ? T.primary : T.inputBorder, backgroundColor: slideForm.numSlides === n ? T.primary : T.inputBg }]} onPress={() => setSlideForm(prev => ({ ...prev, numSlides: n }))}>
                    <Text style={{ color: slideForm.numSlides === n ? '#fff' : T.muted, fontSize: fontSize.sm, fontWeight: fontWeight.bold }}>{n}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: T.subtext }]}>Theme</Text>
              <View style={[styles.qTypeRow, { flexWrap: 'wrap' }]}>
                {['minimalist', 'darkExec', 'geometric', 'gradientModern', 'magazine'].map(th => (
                  <TouchableOpacity key={th} style={[styles.qTypeBtn, { borderColor: slideForm.theme === th ? T.primary : T.inputBorder, backgroundColor: slideForm.theme === th ? T.primary : T.inputBg, marginBottom: spacing[2] }]} onPress={() => setSlideForm(prev => ({ ...prev, theme: th }))}>
                    <Text style={{ color: slideForm.theme === th ? '#fff' : T.muted, fontSize: 10, fontWeight: '700' }}>{th}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: T.subtext }]}>Custom Topic (optional)</Text>
              <TextInput style={[styles.input, { backgroundColor: T.inputBg, borderColor: T.inputBorder, color: T.text }]} value={slideForm.topic} onChangeText={v => setSlideForm(prev => ({ ...prev, topic: v }))} placeholder="Override lesson topic" placeholderTextColor={T.placeholder} />
            </View>
          </ScrollView>
          <View style={[styles.modalFooter, { borderTopColor: T.border }]}>
            <TouchableOpacity style={[styles.footerBtn, { backgroundColor: T.elevated }]} onPress={() => setSlidesModal(false)}>
              <Text style={[styles.footerBtnText, { color: T.muted }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.footerBtn, { backgroundColor: '#f59e0b' }]} onPress={handleGenerateSlides} disabled={genSlides}>
              {genSlides ? <ActivityIndicator size="small" color="#fff" /> : <><Cpu size={16} color="#fff" /><Text style={[styles.footerBtnText, { color: '#fff' }]}>Generate</Text></>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root:          { flex: 1 },
  header:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing[4], paddingBottom: spacing[3], gap: spacing[3] },
  backBtn:       { padding: spacing[1] },
  headerTitle:   { flex: 1, color: '#fff', fontSize: fontSize.sm, fontWeight: fontWeight.extrabold },
  tabBar:        { borderBottomWidth: 1 },
  tabBarContent: { paddingHorizontal: spacing[2] },
  tabItem:       { paddingHorizontal: spacing[3], paddingVertical: spacing[3], alignItems: 'center', gap: 4, minWidth: 72, position: 'relative' },
  tabLabel:      { fontSize: 10, fontWeight: '700' },
  tabIndicator:  { position: 'absolute', bottom: 0, left: spacing[2], right: spacing[2], height: 2.5, borderRadius: 99 },
  content:       { flex: 1 },
  tabBody:       { padding: spacing[4], gap: spacing[4], paddingBottom: spacing[10] },
  card:          { borderRadius: radius['2xl'], borderWidth: 1, padding: spacing[4], gap: spacing[3] },
  cardTitleRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing[2] },
  cardTitle:     { fontSize: fontSize.sm, fontWeight: fontWeight.extrabold },
  lessonTitleText:{ fontSize: fontSize.lg, fontWeight: fontWeight.extrabold },
  commentRow:    { paddingTop: spacing[3], borderTopWidth: 1, gap: spacing[1] },
  commentAuthor: { fontSize: fontSize.xs, fontWeight: fontWeight.extrabold },
  commentContent:{ fontSize: fontSize.sm, lineHeight: 18 },
  commentDate:   { fontSize: fontSize.xs },
  emptyText:     { fontSize: fontSize.sm, textAlign: 'center', padding: spacing[4] },
  ragBanner:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing[3], borderRadius: radius.lg, borderWidth: 1 },
  uploadArea:    { borderRadius: radius.xl, borderWidth: 1, borderStyle: 'dashed', padding: spacing[6], alignItems: 'center', gap: spacing[2] },
  uploadText:    { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  uploadSub:     { fontSize: fontSize.xs },
  attRow:        { flexDirection: 'row', alignItems: 'center', gap: spacing[3], padding: spacing[3], borderRadius: radius.xl, borderWidth: 1 },
  attIcon:       { width: 38, height: 38, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  attExt:        { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  attName:       { flex: 1, fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  delBtn:        { padding: spacing[2] },
  langRow:       { flexDirection: 'row', gap: spacing[2] },
  langBtn:       { paddingHorizontal: spacing[4], paddingVertical: spacing[2], borderRadius: 999 },
  topicRow:      { borderRadius: radius.lg, borderWidth: 1, paddingHorizontal: spacing[3] },
  topicInput:    { paddingVertical: spacing[3], fontSize: fontSize.sm },
  aiActions:     { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  aiBtn:         { flexDirection: 'row', alignItems: 'center', gap: spacing[1], paddingHorizontal: spacing[3], paddingVertical: spacing[2], borderRadius: radius.xl },
  aiBtnText:     { color: '#fff', fontSize: 11, fontWeight: '700' },
  editInput:     { borderRadius: radius.lg, borderWidth: 1, paddingHorizontal: spacing[3], paddingVertical: spacing[2], fontSize: fontSize.sm },
  addCardBtn:    { flexDirection: 'row', alignItems: 'center', gap: spacing[2], paddingVertical: spacing[3], borderRadius: radius.xl, borderWidth: 1, borderStyle: 'dashed', justifyContent: 'center' },
  saveAllBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[2], paddingVertical: spacing[4], borderRadius: radius.xl },
  saveBtnText:   { color: '#fff', fontSize: fontSize.sm, fontWeight: fontWeight.extrabold },
  qText:         { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, lineHeight: 20 },
  aText:         { fontSize: fontSize.sm, lineHeight: 18 },
  centralNode:   { padding: spacing[4], borderRadius: radius.xl, alignItems: 'center', marginBottom: spacing[3] },
  centralText:   { color: '#fff', fontSize: fontSize.sm, fontWeight: fontWeight.extrabold },
  branchRow:     { borderLeftWidth: 3, paddingLeft: spacing[3], marginBottom: spacing[2] },
  branchLabel:   { fontSize: fontSize.sm, fontWeight: fontWeight.bold, marginBottom: spacing[1] },
  childLabel:    { fontSize: fontSize.xs, marginBottom: 2 },
  childRow:      { flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginTop: spacing[1] },
  childInput:    { flex: 1, borderRadius: radius.lg, borderWidth: 1, paddingHorizontal: spacing[3], paddingVertical: spacing[2], fontSize: fontSize.sm },
  addChildBtn:   { flexDirection: 'row', alignItems: 'center', gap: spacing[1], marginTop: spacing[2] },
  quizActRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  qTypePill:     { paddingHorizontal: spacing[2], paddingVertical: 2, borderRadius: 999 },
  optionText:    { fontSize: fontSize.xs, lineHeight: 18 },
  pubBadge:      { paddingHorizontal: spacing[2], paddingVertical: 2, borderRadius: 999 },
  sub:           { fontSize: fontSize.xs },
  qTypeRow:      { flexDirection: 'row', gap: spacing[2] },
  qTypeBtn:      { flex: 1, paddingVertical: spacing[2], borderRadius: radius.lg, borderWidth: 1, alignItems: 'center' },
  slideCard:     { flexDirection: 'row', gap: spacing[3], borderRadius: radius.xl, borderWidth: 1, padding: spacing[3] },
  slideNum:      { width: 32, height: 32, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  slideNumText:  { fontSize: fontSize.xs, fontWeight: fontWeight.extrabold },
  slideTitle:    { fontSize: fontSize.sm, fontWeight: fontWeight.bold, marginBottom: 4 },
  slideContent:  { fontSize: fontSize.xs, lineHeight: 17 },
  bulletPoint:   { fontSize: fontSize.xs, lineHeight: 17 },
  modal:         { flex: 1 },
  modalHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing[5], paddingTop: spacing[6] },
  modalTitle:    { fontSize: fontSize.xl, fontWeight: fontWeight.extrabold },
  modalBody:     { padding: spacing[5], gap: spacing[4], paddingBottom: spacing[10] },
  field:         { gap: spacing[1] },
  fieldLabel:    { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  input:         { borderRadius: radius.lg, borderWidth: 1, paddingHorizontal: spacing[4], paddingVertical: spacing[3], fontSize: fontSize.sm },
  modalFooter:   { flexDirection: 'row', gap: spacing[3], padding: spacing[5], borderTopWidth: 1 },
  footerBtn:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[2], paddingVertical: spacing[3], borderRadius: radius.lg },
  footerBtnText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
});
