import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { verifyAcademyCheckoutSession } from "../services/studentService";
import { useLanguage } from "../utils/i18n";

export default function PaymentSuccessPage() {
  const { lang, isArabic, t, toggleLang } = useLanguage();
  const [searchParams] = useSearchParams();
  const [verifying, setVerifying] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    const verify = async () => {
      const sessionId = searchParams.get("session_id");
      if (!sessionId) return;

      try {
        setVerifying(true);
        const result = await verifyAcademyCheckoutSession(sessionId);
        if (cancelled) return;

        if (result?.verified) {
          setVerificationMessage(
            isArabic
              ? "تم تأكيد الدفع وفتح المادة بنجاح."
              : "Payment verified and material unlocked successfully.",
          );
        } else {
          setVerificationMessage(
            isArabic
              ? "تم استلام الدفع لكن لم يكتمل التحقق بعد."
              : "Payment received, but verification is still pending.",
          );
        }
      } catch {
        if (!cancelled) {
          setVerificationMessage(
            isArabic
              ? "تعذر التحقق من جلسة الدفع حالياً."
              : "Could not verify checkout session right now.",
          );
        }
      } finally {
        if (!cancelled) {
          setVerifying(false);
        }
      }
    };

    verify();

    return () => {
      cancelled = true;
    };
  }, [isArabic, searchParams]);

  return (
    <main className={`grid min-h-screen place-items-center bg-[#f7f9fb] px-4 ${isArabic ? "lang-ar" : "lang-en"}`}>
      <button
        type="button"
        onClick={toggleLang}
        className="absolute right-6 top-6 z-20 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
      >
        {lang === "en" ? t.common.switchToArabic : t.common.switchToEnglish}
      </button>

      <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">{t.payment.successBadge}</p>
        <h1 className="mt-3 text-3xl font-black text-slate-900">{t.payment.successTitle}</h1>
        <p className="mt-3 text-slate-600">
          {t.payment.successText}
        </p>
        {verificationMessage ? (
          <p className="mt-3 text-sm font-semibold text-indigo-700">{verificationMessage}</p>
        ) : null}
        {verifying ? (
          <p className="mt-2 text-xs text-slate-500">
            {isArabic ? "جاري التحقق من الدفع..." : "Verifying payment..."}
          </p>
        ) : null}
        <Link
          to="/courses"
          className="mt-6 inline-flex h-11 items-center rounded-xl bg-sky-700 px-5 font-semibold text-white"
        >
          {isArabic ? "الانتقال إلى كورساتي" : "Go to my courses"}
        </Link>
      </div>
    </main>
  );
}
