import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2, BookOpen, Sparkles } from 'lucide-react';
import { verifyAcademyCheckoutSession } from '../../services/studentService';
import { useLanguage } from '../../utils/i18n';

/**
 * Landing page for Stripe redirects after a student pays for a subject.
 * Route: /student/payment-success?session_id=...
 *
 * Calls GET /student/academy/checkout/verify to confirm the subscription,
 * then shows success or failure UI.
 */
export default function StudentSubjectPaymentSuccessPage() {
  const { isArabic } = useLanguage();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');

  const [phase,       setPhase]       = useState('verifying'); // verifying | success | failed
  const [subjectName, setSubjectName] = useState('');
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    if (!sessionId) {
      setPhase('failed');
      return;
    }

    verifyAcademyCheckoutSession(sessionId)
      .then((data) => {
        if (data?.verified) {
          setSubjectName(data.subjectName || '');
          setPhase('success');
        } else {
          setPhase('failed');
        }
      })
      .catch(() => setPhase('failed'));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <main
      dir={isArabic ? 'rtl' : 'ltr'}
      className={`grid min-h-screen place-items-center px-4 ${isArabic ? 'lang-ar' : 'lang-en'}`}
      style={{ background: '#f0f4ff' }}
    >
      <div className="w-full max-w-md">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl text-center">

          {/* ── Verifying ── */}
          {phase === 'verifying' && (
            <>
              <Loader2 size={44} className="mx-auto mb-5 animate-spin text-indigo-500" />
              <h1 className="text-xl font-black text-slate-900">
                {isArabic ? 'جاري تأكيد اشتراكك...' : 'Confirming your subscription…'}
              </h1>
              <p className="mt-3 text-sm text-slate-500">
                {isArabic ? 'لحظة من فضلك.' : 'Please wait a moment.'}
              </p>
            </>
          )}

          {/* ── Success ── */}
          {phase === 'success' && (
            <>
              <div
                className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full"
                style={{
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  boxShadow: '0 8px 24px rgba(16,185,129,.35)',
                }}
              >
                <CheckCircle size={36} className="text-white" />
              </div>
              <span
                className="inline-block rounded-full px-3 py-1 text-xs font-black uppercase tracking-widest"
                style={{ background: 'rgba(16,185,129,.1)', color: '#059669' }}
              >
                {isArabic ? 'تم الاشتراك' : 'Subscribed'}
              </span>
              <h1 className="mt-4 text-2xl font-black text-slate-900">
                {isArabic ? 'تم الاشتراك بنجاح!' : 'Subscription confirmed!'}
              </h1>
              <p className="mt-3 text-sm leading-7 text-slate-500 max-w-sm mx-auto">
                {subjectName
                  ? (isArabic
                    ? `تم تفعيل اشتراكك في مادة "${subjectName}" بنجاح. يمكنك الآن الوصول إلى جميع الدروس.`
                    : `Your subscription to "${subjectName}" is now active. You can access all lessons immediately.`)
                  : (isArabic
                    ? 'تم تفعيل اشتراكك بنجاح. يمكنك الآن الوصول إلى جميع الدروس.'
                    : 'Your subscription is now active. You can access all lessons immediately.')}
              </p>

              <div className="mt-6 flex flex-col items-center gap-3">
                <Link
                  to="/courses"
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl px-8 text-sm font-bold text-white transition hover:-translate-y-0.5"
                  style={{
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    boxShadow: '0 4px 14px rgba(99,102,241,.4)',
                  }}
                >
                  <BookOpen size={15} />
                  {isArabic ? 'ابدأ التعلم' : 'Start learning'}
                </Link>
                <Link
                  to="/student/my-courses"
                  className="text-sm font-semibold text-indigo-600 hover:text-indigo-500 transition"
                >
                  {isArabic ? 'عرض كورساتي' : 'View my courses'}
                </Link>
              </div>
            </>
          )}

          {/* ── Failed ── */}
          {phase === 'failed' && (
            <>
              <div
                className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full"
                style={{
                  background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                  boxShadow: '0 8px 24px rgba(239,68,68,.35)',
                }}
              >
                <XCircle size={36} className="text-white" />
              </div>
              <span
                className="inline-block rounded-full px-3 py-1 text-xs font-black uppercase tracking-widest"
                style={{ background: 'rgba(239,68,68,.1)', color: '#dc2626' }}
              >
                {isArabic ? 'فشل التحقق' : 'Verification failed'}
              </span>
              <h1 className="mt-4 text-2xl font-black text-slate-900">
                {isArabic ? 'تعذّر تأكيد الدفع' : 'Could not confirm payment'}
              </h1>
              <p className="mt-3 text-sm leading-7 text-slate-500 max-w-sm mx-auto">
                {isArabic
                  ? 'حدث خطأ أثناء التحقق من الدفع. إذا تم خصم المبلغ، تواصل مع الدعم.'
                  : 'Something went wrong verifying your payment. If you were charged, please contact support.'}
              </p>
              <div className="mt-6 flex flex-col items-center gap-3">
                <Link
                  to="/courses"
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-8 text-sm font-bold text-slate-700 transition hover:border-indigo-200"
                >
                  <Sparkles size={15} />
                  {isArabic ? 'العودة للتخصصات' : 'Back to specializations'}
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
