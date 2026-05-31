import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Platform, LayoutAnimation, UIManager,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowLeft, Bot, ChevronDown, CheckCircle2, Circle } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../shared/hooks/useTheme';
import { spacing, radius, fontSize, fontWeight } from '../../../shared/theme';
import { LoadingState, ErrorState } from '../../../shared/components';
import {
  fetchSubjectLessons, fetchLessonAiContent,
  fetchStudentLessonQuiz, updateStudentLessonProgress,
} from '../../student/services/studentService';
import type { Lesson, LessonAiContent } from '../../../types/student';
import type { StudentStackParamList } from '../../../types/navigation';

import { VideoPlayer }      from '../components/VideoPlayer';
import type { NextLessonInfo } from '../components/VideoPlayer';
import { useSoundEffect }  from '../../../shared/hooks/useSoundEffect';
import { AttachmentsTab }   from '../components/AttachmentsTab';
import { CommentsTab }      from '../components/CommentsTab';
import { FlashcardsTab }    from '../components/FlashcardsTab';
import { QuizTab }          from '../components/QuizTab';
import { MindMapTab }       from '../components/MindMapTab';
import { MindMapModal }     from '../components/MindMapModal';
import { AIAssistantModal } from '../components/AIAssistantModal';

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

type Route = RouteProp<StudentStackParamList, 'Lesson'>;
type Nav   = NativeStackNavigationProp<StudentStackParamList>;
type TabKey = 'attachments' | 'comments' | 'flashcards' | 'mindmap' | 'quiz';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'attachments', label: '📎 Files'      },
  { key: 'comments',    label: '💬 Comments'   },
  { key: 'flashcards',  label: '🃏 Flashcards' },
  { key: 'mindmap',     label: '🗺️ Mind Map'  },
  { key: 'quiz',        label: '📝 Quiz'       },
];

export function LessonScreen() {
  const { T }      = useTheme();
  const nav        = useNavigation<Nav>();
  const { params } = useRoute<Route>();
  const insets     = useSafeAreaInsets();

  const [lesson,     setLesson]     = useState<Lesson | null>(null);
  const [allLessons, setAllLessons] = useState<Lesson[]>([]);
  const [aiContent,  setAiContent]  = useState<LessonAiContent | null>(null);
  const [quizData,   setQuizData]   = useState<unknown>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('attachments');
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [showAI,       setShowAI]       = useState(false);
  const [showMindMap,  setShowMindMap]  = useState(false);

  // ── auto-play when arriving from "Up Next" auto-navigation ────────────────
  const autoPlay = params.autoPlay ?? false;

  // ── paper flip sound for MindMap ──────────────────────────────────────────
  // Free paper-flip sound (Mixkit, royalty-free). Preloaded on mount.
  const playPageFlip = useSoundEffect({
    uri: 'https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3',
  });

  const load = useCallback(async () => {
    try {
      setError('');
      const lessons = await fetchSubjectLessons(params.subjectId);
      setAllLessons(lessons);
      setLesson(lessons.find((l) => l.id === params.lessonId) ?? null);
      updateStudentLessonProgress(params.lessonId, false).catch(() => {});

      // Load AI content + quiz independently — one failure won't block the other
      const [aiResult, quizResult] = await Promise.allSettled([
        fetchLessonAiContent(params.lessonId),
        fetchStudentLessonQuiz(params.lessonId),
      ]);
      if (aiResult.status   === 'fulfilled') setAiContent(aiResult.value);
      if (quizResult.status === 'fulfilled') setQuizData(quizResult.value);
    } catch {
      setError('Failed to load lesson.');
    } finally {
      setLoading(false);
    }
  }, [params.lessonId, params.subjectId]);

  useEffect(() => { load(); }, [load]);

  const handleToggleLesson = useCallback(async (target: Lesson) => {
    const next = !(target.isCompleted ?? false);
    setAllLessons((prev) => prev.map((l) => l.id === target.id ? { ...l, isCompleted: next } : l));
    if (target.id === params.lessonId) {
      setLesson((prev) => prev ? { ...prev, isCompleted: next } : prev);
    }
    try {
      await updateStudentLessonProgress(target.id, next);
    } catch {
      setAllLessons((prev) => prev.map((l) => l.id === target.id ? { ...l, isCompleted: !next } : l));
      if (target.id === params.lessonId) {
        setLesson((prev) => prev ? { ...prev, isCompleted: !next } : prev);
      }
    }
  }, [params.lessonId]);

  // ── Next lesson (for "Up next" overlay) ────────────────────────────────────
  const nextLessonInfo = useMemo<NextLessonInfo | null>(() => {
    const idx = allLessons.findIndex((l) => l.id === params.lessonId);
    if (idx < 0 || idx >= allLessons.length - 1) return null;
    const next = allLessons[idx + 1];
    return {
      id:          next.id,
      title:       next.title || next.name,
      subjectId:   params.subjectId,
      courseId:    params.courseId,
      lessonIndex: idx + 2,            // 1-based: current is idx+1, next is idx+2
    };
  }, [allLessons, params.lessonId, params.subjectId, params.courseId]);

  const handleNextLesson = useCallback(() => {
    if (!nextLessonInfo) return;

    // ── Mark current lesson as completed (fire-and-forget) ────────────────
    updateStudentLessonProgress(params.lessonId, true).catch(() => {});
    // Update local state so LessonsDropdown reflects completion immediately
    setAllLessons((prev) =>
      prev.map((l) => l.id === params.lessonId ? { ...l, isCompleted: true } : l),
    );
    setLesson((prev) => prev ? { ...prev, isCompleted: true } : prev);

    // ── Navigate to next lesson and auto-start playback ────────────────────
    nav.replace('Lesson', {
      lessonId:    nextLessonInfo.id,
      lessonTitle: nextLessonInfo.title,
      subjectId:   nextLessonInfo.subjectId,
      courseId:    nextLessonInfo.courseId,
      autoPlay:    true,
    });
  }, [nextLessonInfo, nav, params.lessonId]);

  if (loading) return <LoadingState message="Loading lesson…" />;
  if (error)   return <ErrorState  message={error} onRetry={load} />;

  const headerTop = Platform.OS === 'android' ? insets.top + spacing[2] : insets.top + spacing[1];

  return (
    <View style={[S.root, { backgroundColor: T.background }]}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <View style={[S.header, {
        backgroundColor:   T.surface,
        borderBottomColor: T.border,
        paddingTop:        headerTop,
      }]}>
        <TouchableOpacity onPress={() => nav.goBack()} style={S.backBtn} hitSlop={8}>
          <ArrowLeft size={20} color={T.primary} />
        </TouchableOpacity>
        <Text style={[S.headerTitle, { color: T.text }]} numberOfLines={1}>
          {params.lessonTitle}
        </Text>
      </View>

      {/* ── Scrollable content ─────────────────────────────────────────── */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <VideoPlayer
          videoUrl={lesson?.videoUrl}
          nextLesson={nextLessonInfo}
          onNextLesson={handleNextLesson}
          autoPlay={autoPlay}
        />

        {lesson && (
          <View style={[S.infoBox, { backgroundColor: T.surface, borderColor: T.border }]}>
            <Text style={[S.lessonTitle, { color: T.text }]}>{lesson.title}</Text>
            {lesson.description ? (
              <Text style={[S.lessonDesc, { color: T.muted }]}>{lesson.description}</Text>
            ) : null}
          </View>
        )}

        {/* ── Tab bar ─────────────────────────────────────────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={S.tabsScroll}
          contentContainerStyle={S.tabsRow}
        >
          {TABS.map((tab) => {
            const active = tab.key === activeTab;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                style={[
                  S.tabBtn,
                  active
                    ? { backgroundColor: T.primary }
                    : { backgroundColor: T.elevated, borderColor: T.border, borderWidth: 1 },
                ]}
              >
                <Text style={[S.tabLabel, { color: active ? '#fff' : T.muted }]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── Lessons dropdown ────────────────────────────────────────── */}
        {allLessons.length > 1 && (
          <LessonsDropdown
            lessons={allLessons}
            currentId={params.lessonId}
            subjectId={params.subjectId}
            courseId={params.courseId}
            nav={nav}
            T={T}
            onToggle={handleToggleLesson}
          />
        )}

        {/* ── Tab content ─────────────────────────────────────────────── */}
        <View style={S.tabContent}>
          {activeTab === 'attachments' && (
            <AttachmentsTab attachments={lesson?.attachments ?? []} />
          )}
          {activeTab === 'comments' && (
            <CommentsTab lessonId={params.lessonId} />
          )}
          {activeTab === 'flashcards' && (
            <FlashcardsTab
              cards={aiContent?.flashcards}
              published={aiContent?.flashcardsPublished ?? aiContent?.published}
              lessonId={params.lessonId}
            />
          )}
          {activeTab === 'mindmap' && (
            <MindMapTab
              mindmap={aiContent?.mindmap}
              published={aiContent?.mindmapPublished ?? aiContent?.published}
              onOpen={() => { playPageFlip(); setShowMindMap(true); }}
            />
          )}
          {activeTab === 'quiz' && (
            <QuizTab quizData={quizData as never} lessonId={params.lessonId} />
          )}
        </View>
      </ScrollView>

      {/* ── AI FAB ─────────────────────────────────────────────────────── */}
      <TouchableOpacity
        onPress={() => setShowAI(true)}
        style={[S.fab, { bottom: insets.bottom + spacing[5] }]}
        activeOpacity={0.85}
      >
        <Bot size={22} color="#fff" />
      </TouchableOpacity>

      <MindMapModal
        visible={showMindMap}
        onClose={() => setShowMindMap(false)}
        mindmap={aiContent?.mindmap}
        title={lesson?.title}
      />

      <AIAssistantModal
        visible={showAI}
        onClose={() => setShowAI(false)}
        lessonId={params.lessonId}
        subjectId={params.subjectId}
        courseId={params.courseId}
      />
    </View>
  );
}

// ── Lessons Dropdown ─────────────────────────────────────────────────────────
function LessonsDropdown({
  lessons, currentId, subjectId, courseId, nav, T, onToggle,
}: {
  lessons:   Lesson[];
  currentId: number;
  subjectId: number;
  courseId:  number;
  nav:       ReturnType<typeof useNavigation<NativeStackNavigationProp<StudentStackParamList>>>;
  T:         ReturnType<typeof useTheme>['T'];
  onToggle:  (l: Lesson) => void;
}) {
  const [open, setOpen] = useState(false);
  const completed = lessons.filter((l) => l.isCompleted).length;

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((v) => !v);
  };

  return (
    <View style={[S.ddWrap, { backgroundColor: T.surface, borderColor: T.border }]}>
      {/* Header row */}
      <TouchableOpacity onPress={toggle} style={S.ddHeader} activeOpacity={0.7}>
        <Text style={[S.ddTitle, { color: T.text }]}>📚 All Lessons</Text>
        <Text style={[S.ddCount, { color: T.muted }]}>{completed}/{lessons.length} done</Text>
        <ChevronDown
          size={16}
          color={T.muted}
          style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}
        />
      </TouchableOpacity>

      {/* Expandable list */}
      {open && (
        <ScrollView
          style={S.ddList}
          scrollEnabled
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
        >
          {lessons.map((lesson, idx) => {
            const isCurrent = lesson.id === currentId;
            return (
              <View
                key={lesson.id}
                style={[
                  S.ddItem,
                  isCurrent && { backgroundColor: 'rgba(99,102,241,0.08)' },
                  idx > 0 && { borderTopWidth: 1, borderTopColor: T.border },
                ]}
              >
                {/* Checkbox */}
                <TouchableOpacity onPress={() => onToggle(lesson)} hitSlop={10} style={S.ddCheckBtn}>
                  {lesson.isCompleted
                    ? <CheckCircle2 size={18} color="#34d399" />
                    : <Circle size={18} color={T.muted} />}
                </TouchableOpacity>

                {/* Navigate area */}
                <TouchableOpacity
                  onPress={() => nav.navigate('Lesson', {
                    lessonId:    lesson.id,
                    lessonTitle: lesson.title,
                    subjectId,
                    courseId,
                  })}
                  style={S.ddNavArea}
                  activeOpacity={0.7}
                >
                  <View style={S.ddItemBody}>
                    <Text
                      style={[S.ddItemTitle, { color: isCurrent ? T.primary : T.text }]}
                      numberOfLines={1}
                    >
                      {lesson.title}
                    </Text>
                    <Text style={[S.ddItemSub, { color: T.muted }]}>Lesson {idx + 1}</Text>
                  </View>
                  {isCurrent && (
                    <View style={[S.ddBadge, { backgroundColor: T.primary }]}>
                      <Text style={S.ddBadgeText}>NOW</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  root: { flex: 1 },

  header: {
    flexDirection:    'row',
    alignItems:       'center',
    paddingHorizontal: spacing[4],
    paddingBottom:     spacing[3],
    borderBottomWidth: 1,
    gap: spacing[3],
  },
  backBtn:     { padding: spacing[1] },
  headerTitle: { flex: 1, fontSize: fontSize.base, fontWeight: fontWeight.semibold },

  infoBox: {
    margin:        spacing[4],
    padding:       spacing[4],
    borderRadius:  radius.xl,
    borderWidth:   1,
  },
  lessonTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, marginBottom: spacing[1] },
  lessonDesc:  { fontSize: fontSize.sm, lineHeight: 20 },

  tabsScroll: { paddingLeft: spacing[4] },
  tabsRow:    {
    flexDirection: 'row',
    gap:           spacing[2],
    paddingRight:  spacing[4],
    paddingVertical: spacing[3],
  },
  tabBtn:  { borderRadius: radius.full, paddingHorizontal: spacing[4], paddingVertical: spacing[2] },
  tabLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },

  tabContent: { padding: spacing[4], paddingBottom: spacing[6] },

  // Lessons dropdown
  ddWrap:      { marginHorizontal: spacing[4], marginBottom: spacing[2], borderRadius: radius.xl, borderWidth: 1, overflow: 'hidden' },
  ddHeader:    { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing[3], paddingHorizontal: spacing[4], gap: spacing[2] },
  ddTitle:     { flex: 1, fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  ddCount:     { fontSize: fontSize.xs },
  ddList:      { maxHeight: 300 },
  ddItem:      { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing[3], paddingHorizontal: spacing[4], gap: spacing[3] },
  ddCheckBtn:  { padding: spacing[1] },
  ddNavArea:   { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  ddItemBody:  { flex: 1 },
  ddItemTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  ddItemSub:   { fontSize: fontSize.xs, marginTop: 2 },
  ddBadge:     { paddingHorizontal: spacing[2], paddingVertical: 2, borderRadius: radius.full },
  ddBadgeText: { fontSize: 9, fontWeight: fontWeight.extrabold, color: '#fff', letterSpacing: 0.5 },

  fab: {
    position:        'absolute',
    right:           spacing[5],
    width:           52,
    height:          52,
    borderRadius:    26,
    backgroundColor: '#6366f1',
    alignItems:      'center',
    justifyContent:  'center',
    // shadow
    shadowColor:     '#6366f1',
    shadowOffset:    { width: 0, height: 4 },
    shadowOpacity:   0.45,
    shadowRadius:    8,
    elevation:       8,
  },
});
