import { useEffect } from "react";
import AdminLoginForm from "../components/auth/AdminLoginForm";
import { useLanguage } from "../utils/i18n";
import authPhoto from "../assets/authPhoto.jpg";

export default function AdminLoginPage() {
  const { lang, isArabic, t, toggleLang } = useLanguage();

  return (
    <main className={`relative min-h-screen overflow-hidden bg-[#f7f9fb] px-4 py-8 ${isArabic ? "lang-ar" : "lang-en"}`}>
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-cyan-200/40 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-blue-200/40 blur-3xl" />
      </div>

      <button
        type="button"
        onClick={toggleLang}
        className="absolute right-6 top-6 z-20 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
      >
        {lang === "en" ? t.common.switchToArabic : t.common.switchToEnglish}
      </button>

      <div className="relative z-10 mx-auto grid w-full max-w-5xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_56px_-26px_rgba(16,20,26,0.55)] md:grid-cols-2">
        <section className="relative hidden min-h-[620px] md:block">
          <img src={authPhoto} alt="Admin access" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-br from-sky-900/80 via-blue-700/60 to-cyan-500/35" />
          <div className="absolute inset-0 flex flex-col justify-between p-10 text-white">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-100">
                Secure Access
              </p>
              <h2 className="mt-4 max-w-sm text-4xl font-black leading-tight">
                Admin Portal
              </h2>
            </div>

            <div className="rounded-3xl border border-white/25 bg-slate-900/25 p-5 backdrop-blur-md">
              <p className="text-sm leading-7 text-blue-50">
                Platform administrators only. Secure login to manage features, subscriptions, and platform settings.
              </p>
            </div>
          </div>
        </section>

        <section className="p-6 md:p-10">
          <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200 md:hidden">
            <img src={authPhoto} alt="Admin access" className="h-44 w-full object-cover" />
          </div>

          <div className="mb-7 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-700 to-blue-500 text-white">
              <span className="material-symbols-outlined">shield_admin</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900">Admin Portal</h1>
          </div>

          <h3 className="text-2xl font-bold text-slate-900">{t.login.title}</h3>
          <p className="mb-6 mt-1 text-slate-500">
            Enter your admin credentials to continue
          </p>

          <div className="space-y-4">
            <AdminLoginForm t={t} />
          </div>
        </section>
      </div>
    </main>
  );
}
