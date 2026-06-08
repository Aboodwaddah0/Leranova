import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl, Alert,
} from 'react-native';
import { Clock } from 'lucide-react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import { spacing, radius, fontSize, fontWeight } from '../../../shared/theme';
import { LoadingState, EmptyState } from '../../../shared/components';
import { fetchMyTimetable } from '../services/instructorService';
import type { InstructorTimetableSlot } from '../../../types/instructor';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#0ea5e9', '#34d399'];

interface Props { isSchool: boolean; }

export function InstructorTimetableTab({ isSchool }: Props) {
  const { T } = useTheme();

  const [slots,      setSlots]      = useState<InstructorTimetableSlot[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchMyTimetable();
      setSlots(data);
    } catch {
      Alert.alert('Error', 'Failed to load timetable.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, [load]);

  if (loading) return <LoadingState message="Loading timetable…" />;

  // Group by day
  const byDay: Record<number, InstructorTimetableSlot[]> = {};
  slots.forEach(s => {
    if (!byDay[s.dayOfWeek]) byDay[s.dayOfWeek] = [];
    byDay[s.dayOfWeek].push(s);
  });
  // Sort each day's slots by time
  Object.values(byDay).forEach(arr => arr.sort((a, b) => a.startTime.localeCompare(b.startTime)));

  const activeDays = Object.keys(byDay).map(Number).sort();

  if (activeDays.length === 0) {
    return <EmptyState emoji="🗓️" title="No timetable" subtitle="Your teaching schedule will appear here once assigned." />;
  }

  return (
    <ScrollView
      contentContainerStyle={styles.body}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.primary} />}
      showsVerticalScrollIndicator={false}
    >
      {activeDays.map(day => (
        <View key={day} style={[styles.daySection, { backgroundColor: T.surface, borderColor: T.border }]}>
          {/* Day header */}
          <View style={[styles.dayHeader, { backgroundColor: DAY_COLORS[day] + '18' }]}>
            <View style={[styles.dayDot, { backgroundColor: DAY_COLORS[day] }]} />
            <Text style={[styles.dayName, { color: DAY_COLORS[day] }]}>
              {DAYS[day] ?? `Day ${day + 1}`}
            </Text>
            <Text style={[styles.slotCount, { color: DAY_COLORS[day] }]}>
              {byDay[day].length} class{byDay[day].length !== 1 ? 'es' : ''}
            </Text>
          </View>

          {/* Slots */}
          {byDay[day].map(slot => (
            <View key={slot.id} style={[styles.slotRow, { borderTopColor: T.border }]}>
              <View style={[styles.timePill, { backgroundColor: DAY_COLORS[day] + '18' }]}>
                <Clock size={12} color={DAY_COLORS[day]} />
                <Text style={[styles.timeText, { color: DAY_COLORS[day] }]}>
                  {slot.startTime}–{slot.endTime}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.subjectName, { color: T.text }]}>{slot.subjectName ?? '—'}</Text>
                {!!slot.courseName && (
                  <Text style={[styles.courseName, { color: T.muted }]}>{slot.courseName}</Text>
                )}
              </View>
              {!!slot.roomNumber && (
                <View style={[styles.roomTag, { backgroundColor: T.elevated }]}>
                  <Text style={[styles.roomText, { color: T.muted }]}>Room {slot.roomNumber}</Text>
                </View>
              )}
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body:         { padding: spacing[4], gap: spacing[3], paddingBottom: spacing[10] },
  daySection:   { borderRadius: radius['2xl'], borderWidth: 1, overflow: 'hidden' },
  dayHeader:    { flexDirection: 'row', alignItems: 'center', gap: spacing[2], padding: spacing[3] },
  dayDot:       { width: 8, height: 8, borderRadius: 99 },
  dayName:      { flex: 1, fontSize: fontSize.sm, fontWeight: fontWeight.extrabold },
  slotCount:    { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  slotRow:      { flexDirection: 'row', alignItems: 'center', gap: spacing[3], padding: spacing[3], borderTopWidth: 1 },
  timePill:     { flexDirection: 'row', alignItems: 'center', gap: spacing[1], paddingHorizontal: spacing[2], paddingVertical: 4, borderRadius: 999 },
  timeText:     { fontSize: 11, fontWeight: '700' },
  subjectName:  { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  courseName:   { fontSize: fontSize.xs, marginTop: 2 },
  roomTag:      { paddingHorizontal: spacing[2], paddingVertical: 4, borderRadius: radius.lg },
  roomText:     { fontSize: 11, fontWeight: '600' },
});
