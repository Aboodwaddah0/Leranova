import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, Alert, TextInput, ActivityIndicator, ScrollView,
} from 'react-native';
import { ClipboardList, Check, Search } from 'lucide-react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import { spacing, radius, fontSize, fontWeight } from '../../../shared/theme';
import { LoadingState, EmptyState } from '../../../shared/components';
import {
  fetchMySubjects, fetchSubjectStudents, fetchSubjectAttendance, saveSubjectAttendance,
} from '../services/instructorService';
import type { InstructorSubject, AttendanceStudent } from '../../../types/instructor';

type AttStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';

const STATUS_META: Record<AttStatus, { label: string; shortLabel: string; color: string; bg: string }> = {
  PRESENT: { label: 'Present', shortLabel: 'P', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  ABSENT:  { label: 'Absent',  shortLabel: 'A', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  LATE:    { label: 'Late',    shortLabel: 'L', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  EXCUSED: { label: 'Excused', shortLabel: 'E', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
};

const CYCLE: AttStatus[] = ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'];

interface StudentRow extends AttendanceStudent { status: AttStatus; }

interface Props { isSchool: boolean; }

export function InstructorAttendanceTab({ isSchool }: Props) {
  const { T } = useTheme();

  const [subjects,   setSubjects]   = useState<InstructorSubject[]>([]);
  const [subjectId,  setSubjectId]  = useState<number | null>(null);
  const [date,       setDate]       = useState(new Date().toISOString().slice(0, 10));
  const [students,   setStudents]   = useState<StudentRow[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search,     setSearch]     = useState('');
  const [saved,      setSaved]      = useState(false);

  useEffect(() => {
    fetchMySubjects()
      .then(s => setSubjects(s))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const loadData = useCallback(async () => {
    if (!subjectId) { setStudents([]); return; }
    setDataLoading(true);
    try {
      const [list, existing] = await Promise.all([
        fetchSubjectStudents(subjectId),
        fetchSubjectAttendance(subjectId, { date }),
      ]);
      const attMap = new Map(existing.map(a => [a.studentId, a.status as AttStatus]));
      setStudents(list.map(s => ({ ...s, status: attMap.get(s.id) ?? 'PRESENT' })));
      setSaved(false);
    } catch {
      Alert.alert('Error', 'Failed to load attendance data.');
    } finally {
      setDataLoading(false);
    }
  }, [subjectId, date]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const toggleStatus = (id: number) => {
    setStudents(prev => prev.map(s => {
      if (s.id !== id) return s;
      const idx = CYCLE.indexOf(s.status);
      return { ...s, status: CYCLE[(idx + 1) % CYCLE.length] };
    }));
  };

  const setAllStatus = (status: AttStatus) => {
    setStudents(prev => prev.map(s => ({ ...s, status })));
  };

  const handleSave = async () => {
    if (!subjectId) { Alert.alert('Select subject', 'Please select a subject first.'); return; }
    setSaving(true);
    try {
      await saveSubjectAttendance(subjectId, {
        date,
        records: students.map(s => ({ studentId: s.id, status: s.status })),
      });
      setSaved(true);
      Alert.alert('Saved', 'Attendance saved successfully.');
    } catch (e: unknown) {
      Alert.alert('Error', (e as Error).message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter(s => `${s.firstName} ${s.lastName}`.toLowerCase().includes(q));
  }, [students, search]);

  const counts = useMemo(() => {
    const c: Record<AttStatus, number> = { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0 };
    students.forEach(s => c[s.status]++);
    return c;
  }, [students]);

  if (loading) return <LoadingState message="Loading attendance…" />;

  return (
    <View style={[styles.root, { backgroundColor: T.background }]}>
      {/* Subject selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar} contentContainerStyle={styles.filterContent}>
        {subjects.map(s => (
          <TouchableOpacity
            key={s.id}
            style={[styles.chip, { borderColor: subjectId === s.id ? T.primary : T.inputBorder, backgroundColor: subjectId === s.id ? T.primary : T.inputBg }]}
            onPress={() => setSubjectId(subjectId === s.id ? null : s.id)}
          >
            <Text style={{ color: subjectId === s.id ? '#fff' : T.muted, fontSize: fontSize.xs, fontWeight: fontWeight.semibold }} numberOfLines={1}>{s.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Date input */}
      <View style={styles.datePad}>
        <TextInput
          style={[styles.dateInput, { backgroundColor: T.inputBg, borderColor: T.inputBorder, color: T.text }]}
          value={date}
          onChangeText={d => setDate(d)}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={T.placeholder}
        />
      </View>

      {/* Status counts */}
      {students.length > 0 && (
        <View style={styles.countsRow}>
          {(Object.keys(STATUS_META) as AttStatus[]).map(s => (
            <TouchableOpacity
              key={s}
              style={[styles.countCard, { backgroundColor: STATUS_META[s].bg }]}
              onPress={() => setAllStatus(s)}
            >
              <Text style={[styles.countNum, { color: STATUS_META[s].color }]}>{counts[s]}</Text>
              <Text style={[styles.countLabel, { color: STATUS_META[s].color }]}>{STATUS_META[s].label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Search */}
      {students.length > 0 && (
        <View style={styles.searchPad}>
          <View style={[styles.searchBox, { backgroundColor: T.inputBg, borderColor: T.inputBorder }]}>
            <Search size={16} color={T.muted} />
            <TextInput style={[styles.searchInput, { color: T.text }]} value={search} onChangeText={setSearch} placeholder="Search students…" placeholderTextColor={T.placeholder} />
          </View>
        </View>
      )}

      {!subjectId ? (
        <EmptyState emoji="📚" title="Select a subject" subtitle="Choose a subject above to mark attendance." />
      ) : dataLoading ? <LoadingState message="Loading students…" /> : (
        <>
          <FlatList
            data={visible}
            keyExtractor={s => String(s.id)}
            contentContainerStyle={styles.list}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.primary} />}
            ListEmptyComponent={<EmptyState emoji="👤" title="No students" subtitle="No students enrolled in this subject." />}
            renderItem={({ item: s }) => {
              const meta = STATUS_META[s.status];
              return (
                <TouchableOpacity
                  style={[styles.studentRow, { backgroundColor: T.surface, borderColor: T.border }]}
                  onPress={() => toggleStatus(s.id)}
                  activeOpacity={0.85}
                >
                  <View style={[styles.avatar, { backgroundColor: meta.bg }]}>
                    <Text style={[styles.avatarText, { color: meta.color }]}>{s.firstName[0]}{s.lastName[0]}</Text>
                  </View>
                  <Text style={[styles.name, { color: T.text, flex: 1 }]}>{s.firstName} {s.lastName}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: meta.bg, borderColor: meta.color }]}>
                    <Text style={[styles.statusText, { color: meta.color }]}>{meta.shortLabel}</Text>
                  </View>
                </TouchableOpacity>
              );
            }}
            showsVerticalScrollIndicator={false}
          />
          <TouchableOpacity style={[styles.saveBtn, { backgroundColor: saved ? '#10b981' : T.primary }]} onPress={handleSave} disabled={saving}>
            {saving
              ? <ActivityIndicator size="small" color="#fff" />
              : <><Check size={18} color="#fff" /><Text style={styles.saveBtnText}>{saved ? 'Saved ✓' : 'Save Attendance'}</Text></>
            }
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root:         { flex: 1 },
  filterBar:    { maxHeight: 46 },
  filterContent:{ paddingHorizontal: spacing[4], paddingVertical: spacing[2], gap: spacing[2], flexDirection: 'row' },
  chip:         { paddingHorizontal: spacing[3], paddingVertical: spacing[2], borderRadius: 999, borderWidth: 1, maxWidth: 140 },
  datePad:      { paddingHorizontal: spacing[4], paddingBottom: spacing[2] },
  dateInput:    { borderRadius: radius.lg, borderWidth: 1, paddingHorizontal: spacing[4], paddingVertical: spacing[3], fontSize: fontSize.sm },
  countsRow:    { flexDirection: 'row', gap: spacing[2], paddingHorizontal: spacing[4], paddingBottom: spacing[2] },
  countCard:    { flex: 1, alignItems: 'center', paddingVertical: spacing[2], borderRadius: radius.lg },
  countNum:     { fontSize: fontSize.lg, fontWeight: fontWeight.extrabold },
  countLabel:   { fontSize: 9, fontWeight: '700', textTransform: 'uppercase' },
  searchPad:    { paddingHorizontal: spacing[4], paddingBottom: spacing[2] },
  searchBox:    { flexDirection: 'row', alignItems: 'center', gap: spacing[2], borderRadius: radius.xl, borderWidth: 1, paddingHorizontal: spacing[3], height: 44 },
  searchInput:  { flex: 1, fontSize: fontSize.sm },
  list:         { padding: spacing[4], paddingTop: 0, paddingBottom: spacing[20] },
  studentRow:   { flexDirection: 'row', alignItems: 'center', gap: spacing[3], padding: spacing[3], borderRadius: radius.xl, borderWidth: 1, marginBottom: spacing[2] },
  avatar:       { width: 38, height: 38, borderRadius: 99, alignItems: 'center', justifyContent: 'center' },
  avatarText:   { fontSize: fontSize.sm, fontWeight: fontWeight.extrabold },
  name:         { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  statusBadge:  { width: 34, height: 34, borderRadius: 99, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  statusText:   { fontSize: fontSize.sm, fontWeight: fontWeight.extrabold },
  saveBtn:      { margin: spacing[4], marginTop: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[2], paddingVertical: spacing[4], borderRadius: radius.xl },
  saveBtnText:  { color: '#fff', fontSize: fontSize.sm, fontWeight: fontWeight.extrabold },
});
