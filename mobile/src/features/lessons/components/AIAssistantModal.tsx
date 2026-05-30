import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  Modal, StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator,
} from 'react-native';
import { X, Send, Bot, Trash2 } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../shared/hooks/useTheme';
import { spacing, radius, fontSize, fontWeight } from '../../../shared/theme';
import { askStudentTutor } from '../../student/services/studentService';

interface Message {
  id:      string;
  role:    'user' | 'assistant';
  content: string;
}

interface Props {
  visible:   boolean;
  onClose:   () => void;
  lessonId:  number;
  subjectId: number;
  courseId:  number;
}

const SUGGESTIONS = [
  'Summarize this lesson',
  'What are the key points?',
  'Give me an example',
  'Quiz me on this topic',
];

export function AIAssistantModal({ visible, onClose, lessonId, subjectId, courseId }: Props) {
  const { T, isDark } = useTheme();
  const insets        = useSafeAreaInsets();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input,    setInput]    = useState('');
  const [thinking, setThinking] = useState(false);
  const listRef = useRef<FlatList<Message>>(null);

  const send = async (text: string) => {
    const question = text.trim();
    if (!question || thinking) return;
    setInput('');

    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', content: question };
    setMessages((prev) => [userMsg, ...prev]); // prepend — inverted list shows newest first at bottom

    setThinking(true);
    try {
      // Build history from current state (before this message was added)
      const history = messages.slice(0, 10).map((m) => ({ role: m.role, content: m.content }));
      const res     = await askStudentTutor({ question, lessonId, subjectId, courseId, history });
      const answer  = typeof res === 'object' && res !== null
        ? ((res as Record<string, unknown>).answer as string ?? JSON.stringify(res))
        : String(res);
      setMessages((prev) => [{ id: `a-${Date.now()}`, role: 'assistant', content: answer }, ...prev]);
    } catch {
      setMessages((prev) => [{
        id: `err-${Date.now()}`, role: 'assistant',
        content: 'Sorry, I could not get an answer. Please try again.',
      }, ...prev]);
    } finally {
      setThinking(false);
    }
  };

  const panelBg = isDark ? '#111029' : '#ffffff';

  return (
    <Modal visible={visible} animationType="slide" transparent={false} presentationStyle="fullScreen" statusBarTranslucent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[S.panel, { backgroundColor: panelBg }]}
      >
          {/* ── Header ─────────────────────────────────────────────────── */}
          <View style={[S.header, { borderBottomColor: T.border, paddingTop: insets.top + spacing[2] }]}>
            <View style={S.headerLeft}>
              <View style={S.botAvatar}>
                <Bot size={18} color="#fff" />
              </View>
              <View>
                <Text style={[S.headerTitle, { color: T.text }]}>AI Assistant</Text>
                <Text style={[S.headerSub, { color: T.muted }]}>Powered by Learnova RAG</Text>
              </View>
            </View>
            <View style={S.headerActions}>
              {messages.length > 0 && (
                <TouchableOpacity
                  onPress={() => setMessages([])}
                  style={[S.closeBtn, { backgroundColor: T.elevated }]}
                  hitSlop={8}
                >
                  <Trash2 size={15} color={T.muted} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={onClose}
                style={[S.closeBtn, { backgroundColor: T.elevated }]}
                hitSlop={8}
              >
                <X size={16} color={T.muted} />
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Messages (inverted — newest at bottom) ──────────────────── */}
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            inverted
            style={S.list}
            contentContainerStyle={S.listContent}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={S.emptyWrap}>
                <Bot size={38} color={T.muted} />
                <Text style={[S.emptyText, { color: T.muted }]}>
                  Ask me anything about this lesson!
                </Text>
                <View style={S.suggestionsWrap}>
                  {SUGGESTIONS.map((s) => (
                    <TouchableOpacity
                      key={s}
                      onPress={() => send(s)}
                      style={[S.suggBtn, { backgroundColor: T.elevated, borderColor: T.border }]}
                    >
                      <Text style={[S.suggText, { color: T.subtext }]}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            }
            renderItem={({ item }) => {
              const isUser = item.role === 'user';
              return (
                <View style={[S.row, isUser ? S.rowRight : S.rowLeft]}>
                  {/* Bot avatar */}
                  {!isUser && (
                    <View style={S.botAvatarSmall}>
                      <Bot size={12} color="#818cf8" />
                    </View>
                  )}
                  <View style={[
                    S.bubble,
                    isUser
                      ? { backgroundColor: '#6366f1' }
                      : { backgroundColor: T.elevated, borderColor: T.border, borderWidth: 1 },
                  ]}>
                    {!isUser && (
                      <Text style={[S.roleLabel, { color: '#818cf8' }]}>AI Assistant</Text>
                    )}
                    <Text style={[S.bubbleText, { color: isUser ? '#fff' : T.text }]}>
                      {item.content}
                    </Text>
                  </View>
                </View>
              );
            }}
          />

          {/* ── Typing indicator ────────────────────────────────────────── */}
          {thinking && (
            <View style={[S.thinkingRow, { backgroundColor: T.elevated }]}>
              <ActivityIndicator size="small" color="#818cf8" />
              <Text style={[S.thinkingText, { color: T.muted }]}>Thinking…</Text>
            </View>
          )}

          {/* ── Input ───────────────────────────────────────────────────── */}
          <View style={[S.inputRow, {
            borderTopColor:  T.border,
            backgroundColor: panelBg,
            paddingBottom:   insets.bottom + spacing[3],
          }]}>
            <TextInput
              style={[S.input, { backgroundColor: T.inputBg, borderColor: T.inputBorder, color: T.text }]}
              value={input}
              onChangeText={setInput}
              placeholder="Ask about this lesson…"
              placeholderTextColor={T.placeholder}
              onSubmitEditing={() => send(input)}
              returnKeyType="send"
              blurOnSubmit={false}
            />
            <TouchableOpacity
              onPress={() => send(input)}
              disabled={!input.trim() || thinking}
              style={[S.sendBtn, { opacity: input.trim() && !thinking ? 1 : 0.4 }]}
            >
              {thinking
                ? <ActivityIndicator size="small" color="#fff" />
                : <Send size={16} color="#fff" />}
            </TouchableOpacity>
          </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const S = StyleSheet.create({
  panel: {
    flex:     1,
    overflow: 'hidden',
  },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: spacing[4], borderBottomWidth: 1,
  },
  headerLeft:    { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  botAvatar:    { width: 36, height: 36, borderRadius: radius.lg, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center' },
  headerTitle:  { fontSize: fontSize.base, fontWeight: fontWeight.bold },
  headerSub:    { fontSize: fontSize.xs },
  closeBtn:     { width: 32, height: 32, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },

  // Messages
  list:        { flex: 1 },   // ← THE KEY FIX: flex:1 makes messages visible
  listContent: { padding: spacing[4], gap: spacing[3] },

  emptyWrap:     { alignItems: 'center', padding: spacing[8], gap: spacing[4] },
  emptyText:     { fontSize: fontSize.sm, textAlign: 'center' },
  suggestionsWrap: { gap: spacing[2], width: '100%' },
  suggBtn:       { borderRadius: radius.lg, borderWidth: 1, padding: spacing[3] },
  suggText:      { fontSize: fontSize.sm },

  row:      { flexDirection: 'row', alignItems: 'flex-end', gap: spacing[2] },
  rowRight: { justifyContent: 'flex-end' },
  rowLeft:  { justifyContent: 'flex-start' },

  botAvatarSmall: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: 'rgba(99,102,241,0.15)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 2,
  },
  bubble: {
    borderRadius: radius.xl,
    padding:      spacing[3],
    maxWidth:     '80%',
  },
  roleLabel:  { fontSize: 10, fontWeight: fontWeight.bold, marginBottom: 2, letterSpacing: 0.5 },
  bubbleText: { fontSize: fontSize.sm, lineHeight: 20 },

  thinkingRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[2],
    padding: spacing[3], borderRadius: radius.lg,
    marginHorizontal: spacing[4], marginBottom: spacing[2],
  },
  thinkingText: { fontSize: fontSize.xs },

  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[2],
    paddingHorizontal: spacing[3],
    paddingTop:        spacing[3],
    borderTopWidth:    1,
  },
  input: {
    flex: 1, height: 44, borderRadius: radius.xl, borderWidth: 1,
    paddingHorizontal: spacing[4], fontSize: fontSize.sm,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: radius.xl,
    backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center',
  },
});
