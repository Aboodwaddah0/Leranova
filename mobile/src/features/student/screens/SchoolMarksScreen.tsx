import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BarChart2, BookOpen, ChevronDown, ChevronUp } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../shared/hooks/useTheme';
import { Card, LoadingState, EmptyState } from '../../../shared/components';
import { spacing, radius, fontSize, fontWeight } from '../../../shared/theme';
import { fetchMyStudentMarks } from '../services/studentService';
import type { StudentMark } from '../../../types/student';

/* ── helpers (mirrors web StudentSchoolMarksPage) ─────────────────────────── */
const fmt = (v: unknown) => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n.toFixed(1).replace(/\.0$/, '') : '0';
};

const pct = (score: unknown, outOf: unknown) =>
  Number(outOf) > 0 ? (Number(score) / Number(outOf)) * 100 : 0;

function gradeLabel(percent: number): { label: string; color: string; bg: string } {
  if (percent >= 90) return { label: 'A+', color: '#059669', bg: '#d1fae5' };
  if (percent >= 80) return { label: 'A',  color: '#059669', bg: '#d1fae5' };
  if (percent >= 70) return { label: 'B',  color: '#0284c7', bg: '#e0f2fe' };
  if (percent >= 60) return { label: 'C',  color: '#d97706', bg: '#fef3c7' };
  if (percent >= 50) return { label: 'D',  color: '#ea580c', bg: '#ffedd5' };
  return                    { label: 'F',  color: '#dc2626', bg: '#fee2e2' };
}

function typeColor(type: string): { color: string; bg: string } {
  const t = String(type || '').toUpperCase();
  if (t.includes('EXAM') || t.includes('FINAL')) return { color: '#7c3aed', bg: '#ede9fe' };
  if (t.includes('QUIZ'))                          return { color: '#0284c7', bg: '#e0f2fe' };
  if (t.includes('MID'))                           return { color: '#d97706', bg: '#fef3c7' };
  if (t.includes('HOME') || t.includes('ASSIGN'))  return { color: '#0d9488', bg: '#ccfbf1' };
  return { color: '#475569', bg: '#f1f5f9' };
}

function barColorForAvg(avg: number) {
  return avg >= 70 ? '#34d399' : avg >= 50 ? '#fbbf24' : '#f87171';
}

interface SubjectGroup {
  id: number | string;
  name: string;
  course: string;
  avg: number;
  marks: StudentMark[];
}

/* ══════════════════════════════════════════════════════════════════════════ */
export function SchoolMarksScreen() {
  const { T }  = useTheme();
  const insets = useSafeAreaInsets();

  const [marks,      setMarks]      = useState<StudentMark[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded,   setExpanded]   = useState<number | string | null>(null);

  const load = useCallback(async () => {
    const data = await fetchMyStudentMarks();
    setMarks(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const bySubject = useMemo<SubjectGroup[]>(() => {
    const map = new Map<number | string, SubjectGroup>();
    marks.forEach((m) => {
      const key  = m.subject?.id ?? 'unknown';
      const name = m.subject?.name ?? '—';
      const course = (m.subject as any)?.course?.name ?? (m.subject as any)?.course?.Name ?? '';
      if (!map.has(key)) map.set(key, { id: key, name, course, avg: 0, marks: [] });
      map.get(key)!.marks.push(m);
    });
    return Array.from(map.values()).map((g) => ({
      ...g,
      avg: g.marks.length
        ? g.marks.reduce((s, m) => s + pct(m.Numbers, m.OutOf), 0) / g.marks.length
        : 0,
    }));
  }, [marks]);

  return (
    <View style={[styles.root, { backgroundColor: T.background }]}>
      <LinearGradient
        colors={['#4f46e5', '#0f172a', '#5b21b6']}
        style={[styles.header, { paddingTop: insets.top + spacing[4] }]}
      >
        <Text style={styles.eyebrow}>MY MARKS</Text>
        <Text style={styles.headline}>My Marks</Text>
        <Text style={styles.subline}>All marks grouped by subject</Text>
      </LinearGradient>

      {loading ? <LoadingState message="Loading marks…" /> : (
        <ScrollView
          contentContainerStyle={styles.body}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.primary} />}
          showsVerticalScrollIndicator={false}
        >
          {bySubject.length === 0 ? (
            <EmptyState emoji="📊" title="No marks yet" subtitle="Your marks will appear here once your teacher adds them." />
          ) : (
            <>
              {bySubject.map((subject) => {
                const isOpen = expanded === subject.id;
                const sg     = gradeLabel(subject.avg);
                return (
                  <Card key={String(subject.id)} style={styles.subjectCard}>
                    {/* Header row */}
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => setExpanded(isOpen ? null : subject.id)}
                      style={styles.subjectRow}
                    >
                      <View style={styles.subjectIcon}>
                        <BookOpen size={18} color="#6366f1" />
                      </View>
                      <View style={styles.subjectInfo}>
                        <Text style={[styles.subjectName, { color: T.text }]} numberOfLines={1}>
                          {subject.name}
                        </Text>
                        {!!subject.course && (
                          <Text style={[styles.courseName, { color: T.muted }]} numberOfLines={1}>
                            {subject.course}
                          </Text>
                        )}
                      </View>
                      <View style={styles.subjectRight}>
                        <Text style={[styles.avgText, { color: T.text }]}>{fmt(subject.avg)}%</Text>
                        <View style={[styles.gradeBadge, { backgroundColor: sg.bg }]}>
                          <Text style={[styles.gradeText, { color: sg.color }]}>{sg.label}</Text>
                        </View>
                        {isOpen
                          ? <ChevronUp size={15} color={T.muted} />
                          : <ChevronDown size={15} color={T.muted} />}
                      </View>
                    </TouchableOpacity>

                    {/* Progress bar */}
                    <View style={[styles.bar, { backgroundColor: T.elevated }]}>
                      <View style={[styles.barFill, {
                        width: `${Math.min(subject.avg, 100)}%` as any,
                        backgroundColor: barColorForAvg(subject.avg),
                      }]} />
                    </View>

                    {/* Individual marks */}
                    {isOpen && subject.marks.map((mark, idx) => {
                      const p  = pct(mark.Numbers, mark.OutOf);
                      const g  = gradeLabel(p);
                      const tc = typeColor(mark.MarkType);
                      return (
                        <View
                          key={mark.id ?? idx}
                          style={[styles.markRow, { borderTopColor: T.inputBorder }]}
                        >
                          <View style={styles.markLeft}>
                            <View style={[styles.typePill, { backgroundColor: tc.bg }]}>
                              <Text style={[styles.typeText, { color: tc.color }]}>
                                {mark.MarkType || 'Mark'}
                              </Text>
                            </View>
                            <Text style={[styles.markDate, { color: T.muted }]}>
                              {mark.time ? new Date(mark.time).toLocaleDateString('en-GB') : '—'}
                            </Text>
                          </View>
                          <View style={styles.markRight}>
                            <Text style={[styles.markScore, { color: T.text }]}>
                              {fmt(mark.Numbers)}{' '}
                              <Text style={{ color: T.muted, fontWeight: '400' }}>/ {fmt(mark.OutOf)}</Text>
                            </Text>
                            <View style={styles.miniBarWrap}>
                              <View style={[styles.miniBar, { backgroundColor: T.elevated }]}>
                                <View style={[styles.miniBarFill, {
                                  width: `${Math.min(p, 100)}%` as any,
                                  backgroundColor: p >= 50 ? '#34d399' : '#f87171',
                                }]} />
                              </View>
                              <Text style={[styles.pctText, { color: T.muted }]}>{fmt(p)}%</Text>
                            </View>
                            <View style={[styles.gradeBadge, { backgroundColor: g.bg }]}>
                              <Text style={[styles.gradeText, { color: g.color }]}>{g.label}</Text>
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </Card>
                );
              })}
              <Text style={[styles.footer, { color: T.muted }]}>
                Passing threshold is 50% or above
              </Text>
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: spacing[5], paddingBottom: spacing[5], gap: spacing[1],
    borderBottomLeftRadius: radius['2xl'], borderBottomRightRadius: radius['2xl'],
  },
  eyebrow:  { color: '#a5b4fc', fontSize: 11, fontWeight: '800', letterSpacing: 1.4 },
  headline: { color: '#fff', fontSize: fontSize.xl, fontWeight: fontWeight.extrabold },
  subline:  { color: 'rgba(255,255,255,0.45)', fontSize: fontSize.sm },

  body: { padding: spacing[4], paddingBottom: spacing[10], gap: spacing[3] },

  subjectCard: { marginBottom: spacing[2], overflow: 'hidden', padding: 0 },
  subjectRow:  { flexDirection: 'row', alignItems: 'center', gap: spacing[3], padding: spacing[4] },
  subjectIcon: {
    width: 40, height: 40, borderRadius: radius.xl,
    backgroundColor: '#eef2ff', alignItems: 'center', justifyContent: 'center',
  },
  subjectInfo:  { flex: 1, minWidth: 0 },
  subjectName:  { fontSize: fontSize.base, fontWeight: fontWeight.bold },
  courseName:   { fontSize: fontSize.xs, marginTop: 2 },
  subjectRight: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  avgText:      { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  gradeBadge:   { paddingHorizontal: spacing[2], paddingVertical: 2, borderRadius: 999 },
  gradeText:    { fontSize: 11, fontWeight: '700' },

  bar:     { height: 4, marginHorizontal: spacing[4], borderRadius: radius.full, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: radius.full },

  markRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing[4], paddingVertical: spacing[3], borderTopWidth: 1,
  },
  markLeft:  { gap: spacing[1] },
  typePill:  { alignSelf: 'flex-start', paddingHorizontal: spacing[2], paddingVertical: 2, borderRadius: radius.md },
  typeText:  { fontSize: 11, fontWeight: '600' },
  markDate:  { fontSize: fontSize.xs },
  markRight: { alignItems: 'flex-end', gap: spacing[1] },
  markScore: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  miniBarWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  miniBar:   { width: 48, height: 4, borderRadius: radius.full, overflow: 'hidden' },
  miniBarFill: { height: '100%', borderRadius: radius.full },
  pctText:   { fontSize: fontSize.xs },

  footer: { textAlign: 'center', fontSize: fontSize.xs, marginTop: spacing[2] },
});
