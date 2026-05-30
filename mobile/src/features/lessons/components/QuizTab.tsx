/**
 * QuizTab — mirrors the web Quiz.jsx component exactly.
 *
 * Phases:  start → in-progress (one question at a time) → result (review)
 * Answers: indexed array  MCQ/TF = option index (number), SHORT = text string
 */
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, TextInput,
  ScrollView, StyleSheet, ActivityIndicator,
} from 'react-native';
import { ChevronLeft, Trophy } from 'lucide-react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import { EmptyState } from '../../../shared/components';
import { spacing, radius, fontSize, fontWeight } from '../../../shared/theme';
import { submitStudentQuizAttempt } from '../../student/services/studentService';

type Phase = 'start' | 'in-progress' | 'result';

interface QuizQuestion {
  id: string | number;
  type?: string;
  question: string;
  options?: unknown[];
  correctAnswer?: unknown;
  expectedAnswer?: string;
  explanation?: string;
}

interface QuizData {
  title?: string;
  description?: string;
  difficulty?: string;
  passingScore?: number;
  published?: boolean;
  isPublished?: boolean;
  questions?: QuizQuestion[];
  status?: string;
  availableFrom?: string;
  availableTo?: string;
}

interface Props {
  quizData: QuizData | null;
  lessonId: number;
}

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

// ── Option button (idle / selected / correct / wrong) ─────────────────────────
function OptionBtn({
  letter, text, state, onPress, T,
}: {
  letter: string;
  text: string;
  state: 'idle' | 'selected' | 'correct' | 'wrong';
  onPress?: () => void;
  T: ReturnType<typeof useTheme>['T'];
}) {
  const bubbleStyle = {
    idle:     { bg: T.elevated,           border: T.border,    text: T.text,    dot: T.muted },
    selected: { bg: '#4f46e5',            border: '#6366f1',   text: '#fff',    dot: '#fff'  },
    correct:  { bg: 'rgba(52,211,153,.12)', border: '#34d399',  text: '#34d399', dot: '#34d399' },
    wrong:    { bg: 'rgba(248,113,113,.1)', border: '#f87171',  text: '#f87171', dot: '#f87171' },
  }[state];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={state === 'correct' || state === 'wrong'}
      activeOpacity={0.75}
      style={[S.optBtn, { backgroundColor: bubbleStyle.bg, borderColor: bubbleStyle.border }]}
    >
      <View style={[S.optDot, { borderColor: bubbleStyle.dot }]}>
        <Text style={[S.optDotText, { color: bubbleStyle.dot }]}>
          {state === 'correct' ? '✓' : state === 'wrong' ? '✗' : letter}
        </Text>
      </View>
      <Text style={[
        S.optText,
        { color: bubbleStyle.text },
        state === 'wrong' && { textDecorationLine: 'line-through', opacity: 0.65 },
      ]} dir="auto">
        {String(text)}
      </Text>
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export function QuizTab({ quizData, lessonId }: Props) {
  const { T, isDark } = useTheme();

  const [phase,   setPhase]   = useState<Phase>('start');
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number | string>>({});
  const [result,  setResult]  = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  // ── Guards ────────────────────────────────────────────────────────────────
  if (!quizData) {
    return <EmptyState emoji="📝" title="No quiz yet" subtitle="Your instructor hasn't published a quiz for this lesson yet." />;
  }

  if (quizData.status === 'not_yet_available') {
    return <EmptyState emoji="🔒" title="Not open yet" subtitle={quizData.availableFrom ? `Opens: ${new Date(quizData.availableFrom).toLocaleDateString()}` : ''} />;
  }
  if (quizData.status === 'expired') {
    return <EmptyState emoji="⏰" title="Quiz ended" subtitle={quizData.availableTo ? `Ended: ${new Date(quizData.availableTo).toLocaleDateString()}` : ''} />;
  }

  const isPublished = quizData.published ?? quizData.isPublished;
  const questions   = quizData.questions ?? [];

  if (!isPublished || questions.length === 0) {
    return <EmptyState emoji="📝" title="No quiz yet" subtitle="Your instructor hasn't published a quiz for this lesson yet." />;
  }

  const total      = questions.length;
  const answered   = Object.keys(answers).filter((k) => answers[Number(k)] !== undefined && answers[Number(k)] !== '').length;
  const allAnswered = answered === total;

  // ── START ─────────────────────────────────────────────────────────────────
  if (phase === 'start') {
    return (
      <View style={[S.card, { backgroundColor: T.surface, borderColor: T.border }]}>
        {/* Gradient header */}
        <View style={S.startGradient}>
          <Text style={S.startEmoji}>🧠</Text>
          <Text style={S.startTitle}>{quizData.title ?? 'Quiz'}</Text>
          {quizData.description ? (
            <Text style={S.startDesc}>{quizData.description}</Text>
          ) : null}
        </View>

        {/* Stats row */}
        <View style={[S.statsRow, { borderBottomColor: T.border }]}>
          <StatPill icon="❓" label="Questions" value={String(total)} color={T.primary} T={T} />
          <View style={[S.statsDivider, { backgroundColor: T.border }]} />
          <StatPill icon="🏆" label="To pass"   value={`${quizData.passingScore ?? 70}%`} color="#34d399" T={T} />
          <View style={[S.statsDivider, { backgroundColor: T.border }]} />
          <StatPill icon="📊" label="Difficulty" value={quizData.difficulty ?? 'MEDIUM'} color="#fbbf24" T={T} />
        </View>

        {/* Start btn */}
        <TouchableOpacity
          onPress={() => { setPhase('in-progress'); setCurrent(0); setAnswers({}); }}
          style={S.startBtn}
          activeOpacity={0.85}
        >
          <Text style={S.startBtnText}>▶ Start Quiz Now</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── SUBMIT handler ────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!allAnswered || loading) return;
    setLoading(true);
    setError('');
    try {
      const answersArr = questions.map((q, i) => {
        const a = answers[i];
        if (a !== undefined) return a;
        return (q.type ?? 'MULTIPLE_CHOICE') === 'SHORT_ANSWER' ? '' : -1;
      });
      const res = await submitStudentQuizAttempt(lessonId, answersArr);
      if (res) { setResult(res); setPhase('result'); }
      else     setError('Failed to submit. Please try again.');
    } catch {
      setError('Failed to submit. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── IN PROGRESS ───────────────────────────────────────────────────────────
  if (phase === 'in-progress') {
    const q       = questions[current];
    const qType   = q.type ?? 'MULTIPLE_CHOICE';
    const curAns  = answers[current];
    const options = (q.options ?? []) as string[];
    const isLast  = current === total - 1;

    return (
      <View style={[S.card, { backgroundColor: T.surface, borderColor: T.border }]}>
        {/* ── Header ───────────────────────────────────────────────── */}
        <View style={[S.progressHeader, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc', borderBottomColor: T.border }]}>
          <View style={S.progressTopRow}>
            <Text style={[S.progressLabel, { color: T.muted }]}>
              Question {current + 1} of {total}
            </Text>
            <Text style={[S.progressLabel, { color: T.muted }]}>
              {answered}/{total} answered
            </Text>
          </View>

          {/* Progress bar */}
          <View style={[S.progBarBg, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9' }]}>
            <View style={[S.progBarFill, { width: `${((current + 1) / total) * 100}%` }]} />
          </View>

          {/* Dot indicators */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={S.dotsScroll} contentContainerStyle={S.dotsRow}>
            {questions.map((_, i) => {
              const isActive   = i === current;
              const isAnswered = answers[i] !== undefined && answers[i] !== '';
              return (
                <TouchableOpacity key={i} onPress={() => setCurrent(i)} style={[
                  S.dot,
                  {
                    width:           isActive ? 24 : 10,
                    backgroundColor: isActive  ? '#6366f1'
                      : isAnswered ? '#a5b4fc'
                      : (isDark ? 'rgba(255,255,255,0.12)' : '#e2e8f0'),
                  },
                ]} />
              );
            })}
          </ScrollView>
        </View>

        {/* ── Question body ─────────────────────────────────────── */}
        <View style={S.qBody}>
          <Text style={[S.qText, { color: T.text }]}>{q.question}</Text>

          {/* MCQ */}
          {qType === 'MULTIPLE_CHOICE' && (
            <View style={S.optionsCol}>
              {options.map((opt, oi) => (
                <OptionBtn
                  key={oi} letter={LETTERS[oi]} text={opt} T={T}
                  state={curAns === oi ? 'selected' : 'idle'}
                  onPress={() => setAnswers((p) => ({ ...p, [current]: oi }))}
                />
              ))}
            </View>
          )}

          {/* True / False */}
          {qType === 'TRUE_FALSE' && (
            <View style={S.tfRow}>
              {[{ label: '✓ True', val: 0 }, { label: '✗ False', val: 1 }].map(({ label, val }) => (
                <TouchableOpacity
                  key={val}
                  onPress={() => setAnswers((p) => ({ ...p, [current]: val }))}
                  style={[S.tfBtn, curAns === val
                    ? { backgroundColor: '#4f46e5', borderColor: '#6366f1' }
                    : { backgroundColor: T.elevated, borderColor: T.border },
                  ]}
                >
                  <Text style={[S.tfBtnText, { color: curAns === val ? '#fff' : T.text }]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Short answer */}
          {qType === 'SHORT_ANSWER' && (
            <View>
              <TextInput
                style={[S.shortInput, { backgroundColor: T.inputBg, borderColor: T.inputBorder, color: T.text }]}
                value={String(curAns ?? '')}
                onChangeText={(v) => setAnswers((p) => ({ ...p, [current]: v }))}
                placeholder="Write your answer here…"
                placeholderTextColor={T.placeholder}
                multiline
                textAlignVertical="top"
              />
              <Text style={[S.aiNote, { color: '#818cf8' }]}>
                ✨ AI will grade your answer after submission
              </Text>
            </View>
          )}
        </View>

        {/* ── Navigation footer ─────────────────────────────────── */}
        {error ? <Text style={[S.errText, { color: '#f87171' }]}>{error}</Text> : null}

        <View style={[S.navRow, { borderTopColor: T.border }]}>
          {/* Prev */}
          <TouchableOpacity
            onPress={() => setCurrent((c) => Math.max(0, c - 1))}
            disabled={current === 0}
            style={[S.prevBtn, { backgroundColor: T.elevated, borderColor: T.border, opacity: current === 0 ? 0.3 : 1 }]}
          >
            <ChevronLeft size={18} color={T.muted} />
          </TouchableOpacity>

          {/* Next or Submit */}
          {!isLast ? (
            <TouchableOpacity
              onPress={() => setCurrent((c) => c + 1)}
              style={S.nextBtn}
              activeOpacity={0.85}
            >
              <Text style={S.nextBtnText}>▶ Next</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={!allAnswered || loading}
              style={[S.submitBtn, { opacity: allAnswered && !loading ? 1 : 0.4 }]}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={S.submitBtnText}>
                    {allAnswered
                      ? '📤 Submit Quiz'
                      : `Answer ${total - answered} more`}
                  </Text>}
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  // ── RESULT ────────────────────────────────────────────────────────────────
  const attempt    = (result?.attempt   as Record<string, unknown>) ?? {};
  const reviewQs   = ((result?.questions as QuizQuestion[]) ?? []);
  const aiGrading  = (attempt.aiGrading as Record<string, Record<string, unknown>>) ?? {};
  const rawAnswers = (attempt.answers   as unknown[]) ?? [];
  const score      = Number(attempt.score   ?? 0);
  const passed     = Boolean(attempt.isPassed);

  const correctCount = reviewQs.filter((q, i) => {
    if ((q.type ?? 'MULTIPLE_CHOICE') === 'SHORT_ANSWER') {
      return aiGrading[String(q.id)]?.correct === true;
    }
    return rawAnswers[i] === q.correctAnswer;
  }).length;

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: spacing[3], paddingBottom: spacing[6] }}>
      {/* ── Score banner ────────────────────────────────────────── */}
      <View style={[
        S.scoreBanner,
        {
          borderColor:       passed ? '#34d399' : '#f87171',
          backgroundColor:   passed
            ? (isDark ? 'rgba(52,211,153,0.07)' : '#ecfdf5')
            : (isDark ? 'rgba(248,113,113,0.07)' : '#fff1f2'),
        },
      ]}>
        <Text style={S.scoreBannerEmoji}>{passed ? '🎉' : '📚'}</Text>
        <Text style={[S.scorePct, { color: passed ? '#34d399' : '#f87171' }]}>{score}%</Text>
        <Text style={[S.scoreStatus, { color: passed ? '#34d399' : '#f87171' }]}>
          {passed ? '✅ Well done! You passed' : '❌ Not passed this time'}
        </Text>
        <Text style={[S.scoreReq, { color: T.muted }]}>
          Required to pass: {quizData.passingScore ?? 70}%
        </Text>

        {/* Correct / Wrong / Total */}
        <View style={[S.statsGrid, { borderTopColor: T.border }]}>
          {[
            { val: correctCount,         label: 'Correct', color: '#34d399' },
            { val: total - correctCount, label: 'Wrong',   color: '#f87171' },
            { val: total,                label: 'Total',   color: T.text   },
          ].map((s, i) => (
            <View key={i} style={[S.statCell, i > 0 && { borderLeftColor: T.border, borderLeftWidth: 1 }]}>
              <Text style={[S.statVal, { color: s.color }]}>{s.val}</Text>
              <Text style={[S.statLabel, { color: T.muted }]}>{s.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── Review divider ─────────────────────────────────────── */}
      <View style={S.dividerRow}>
        <View style={[S.dividerLine, { backgroundColor: T.border }]} />
        <Text style={[S.dividerText, { color: T.muted }]}>ANSWER REVIEW</Text>
        <View style={[S.dividerLine, { backgroundColor: T.border }]} />
      </View>

      {/* ── Review cards ───────────────────────────────────────── */}
      {reviewQs.map((q, qi) => {
        const qType       = q.type ?? 'MULTIPLE_CHOICE';
        const studentAns  = rawAnswers[qi];
        const aiResult    = aiGrading[String(q.id)];
        const isCorrect   = qType === 'SHORT_ANSWER'
          ? aiResult?.correct === true
          : studentAns === q.correctAnswer;
        const options     = (q.options ?? []) as string[];

        return (
          <View key={String(q.id)} style={[S.reviewCard, { backgroundColor: T.surface, borderColor: T.border }]}>
            {/* Question header */}
            <View style={[S.reviewHeader, {
              backgroundColor: isCorrect
                ? (isDark ? 'rgba(52,211,153,0.08)' : '#ecfdf5')
                : (isDark ? 'rgba(248,113,113,0.08)' : '#fff1f2'),
            }]}>
              <View style={[S.reviewBadge, { backgroundColor: isCorrect ? '#34d399' : '#f87171' }]}>
                <Text style={S.reviewBadgeText}>{isCorrect ? '✓' : '✗'}</Text>
              </View>
              <Text style={[S.reviewQuestion, { color: T.text }]}>{q.question}</Text>
            </View>

            {/* Options review (MCQ) */}
            {qType === 'MULTIPLE_CHOICE' && (
              <View style={[S.reviewBody, { gap: spacing[2] }]}>
                {options.map((opt, oi) => {
                  let state: 'idle' | 'correct' | 'wrong' = 'idle';
                  if (oi === q.correctAnswer) state = 'correct';
                  else if (oi === studentAns && !isCorrect) state = 'wrong';
                  return <OptionBtn key={oi} letter={LETTERS[oi]} text={opt} state={state} T={T} />;
                })}
              </View>
            )}

            {/* True / False review */}
            {qType === 'TRUE_FALSE' && (
              <View style={[S.reviewBody, S.tfRow]}>
                {[{ label: '✓ True', val: 0 }, { label: '✗ False', val: 1 }].map(({ label, val }) => {
                  const st = val === q.correctAnswer ? 'correct' : (val === studentAns && !isCorrect ? 'wrong' : 'idle');
                  return (
                    <View key={val} style={[S.tfBtn, {
                      borderColor: st === 'correct' ? '#34d399' : st === 'wrong' ? '#f87171' : T.border,
                      backgroundColor: st === 'correct'
                        ? (isDark ? 'rgba(52,211,153,0.12)' : '#ecfdf5')
                        : st === 'wrong' ? (isDark ? 'rgba(248,113,113,0.1)' : '#fff1f2')
                        : T.elevated,
                    }]}>
                      <Text style={{ color: st === 'correct' ? '#34d399' : st === 'wrong' ? '#f87171' : T.muted, fontWeight: fontWeight.bold, fontSize: fontSize.sm }}>
                        {label}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Short answer review */}
            {qType === 'SHORT_ANSWER' && (
              <View style={[S.reviewBody, { gap: spacing[2] }]}>
                <View style={[S.shortAnsBox, {
                  borderColor: isCorrect ? '#34d399' : '#f87171',
                  backgroundColor: isCorrect ? (isDark ? 'rgba(52,211,153,0.07)' : '#ecfdf5') : (isDark ? 'rgba(248,113,113,0.07)' : '#fff1f2'),
                }]}>
                  <Text style={[S.shortAnsLabel, { color: T.muted }]}>Your answer</Text>
                  <Text style={[S.shortAnsText, { color: isCorrect ? '#34d399' : '#f87171' }]}>
                    {String(studentAns ?? '(no answer)')}
                  </Text>
                </View>
                {aiResult?.feedback ? (
                  <View style={[S.aiFbBox, { borderColor: 'rgba(139,92,246,0.3)', backgroundColor: isDark ? 'rgba(139,92,246,0.1)' : '#f5f3ff' }]}>
                    <Text style={[S.aiFbTitle, { color: '#818cf8' }]}>✨ AI Feedback:</Text>
                    <Text style={[S.aiFbText, { color: '#818cf8' }]}>{String(aiResult.feedback)}</Text>
                  </View>
                ) : null}
              </View>
            )}

            {/* Explanation */}
            {q.explanation ? (
              <View style={[S.explanation, { borderTopColor: T.border, backgroundColor: isDark ? 'rgba(99,102,241,0.08)' : '#eef2ff' }]}>
                <Text style={[S.explanationText, { color: isDark ? '#818cf8' : '#4338ca' }]}>
                  💡 {q.explanation}
                </Text>
              </View>
            ) : null}
          </View>
        );
      })}

      {/* Try again */}
      <TouchableOpacity
        onPress={() => { setPhase('start'); setAnswers({}); setResult(null); setCurrent(0); }}
        style={[S.tryAgainBtn, { borderColor: T.border, backgroundColor: T.elevated }]}
        activeOpacity={0.8}
      >
        <Text style={[S.tryAgainText, { color: T.text }]}>🔁 Try Again</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ── StatPill ──────────────────────────────────────────────────────────────────
function StatPill({ icon, label, value, color, T }: { icon: string; label: string; value: string; color: string; T: ReturnType<typeof useTheme>['T'] }) {
  return (
    <View style={S.statPill}>
      <Text style={S.statPillIcon}>{icon}</Text>
      <Text style={[S.statPillValue, { color }]}>{value}</Text>
      <Text style={[S.statPillLabel, { color: T.muted }]}>{label}</Text>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  card: { borderRadius: radius['2xl'], borderWidth: 1, overflow: 'hidden' },

  // Start
  startGradient: {
    backgroundColor: '#4f46e5', alignItems: 'center',
    paddingVertical: spacing[8], paddingHorizontal: spacing[6],
  },
  startEmoji: { fontSize: 40, marginBottom: spacing[3] },
  startTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.extrabold, color: '#fff', textAlign: 'center' },
  startDesc:  { fontSize: fontSize.sm, color: 'rgba(255,255,255,0.8)', marginTop: spacing[1], textAlign: 'center' },
  statsRow:   { flexDirection: 'row', borderBottomWidth: 1 },
  statsDivider: { width: 1, marginVertical: spacing[3] },
  statPill:   { flex: 1, alignItems: 'center', paddingVertical: spacing[4], gap: 2 },
  statPillIcon:  { fontSize: 18 },
  statPillValue: { fontSize: fontSize.md, fontWeight: fontWeight.extrabold },
  statPillLabel: { fontSize: 10, fontWeight: fontWeight.bold, textTransform: 'uppercase' },
  startBtn:   {
    margin: spacing[4], borderRadius: radius.xl,
    backgroundColor: '#6366f1', paddingVertical: spacing[4],
    alignItems: 'center',
  },
  startBtnText: { color: '#fff', fontWeight: fontWeight.bold, fontSize: fontSize.base },

  // Progress header
  progressHeader: { paddingHorizontal: spacing[4], paddingVertical: spacing[3], borderBottomWidth: 1 },
  progressTopRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing[2] },
  progressLabel:  { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  progBarBg:  { height: 8, borderRadius: radius.full, overflow: 'hidden' },
  progBarFill: { height: '100%', borderRadius: radius.full, backgroundColor: '#6366f1' },
  dotsScroll: { marginTop: spacing[2] },
  dotsRow:    { flexDirection: 'row', gap: spacing[1], alignItems: 'center', paddingVertical: 2 },
  dot:        { height: 10, borderRadius: 5 },

  // Question body
  qBody:     { padding: spacing[4], gap: spacing[3] },
  qText:     { fontSize: fontSize.base, fontWeight: fontWeight.bold, lineHeight: 24 },
  optionsCol: { gap: spacing[2] },
  optBtn:    { flexDirection: 'row', alignItems: 'center', gap: spacing[3], borderRadius: radius.xl, borderWidth: 2, padding: spacing[3] },
  optDot:    { width: 28, height: 28, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  optDotText: { fontSize: 11, fontWeight: fontWeight.extrabold },
  optText:   { flex: 1, fontSize: fontSize.sm, lineHeight: 18 },
  tfRow:     { flexDirection: 'row', gap: spacing[2] },
  tfBtn:     { flex: 1, borderRadius: radius.xl, borderWidth: 2, paddingVertical: spacing[4], alignItems: 'center', justifyContent: 'center' },
  tfBtnText: { fontSize: fontSize.base, fontWeight: fontWeight.extrabold },
  shortInput:{ borderWidth: 2, borderRadius: radius.xl, padding: spacing[3], minHeight: 100, fontSize: fontSize.sm, textAlignVertical: 'top' },
  aiNote:    { fontSize: 11, marginTop: spacing[1] },

  // Nav footer
  errText: { fontSize: fontSize.sm, paddingHorizontal: spacing[4], paddingBottom: spacing[2] },
  navRow:  { flexDirection: 'row', alignItems: 'center', gap: spacing[3], padding: spacing[4], borderTopWidth: 1 },
  prevBtn: { width: 44, height: 44, borderRadius: radius.xl, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  nextBtn: { flex: 1, borderRadius: radius.xl, backgroundColor: '#6366f1', paddingVertical: spacing[3], alignItems: 'center' },
  nextBtnText: { color: '#fff', fontWeight: fontWeight.bold, fontSize: fontSize.sm },
  submitBtn:  { flex: 1, borderRadius: radius.xl, paddingVertical: spacing[3], alignItems: 'center', backgroundColor: '#6366f1' },
  submitBtnText: { color: '#fff', fontWeight: fontWeight.bold, fontSize: fontSize.sm },

  // Result
  scoreBanner: { borderWidth: 2, borderRadius: radius['2xl'], overflow: 'hidden', alignItems: 'center', paddingTop: spacing[6], paddingBottom: 0 },
  scoreBannerEmoji: { fontSize: 44, marginBottom: spacing[2] },
  scorePct:    { fontSize: 48, fontWeight: fontWeight.extrabold, lineHeight: 56 },
  scoreStatus: { fontSize: fontSize.base, fontWeight: fontWeight.bold, marginTop: spacing[1] },
  scoreReq:    { fontSize: fontSize.xs, marginTop: 2, marginBottom: spacing[4] },
  statsGrid:   { flexDirection: 'row', width: '100%', borderTopWidth: 1, marginTop: spacing[2] },
  statCell:    { flex: 1, alignItems: 'center', paddingVertical: spacing[3] },
  statVal:     { fontSize: fontSize.xl, fontWeight: fontWeight.extrabold },
  statLabel:   { fontSize: 10, fontWeight: fontWeight.bold, textTransform: 'uppercase', marginTop: 2 },

  dividerRow:  { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 10, fontWeight: fontWeight.extrabold, letterSpacing: 1.2 },

  reviewCard:   { borderRadius: radius.xl, borderWidth: 1, overflow: 'hidden' },
  reviewHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[2], padding: spacing[3] },
  reviewBadge:  { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  reviewBadgeText: { color: '#fff', fontSize: 12, fontWeight: fontWeight.extrabold },
  reviewQuestion: { flex: 1, fontSize: fontSize.sm, fontWeight: fontWeight.semibold, lineHeight: 20 },
  reviewBody: { padding: spacing[3] },

  shortAnsBox:  { borderWidth: 2, borderRadius: radius.xl, padding: spacing[3] },
  shortAnsLabel: { fontSize: 10, fontWeight: fontWeight.bold, textTransform: 'uppercase', marginBottom: 2 },
  shortAnsText: { fontSize: fontSize.sm, lineHeight: 18 },
  aiFbBox:    { borderWidth: 1, borderRadius: radius.xl, padding: spacing[3] },
  aiFbTitle:  { fontSize: 11, fontWeight: fontWeight.bold, marginBottom: 2 },
  aiFbText:   { fontSize: fontSize.xs, lineHeight: 16 },

  explanation: { borderTopWidth: 1, padding: spacing[3] },
  explanationText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, lineHeight: 16 },

  tryAgainBtn:  { borderWidth: 1, borderRadius: radius.xl, paddingVertical: spacing[3], alignItems: 'center' },
  tryAgainText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
});
