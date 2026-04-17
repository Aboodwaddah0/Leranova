import { Link } from "react-router-dom";
import { useLanguage } from "../utils/i18n";

export default function PaymentSuccessPage() {
  const { lang, isArabic, t, toggleLang } = useLanguage();

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
        <Link
          to="/login"
          className="mt-6 inline-flex h-11 items-center rounded-xl bg-sky-700 px-5 font-semibold text-white"
        >
          {t.payment.continueLogin}
        </Link>
      </div>
    </main>
  );
}
