/**
 * ChatRoomScreen — real-time Socket.io chat.
 *
 * UX highlights:
 *  • inverted FlatList  → newest messages at bottom, keyboard scrolls them up
 *  • swipe-right any bubble → reply (Messenger-style, works for own msgs too)
 *  • sender names grouped   → name shown only on the first bubble in a sequence
 *  • long-press (250 ms)    → emoji reactions + reply / edit / delete
 *  • Socket.io real-time    → typing, seen ✔✔, reactions live
 *  • polling fallback       → every 5 s when socket is disconnected
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { io, Socket } from 'socket.io-client';
import { ArrowLeft, CornerUpLeft, Send, X } from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { StudentStackParamList } from '../../../types/navigation';
import { useTheme } from '../../../shared/hooks/useTheme';
import { Avatar, LoadingState } from '../../../shared/components';
import { fontSize, fontWeight, radius, spacing } from '../../../shared/theme';
import {
  deleteStudentChatMessage,
  editStudentChatMessage,
  fetchStudentChatMessages,
  normalizeMessage,
  reactStudentChatMessage,
  sendStudentChatMessage,
} from '../../student/services/studentService';
import { timeAgo } from '../../../shared/utils/date';
import { useAppSelector } from '../../../store/hooks';
import { API_BASE_URL } from '../../../shared/services/apiClient';
import { StorageService } from '../../../shared/services/storage';
import type { ChatMessage } from '../../../types/student';

// ─────────────────────────────────────────────────────────────────────────────
const SOCKET_URL      = API_BASE_URL.replace(/\/api\/?$/, '');
const POLL_MS         = 5_000;
const SWIPE_THRESHOLD = 58;
const MAX_DRAG        = 76;
const REACTION_EMOJIS = ['👍', '❤️', '😂', '🔥', '👏', '😮'];

type Route   = RouteProp<StudentStackParamList, 'ChatRoom'>;
type Nav     = NativeStackNavigationProp<StudentStackParamList>;
// showAvatar = last message in a consecutive run (avatar shown once, at the bottom of the group)
type MsgItem = ChatMessage & { showAvatar: boolean };

// ── Swipe-to-reply wrapper ────────────────────────────────────────────────────
function SwipeableMessage({
  children,
  onReply,
}: {
  children: React.ReactNode;
  onReply: () => void;
}) {
  const tx = useRef(new Animated.Value(0)).current;

  // Keep a ref so the PanResponder (created only once) always calls the
  // *current* onReply — prevents the stale-closure bug where every swipe
  // triggered the reply for the very first message.
  const onReplyRef = useRef(onReply);
  onReplyRef.current = onReply; // update synchronously on every render

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) =>
        g.dx > 6 && Math.abs(g.dx) > Math.abs(g.dy) * 1.3,
      onPanResponderMove: (_, g) => {
        tx.setValue(Math.min(Math.max(g.dx, 0), MAX_DRAG));
      },
      onPanResponderRelease: (_, g) => {
        if (g.dx >= SWIPE_THRESHOLD) onReplyRef.current(); // always fresh
        Animated.spring(tx, {
          toValue: 0, useNativeDriver: true, friction: 7, tension: 100,
        }).start();
      },
      onPanResponderTerminate: () => {
        Animated.spring(tx, { toValue: 0, useNativeDriver: true }).start();
      },
    }),
  ).current;

  const iconOpacity = tx.interpolate({
    inputRange: [0, SWIPE_THRESHOLD * 0.4, SWIPE_THRESHOLD],
    outputRange: [0, 0.4, 1],
    extrapolate: 'clamp',
  });
  const iconScale = tx.interpolate({
    inputRange: [0, SWIPE_THRESHOLD],
    outputRange: [0.5, 1],
    extrapolate: 'clamp',
  });

  return (
    <View>
      {/* Reply icon revealed as the bubble slides right */}
      <Animated.View
        style={[S.swipeIcon, { opacity: iconOpacity, transform: [{ scale: iconScale }] }]}
        pointerEvents="none"
      >
        <CornerUpLeft size={18} color="#6366f1" />
      </Animated.View>

      <Animated.View style={{ transform: [{ translateX: tx }] }} {...pan.panHandlers}>
        {children}
      </Animated.View>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export function ChatRoomScreen() {
  const { T }                = useTheme();
  const nav                  = useNavigation<Nav>();
  const route                = useRoute<Route>();
  const { chatId, chatName } = route.params;
  const userId               = useAppSelector((s) => s.auth.user?.id);
  const insets               = useSafeAreaInsets();

  const [messages,  setMessages]  = useState<ChatMessage[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [text,      setText]      = useState('');
  const [sending,   setSending]   = useState(false);
  const [connected, setConnected] = useState(false);
  const [sockFail,  setSockFail]  = useState(false);
  const [typingName, setTyping]   = useState<string | null>(null);
  const [replyTo,   setReplyTo]   = useState<ChatMessage | null>(null);
  const [menuMsg,   setMenuMsg]   = useState<ChatMessage | null>(null);
  const [editMsg,   setEditMsg]   = useState<ChatMessage | null>(null);
  const [editText,  setEditText]  = useState('');
  const [saving,    setSaving]    = useState(false);

  const socketRef   = useRef<Socket | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chatIdRef   = useRef(chatId);

  // ── helpers ─────────────────────────────────────────────────────────────
  const addOrReplace = (prev: ChatMessage[], msg: ChatMessage): ChatMessage[] =>
    prev.some((m) => Number(m.id) === Number(msg.id)) ? prev : [...prev, msg];

  const patchById = (prev: ChatMessage[], id: number, patch: Partial<ChatMessage>): ChatMessage[] =>
    prev.map((m) => (Number(m.id) === id ? { ...m, ...patch } : m));

  // ── load ─────────────────────────────────────────────────────────────────
  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await fetchStudentChatMessages(chatId);
      setMessages(
        [...data].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
      );
    } catch { /* noop */ } finally {
      if (!silent) setLoading(false);
    }
  }, [chatId]);

  useEffect(() => { load(); }, [load]);

  // ── Socket.io ────────────────────────────────────────────────────────────
  useEffect(() => {
    let alive = true;

    (async () => {
      const token = await StorageService.getToken();
      if (!token || !alive) return;

      const sock = io(SOCKET_URL, { transports: ['websocket', 'polling'], auth: { token } });
      socketRef.current = sock;

      sock.on('connect', () => {
        if (!alive) return;
        setConnected(true); setSockFail(false);
        sock.emit('join_chat',    { chatId: chatIdRef.current });
        sock.emit('message_seen', { chatId: chatIdRef.current });
      });

      sock.on('connect_error', () => { if (alive) { setConnected(false); setSockFail(true); } });
      sock.on('disconnect',    () => { if (alive) { setConnected(false); setSockFail(true); } });

      sock.on('receive_message', ({ chatId: cId, message }: { chatId: number; message: Record<string, unknown> }) => {
        if (!alive || Number(cId) !== Number(chatIdRef.current)) return;
        const normalized = normalizeMessage(message);
        setMessages((prev) => addOrReplace(prev, normalized));
        if (Number(normalized.senderId) !== Number(userId))
          sock.emit('message_seen', { chatId: chatIdRef.current });
      });

      sock.on('typing', ({ chatId: cId, userId: uid, userName }: { chatId: number; userId: number; userName: string }) => {
        if (!alive || Number(cId) !== Number(chatIdRef.current) || Number(uid) === Number(userId)) return;
        setTyping(userName || 'Someone');
      });

      sock.on('stop_typing', ({ chatId: cId, userId: uid }: { chatId: number; userId: number }) => {
        if (!alive || Number(cId) !== Number(chatIdRef.current) || Number(uid) === Number(userId)) return;
        setTyping(null);
      });

      sock.on('message_seen', ({ chatId: cId, seenAt, userId: uid }: { chatId: number; seenAt: string; userId: number }) => {
        if (!alive || Number(cId) !== Number(chatIdRef.current) || Number(uid) === Number(userId)) return;
        setMessages((prev) =>
          prev.map((m) =>
            Number(m.senderId) === Number(userId)
              ? { ...m, isSeen: true, seenAt: seenAt || new Date().toISOString() }
              : m,
          ),
        );
      });

      sock.on('message_reaction', ({ chatId: cId, message }: { chatId: number; message: Record<string, unknown> }) => {
        if (!alive || Number(cId) !== Number(chatIdRef.current)) return;
        const normalized = normalizeMessage(message);
        setMessages((prev) => patchById(prev, Number(normalized.id), normalized));
      });
    })();

    return () => {
      alive = false;
      if (typingTimer.current) clearTimeout(typingTimer.current);
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── polling fallback ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!sockFail) return;
    const t = setInterval(() => load(true), POLL_MS);
    return () => clearInterval(t);
  }, [sockFail, load]);

  // ── send ─────────────────────────────────────────────────────────────────
  const handleSend = async () => {
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    setText('');

    // Snapshot before clearing — needed to enrich replyTo if the API omits it
    const replySnap = replyTo;
    const replyId   = replySnap?.id;
    setReplyTo(null);

    if (typingTimer.current) clearTimeout(typingTimer.current);
    socketRef.current?.emit('stop_typing', { chatId });

    try {
      const msg = await sendStudentChatMessage(chatId, content, replyId);

      // Some API versions don't return replyTo — build it locally from the snapshot
      if (replyId && replySnap && !msg.replyTo) {
        msg.replyTo = {
          id:         replySnap.id,
          content:    replySnap.content,
          senderName: replySnap.senderName,
          senderId:   replySnap.senderId,
        };
      }

      setMessages((prev) => addOrReplace(prev, msg));
      socketRef.current?.emit('message_seen', { chatId });
    } catch { /* noop */ } finally { setSending(false); }
  };

  // ── typing ───────────────────────────────────────────────────────────────
  const onChangeText = (val: string) => {
    setText(val);
    const sock = socketRef.current;
    if (!sock?.connected) return;
    sock.emit('typing', { chatId });
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => sock.emit('stop_typing', { chatId }), 1200);
  };

  // ── delete ───────────────────────────────────────────────────────────────
  const handleDelete = (msg: ChatMessage) => {
    setMenuMsg(null);
    Alert.alert('Delete Message', 'Delete this message?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await deleteStudentChatMessage(msg.id);
            setMessages((prev) => patchById(prev, msg.id, { isDeleted: true, content: '' }));
          } catch { /* noop */ }
        },
      },
    ]);
  };

  // ── edit ─────────────────────────────────────────────────────────────────
  const saveEdit = async () => {
    if (!editMsg || !editText.trim() || saving) return;
    setSaving(true);
    try {
      const updated = await editStudentChatMessage(editMsg.id, editText.trim());
      setMessages((prev) => patchById(prev, editMsg.id, { ...updated, isEdited: true }));
      setEditMsg(null); setEditText('');
    } catch { /* noop */ } finally { setSaving(false); }
  };

  // ── react ────────────────────────────────────────────────────────────────
  const handleReact = async (msg: ChatMessage, emoji: string) => {
    setMenuMsg(null);

    // ── Optimistic update so the emoji appears instantly ──────────────────
    const prevReactions = msg.reactions ?? [];
    const alreadyThere  = prevReactions.find((r) => r.emoji === emoji);
    const optimistic    = alreadyThere
      ? prevReactions.map((r) =>
          r.emoji === emoji
            ? { ...r, count: r.reactedByMe ? r.count - 1 : r.count + 1, reactedByMe: !r.reactedByMe }
            : r,
        ).filter((r) => r.count > 0)
      : [...prevReactions, { emoji, count: 1, reactedByMe: true }];

    setMessages((prev) => patchById(prev, msg.id, { reactions: optimistic }));

    try {
      const updated = await reactStudentChatMessage(msg.id, emoji);
      // Overwrite with the server's authoritative data
      const targetId = Number(updated?.id ?? msg.id);
      setMessages((prev) => patchById(prev, targetId, updated ?? {}));
      // Broadcast to other chat participants
      socketRef.current?.emit('react_message', { chatId, message: updated });
    } catch {
      // Revert optimistic update on failure
      setMessages((prev) => patchById(prev, msg.id, { reactions: prevReactions }));
    }
  };

  // ── render ───────────────────────────────────────────────────────────────
  if (loading) return <LoadingState message="Loading messages…" />;

  // showAvatar = last message in a consecutive run from the same sender
  // (avatar shown once, beside the bottom bubble of the group)
  const displayData: MsgItem[] = messages
    .map((msg, idx) => ({
      ...msg,
      showAvatar: idx === messages.length - 1 || messages[idx + 1].senderId !== msg.senderId,
    }))
    .reverse(); // newest first → inverted FlatList places them at the bottom

  return (
    <KeyboardAvoidingView
      style={[S.flex1, { backgroundColor: T.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* ── Header ────────────────────────────────────────────────────── */}
      <View style={[S.header, {
        backgroundColor:   T.surface,
        borderBottomColor: T.border,
        paddingTop:        insets.top + spacing[2],
      }]}>
        <TouchableOpacity onPress={() => nav.goBack()} style={S.backBtn} hitSlop={10}>
          <ArrowLeft size={20} color={T.primary} />
        </TouchableOpacity>

        <View style={S.flex1}>
          <Text style={[S.chatName, { color: T.text }]} numberOfLines={1}>
            {chatName ?? 'Chat'}
          </Text>
          {typingName ? (
            <Text style={[S.typingLabel, { color: T.primary }]}>{typingName} is typing…</Text>
          ) : null}
        </View>

        {/* Live indicator */}
        <View style={[S.dot, { backgroundColor: connected ? '#22c55e' : '#f87171' }]} />
      </View>

      {/* ── Messages ──────────────────────────────────────────────────── */}
      <FlatList
        data={displayData}
        inverted
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={S.listPad}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => {
          const isMe = Number(item.senderId) === Number(userId);
          return (
            <SwipeableMessage onReply={() => setReplyTo(item)}>
              <Pressable
                onLongPress={() => { if (!item.isDeleted) setMenuMsg(item); }}
                delayLongPress={250}
                style={[S.msgRow, isMe ? S.rowRight : S.rowLeft]}
              >
                {/* Avatar — others only; appears next to the LAST bubble of a sequence */}
                {!isMe && (
                  <View style={S.avatarSlot}>
                    {item.showAvatar ? (
                      <Avatar name={item.senderName} uri={item.senderAvatar} size={28} />
                    ) : (
                      <View style={{ width: 28 }} />
                    )}
                  </View>
                )}

                {/* Bubble column */}
                <View style={isMe ? S.colRight : S.colLeft}>
                  {/* Sender name above EVERY bubble: "Me" for own, real name for others */}
                  <Text
                    style={[S.nameLabel, { color: isMe ? T.muted : T.primary }]}
                    numberOfLines={1}
                  >
                    {isMe ? 'Me' : item.senderName}
                  </Text>

                  {/* Reply preview */}
                  {item.replyTo && !item.isDeleted ? (
                    <View style={[S.replySnippet, {
                      backgroundColor: isMe ? 'rgba(255,255,255,0.13)' : T.elevated,
                      borderLeftColor: '#818cf8',
                    }]}>
                      <Text
                        style={[S.replySnippetSender, { color: isMe ? 'rgba(255,255,255,0.9)' : T.primary }]}
                        numberOfLines={1}
                      >
                        {Number(item.replyTo.senderId) === Number(userId)
                          ? 'Me'
                          : (item.replyTo.senderName || 'Member')}
                      </Text>
                      <Text
                        style={[S.replySnippetText, { color: isMe ? 'rgba(255,255,255,0.6)' : T.muted }]}
                        numberOfLines={1}
                      >
                        {item.replyTo.content}
                      </Text>
                    </View>
                  ) : null}

                  {/* Bubble */}
                  <View style={[
                    S.bubble,
                    isMe
                      ? { backgroundColor: '#6366f1' }
                      : { backgroundColor: T.elevated, borderColor: T.border, borderWidth: 1 },
                  ]}>
                    {item.isDeleted ? (
                      <Text style={[S.deletedText, { color: isMe ? 'rgba(255,255,255,0.4)' : T.muted }]}>
                        Message deleted
                      </Text>
                    ) : (
                      <Text style={[S.msgText, { color: isMe ? '#fff' : T.text }]}>{item.content}</Text>
                    )}

                    {/* Time · edited · seen tick */}
                    <View style={S.metaRow}>
                      <Text style={[S.timeText, { color: isMe ? 'rgba(255,255,255,0.45)' : T.muted }]}>
                        {timeAgo(item.createdAt)}
                      </Text>
                      {item.isEdited ? (
                        <Text style={[S.editedLabel, { color: isMe ? 'rgba(255,255,255,0.38)' : T.muted }]}>
                          {' · edited'}
                        </Text>
                      ) : null}
                      {isMe ? (
                        <Text style={[S.seenTick, { color: item.isSeen ? '#a5b4fc' : 'rgba(255,255,255,0.32)' }]}>
                          {item.isSeen ? '  ✔✔' : '  ✔'}
                        </Text>
                      ) : null}
                    </View>
                  </View>

                  {/* Emoji reactions */}
                  {item.reactions?.length ? (
                    <View style={S.reactRow}>
                      {item.reactions
                        .filter((r) => r.count > 0)
                        .sort((a, b) => b.count - a.count)
                        .map((r) => (
                          <TouchableOpacity
                            key={r.emoji}
                            onPress={() => handleReact(item, r.emoji)}
                            style={[
                              S.reactionChip,
                              {
                                backgroundColor: r.reactedByMe ? 'rgba(99,102,241,0.15)' : T.elevated,
                                borderColor:     r.reactedByMe ? '#818cf8' : T.border,
                              },
                            ]}
                          >
                            <Text style={S.reactionEmoji}>{r.emoji}</Text>
                            <Text style={[S.reactionCount, { color: T.muted }]}>{r.count}</Text>
                          </TouchableOpacity>
                        ))}
                    </View>
                  ) : null}
                </View>
              </Pressable>
            </SwipeableMessage>
          );
        }}
      />

      {/* ── Reply bar ─────────────────────────────────────────────────── */}
      {replyTo ? (
        <View style={[S.replyBar, { backgroundColor: T.surface, borderTopColor: T.border }]}>
          <CornerUpLeft size={13} color={T.primary} />
          <View style={S.replyBarBody}>
            <Text style={[S.replyBarName, { color: T.primary }]} numberOfLines={1}>
              {Number(replyTo.senderId) === Number(userId) ? 'Me' : replyTo.senderName}
            </Text>
            <Text style={[S.replyBarContent, { color: T.muted }]} numberOfLines={1}>
              {replyTo.content}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setReplyTo(null)} hitSlop={10}>
            <X size={15} color={T.muted} />
          </TouchableOpacity>
        </View>
      ) : null}

      {/* ── Input row ─────────────────────────────────────────────────── */}
      <View style={[S.inputRow, {
        backgroundColor: T.surface,
        borderTopColor:  T.border,
        paddingBottom:   insets.bottom > 0 ? insets.bottom : spacing[3],
      }]}>
        <TextInput
          style={[S.input, { backgroundColor: T.inputBg, borderColor: T.inputBorder, color: T.text }]}
          value={text}
          onChangeText={onChangeText}
          placeholder="Type a message…"
          placeholderTextColor={T.placeholder}
          onSubmitEditing={handleSend}
          returnKeyType="send"
          blurOnSubmit={false}
          multiline
        />
        <TouchableOpacity
          onPress={handleSend}
          disabled={!text.trim() || sending}
          style={[S.sendBtn, { opacity: text.trim() && !sending ? 1 : 0.4 }]}
        >
          {sending
            ? <ActivityIndicator size="small" color="#fff" />
            : <Send size={16} color="#fff" />}
        </TouchableOpacity>
      </View>

      {/* ── Long-press action sheet ────────────────────────────────────── */}
      {menuMsg ? (
        <Modal transparent animationType="fade" onRequestClose={() => setMenuMsg(null)}>
          <Pressable style={S.overlay} onPress={() => setMenuMsg(null)}>
            <Pressable
              style={[S.sheet, { backgroundColor: T.surface, borderColor: T.border }]}
              onPress={(e) => e.stopPropagation()}
            >
              {/* Emoji strip */}
              <View style={[S.emojiStrip, { borderBottomColor: T.border }]}>
                {REACTION_EMOJIS.map((emoji) => (
                  <TouchableOpacity
                    key={emoji}
                    onPress={() => handleReact(menuMsg, emoji)}
                    style={S.emojiBtn}
                  >
                    <Text style={S.emojiText}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Reply — available for all messages */}
              <TouchableOpacity
                style={S.sheetRow}
                onPress={() => { setReplyTo(menuMsg); setMenuMsg(null); }}
              >
                <CornerUpLeft size={15} color={T.text} />
                <Text style={[S.sheetRowText, { color: T.text }]}>Reply</Text>
              </TouchableOpacity>

              {/* Own-message-only actions */}
              {Number(menuMsg.senderId) === Number(userId) ? (
                <>
                  <TouchableOpacity
                    style={S.sheetRow}
                    onPress={() => {
                      setEditMsg(menuMsg);
                      setEditText(menuMsg.content);
                      setMenuMsg(null);
                    }}
                  >
                    <Text style={[S.sheetRowText, { color: T.text }]}>✏️  Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={S.sheetRow}
                    onPress={() => handleDelete(menuMsg)}
                  >
                    <Text style={[S.sheetRowText, { color: '#ef4444' }]}>🗑  Delete</Text>
                  </TouchableOpacity>
                </>
              ) : null}
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}

      {/* ── Edit modal ────────────────────────────────────────────────── */}
      {editMsg ? (
        <Modal
          transparent
          animationType="slide"
          onRequestClose={() => { setEditMsg(null); setEditText(''); }}
        >
          <KeyboardAvoidingView
            style={S.flex1}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <Pressable style={S.overlay} onPress={() => { setEditMsg(null); setEditText(''); }}>
              <Pressable
                style={[S.editSheet, { backgroundColor: T.surface, borderColor: T.border }]}
                onPress={(e) => e.stopPropagation()}
              >
                <Text style={[S.editTitle, { color: T.text }]}>Edit Message</Text>
                <TextInput
                  style={[S.editInput, { backgroundColor: T.inputBg, borderColor: T.inputBorder, color: T.text }]}
                  value={editText}
                  onChangeText={setEditText}
                  multiline
                  autoFocus
                  placeholderTextColor={T.placeholder}
                  textAlignVertical="top"
                />
                <View style={S.editActions}>
                  <TouchableOpacity
                    style={[S.editBtn, { borderColor: T.border }]}
                    onPress={() => { setEditMsg(null); setEditText(''); }}
                  >
                    <Text style={{ color: T.muted, fontWeight: '600' }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[S.editBtn, S.editBtnPrimary, { opacity: saving || !editText.trim() ? 0.5 : 1 }]}
                    onPress={saveEdit}
                    disabled={saving || !editText.trim()}
                  >
                    <Text style={{ color: '#fff', fontWeight: '600' }}>{saving ? 'Saving…' : 'Save'}</Text>
                  </TouchableOpacity>
                </View>
              </Pressable>
            </Pressable>
          </KeyboardAvoidingView>
        </Modal>
      ) : null}
    </KeyboardAvoidingView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  flex1: { flex: 1 },

  // header
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing[4], paddingBottom: spacing[3], borderBottomWidth: 1,
  },
  backBtn:    { paddingRight: spacing[3] },
  chatName:   { fontSize: fontSize.base, fontWeight: fontWeight.bold },
  typingLabel:{ fontSize: 11, marginTop: 1 },
  dot:        { width: 8, height: 8, borderRadius: 4, marginLeft: spacing[2] },

  // list
  listPad: { paddingHorizontal: spacing[3], paddingVertical: spacing[3] },

  // row
  msgRow:   { flexDirection: 'row', alignItems: 'flex-end', gap: spacing[2], marginBottom: spacing[2] },
  rowRight: { justifyContent: 'flex-end' },
  rowLeft:  { justifyContent: 'flex-start' },

  // avatar placeholder keeps alignment even when hidden
  avatarSlot: { alignSelf: 'flex-end' },

  // bubble column
  colRight: { alignItems: 'flex-end',   maxWidth: '78%' },
  colLeft:  { alignItems: 'flex-start', maxWidth: '78%' },

  // sender name (above bubble, first in sequence only)
  nameLabel: {
    fontSize: 11, fontWeight: '700',
    marginBottom: 3, marginLeft: spacing[1],
    letterSpacing: 0.2,
  },

  // reply snippet (above bubble)
  replySnippet: {
    borderLeftWidth: 3,
    paddingHorizontal: spacing[2],
    paddingVertical: 3,
    borderRadius: radius.sm,
    marginBottom: 3,
    maxWidth: '100%',
  },
  replySnippetSender: { fontSize: 10, fontWeight: '700', marginBottom: 1 },
  replySnippetText:   { fontSize: fontSize.xs },

  // bubble
  bubble: {
    borderRadius: radius.xl,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2] + 1,
    marginBottom: 3,
  },
  msgText:     { fontSize: fontSize.sm, lineHeight: 20 },
  deletedText: { fontSize: fontSize.sm, fontStyle: 'italic' },

  // meta inside bubble
  metaRow:    { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  timeText:   { fontSize: 10 },
  editedLabel:{ fontSize: 10 },
  seenTick:   { fontSize: 10 },

  // reactions under bubble
  reactRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 3, marginBottom: 2,
  },
  reactionChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    borderRadius: 12, borderWidth: 1,
    paddingHorizontal: 7, paddingVertical: 3,
  },
  reactionEmoji: { fontSize: 12 },
  reactionCount: { fontSize: 11, fontWeight: '600' },

  // swipe reply icon (behind the bubble)
  swipeIcon: {
    position: 'absolute', left: spacing[1], top: 0, bottom: 0,
    width: 34, alignItems: 'center', justifyContent: 'center',
  },

  // reply bar above input
  replyBar: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[2],
    paddingHorizontal: spacing[4], paddingVertical: spacing[2], borderTopWidth: 1,
  },
  replyBarBody:    { flex: 1, minWidth: 0 },
  replyBarName:    { fontSize: 11, fontWeight: '700' },
  replyBarContent: { fontSize: fontSize.xs, marginTop: 1 },

  // input row
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: spacing[2],
    paddingHorizontal: spacing[3], paddingTop: spacing[3], borderTopWidth: 1,
  },
  input: {
    flex: 1, minHeight: 44, maxHeight: 120,
    borderRadius: radius.xl, borderWidth: 1,
    paddingHorizontal: spacing[4], paddingVertical: 10, fontSize: fontSize.sm,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: radius.xl,
    backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center',
  },

  // modal overlay
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.48)',
    justifyContent: 'center', alignItems: 'center', padding: spacing[5],
  },

  // action sheet
  sheet: {
    width: '100%', borderRadius: radius.xl, borderWidth: 1, paddingVertical: spacing[2], overflow: 'hidden',
  },
  emojiStrip: {
    flexDirection: 'row', justifyContent: 'space-around',
    paddingHorizontal: spacing[3], paddingVertical: spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  emojiBtn:  { padding: 4 },
  emojiText: { fontSize: 24 },
  sheetRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[2],
    paddingHorizontal: spacing[4], paddingVertical: 13,
  },
  sheetRowText: { fontSize: fontSize.base, fontWeight: '500' },

  // edit modal
  editSheet: {
    width: '100%', borderRadius: radius.xl, borderWidth: 1, padding: spacing[5],
  },
  editTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, marginBottom: spacing[3] },
  editInput: {
    borderRadius: radius.lg, borderWidth: 1,
    paddingHorizontal: spacing[3], paddingVertical: spacing[2],
    fontSize: fontSize.sm, minHeight: 80, marginBottom: spacing[4],
  },
  editActions:   { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing[2] },
  editBtn: {
    paddingHorizontal: spacing[4], paddingVertical: spacing[2], borderRadius: radius.lg, borderWidth: 1,
  },
  editBtnPrimary: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
});
