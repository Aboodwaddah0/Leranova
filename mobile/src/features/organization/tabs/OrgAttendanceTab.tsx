import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, Alert, TextInput, ActivityIndicator, ScrollView,
} from 'react-native';
import { ClipboardList, BarChart2, Search, Check } from 'lucide-react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import { spacing, radius, fontSize, fontWeight } from '../../../shared/theme';
import { LoadingState, EmptyState } from '../../../shared/components';
import {
  fetchClassStudents, fetchClassAttendance, saveAttendance, fetchAttendanceSummary, fetchCourses, fetchTerms,
} from '../services/organizationService';
import type { AttendanceRecord, AttendanceSummaryItem, OrgCourse, Term, AcademicYear, AttendanceStatus } from '../../../types/organization';

const STATUS_META: Record<AttendanceStatus, { label: string; color: string; bg: string; shortLabel: string }> = {
  PRESENT: { label: 'Present', shortLabel: 'P', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  ABSENT:  { label: 'Absent',  shortLabel: 'A', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  LATE:    { label: 'Late',    shortLabel: 'L', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  EXCUSED: { label: 'Excused', shortLabel: 'E', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
};

interface Props {
  orgType: 'SCHOOL' | 'ACADEMY';
  academicYears: AcademicYear[];
  viewingYearId: number | null;
}

interface StudentWithStatus {
  id: number;
  firstName: string;
  lastName: string;
  status: AttendanceStatus;
}

export function OrgAttendanceTab({ orgType, academicYears, viewingYearId }: Props) {
  const { T } = useTheme();

  const [view,       setView]       = useState<'mark' | 'summary'>('mark');
  const [courses,    setCourses]    = useState<OrgCourse[]>([]);
  const [terms,      setTerms]      = useState<Term[]>([]);
  const [classId,    setClassId]    = useState<number | null>(null);
  const [termId,     setTermId]     = useState<number | null>(null);
  const [date,       setDate]       = useState(new Date().toISOString().slice(0, 10));
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search,     setSearch]     = useState('');
  const [students,   setStudents]   = useState<StudentWithStatus[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  // Summary
  const [summary,    setSummary]    = useState<AttendanceSummaryItem[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const classCourses = useMemo(() =>
    courses.filter(c => (c.kind || c.Kind || 'CLASS').toString().toUpperCase() === 'CLASS'),
    [courses]
  );

  const load = useCallback(async () => {
    try {
      const c = await fetchCourses().catch(() => []);
      setCourses(c);
      if (viewingYearId) {
        const t = await fetchTerms(viewingYearId).catch(() => []);
        setTerms(t);
        const active = t.find((x: Term) => x.status === 'ACTIVE');
        if (active) setTermId(active.id);
      }
    } catch {}
    finally { setLoading(false); }
  }, [viewingYearId]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (view === 'mark') await loadAttendance();
    else await loadSummary();
    setRefreshing(false);
  }, [view, classId, date, termId]);

  const loadAttendance = useCallback(async () => {
    if (!classId) { setStudents([]); return; }
    setDataLoading(true);
    try {
      const params: Record<string, unknown> = { date };
      if (termId) params.termId = termId;
      else if (viewingYearId) params.academicYearId = viewingYearId;

      const [studentList, attList] = await Promise.all([
        fetchClassStudents(classId),
        fetchClassAttendance(classId, params),
      ]);
      const attMap = new Map((attList as AttendanceRecord[]).map(a => [a.studentId, a.status as AttendanceStatus]));
      setStudents(studentList.map(s => ({
        id: s.id,
        firstName: s.firstName,
        lastName: s.lastName,
        status: attMap.get(s.id) ?? 'PRESENT',
      })));
    } catch {
      Alert.alert('Error', 'Failed to load students.');
    } finally {
      setDataLoading(false);
    }
  }, [classId, date, termId, viewingYearId]);

  const loadSummary = useCallback(async () => {
    if (!classId) { setSummary([]); return; }
    setSummaryLoading(true);
    const params: Record<string, unknown> = {};
    if (termId) params.termId = termId;
    else if (viewingYearId) params.academicYearId = viewingYearId;
    try {
      const data = await fetchAttendanceSummary(classId, params);
      setSummary(data);
    } catch {
      Alert.alert('Error', 'Failed to load summary.');
    } finally {
      setSummaryLoading(false);
    }
  }, [classId, termId, viewingYearId]);

  useEffect(() => {
    if (view === 'mark') loadAttendance();
    else loadSummary();
  }, [view, classId, date, termId]);

  const toggleStatus = (studentId: number) => {
    const statuses: AttendanceStatus[] = ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'];
    setStudents(prev => prev.map(s => {
      if (s.id !== studentId) return s;
      const idx = statuses.indexOf(s.status);
      return { ...s, status: statuses[(idx + 1) % statuses.length] };
    }));
  };

  const setAllStatus = (status: AttendanceStatus) => {
    setStudents(prev => prev.map(s => ({ ...s, status })));
  };

  const handleSave = async () => {
    if (!classId) { Alert.alert('Select', 'Please select a class.'); return; }
    setSaving(true);
    try {
      await saveAttendance(classId, {
        date,
        attendance: students.map(s => ({ studentId: s.id, status: s.status })),
        ...(termId ? { termId } : {}),
      });
      Alert.alert('Saved', 'Attendance saved successfully.');
    } catch (e: unknown) {
      Alert.alert('Error', (e as Error).message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const visibleStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter(s => `${s.firstName} ${s.lastName}`.toLowerCase().includes(q));
  }, [students, search]);

  const visibleSummary = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return summary;
    return summary.filter(s => s.studentName.toLowerCase().includes(q));
  }, [summary, search]);

  if (loading) return <LoadingState message="Loading attendance…" />;

  const classOptions = orgType === 'SCHOOL' ? classCourses : courses;

  return (
    <View style={[styles.root, { backgroundColor: T.background }]}>
      {/* View toggle */}
      <View style={[styles.switchRow, { backgroundColor: T.surface, borderColor: T.border }]}>
        <TouchableOpacity style={[styles.switchBtn, view === 'mark' && { backgroundColor: T.primary }]} onPress={() => setView('mark')}>
          <ClipboardList size={14} color={view === 'mark' ? '#fff' : T.muted} />
          <Text style={{ color: view === 'mark' ? '#fff' : T.muted, fontSize: fontSize.xs, fontWeight: fontWeight.bold }}>Mark</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.switchBtn, view === 'summary' && { backgroundColor: T.primary }]} onPress={() => setView('summary')}>
          <BarChart2 size={14} color={view === 'summary' ? '#fff' : T.muted} />
          <Text style={{ color: view === 'summary' ? '#fff' : T.muted, fontSize: fontSize.xs, fontWeight: fontWeight.bold }}>Summary</Text>
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.classFilter} contentContainerStyle={styles.filterContent}>
        {classOptions.map(c => (
          <TouchableOpacity
            key={c.id}
            style={[styles.classChip, { borderColor: classId === c.id ? T.primary : T.inputBorder, backgroundColor: classId === c.id ? T.primary : T.inputBg }]}
            onPress={() => setClassId(classId === c.id ? null : c.id)}
          >
            <Text style={{ color: classId === c.id ? '#fff' : T.muted, fontSize: fontSize.xs, fontWeight: fontWeight.semibold }} numberOfLines={1}>{c.Name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Term selector */}
      {terms.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.classFilter} contentContainerStyle={styles.filterContent}>
          {terms.map(t => (
            <TouchableOpacity
              key={t.id}
              style={[styles.classChip, { borderColor: termId === t.id ? T.primary : T.inputBorder, backgroundColor: termId === t.id ? T.primary : T.inputBg }]}
              onPress={() => setTermId(termId === t.id ? null : t.id)}
            >
              <Text style={{ color: termId === t.id ? '#fff' : T.muted, fontSize: fontSize.xs, fontWeight: fontWeight.semibold }}>{t.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {view === 'mark' && (
        <>
          {/* Date input */}
          <View style={styles.datePad}>
            <TextInput
              style={[styles.dateInput, { backgroundColor: T.inputBg, borderColor: T.inputBorder, color: T.text }]}
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={T.placeholder}
            />
          </View>

          {classId && students.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.classFilter} contentContainerStyle={styles.filterContent}>
              {(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'] as AttendanceStatus[]).map(s => (
                <TouchableOpacity
                  key={s}
                  style={[styles.classChip, { borderColor: STATUS_META[s].color, backgroundColor: STATUS_META[s].bg }]}
                  onPress={() => setAllStatus(s)}
                >
                  <Text style={{ color: STATUS_META[s].color, fontSize: fontSize.xs, fontWeight: fontWeight.bold }}>All {s}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          <View style={styles.searchPad}>
            <View style={[styles.searchBox, { backgroundColor: T.inputBg, borderColor: T.inputBorder }]}>
              <Search size={16} color={T.muted} />
              <TextInput style={[styles.searchInput, { color: T.text }]} value={search} onChangeText={setSearch} placeholder="Search students…" placeholderTextColor={T.placeholder} />
            </View>
          </View>

          {!classId ? (
            <View style={styles.emptyPad}><EmptyState emoji="🏫" title="Select a class" subtitle="Choose a class above to mark attendance." /></View>
          ) : dataLoading ? <LoadingState message="Loading students…" /> : (
            <>
              <FlatList
                data={visibleStudents}
                keyExtractor={s => String(s.id)}
                contentContainerStyle={styles.list}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.primary} />}
                ListEmptyComponent={<EmptyState emoji="👤" title="No students" subtitle="No students in this class." />}
                renderItem={({ item: s }) => {
                  const meta = STATUS_META[s.status];
                  return (
                    <TouchableOpacity
                      style={[styles.studentRow, { backgroundColor: T.surface, borderColor: T.border }]}
                      onPress={() => toggleStatus(s.id)}
                      activeOpacity={0.85}
                    >
                      <View style={[styles.studentAvatar, { backgroundColor: meta.bg }]}>
                        <Text style={[styles.avatarText, { color: meta.color }]}>{s.firstName[0]}{s.lastName[0]}</Text>
                      </View>
                      <Text style={[styles.studentName, { color: T.text }]} numberOfLines={1}>{s.firstName} {s.lastName}</Text>
                      <View style={[styles.statusBtn, { backgroundColor: meta.bg, borderColor: meta.color }]}>
                        <Text style={[styles.statusText, { color: meta.color }]}>{meta.shortLabel}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                }}
                showsVerticalScrollIndicator={false}
              />
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: T.primary }]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? <ActivityIndicator size="small" color="#fff" /> : (
                  <><Check size={18} color="#fff" /><Text style={styles.saveBtnText}>Save Attendance</Text></>
                )}
              </TouchableOpacity>
            </>
          )}
        </>
      )}

      {view === 'summary' && (
        <>
          <View style={styles.searchPad}>
            <View style={[styles.searchBox, { backgroundColor: T.inputBg, borderColor: T.inputBorder }]}>
              <Search size={16} color={T.muted} />
              <TextInput style={[styles.searchInput, { color: T.text }]} value={search} onChangeText={setSearch} placeholder="Search students…" placeholderTextColor={T.placeholder} />
            </View>
          </View>
          {!classId ? (
            <View style={styles.emptyPad}><EmptyState emoji="🏫" title="Select a class" subtitle="Choose a class to view attendance summary." /></View>
          ) : summaryLoading ? <LoadingState message="Loading summary…" /> : (
            <FlatList
              data={visibleSummary}
              keyExtractor={s => String(s.studentId)}
              contentContainerStyle={styles.list}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.primary} />}
              ListEmptyComponent={<EmptyState emoji="📊" title="No data" subtitle="No attendance records yet." />}
              renderItem={({ item: s }) => {
                const barW = Math.min(100, s.percentage);
                return (
                  <View style={[styles.summaryRow, { backgroundColor: T.surface, borderColor: T.border }]}>
                    <Text style={[styles.studentName, { color: T.text, marginBottom: spacing[2] }]}>{s.studentName}</Text>
                    <View style={styles.summaryStats}>
                      {(['present', 'absent', 'late', 'excused'] as const).map(k => {
                        const status = k.toUpperCase() as AttendanceStatus;
                        const meta = STATUS_META[status];
                        return (
                          <View key={k} style={styles.summaryStat}>
                            <Text style={[styles.summaryStatNum, { color: meta.color }]}>{(s as unknown as Record<string, number>)[k]}</Text>
                            <Text style={[styles.summaryStatLabel, { color: T.muted }]}>{meta.label}</Text>
                          </View>
                        );
                      })}
                    </View>
                    <View style={[styles.barBg, { backgroundColor: T.elevated }]}>
                      <View style={[styles.barFill, { width: `${barW}%` as `${number}%`, backgroundColor: s.percentage >= 80 ? '#34d399' : s.percentage >= 60 ? '#fbbf24' : '#f87171' }]} />
                    </View>
                    <Text style={[styles.pctText, { color: T.muted }]}>{s.percentage.toFixed(1)}% present</Text>
                  </View>
                );
              }}
              showsVerticalScrollIndicator={false}
            />
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root:          { flex: 1 },
  switchRow:     { flexDirection: 'row', margin: spacing[4], marginBottom: spacing[2], borderRadius: radius.xl, borderWidth: 1, padding: 4, gap: 4 },
  switchBtn:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[2], paddingVertical: spacing[2], borderRadius: radius.lg },
  classFilter:   { maxHeight: 46 },
  filterContent: { paddingHorizontal: spacing[4], paddingVertical: spacing[2], gap: spacing[2], flexDirection: 'row' },
  classChip:     { paddingHorizontal: spacing[3], paddingVertical: spacing[2], borderRadius: 999, borderWidth: 1, maxWidth: 140 },
  datePad:       { paddingHorizontal: spacing[4], paddingBottom: spacing[2] },
  dateInput:     { borderRadius: radius.lg, borderWidth: 1, paddingHorizontal: spacing[4], paddingVertical: spacing[3], fontSize: fontSize.sm },
  searchPad:     { paddingHorizontal: spacing[4], paddingBottom: spacing[2] },
  searchBox:     { flexDirection: 'row', alignItems: 'center', gap: spacing[2], borderRadius: radius.xl, borderWidth: 1, paddingHorizontal: spacing[3], height: 44 },
  searchInput:   { flex: 1, fontSize: fontSize.sm },
  list:          { padding: spacing[4], paddingTop: 0, paddingBottom: spacing[20] },
  emptyPad:      { flex: 1 },
  studentRow:    { flexDirection: 'row', alignItems: 'center', gap: spacing[3], padding: spacing[3], borderRadius: radius.xl, borderWidth: 1, marginBottom: spacing[2] },
  studentAvatar: { width: 38, height: 38, borderRadius: 99, alignItems: 'center', justifyContent: 'center' },
  avatarText:    { fontSize: fontSize.sm, fontWeight: fontWeight.extrabold },
  studentName:   { flex: 1, fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  statusBtn:     { width: 34, height: 34, borderRadius: 99, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  statusText:    { fontSize: fontSize.sm, fontWeight: fontWeight.extrabold },
  saveBtn:       { margin: spacing[4], marginTop: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[2], paddingVertical: spacing[4], borderRadius: radius.xl },
  saveBtnText:   { color: '#fff', fontSize: fontSize.sm, fontWeight: fontWeight.extrabold },
  summaryRow:    { padding: spacing[4], borderRadius: radius.xl, borderWidth: 1, gap: spacing[2], marginBottom: spacing[2] },
  summaryStats:  { flexDirection: 'row', gap: spacing[3] },
  summaryStat:   { alignItems: 'center' },
  summaryStatNum:{ fontSize: fontSize.lg, fontWeight: fontWeight.extrabold },
  summaryStatLabel:{ fontSize: 10, fontWeight: '600' },
  barBg:         { height: 6, borderRadius: 999, overflow: 'hidden' },
  barFill:       { height: '100%', borderRadius: 999 },
  pctText:       { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
});
