import { useState } from 'react';

const DIFF = {
  EASY:   { ar: 'سهل',    en: 'Easy',   color: 'bg-emerald-100 text-emerald-700' },
  MEDIUM: { ar: 'متوسط', en: 'Medium', color: 'bg-amber-100  text-amber-700'  },
  HARD:   { ar: 'صعب',    en: 'Hard',   color: 'bg-rose-100   text-rose-700'   },
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

function OptionBtn({ letter, text, state, onClick }) {
  const styles = {
    idle:     'border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/60',
    selected: 'border-indigo-500 bg-indigo-600 text-white shadow-md shadow-indigo-300/40',
    correct:  'border-emerald-400 bg-emerald-50  text-emerald-800 font-semibold',
    wrong:    'border-rose-300   bg-rose-50    text-rose-700   line-through opacity-60',
  }[state] || 'border-slate-200 bg-white text-slate-700';

  const dotStyles = {
    idle:     'border-slate-300 bg-slate-50  text-slate-500',
    selected: 'border-indigo-400 bg-white    text-indigo-600 font-black',
    correct:  'border-emerald-500 bg-emerald-500 text-white',
    wrong:    'border-rose-400   bg-rose-400   text-white',
  }[state] || 'border-slate-300 bg-slate-50 text-slate-500';

  return (
    <button type="button" onClick={onClick} disabled={state === 'correct' || state === 'wrong'}
      className={`flex w-full items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left transition-all duration-150 ${styles}`}>
      <span className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold ${dotStyles}`}>
        {state === 'correct' ? '✓' : state === 'wrong' ? '✗' : letter}
      </span>
      <span className="text-sm leading-snug" dir="auto">{text}</span>
    </button>
  );
}

export default function Quiz({ quiz, onSubmit, submitting, isArabic }) {
  const [phase, setPhase] = useState('start');
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});   // { qi: value } — index for MCQ/TF, string for SA
  const [result, setResult] = useState(null);

  if (!quiz) return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <span className="text-5xl">📋</span>
      <p className="text-sm font-semibold text-slate-400">
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
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
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
      // Build answers array: MCQ/TF → index, SHORT_ANSWER → string
      const answerArr = questions.map((_, i) => {
        const a = answers[i];
        return a !== undefined ? a : (questions[i].type === 'SHORT_ANSWER' ? '' : -1);
      });
      const res = await onSubmit(answerArr);
      if (res) { setResult(res); setPhase('result'); }
    };

    return (
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        {/* Progress header */}
        <div className="border-b border-slate-100 px-5 py-4">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>{isArabic ? `السؤال ${current + 1} من ${total}` : `Question ${current + 1} of ${total}`}</span>
            <span className="flex items-center gap-1.5">
              {/* type badge */}
              {qType === 'TRUE_FALSE'   && <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[9px] font-black text-blue-600">T/F</span>}
              {qType === 'SHORT_ANSWER' && <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-[9px] font-black text-violet-600">✨ {isArabic ? 'قصير' : 'Short'}</span>}
              <span>{isArabic ? `${answered}/${total} تمت الإجابة` : `${answered}/${total} answered`}</span>
            </span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
              style={{ width: `${progressPct}%` }} />
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {questions.map((_, i) => (
              <button key={i} type="button" onClick={() => setCurrent(i)}
                className={`h-2.5 rounded-full transition-all duration-200 ${
                  i === current ? 'w-6 bg-indigo-600' :
                  (answers[i] !== undefined && answers[i] !== '') ? 'w-2.5 bg-indigo-300' :
                  'w-2.5 bg-slate-200'
                }`} />
            ))}
          </div>
        </div>

        {/* Question body */}
        <div className="px-5 py-5">
          <p className="mb-5 text-base font-bold leading-relaxed text-slate-900" dir="auto">{q.question}</p>

          {/* MULTIPLE_CHOICE */}
          {qType === 'MULTIPLE_CHOICE' && (
            <div className="space-y-2.5">
              {(q.options || []).map((opt, oi) => (
                <OptionBtn key={oi} letter={String.fromCharCode(65 + oi)} text={opt}
                  state={currentAnswer === oi ? 'selected' : 'idle'}
                  onClick={() => setAnswers((prev) => ({ ...prev, [current]: oi }))} />
              ))}
            </div>
          )}

          {/* TRUE_FALSE */}
          {qType === 'TRUE_FALSE' && (
            <div className="flex gap-3">
              {[
                { label: isArabic ? '✓ صح' : '✓ True',  val: 0 },
                { label: isArabic ? '✗ خطأ' : '✗ False', val: 1 },
              ].map(({ label, val }) => (
                <button key={val} type="button"
                  onClick={() => setAnswers((prev) => ({ ...prev, [current]: val }))}
                  className={`flex-1 rounded-2xl border-2 py-4 text-base font-black transition ${
                    currentAnswer === val
                      ? 'border-indigo-500 bg-indigo-600 text-white shadow-md'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300'
                  }`}>
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* SHORT_ANSWER */}
          {qType === 'SHORT_ANSWER' && (
            <div>
              <textarea
                value={currentAnswer || ''}
                onChange={(e) => setAnswers((prev) => ({ ...prev, [current]: e.target.value }))}
                rows={4}
                placeholder={isArabic ? 'اكتب إجابتك هنا...' : 'Write your answer here...'}
                className="w-full resize-none rounded-2xl border-2 border-slate-200 px-4 py-3 text-sm leading-relaxed text-slate-800 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                dir="auto"
              />
              <p className="mt-1.5 text-[10px] text-violet-500">
                ✨ {isArabic ? 'سيقيّم الذكاء الاصطناعي إجابتك فور التسليم' : 'AI will grade your answer immediately after submission'}
              </p>
            </div>
          )}
        </div>

        {/* Navigation footer */}
        <div className="flex items-center gap-3 border-t border-slate-100 px-5 py-4">
          <button type="button" onClick={() => setCurrent((c) => Math.max(0, c - 1))} disabled={current === 0}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:opacity-30">
            ◀
          </button>

          {current < total - 1 ? (
            <button type="button" onClick={() => setCurrent((c) => c + 1)}
              className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700">
              {isArabic ? 'التالي ▶' : '▶ Next'}
            </button>
          ) : (
            <button type="button" onClick={handleSubmit} disabled={!allAnswered || submitting}
              className="flex-1 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 py-2.5 text-sm font-bold text-white shadow-md transition hover:opacity-90 disabled:opacity-40">
              {submitting
                ? (isArabic ? '⏳ جارٍ التصحيح بالذكاء الاصطناعي...' : '⏳ AI is grading...')
                : !allAnswered
                  ? (isArabic ? `أجب على ${total - answered} سؤال أولاً` : `Answer ${total - answered} more to submit`)
                  : (isArabic ? '📤 تسليم الاختبار' : '📤 Submit Quiz')}
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

  // Count correct per type
  const correctCount = (reviewQs || []).filter((q, i) => {
    const qType = q.type || 'MULTIPLE_CHOICE';
    if (qType === 'SHORT_ANSWER') return aiGrading[q.id]?.correct === true;
    return attempt?.answers?.[i] === q.correctAnswer;
  }).length;

  return (
    <div className="space-y-4">
      {/* Score banner */}
      <div className={`overflow-hidden rounded-3xl border-2 ${passed ? 'border-emerald-300 bg-gradient-to-br from-emerald-50 to-cyan-50' : 'border-rose-300 bg-gradient-to-br from-rose-50 to-orange-50'}`}>
        <div className="px-6 py-8 text-center">
          <div className="text-5xl mb-3">{passed ? '🎉' : '📚'}</div>
          <div className={`text-5xl font-black ${passed ? 'text-emerald-600' : 'text-rose-600'}`}>{score}%</div>
          <p className={`mt-2 text-base font-bold ${passed ? 'text-emerald-700' : 'text-rose-700'}`}>
            {passed ? (isArabic ? '✅ أحسنت! اجتزت الاختبار' : '✅ Well done! You passed') : (isArabic ? '❌ لم تجتز الاختبار هذه المرة' : '❌ Not passed this time')}
          </p>
          <p className="mt-1 text-xs text-slate-500">{isArabic ? `درجة النجاح المطلوبة: ${quiz.passingScore}%` : `Required to pass: ${quiz.passingScore}%`}</p>
        </div>

        <div className="grid grid-cols-3 divide-x divide-white border-t border-white/60 bg-white/50">
          <div className="px-4 py-3 text-center">
            <p className="text-xl font-black text-emerald-600">{correctCount}</p>
            <p className="text-[10px] font-bold uppercase text-slate-500">{isArabic ? 'صحيح' : 'Correct'}</p>
          </div>
          <div className="px-4 py-3 text-center">
            <p className="text-xl font-black text-rose-600">{total - correctCount}</p>
            <p className="text-[10px] font-bold uppercase text-slate-500">{isArabic ? 'خطأ' : 'Wrong'}</p>
          </div>
          <div className="px-4 py-3 text-center">
            <p className="text-xl font-black text-slate-700">{total}</p>
            <p className="text-[10px] font-bold uppercase text-slate-500">{isArabic ? 'إجمالي' : 'Total'}</p>
          </div>
        </div>
      </div>

      {/* Review divider */}
      <div className="flex items-center gap-2">
        <div className="h-px flex-1 bg-slate-200" />
        <span className="text-xs font-bold uppercase tracking-widest text-slate-400">{isArabic ? 'مراجعة الإجابات' : 'Answer Review'}</span>
        <div className="h-px flex-1 bg-slate-200" />
      </div>

      {/* Question review cards */}
      {(reviewQs || []).map((q, qi) => {
        const qType = q.type || 'MULTIPLE_CHOICE';
        const studentAnswer = attempt?.answers?.[qi];
        const aiResult = aiGrading[q.id];

        const isCorrect = qType === 'SHORT_ANSWER'
          ? aiResult?.correct === true
          : studentAnswer === q.correctAnswer;

        return (
          <div key={q.id} className="overflow-hidden rounded-2xl border-2 border-slate-100 bg-white shadow-sm">
            {/* Question bar */}
            <div className={`flex items-start gap-3 px-4 py-3 ${isCorrect ? 'bg-emerald-50' : 'bg-rose-50'}`}>
              <span className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-black text-white ${isCorrect ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                {isCorrect ? '✓' : '✗'}
              </span>
              <div className="flex-1">
                <p className="text-sm font-semibold leading-snug text-slate-900" dir="auto">{q.question}</p>
                {/* Type badge */}
                <div className="mt-1 flex gap-1">
                  {qType === 'TRUE_FALSE'   && <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[9px] font-black text-blue-600">T/F</span>}
                  {qType === 'SHORT_ANSWER' && <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-[9px] font-black text-violet-600">✨ AI graded</span>}
                </div>
              </div>
            </div>

            {/* MULTIPLE_CHOICE options */}
            {qType === 'MULTIPLE_CHOICE' && (
              <div className="space-y-1.5 px-4 py-3">
                {(q.options || []).map((opt, oi) => {
                  let state = 'idle';
                  if (oi === q.correctAnswer) state = 'correct';
                  else if (oi === studentAnswer && !isCorrect) state = 'wrong';
                  return <OptionBtn key={oi} letter={String.fromCharCode(65 + oi)} text={opt} state={state} onClick={() => {}} />;
                })}
              </div>
            )}

            {/* TRUE_FALSE result */}
            {qType === 'TRUE_FALSE' && (
              <div className="flex gap-2 px-4 py-3">
                {['True', 'False'].map((label, oi) => {
                  let cls = 'border-slate-200 bg-white text-slate-500';
                  if (oi === q.correctAnswer) cls = 'border-emerald-400 bg-emerald-50 text-emerald-800 font-bold';
                  else if (oi === studentAnswer && !isCorrect) cls = 'border-rose-300 bg-rose-50 text-rose-700 line-through';
                  return (
                    <div key={oi} className={`flex-1 rounded-2xl border-2 py-3 text-center text-sm font-bold ${cls}`}>
                      {oi === q.correctAnswer ? '✓ ' : ''}{isArabic ? (oi === 0 ? 'صح' : 'خطأ') : label}
                    </div>
                  );
                })}
              </div>
            )}

            {/* SHORT_ANSWER result */}
            {qType === 'SHORT_ANSWER' && (
              <div className="space-y-2 px-4 py-3">
                {/* Student's answer */}
                <div className={`rounded-2xl border-2 p-3 text-sm ${isCorrect ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-rose-300 bg-rose-50 text-rose-800'}`}>
                  <p className="text-[10px] font-bold uppercase tracking-wider opacity-70 mb-1">{isArabic ? 'إجابتك' : 'Your answer'}</p>
                  <p dir="auto">{studentAnswer || (isArabic ? '(لم تُقدَّم إجابة)' : '(no answer)')}</p>
                </div>
                {/* AI feedback */}
                {aiResult?.feedback && (
                  <div className="rounded-2xl border border-violet-200 bg-violet-50 p-3 text-xs text-violet-700">
                    <p className="font-bold mb-0.5">✨ {isArabic ? 'تغذية راجعة من الذكاء الاصطناعي:' : 'AI Feedback:'}</p>
                    <p dir="auto">{aiResult.feedback}</p>
                  </div>
                )}
              </div>
            )}

            {/* Explanation */}
            {q.explanation ? (
              <div className="border-t border-slate-100 bg-indigo-50/50 px-4 py-3">
                <p className="text-xs font-semibold text-indigo-700" dir="auto">
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
