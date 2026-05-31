import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Mail, Briefcase, BookOpen } from 'lucide-react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import { GradientHeader, Card, Avatar, Badge, LoadingState, ErrorState } from '../../../shared/components';
import { spacing, radius, fontSize, fontWeight } from '../../../shared/theme';
import { fetchStudentTeacherById } from '../services/studentService';
import type { Teacher } from '../../../types/student';
import type { StudentStackParamList } from '../../../types/navigation';

type Route = RouteProp<StudentStackParamList, 'TeacherProfile'>;
type Nav   = NativeStackNavigationProp<StudentStackParamList>;

export function TeacherProfileScreen() {
  const { T }  = useTheme();
  const nav    = useNavigation<Nav>();
  const { params } = useRoute<Route>();

  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    fetchStudentTeacherById(params.teacherId).then((data) => {
      if (data) setTeacher(data);
      else      setError('Teacher not found.');
    }).catch(() => setError('Failed to load teacher profile.')).finally(() => setLoading(false));
  }, [params.teacherId]);

  if (loading) return <LoadingState message="Loading profile…" />;
  if (error)   return <ErrorState message={error} onRetry={() => {}} />;

  return (
    <ScrollView style={[styles.root, { backgroundColor: T.background }]} showsVerticalScrollIndicator={false}>
      <GradientHeader
        title={teacher?.name ?? ''}
        subtitle={teacher?.specialization ?? teacher?.work ?? 'Instructor'}
        onBack={() => nav.goBack()}
        badge={`${teacher?.subjectCount ?? 0} subjects`}
        lightColors={['#c2410c', '#ea580c']}
      />

      <View style={styles.body}>
        {/* Avatar + name card */}
        <Card style={styles.profileCard}>
          <View style={styles.avatarRow}>
            <Avatar name={teacher?.name} uri={teacher?.avatarUrl} size={72} />
            <View style={styles.nameCol}>
              <Text style={[styles.teacherName, { color: T.text }]}>{teacher?.name}</Text>
              {teacher?.work && <Text style={[styles.work, { color: T.muted }]}>{teacher.work}</Text>}
              {teacher?.email && <Text style={[styles.email, { color: T.primary }]}>{teacher.email}</Text>}
            </View>
          </View>

          {teacher?.bio ? (
            <Text style={[styles.bio, { color: T.subtext, borderTopColor: T.border }]}>{teacher.bio}</Text>
          ) : null}
        </Card>

        {/* Subjects */}
        {(teacher?.subjects?.length ?? 0) > 0 && (
          <Card>
            <View style={styles.sectionRow}>
              <BookOpen size={16} color={T.primary} />
              <Text style={[styles.sectionTitle, { color: T.text }]}>Subjects</Text>
            </View>
            <View style={styles.tagsWrap}>
              {teacher!.subjects.map((s, i) => (
                <Badge key={i} label={s} variant="primary" style={{ marginRight: spacing[1.5], marginBottom: spacing[1.5] }} />
              ))}
            </View>
          </Card>
        )}

        {/* Details */}
        <Card style={styles.detailsCard}>
          {[
            { icon: Briefcase, label: 'Specialization', value: teacher?.specialization },
            { icon: Mail,      label: 'Email',           value: teacher?.email },
          ].filter((d) => d.value).map((d) => (
            <View key={d.label} style={[styles.detailRow, { borderBottomColor: T.separator }]}>
              <d.icon size={14} color={T.muted} />
              <View style={styles.detailBody}>
                <Text style={[styles.detailLabel, { color: T.muted }]}>{d.label}</Text>
                <Text style={[styles.detailValue, { color: T.text }]}>{d.value}</Text>
              </View>
            </View>
          ))}
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { padding: spacing[5], gap: spacing[4] },
  profileCard: {},
  avatarRow:   { flexDirection: 'row', alignItems: 'center', gap: spacing[4] },
  nameCol:     { flex: 1 },
  teacherName: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, marginBottom: 2 },
  work:        { fontSize: fontSize.sm },
  email:       { fontSize: fontSize.sm, marginTop: 2 },
  bio: {
    fontSize: fontSize.sm, lineHeight: 20, marginTop: spacing[4],
    paddingTop: spacing[4], borderTopWidth: 1,
  },
  sectionRow:   { flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginBottom: spacing[3] },
  sectionTitle: { fontSize: fontSize.base, fontWeight: fontWeight.bold },
  tagsWrap:     { flexDirection: 'row', flexWrap: 'wrap' },
  detailsCard:  {},
  detailRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing[3],
    paddingVertical: spacing[3], borderBottomWidth: 1,
  },
  detailBody:   { flex: 1 },
  detailLabel:  { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 2 },
  detailValue:  { fontSize: fontSize.sm },
});
