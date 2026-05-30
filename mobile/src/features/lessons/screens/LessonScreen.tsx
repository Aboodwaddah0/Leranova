import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Dimensions,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Bot } from 'lucide-react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import { spacing, radius, fontSize, fontWeight } from '../../../shared/theme';
import { LoadingState, ErrorState } from '../../../shared/components';
import {
  fetchSubjectLessons, fetchLessonAiContent,
  fetchStudentLessonQuiz, updateStudentLessonProgress,
} from '../../student/services/studentService';
import type { Lesson, LessonAiContent } from '../../../types/student';
import type { StudentStackParamList } from '../../../types/navigation';

// Tab components
import { VideoPlayer }     from '../components/VideoPlayer';
import { AttachmentsTab }  from '../components/AttachmentsTab';
import { CommentsTab }     from '../components/CommentsTab';
import { FlashcardsTab }   from '../components/FlashcardsTab';
import { QuizTab }         from '../components/QuizTab';
import { MindMapTab }      from '../components/MindMapTab';
import { AIAssistantModal} from '../components/AIAssistantModal';

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
  const { T }  = useTheme();
  const nav    = useNavigation<Nav>();
  const { params } = useRoute<Route>();

  const [lesson,     setLesson]     = useState<Lesson | null>(null);
  const [aiContent,  setAiContent]  = useState<LessonAiContent | null>(null);
  const [quizData,   setQuizData]   = useState<unknown>(null);
  const [activeTab,  setActiveTab]  = useState<TabKey>('attachments');
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [showAI,     setShowAI]     = useState(false);

  const load = useCallback(async () => {
    try {
      setError('');
      // Load lessons for this subject, find the one we need
      const lessons = await fetchSubjectLessons(params.subjectId);
      const found   = lessons.find((l) => l.id === params.lessonId) ?? null;
      setLesson(found);

      // Load AI content and quiz in parallel (non-blocking)
      Promise.all([
        fetchLessonAiContent(params.lessonId),
        fetchStudentLessonQuiz(params.lessonId),
      ]).then(([ai, quiz]) => {
        setAiContent(ai);
        setQuizData(quiz);
      }).catch(() => {/* non-critical */});

      // Mark as started
      updateStudentLessonProgress(params.lessonId, false).catch(() => {});
    } catch {
      setError('Failed to load lesson.');
    } finally {
      setLoading(false);
    }
  }, [params.lessonId, params.subjectId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingState message="Loading lesson…" />;
  if (error)   return <ErrorState message={error} onRetry={load} />;

  return (
    <View style={[styles.root, { backgroundColor: T.background }]}>
      {/* Header bar */}
      <View style={[styles.header, { backgroundColor: T.surface, borderBottomColor: T.border }]}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.backBtn}>
          <Text style={{ color: T.primary, fontSize: fontSize.base }}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: T.text }]} numberOfLines={1}>{params.lessonTitle}</Text>
        <TouchableOpacity onPress={() => setShowAI(true)} style={[styles.aiBtn, { backgroundColor: 'rgba(99,102,241,0.15)' }]}>
          <Bot size={18} color="#818cf8" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Video */}
        <VideoPlayer videoUrl={lesson?.videoUrl} />

        {/* Lesson info */}
        {lesson && (
          <View style={[styles.infoBox, { backgroundColor: T.surface, borderColor: T.border }]}>
            <Text style={[styles.lessonTitle, { color: T.text }]}>{lesson.title}</Text>
            {lesson.description ? (
              <Text style={[styles.lessonDesc, { color: T.muted }]}>{lesson.description}</Text>
            ) : null}
          </View>
        )}

        {/* Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabsScroll}
          contentContainerStyle={styles.tabsRow}
        >
          {TABS.map((tab) => {
            const active = tab.key === activeTab;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                style={[
                  styles.tabBtn,
                  active
                    ? { backgroundColor: T.primary }
                    : { backgroundColor: T.elevated, borderColor: T.border, borderWidth: 1 },
                ]}
              >
                <Text style={[styles.tabLabel, { color: active ? '#fff' : T.muted }]}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Tab content */}
        <View style={styles.tabContent}>
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

      {/* AI Modal */}
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

const styles = StyleSheet.create({
  root:   { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingTop: spacing[10],
    paddingBottom: spacing[3],
    borderBottomWidth: 1,
  },
  backBtn:     { paddingRight: spacing[3] },
  headerTitle: { flex: 1, fontSize: fontSize.base, fontWeight: fontWeight.semibold },
  aiBtn:       { width: 36, height: 36, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },

  infoBox: {
    margin: spacing[4],
    padding: spacing[4],
    borderRadius: radius.xl,
    borderWidth: 1,
  },
  lessonTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, marginBottom: spacing[1] },
  lessonDesc:  { fontSize: fontSize.sm, lineHeight: 20 },

  tabsScroll: { paddingLeft: spacing[4] },
  tabsRow:    { flexDirection: 'row', gap: spacing[2], paddingRight: spacing[4], paddingVertical: spacing[3] },
  tabBtn:     { borderRadius: radius.full, paddingHorizontal: spacing[4], paddingVertical: spacing[2] },
  tabLabel:   { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  tabContent: { padding: spacing[4], paddingBottom: spacing[10] },
});
