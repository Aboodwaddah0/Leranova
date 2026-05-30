import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  FlatList, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Send } from 'lucide-react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import { Avatar, EmptyState, LoadingState } from '../../../shared/components';
import { spacing, radius, fontSize, fontWeight } from '../../../shared/theme';
import { fetchLessonComments, createLessonComment } from '../../student/services/studentService';
import { timeAgo } from '../../../shared/utils/date';
import type { Comment } from '../../../types/student';

interface Props {
  lessonId: number;
}

export function CommentsTab({ lessonId }: Props) {
  const { T } = useTheme();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [text,     setText]     = useState('');
  const [sending,  setSending]  = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchLessonComments(lessonId);
      setComments(data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [lessonId]);

  useEffect(() => { load(); }, [load]);

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const created = await createLessonComment(lessonId, text.trim());
      setComments((prev) => [created, ...prev]);
      setText('');
    } catch { /* ignore */ }
    finally { setSending(false); }
  };

  if (loading) return <LoadingState message="Loading comments…" />;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      {/* Input */}
      <View style={[styles.inputRow, { backgroundColor: T.surface, borderColor: T.border }]}>
        <TextInput
          style={[styles.input, { color: T.text }]}
          value={text}
          onChangeText={setText}
          placeholder="Write a comment…"
          placeholderTextColor={T.placeholder}
          multiline
          returnKeyType="send"
        />
        <TouchableOpacity
          onPress={handleSend}
          disabled={!text.trim() || sending}
          style={[styles.sendBtn, { opacity: text.trim() ? 1 : 0.4 }]}
        >
          <Send size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      {comments.length === 0 ? (
        <EmptyState emoji="💬" title="No comments yet" subtitle="Be the first to comment!" />
      ) : (
        <FlatList
          data={comments}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <CommentItem comment={item} T={T} />}
          scrollEnabled={false}
          style={styles.list}
        />
      )}
    </KeyboardAvoidingView>
  );
}

function CommentItem({ comment, T }: { comment: Comment; T: ReturnType<typeof useTheme>['T'] }) {
  return (
    <View style={[styles.commentCard, { backgroundColor: T.surface, borderColor: T.border }]}>
      <View style={styles.commentHeader}>
        <Avatar name={comment.user.name} uri={comment.user.avatarUrl} size={32} />
        <View style={styles.commentMeta}>
          <Text style={[styles.commentUser, { color: T.text }]}>{comment.user.name}</Text>
          <Text style={[styles.commentTime, { color: T.muted }]}>{timeAgo(comment.createdAt)}</Text>
        </View>
      </View>
      <Text style={[styles.commentBody, { color: T.subtext }]}>{comment.content}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: spacing[2],
    padding: spacing[3], borderRadius: radius.xl, borderWidth: 1, marginBottom: spacing[4],
  },
  input:   { flex: 1, maxHeight: 80, fontSize: fontSize.sm },
  sendBtn: {
    width: 36, height: 36, borderRadius: radius.lg,
    backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center',
  },
  list: { marginTop: spacing[2] },
  commentCard: {
    borderRadius: radius.lg, borderWidth: 1,
    padding: spacing[3], marginBottom: spacing[2],
  },
  commentHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginBottom: spacing[2] },
  commentMeta:   { flex: 1 },
  commentUser:   { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  commentTime:   { fontSize: fontSize.xs },
  commentBody:   { fontSize: fontSize.sm, lineHeight: 20 },
});
