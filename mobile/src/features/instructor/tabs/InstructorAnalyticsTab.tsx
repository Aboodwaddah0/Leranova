import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl, Alert, TouchableOpacity,
} from 'react-native';
import {
  Users, Zap, Star, TrendingUp, Target, AlertTriangle, Trophy,
  Brain, CheckCircle,
} from 'lucide-react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import { spacing, radius, fontSize, fontWeight } from '../../../shared/theme';
import { LoadingState, EmptyState } from '../../../shared/components';
import { fetchAnalytics, fetchMySubjects } from '../services/instructorService';
import type { InstructorAnalytics, InstructorSubject } from '../../../types/instructor';

const timeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const FEED_ICONS: Record<string, string> = {
  LESSON_COMPLETE: '📖', QUIZ_PASS: '✅', QUIZ_PERFECT: '🌟', DAILY_LOGIN: '☀️',
  FLASHCARD_SESSION: '🃏', MINDMAP_SESSION: '🧠', CHATBOT_SESSION: '💬',
};

const formatSubjectChipName = (s: InstructorSubject, isSchool: boolean): string => {
  if (isSchool && s.courseGradeLevel !== null && s.courseGradeLevel !== undefined) {
    return `${s.name} (Class ${s.courseGradeLevel})`;
  }
  return s.name;
};

interface Props { isSchool: boolean; }

export function InstructorAnalyticsTab({ isSchool }: Props) {
  const { T } = useTheme();

  const [analytics,  setAnalytics]  = useState<InstructorAnalytics | null>(null);
  const [subjects,   setSubjects]   = useState<InstructorSubject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (subjectId: number | null) => {
    try {
      const data = await fetchAnalytics(subjectId ?? undefined);
      setAnalytics(data);
    } catch {
      Alert.alert('Error', 'Failed to load analytics.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMySubjects().then(setSubjects).catch(() => {}); }, []);
  useEffect(() => { load(selectedSubjectId); }, [load, selectedSubjectId]);
  const onRefresh = useCallback(async () => { setRefreshing(true); await load(selectedSubjectId); setRefreshing(false); }, [load, selectedSubjectId]);

  const courseSelector = subjects.length > 0 && (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
      <TouchableOpacity
        onPress={() => setSelectedSubjectId(null)}
        style={[styles.chip, { borderColor: T.border, backgroundColor: selectedSubjectId === null ? T.primary : T.surface }]}
      >
        <Text style={[styles.chipText, { color: selectedSubjectId === null ? '#fff' : T.text }]}>{isSchool ? 'All Classes' : 'All Courses'}</Text>
      </TouchableOpacity>
      {subjects.map(s => (
        <TouchableOpacity
          key={s.id}
          onPress={() => setSelectedSubjectId(s.id)}
          style={[styles.chip, { borderColor: T.border, backgroundColor: selectedSubjectId === s.id ? T.primary : T.surface }]}
        >
          <Text style={[styles.chipText, { color: selectedSubjectId === s.id ? '#fff' : T.text }]} numberOfLines={1}>{formatSubjectChipName(s, isSchool)}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  if (loading) return <LoadingState message="Loading analytics…" />;
  if (!analytics) return <EmptyState emoji="📊" title="No analytics data" subtitle="Analytics will appear here as students engage." />;

  const { overview, subjectPerformance = [], performanceTrend = [], topStudents = [], atRiskStudents = [], activityFeed = [], aiCoaching } = analytics;
  const maxPerf = Math.max(...subjectPerformance.map(s => s.completionRate), 1);
  const maxTrend = Math.max(...performanceTrend.map(t => t.completions), 1);

  return (
    <ScrollView
      contentContainerStyle={styles.body}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.primary} />}
      showsVerticalScrollIndicator={false}
    >
      {courseSelector}

      {/* Stat cards */}
      {overview && (
        <View style={styles.statsGrid}>
          {[
            { label: 'Total Students', value: overview.totalStudents,               icon: Users,       color: '#6366f1', bg: 'rgba(99,102,241,0.12)' },
            { label: 'Active 7d',      value: overview.activeStudents,              icon: Zap,         color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
            { label: 'Avg XP',         value: overview.avgXp.toFixed(0),            icon: Star,        color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
            { label: 'Avg Level',      value: overview.avgLevel.toFixed(1),         icon: TrendingUp,  color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
            { label: 'Completion %',   value: `${overview.avgCompletionRate.toFixed(0)}%`, icon: Target,color: '#0ea5e9', bg: 'rgba(14,165,233,0.12)' },
            { label: 'Quiz Pass %',    value: `${(overview.quizPassRate ?? 0).toFixed(0)}%`, icon: CheckCircle, color: '#34d399', bg: 'rgba(52,211,153,0.12)' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <View key={label} style={[styles.statCard, { backgroundColor: T.surface, borderColor: T.border }]}>
              <View style={[styles.statIcon, { backgroundColor: bg }]}>
                <Icon size={18} color={color} />
              </View>
              <Text style={[styles.statValue, { color: T.text }]}>{value}</Text>
              <Text style={[styles.statLabel, { color: T.muted }]}>{label}</Text>
            </View>
          ))}
        </View>
      )}

      {/* AI Coaching */}
      {aiCoaching && (
        <View style={[styles.card, { backgroundColor: 'rgba(99,102,241,0.06)', borderColor: 'rgba(99,102,241,0.2)' }]}>
          <View style={styles.cardTitleRow}>
            <Brain size={16} color="#6366f1" />
            <Text style={[styles.cardTitle, { color: '#6366f1' }]}>{aiCoaching.aiPowered ? 'AI Coaching' : 'Coaching Tips'}</Text>
          </View>
          {!!aiCoaching.summary && (
            <Text style={[styles.aiSummary, { color: T.subtext }]}>{aiCoaching.summary}</Text>
          )}
          {(aiCoaching.insights ?? []).length > 0 && (
            <>
              <Text style={[styles.subSectionTitle, { color: T.text }]}>Insights</Text>
              {aiCoaching.insights!.map((insight, i) => (
                <View key={i} style={styles.bulletRow}>
                  <Text style={{ color: insight.type === 'warning' ? '#ef4444' : insight.type === 'success' ? '#10b981' : '#6366f1', fontSize: 16 }}>•</Text>
                  <Text style={[styles.bulletText, { color: T.subtext }]}>{insight.message}</Text>
                </View>
              ))}
            </>
          )}
        </View>
      )}

      {/* Subject performance bar chart */}
      {subjectPerformance.length > 0 && (
        <View style={[styles.card, { backgroundColor: T.surface, borderColor: T.border }]}>
          <Text style={[styles.cardTitle, { color: T.text }]}>Subject Performance</Text>
          {subjectPerformance.map((s, i) => (
            <View key={`sp-${s.id}-${i}`} style={styles.perfRow}>
              <Text style={[styles.perfName, { color: T.text }]} numberOfLines={1}>{s.name}</Text>
              <View style={[styles.perfBarBg, { backgroundColor: T.elevated }]}>
                <View style={[styles.perfBarFill, { width: `${(s.completionRate / maxPerf) * 100}%` as `${number}%`, backgroundColor: s.completionRate >= 70 ? '#34d399' : s.completionRate >= 50 ? '#fbbf24' : '#f87171' }]} />
              </View>
              <Text style={[styles.perfPct, { color: T.muted }]}>{s.completionRate.toFixed(0)}%</Text>
            </View>
          ))}
        </View>
      )}

      {/* 7-day trend */}
      {performanceTrend.length > 0 && (
        <View style={[styles.card, { backgroundColor: T.surface, borderColor: T.border }]}>
          <Text style={[styles.cardTitle, { color: T.text }]}>7-Day Activity Trend</Text>
          <View style={styles.trendChart}>
            {performanceTrend.slice(-7).map((t, i) => (
              <View key={i} style={styles.trendCol}>
                <Text style={[styles.trendVal, { color: T.muted }]}>{t.completions}</Text>
                <View style={[styles.trendBar, { height: Math.max(4, (t.completions / maxTrend) * 80), backgroundColor: '#6366f1' }]} />
                <Text style={[styles.trendDate, { color: T.muted }]}>{String(t.date).slice(5, 10)}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* At-risk students */}
      {atRiskStudents.length > 0 && (
        <View style={[styles.card, { backgroundColor: T.surface, borderColor: T.border }]}>
          <View style={styles.cardTitleRow}>
            <AlertTriangle size={14} color="#ef4444" />
            <Text style={[styles.cardTitle, { color: '#ef4444' }]}>At-Risk Students</Text>
          </View>
          {atRiskStudents.map((s, i) => (
            <View key={`risk-${s.id ?? i}`} style={[styles.atRiskRow, { borderBottomColor: T.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, { color: T.text }]}>{s.name}</Text>
                <Text style={[styles.sub, { color: T.muted }]}>
                  {s.daysSince}d inactive · {s.completionRate.toFixed(0)}% completion
                </Text>
              </View>
              <View style={[styles.riskBadge, { backgroundColor: 'rgba(239,68,68,0.1)' }]}>
                <Text style={{ color: '#ef4444', fontSize: 10, fontWeight: '700' }}>AT RISK</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Top students */}
      {topStudents.length > 0 && (
        <View style={[styles.card, { backgroundColor: T.surface, borderColor: T.border }]}>
          <View style={styles.cardTitleRow}>
            <Trophy size={14} color="#f59e0b" />
            <Text style={[styles.cardTitle, { color: T.text }]}>Top Students</Text>
          </View>
          {topStudents.slice(0, 5).map((s, i) => (
            <View key={`top-${s.id ?? i}`} style={[styles.topRow, { borderBottomColor: T.border }]}>
              <View style={[styles.rankBadge, { backgroundColor: i === 0 ? '#fbbf24' : i === 1 ? '#94a3b8' : i === 2 ? '#f97316' : T.elevated }]}>
                <Text style={{ color: i < 3 ? '#fff' : T.muted, fontSize: fontSize.xs, fontWeight: fontWeight.extrabold }}>#{s.rank}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, { color: T.text }]}>{s.name}</Text>
                <Text style={[styles.sub, { color: T.muted }]}>Lvl {s.level} · {s.xp} XP · {s.streak}🔥</Text>
              </View>
              <Text style={[styles.lessons, { color: T.muted }]}>{s.completedLessons} lessons</Text>
            </View>
          ))}
        </View>
      )}

      {/* Activity feed */}
      {activityFeed.length > 0 && (
        <View style={[styles.card, { backgroundColor: T.surface, borderColor: T.border }]}>
          <Text style={[styles.cardTitle, { color: T.text }]}>Recent Activity</Text>
          {activityFeed.slice(0, 10).map((a, i) => (
            <View key={i} style={[styles.feedRow, { borderBottomColor: T.border }]}>
              <Text style={styles.feedIcon}>{FEED_ICONS[a.eventType] ?? '📌'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, { color: T.text }]}>{a.studentName}</Text>
                <Text style={[styles.sub, { color: T.muted }]}>{a.label}</Text>
              </View>
              <Text style={[styles.feedTime, { color: T.muted }]}>{timeAgo(a.createdAt)}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body:          { padding: spacing[4], gap: spacing[4], paddingBottom: spacing[10] },
  chipRow:       { gap: spacing[2], paddingBottom: spacing[1] },
  chip:          { paddingHorizontal: spacing[3], paddingVertical: spacing[2], borderRadius: 999, borderWidth: 1, maxWidth: 160 },
  chipText:      { fontSize: fontSize.xs, fontWeight: fontWeight.bold },
  statsGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[3] },
  statCard:      { flex: 1, minWidth: '42%', borderRadius: radius.xl, borderWidth: 1, padding: spacing[3], alignItems: 'center', gap: spacing[2] },
  statIcon:      { width: 40, height: 40, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center' },
  statValue:     { fontSize: fontSize.xl, fontWeight: fontWeight.extrabold },
  statLabel:     { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', textAlign: 'center' },
  card:          { borderRadius: radius['2xl'], borderWidth: 1, padding: spacing[4], gap: spacing[3] },
  cardTitleRow:  { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  cardTitle:     { fontSize: fontSize.sm, fontWeight: fontWeight.extrabold },
  aiSummary:     { fontSize: fontSize.sm, lineHeight: 20 },
  subSectionTitle:{ fontSize: fontSize.xs, fontWeight: fontWeight.extrabold, textTransform: 'uppercase', letterSpacing: 0.5 },
  bulletRow:     { flexDirection: 'row', gap: spacing[2], alignItems: 'flex-start' },
  bulletText:    { flex: 1, fontSize: fontSize.sm, lineHeight: 18 },
  perfRow:       { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  perfName:      { width: 100, fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  perfBarBg:     { flex: 1, height: 8, borderRadius: 999, overflow: 'hidden' },
  perfBarFill:   { height: '100%', borderRadius: 999 },
  perfPct:       { fontSize: fontSize.xs, fontWeight: fontWeight.bold, width: 36, textAlign: 'right' },
  trendChart:    { flexDirection: 'row', alignItems: 'flex-end', height: 100, gap: spacing[1] },
  trendCol:      { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  trendBar:      { width: '70%', borderRadius: 4, minHeight: 4 },
  trendVal:      { fontSize: 9, fontWeight: '600' },
  trendDate:     { fontSize: 9, fontWeight: '600' },
  atRiskRow:     { flexDirection: 'row', alignItems: 'center', gap: spacing[3], paddingBottom: spacing[3], borderBottomWidth: 1 },
  riskBadge:     { paddingHorizontal: spacing[2], paddingVertical: 2, borderRadius: 999 },
  topRow:        { flexDirection: 'row', alignItems: 'center', gap: spacing[3], paddingBottom: spacing[3], borderBottomWidth: 1 },
  rankBadge:     { width: 34, height: 34, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  feedRow:       { flexDirection: 'row', alignItems: 'center', gap: spacing[3], paddingBottom: spacing[2], borderBottomWidth: 1 },
  feedIcon:      { fontSize: 20 },
  feedTime:      { fontSize: fontSize.xs },
  name:          { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  sub:           { fontSize: fontSize.xs, marginTop: 2 },
  lessons:       { fontSize: fontSize.xs },
});
