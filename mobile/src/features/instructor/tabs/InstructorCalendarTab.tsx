import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, Alert, ScrollView,
} from 'react-native';
import { CalendarDays } from 'lucide-react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import { spacing, radius, fontSize, fontWeight } from '../../../shared/theme';
import { LoadingState, EmptyState } from '../../../shared/components';
import { fetchCalendar } from '../services/instructorService';
import type { CalendarEvent, EventType } from '../../../types/organization';

const EVENT_META: Record<string, { label: string; color: string; bg: string }> = {
  HOLIDAY:      { label: 'Holiday',      color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  EXAM:         { label: 'Exam',          color: '#ef4444', bg: 'rgba(239,68,68,0.12)'  },
  PTA_MEETING:  { label: 'PTA Meeting',   color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
  ACTIVITY:     { label: 'Activity',      color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  ANNOUNCEMENT: { label: 'Announcement',  color: '#6366f1', bg: 'rgba(99,102,241,0.12)' },
  OTHER:        { label: 'Other',         color: '#64748b', bg: 'rgba(100,116,139,0.12)'},
};

interface Props { isSchool: boolean; }

export function InstructorCalendarTab({ isSchool }: Props) {
  const { T } = useTheme();

  const [events,     setEvents]     = useState<CalendarEvent[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  const load = useCallback(async () => {
    try {
      const data = await fetchCalendar();
      setEvents(data);
    } catch {
      Alert.alert('Error', 'Failed to load calendar.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, [load]);

  const visible = useMemo(() => {
    if (typeFilter === 'ALL') return events;
    return events.filter(e => e.type === typeFilter);
  }, [events, typeFilter]);

  if (loading) return <LoadingState message="Loading calendar…" />;

  const typeMeta = (type: string) => EVENT_META[type] ?? EVENT_META.OTHER;

  return (
    <View style={[styles.root, { backgroundColor: T.background }]}>
      {/* Type filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar} contentContainerStyle={styles.filterContent}>
        {['ALL', ...Object.keys(EVENT_META)].map(type => {
          const meta = type === 'ALL' ? { label: 'All', color: T.primary, bg: T.primary } : EVENT_META[type];
          const active = typeFilter === type;
          return (
            <TouchableOpacity
              key={type}
              style={[styles.chip, { borderColor: active ? meta.color : T.inputBorder, backgroundColor: active ? meta.color : T.inputBg }]}
              onPress={() => setTypeFilter(type)}
            >
              <Text style={{ color: active ? '#fff' : T.muted, fontSize: fontSize.xs, fontWeight: fontWeight.semibold }}>
                {type === 'ALL' ? 'All' : meta.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <Text style={[styles.countText, { color: T.muted }]}>{visible.length} event{visible.length !== 1 ? 's' : ''}</Text>

      <FlatList
        data={visible}
        keyExtractor={e => String(e.id)}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.primary} />}
        ItemSeparatorComponent={() => <View style={{ height: spacing[2] }} />}
        ListEmptyComponent={<EmptyState emoji="📅" title="No events" subtitle="School calendar events will appear here." />}
        showsVerticalScrollIndicator={false}
        renderItem={({ item: e }) => {
          const tm = typeMeta(e.type);
          return (
            <View style={[styles.card, { backgroundColor: T.surface, borderColor: T.border }]}>
              <View style={[styles.strip, { backgroundColor: tm.color }]} />
              <View style={{ flex: 1, padding: spacing[3] }}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.eventTitle, { color: T.text }]}>{e.title}</Text>
                    <View style={[styles.typePill, { backgroundColor: tm.bg }]}>
                      <Text style={[styles.typeText, { color: tm.color }]}>{tm.label}</Text>
                    </View>
                  </View>
                  {e.isPublished !== undefined && (
                    <View style={[styles.pubBadge, { backgroundColor: e.isPublished ? 'rgba(16,185,129,0.12)' : 'rgba(100,116,139,0.12)' }]}>
                      <Text style={{ color: e.isPublished ? '#10b981' : '#64748b', fontSize: 10, fontWeight: '700' }}>
                        {e.isPublished ? 'PUBLISHED' : 'DRAFT'}
                      </Text>
                    </View>
                  )}
                </View>
                {!!e.description && (
                  <Text style={[styles.desc, { color: T.muted }]} numberOfLines={2}>{e.description}</Text>
                )}
                <View style={styles.dateRow}>
                  <CalendarDays size={12} color={T.muted} />
                  <Text style={[styles.dateText, { color: T.muted }]}>
                    {String(e.startDate).slice(0, 10)}{e.endDate ? ` → ${String(e.endDate).slice(0, 10)}` : ''}
                  </Text>
                </View>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root:         { flex: 1 },
  filterBar:    { maxHeight: 46 },
  filterContent:{ paddingHorizontal: spacing[4], paddingVertical: spacing[2], gap: spacing[2], flexDirection: 'row' },
  chip:         { paddingHorizontal: spacing[3], paddingVertical: spacing[2], borderRadius: 999, borderWidth: 1 },
  countText:    { paddingHorizontal: spacing[4], paddingBottom: spacing[2], fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  list:         { padding: spacing[4], paddingTop: 0, paddingBottom: spacing[10] },
  card:         { flexDirection: 'row', borderRadius: radius.xl, borderWidth: 1, overflow: 'hidden' },
  strip:        { width: 4 },
  cardHeader:   { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing[2] },
  eventTitle:   { fontSize: fontSize.sm, fontWeight: fontWeight.extrabold, marginBottom: 4 },
  typePill:     { alignSelf: 'flex-start', paddingHorizontal: spacing[2], paddingVertical: 2, borderRadius: 999 },
  typeText:     { fontSize: 10, fontWeight: '700' },
  pubBadge:     { paddingHorizontal: spacing[2], paddingVertical: 2, borderRadius: 999 },
  desc:         { fontSize: fontSize.xs, marginBottom: spacing[2] },
  dateRow:      { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  dateText:     { fontSize: fontSize.xs },
});
