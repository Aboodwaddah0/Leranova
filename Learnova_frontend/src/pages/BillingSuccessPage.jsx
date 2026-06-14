import { useEffect, useRef, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { CheckCircle, XCircle, Loader2, Sparkles } from "lucide-react";
import api from "../utils/api";
import { useLanguage } from "../utils/i18n";

export default function BillingSuccessPage() {
  const { lang, isArabic, t, toggleLang } = useLanguage();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");

  const [phase, setPhase] = useState(() => (sessionId ? "confirming" : "error"));
  const called = useRef(false);

  useEffect(() => {
    if (called.current || !sessionId) return;
    called.current = true;

    api.get(`/checkout/confirm?session_id=${encodeURIComponent(sessionId)}`)
      .then(({ data }) => {
        setPhase(data?.data?.fulfilled ? "success" : "error");
      })
      .catch(() => setPhase("error"));
  }, [sessionId]);

  return (
    <main
      dir={isArabic ? "rtl" : "ltr"}
      className={`grid min-h-screen place-items-center px-4 ${isArabic ? "lang-ar" : "lang-en"}`}
      style={{ background: "#f0f4ff" }}
    >
      <button type="button" onClick={toggleLang}
        className="absolute end-6 top-6 z-20 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-indigo-200">
        {lang === "en" ? t.common.switchToArabic : t.common.switchToEnglish}
      </button>

      <div className="w-full max-w-lg">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl text-center">
          {phase === "confirming" && (
            <>
              <Loader2 size={44} className="mx-auto mb-5 animate-spin text-indigo-500" />
              <h1 className="text-xl font-black text-slate-900">
                {isArabic ? "جاري تأكيد الدفع..." : "Confirming your payment…"}
              </h1>
              <p className="mt-3 text-sm text-slate-500">
                {isArabic ? "لحظة من فضلك." : "Please wait a moment."}
              </p>
            </>
          )}

          {phase === "success" && (
            <>
              <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full"
                style={{ background: "linear-gradient(135deg,#10b981,#059669)", boxShadow: "0 8px 24px rgba(16,185,129,.35)" }}>
                <CheckCircle size={36} className="text-white" />
              </div>
              <span className="inline-block rounded-full px-3 py-1 text-xs font-black uppercase tracking-widest"
                style={{ background: "rgba(16,185,129,.1)", color: "#059669" }}>
                {isArabic ? "مُفعَّل" : "Activated"}
              </span>
              <h1 className="mt-4 text-2xl font-black text-slate-900">
                {isArabic ? "تم تفعيل اشتراكك!" : "Subscription activated!"}
              </h1>
              <p className="mt-3 text-sm leading-7 text-slate-500 max-w-sm mx-auto">
                {isArabic
                  ? "تم استلام الدفع وتفعيل خطتك بنجاح."
                  : "Your payment was received and your plan is now active."}
              </p>
              <Link to="/dashboard/organization?tab=billing"
                className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl px-8 text-sm font-bold text-white transition hover:-translate-y-0.5"
                style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", boxShadow: "0 4px 14px rgba(99,102,241,.4)" }}>
                <Sparkles size={15} />
                {isArabic ? "العودة إلى الفوترة" : "Back to billing"}
              </Link>
            </>
          )}

          {phase === "error" && (
            <>
              <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full"
                style={{ background: "linear-gradient(135deg,#f43f5e,#e11d48)", boxShadow: "0 8px 24px rgba(244,63,94,.35)" }}>
                <XCircle size={36} className="text-white" />
              </div>
              <h1 className="mt-4 text-2xl font-black text-slate-900">
                {isArabic ? "تعذر تأكيد الدفع" : "Couldn't confirm payment"}
              </h1>
              <p className="mt-3 text-sm leading-7 text-slate-500 max-w-sm mx-auto">
                {isArabic
                  ? "إذا تم خصم المبلغ، فسيتم تفعيل خطتك تلقائياً خلال لحظات. يمكنك التحقق من تبويب الفوترة."
                  : "If you were charged, your plan will activate automatically shortly. Check the billing tab for the latest status."}
              </p>
              <Link to="/dashboard/organization?tab=billing"
                className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 px-8 text-sm font-bold text-slate-700 transition hover:border-indigo-200">
                {isArabic ? "العودة إلى الفوترة" : "Back to billing"}
              </Link>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
