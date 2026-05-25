import { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

const DIFF = {
  EASY:   { ar: 'سهل',   en: 'Easy',   color: 'bg-emerald-100 text-emerald-700' },
  MEDIUM: { ar: 'متوسط', en: 'Medium', color: 'bg-amber-100  text-amber-700'  },
  HARD:   { ar: 'صعب',   en: 'Hard',   color: 'bg-rose-100   text-rose-700'   },
};

function StatPill({ icon, label, value, accent }) {
  return (
    <div className={`flex flex-col items-center gap-1 rounded-2xl border px-5 py-3 ${accent}`}>
      <span className="text-xl">{icon}</span>
      <span className="text-lg font-black">{value}</span>
      <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">{label}</span>
    </div>
  );
}

function OptionBtn({ letter, text, state, onClick, isDark }) {
  const styleMap = {
    idle:     { border: `2px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}`, background: isDark ? 'rgba(255,255,255,0.04)' : '#ffffff', color: isDark ? 'rgba(255,255,255,0.7)' : '#374151' },
    selected: { border: '2px solid #6366f1', background: '#4f46e5', color: '#ffffff', boxShadow: '0 4px 14px rgba(99,102,241,0.35)' },
    correct:  { border: '2px solid #34d399', background: isDark ? 'rgba(52,211,153,0.1)' : '#ecfdf5', color: isDark ? '#34d399' : '#065f46' },
    wrong:    { border: '2px solid #f87171', background: isDark ? 'rgba(248,113,113,0.08)' : '#fff1f2', color: isDark ? '#f87171' : '#b91c1c', textDecoration: 'line-through', opacity: 0.6 },
  }[state] || {};

  const dotMap = {
    idle:     { border: `2px solid ${isDark ? 'rgba(255,255,255,0.15)' : '#cbd5e1'}`, background: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc', color: isDark ? 'rgba(255,255,255,0.4)' : '#64748b' },
    selected: { border: '2px solid #a5b4fc', background: '#ffffff', color: '#4f46e5' },
    correct:  { border: '2px solid #34d399', background: '#34d399', color: '#ffffff' },
    wrong:    { border: '2px solid #f87171', background: '#f87171', color: '#ffffff' },
  }[state] || {};

  return (
    <button type="button" onClick={onClick} disabled={state === 'correct' || state === 'wrong'}
      className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition-all duration-150"
      style={styleMap}>
      <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold" style={dotMap}>
        {state === 'correct' ? '✓' : state === 'wrong' ? '✗' : letter}
      </span>
      <span className="text-sm leading-snug" dir="auto">{text}</span>
    </button>
  );
}

export default function Quiz({ quiz, onSubmit, submitting, isArabic }) {
  const { isDark } = useTheme();
  const D = {
    card:    isDark ? '#111029'                : '#ffffff',
    border:  isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0',
    divider: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9',
    text:    isDark ? '#f1f0f5'                : '#0f172a',
    sub:     isDark ? 'rgba(255,255,255,0.5)'  : '#475569',
    muted:   isDark ? 'rgba(255,255,255,0.3)'  : '#94a3b8',
    hdrBg:   isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc',
    progBg:  isDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9',
    tfIdle:  { border: `2px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}`, background: isDark ? 'rgba(255,255,255,0.04)' : '#ffffff', color: isDark ? 'rgba(255,255,255,0.7)' : '#374151' },
    tfSel:   { border: '2px solid #6366f1', background: '#4f46e5', color: '#ffffff' },
    taArea:  { border: `2px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}`, background: isDark ? 'rgba(255,255,255,0.04)' : '#ffffff', color: isDark ? '#f1f0f5' : '#1e293b' },
    navBtn:  { border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}`, background: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff', color: isDark ? 'rgba(255,255,255,0.6)' : '#475569' },
    expBg:   isDark ? 'rgba(99,102,241,0.1)'   : '#eef2ff',
    expText: isDark ? '#818cf8'                : '#4338ca',
    aiFbBg:  isDark ? 'rgba(139,92,246,0.1)'   : '#f5f3ff',
    aiFbBorder: isDark ? 'rgba(139,92,246,0.3)' : '#ddd6fe',
    aiFbText: isDark ? '#a78bfa'               : '#6d28d9',
  };
  const [phase, setPhase] = useState('start');
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);

  if (!quiz) return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <span className="text-5xl">📋</span>
      <p className="text-sm font-semibold" style={{ color: D.muted }}>
        {isArabic ? 'لا يوجد اختبار لهذا الدرس.' : 'No quiz available for this lesson.'}
      </p>
    </div>
  );

  const questions = quiz.questions || [];
  const total = questions.length;
  const answered = Object.keys(answers).filter((k) => answers[k] !== undefined && answers[k] !== '').length;
  const diff = DIFF[quiz.difficulty] ?? DIFF.MEDIUM;

  /* ── START ── */
  if (phase === 'start') return (
    <div className="overflow-hidden rounded-3xl shadow-sm" style={{ border: `1px solid ${D.border}`, background: D.card }}>
      <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-cyan-500 px-8 py-10 text-center text-white">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 text-3xl backdrop-blur-sm">🧠</div>
        <h2 className="text-2xl font-black">{quiz.title}</h2>
        {quiz.description ? <p className="mt-2 text-sm text-blue-100/90">{quiz.description}</p> : null}
      </div>
      <div className="grid grid-cols-3 gap-3 px-6 py-6">
        <StatPill icon="❓" label={isArabic ? 'سؤال' : 'Questions'} value={total} accent="border-indigo-100 bg-indigo-50 text-indigo-700" />
        <StatPill icon="📊" label={isArabic ? 'المستوى' : 'Difficulty'} value={diff[isArabic ? 'ar' : 'en']} accent={`border-transparent ${diff.color}`} />
        <StatPill icon="🏆" label={isArabic ? 'للنجاح' : 'To pass'} value={`${quiz.passingScore}%`} accent="border-emerald-100 bg-emerald-50 text-emerald-700" />
      </div>
      <div className="px-6 pb-6">
        <button type="button" onClick={() => { setPhase('in-progress'); setCurrent(0); setAnswers({}); }}
          className="w-full rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-300/40 transition hover:opacity-90">
          {isArabic ? '▶ ابدأ الاختبار الآن' : '▶ Start Quiz Now'}
        </button>
      </div>
    </div>
  );

  /* ── IN PROGRESS ── */
  if (phase === 'in-progress') {
    const q = questions[current];
    const qType = q.type || 'MULTIPLE_CHOICE';
    const currentAnswer = answers[current];
    const progressPct = ((current + 1) / total) * 100;
    const allAnswered = answered === total;

    const handleSubmit = async () => {
      const answerArr = questions.map((_, i) => {
        const a = answers[i];
        return a !== undefined ? a : (questions[i].type === 'SHORT_ANSWER' ? '' : -1);
      });
      const res = await onSubmit(answerArr);
      if (res) { setResult(res); setPhase('result'); }
    };

    return (
      <div className="overflow-hidden rounded-3xl shadow-sm" style={{ border: `1px solid ${D.border}`, background: D.card }}>
        {/* Progress header */}
        <div className="px-5 py-4" style={{ borderBottom: `1px solid ${D.divider}`, background: D.hdrBg }}>
          <div className="flex items-center justify-between text-xs font-semibold" style={{ color: D.muted }}>
            <span>{isArabic ? `السؤال ${current + 1} من ${total}` : `Question ${current + 1} of ${total}`}</span>
            <span className="flex items-center gap-1.5">
              {qType === 'TRUE_FALSE'   && <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[9px] font-black text-blue-600">T/F</span>}
              {qType === 'SHORT_ANSWER' && <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-[9px] font-black text-violet-600">✨ {isArabic ? 'قصير' : 'Short'}</span>}
              <span>{isArabic ? `${answered}/${total} تمت الإجابة` : `${answered}/${total} answered`}</span>
            </span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full" style={{ background: D.progBg }}>
            <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300" style={{ width: `${progressPct}%` }} />
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {questions.map((_, i) => (
              <button key={i} type="button" onClick={() => setCurrent(i)}
                className="h-2.5 rounded-full transition-all duration-200"
                style={{ width: i === current ? 24 : 10, background: i === current ? '#6366f1' : (answers[i] !== undefined && answers[i] !== '') ? '#a5b4fc' : (isDark ? 'rgba(255,255,255,0.12)' : '#e2e8f0') }} />
            ))}
          </div>
        </div>

        {/* Question body */}
        <div className="px-5 py-5">
          <p className="mb-5 text-base font-bold leading-relaxed" style={{ color: D.text }} dir="auto">{q.question}</p>

          {qType === 'MULTIPLE_CHOICE' && (
            <div className="space-y-2.5">
              {(q.options || []).map((opt, oi) => (
                <OptionBtn key={oi} isDark={isDark} letter={String.fromCharCode(65 + oi)} text={opt}
                  state={currentAnswer === oi ? 'selected' : 'idle'}
                  onClick={() => setAnswers((prev) => ({ ...prev, [current]: oi }))} />
              ))}
            </div>
          )}

          {qType === 'TRUE_FALSE' && (
            <div className="flex gap-3">
              {[
                { label: isArabic ? '✓ صح' : '✓ True',  val: 0 },
                { label: isArabic ? '✗ خطأ' : '✗ False', val: 1 },
              ].map(({ label, val }) => (
                <button key={val} type="button"
                  onClick={() => setAnswers((prev) => ({ ...prev, [current]: val }))}
                  className="flex-1 rounded-2xl py-4 text-base font-black transition"
                  style={currentAnswer === val ? D.tfSel : D.tfIdle}>
                  {label}
                </button>
              ))}
            </div>
          )}

          {qType === 'SHORT_ANSWER' && (
            <div>
              <textarea
                value={currentAnswer || ''}
                onChange={(e) => setAnswers((prev) => ({ ...prev, [current]: e.target.value }))}
                rows={4}
                placeholder={isArabic ? 'اكتب إجابتك هنا...' : 'Write your answer here...'}
                className="w-full resize-none rounded-2xl px-4 py-3 text-sm leading-relaxed outline-none transition"
                style={D.taArea}
                dir="auto"
              />
              <p className="mt-1.5 text-[10px] text-violet-500">
                ✨ {isArabic ? 'سيقيّم الذكاء الاصطناعي إجابتك فور التسليم' : 'AI will grade your answer immediately after submission'}
              </p>
            </div>
          )}
        </div>

        {/* Navigation footer */}
        <div className="flex items-center gap-3 px-5 py-4" style={{ borderTop: `1px solid ${D.divider}` }}>
          <button type="button" onClick={() => setCurrent((c) => Math.max(0, c - 1))} disabled={current === 0}
            className="flex h-10 w-10 items-center justify-center rounded-xl transition disabled:opacity-30"
            style={D.navBtn}>◀</button>

          {current < total - 1 ? (
            <button type="button" onClick={() => setCurrent((c) => c + 1)}
              className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700">
              {isArabic ? 'التالي ▶' : '▶ Next'}
            </button>
          ) : (
            <button type="button" onClick={handleSubmit} disabled={!allAnswered || submitting}
              className="flex-1 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 py-2.5 text-sm font-bold text-white shadow-md transition hover:opacity-90 disabled:opacity-40">
              {submitting ? (isArabic ? '⏳ جارٍ التصحيح...' : '⏳ AI is grading...') : !allAnswered ? (isArabic ? `أجب على ${total - answered} سؤال أولاً` : `Answer ${total - answered} more`) : (isArabic ? '📤 تسليم الاختبار' : '📤 Submit Quiz')}
            </button>
          )}
        </div>
      </div>
    );
  }

  /* ── RESULT ── */
  const { attempt, questions: reviewQs } = result || {};
  const passed = attempt?.isPassed;
  const score = attempt?.score ?? 0;
  const aiGrading = attempt?.aiGrading ?? {};
  const correctCount = (reviewQs || []).filter((q, i) => {
    if ((q.type || 'MULTIPLE_CHOICE') === 'SHORT_ANSWER') return aiGrading[q.id]?.correct === true;
    return attempt?.answers?.[i] === q.correctAnswer;
  }).length;

  return (
    <div className="space-y-4">
      {/* Score banner */}
      <div className="overflow-hidden rounded-3xl" style={{
        border: `2px solid ${passed ? (isDark ? 'rgba(52,211,153,0.4)' : '#6ee7b7') : (isDark ? 'rgba(248,113,113,0.35)' : '#fca5a5')}`,
        background: passed
          ? (isDark ? 'rgba(52,211,153,0.07)' : 'linear-gradient(135deg,#ecfdf5,#f0fdfa)')
          : (isDark ? 'rgba(248,113,113,0.07)' : 'linear-gradient(135deg,#fff1f2,#fff7ed)'),
      }}>
        <div className="px-6 py-8 text-center">
          <div className="text-5xl mb-3">{passed ? '🎉' : '📚'}</div>
          <div className="text-5xl font-black" style={{ color: passed ? (isDark ? '#34d399' : '#059669') : (isDark ? '#f87171' : '#e11d48') }}>{score}%</div>
          <p className="mt-2 text-base font-bold" style={{ color: passed ? (isDark ? '#34d399' : '#065f46') : (isDark ? '#f87171' : '#9f1239') }}>
            {passed ? (isArabic ? '✅ أحسنت! اجتزت الاختبار' : '✅ Well done! You passed') : (isArabic ? '❌ لم تجتز الاختبار هذه المرة' : '❌ Not passed this time')}
          </p>
          <p className="mt-1 text-xs" style={{ color: D.muted }}>{isArabic ? `درجة النجاح المطلوبة: ${quiz.passingScore}%` : `Required to pass: ${quiz.passingScore}%`}</p>
        </div>
        <div className="grid grid-cols-3" style={{ borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.6)'}`, background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.5)' }}>
          {[
            { val: correctCount,         clr: isDark ? '#34d399' : '#059669', label: isArabic ? 'صحيح' : 'Correct' },
            { val: total - correctCount, clr: isDark ? '#f87171' : '#e11d48', label: isArabic ? 'خطأ'   : 'Wrong' },
            { val: total,                clr: D.text,                          label: isArabic ? 'إجمالي': 'Total' },
          ].map((s, i) => (
            <div key={i} className="px-4 py-3 text-center" style={{ borderLeft: i > 0 ? `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.5)'}` : 'none' }}>
              <p className="text-xl font-black" style={{ color: s.clr }}>{s.val}</p>
              <p className="text-[10px] font-bold uppercase" style={{ color: D.muted }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Review divider */}
      <div className="flex items-center gap-2">
        <div className="h-px flex-1" style={{ background: D.divider }} />
        <span className="text-xs font-bold uppercase tracking-widest" style={{ color: D.muted }}>{isArabic ? 'مراجعة الإجابات' : 'Answer Review'}</span>
        <div className="h-px flex-1" style={{ background: D.divider }} />
      </div>

      {/* Review cards */}
      {(reviewQs || []).map((q, qi) => {
        const qType = q.type || 'MULTIPLE_CHOICE';
        const studentAnswer = attempt?.answers?.[qi];
        const aiResult = aiGrading[q.id];
        const isCorrect = qType === 'SHORT_ANSWER' ? aiResult?.correct === true : studentAnswer === q.correctAnswer;

        return (
          <div key={q.id} className="overflow-hidden rounded-2xl shadow-sm" style={{ border: `1px solid ${D.border}`, background: D.card }}>
            <div className="flex items-start gap-3 px-4 py-3" style={{ background: isCorrect ? (isDark ? 'rgba(52,211,153,0.08)' : '#ecfdf5') : (isDark ? 'rgba(248,113,113,0.08)' : '#fff1f2') }}>
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-black text-white" style={{ background: isCorrect ? '#34d399' : '#f87171' }}>
                {isCorrect ? '✓' : '✗'}
              </span>
              <div className="flex-1">
                <p className="text-sm font-semibold leading-snug" style={{ color: D.text }} dir="auto">{q.question}</p>
                <div className="mt-1 flex gap-1">
                  {qType === 'TRUE_FALSE'   && <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[9px] font-black text-blue-600">T/F</span>}
                  {qType === 'SHORT_ANSWER' && <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-[9px] font-black text-violet-600">✨ AI graded</span>}
                </div>
              </div>
            </div>

            {qType === 'MULTIPLE_CHOICE' && (
              <div className="space-y-1.5 px-4 py-3">
                {(q.options || []).map((opt, oi) => {
                  let state = 'idle';
                  if (oi === q.correctAnswer) state = 'correct';
                  else if (oi === studentAnswer && !isCorrect) state = 'wrong';
                  return <OptionBtn key={oi} isDark={isDark} letter={String.fromCharCode(65 + oi)} text={opt} state={state} onClick={() => {}} />;
                })}
              </div>
            )}

            {qType === 'TRUE_FALSE' && (
              <div className="flex gap-2 px-4 py-3">
                {['True', 'False'].map((label, oi) => {
                  const st = oi === q.correctAnswer ? 'correct' : (oi === studentAnswer && !isCorrect ? 'wrong' : 'idle');
                  const styleMap = {
                    idle:    { border: `2px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}`, background: isDark ? 'rgba(255,255,255,0.03)' : '#fff', color: D.sub },
                    correct: { border: '2px solid #34d399', background: isDark ? 'rgba(52,211,153,0.1)' : '#ecfdf5', color: isDark ? '#34d399' : '#065f46' },
                    wrong:   { border: '2px solid #f87171', background: isDark ? 'rgba(248,113,113,0.08)' : '#fff1f2', color: isDark ? '#f87171' : '#9f1239', textDecoration: 'line-through' },
                  }[st];
                  return (
                    <div key={oi} className="flex-1 rounded-2xl py-3 text-center text-sm font-bold" style={styleMap}>
                      {oi === q.correctAnswer ? '✓ ' : ''}{isArabic ? (oi === 0 ? 'صح' : 'خطأ') : label}
                    </div>
                  );
                })}
              </div>
            )}

            {qType === 'SHORT_ANSWER' && (
              <div className="space-y-2 px-4 py-3">
                <div className="rounded-2xl p-3 text-sm" style={{
                  border: `2px solid ${isCorrect ? (isDark ? 'rgba(52,211,153,0.4)' : '#6ee7b7') : (isDark ? 'rgba(248,113,113,0.35)' : '#fca5a5')}`,
                  background: isCorrect ? (isDark ? 'rgba(52,211,153,0.07)' : '#ecfdf5') : (isDark ? 'rgba(248,113,113,0.07)' : '#fff1f2'),
                  color: isCorrect ? (isDark ? '#34d399' : '#065f46') : (isDark ? '#f87171' : '#9f1239'),
                }}>
                  <p className="text-[10px] font-bold uppercase tracking-wider opacity-70 mb-1">{isArabic ? 'إجابتك' : 'Your answer'}</p>
                  <p dir="auto">{studentAnswer || (isArabic ? '(لم تُقدَّم إجابة)' : '(no answer)')}</p>
                </div>
                {aiResult?.feedback && (
                  <div className="rounded-2xl p-3 text-xs" style={{ border: `1px solid ${D.aiFbBorder}`, background: D.aiFbBg, color: D.aiFbText }}>
                    <p className="font-bold mb-0.5">✨ {isArabic ? 'تغذية راجعة:' : 'AI Feedback:'}</p>
                    <p dir="auto">{aiResult.feedback}</p>
                  </div>
                )}
              </div>
            )}

            {q.explanation ? (
              <div className="px-4 py-3" style={{ borderTop: `1px solid ${D.divider}`, background: D.expBg }}>
                <p className="text-xs font-semibold" style={{ color: D.expText }} dir="auto">
                  💡 {isArabic ? 'الشرح: ' : 'Explanation: '}{q.explanation}
                </p>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
