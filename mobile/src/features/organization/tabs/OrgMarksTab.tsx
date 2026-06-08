import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, TextInput, ScrollView, Alert,
} from 'react-native';
import { BarChart2, Search, Filter } from 'lucide-react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import { spacing, radius, fontSize, fontWeight } from '../../../shared/theme';
import { LoadingState, EmptyState } from '../../../shared/components';
import { fetchMarks } from '../services/organizationService';
import type { OrgMark, AcademicYear, Term } from '../../../types/organization';

const fmt = (v: unknown) => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n.toFixed(1).replace(/\.0$/, '') : '0';
};
const pct = (score: unknown, outOf: unknown) =>
  Number(outOf) > 0 ? (Number(score) / Number(outOf)) * 100 : 0;
function gradeLabel(percent: number) {
  if (percent >= 90) return { label: 'A+', color: '#059669', bg: '#d1fae5' };
  if (percent >= 80) return { label: 'A',  color: '#059669', bg: '#d1fae5' };
  if (percent >= 70) return { label: 'B',  color: '#0284c7', bg: '#e0f2fe' };
  if (percent >= 60) return { label: 'C',  color: '#d97706', bg: '#fef3c7' };
  if (percent >= 50) return { label: 'D',  color: '#ea580c', bg: '#ffedd5' };
  return { label: 'F', color: '#dc2626', bg: '#fee2e2' };
}
function typeColor(type: string) {
  const t = String(type || '').toUpperCase();
  if (t.includes('EXAM') || t.includes('FINAL')) return { color: '#7c3aed', bg: '#ede9fe' };
  if (t.includes('QUIZ')) return { color: '#0284c7', bg: '#e0f2fe' };
  if (t.includes('MID'))  return { color: '#d97706', bg: '#fef3c7' };
  return { color: '#475569', bg: '#f1f5f9' };
}

interface Props {
  orgType: 'SCHOOL' | 'ACADEMY';
  academicYears: AcademicYear[];
  viewingYearId: number | null;
}

interface SubjectGroup {
  subjectId: number | string;
  subjectName: string;
  courseName: string;
  marks: OrgMark[];
  avg: number;
}

export function OrgMarksTab({ orgType, academicYears, viewingYearId }: Props) {
  const { T } = useTheme();

  const [marks,      setMarks]      = useState<OrgMark[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search,     setSearch]     = useState('');
  const [expanded,   setExpanded]   = useState<string | number | null>(null);

  // Filters
  const [termFilter,    setTermFilter]    = useState('');
  const [gradeLvlFilter, setGradeLvlFilter] = useState('');
  const [showFilters,    setShowFilters]   = useState(false);

  const activeYear = academicYears.find(y => y.id === viewingYearId);

  const load = useCallback(async () => {
    const params: Record<string, unknown> = {};
    if (viewingYearId) params.academicYearId = viewingYearId;
    if (termFilter)    params.termId = Number(termFilter);
    if (gradeLvlFilter) params.gradeLevel = Number(gradeLvlFilter);
    try {
      const data = await fetchMarks(params);
      setMarks(data);
    } catch {
      Alert.alert('Error', 'Failed to load marks.');
    } finally {
      setLoading(false);
    }
  }, [viewingYearId, termFilter, gradeLvlFilter]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const bySubject = useMemo<SubjectGroup[]>(() => {
    const map = new Map<string | number, SubjectGroup>();
    marks.forEach(m => {
      const key = m.subjectId ?? `_${m.subjectName}`;
      if (!map.has(key)) {
        map.set(key, {
          subjectId: key,
          subjectName: m.subjectName ?? 'Unknown Subject',
          courseName: m.courseName ?? '',
          marks: [],
          avg: 0,
        });
      }
      map.get(key)!.marks.push(m);
    });
    map.forEach(g => {
      const total = g.marks.reduce((s, m) => s + pct(m.score, m.outOf), 0);
      g.avg = g.marks.length ? total / g.marks.length : 0;
    });
    return Array.from(map.values()).sort((a, b) => a.subjectName.localeCompare(b.subjectName));
  }, [marks]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return bySubject;
    return bySubject.filter(g =>
      g.subjectName.toLowerCase().includes(q) ||
      g.courseName.toLowerCase().includes(q) ||
      g.marks.some(m => (m.studentName ?? '').toLowerCase().includes(q))
    );
  }, [bySubject, search]);

  if (loading) return <LoadingState message="Loading marks…" />;

  return (
    <View style={[styles.root, { backgroundColor: T.background }]}>
      {/* Toolbar */}
      <View style={styles.toolbar}>
        <View style={[styles.searchBox, { backgroundColor: T.inputBg, borderColor: T.inputBorder }]}>
          <Search size={16} color={T.muted} />
          <TextInput style={[styles.searchInput, { color: T.text }]} value={search} onChangeText={setSearch} placeholder="Search subject, student…" placeholderTextColor={T.placeholder} />
        </View>
        <TouchableOpacity
          style={[styles.filterBtn, { backgroundColor: showFilters ? T.primary : T.elevated }]}
          onPress={() => setShowFilters(p => !p)}
        >
          <Filter size={16} color={showFilters ? '#fff' : T.muted} />
        </TouchableOpacity>
      </View>

      {/* Session banner */}
      {activeYear && (
        <View style={[styles.sessionBanner, { backgroundColor: activeYear.isActive ? 'rgba(99,102,241,0.08)' : 'rgba(245,158,11,0.08)', borderColor: activeYear.isActive ? 'rgba(99,102,241,0.3)' : 'rgba(245,158,11,0.3)' }]}>
          <Text style={{ color: activeYear.isActive ? '#6366f1' : '#b45309', fontSize: fontSize.xs, fontWeight: fontWeight.bold }}>
            {activeYear.isActive ? '📅' : '📦'} {activeYear.name}{!activeYear.isActive ? ' (Archived)' : ''}
          </Text>
        </View>
      )}

      {/* Filters */}
      {showFilters && (
        <View style={[styles.filtersBox, { backgroundColor: T.surface, borderColor: T.border }]}>
          <TextInput
            style={[styles.filterInput, { backgroundColor: T.inputBg, borderColor: T.inputBorder, color: T.text }]}
            value={termFilter}
            onChangeText={setTermFilter}
            placeholder="Term ID"
            placeholderTextColor={T.placeholder}
            keyboardType="number-pad"
          />
          {orgType === 'SCHOOL' && (
            <TextInput
              style={[styles.filterInput, { backgroundColor: T.inputBg, borderColor: T.inputBorder, color: T.text }]}
              value={gradeLvlFilter}
              onChangeText={setGradeLvlFilter}
              placeholder="Grade Level"
              placeholderTextColor={T.placeholder}
              keyboardType="number-pad"
            />
          )}
          <TouchableOpacity style={[styles.applyBtn, { backgroundColor: T.primary }]} onPress={load}>
            <Text style={{ color: '#fff', fontSize: fontSize.xs, fontWeight: fontWeight.bold }}>Apply</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={visible}
        keyExtractor={g => String(g.subjectId)}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.primary} />}
        ItemSeparatorComponent={() => <View style={{ height: spacing[2] }} />}
        ListEmptyComponent={<EmptyState emoji="📊" title="No marks found" subtitle="Marks will appear here once entered." />}
        renderItem={({ item: g }) => {
          const gl = gradeLabel(g.avg);
          const isOpen = expanded === g.subjectId;
          const barW = Math.min(100, g.avg);
          return (
            <TouchableOpacity
              style={[styles.subjectCard, { backgroundColor: T.surface, borderColor: T.border }]}
              onPress={() => setExpanded(isOpen ? null : g.subjectId)}
              activeOpacity={0.85}
            >
              <View style={styles.subjectHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.subjectName, { color: T.text }]}>{g.subjectName}</Text>
                  {!!g.courseName && <Text style={[styles.courseName, { color: T.muted }]}>{g.courseName}</Text>}
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <View style={[styles.gradePill, { backgroundColor: gl.bg }]}>
                    <Text style={[styles.gradeText, { color: gl.color }]}>{gl.label}</Text>
                  </View>
                  <Text style={[styles.avgText, { color: T.muted }]}>{fmt(g.avg)}%</Text>
                </View>
              </View>
              {/* Progress bar */}
              <View style={[styles.barBg, { backgroundColor: T.elevated }]}>
                <View style={[styles.barFill, { width: `${barW}%` as `${number}%`, backgroundColor: g.avg >= 70 ? '#34d399' : g.avg >= 50 ? '#fbbf24' : '#f87171' }]} />
              </View>
              <Text style={[styles.markCount, { color: T.muted }]}>{g.marks.length} mark entry{g.marks.length !== 1 ? 's' : ''}</Text>

              {/* Expanded mark rows */}
              {isOpen && g.marks.map(m => {
                const tc = typeColor(m.type);
                const p = pct(m.score, m.outOf);
                return (
                  <View key={m.id} style={[styles.markRow, { borderTopColor: T.border }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.markStudent, { color: T.text }]}>{m.studentName ?? `Student #${m.studentId}`}</Text>
                      <View style={[styles.typePill, { backgroundColor: tc.bg }]}>
                        <Text style={[styles.typeText, { color: tc.color }]}>{m.type}</Text>
                      </View>
                    </View>
                    <Text style={[styles.markScore, { color: T.text }]}>{fmt(m.score)}/{fmt(m.outOf)}</Text>
                    <Text style={[styles.markPct, { color: p >= 50 ? '#10b981' : '#ef4444' }]}>{p.toFixed(0)}%</Text>
                  </View>
                );
              })}
            </TouchableOpacity>
          );
        }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root:          { flex: 1 },
  toolbar:       { flexDirection: 'row', gap: spacing[3], padding: spacing[4], paddingBottom: spacing[2] },
  searchBox:     { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing[2], borderRadius: radius.xl, borderWidth: 1, paddingHorizontal: spacing[3], height: 44 },
  searchInput:   { flex: 1, fontSize: fontSize.sm },
  filterBtn:     { width: 44, height: 44, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center' },
  sessionBanner: { marginHorizontal: spacing[4], marginBottom: spacing[2], padding: spacing[3], borderRadius: radius.lg, borderWidth: 1 },
  filtersBox:    { margin: spacing[4], marginTop: 0, padding: spacing[3], borderRadius: radius.xl, borderWidth: 1, gap: spacing[2] },
  filterInput:   { borderRadius: radius.lg, borderWidth: 1, paddingHorizontal: spacing[3], paddingVertical: spacing[2], fontSize: fontSize.sm },
  applyBtn:      { paddingVertical: spacing[2], borderRadius: radius.lg, alignItems: 'center' },
  list:          { padding: spacing[4], paddingTop: 0, paddingBottom: spacing[10] },
  subjectCard:   { borderRadius: radius['2xl'], borderWidth: 1, padding: spacing[4], gap: spacing[2] },
  subjectHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  subjectName:   { fontSize: fontSize.sm, fontWeight: fontWeight.extrabold },
  courseName:    { fontSize: fontSize.xs, marginTop: 2 },
  gradePill:     { paddingHorizontal: spacing[2], paddingVertical: 2, borderRadius: 999 },
  gradeText:     { fontSize: 11, fontWeight: '800' },
  avgText:       { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  barBg:         { height: 6, borderRadius: 999, overflow: 'hidden' },
  barFill:       { height: '100%', borderRadius: 999 },
  markCount:     { fontSize: 11, fontWeight: '600' },
  markRow:       { flexDirection: 'row', alignItems: 'center', gap: spacing[2], paddingTop: spacing[3], borderTopWidth: 1, marginTop: spacing[1] },
  markStudent:   { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, marginBottom: 4 },
  typePill:      { alignSelf: 'flex-start', paddingHorizontal: spacing[2], paddingVertical: 2, borderRadius: 999 },
  typeText:      { fontSize: 10, fontWeight: '700' },
  markScore:     { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  markPct:       { fontSize: fontSize.xs, fontWeight: fontWeight.bold, minWidth: 38, textAlign: 'right' },
});
