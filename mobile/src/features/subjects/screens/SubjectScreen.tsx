import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Animated, Easing } from 'react-native';
import { PlayCircle, CheckCircle2, Circle, ChevronRight } from 'lucide-react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../../shared/hooks/useTheme';
import { GradientHeader, Card, LoadingState, ErrorState, EmptyState } from '../../../shared/components';
import { spacing, radius, fontSize, fontWeight } from '../../../shared/theme';
import { fetchSubjectLessons, updateStudentLessonProgress } from '../../student/services/studentService';
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

  const toggleLesson = useCallback(async (target: Lesson) => {
    const next = !(target.isCompleted ?? false);
    // Optimistic update
    setLessons((prev) => prev.map((l) => l.id === target.id ? { ...l, isCompleted: next } : l));
    try {
      await updateStudentLessonProgress(target.id, next);
    } catch {
      // Revert on failure
      setLessons((prev) => prev.map((l) => l.id === target.id ? { ...l, isCompleted: !next } : l));
    }
  }, []);

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
        lightColors={['#0369a1', '#0284c7']}
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
              onToggleComplete={() => toggleLesson(item)}
            />
          )}
        />
      )}
    </View>
  );
}

function LessonItem({ lesson, index, T, onPress, onToggleComplete }: {
  lesson: Lesson;
  index: number;
  T: ReturnType<typeof useTheme>['T'];
  onPress: () => void;
  onToggleComplete: () => void;
}) {
  // ── staggered entrance ─────────────────────────────────────────────────────
  const enterAnim  = useRef(new Animated.Value(0)).current;
  // ── checkbox spring ────────────────────────────────────────────────────────
  const checkScale = useRef(new Animated.Value(1)).current;
  // ── ripple / radiation burst ───────────────────────────────────────────────
  const rippleScale   = useRef(new Animated.Value(0)).current;
  const rippleOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(enterAnim, {
      toValue: 1,
      duration: 380,
      delay: index * 55,           // stagger each row
      easing: Easing.out(Easing.back(1.4)),
      useNativeDriver: true,
    }).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggle = () => {
    // 1. Spring-bounce the checkbox icon
    Animated.sequence([
      Animated.spring(checkScale, { toValue: 1.45, friction: 3, useNativeDriver: true }),
      Animated.spring(checkScale, { toValue: 1,    friction: 5, useNativeDriver: true }),
    ]).start();

    // 2. Ripple burst (only when marking complete)
    if (!lesson.isCompleted) {
      rippleScale.setValue(0);
      rippleOpacity.setValue(0.55);
      Animated.parallel([
        Animated.timing(rippleScale, {
          toValue: 3.2,
          duration: 500,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(rippleOpacity, {
          toValue: 0,
          duration: 500,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
    }

    onToggleComplete();
  };

  const Icon = lesson.isCompleted ? CheckCircle2 : Circle;
  const iconColor = lesson.isCompleted ? '#34d399' : T.muted;

  const rowOpacity   = enterAnim;
  const rowTranslate = enterAnim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] });

  return (
    <Animated.View
      style={[
        styles.itemWrap,
        { opacity: rowOpacity, transform: [{ translateY: rowTranslate }] },
      ]}
    >
      <Card>
        <View style={styles.row}>
          {/* Checkbox + ripple container */}
          <View style={styles.checkWrap}>
            {/* Ripple ring */}
            <Animated.View
              style={[
                styles.ripple,
                {
                  transform: [{ scale: rippleScale }],
                  opacity:   rippleOpacity,
                },
              ]}
              pointerEvents="none"
            />
            <TouchableOpacity onPress={handleToggle} hitSlop={10} style={styles.checkBtn}>
              <Animated.View style={{ transform: [{ scale: checkScale }] }}>
                <Icon size={22} color={iconColor} />
              </Animated.View>
            </TouchableOpacity>
          </View>

          {/* Body + navigation area */}
          <TouchableOpacity onPress={onPress} activeOpacity={0.75} style={styles.navArea}>
            <Text style={[styles.indexBadge, { backgroundColor: 'rgba(99,102,241,0.1)', color: '#818cf8' }]}>
              {index + 1}
            </Text>
            <View style={styles.body}>
              <Text style={[styles.title, { color: T.text }]} numberOfLines={1}>{lesson.title}</Text>
              {lesson.duration ? (
                <Text style={[styles.duration, { color: T.muted }]}>⏱ {lesson.duration}</Text>
              ) : null}
            </View>
            <ChevronRight size={14} color={T.muted} />
          </TouchableOpacity>
        </View>
      </Card>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  list: { padding: spacing[5], paddingBottom: spacing[8] },
  itemWrap: { marginBottom: spacing[3] },
  row:      { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  checkWrap: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  checkBtn:  { padding: spacing[1] },
  ripple: {
    position:    'absolute',
    width:  22, height: 22,
    borderRadius: 11,
    backgroundColor: '#34d399',
  },
  navArea:  { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  indexBadge: {
    width: 32, height: 32, borderRadius: radius.md,
    textAlign: 'center', lineHeight: 32,
    fontSize: fontSize.sm, fontWeight: fontWeight.bold,
  },
  body:     { flex: 1 },
  title:    { fontSize: fontSize.base, fontWeight: fontWeight.semibold },
  duration: { fontSize: fontSize.xs, marginTop: 2 },
});
