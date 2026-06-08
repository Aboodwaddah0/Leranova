import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, Alert, TextInput, ActivityIndicator, ScrollView,
} from 'react-native';
import { BarChart2, Trophy, Cpu, Filter, Search } from 'lucide-react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import { spacing, radius, fontSize, fontWeight } from '../../../shared/theme';
import { LoadingState, EmptyState } from '../../../shared/components';
import { computeGrades, fetchComputedGrades, fetchGradeRankings } from '../services/organizationService';
import type { ComputedGrade, GradeRanking, AcademicYear, Term } from '../../../types/organization';

const fmt = (v: unknown) => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n.toFixed(1).replace(/\.0$/, '') : '0';
};
function gradeLabel(percent: number) {
  if (percent >= 90) return { label: 'A+', color: '#059669', bg: '#d1fae5' };
  if (percent >= 80) return { label: 'A',  color: '#059669', bg: '#d1fae5' };
  if (percent >= 70) return { label: 'B',  color: '#0284c7', bg: '#e0f2fe' };
  if (percent >= 60) return { label: 'C',  color: '#d97706', bg: '#fef3c7' };
  if (percent >= 50) return { label: 'D',  color: '#ea580c', bg: '#ffedd5' };
  return { label: 'F', color: '#dc2626', bg: '#fee2e2' };
}

interface Props {
  orgType: 'SCHOOL' | 'ACADEMY';
  academicYears: AcademicYear[];
  viewingYearId: number | null;
  terms: Term[];
}

export function OrgGradesTab({ orgType, academicYears, viewingYearId, terms }: Props) {
  const { T } = useTheme();

  const [view,       setView]       = useState<'grades' | 'rankings'>('grades');
  const [grades,     setGrades]     = useState<ComputedGrade[]>([]);
  const [rankings,   setRankings]   = useState<GradeRanking[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [computing,  setComputing]  = useState(false);
  const [search,     setSearch]     = useState('');

  // Filters
  const [termId, setTermId] = useState('');
  const [gradeLvl, setGradeLvl] = useState('');

  const activeTerms = useMemo(() =>
    terms.filter(t => t.academicYearId === viewingYearId),
    [terms, viewingYearId]
  );

  const load = useCallback(async () => {
    setLoading(true);
    const params: Record<string, unknown> = {};
    if (viewingYearId) params.academicYearId = viewingYearId;
    if (termId) params.termId = Number(termId);
    if (gradeLvl) params.gradeLevel = Number(gradeLvl);
    try {
      if (view === 'grades') {
        const data = await fetchComputedGrades(params);
        setGrades(data);
      } else {
        const data = await fetchGradeRankings(params);
        setRankings(data);
      }
    } catch {
      Alert.alert('Error', 'Failed to load grades.');
    } finally {
      setLoading(false);
    }
  }, [view, viewingYearId, termId, gradeLvl]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const handleCompute = async () => {
    if (!termId) { Alert.alert('Select Term', 'Please select a term before computing grades.'); return; }
    setComputing(true);
    try {
      await computeGrades(Number(termId));
      Alert.alert('Success', 'Grades computed successfully.');
      load();
    } catch (e: unknown) {
      Alert.alert('Error', (e as Error).message || 'Failed to compute grades.');
    } finally {
      setComputing(false);
    }
  };

  const visibleGrades = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return grades;
    return grades.filter(g => (g.studentName ?? '').toLowerCase().includes(q) || (g.subjectName ?? '').toLowerCase().includes(q));
  }, [grades, search]);

  const visibleRankings = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rankings;
    return rankings.filter(r => (r.studentName ?? '').toLowerCase().includes(q));
  }, [rankings, search]);

  return (
    <View style={[styles.root, { backgroundColor: T.background }]}>
      {/* Tab switcher */}
      <View style={[styles.switchRow, { backgroundColor: T.surface, borderColor: T.border }]}>
        <TouchableOpacity style={[styles.switchBtn, view === 'grades' && { backgroundColor: T.primary }]} onPress={() => setView('grades')}>
          <BarChart2 size={14} color={view === 'grades' ? '#fff' : T.muted} />
          <Text style={{ color: view === 'grades' ? '#fff' : T.muted, fontSize: fontSize.xs, fontWeight: fontWeight.bold }}>Grades</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.switchBtn, view === 'rankings' && { backgroundColor: T.primary }]} onPress={() => setView('rankings')}>
          <Trophy size={14} color={view === 'rankings' ? '#fff' : T.muted} />
          <Text style={{ color: view === 'rankings' ? '#fff' : T.muted, fontSize: fontSize.xs, fontWeight: fontWeight.bold }}>Rankings</Text>
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <View style={styles.filtersRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.chipRow}>
            {/* Term chips */}
            <TouchableOpacity
              style={[styles.chip, { borderColor: !termId ? T.primary : T.inputBorder, backgroundColor: !termId ? T.primary : T.inputBg }]}
              onPress={() => setTermId('')}
            >
              <Text style={{ color: !termId ? '#fff' : T.muted, fontSize: fontSize.xs, fontWeight: fontWeight.semibold }}>All Terms</Text>
            </TouchableOpacity>
            {activeTerms.map(t => (
              <TouchableOpacity
                key={t.id}
                style={[styles.chip, { borderColor: termId === String(t.id) ? T.primary : T.inputBorder, backgroundColor: termId === String(t.id) ? T.primary : T.inputBg }]}
                onPress={() => setTermId(String(t.id))}
              >
                <Text style={{ color: termId === String(t.id) ? '#fff' : T.muted, fontSize: fontSize.xs, fontWeight: fontWeight.semibold }}>{t.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {orgType === 'SCHOOL' && (
        <View style={styles.filtersRow}>
          <TextInput
            style={[styles.filterInput, { backgroundColor: T.inputBg, borderColor: T.inputBorder, color: T.text }]}
            value={gradeLvl}
            onChangeText={setGradeLvl}
            placeholder="Filter by Grade Level"
            placeholderTextColor={T.placeholder}
            keyboardType="number-pad"
          />
        </View>
      )}

      {/* Compute button */}
      <View style={styles.computeRow}>
        <TouchableOpacity
          style={[styles.computeBtn, { backgroundColor: T.primary }]}
          onPress={handleCompute}
          disabled={computing}
        >
          {computing
            ? <ActivityIndicator size="small" color="#fff" />
            : <><Cpu size={16} color="#fff" /><Text style={{ color: '#fff', fontSize: fontSize.sm, fontWeight: fontWeight.bold }}>Compute Grades</Text></>
          }
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchPad}>
        <View style={[styles.searchBox, { backgroundColor: T.inputBg, borderColor: T.inputBorder }]}>
          <Search size={16} color={T.muted} />
          <TextInput style={[styles.searchInput, { color: T.text }]} value={search} onChangeText={setSearch} placeholder="Search student…" placeholderTextColor={T.placeholder} />
        </View>
      </View>

      {loading ? <LoadingState message="Loading…" /> : view === 'grades' ? (
        <FlatList
          data={visibleGrades}
          keyExtractor={g => String(g.id)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.primary} />}
          ItemSeparatorComponent={() => <View style={{ height: spacing[2] }} />}
          ListEmptyComponent={<EmptyState emoji="📈" title="No computed grades" subtitle="Compute grades for a term to see results." />}
          renderItem={({ item: g }) => {
            const gl = gradeLabel(g.percentage);
            return (
              <View style={[styles.gradeRow, { backgroundColor: T.surface, borderColor: T.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.studentName, { color: T.text }]}>{g.studentName ?? `Student #${g.studentId}`}</Text>
                  <Text style={[styles.subName, { color: T.muted }]}>{g.subjectName ?? ''}{g.gradeLevel ? ` — Grade ${g.gradeLevel}` : ''}</Text>
                  <View style={[styles.barBg, { backgroundColor: T.elevated, marginTop: spacing[2] }]}>
                    <View style={[styles.barFill, { width: `${Math.min(100, g.percentage)}%` as `${number}%`, backgroundColor: g.percentage >= 70 ? '#34d399' : g.percentage >= 50 ? '#fbbf24' : '#f87171' }]} />
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end', gap: spacing[1] }}>
                  <View style={[styles.gradePill, { backgroundColor: gl.bg }]}>
                    <Text style={[styles.gradeText, { color: gl.color }]}>{gl.label}</Text>
                  </View>
                  <Text style={[styles.pctText, { color: T.muted }]}>{fmt(g.percentage)}%</Text>
                  <View style={[styles.passBadge, { backgroundColor: g.isPassed ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)' }]}>
                    <Text style={{ color: g.isPassed ? '#10b981' : '#ef4444', fontSize: 10, fontWeight: '700' }}>
                      {g.isPassed ? 'PASS' : 'FAIL'}
                    </Text>
                  </View>
                </View>
              </View>
            );
          }}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          data={visibleRankings}
          keyExtractor={r => String(r.rank)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.primary} />}
          ListEmptyComponent={<EmptyState emoji="🏆" title="No rankings yet" subtitle="Compute grades first to see rankings." />}
          renderItem={({ item: r }) => (
            <View style={[styles.rankRow, { backgroundColor: T.surface, borderColor: T.border }]}>
              <View style={[styles.rankBadge, { backgroundColor: r.rank === 1 ? '#fbbf24' : r.rank === 2 ? '#94a3b8' : r.rank === 3 ? '#f97316' : T.elevated }]}>
                <Text style={{ color: r.rank <= 3 ? '#fff' : T.muted, fontSize: fontSize.sm, fontWeight: fontWeight.extrabold }}>#{r.rank}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.studentName, { color: T.text }]}>{r.studentName ?? `Student #${r.studentId}`}</Text>
                {r.gradeLevel !== null && r.gradeLevel !== undefined && (
                  <Text style={[styles.subName, { color: T.muted }]}>Grade {r.gradeLevel}</Text>
                )}
              </View>
              <Text style={[styles.pctText, { color: T.primary, fontWeight: fontWeight.extrabold }]}>{fmt(r.average)}%</Text>
            </View>
          )}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1 },
  switchRow:   { flexDirection: 'row', margin: spacing[4], marginBottom: spacing[2], borderRadius: radius.xl, borderWidth: 1, padding: 4, gap: 4 },
  switchBtn:   { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[2], paddingVertical: spacing[2], borderRadius: radius.lg },
  filtersRow:  { paddingHorizontal: spacing[4], paddingBottom: spacing[2] },
  chipRow:     { flexDirection: 'row', gap: spacing[2] },
  chip:        { paddingHorizontal: spacing[3], paddingVertical: spacing[2], borderRadius: 999, borderWidth: 1 },
  filterInput: { borderRadius: radius.lg, borderWidth: 1, paddingHorizontal: spacing[3], paddingVertical: spacing[2], fontSize: fontSize.sm },
  computeRow:  { paddingHorizontal: spacing[4], paddingBottom: spacing[2] },
  computeBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[2], paddingVertical: spacing[3], borderRadius: radius.xl },
  searchPad:   { paddingHorizontal: spacing[4], paddingBottom: spacing[2] },
  searchBox:   { flexDirection: 'row', alignItems: 'center', gap: spacing[2], borderRadius: radius.xl, borderWidth: 1, paddingHorizontal: spacing[3], height: 44 },
  searchInput: { flex: 1, fontSize: fontSize.sm },
  list:        { padding: spacing[4], paddingTop: 0, paddingBottom: spacing[10] },
  gradeRow:    { flexDirection: 'row', alignItems: 'center', gap: spacing[3], padding: spacing[4], borderRadius: radius.xl, borderWidth: 1 },
  studentName: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  subName:     { fontSize: fontSize.xs, marginTop: 2 },
  barBg:       { height: 4, borderRadius: 999, overflow: 'hidden' },
  barFill:     { height: '100%', borderRadius: 999 },
  gradePill:   { paddingHorizontal: spacing[2], paddingVertical: 2, borderRadius: 999 },
  gradeText:   { fontSize: 11, fontWeight: '800' },
  pctText:     { fontSize: fontSize.xs, fontWeight: fontWeight.bold },
  passBadge:   { paddingHorizontal: spacing[2], paddingVertical: 2, borderRadius: 999 },
  rankRow:     { flexDirection: 'row', alignItems: 'center', gap: spacing[3], padding: spacing[4], borderRadius: radius.xl, borderWidth: 1 },
  rankBadge:   { width: 40, height: 40, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
});
