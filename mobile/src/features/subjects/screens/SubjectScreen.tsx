import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { PlayCircle, CheckCircle2, Circle, ChevronRight } from 'lucide-react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../../shared/hooks/useTheme';
import { GradientHeader, Card, LoadingState, ErrorState, EmptyState } from '../../../shared/components';
import { spacing, radius, fontSize, fontWeight } from '../../../shared/theme';
import { fetchSubjectLessons } from '../../student/services/studentService';
import type { Lesson } from '../../../types/student';
import type { StudentStackParamList } from '../../../types/navigation';

type Route = RouteProp<StudentStackParamList, 'SubjectLessons'>;
type Nav   = NativeStackNavigationProp<StudentStackParamList>;

export function SubjectScreen() {
  const { T }  = useTheme();
  const nav    = useNavigation<Nav>();
  const { params } = useRoute<Route>();

  const [lessons,    setLessons]    = useState<Lesson[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setError('');
      const data = await fetchSubjectLessons(params.subjectId);
      setLessons(data);
    } catch {
      setError('Failed to load lessons.');
    } finally {
      setLoading(false);
    }
  }, [params.subjectId]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const completedCount = lessons.filter((l) => l.isCompleted).length;

  return (
    <View style={[styles.root, { backgroundColor: T.background }]}>
      <GradientHeader
        title={params.subjectName}
        subtitle="Subject lessons"
        onBack={() => nav.goBack()}
        stats={[
          { label: 'Lessons',   value: lessons.length },
          { label: 'Completed', value: completedCount },
        ]}
      />

      {loading ? (
        <LoadingState message="Loading lessons…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <FlatList
          data={lessons}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.primary} />}
          ListEmptyComponent={<EmptyState emoji="🎬" title="No lessons yet" subtitle="The instructor hasn't added lessons yet." />}
          renderItem={({ item, index }) => (
            <LessonItem
              lesson={item}
              index={index}
              T={T}
              onPress={() => nav.navigate('Lesson', {
                lessonId: item.id,
                lessonTitle: item.title,
                subjectId: params.subjectId,
                courseId: params.courseId,
              })}
            />
          )}
        />
      )}
    </View>
  );
}

function LessonItem({ lesson, index, T, onPress }: {
  lesson: Lesson;
  index: number;
  T: ReturnType<typeof useTheme>['T'];
  onPress: () => void;
}) {
  const Icon = lesson.isCompleted ? CheckCircle2 : Circle;
  const iconColor = lesson.isCompleted ? '#34d399' : T.muted;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={styles.itemWrap}>
      <Card>
        <View style={styles.row}>
          <Text style={[styles.indexBadge, { backgroundColor: 'rgba(99,102,241,0.1)', color: '#818cf8' }]}>
            {index + 1}
          </Text>
          <View style={styles.body}>
            <Text style={[styles.title, { color: T.text }]} numberOfLines={1}>{lesson.title}</Text>
            {lesson.duration ? (
              <Text style={[styles.duration, { color: T.muted }]}>⏱ {lesson.duration}</Text>
            ) : null}
          </View>
          <Icon size={20} color={iconColor} />
          <ChevronRight size={14} color={T.muted} style={{ marginLeft: spacing[1] }} />
        </View>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  list: { padding: spacing[5], paddingBottom: spacing[8] },
  itemWrap: { marginBottom: spacing[3] },
  row:     { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  indexBadge: {
    width: 32, height: 32, borderRadius: radius.md,
    textAlign: 'center', lineHeight: 32,
    fontSize: fontSize.sm, fontWeight: fontWeight.bold,
  },
  body:     { flex: 1 },
  title:    { fontSize: fontSize.base, fontWeight: fontWeight.semibold },
  duration: { fontSize: fontSize.xs, marginTop: 2 },
});
