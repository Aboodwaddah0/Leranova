import React, { useEffect, useState, useCallback, memo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, RefreshControl } from 'react-native';
import { ChevronRight, Search } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../../shared/hooks/useTheme';
import { GradientHeader, Card, Avatar, Badge, EmptyState, LoadingState } from '../../../shared/components';
import { spacing, radius, fontSize, fontWeight } from '../../../shared/theme';
import { fetchStudentTeachers } from '../services/studentService';
import type { Teacher } from '../../../types/student';
import type { StudentStackParamList } from '../../../types/navigation';

type Nav = NativeStackNavigationProp<StudentStackParamList>;

export function TeachersScreen() {
  const { T }  = useTheme();
  const nav    = useNavigation<Nav>();

  const [teachers,   setTeachers]   = useState<Teacher[]>([]);
  const [query,      setQuery]      = useState('');
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchStudentTeachers();
      setTeachers(data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const filtered = query.trim()
    ? teachers.filter((t) => t.name.toLowerCase().includes(query.toLowerCase()) || t.specialization?.toLowerCase().includes(query.toLowerCase()))
    : teachers;

  return (
    <View style={[styles.root, { backgroundColor: T.background }]}>
      <GradientHeader
        title="👨‍🏫 Teachers"
        subtitle="Your instructors"
        stats={[{ label: 'Teachers', value: teachers.length }]}
      />

      {/* Search */}
      <View style={[styles.searchWrap, { backgroundColor: T.background }]}>
        <View style={[styles.searchBox, { backgroundColor: T.inputBg, borderColor: T.inputBorder }]}>
          <Search size={16} color={T.muted} />
          <TextInput
            style={[styles.searchInput, { color: T.text }]}
            value={query}
            onChangeText={setQuery}
            placeholder="Search teachers…"
            placeholderTextColor={T.placeholder}
          />
        </View>
      </View>

      {loading ? (
        <LoadingState message="Loading teachers…" />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.primary} />}
          ListEmptyComponent={<EmptyState emoji="👨‍🏫" title="No teachers found" />}
          renderItem={({ item }) => (
            <TeacherCard teacher={item} T={T} onPress={() => nav.navigate('TeacherProfile', { teacherId: item.id })} />
          )}
        />
      )}
    </View>
  );
}

const TeacherCard = memo(({ teacher, T, onPress }: {
  teacher: Teacher;
  T: ReturnType<typeof useTheme>['T'];
  onPress: () => void;
}) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={styles.cardWrap}>
    <Card>
      <View style={styles.row}>
        <Avatar name={teacher.name} uri={teacher.avatarUrl} size={50} />
        <View style={styles.body}>
          <Text style={[styles.name, { color: T.text }]}>{teacher.name}</Text>
          {teacher.specialization && (
            <Text style={[styles.spec, { color: T.muted }]}>{teacher.specialization}</Text>
          )}
          {teacher.subjects.length > 0 && (
            <View style={styles.tagsRow}>
              {teacher.subjects.slice(0, 2).map((s, i) => (
                <Badge key={i} label={s} variant="primary" style={{ marginRight: spacing[1] }} />
              ))}
              {teacher.subjects.length > 2 && (
                <Badge label={`+${teacher.subjects.length - 2}`} variant="muted" />
              )}
            </View>
          )}
        </View>
        <ChevronRight size={16} color={T.muted} />
      </View>
    </Card>
  </TouchableOpacity>
));

const styles = StyleSheet.create({
  root:       { flex: 1 },
  searchWrap: { paddingHorizontal: spacing[5], paddingVertical: spacing[3] },
  searchBox:  {
    flexDirection: 'row', alignItems: 'center', gap: spacing[2],
    borderRadius: radius.xl, borderWidth: 1,
    paddingHorizontal: spacing[4], height: 44,
  },
  searchInput: { flex: 1, fontSize: fontSize.base },
  list:        { padding: spacing[4], paddingBottom: spacing[8] },
  cardWrap:    { marginBottom: spacing[3] },
  row:         { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  body:        { flex: 1, gap: spacing[1] },
  name:        { fontSize: fontSize.base, fontWeight: fontWeight.bold },
  spec:        { fontSize: fontSize.xs },
  tagsRow:     { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing[1] },
});
