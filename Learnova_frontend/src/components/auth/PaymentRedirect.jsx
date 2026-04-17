import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useLanguage } from "../../utils/i18n";

export default function PaymentRedirect() {
  const location = useLocation();
  const checkout = location.state?.checkout;
  const checkoutUrl = checkout?.checkoutUrl;
  const { lang, isArabic, t, toggleLang } = useLanguage();

  useEffect(() => {
    if (!checkoutUrl) return;

    const timer = setTimeout(() => {
      window.location.href = checkoutUrl;
    }, 1200);

    return () => clearTimeout(timer);
  }, [checkoutUrl]);

  if (!checkoutUrl) {
    return (
      <main className={`min-h-screen bg-[#f7f9fb] px-4 py-8 ${isArabic ? "lang-ar" : "lang-en"}`}>
        <button
          type="button"
          onClick={toggleLang}
          className="absolute right-6 top-6 z-20 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
        >
          {lang === "en" ? t.common.switchToArabic : t.common.switchToEnglish}
        </button>

        <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow">
          <h2 className="text-2xl font-bold text-slate-900">{t.payment.missingTitle}</h2>
          <p className="mt-2 text-slate-600">
            {t.payment.missingText}
          </p>
          <Link to="/signup" className="mt-6 inline-block font-semibold text-sky-700">
            {t.payment.backToSignup}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className={`min-h-screen bg-[#f7f9fb] px-4 py-8 ${isArabic ? "lang-ar" : "lang-en"}`}>
      <button
        type="button"
        onClick={toggleLang}
        className="absolute right-6 top-6 z-20 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
      >
        {lang === "en" ? t.common.switchToArabic : t.common.switchToEnglish}
      </button>

      <div className="mx-auto max-w-xl rounded-2xl border border-sky-100 bg-white p-8 text-center shadow">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500">{t.payment.flowBadge}</p>
        <h2 className="mt-2 text-2xl font-black text-slate-900">
          {t.payment.redirectTitle}
        </h2>
        <p className="mt-3 text-slate-600">
          {t.payment.redirectText}
        </p>
        <a href={checkoutUrl} className="mt-6 inline-block font-semibold text-sky-700">
          {t.payment.redirectLink}
        </a>
      </div>
    </main>
  );
}
