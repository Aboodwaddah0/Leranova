import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CalendarDays } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../shared/hooks/useTheme';
import { spacing, radius, fontSize, fontWeight } from '../../../shared/theme';
import { fetchParentCalendar } from '../services/parentService';
import type { CalendarEvent, CalendarEventType } from '../../../types/parent';

/* ── Colour / label meta (mirrors the web exactly) ───────────────────────── */
const TYPE_META: Record<string, { label: string; color: string; bg: string }> = {
  HOLIDAY:      { label: 'Holiday',      color: '#10b981', bg: 'rgba(16,185,129,0.12)'  },
  EXAM:         { label: 'Exam',         color: '#ef4444', bg: 'rgba(239,68,68,0.12)'   },
  PTA_MEETING:  { label: 'PTA Meeting',  color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)'  },
  ACTIVITY:     { label: 'Activity',     color: '#f59e0b', bg: 'rgba(245,158,11,0.12)'  },
  ANNOUNCEMENT: { label: 'Announcement', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)'  },
  OTHER:        { label: 'Other',        color: '#64748b', bg: 'rgba(100,116,139,0.12)' },
};

const FILTER_TABS: Array<CalendarEventType | 'ALL'> = [
  'ALL', 'HOLIDAY', 'EXAM', 'PTA_MEETING', 'ACTIVITY', 'ANNOUNCEMENT', 'OTHER',
];

function fmtDate(raw: string): string {
  if (!raw) return '—';
  return new Date(raw).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/* ══════════════════════════════════════════════════════════════════════════ */
export function ParentCalendarScreen() {
  const { T }  = useTheme();
  const insets = useSafeAreaInsets();

  const [events,     setEvents]     = useState<CalendarEvent[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter,     setFilter]     = useState<CalendarEventType | 'ALL'>('ALL');

  const load = useCallback(async () => {
    const data = await fetchParentCalendar();
    setEvents(data);
    setLoading(false);
  }, []);

  useEffect(() => { setLoading(true); load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const filtered = useMemo(
    () => filter === 'ALL' ? events : events.filter(e => e.type === filter),
    [events, filter],
  );

  return (
    <View style={[styles.root, { backgroundColor: T.background }]}>

      {/* ── Gradient header ── */}
      <LinearGradient
        colors={['#5b21b6', '#0f172a', '#312e81']}
        style={[styles.header, { paddingTop: insets.top + spacing[4] }]}
      >
        <View style={styles.titleRow}>
          <CalendarDays size={22} color="#a78bfa" />
          <Text style={styles.eyebrow}>SCHOOL CALENDAR</Text>
        </View>
        <Text style={styles.headline}>Events &amp; Occasions</Text>
        <Text style={styles.subline}>All published school events</Text>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Filter chips (mirrors web) ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          {FILTER_TABS.map(t => {
            const meta   = t !== 'ALL' ? TYPE_META[t] : null;
            const active = filter === t;
            return (
              <TouchableOpacity
                key={t}
                onPress={() => setFilter(t)}
                activeOpacity={0.75}
                style={[
                  styles.chip,
                  active
                    ? { backgroundColor: meta?.color ?? '#6366f1', borderColor: 'transparent' }
                    : { backgroundColor: 'transparent', borderColor: T.inputBorder },
                ]}
              >
                <Text style={[styles.chipText, { color: active ? '#fff' : T.muted }]}>
                  {t === 'ALL' ? 'All' : (meta?.label ?? t)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── Event list ── */}
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={T.primary} size="large" />
          </View>
        ) : filtered.length === 0 ? (
          <View style={[styles.empty, { borderColor: T.inputBorder, backgroundColor: T.elevated }]}>
            <Text style={[styles.emptyText, { color: T.muted }]}>No events found</Text>
          </View>
        ) : (
          filtered.map(ev => <EventCard key={ev.id} event={ev} T={T} />)
        )}
      </ScrollView>
    </View>
  );
}

/* ── EventCard — mirrors web card layout ──────────────────────────────────── */
function EventCard({ event, T }: { event: CalendarEvent; T: ReturnType<typeof useTheme>['T'] }) {
  const meta      = TYPE_META[event.type] ?? TYPE_META.OTHER;
  const singleDay = event.startDate.slice(0, 10) === event.endDate.slice(0, 10);

  return (
    <View style={[styles.card, { backgroundColor: T.surface, borderColor: T.inputBorder }]}>
      {/* Left colour bar */}
      <View style={[styles.bar, { backgroundColor: meta.color }]} />

      <View style={styles.cardBody}>
        {/* Title + type badge */}
        <View style={styles.cardTop}>
          <Text style={[styles.cardTitle, { color: T.text }]} numberOfLines={2}>
            {event.title}
          </Text>
          <View style={[styles.badge, { backgroundColor: meta.bg }]}>
            <Text style={[styles.badgeText, { color: meta.color }]}>{meta.label}</Text>
          </View>
        </View>

        {/* Description */}
        {!!event.description && (
          <Text style={[styles.cardDesc, { color: T.subtext }]}>{event.description}</Text>
        )}

        {/* Date */}
        <Text style={[styles.cardDate, { color: T.muted }]}>
          {fmtDate(event.startDate)}
          {!singleDay ? ` → ${fmtDate(event.endDate)}` : ''}
        </Text>
      </View>
    </View>
  );
}

/* ── Styles ───────────────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  root: { flex: 1 },

  header: {
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[5],
    gap: spacing[1],
    borderBottomLeftRadius:  radius['2xl'],
    borderBottomRightRadius: radius['2xl'],
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginBottom: spacing[1] },
  eyebrow:  { color: '#a78bfa', fontSize: 11, fontWeight: '800', letterSpacing: 1.4 },
  headline: { color: '#fff', fontSize: fontSize.xl, fontWeight: fontWeight.extrabold },
  subline:  { color: 'rgba(255,255,255,0.45)', fontSize: fontSize.sm },

  body: { padding: spacing[4], paddingBottom: spacing[10], gap: spacing[3] },

  /* filter chips */
  chips: { flexDirection: 'row', gap: spacing[2], paddingBottom: spacing[1] },
  chip: {
    paddingHorizontal: spacing[3], paddingVertical: 6,
    borderRadius: 999, borderWidth: 1,
  },
  chipText: { fontSize: 12, fontWeight: '700' },

  /* loading / empty */
  center: { paddingVertical: spacing[10], alignItems: 'center' },
  empty:  {
    marginTop: spacing[4], padding: spacing[8],
    borderRadius: radius.xl, borderWidth: 2, borderStyle: 'dashed',
    alignItems: 'center',
  },
  emptyText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },

  /* event card — mirrors web */
  card: {
    flexDirection: 'row',
    borderRadius: radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  bar:      { width: 6, backgroundColor: '#10b981' },
  cardBody: { flex: 1, padding: spacing[4], gap: spacing[1] },
  cardTop:  { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[2], flexWrap: 'wrap' },
  cardTitle: { flex: 1, fontSize: fontSize.sm, fontWeight: fontWeight.extrabold },
  badge:     { paddingHorizontal: spacing[2], paddingVertical: 2, borderRadius: 999 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  cardDesc:  { fontSize: fontSize.xs, lineHeight: 18 },
  cardDate:  { fontSize: 11, marginTop: 2 },
});
