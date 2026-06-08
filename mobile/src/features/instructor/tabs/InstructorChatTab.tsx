import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, Alert, TextInput, KeyboardAvoidingView,
  Platform, ActivityIndicator, ScrollView,
} from 'react-native';
import { MessageSquare, Send, ChevronLeft } from 'lucide-react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import { useAppSelector } from '../../../store/hooks';
import { spacing, radius, fontSize, fontWeight } from '../../../shared/theme';
import { LoadingState, EmptyState } from '../../../shared/components';
import { fetchChats, fetchChatMessages, sendChatMessage } from '../services/instructorService';
import type { InstructorChat, ChatMessage } from '../../../types/instructor';

const timeAgo = (d: string) => {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
};

const fmtTime = (d: string) =>
  new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

interface Props { isSchool: boolean; }

export function InstructorChatTab({ isSchool }: Props) {
  const { T } = useTheme();
  const currentUser = useAppSelector(s => s.auth.user);

  const [chats,      setChats]      = useState<InstructorChat[]>([]);
  const [activeChat, setActiveChat] = useState<InstructorChat | null>(null);
  const [messages,   setMessages]   = useState<ChatMessage[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [msgsLoading, setMsgsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [input,      setInput]      = useState('');
  const [sending,    setSending]    = useState(false);
  const flatRef = useRef<FlatList>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadChats = useCallback(async () => {
    try {
      const data = await fetchChats();
      setChats(data);
    } catch {
      Alert.alert('Error', 'Failed to load chats.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadChats(); }, [loadChats]);

  const loadMessages = useCallback(async (chatId: number, silent = false) => {
    if (!silent) setMsgsLoading(true);
    try {
      const data = await fetchChatMessages(chatId);
      const userId = currentUser?.id;
      setMessages(data.map(m => ({ ...m, isOwn: m.senderId === userId })));
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: !silent }), 100);
    } catch {}
    finally { if (!silent) setMsgsLoading(false); }
  }, [currentUser?.id]);

  const openChat = useCallback((chat: InstructorChat) => {
    setActiveChat(chat);
    loadMessages(chat.id);
    // Poll every 5 seconds
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => loadMessages(chat.id, true), 5000);
  }, [loadMessages]);

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const handleSend = async () => {
    if (!activeChat || !input.trim()) return;
    const text = input.trim();
    setInput('');
    setSending(true);
    try {
      const msg = await sendChatMessage(activeChat.id, text);
      if (msg) {
        setMessages(prev => [...prev, { ...msg, isOwn: true }]);
        setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
      }
    } catch {
      Alert.alert('Error', 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (activeChat) await loadMessages(activeChat.id);
    else await loadChats();
    setRefreshing(false);
  }, [activeChat, loadMessages, loadChats]);

  if (loading) return <LoadingState message="Loading chats…" />;

  // ── Chat room view ──────────────────────────────────────────────────────────
  if (activeChat) {
    return (
      <KeyboardAvoidingView style={[styles.root, { backgroundColor: T.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={88}>
        {/* Header */}
        <View style={[styles.chatHeader, { backgroundColor: T.surface, borderBottomColor: T.border }]}>
          <TouchableOpacity onPress={() => { setActiveChat(null); if (pollRef.current) clearInterval(pollRef.current); }} style={styles.backBtn}>
            <ChevronLeft size={22} color={T.primary} />
          </TouchableOpacity>
          <Text style={[styles.chatTitle, { color: T.text }]} numberOfLines={1}>
            {activeChat.title ?? activeChat.name ?? `Chat #${activeChat.id}`}
          </Text>
        </View>

        {msgsLoading ? <LoadingState message="Loading messages…" /> : (
          <FlatList
            ref={flatRef}
            data={messages}
            keyExtractor={m => String(m.id)}
            contentContainerStyle={styles.msgList}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.primary} />}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={<EmptyState emoji="💬" title="No messages yet" subtitle="Start the conversation!" />}
            renderItem={({ item: m }) => (
              <View style={[styles.msgRow, m.isOwn && styles.msgRowOwn]}>
                {!m.isOwn && (
                  <View style={[styles.msgAvatar, { backgroundColor: 'rgba(99,102,241,0.15)' }]}>
                    <Text style={styles.msgAvatarText}>{(m.senderName?.[0] ?? '?')}</Text>
                  </View>
                )}
                <View style={[
                  styles.bubble,
                  m.isOwn
                    ? { backgroundColor: T.primary, borderBottomRightRadius: 4 }
                    : { backgroundColor: T.surface, borderColor: T.border, borderWidth: 1, borderBottomLeftRadius: 4 },
                ]}>
                  {!m.isOwn && !!m.senderName && (
                    <Text style={[styles.senderName, { color: '#6366f1' }]}>{m.senderName}</Text>
                  )}
                  <Text style={[styles.msgText, { color: m.isOwn ? '#fff' : T.text }]}>{m.content}</Text>
                  <Text style={[styles.msgTime, { color: m.isOwn ? 'rgba(255,255,255,0.6)' : T.muted }]}>
                    {fmtTime(m.createdAt)}
                  </Text>
                </View>
              </View>
            )}
          />
        )}

        {/* Input bar */}
        <View style={[styles.inputBar, { backgroundColor: T.surface, borderTopColor: T.border }]}>
          <TextInput
            style={[styles.msgInput, { backgroundColor: T.inputBg, borderColor: T.inputBorder, color: T.text }]}
            value={input}
            onChangeText={setInput}
            placeholder="Type a message…"
            placeholderTextColor={T.placeholder}
            multiline
            maxLength={1000}
            onSubmitEditing={handleSend}
          />
          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: input.trim() ? T.primary : T.elevated }]}
            onPress={handleSend}
            disabled={sending || !input.trim()}
          >
            {sending ? <ActivityIndicator size="small" color="#fff" /> : <Send size={18} color={input.trim() ? '#fff' : T.muted} />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // ── Chat list view ──────────────────────────────────────────────────────────
  return (
    <View style={[styles.root, { backgroundColor: T.background }]}>
      <FlatList
        data={chats}
        keyExtractor={c => String(c.id)}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.primary} />}
        ItemSeparatorComponent={() => <View style={[styles.sep, { backgroundColor: T.border }]} />}
        ListEmptyComponent={<EmptyState emoji="💬" title="No chats" subtitle="Chats with your students will appear here." />}
        showsVerticalScrollIndicator={false}
        renderItem={({ item: c }) => (
          <TouchableOpacity style={[styles.chatRow, { backgroundColor: T.surface }]} onPress={() => openChat(c)} activeOpacity={0.8}>
            <View style={[styles.chatAvatar, { backgroundColor: 'rgba(99,102,241,0.12)' }]}>
              <MessageSquare size={20} color="#6366f1" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.chatName, { color: T.text }]} numberOfLines={1}>
                {c.title ?? c.name ?? `Chat #${c.id}`}
              </Text>
              {!!c.lastMessage && (
                <Text style={[styles.lastMsg, { color: T.muted }]} numberOfLines={1}>{c.lastMessage}</Text>
              )}
            </View>
            <View style={{ alignItems: 'flex-end', gap: spacing[1] }}>
              {!!c.updatedAt && <Text style={[styles.timeText, { color: T.muted }]}>{timeAgo(c.updatedAt)}</Text>}
              {(c.unreadCount ?? 0) > 0 && (
                <View style={[styles.unreadBadge, { backgroundColor: T.primary }]}>
                  <Text style={styles.unreadText}>{c.unreadCount}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root:          { flex: 1 },
  list:          { paddingBottom: spacing[10] },
  chatRow:       { flexDirection: 'row', alignItems: 'center', gap: spacing[3], padding: spacing[4] },
  chatAvatar:    { width: 46, height: 46, borderRadius: 99, alignItems: 'center', justifyContent: 'center' },
  chatName:      { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  lastMsg:       { fontSize: fontSize.xs, marginTop: 2 },
  timeText:      { fontSize: fontSize.xs },
  unreadBadge:   { minWidth: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing[1] },
  unreadText:    { color: '#fff', fontSize: 11, fontWeight: '800' },
  sep:           { height: 1 },
  chatHeader:    { flexDirection: 'row', alignItems: 'center', gap: spacing[3], padding: spacing[4], borderBottomWidth: 1 },
  backBtn:       { padding: spacing[1] },
  chatTitle:     { flex: 1, fontSize: fontSize.sm, fontWeight: fontWeight.extrabold },
  msgList:       { padding: spacing[4], gap: spacing[3], paddingBottom: spacing[6] },
  msgRow:        { flexDirection: 'row', alignItems: 'flex-end', gap: spacing[2] },
  msgRowOwn:     { justifyContent: 'flex-end' },
  msgAvatar:     { width: 30, height: 30, borderRadius: 99, alignItems: 'center', justifyContent: 'center' },
  msgAvatarText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: '#6366f1' },
  bubble:        { maxWidth: '75%', borderRadius: radius.xl, padding: spacing[3] },
  senderName:    { fontSize: 11, fontWeight: '700', marginBottom: 2 },
  msgText:       { fontSize: fontSize.sm, lineHeight: 20 },
  msgTime:       { fontSize: 10, marginTop: 4, textAlign: 'right' },
  inputBar:      { flexDirection: 'row', gap: spacing[2], padding: spacing[3], borderTopWidth: 1, alignItems: 'flex-end' },
  msgInput:      { flex: 1, borderRadius: radius.xl, borderWidth: 1, paddingHorizontal: spacing[4], paddingVertical: spacing[3], fontSize: fontSize.sm, maxHeight: 100 },
  sendBtn:       { width: 42, height: 42, borderRadius: 99, alignItems: 'center', justifyContent: 'center' },
});
