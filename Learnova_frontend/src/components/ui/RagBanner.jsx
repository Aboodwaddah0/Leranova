/**
 * RagBanner — fixed floating banner that shows RAG ingestion progress.
 * Appears at the bottom-center of the viewport regardless of scroll or active tab.
 *
 * Props:
 *   ragStatus  – { status: 'queued'|'processing'|'ready'|'timeout'|'failed', chunkCount?, elapsed? }
 *   onDismiss  – called when user clicks ✕ or when auto-dismiss fires
 *   isArabic   – RTL flag
 */
import { createPortal } from 'react-dom';

export default function RagBanner({ ragStatus, onDismiss, isArabic }) {
  if (!ragStatus) return null;

  const { status, chunkCount, elapsed } = ragStatus;

  const colors = {
    ready:      'border-emerald-300 bg-emerald-50 text-emerald-800 shadow-emerald-100',
    timeout:    'border-amber-300   bg-amber-50   text-amber-800   shadow-amber-100',
    failed:     'border-rose-300    bg-rose-50    text-rose-800    shadow-rose-100',
    queued:     'border-blue-300    bg-blue-50    text-blue-800    shadow-blue-100',
    processing: 'border-blue-300    bg-blue-50    text-blue-800    shadow-blue-100',
  };

  const icon = {
    ready:      '✅',
    timeout:    '⚠️',
    failed:     '❌',
    queued:     '⚙️',
    processing: '⚙️',
  };

  const title = {
    ready:      isArabic ? 'تمت الفهرسة بنجاح!' : 'Content indexed for AI!',
    timeout:    isArabic ? 'يستمر في الخلفية' : 'Still processing in background',
    failed:     isArabic ? 'فشلت المعالجة' : 'Processing failed',
    queued:     isArabic ? 'في الانتظار...' : 'Queued for AI processing...',
    processing: isArabic ? `جاري الفهرسة • ${elapsed ?? 0}ث` : `Indexing for AI • ${elapsed ?? 0}s`,
  };

  const subtitle = {
    ready:      isArabic
      ? `${chunkCount ?? 0} مقطع جاهز للبحث الذكي • ${elapsed}ث`
      : `${chunkCount ?? 0} chunks ready for AI search • ${elapsed}s`,
    timeout:    isArabic ? 'تحقق لاحقاً أو أعد المعالجة' : 'Check later or re-process',
    failed:     isArabic ? 'جرّب إعادة المعالجة' : 'Try re-processing the file',
    queued:     isArabic ? 'يرجى الانتظار...' : 'Please wait...',
    processing: isArabic ? 'يرجى الانتظار' : 'Please wait',
  };

  const spin = status === 'queued' || status === 'processing';

  return createPortal(
    <div
      className={`fixed bottom-6 left-1/2 z-[9999] flex -translate-x-1/2 items-center gap-3 rounded-2xl border px-5 py-3.5 shadow-xl transition-all ${colors[status] ?? colors.processing}`}
      style={{ minWidth: 280, maxWidth: 'calc(100vw - 32px)' }}
      dir={isArabic ? 'rtl' : 'ltr'}
    >
      <span className={`shrink-0 text-xl leading-none ${spin ? 'animate-spin' : ''}`}>
        {icon[status] ?? '⚙️'}
      </span>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold leading-tight">{title[status]}</p>
        <p className="mt-0.5 text-xs opacity-70 leading-tight">{subtitle[status]}</p>
      </div>

      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 ml-1 rounded-lg border border-current px-2 py-0.5 text-xs font-bold opacity-40 hover:opacity-80 transition"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>,
    document.body
  );
}
