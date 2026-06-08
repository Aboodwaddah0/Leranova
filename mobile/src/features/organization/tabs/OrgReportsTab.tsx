import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator, TextInput,
} from 'react-native';
import { FileText, BarChart2, Users, ClipboardList, DollarSign, TrendingUp, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import { spacing, radius, fontSize, fontWeight } from '../../../shared/theme';
import { EmptyState, LoadingState } from '../../../shared/components';
import { fetchReport } from '../services/organizationService';
import type { AcademicYear } from '../../../types/organization';

const REPORTS = [
  { key: 'student-marks',     label: 'Student Marks',       icon: FileText,     color: '#6366f1', bg: 'rgba(99,102,241,0.12)',  desc: 'All marks per student and subject' },
  { key: 'grades',            label: 'Grades',              icon: BarChart2,    color: '#10b981', bg: 'rgba(16,185,129,0.12)',  desc: 'Computed grade results' },
  { key: 'attendance',        label: 'Attendance',          icon: ClipboardList,color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  desc: 'Attendance records by class and date' },
  { key: 'enrollment',        label: 'Enrollment',          icon: Users,        color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)',  desc: 'Enrollment counts per course' },
  { key: 'revenue',           label: 'Revenue',             icon: DollarSign,   color: '#34d399', bg: 'rgba(52,211,153,0.12)',  desc: 'Financial summary and transactions' },
  { key: 'progress',          label: 'Progress',            icon: TrendingUp,   color: '#0ea5e9', bg: 'rgba(14,165,233,0.12)',  desc: 'Student learning progress' },
  { key: 'performance',       label: 'Performance',         icon: BarChart2,    color: '#f43f5e', bg: 'rgba(244,63,94,0.12)',   desc: 'Overall performance metrics' },
  { key: 'quiz-performance',  label: 'Quiz Performance',    icon: FileText,     color: '#a855f7', bg: 'rgba(168,85,247,0.12)',  desc: 'Quiz scores and completion rates' },
] as const;

interface Props {
  orgType: 'SCHOOL' | 'ACADEMY';
  academicYears: AcademicYear[];
  viewingYearId: number | null;
}

export function OrgReportsTab({ orgType, academicYears, viewingYearId }: Props) {
  const { T } = useTheme();

  const [activeReport, setActiveReport] = useState<string | null>(null);
  const [reportData,   setReportData]   = useState<unknown[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [termFilter,   setTermFilter]   = useState('');

  const loadReport = useCallback(async (reportKey: string) => {
    setLoading(true);
    setActiveReport(reportKey);
    setReportData([]);
    const params: Record<string, unknown> = {};
    if (viewingYearId) params.academicYearId = viewingYearId;
    if (termFilter) params.termId = Number(termFilter);
    try {
      const data = await fetchReport(reportKey, params);
      setReportData(Array.isArray(data) ? data : []);
    } catch (e: unknown) {
      Alert.alert('Error', (e as Error).message || `Failed to load ${reportKey} report.`);
      setReportData([]);
    } finally {
      setLoading(false);
    }
  }, [viewingYearId, termFilter]);

  const activeInfo = REPORTS.find(r => r.key === activeReport);

  return (
    <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
      {/* Report type grid */}
      <Text style={[styles.sectionTitle, { color: T.text }]}>Select Report Type</Text>
      <View style={styles.reportGrid}>
        {REPORTS.map(({ key, label, icon: Icon, color, bg, desc }) => {
          const isActive = activeReport === key;
          return (
            <TouchableOpacity
              key={key}
              style={[styles.reportCard, { backgroundColor: isActive ? bg : T.surface, borderColor: isActive ? color : T.border }]}
              onPress={() => loadReport(key)}
              activeOpacity={0.8}
            >
              <View style={[styles.reportIcon, { backgroundColor: isActive ? color : bg }]}>
                <Icon size={18} color={isActive ? '#fff' : color} />
              </View>
              <Text style={[styles.reportLabel, { color: isActive ? color : T.text }]}>{label}</Text>
              <Text style={[styles.reportDesc, { color: T.muted }]} numberOfLines={2}>{desc}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Filters */}
      <View style={[styles.filtersCard, { backgroundColor: T.surface, borderColor: T.border }]}>
        <Text style={[styles.filtersTitle, { color: T.subtext }]}>Filters</Text>
        <View style={styles.filterRow}>
          <Text style={[styles.filterLabel, { color: T.muted }]}>Academic Year:</Text>
          <Text style={[styles.filterValue, { color: T.text }]}>
            {academicYears.find(y => y.id === viewingYearId)?.name ?? 'All'}
          </Text>
        </View>
        <View style={styles.filterRow}>
          <Text style={[styles.filterLabel, { color: T.muted }]}>Term ID:</Text>
          <TextInput
            style={[styles.filterInput, { backgroundColor: T.inputBg, borderColor: T.inputBorder, color: T.text }]}
            value={termFilter}
            onChangeText={setTermFilter}
            placeholder="Leave blank for all"
            placeholderTextColor={T.placeholder}
            keyboardType="number-pad"
          />
        </View>
      </View>

      {/* Report results */}
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={T.primary} />
          <Text style={[styles.loadingText, { color: T.muted }]}>Loading report…</Text>
        </View>
      ) : activeReport && (
        <View style={[styles.resultCard, { backgroundColor: T.surface, borderColor: T.border }]}>
          {activeInfo && (
            <View style={styles.resultHeader}>
              <activeInfo.icon size={16} color={activeInfo.color} />
              <Text style={[styles.resultTitle, { color: T.text }]}>{activeInfo.label}</Text>
              <Text style={[styles.resultCount, { color: T.muted }]}>{reportData.length} rows</Text>
            </View>
          )}

          {reportData.length === 0 ? (
            <EmptyState emoji="📊" title="No data" subtitle="No data available for this report with the current filters." />
          ) : (
            <>
              {/* Table-like display: show first 50 rows */}
              {reportData.slice(0, 50).map((row, idx) => {
                const r = row as Record<string, unknown>;
                const entries = Object.entries(r).slice(0, 6); // Show first 6 fields
                return (
                  <View key={idx} style={[styles.dataRow, { borderTopColor: T.border, backgroundColor: idx % 2 === 0 ? 'transparent' : T.elevated }]}>
                    {entries.map(([k, v]) => (
                      <View key={k} style={styles.dataCell}>
                        <Text style={[styles.dataKey, { color: T.muted }]}>{k}</Text>
                        <Text style={[styles.dataVal, { color: T.text }]} numberOfLines={1}>
                          {v === null || v === undefined ? '—' : String(v)}
                        </Text>
                      </View>
                    ))}
                  </View>
                );
              })}
              {reportData.length > 50 && (
                <Text style={[styles.moreText, { color: T.muted }]}>
                  Showing 50 of {reportData.length} rows. Use filters to narrow results.
                </Text>
              )}
            </>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body:          { padding: spacing[4], gap: spacing[4], paddingBottom: spacing[10] },
  sectionTitle:  { fontSize: fontSize.sm, fontWeight: fontWeight.extrabold, textTransform: 'uppercase', letterSpacing: 0.5 },
  reportGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[3] },
  reportCard:    { width: '47%', borderRadius: radius.xl, borderWidth: 1.5, padding: spacing[4], gap: spacing[2] },
  reportIcon:    { width: 40, height: 40, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  reportLabel:   { fontSize: fontSize.sm, fontWeight: fontWeight.extrabold },
  reportDesc:    { fontSize: fontSize.xs, lineHeight: 16 },
  filtersCard:   { borderRadius: radius.xl, borderWidth: 1, padding: spacing[4], gap: spacing[3] },
  filtersTitle:  { fontSize: fontSize.xs, fontWeight: fontWeight.extrabold, textTransform: 'uppercase' },
  filterRow:     { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  filterLabel:   { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, width: 110 },
  filterValue:   { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  filterInput:   { flex: 1, borderRadius: radius.lg, borderWidth: 1, paddingHorizontal: spacing[3], paddingVertical: spacing[2], fontSize: fontSize.sm },
  loadingBox:    { padding: spacing[8], alignItems: 'center', gap: spacing[3] },
  loadingText:   { fontSize: fontSize.sm },
  resultCard:    { borderRadius: radius['2xl'], borderWidth: 1, overflow: 'hidden' },
  resultHeader:  { flexDirection: 'row', alignItems: 'center', gap: spacing[2], padding: spacing[4] },
  resultTitle:   { flex: 1, fontSize: fontSize.sm, fontWeight: fontWeight.extrabold },
  resultCount:   { fontSize: fontSize.xs },
  dataRow:       { padding: spacing[3], borderTopWidth: 1, flexWrap: 'wrap', flexDirection: 'row', gap: spacing[2] },
  dataCell:      { minWidth: '45%' },
  dataKey:       { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  dataVal:       { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  moreText:      { padding: spacing[4], fontSize: fontSize.xs, textAlign: 'center' },
});
