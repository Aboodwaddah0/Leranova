import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowLeft, Bot } from 'lucide-react-native';
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
import { AttachmentsTab }   from '../components/AttachmentsTab';
import { CommentsTab }      from '../components/CommentsTab';
import { FlashcardsTab }    from '../components/FlashcardsTab';
import { QuizTab }          from '../components/QuizTab';
import { MindMapTab }       from '../components/MindMapTab';
import { AIAssistantModal } from '../components/AIAssistantModal';

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

  const [lesson,    setLesson]    = useState<Lesson | null>(null);
  const [aiContent, setAiContent] = useState<LessonAiContent | null>(null);
  const [quizData,  setQuizData]  = useState<unknown>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('attachments');
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [showAI,    setShowAI]    = useState(false);

  const load = useCallback(async () => {
    try {
      setError('');
      const lessons = await fetchSubjectLessons(params.subjectId);
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
        <VideoPlayer videoUrl={lesson?.videoUrl} />

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
