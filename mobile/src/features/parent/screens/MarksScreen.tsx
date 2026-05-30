import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BarChart2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../../shared/hooks/useTheme';
import { Card, Badge, LoadingState, EmptyState } from '../../../shared/components';
import { spacing, radius, fontSize, fontWeight } from '../../../shared/theme';
import { fetchParentChildrenMarks } from '../services/parentService';
import { formatMark, markPercent } from '../../../shared/utils/format';
import { formatDate } from '../../../shared/utils/date';
import type { ChildMark } from '../../../types/parent';

export function ParentMarksScreen() {
  const { T }  = useTheme();
  const insets = useSafeAreaInsets();

  const [marks,      setMarks]      = useState<ChildMark[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchParentChildrenMarks();
      setMarks(data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  if (loading) return <LoadingState message="Loading marks…" />;

  return (
    <View style={[styles.root, { backgroundColor: T.background }]}>
      <LinearGradient
        colors={['#5b21b6', '#0f172a', '#312e81']}
        style={[styles.header, { paddingTop: insets.top + spacing[4] }]}
      >
        <BarChart2 size={28} color="#fff" />
        <Text style={styles.headerTitle}>Children Marks</Text>
        <Text style={styles.headerSub}>{marks.length} records</Text>
      </LinearGradient>

      <FlatList
        data={marks}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.primary} />}
        ListEmptyComponent={<EmptyState emoji="📊" title="No marks yet" subtitle="Marks will appear here once teachers add them." />}
        renderItem={({ item }) => <MarkCard mark={item} T={T} />}
      />
    </View>
  );
}

function MarkCard({ mark, T }: { mark: ChildMark; T: ReturnType<typeof useTheme>['T'] }) {
  const pct      = markPercent(mark.Numbers, mark.OutOf);
  const passing  = pct >= 50;
  const barColor = pct >= 80 ? '#34d399' : pct >= 50 ? '#6366f1' : '#f87171';

  return (
    <Card style={styles.markCard}>
      <View style={styles.markTop}>
        <View style={styles.markLeft}>
          <Text style={[styles.markChild, { color: T.text }]}>👤 {mark.childName}</Text>
          <Text style={[styles.subjectName, { color: T.subtext }]}>{mark.subject.name}</Text>
          {mark.subject.course && (
            <Text style={[styles.courseName, { color: T.muted }]}>{mark.subject.course.name}</Text>
          )}
        </View>
        <View style={styles.markRight}>
          <Text style={[styles.markScore, { color: passing ? '#34d399' : '#f87171' }]}>
            {formatMark(mark.Numbers, mark.OutOf)}
          </Text>
          <Badge label={mark.MarkType} variant="primary" />
        </View>
      </View>
      <View style={[styles.bar, { backgroundColor: T.elevated }]}>
        <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: barColor }]} />
      </View>
      <View style={styles.markFooter}>
        <Text style={[styles.pct, { color: T.muted }]}>{pct}%</Text>
        <Text style={[styles.markDate, { color: T.muted }]}>{formatDate(mark.time)}</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    alignItems: 'center', paddingHorizontal: spacing[5],
    paddingBottom: spacing[6], gap: spacing[1],
    borderBottomLeftRadius:  radius['2xl'],
    borderBottomRightRadius: radius['2xl'],
  },
  headerTitle: { color: '#fff', fontSize: fontSize.xl, fontWeight: fontWeight.bold },
  headerSub:   { color: 'rgba(255,255,255,0.55)', fontSize: fontSize.sm },

  list: { padding: spacing[4], paddingBottom: spacing[8] },
  markCard:  { marginBottom: spacing[3] },
  markTop:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing[3] },
  markLeft:  { flex: 1 },
  markRight: { alignItems: 'flex-end', gap: spacing[1] },
  markChild: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  subjectName: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, marginTop: 2 },
  courseName:  { fontSize: fontSize.xs, marginTop: 2 },
  markScore:   { fontSize: fontSize.xl, fontWeight: fontWeight.extrabold },
  bar:     { height: 6, borderRadius: radius.full, overflow: 'hidden', marginBottom: spacing[2] },
  barFill: { height: '100%', borderRadius: radius.full },
  markFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  pct:      { fontSize: fontSize.xs, fontWeight: fontWeight.bold },
  markDate: { fontSize: fontSize.xs },
});
