import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import {
  BookOpen, BarChart3, ClipboardList, GraduationCap, MessageCircle, Bell, CheckCheck, Layers, Sparkles,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../../shared/hooks/useTheme';
import { GradientHeader, LoadingState, ErrorState, EmptyState } from '../../../shared/components';
import { spacing, radius, fontSize, fontWeight } from '../../../shared/theme';
import { timeAgo } from '../../../shared/utils/date';
import {
  fetchNotifications, markNotificationAsRead, markAllNotificationsAsRead,
} from '../services/notificationService';
import type { NotificationItem } from '../services/notificationService';
import type { StudentStackParamList } from '../../../types/navigation';

type Nav = NativeStackNavigationProp<StudentStackParamList>;

const TYPE_META: Record<string, { Icon: React.ComponentType<{ size: number; color: string }>; color: string }> = {
  LESSON:     { Icon: BookOpen,      color: '#6366f1' },
  COURSE:     { Icon: Layers,        color: '#06b6d4' },
  QUIZ:       { Icon: Sparkles,      color: '#ec4899' },
  MARK:       { Icon: BarChart3,     color: '#f59e0b' },
  ATTENDANCE: { Icon: ClipboardList, color: '#0ea5e9' },
  ENROLLMENT: { Icon: GraduationCap, color: '#34d399' },
  MESSAGE:    { Icon: MessageCircle, color: '#a855f7' },
};

export function NotificationsScreen() {
  const { T } = useTheme();
  const nav   = useNavigation<Nav>();

  const [items,      setItems]      = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setError('');
      const page = await fetchNotifications({ limit: 50 });
      setItems(page.notifications);
      setUnreadCount(page.unreadCount);
    } catch {
      setError('Failed to load notifications. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const handlePress = useCallback(async (item: NotificationItem) => {
    if (!item.isSeen) {
      setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, isSeen: true } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
      try { await markNotificationAsRead(item.id); } catch { /* ignore */ }
    }
  }, []);

  const handleMarkAllRead = useCallback(async () => {
    if (unreadCount === 0) return;
    setItems((prev) => prev.map((n) => ({ ...n, isSeen: true })));
    setUnreadCount(0);
    try { await markAllNotificationsAsRead(); } catch { /* ignore */ }
  }, [unreadCount]);

  return (
    <View style={[styles.root, { backgroundColor: T.background }]}>
      <GradientHeader
        title="Notifications"
        subtitle={unreadCount > 0 ? `${unreadCount} unread` : 'You’re all caught up'}
        onBack={() => nav.goBack()}
        lightColors={['#4f46e5', '#7c3aed']}
      >
        {unreadCount > 0 && (
          <TouchableOpacity onPress={handleMarkAllRead} style={styles.markAllBtn} activeOpacity={0.8}>
            <CheckCheck size={14} color="#fff" />
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </GradientHeader>

      {loading ? (
        <LoadingState message="Loading notifications…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.primary} />}
          ListEmptyComponent={
            <EmptyState emoji="🔔" title="No notifications yet" subtitle="We'll let you know when something happens." />
          }
          renderItem={({ item }) => (
            <NotificationRow item={item} T={T} onPress={() => handlePress(item)} />
          )}
        />
      )}
    </View>
  );
}

function NotificationRow({
  item, T, onPress,
}: { item: NotificationItem; T: ReturnType<typeof useTheme>['T']; onPress: () => void }) {
  const meta = TYPE_META[item.type] ?? { Icon: Bell, color: '#6366f1' };

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={[
      styles.row,
      { backgroundColor: T.surface, borderColor: T.border },
      !item.isSeen && { borderColor: 'rgba(99,102,241,0.35)', backgroundColor: 'rgba(99,102,241,0.06)' },
    ]}>
      <View style={[styles.iconWrap, { backgroundColor: `${meta.color}20` }]}>
        <meta.Icon size={16} color={meta.color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.content, { color: T.text }, !item.isSeen && { fontWeight: fontWeight.bold }]}>
          {item.content}
        </Text>
        <Text style={[styles.time, { color: T.muted }]}>{timeAgo(item.createdAt)}</Text>
      </View>
      {!item.isSeen && <View style={styles.dot} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  list: { padding: spacing[4], paddingBottom: spacing[10], gap: spacing[2] },

  markAllBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[1.5],
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: radius.full,
    paddingHorizontal: spacing[3], paddingVertical: spacing[1.5],
    marginBottom: spacing[2],
  },
  markAllText: { color: '#fff', fontSize: fontSize.xs, fontWeight: fontWeight.bold },

  row: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing[3],
    borderRadius: radius.xl, borderWidth: 1,
    padding: spacing[3], marginBottom: spacing[2],
  },
  iconWrap: { width: 34, height: 34, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  content: { fontSize: fontSize.sm, lineHeight: 20 },
  time:    { fontSize: fontSize.xs, marginTop: 2 },
  dot:     { width: 8, height: 8, borderRadius: 4, backgroundColor: '#6366f1', marginTop: 6 },
});
