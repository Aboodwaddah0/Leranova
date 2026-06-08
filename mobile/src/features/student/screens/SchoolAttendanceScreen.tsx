import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ClipboardList } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../shared/hooks/useTheme';
import { LoadingState, EmptyState } from '../../../shared/components';
import { spacing, radius, fontSize, fontWeight } from '../../../shared/theme';
import { fetchMyAttendance } from '../services/studentService';
import type { StudentAttendanceRecord, StudentAttendanceStatus } from '../../../types/student';

/* ── Status meta (mirrors web StudentAttendancePage exactly) ─────────────── */
const STATUS_META: Record<StudentAttendanceStatus, { label: string; color: string; bg: string; icon: string }> = {
  PRESENT: { label: 'Present', color: '#10b981', bg: 'rgba(16,185,129,0.12)',  icon: '✓' },
  ABSENT:  { label: 'Absent',  color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   icon: '✗' },
  LATE:    { label: 'Late',    color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  icon: '!' },
  EXCUSED: { label: 'Excused', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', icon: '~' },
};

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });

/* ══════════════════════════════════════════════════════════════════════════ */
export function SchoolAttendanceScreen() {
  const { T }  = useTheme();
  const insets = useSafeAreaInsets();

  const [records,    setRecords]    = useState<StudentAttendanceRecord[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter,     setFilter]     = useState<StudentAttendanceStatus | 'ALL'>('ALL');

  const load = useCallback(async () => {
    const data = await fetchMyAttendance();
    setRecords(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const counts = useMemo(() =>
    Object.fromEntries(
      (Object.keys(STATUS_META) as StudentAttendanceStatus[]).map((s) => [
        s, records.filter((r) => r.status === s).length,
      ])
    ) as Record<StudentAttendanceStatus, number>,
  [records]);

  const visible = filter === 'ALL' ? records : records.filter((r) => r.status === filter);

  const toggleFilter = (s: StudentAttendanceStatus) =>
    setFilter((prev) => (prev === s ? 'ALL' : s));

  return (
    <View style={[styles.root, { backgroundColor: T.background }]}>
      <LinearGradient
        colors={['#4f46e5', '#0f172a', '#5b21b6']}
        style={[styles.header, { paddingTop: insets.top + spacing[4] }]}
      >
        <View style={styles.titleRow}>
          <ClipboardList size={20} color="#a5b4fc" />
          <Text style={styles.eyebrow}>ATTENDANCE RECORD</Text>
        </View>
        <Text style={styles.headline}>My Attendance</Text>
        <Text style={styles.subline}>Your daily attendance record</Text>
      </LinearGradient>

      {loading ? <LoadingState message="Loading attendance…" /> : (
        <ScrollView
          contentContainerStyle={styles.body}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.primary} />}
          showsVerticalScrollIndicator={false}
        >
          {records.length === 0 ? (
            <EmptyState emoji="📋" title="No attendance records yet" subtitle="Your attendance records will appear here." />
          ) : (
            <>
              {/* Stat cards — tappable to filter */}
              <View style={styles.statsGrid}>
                {(Object.keys(STATUS_META) as StudentAttendanceStatus[]).map((s) => {
                  const meta   = STATUS_META[s];
                  const active = filter === s;
                  return (
                    <TouchableOpacity
                      key={s}
                      activeOpacity={0.75}
                      onPress={() => toggleFilter(s)}
                      style={[
                        styles.statCard,
                        { backgroundColor: active ? meta.color : meta.bg },
                      ]}
                    >
                      <Text style={[styles.statNum, { color: active ? '#fff' : meta.color }]}>
                        {counts[s]}
                      </Text>
                      <Text style={[styles.statLabel, { color: active ? 'rgba(255,255,255,0.9)' : meta.color }]}>
                        {meta.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Records */}
              <View style={[styles.listCard, { backgroundColor: T.surface, borderColor: T.inputBorder }]}>
                {visible.length === 0 ? (
                  <View style={styles.filterEmpty}>
                    <Text style={[styles.filterEmptyText, { color: T.muted }]}>
                      No records match this filter
                    </Text>
                    <TouchableOpacity onPress={() => setFilter('ALL')}>
                      <Text style={{ color: T.primary, fontSize: fontSize.xs, marginTop: spacing[1] }}>
                        Show all
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  visible.map((rec) => {
                    const meta = STATUS_META[rec.status] ?? STATUS_META.PRESENT;
                    return (
                      <View key={rec.id} style={[styles.row, { borderBottomColor: T.inputBorder }]}>
                        <View style={[styles.iconCircle, { backgroundColor: meta.bg }]}>
                          <Text style={[styles.iconText, { color: meta.color }]}>{meta.icon}</Text>
                        </View>
                        <View style={styles.rowInfo}>
                          <Text style={[styles.rowDate, { color: T.text }]} numberOfLines={1}>
                            {fmtDate(rec.date)}
                          </Text>
                          {!!rec.note && (
                            <Text style={[styles.rowNote, { color: T.muted }]} numberOfLines={1}>
                              {rec.note}
                            </Text>
                          )}
                        </View>
                        <View style={[styles.badge, { backgroundColor: meta.bg }]}>
                          <Text style={[styles.badgeText, { color: meta.color }]}>{meta.label}</Text>
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
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
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  eyebrow:  { color: '#a5b4fc', fontSize: 11, fontWeight: '800', letterSpacing: 1.4 },
  headline: { color: '#fff', fontSize: fontSize.xl, fontWeight: fontWeight.extrabold },
  subline:  { color: 'rgba(255,255,255,0.45)', fontSize: fontSize.sm },

  body: { padding: spacing[4], paddingBottom: spacing[10], gap: spacing[4] },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[3] },
  statCard:  { flex: 1, minWidth: '40%', borderRadius: radius.xl, padding: spacing[4], alignItems: 'center' },
  statNum:   { fontSize: fontSize['2xl'], fontWeight: fontWeight.extrabold },
  statLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginTop: 2 },

  listCard: { borderRadius: radius['2xl'], borderWidth: 1, overflow: 'hidden' },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[3],
    paddingHorizontal: spacing[4], paddingVertical: spacing[3],
    borderBottomWidth: 1,
  },
  iconCircle: { width: 34, height: 34, borderRadius: 99, alignItems: 'center', justifyContent: 'center' },
  iconText:   { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  rowInfo:    { flex: 1, minWidth: 0 },
  rowDate:    { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  rowNote:    { fontSize: fontSize.xs, marginTop: 2 },
  badge:      { paddingHorizontal: spacing[3], paddingVertical: 4, borderRadius: 999 },
  badgeText:  { fontSize: 11, fontWeight: '700' },

  filterEmpty:     { padding: spacing[8], alignItems: 'center' },
  filterEmptyText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
});
