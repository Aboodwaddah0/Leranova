import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Users, Bell, ChevronRight } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../../shared/hooks/useTheme';
import { Avatar } from '../../../shared/components';
import { spacing, radius, fontSize, fontWeight } from '../../../shared/theme';
import { fetchMyChildren, fetchMyNotes } from '../services/parentService';
import type { Child, NoteGroup } from '../../../types/parent';
import type { ParentStackParamList } from '../../../types/navigation';
import { useAppSelector } from '../../../store/hooks';

type Nav = NativeStackNavigationProp<ParentStackParamList>;

export function ParentDashboardScreen() {
  const { T }       = useTheme();
  const insets      = useSafeAreaInsets();
  const user        = useAppSelector((s) => s.auth.user);
  const navigation  = useNavigation<Nav>();

  const [children,   setChildren]   = useState<Child[]>([]);
  const [unread,     setUnread]     = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [ch, groups] = await Promise.all([
      fetchMyChildren(),
      fetchMyNotes() as unknown as Promise<NoteGroup[]>,
    ]);
    setChildren(ch);
    const totalUnread = Array.isArray(groups)
      ? groups.reduce((s, g) => s + (g.unreadCount ?? 0), 0)
      : 0;
    setUnread(totalUnread);
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

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
            <Text style={styles.heroStatVal}>{unread}</Text>
            <Text style={styles.heroStatLbl}>Unread Notes</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.body}>
        <Text style={[styles.sectionTitle, { color: T.text }]}>
          👦 Select a Child
        </Text>

        {children.length === 0 ? (
          <View style={[styles.emptyBox, { backgroundColor: T.surface, borderColor: T.border }]}>
            <Text style={[styles.emptyText, { color: T.muted }]}>No children linked yet.</Text>
          </View>
        ) : (
          children.map((child) => (
            <TouchableOpacity
              key={child.studentId}
              activeOpacity={0.75}
              onPress={() => navigation.navigate('ChildDetail', { child })}
              style={[styles.childCard, { backgroundColor: T.surface, borderColor: T.border }]}
            >
              <Avatar name={child.name} uri={child.avatarUrl} size={50} />
              <View style={styles.childInfo}>
                <Text style={[styles.childName, { color: T.text }]} numberOfLines={1}>
                  {child.name}
                </Text>
                {(child.className || child.gradeLevel) && (
                  <Text style={[styles.childSub, { color: T.muted }]}>
                    {child.className ?? `Grade ${child.gradeLevel}`}
                  </Text>
                )}
              </View>
              <ChevronRight size={18} color={T.muted} />
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
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
  heroStat: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: radius.lg, padding: spacing[3],
    alignItems: 'center', gap: 2,
  },
  heroStatVal: { color: '#fff', fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  heroStatLbl: { color: 'rgba(255,255,255,0.55)', fontSize: fontSize.xs },

  body:         { padding: spacing[5], gap: spacing[3] },
  sectionTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, marginBottom: spacing[1] },

  emptyBox: {
    borderRadius: radius.xl, borderWidth: 1,
    padding: spacing[6], alignItems: 'center',
  },
  emptyText: { fontSize: fontSize.sm },

  childCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[3],
    borderRadius: radius.xl, borderWidth: 1,
    padding: spacing[4], marginBottom: spacing[2],
  },
  childInfo:  { flex: 1 },
  childName:  { fontSize: fontSize.base, fontWeight: fontWeight.semibold },
  childSub:   { fontSize: fontSize.xs, marginTop: 2 },
});
