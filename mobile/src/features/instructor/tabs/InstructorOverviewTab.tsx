import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl, Alert,
} from 'react-native';
import { BookOpen, Layers, FileText, Users, BarChart2, Building2 } from 'lucide-react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import { spacing, radius, fontSize, fontWeight } from '../../../shared/theme';
import { LoadingState } from '../../../shared/components';
import {
  fetchInstructorProfile, fetchMyCourses, fetchMySubjects,
  fetchMyLessons, fetchStudents, fetchMarks,
} from '../services/instructorService';
import type { InstructorProfile } from '../../../types/instructor';

interface Props { isSchool: boolean; }

export function InstructorOverviewTab({ isSchool }: Props) {
  const { T } = useTheme();

  const [profile,    setProfile]    = useState<InstructorProfile | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ courses: 0, subjects: 0, lessons: 0, students: 0, marks: 0 });
  const [latest, setLatest] = useState({ subject: '', lesson: '', student: '', mark: '' });

  const load = useCallback(async () => {
    try {
      const [profile, courses, subjects, lessons, students, marks] = await Promise.all([
        fetchInstructorProfile(),
        fetchMyCourses().catch(() => []),
        fetchMySubjects().catch(() => []),
        fetchMyLessons().catch(() => []),
        fetchStudents().catch(() => []),
        fetchMarks().catch(() => []),
      ]);
      setProfile(profile);
      setStats({
        courses: courses.length,
        subjects: subjects.length,
        lessons: lessons.length,
        students: students.length,
        marks: marks.length,
      });
      setLatest({
        subject: subjects[0]?.name ?? '—',
        lesson:  lessons[0]?.title ?? '—',
        student: students[0] ? `${students[0].firstName} ${students[0].lastName}` : '—',
        mark:    marks[0] ? `${marks[0].Numbers}/${marks[0].OutOf}` : '—',
      });
    } catch {
      Alert.alert('Error', 'Failed to load overview.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, [load]);

  const statCards = [
    { label: isSchool ? 'Classes' : 'Courses', value: stats.courses,  icon: BookOpen,  color: '#6366f1', bg: 'rgba(99,102,241,0.12)' },
    { label: 'Subjects', value: stats.subjects, icon: Layers,    color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
    { label: 'Lessons',  value: stats.lessons,  icon: FileText,  color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    { label: 'Students', value: stats.students, icon: Users,     color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
    { label: 'Marks',    value: stats.marks,    icon: BarChart2, color: '#0ea5e9', bg: 'rgba(14,165,233,0.12)' },
  ];

  if (loading) return <LoadingState message="Loading overview…" />;

  return (
    <ScrollView
      contentContainerStyle={styles.body}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.primary} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Stat cards */}
      <View style={styles.statsGrid}>
        {statCards.map(({ label, value, icon: Icon, color, bg }) => (
          <View key={label} style={[styles.statCard, { backgroundColor: T.surface, borderColor: T.border }]}>
            <View style={[styles.statIcon, { backgroundColor: bg }]}>
              <Icon size={20} color={color} />
            </View>
            <Text style={[styles.statValue, { color: T.text }]}>{value}</Text>
            <Text style={[styles.statLabel, { color: T.muted }]}>{label}</Text>
          </View>
        ))}
      </View>

      {/* Account info */}
      {profile && (
        <View style={[styles.card, { backgroundColor: T.surface, borderColor: T.border }]}>
          <View style={styles.cardTitleRow}>
            <Building2 size={16} color="#6366f1" />
            <Text style={[styles.cardTitle, { color: T.text }]}>Account Information</Text>
          </View>
          {[
            { label: 'Name',         value: `${profile.firstName} ${profile.lastName}` },
            { label: 'Email',        value: profile.email },
            { label: 'Organization', value: profile.organization?.Name },
            { label: 'Type',         value: profile.organization?.type ?? profile.studentMode },
            { label: 'Specialization', value: profile.specialization },
          ].filter(r => r.value).map(({ label, value }) => (
            <View key={label} style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: T.muted }]}>{label}</Text>
              <Text style={[styles.infoValue, { color: T.text }]} numberOfLines={1}>{value}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Latest data */}
      <View style={[styles.card, { backgroundColor: T.surface, borderColor: T.border }]}>
        <Text style={[styles.cardTitle, { color: T.text }]}>Latest Data</Text>
        {[
          { label: 'Latest Subject', value: latest.subject },
          { label: 'Latest Lesson',  value: latest.lesson },
          { label: 'Latest Student', value: latest.student },
          { label: 'Latest Mark',    value: latest.mark },
        ].map(({ label, value }) => (
          <View key={label} style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: T.muted }]}>{label}</Text>
            <Text style={[styles.infoValue, { color: T.text }]} numberOfLines={1}>{value}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body:        { padding: spacing[4], gap: spacing[4], paddingBottom: spacing[10] },
  statsGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[3] },
  statCard:    { flex: 1, minWidth: '42%', borderRadius: radius.xl, borderWidth: 1, padding: spacing[4], alignItems: 'center', gap: spacing[2] },
  statIcon:    { width: 44, height: 44, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center' },
  statValue:   { fontSize: fontSize['2xl'], fontWeight: fontWeight.extrabold },
  statLabel:   { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  card:        { borderRadius: radius['2xl'], borderWidth: 1, padding: spacing[4], gap: spacing[3] },
  cardTitleRow:{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  cardTitle:   { fontSize: fontSize.sm, fontWeight: fontWeight.extrabold },
  infoRow:     { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  infoLabel:   { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, width: 110 },
  infoValue:   { flex: 1, fontSize: fontSize.sm, fontWeight: fontWeight.bold },
});
