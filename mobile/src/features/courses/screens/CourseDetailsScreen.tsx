import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { BookOpen, ChevronRight, Clock } from 'lucide-react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../../shared/hooks/useTheme';
import { GradientHeader, Card, LoadingState, ErrorState, EmptyState } from '../../../shared/components';
import { spacing, radius, fontSize, fontWeight } from '../../../shared/theme';
import { fetchCourseSubjects } from '../../student/services/studentService';
import type { Subject } from '../../../types/student';
import type { StudentStackParamList } from '../../../types/navigation';

type Route = RouteProp<StudentStackParamList, 'CourseDetails'>;
type Nav   = NativeStackNavigationProp<StudentStackParamList>;

export function CourseDetailsScreen() {
  const { T }    = useTheme();
  const nav      = useNavigation<Nav>();
  const { params } = useRoute<Route>();

  const [subjects,   setSubjects]   = useState<Subject[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setError('');
      const data = await fetchCourseSubjects(params.courseId);
      setSubjects(data);
    } catch {
      setError('Failed to load subjects.');
    } finally {
      setLoading(false);
    }
  }, [params.courseId]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  return (
    <View style={[styles.root, { backgroundColor: T.background }]}>
      <GradientHeader
        title={params.courseName}
        subtitle="Course subjects"
        onBack={() => nav.goBack()}
        stats={[{ label: 'Subjects', value: subjects.length }]}
      />

      {loading ? (
        <LoadingState message="Loading subjects…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <FlatList
          data={subjects}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.primary} />}
          ListEmptyComponent={<EmptyState emoji="📂" title="No subjects yet" subtitle="Check back later" />}
          renderItem={({ item }) => (
            <SubjectCard
              subject={item}
              T={T}
              onPress={() => nav.navigate('SubjectLessons', {
                subjectId: item.id,
                subjectName: item.name,
                courseId: params.courseId,
              })}
            />
          )}
        />
      )}
    </View>
  );
}

function SubjectCard({ subject, T, onPress }: { subject: Subject; T: ReturnType<typeof useTheme>['T']; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={styles.itemWrap}>
      <Card>
        <View style={styles.itemRow}>
          <View style={[styles.icon, { backgroundColor: 'rgba(99,102,241,0.12)' }]}>
            <BookOpen size={20} color="#6366f1" />
          </View>
          <View style={styles.itemBody}>
            <Text style={[styles.subjectName, { color: T.text }]}>{subject.name}</Text>
            {subject.teacher && (
              <Text style={[styles.teacherName, { color: T.muted }]}>
                👨‍🏫 {subject.teacher.name}
              </Text>
            )}
            {subject.description ? (
              <Text style={[styles.subjectDesc, { color: T.muted }]} numberOfLines={1}>{subject.description}</Text>
            ) : null}
          </View>
          <ChevronRight size={16} color={T.muted} />
        </View>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  list: { padding: spacing[5], paddingBottom: spacing[8] },
  itemWrap: { marginBottom: spacing[3] },
  itemRow:  { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  icon:     { width: 46, height: 46, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  itemBody: { flex: 1 },
  subjectName:  { fontSize: fontSize.base, fontWeight: fontWeight.semibold, marginBottom: 2 },
  teacherName:  { fontSize: fontSize.xs, marginBottom: 2 },
  subjectDesc:  { fontSize: fontSize.xs },
});
