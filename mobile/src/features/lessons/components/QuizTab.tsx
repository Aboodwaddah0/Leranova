import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, StyleSheet } from 'react-native';
import { CheckCircle2, XCircle, Trophy } from 'lucide-react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import { Button, EmptyState } from '../../../shared/components';
import { spacing, radius, fontSize, fontWeight } from '../../../shared/theme';
import { submitStudentQuizAttempt } from '../../student/services/studentService';
import type { QuizQuestion, QuizAttemptAnswer, QuizResult } from '../../../types/student';

type Phase = 'start' | 'in-progress' | 'result';

interface Props {
  quizData: { questions?: QuizQuestion[]; published?: boolean } | null;
  lessonId: number;
}

export function QuizTab({ quizData, lessonId }: Props) {
  const { T, isDark } = useTheme();
  const [phase,    setPhase]    = useState<Phase>('start');
  const [answers,  setAnswers]  = useState<Record<string, string>>({});
  const [result,   setResult]   = useState<QuizResult | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const questions = quizData?.questions ?? [];

  if (!quizData?.published || questions.length === 0) {
    return <EmptyState emoji="📝" title="No quiz yet" subtitle="Your instructor hasn't published a quiz for this lesson yet." />;
  }

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      const attemptAnswers: QuizAttemptAnswer[] = questions.map((q) => ({
        questionId: q.id,
        answer: answers[q.id] ?? '',
      }));
      const res = await submitStudentQuizAttempt(lessonId, attemptAnswers);
      setResult(res);
      setPhase('result');
    } catch {
      setError('Failed to submit quiz. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── START ────────────────────────────────────────────────────────────────
  if (phase === 'start') {
    return (
      <View style={[styles.startCard, { backgroundColor: T.surface, borderColor: T.border }]}>
        <Text style={styles.startEmoji}>📝</Text>
        <Text style={[styles.startTitle, { color: T.text }]}>Ready for the Quiz?</Text>
        <Text style={[styles.startSub, { color: T.muted }]}>{questions.length} questions</Text>
        <Button label="Start Quiz" onPress={() => setPhase('in-progress')} fullWidth style={{ marginTop: spacing[4] }} />
      </View>
    );
  }

  // ── RESULT ───────────────────────────────────────────────────────────────
  if (phase === 'result' && result) {
    const pct   = Math.round((result.score / result.total) * 100);
    const passed = result.passed;
    return (
      <View style={styles.container}>
        <View style={[styles.resultCard, { backgroundColor: T.surface, borderColor: T.border }]}>
          <Trophy size={48} color={passed ? '#fbbf24' : T.muted} />
          <Text style={[styles.resultScore, { color: passed ? '#34d399' : '#f87171' }]}>{result.score}/{result.total}</Text>
          <Text style={[styles.resultPct, { color: T.text }]}>{pct}%</Text>
          <Text style={[styles.resultStatus, { color: passed ? '#34d399' : '#f87171' }]}>
            {passed ? 'Passed! 🎉' : 'Keep practicing!'}
          </Text>
          <Button
            label="Try Again"
            variant="secondary"
            onPress={() => { setPhase('start'); setAnswers({}); setResult(null); }}
            style={{ marginTop: spacing[4] }}
          />
        </View>

        {/* Per-question feedback */}
        {result.answers?.map((a, i) => {
          const q = questions.find((q) => q.id === a.questionId);
          return (
            <View key={a.questionId} style={[styles.fbCard, { backgroundColor: T.surface, borderColor: a.correct ? 'rgba(52,211,153,0.3)' : 'rgba(248,113,113,0.3)' }]}>
              <View style={styles.fbRow}>
                {a.correct
                  ? <CheckCircle2 size={16} color="#34d399" />
                  : <XCircle     size={16} color="#f87171" />
                }
                <Text style={[styles.fbQ, { color: T.text }]} numberOfLines={2}>{q?.question ?? `Q${i + 1}`}</Text>
              </View>
              {a.feedback && <Text style={[styles.fbFeedback, { color: T.muted }]}>{a.feedback}</Text>}
            </View>
          );
        })}
      </View>
    );
  }

  // ── IN PROGRESS ──────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {error ? (
        <Text style={[styles.errText, { color: '#f87171' }]}>{error}</Text>
      ) : null}

      {questions.map((q, qi) => (
        <View key={q.id} style={[styles.questionCard, { backgroundColor: T.surface, borderColor: T.border }]}>
          <Text style={[styles.qIndex, { color: T.primary }]}>Q{qi + 1}</Text>
          <Text style={[styles.qText, { color: T.text }]}>{q.question}</Text>

          {/* Multiple choice / true-false */}
          {(q.type === 'MULTIPLE_CHOICE' || q.type === 'TRUE_FALSE') && q.options && (
            <View style={styles.optionsCol}>
              {q.options.map((opt) => {
                const selected = answers[q.id] === opt;
                return (
                  <TouchableOpacity
                    key={opt}
                    onPress={() => setAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                    style={[
                      styles.optionBtn,
                      selected
                        ? { backgroundColor: '#4f46e5', borderColor: '#6366f1' }
                        : { backgroundColor: T.elevated, borderColor: T.border },
                    ]}
                  >
                    <Text style={[styles.optionText, { color: selected ? '#fff' : T.text }]}>{opt}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Short answer */}
          {q.type === 'SHORT_ANSWER' && (
            <TextInput
              style={[styles.shortInput, { backgroundColor: T.inputBg, borderColor: T.inputBorder, color: T.text }]}
              value={answers[q.id] ?? ''}
              onChangeText={(v) => setAnswers((prev) => ({ ...prev, [q.id]: v }))}
              placeholder="Type your answer…"
              placeholderTextColor={T.placeholder}
              multiline
            />
          )}
        </View>
      ))}

      <Button
        label="Submit Quiz"
        onPress={handleSubmit}
        loading={loading}
        fullWidth
        style={{ marginTop: spacing[4] }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing[3] },
  startCard: {
    alignItems: 'center', padding: spacing[8],
    borderRadius: radius['2xl'], borderWidth: 1,
  },
  startEmoji: { fontSize: 48, marginBottom: spacing[3] },
  startTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold },
  startSub:   { fontSize: fontSize.sm, marginTop: spacing[1] },

  resultCard: {
    alignItems: 'center', padding: spacing[8],
    borderRadius: radius['2xl'], borderWidth: 1, gap: spacing[2],
  },
  resultScore:  { fontSize: 48, fontWeight: fontWeight.extrabold, marginTop: spacing[2] },
  resultPct:    { fontSize: fontSize.xl, fontWeight: fontWeight.semibold },
  resultStatus: { fontSize: fontSize.md, fontWeight: fontWeight.bold },

  fbCard: { padding: spacing[3], borderRadius: radius.lg, borderWidth: 1 },
  fbRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[2] },
  fbQ:    { flex: 1, fontSize: fontSize.sm, fontWeight: fontWeight.medium },
  fbFeedback: { fontSize: fontSize.xs, marginTop: spacing[1], marginLeft: spacing[5] },

  questionCard: { padding: spacing[4], borderRadius: radius.xl, borderWidth: 1 },
  qIndex: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, letterSpacing: 1, marginBottom: spacing[1] },
  qText:  { fontSize: fontSize.base, fontWeight: fontWeight.semibold, lineHeight: 22, marginBottom: spacing[3] },

  optionsCol: { gap: spacing[2] },
  optionBtn:  { padding: spacing[3], borderRadius: radius.lg, borderWidth: 1 },
  optionText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium },

  shortInput: {
    minHeight: 80, borderRadius: radius.lg, borderWidth: 1,
    padding: spacing[3], fontSize: fontSize.sm,
    textAlignVertical: 'top',
  },
  errText: { fontSize: fontSize.sm, padding: spacing[3] },
});
