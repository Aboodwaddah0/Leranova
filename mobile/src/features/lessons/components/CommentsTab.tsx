import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  FlatList, StyleSheet, ActivityIndicator,
} from 'react-native';
import { Send, RefreshCw } from 'lucide-react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import { Avatar, EmptyState } from '../../../shared/components';
import { spacing, radius, fontSize, fontWeight } from '../../../shared/theme';
import { fetchLessonComments, createLessonComment } from '../../student/services/studentService';
import { timeAgo } from '../../../shared/utils/date';
import type { Comment } from '../../../types/student';

interface Props { lessonId: number }

export function CommentsTab({ lessonId }: Props) {
  const { T } = useTheme();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [text,     setText]     = useState('');
  const [sending,  setSending]  = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchLessonComments(lessonId);
      setComments(data);
    } catch {
      setError('Could not load comments.');
    } finally {
      setLoading(false);
    }
  }, [lessonId]);

  useEffect(() => { load(); }, [load]);

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const created = await createLessonComment(lessonId, text.trim());
      setComments((prev) => [created, ...prev]);
      setText('');
    } catch { /* noop */ } finally { setSending(false); }
  };

  return (
    <View>
      {/* ── Input ──────────────────────────────────────────────────────── */}
      <View style={[S.inputRow, { backgroundColor: T.surface, borderColor: T.border }]}>
        <TextInput
          style={[S.input, { color: T.text }]}
          value={text}
          onChangeText={setText}
          placeholder="Write a comment…"
          placeholderTextColor={T.placeholder}
          multiline
          returnKeyType="send"
          onSubmitEditing={handleSend}
          blurOnSubmit={false}
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

      {/* ── States ─────────────────────────────────────────────────────── */}
      {loading ? (
        <View style={S.center}>
          <ActivityIndicator color={T.primary} />
        </View>
      ) : error ? (
        <View style={S.center}>
          <Text style={[S.errText, { color: T.muted }]}>{error}</Text>
          <TouchableOpacity onPress={load} style={[S.retryBtn, { borderColor: T.border }]}>
            <RefreshCw size={14} color={T.primary} />
            <Text style={[S.retryLabel, { color: T.primary }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : comments.length === 0 ? (
        <EmptyState emoji="💬" title="No comments yet" subtitle="Be the first to comment!" />
      ) : (
        <FlatList
          data={comments}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <CommentItem comment={item} T={T} />}
          scrollEnabled={false}
          style={S.list}
          ItemSeparatorComponent={() => <View style={{ height: spacing[2] }} />}
        />
      )}
    </View>
  );
}

function CommentItem({
  comment, T,
}: {
  comment: Comment;
  T: ReturnType<typeof useTheme>['T'];
}) {
  const user = comment?.user;
  if (!user) return null;
  return (
    <View style={[S.card, { backgroundColor: T.surface, borderColor: T.border }]}>
      <View style={S.cardHeader}>
        <Avatar name={user.name ?? '?'} uri={user.avatarUrl} size={32} />
        <View style={S.meta}>
          <Text style={[S.userName, { color: T.text }]}>{user.name}</Text>
          <Text style={[S.time,     { color: T.muted }]}>{timeAgo(comment.createdAt)}</Text>
        </View>
      </View>
      <Text style={[S.body, { color: T.subtext }]}>{comment.content}</Text>
    </View>
  );
}

const S = StyleSheet.create({
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: spacing[2],
    padding: spacing[3], borderRadius: radius.xl, borderWidth: 1,
    marginBottom: spacing[4],
  },
  input:   { flex: 1, maxHeight: 80, fontSize: fontSize.sm },
  sendBtn: {
    width: 38, height: 38, borderRadius: radius.lg,
    backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center',
  },
  list: { marginTop: spacing[1] },

  center:    { paddingVertical: spacing[8], alignItems: 'center', gap: spacing[3] },
  errText:   { fontSize: fontSize.sm },
  retryBtn:  { flexDirection: 'row', alignItems: 'center', gap: spacing[2], paddingHorizontal: spacing[4], paddingVertical: spacing[2], borderRadius: radius.full, borderWidth: 1 },
  retryLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },

  card: { borderRadius: radius.lg, borderWidth: 1, padding: spacing[3] },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginBottom: spacing[2] },
  meta:    { flex: 1 },
  userName: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  time:     { fontSize: fontSize.xs },
  body:     { fontSize: fontSize.sm, lineHeight: 20 },
});
