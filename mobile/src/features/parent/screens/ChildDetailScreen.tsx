import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, FlatList, TouchableOpacity,
  StyleSheet, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, MessageSquare, BarChart2, CheckCircle2, BookOpen, ChevronDown, ChevronUp, ClipboardList } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../shared/hooks/useTheme';
import { Avatar, Card, Badge, EmptyState, LoadingState } from '../../../shared/components';
import { spacing, radius, fontSize, fontWeight } from '../../../shared/theme';
import { fetchMyNotes, markNoteRead, fetchParentChildrenMarks, fetchChildrenAttendance } from '../services/parentService';
import { timeAgo, formatDate } from '../../../shared/utils/date';
import { formatMark, markPercent } from '../../../shared/utils/format';
import type { NoteGroup, GroupNote, Mark, ChildMarksGroup, AttendanceRecord, ChildAttendanceGroup } from '../../../types/parent';
import type { ParentStackScreenProps } from '../../../types/navigation';

type Props = ParentStackScreenProps<'ChildDetail'>;

/* ── grade helpers ────────────────────────────────────────────────────────── */
function gradeLabel(pct: number): { label: string; color: string } {
  if (pct >= 90) return { label: 'A+', color: '#059669' };
  if (pct >= 80) return { label: 'A',  color: '#059669' };
  if (pct >= 70) return { label: 'B',  color: '#0284c7' };
  if (pct >= 60) return { label: 'C',  color: '#d97706' };
  if (pct >= 50) return { label: 'D',  color: '#ea580c' };
  return { label: 'F', color: '#dc2626' };
}

function barColor(pct: number) {
  return pct >= 80 ? '#34d399' : pct >= 50 ? '#6366f1' : '#f87171';
}

/* ── Subject grouped type ─────────────────────────────────────────────────── */
interface SubjectGroup {
  subjectId: number | string;
  subjectName: string;
  courseName?: string;
  avg: number;
  marks: Mark[];
}

function groupMarksBySubject(marks: Mark[]): SubjectGroup[] {
  const map = new Map<string | number, SubjectGroup>();
  marks.forEach((m) => {
    const key  = m.subject?.id ?? 'unknown';
    const name = m.subject?.name ?? '—';
    if (!map.has(key)) {
      map.set(key, {
        subjectId:   key,
        subjectName: name,
        courseName:  m.subject?.course?.name,
        avg:         0,
        marks:       [],
      });
    }
    map.get(key)!.marks.push(m);
  });
  return Array.from(map.values()).map((g) => ({
    ...g,
    avg: g.marks.length
      ? g.marks.reduce((s, m) => s + markPercent(m.Numbers, m.OutOf), 0) / g.marks.length
      : 0,
  }));
}

/* ══════════════════════════════════════════════════════════════════════════ */
export function ChildDetailScreen({ route, navigation }: Props) {
  const { child } = route.params;
  const { T }     = useTheme();
  const insets    = useSafeAreaInsets();

  const [activeTab,    setActiveTab]    = useState<'notes' | 'marks' | 'attendance'>('notes');
  const [notes,        setNotes]        = useState<GroupNote[]>([]);
  const [unreadCount,  setUnreadCount]  = useState(0);
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [marks,              setMarks]              = useState<Mark[]>([]);
  const [loadingMarks,       setLoadingMarks]       = useState(false);
  const [marksFetched,       setMarksFetched]       = useState(false);
  const [attendance,         setAttendance]         = useState<AttendanceRecord[]>([]);
  const [loadingAttendance,  setLoadingAttendance]  = useState(false);
  const [attendanceFetched,  setAttendanceFetched]  = useState(false);
  const [refreshing,   setRefreshing]   = useState(false);

  /* ── load notes ── */
  const loadNotes = useCallback(async () => {
    setLoadingNotes(true);
    try {
      const groups = (await fetchMyNotes()) as unknown as NoteGroup[];
      const group  = Array.isArray(groups)
        ? groups.find((g) => g.studentId === child.studentId)
        : undefined;
      setNotes(group?.notes ?? []);
      setUnreadCount(group?.unreadCount ?? 0);
    } catch {
      setNotes([]);
    } finally {
      setLoadingNotes(false);
    }
  }, [child.studentId]);

  /* ── lazy load marks ── */
  const loadMarks = useCallback(async () => {
    if (marksFetched) return;
    setLoadingMarks(true);
    try {
      const groups = (await fetchParentChildrenMarks()) as unknown as ChildMarksGroup[];
      const group  = Array.isArray(groups)
        ? groups.find((g) => g.studentId === child.studentId)
        : undefined;
      setMarks(group?.marks ?? []);
      setMarksFetched(true);
    } catch {
      setMarks([]);
    } finally {
      setLoadingMarks(false);
    }
  }, [child.studentId, marksFetched]);

  /* ── lazy load attendance ── */
  const loadAttendance = useCallback(async () => {
    if (attendanceFetched) return;
    setLoadingAttendance(true);
    try {
      const groups = (await fetchChildrenAttendance()) as unknown as ChildAttendanceGroup[];
      const group  = Array.isArray(groups)
        ? groups.find((g) => g.studentId === child.studentId)
        : undefined;
      setAttendance(group?.records ?? []);
      setAttendanceFetched(true);
    } catch {
      setAttendance([]);
    } finally {
      setLoadingAttendance(false);
    }
  }, [child.studentId, attendanceFetched]);

  useEffect(() => { loadNotes(); }, [loadNotes]);
  useEffect(() => { if (activeTab === 'marks')      loadMarks();      }, [activeTab, loadMarks]);
  useEffect(() => { if (activeTab === 'attendance') loadAttendance(); }, [activeTab, loadAttendance]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (activeTab === 'notes') {
      await loadNotes();
    } else if (activeTab === 'marks') {
      setMarksFetched(false);
      await loadMarks();
    } else {
      setAttendanceFetched(false);
      await loadAttendance();
    }
    setRefreshing(false);
  }, [activeTab, loadNotes, loadMarks, loadAttendance]);

  const handleMarkRead = async (noteId: number) => {
    await markNoteRead(noteId);
    setNotes((prev) => prev.map((n) => n.id === noteId ? { ...n, isRead: true } : n));
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const subjectGroups = useMemo(() => groupMarksBySubject(marks), [marks]);

  return (
    <View style={[styles.root, { backgroundColor: T.background }]}>

      {/* ── Header ── */}
      <LinearGradient
        colors={['#5b21b6', '#0f172a', '#312e81']}
        style={[styles.header, { paddingTop: insets.top + spacing[3] }]}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={12}>
          <ArrowLeft size={22} color="#fff" />
        </TouchableOpacity>

        <View style={styles.headerChild}>
          <Avatar name={child.name} uri={child.avatarUrl} size={52} />
          <View style={styles.headerInfo}>
            <Text style={styles.headerName}>{child.name}</Text>
            {(child.className || child.gradeLevel) && (
              <Text style={styles.headerSub}>
                {child.className ?? `Grade ${child.gradeLevel}`}
              </Text>
            )}
          </View>
        </View>

        {/* Tab pills */}
        <View style={styles.tabRow}>
          {(['notes', 'marks', 'attendance'] as const).map((tab) => {
            const active = activeTab === tab;
            const Icon   = tab === 'notes' ? MessageSquare : tab === 'marks' ? BarChart2 : ClipboardList;
            const label  = tab === 'notes' ? 'Notes' : tab === 'marks' ? 'Marks' : 'Attendance';
            return (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={[styles.tabPill, active ? styles.tabPillActive : styles.tabPillInactive]}
              >
                <Icon size={14} color={active ? '#fff' : 'rgba(255,255,255,0.6)'} />
                <Text style={[styles.tabPillLabel, { color: active ? '#fff' : 'rgba(255,255,255,0.6)' }]}>
                  {label}
                </Text>
                {tab === 'notes' && unreadCount > 0 && (
                  <View style={styles.tabBadge}>
                    <Text style={styles.tabBadgeText}>{unreadCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </LinearGradient>

      {/* ── Notes tab ── */}
      {activeTab === 'notes' && (
        loadingNotes ? <LoadingState message="Loading notes…" /> : (
          <FlatList
            data={notes}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.list}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.primary} />}
            ListEmptyComponent={
              <EmptyState emoji="📋" title="No notes yet" subtitle="Teacher notes for this child will appear here." />
            }
            renderItem={({ item }) => (
              <NoteCard note={item} T={T} onMarkRead={() => handleMarkRead(item.id)} />
            )}
          />
        )
      )}

      {/* ── Attendance tab ── */}
      {activeTab === 'attendance' && (
        loadingAttendance ? <LoadingState message="Loading attendance…" /> : (
          <ScrollView
            contentContainerStyle={styles.list}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.primary} />}
            showsVerticalScrollIndicator={false}
          >
            {attendance.length === 0 ? (
              <EmptyState emoji="📋" title="No attendance records" subtitle="Attendance records will appear here once added." />
            ) : (
              <AttendanceView records={attendance} T={T} />
            )}
          </ScrollView>
        )
      )}

      {/* ── Marks tab: subjects grouped ── */}
      {activeTab === 'marks' && (
        loadingMarks ? <LoadingState message="Loading marks…" /> : (
          <ScrollView
            contentContainerStyle={styles.list}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.primary} />}
            showsVerticalScrollIndicator={false}
          >
            {subjectGroups.length === 0 ? (
              <EmptyState emoji="📊" title="No marks yet" subtitle="Marks will appear here once teachers add them." />
            ) : (
              subjectGroups.map((group) => (
                <SubjectCard key={String(group.subjectId)} group={group} T={T} />
              ))
            )}
          </ScrollView>
        )
      )}
    </View>
  );
}

/* ── AttendanceView ───────────────────────────────────────────────────────── */
const ATT_META: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  PRESENT: { label: 'Present', color: '#10b981', bg: 'rgba(16,185,129,0.12)',  icon: '✓' },
  ABSENT:  { label: 'Absent',  color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   icon: '✗' },
  LATE:    { label: 'Late',    color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  icon: '!' },
  EXCUSED: { label: 'Excused', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', icon: '~' },
};

function AttendanceView({ records, T }: { records: AttendanceRecord[]; T: ReturnType<typeof useTheme>['T'] }) {
  const counts = Object.fromEntries(
    Object.keys(ATT_META).map((s) => [s, records.filter((r) => r.status === s).length])
  );

  return (
    <View style={attStyles.root}>
      {/* Stat cards */}
      <View style={attStyles.statsGrid}>
        {Object.entries(ATT_META).map(([status, meta]) => (
          <View key={status} style={[attStyles.statCard, { backgroundColor: meta.bg }]}>
            <Text style={[attStyles.statNum, { color: meta.color }]}>{counts[status] ?? 0}</Text>
            <Text style={[attStyles.statLabel, { color: meta.color }]}>{meta.label}</Text>
          </View>
        ))}
      </View>

      {/* Records list */}
      {records.map((rec) => {
        const meta = ATT_META[rec.status] ?? ATT_META.PRESENT;
        return (
          <View key={rec.id} style={[attStyles.row, { borderColor: T.inputBorder }]}>
            <View style={[attStyles.iconCircle, { backgroundColor: meta.bg }]}>
              <Text style={[attStyles.iconText, { color: meta.color }]}>{meta.icon}</Text>
            </View>
            <View style={attStyles.rowInfo}>
              <Text style={[attStyles.subject, { color: T.text }]} numberOfLines={1}>
                {rec.subjectName ?? 'Subject'}
              </Text>
              <Text style={[attStyles.date, { color: T.muted }]}>
                {rec.date ? new Date(rec.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
              </Text>
            </View>
            <View style={[attStyles.badge, { backgroundColor: meta.bg }]}>
              <Text style={[attStyles.badgeText, { color: meta.color }]}>{meta.label}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const attStyles = StyleSheet.create({
  root:       { gap: spacing[3] },
  statsGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  statCard:   { flex: 1, minWidth: '40%', borderRadius: radius.xl, padding: spacing[3], alignItems: 'center' },
  statNum:    { fontSize: fontSize.xl, fontWeight: fontWeight.extrabold },
  statLabel:  { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginTop: 2 },
  row:        { flexDirection: 'row', alignItems: 'center', gap: spacing[3], borderWidth: 1, borderRadius: radius.xl, padding: spacing[3] },
  iconCircle: { width: 36, height: 36, borderRadius: 99, alignItems: 'center', justifyContent: 'center' },
  iconText:   { fontSize: fontSize.base, fontWeight: fontWeight.bold },
  rowInfo:    { flex: 1, minWidth: 0 },
  subject:    { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  date:       { fontSize: fontSize.xs, marginTop: 2 },
  badge:      { paddingHorizontal: spacing[2], paddingVertical: 4, borderRadius: 999 },
  badgeText:  { fontSize: 11, fontWeight: '700' },
});

/* ── SubjectCard ──────────────────────────────────────────────────────────── */
function SubjectCard({ group, T }: { group: SubjectGroup; T: ReturnType<typeof useTheme>['T'] }) {
  const [open, setOpen] = useState(false);
  const grade = gradeLabel(group.avg);
  const bar   = barColor(group.avg);

  return (
    <Card style={styles.subjectCard}>
      {/* Subject header row — tap to expand */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => setOpen((v) => !v)}
        style={styles.subjectRow}
      >
        <View style={styles.subjectIcon}>
          <BookOpen size={18} color="#6366f1" />
        </View>
        <View style={styles.subjectInfo}>
          <Text style={[styles.subjectName, { color: T.text }]} numberOfLines={1}>
            {group.subjectName}
          </Text>
          {group.courseName && (
            <Text style={[styles.courseName, { color: T.muted }]} numberOfLines={1}>
              {group.courseName}
            </Text>
          )}
        </View>
        <View style={styles.subjectRight}>
          <Text style={[styles.subjectAvg, { color: T.text }]}>{Math.round(group.avg)}%</Text>
          <View style={[styles.gradeBadge, { borderColor: grade.color + '55', backgroundColor: grade.color + '18' }]}>
            <Text style={[styles.gradeLabel, { color: grade.color }]}>{grade.label}</Text>
          </View>
          {open
            ? <ChevronUp   size={16} color={T.muted} />
            : <ChevronDown size={16} color={T.muted} />}
        </View>
      </TouchableOpacity>

      {/* Progress bar */}
      <View style={[styles.bar, { backgroundColor: T.elevated }]}>
        <View style={[styles.barFill, { width: `${Math.min(group.avg, 100)}%` as any, backgroundColor: bar }]} />
      </View>

      {/* Individual marks — shown when expanded */}
      {open && (
        <View style={styles.marksContainer}>
          {group.marks.map((mark, idx) => (
            <MarkRow key={mark.id ?? idx} mark={mark} T={T} isLast={idx === group.marks.length - 1} />
          ))}
        </View>
      )}
    </Card>
  );
}

/* ── MarkRow ──────────────────────────────────────────────────────────────── */
function MarkRow({ mark, T, isLast }: { mark: Mark; T: ReturnType<typeof useTheme>['T']; isLast: boolean }) {
  const pct     = markPercent(mark.Numbers, mark.OutOf);
  const passing = pct >= 50;
  const bar     = barColor(pct);

  return (
    <View style={[styles.markRow, !isLast && { borderBottomWidth: 1, borderBottomColor: T.separator ?? T.border }]}>
      <View style={styles.markRowLeft}>
        <View style={styles.markTypePill}>
          <Text style={styles.markTypeText}>{mark.MarkType || '—'}</Text>
        </View>
        <Text style={[styles.markDate, { color: T.muted }]}>{mark.time ? formatDate(mark.time) : '—'}</Text>
      </View>
      <View style={styles.markRowRight}>
        <Text style={[styles.markScore, { color: passing ? '#34d399' : '#f87171' }]}>
          {formatMark(mark.Numbers, mark.OutOf)}
        </Text>
        <View style={[styles.miniBar, { backgroundColor: T.elevated }]}>
          <View style={[styles.miniBarFill, { width: `${Math.min(pct, 100)}%` as any, backgroundColor: bar }]} />
        </View>
        <Text style={[styles.markPct, { color: T.muted }]}>{pct}%</Text>
      </View>
    </View>
  );
}

/* ── NoteCard ─────────────────────────────────────────────────────────────── */
function NoteCard({
  note, T, onMarkRead,
}: { note: GroupNote; T: ReturnType<typeof useTheme>['T']; onMarkRead: () => void }) {
  return (
    <Card style={[styles.noteCard, !note.isRead ? { borderLeftWidth: 3, borderLeftColor: '#6366f1' } : undefined]}>
      <View style={styles.noteHeader}>
        <View style={{ flex: 1 }}>
          {note.title && (
            <Text style={[styles.noteTitle, { color: T.text }]} numberOfLines={1}>{note.title}</Text>
          )}
          <Text style={[styles.noteTeacher, { color: T.subtext }]}>👨‍🏫 {note.teacherName}</Text>
          <Text style={[styles.noteTime, { color: T.muted }]}>{timeAgo(note.createdAt)}</Text>
        </View>
        {!note.isRead ? (
          <TouchableOpacity onPress={onMarkRead} hitSlop={10}>
            <CheckCircle2 size={20} color="#34d399" />
          </TouchableOpacity>
        ) : (
          <Badge label="Read" variant="muted" />
        )}
      </View>
      <Text style={[styles.noteBody, { color: T.subtext }]}>{note.content}</Text>
    </Card>
  );
}

/* ── Styles ───────────────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  root: { flex: 1 },

  header: {
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[4],
    gap: spacing[3],
    borderBottomLeftRadius:  radius['2xl'],
    borderBottomRightRadius: radius['2xl'],
  },
  backBtn:     { alignSelf: 'flex-start', marginBottom: spacing[1] },
  headerChild: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  headerInfo:  { flex: 1 },
  headerName:  { color: '#fff', fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  headerSub:   { color: 'rgba(255,255,255,0.55)', fontSize: fontSize.sm, marginTop: 2 },

  tabRow: { flexDirection: 'row', gap: spacing[2] },
  tabPill: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing[1], paddingVertical: spacing[2], borderRadius: radius.lg,
  },
  tabPillActive:   { backgroundColor: 'rgba(255,255,255,0.2)' },
  tabPillInactive: { backgroundColor: 'transparent' },
  tabPillLabel:    { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  tabBadge: {
    backgroundColor: '#ef4444', borderRadius: 99,
    minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
  },
  tabBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  list: { padding: spacing[4], paddingBottom: spacing[10] },

  /* subject card */
  subjectCard: { marginBottom: spacing[3], overflow: 'hidden' },
  subjectRow:  { flexDirection: 'row', alignItems: 'center', gap: spacing[3], marginBottom: spacing[2] },
  subjectIcon: {
    width: 40, height: 40, borderRadius: radius.xl,
    backgroundColor: '#eef2ff', alignItems: 'center', justifyContent: 'center',
  },
  subjectInfo:  { flex: 1 },
  subjectName:  { fontSize: fontSize.base, fontWeight: fontWeight.bold },
  courseName:   { fontSize: fontSize.xs, marginTop: 2 },
  subjectRight: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  subjectAvg:   { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  gradeBadge:   { paddingHorizontal: spacing[2], paddingVertical: 2, borderRadius: radius.full, borderWidth: 1 },
  gradeLabel:   { fontSize: 11, fontWeight: '700' },

  bar:     { height: 5, borderRadius: radius.full, overflow: 'hidden', marginBottom: spacing[1] },
  barFill: { height: '100%', borderRadius: radius.full },

  marksContainer: { marginTop: spacing[3] },

  /* mark row */
  markRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: spacing[3],
  },
  markRowLeft:  { gap: spacing[1] },
  markTypePill: {
    backgroundColor: '#eef2ff', borderRadius: radius.md,
    paddingHorizontal: spacing[2], paddingVertical: 2, alignSelf: 'flex-start',
  },
  markTypeText: { fontSize: 11, fontWeight: '600', color: '#4f46e5' },
  markDate:     { fontSize: fontSize.xs },
  markRowRight: { alignItems: 'flex-end', gap: spacing[1] },
  markScore:    { fontSize: fontSize.base, fontWeight: fontWeight.bold },
  miniBar:      { width: 60, height: 4, borderRadius: radius.full, overflow: 'hidden' },
  miniBarFill:  { height: '100%', borderRadius: radius.full },
  markPct:      { fontSize: fontSize.xs },

  /* note card */
  noteCard:    { marginBottom: spacing[3] },
  noteHeader:  { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[2], marginBottom: spacing[2] },
  noteTitle:   { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  noteTeacher: { fontSize: fontSize.xs, marginTop: 2 },
  noteTime:    { fontSize: fontSize.xs, marginTop: 1 },
  noteBody:    { fontSize: fontSize.sm, lineHeight: 20 },
});
