import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// One vibrant color scheme per card position (cycles if more cards than colors)
const PALETTE = [
  { front: 'linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%)', back: 'linear-gradient(135deg,#10b981 0%,#059669 100%)' },
  { front: 'linear-gradient(135deg,#f59e0b 0%,#ef4444 100%)', back: 'linear-gradient(135deg,#3b82f6 0%,#6366f1 100%)' },
  { front: 'linear-gradient(135deg,#ec4899 0%,#8b5cf6 100%)', back: 'linear-gradient(135deg,#14b8a6 0%,#0ea5e9 100%)' },
  { front: 'linear-gradient(135deg,#0ea5e9 0%,#6366f1 100%)', back: 'linear-gradient(135deg,#f59e0b 0%,#f97316 100%)' },
  { front: 'linear-gradient(135deg,#10b981 0%,#0891b2 100%)', back: 'linear-gradient(135deg,#ec4899 0%,#f43f5e 100%)' },
  { front: 'linear-gradient(135deg,#f97316 0%,#eab308 100%)', back: 'linear-gradient(135deg,#8b5cf6 0%,#6366f1 100%)' },
];

export default function Flashcards({ cards, isArabic, onGenerate, loading, error }) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  useEffect(() => { setIndex(0); setFlipped(false); }, [cards]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 py-12">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
        <p className="text-sm text-slate-500">{isArabic ? 'جارٍ توليد البطاقات...' : 'Generating flashcards...'}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3">
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</p>
        <button type="button" onClick={() => onGenerate()} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
          {isArabic ? 'حاول مجدداً' : 'Try again'}
        </button>
      </div>
    );
  }

  if (!cards || cards.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <p className="text-sm text-slate-500">{isArabic ? 'لا توجد بطاقات بعد.' : 'No flashcards yet.'}</p>
        <button type="button" onClick={() => onGenerate()} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">
          {isArabic ? 'توليد البطاقات بالذكاء الاصطناعي' : 'Generate with AI'}
        </button>
      </div>
    );
  }

  const total = cards.length;
  const card = cards[index];
  const colors = PALETTE[index % PALETTE.length];

  const goPrev = () => { setIndex((i) => Math.max(0, i - 1)); setFlipped(false); };
  const goNext = () => { setIndex((i) => Math.min(total - 1, i + 1)); setFlipped(false); };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Progress row */}
      <div className="flex w-full items-center justify-between">
        <span className="text-xs font-bold text-slate-500">{index + 1} / {total}</span>
        <button type="button" onClick={() => onGenerate()} className="text-xs text-slate-400 hover:text-slate-600">
          🔄 {isArabic ? 'إعادة التوليد' : 'Regenerate'}
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${((index + 1) / total) * 100}%`, background: colors.front }} />
      </div>

      {/* 3-D flip card */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setFlipped((f) => !f)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setFlipped((f) => !f); }}
        style={{ perspective: '1200px', width: '100%', height: '220px', cursor: 'pointer' }}
      >
        <div style={{
          position: 'relative', width: '100%', height: '100%',
          transformStyle: 'preserve-3d',
          transition: 'transform 0.6s cubic-bezier(.4,0,.2,1)',
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}>
          {/* Front — Question */}
          <div style={{
            position: 'absolute', inset: 0,
            backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
            background: colors.front,
            borderRadius: '1.25rem',
            boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          }} className="flex flex-col items-center justify-center p-6 text-center text-white">
            <span className="mb-3 rounded-full bg-white/20 px-3 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white/90">
              {isArabic ? 'السؤال' : 'Question'}
            </span>
            <p className="text-lg font-bold leading-snug" dir="rtl">{card.question}</p>
            <span className="mt-5 text-[11px] text-white/60">{isArabic ? 'اضغط لرؤية الإجابة' : 'Click to reveal answer'}</span>
          </div>

          {/* Back — Answer */}
          <div style={{
            position: 'absolute', inset: 0,
            backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            background: colors.back,
            borderRadius: '1.25rem',
            boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          }} className="flex flex-col items-center justify-center p-6 text-center text-white">
            <span className="mb-3 rounded-full bg-white/20 px-3 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white/90">
              {isArabic ? 'الإجابة' : 'Answer'}
            </span>
            <p className="text-lg font-semibold leading-snug" dir="rtl">{card.answer}</p>
            <span className="mt-5 text-[11px] text-white/60">{isArabic ? 'اضغط للعودة للسؤال' : 'Click to go back'}</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={goPrev}
          disabled={index === 0}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-30"
        >
          <ChevronLeft size={18} />
        </button>

        <div className="flex gap-1.5">
          {cards.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => { setIndex(i); setFlipped(false); }}
              style={i === index ? { background: colors.front } : {}}
              className={`h-2 rounded-full transition-all duration-300 ${i === index ? 'w-6' : 'w-2 bg-slate-200 hover:bg-slate-300'}`}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={goNext}
          disabled={index === total - 1}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-30"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
