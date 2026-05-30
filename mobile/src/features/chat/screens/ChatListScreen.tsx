import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { MessageCircle, Users, Lock } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../../shared/hooks/useTheme';
import { Card, LoadingState, EmptyState, Avatar } from '../../../shared/components';
import { spacing, radius, fontSize, fontWeight } from '../../../shared/theme';
import { fetchStudentChats } from '../../student/services/studentService';
import { timeAgo } from '../../../shared/utils/date';
import type { Chat } from '../../../types/student';
import type { StudentStackParamList } from '../../../types/navigation';

type Nav = NativeStackNavigationProp<StudentStackParamList>;

export function ChatListScreen() {
  const { T }  = useTheme();
  const insets = useSafeAreaInsets();
  const nav    = useNavigation<Nav>();

  const [chats,    setChats]    = useState<Chat[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchStudentChats();
      setChats(data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  if (loading) return <LoadingState message="Loading chats…" />;

  return (
    <View style={[styles.root, { backgroundColor: T.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing[3], backgroundColor: T.surface, borderBottomColor: T.border }]}>
        <Text style={[styles.title, { color: T.text }]}>💬 Messages</Text>
        <Text style={[styles.sub, { color: T.muted }]}>{chats.length} conversations</Text>
      </View>

      <FlatList
        data={chats}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.primary} />}
        ListEmptyComponent={
          <EmptyState emoji="💬" title="No chats yet" subtitle="You'll see your group and private chats here." />
        }
        renderItem={({ item }) => (
          <ChatItem
            chat={item}
            T={T}
            onPress={() => nav.navigate('ChatRoom', { chatId: item.id, chatName: item.name ?? undefined })}
          />
        )}
      />
    </View>
  );
}

function ChatItem({ chat, T, onPress }: { chat: Chat; T: ReturnType<typeof useTheme>['T']; onPress: () => void }) {
  const isGroup = chat.type === 'GROUP';
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={styles.itemWrap}>
      <Card>
        <View style={styles.row}>
          <View style={[styles.icon, { backgroundColor: isGroup ? 'rgba(99,102,241,0.12)' : 'rgba(16,185,129,0.12)' }]}>
            {isGroup
              ? <Users size={20} color="#818cf8" />
              : <MessageCircle size={20} color="#34d399" />
            }
          </View>
          <View style={styles.body}>
            <Text style={[styles.chatName, { color: T.text }]} numberOfLines={1}>
              {chat.name ?? (isGroup ? 'Group Chat' : 'Private Chat')}
            </Text>
            {chat.lastMessage && (
              <Text style={[styles.lastMsg, { color: T.muted }]} numberOfLines={1}>
                {chat.lastMessage.content}
              </Text>
            )}
          </View>
          <View style={styles.meta}>
            {chat.lastMessage && (
              <Text style={[styles.time, { color: T.muted }]}>{timeAgo(chat.lastMessage.createdAt)}</Text>
            )}
            {(chat.unreadCount ?? 0) > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{chat.unreadCount}</Text>
              </View>
            )}
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { padding: spacing[5], paddingBottom: spacing[3], borderBottomWidth: 1 },
  title:  { fontSize: fontSize.xl, fontWeight: fontWeight.extrabold },
  sub:    { fontSize: fontSize.sm, marginTop: 2 },
  list:   { padding: spacing[4], paddingBottom: spacing[8] },
  itemWrap: { marginBottom: spacing[3] },
  row:    { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  icon:   { width: 46, height: 46, borderRadius: radius['2xl'], alignItems: 'center', justifyContent: 'center' },
  body:   { flex: 1 },
  chatName: { fontSize: fontSize.base, fontWeight: fontWeight.semibold },
  lastMsg:  { fontSize: fontSize.xs, marginTop: 2 },
  meta:   { alignItems: 'flex-end', gap: spacing[1] },
  time:   { fontSize: fontSize.xs },
  badge:  { backgroundColor: '#6366f1', borderRadius: radius.full, width: 18, height: 18, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: fontWeight.bold },
});
