import { Link } from "react-router-dom";
import { useLanguage } from "../utils/i18n";
import QuantumMeshBackground from "../components/ui/QuantumMeshBackground";

export default function LandingPage() {
  const { lang, isArabic, t, toggleLang } = useLanguage();

  return (
    <main dir={isArabic ? "rtl" : "ltr"} className={`relative min-h-screen overflow-hidden bg-[#f7f9fb] px-4 py-8 ${isArabic ? "lang-ar" : "lang-en"}`}>
      <QuantumMeshBackground />

      <button
        type="button"
        onClick={toggleLang}
        className="absolute right-6 top-6 z-20 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
      >
        {lang === "en" ? t.common.switchToArabic : t.common.switchToEnglish}
      </button>

      <section className="relative z-10 mx-auto flex min-h-[85vh] w-full max-w-5xl flex-col justify-center rounded-[28px] border border-slate-200 bg-white p-8 shadow-[0_18px_56px_-26px_rgba(16,20,26,0.55)] md:p-12">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-sky-700">
          {t.landing.badge}
        </p>
        <h1 className="mt-4 max-w-3xl text-4xl font-black leading-tight text-slate-900 md:text-6xl">
          {t.landing.title}
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-slate-600">
          {t.landing.subtitle}
        </p>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            to="/login"
            className="inline-flex h-12 items-center justify-center rounded-2xl bg-gradient-to-r from-sky-700 to-blue-500 px-6 font-bold text-white"
          >
            {t.landing.loginCta}
          </Link>
          <Link
            to="/signup"
            className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-300 bg-white px-6 font-semibold text-slate-900"
          >
            {t.landing.signupCta}
          </Link>
        </div>
      </section>
    </main>
  );
}
