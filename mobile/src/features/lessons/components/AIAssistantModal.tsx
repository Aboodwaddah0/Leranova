import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  Modal, StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator,
} from 'react-native';
import { X, Send, Bot, User } from 'lucide-react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import { spacing, radius, fontSize, fontWeight } from '../../../shared/theme';
import { askStudentTutor } from '../../student/services/studentService';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface Props {
  visible:   boolean;
  onClose:   () => void;
  lessonId:  number;
  subjectId: number;
  courseId:  number;
}

export function AIAssistantModal({ visible, onClose, lessonId, subjectId, courseId }: Props) {
  const { T, isDark } = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input,    setInput]    = useState('');
  const [thinking, setThinking] = useState(false);
  const listRef = useRef<FlatList>(null);

  const suggestions = [
    'Summarize this lesson',
    'What are the key points?',
    'Give me an example',
    'Quiz me on this topic',
  ];

  const send = async (text: string) => {
    const question = text.trim();
    if (!question || thinking) return;
    setInput('');

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: question };
    setMessages((prev) => [...prev, userMsg]);
    setThinking(true);

    try {
      const history = messages.slice(-10).map((m) => ({ role: m.role, content: m.content }));
      const res = await askStudentTutor({ question, lessonId, subjectId, courseId, history });
      const answer = typeof res === 'object' && res !== null
        ? ((res as Record<string, unknown>).answer as string ?? JSON.stringify(res))
        : String(res);
      setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', content: answer }]);
    } catch {
      setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', content: 'Sorry, I could not get an answer. Please try again.' }]);
    } finally {
      setThinking(false);
    }
  };

  // Scroll to bottom when messages update
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages, thinking]);

  const panelBg = isDark ? '#111029' : '#ffffff';

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={[styles.panel, { backgroundColor: panelBg, borderColor: T.border }]}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: T.border }]}>
            <View style={styles.headerLeft}>
              <View style={styles.botIcon}>
                <Bot size={18} color="#fff" />
              </View>
              <View>
                <Text style={[styles.headerTitle, { color: T.text }]}>AI Assistant</Text>
                <Text style={[styles.headerSub, { color: T.muted }]}>Powered by Learnova RAG</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: T.elevated }]}>
              <X size={16} color={T.muted} />
            </TouchableOpacity>
          </View>

          {/* Messages */}
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messageList}
            ListEmptyComponent={
              <View style={styles.emptyChat}>
                <Bot size={40} color={T.muted} />
                <Text style={[styles.emptyChatText, { color: T.muted }]}>
                  Ask me anything about this lesson!
                </Text>
                <View style={styles.suggestionsRow}>
                  {suggestions.map((s) => (
                    <TouchableOpacity
                      key={s}
                      onPress={() => send(s)}
                      style={[styles.suggestionBtn, { backgroundColor: T.elevated, borderColor: T.border }]}
                    >
                      <Text style={[styles.suggestionText, { color: T.subtext }]}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            }
            renderItem={({ item }) => (
              <View style={[
                styles.bubble,
                item.role === 'user'
                  ? [styles.userBubble, { backgroundColor: '#6366f1' }]
                  : [styles.botBubble, { backgroundColor: T.elevated, borderColor: T.border }],
              ]}>
                {item.role === 'assistant' && (
                  <View style={styles.botAvatarSmall}>
                    <Bot size={12} color="#818cf8" />
                  </View>
                )}
                <Text style={[
                  styles.bubbleText,
                  { color: item.role === 'user' ? '#fff' : T.text },
                ]}>
                  {item.content}
                </Text>
              </View>
            )}
          />

          {/* Thinking */}
          {thinking && (
            <View style={[styles.thinking, { backgroundColor: T.elevated }]}>
              <ActivityIndicator size="small" color="#818cf8" />
              <Text style={[styles.thinkingText, { color: T.muted }]}>Thinking…</Text>
            </View>
          )}

          {/* Input */}
          <View style={[styles.inputRow, { borderTopColor: T.border, backgroundColor: panelBg }]}>
            <TextInput
              style={[styles.input, { backgroundColor: T.inputBg, borderColor: T.inputBorder, color: T.text }]}
              value={input}
              onChangeText={setInput}
              placeholder="Ask about this lesson…"
              placeholderTextColor={T.placeholder}
              onSubmitEditing={() => send(input)}
              returnKeyType="send"
            />
            <TouchableOpacity
              onPress={() => send(input)}
              disabled={!input.trim() || thinking}
              style={[styles.sendBtn, { opacity: input.trim() ? 1 : 0.4 }]}
            >
              <Send size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  panel: {
    height: '80%',
    borderTopLeftRadius:  radius['2xl'],
    borderTopRightRadius: radius['2xl'],
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: spacing[4], borderBottomWidth: 1,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  botIcon:    { width: 36, height: 36, borderRadius: radius.lg, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: fontSize.base, fontWeight: fontWeight.bold },
  headerSub:   { fontSize: fontSize.xs },
  closeBtn:   { width: 32, height: 32, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },

  messageList: { padding: spacing[4], gap: spacing[3], flexGrow: 1 },
  emptyChat:   { alignItems: 'center', padding: spacing[8], gap: spacing[3] },
  emptyChatText: { fontSize: fontSize.sm, textAlign: 'center' },
  suggestionsRow: { gap: spacing[2], width: '100%' },
  suggestionBtn:  { borderRadius: radius.lg, borderWidth: 1, padding: spacing[3] },
  suggestionText: { fontSize: fontSize.sm },

  bubble:      { borderRadius: radius.xl, padding: spacing[3], maxWidth: '85%' },
  userBubble:  { alignSelf: 'flex-end' },
  botBubble:   { alignSelf: 'flex-start', borderWidth: 1, flexDirection: 'row', gap: spacing[2] },
  botAvatarSmall: { width: 20, height: 20, borderRadius: radius.sm, backgroundColor: 'rgba(99,102,241,0.15)', alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  bubbleText:  { fontSize: fontSize.sm, lineHeight: 20, flex: 1 },

  thinking:    { flexDirection: 'row', alignItems: 'center', gap: spacing[2], padding: spacing[3], borderRadius: radius.lg, marginHorizontal: spacing[4], marginBottom: spacing[2] },
  thinkingText: { fontSize: fontSize.xs },

  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[2],
    padding: spacing[3], borderTopWidth: 1,
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
