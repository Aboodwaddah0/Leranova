import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Users, Bell, CheckCircle2 } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../shared/hooks/useTheme';
import { Card, Avatar, Badge } from '../../../shared/components';
import { spacing, radius, fontSize, fontWeight } from '../../../shared/theme';
import { fetchMyChildren, fetchMyNotes, markNoteRead } from '../services/parentService';
import { timeAgo } from '../../../shared/utils/date';
import type { Child, TeacherNote } from '../../../types/parent';
import { useAppSelector } from '../../../store/hooks';

export function ParentDashboardScreen() {
  const { T }  = useTheme();
  const insets = useSafeAreaInsets();
  const user   = useAppSelector((s) => s.auth.user);

  const [children,   setChildren]   = useState<Child[]>([]);
  const [notes,      setNotes]      = useState<TeacherNote[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [ch, nt] = await Promise.all([fetchMyChildren(), fetchMyNotes()]);
    setChildren(ch);
    setNotes(nt);
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const handleMarkRead = async (noteId: number) => {
    await markNoteRead(noteId);
    setNotes((prev) => prev.map((n) => n.id === noteId ? { ...n, isRead: true } : n));
  };

  const unreadCount = notes.filter((n) => !n.isRead).length;

  return (
    <ScrollView
      style={{ backgroundColor: T.background }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.primary} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero */}
      <LinearGradient
        colors={['#5b21b6', '#0f172a', '#312e81']}
        style={[styles.hero, { paddingTop: insets.top + spacing[4] }]}
      >
        <View style={styles.heroRow}>
          <View>
            <Text style={styles.heroGreet}>Welcome,</Text>
            <Text style={styles.heroName}>{user?.name ?? 'Parent'}</Text>
          </View>
          <Avatar name={user?.name} uri={user?.avatarUrl} size={50} />
        </View>

        <View style={styles.heroStats}>
          <View style={styles.heroStat}>
            <Users size={18} color="rgba(255,255,255,0.7)" />
            <Text style={styles.heroStatVal}>{children.length}</Text>
            <Text style={styles.heroStatLbl}>Children</Text>
          </View>
          <View style={styles.heroStat}>
            <Bell size={18} color="rgba(255,255,255,0.7)" />
            <Text style={styles.heroStatVal}>{unreadCount}</Text>
            <Text style={styles.heroStatLbl}>Unread Notes</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.body}>
        {/* Children */}
        <Text style={[styles.sectionTitle, { color: T.text }]}>👦 My Children</Text>
        {children.length === 0 ? (
          <Text style={[styles.empty, { color: T.muted }]}>No children linked yet.</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.childrenRow} contentContainerStyle={{ gap: spacing[3] }}>
            {children.map((child) => (
              <View key={child.id} style={[styles.childCard, { backgroundColor: T.surface, borderColor: T.border }]}>
                <Avatar name={child.name} uri={child.avatarUrl} size={52} />
                <Text style={[styles.childName, { color: T.text }]} numberOfLines={1}>{child.name}</Text>
                {child.className && (
                  <Text style={[styles.childClass, { color: T.muted }]}>{child.className}</Text>
                )}
              </View>
            ))}
          </ScrollView>
        )}

        {/* Teacher Notes */}
        <Text style={[styles.sectionTitle, { color: T.text }]}>📋 Teacher Notes</Text>
        {notes.length === 0 ? (
          <Text style={[styles.empty, { color: T.muted }]}>No notes from teachers yet.</Text>
        ) : (
          notes.map((note) => (
            <NoteCard key={note.id} note={note} T={T} onMarkRead={() => handleMarkRead(note.id)} />
          ))
        )}
      </View>
    </ScrollView>
  );
}

function NoteCard({ note, T, onMarkRead }: { note: TeacherNote; T: ReturnType<typeof useTheme>['T']; onMarkRead: () => void }) {
  return (
    <Card style={[styles.noteCard, !note.isRead ? { borderLeftWidth: 3, borderLeftColor: '#6366f1' } : undefined]}>
      <View style={styles.noteHeader}>
        <View style={styles.noteLeft}>
          {note.teacher && (
            <Text style={[styles.noteTeacher, { color: T.text }]}>👨‍🏫 {note.teacher.name}</Text>
          )}
          <Text style={[styles.noteTime, { color: T.muted }]}>{timeAgo(note.createdAt)}</Text>
        </View>
        {!note.isRead && (
          <TouchableOpacity onPress={onMarkRead} style={styles.readBtn}>
            <CheckCircle2 size={16} color="#34d399" />
          </TouchableOpacity>
        )}
        {note.isRead && <Badge label="Read" variant="muted" />}
      </View>
      <Text style={[styles.noteBody, { color: T.subtext }]}>{note.content}</Text>
      {note.child && (
        <Text style={[styles.noteChild, { color: T.muted }]}>For: {note.child.name}</Text>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[6],
    borderBottomLeftRadius:  radius['2xl'],
    borderBottomRightRadius: radius['2xl'],
  },
  heroRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[4] },
  heroGreet:   { color: 'rgba(255,255,255,0.55)', fontSize: fontSize.sm },
  heroName:    { color: '#fff', fontSize: fontSize.xl, fontWeight: fontWeight.bold },
  heroStats:   { flexDirection: 'row', gap: spacing[3] },
  heroStat:    {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: radius.lg, padding: spacing[3],
    alignItems: 'center', gap: 2,
  },
  heroStatVal: { color: '#fff', fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  heroStatLbl: { color: 'rgba(255,255,255,0.55)', fontSize: fontSize.xs },

  body:         { padding: spacing[5], gap: spacing[3] },
  sectionTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, marginTop: spacing[2] },
  empty:        { fontSize: fontSize.sm, textAlign: 'center', padding: spacing[4] },

  childrenRow: { marginBottom: spacing[2] },
  childCard: {
    width: 100, padding: spacing[3], borderRadius: radius.xl, borderWidth: 1,
    alignItems: 'center', gap: spacing[1],
  },
  childName:  { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, textAlign: 'center' },
  childClass: { fontSize: 10, textAlign: 'center' },

  noteCard:    { marginBottom: spacing[3] },
  noteHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing[2] },
  noteLeft:    {},
  noteTeacher: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  noteTime:    { fontSize: fontSize.xs, marginTop: 2 },
  readBtn:     {},
  noteBody:    { fontSize: fontSize.sm, lineHeight: 20 },
  noteChild:   { fontSize: fontSize.xs, marginTop: spacing[1] },
});
