import React, { useEffect, useState, useCallback, memo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, TextInput, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BookOpen, Search, ChevronRight } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../../shared/hooks/useTheme';
import { Card, EmptyState, LoadingState, Badge } from '../../../shared/components';
import { spacing, radius, fontSize, fontWeight } from '../../../shared/theme';
import { fetchStudentCourseCatalog, fetchStudentContext } from '../../student/services/studentService';
import type { Course, StudentContext } from '../../../types/student';
import type { StudentStackParamList } from '../../../types/navigation';

type Nav = NativeStackNavigationProp<StudentStackParamList>;

export function CoursesScreen() {
  const { T }  = useTheme();
  const insets = useSafeAreaInsets();
  const nav    = useNavigation<Nav>();

  const [courses,    setCourses]    = useState<Course[]>([]);
  const [context,    setContext]    = useState<StudentContext | null>(null);
  const [query,      setQuery]      = useState('');
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      const [ctx, cs] = await Promise.all([fetchStudentContext(), fetchStudentCourseCatalog()]);
      setContext(ctx);
      setCourses(cs);
    } catch {
      setError('Failed to load courses. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const filtered = query.trim()
    ? courses.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()))
    : courses;

  if (loading) return <LoadingState message="Loading courses…" />;

  return (
    <View style={[styles.root, { backgroundColor: T.background }]}>
      {/* Header */}
      <LinearGradient
        colors={['#5b21b6', '#0f172a', '#312e81']}
        style={[styles.header, { paddingTop: insets.top + spacing[4] }]}
      >
        <Text style={styles.headerTitle}>
          {context?.mode === 'ACADEMY' ? '📚 My Tracks' : '📚 My Courses'}
        </Text>
        <Text style={styles.headerSub}>{filtered.length} available</Text>
      </LinearGradient>

      {/* Search */}
      <View style={[styles.searchRow, { backgroundColor: T.background }]}>
        <View style={[styles.searchBox, { backgroundColor: T.inputBg, borderColor: T.inputBorder }]}>
          <Search size={16} color={T.muted} />
          <TextInput
            style={[styles.searchInput, { color: T.text }]}
            value={query}
            onChangeText={setQuery}
            placeholder="Search courses…"
            placeholderTextColor={T.placeholder}
          />
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.primary} />}
        ListEmptyComponent={<EmptyState emoji="📖" title="No courses found" subtitle={error || 'Enroll in a course to get started'} />}
        renderItem={({ item }) => <CourseItem course={item} T={T} onPress={() => nav.navigate('CourseDetails', { courseId: item.id, courseName: item.name })} />}
      />
    </View>
  );
}

const CourseItem = memo(({ course, T, onPress }: {
  course: Course;
  T: ReturnType<typeof useTheme>['T'];
  onPress: () => void;
}) => {
  const pct = course.progress ?? 0;
  const statusColor = course.priceStatus === 'PAID' ? '#34d399' : '#fbbf24';

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={styles.itemWrap}>
      <Card>
        <View style={styles.itemRow}>
          <LinearGradient
            colors={['rgba(99,102,241,0.2)', 'rgba(139,92,246,0.2)']}
            style={styles.itemIcon}
          >
            <BookOpen size={22} color="#818cf8" />
          </LinearGradient>

          <View style={styles.itemBody}>
            <View style={styles.itemTopRow}>
              <Text style={[styles.itemName, { color: T.text }]} numberOfLines={1}>{course.name}</Text>
              <Badge label={course.priceStatus} variant={course.priceStatus === 'PAID' ? 'success' : 'warning'} />
            </View>
            {course.description ? (
              <Text style={[styles.itemDesc, { color: T.muted }]} numberOfLines={1}>{course.description}</Text>
            ) : null}
            {pct > 0 && (
              <View style={styles.progressRow}>
                <View style={[styles.progressBg, { backgroundColor: T.elevated }]}>
                  <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: statusColor }]} />
                </View>
                <Text style={[styles.progressPct, { color: T.muted }]}>{pct}%</Text>
              </View>
            )}
          </View>

          <ChevronRight size={16} color={T.muted} />
        </View>
      </Card>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  root:   { flex: 1 },
  header: {
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[6],
    borderBottomLeftRadius:  radius['2xl'],
    borderBottomRightRadius: radius['2xl'],
  },
  headerTitle: { color: '#fff', fontSize: fontSize['2xl'], fontWeight: fontWeight.extrabold },
  headerSub:   { color: 'rgba(255,255,255,0.55)', fontSize: fontSize.sm, marginTop: 2 },

  searchRow: { paddingHorizontal: spacing[5], paddingVertical: spacing[3] },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[2],
    borderRadius: radius.xl, borderWidth: 1,
    paddingHorizontal: spacing[4], height: 44,
  },
  searchInput: { flex: 1, fontSize: fontSize.base },

  list:      { paddingHorizontal: spacing[5], paddingBottom: spacing[8] },
  itemWrap:  { marginBottom: spacing[3] },
  itemRow:   { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  itemIcon:  { width: 50, height: 50, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  itemBody:  { flex: 1 },
  itemTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  itemName:  { flex: 1, fontSize: fontSize.base, fontWeight: fontWeight.semibold, marginRight: spacing[2] },
  itemDesc:  { fontSize: fontSize.xs, marginBottom: spacing[1.5] },
  progressRow:  { flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginTop: spacing[1] },
  progressBg:   { flex: 1, height: 4, borderRadius: radius.full, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: radius.full },
  progressPct:  { fontSize: fontSize.xs, width: 30 },
});
