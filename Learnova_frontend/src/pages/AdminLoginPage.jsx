import { Sparkles, ShieldCheck, Lock } from "lucide-react";
import AdminLoginForm from "../components/auth/AdminLoginForm";
import { useLanguage } from "../utils/i18n";
import authPhoto from "../assets/authPhoto.jpg";

export default function AdminLoginPage() {
  const { lang, isArabic, t, toggleLang } = useLanguage();

  return (
    <main
      dir={isArabic ? "rtl" : "ltr"}
      className={`flex min-h-screen ${isArabic ? "lang-ar" : "lang-en"}`}
      style={{ background: "#050510" }}
    >
      {/* ── Left visual panel ── */}
      <aside className="relative hidden flex-col overflow-hidden lg:flex lg:w-[44%]">
        <img src={authPhoto} alt="" className="absolute inset-0 h-full w-full object-cover" />
        {/* Darker, more neutral overlay for the admin section */}
        <div className="absolute inset-0" style={{ background: "linear-gradient(145deg,rgba(15,23,42,0.97) 0%,rgba(30,27,75,0.92) 55%,rgba(79,70,229,0.85) 100%)" }} />
        <div className="absolute inset-0" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.03) 1px,transparent 1px)", backgroundSize: "52px 52px" }} />
        <div className="absolute top-0 end-0" style={{ width: 400, height: 400, background: "radial-gradient(circle,rgba(99,102,241,0.2) 0%,transparent 65%)" }} />
        <div className="absolute bottom-0 start-0" style={{ width: 350, height: 350, background: "radial-gradient(circle,rgba(139,92,246,0.15) 0%,transparent 65%)" }} />

        <div className="relative z-10 flex h-full flex-col justify-between p-10">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6,#ec4899)", boxShadow: "0 4px 14px rgba(99,102,241,.5)" }}>
              <Sparkles size={17} className="text-white" />
            </div>
            <span className="text-[11px] font-black uppercase tracking-[0.26em] text-indigo-200">Learnova</span>
          </div>

          {/* Center content */}
          <div>
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl" style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)" }}>
              <ShieldCheck size={30} className="text-indigo-300" />
            </div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-indigo-400 mb-3">
              {isArabic ? "وصول محمي" : "Secure access"}
            </p>
            <h2 className="text-4xl font-black leading-[1.1] text-white max-w-xs">
              {isArabic ? "بوابة الإدارة" : "Admin Portal"}
            </h2>
            <p className="mt-4 text-sm leading-7 text-indigo-200/70 max-w-xs">
              {isArabic
                ? "للمشرفين فقط. سجّل الدخول لإدارة المنصة والخطط والمؤسسات."
                : "Platform administrators only. Manage plans, organizations, and system settings."}
            </p>
          </div>

          {/* Bottom card */}
          <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(12px)" }}>
            <div className="flex items-center gap-3">
              <Lock size={14} className="text-indigo-400 shrink-0" />
              <p className="text-xs text-indigo-200/70">
                {isArabic
                  ? "الوصول مقيّد للمسؤولين المعتمدين فقط."
                  : "Access is restricted to authorized administrators only."}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Right: form panel ── */}
      <div className="flex flex-1 flex-col bg-white">
        {/* Top bar */}
        <div className="flex items-center justify-between px-8 py-5">
          <div className="flex items-center gap-2 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", boxShadow: "0 3px 10px rgba(99,102,241,.4)" }}>
              <Sparkles size={14} className="text-white" />
            </div>
            <span className="text-xs font-black uppercase tracking-[0.22em] text-indigo-600">Learnova</span>
          </div>
          <div className="hidden lg:block" />
          <button type="button" onClick={toggleLang}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-indigo-200 hover:text-indigo-600">
            {lang === "en" ? t.common.switchToArabic : t.common.switchToEnglish}
          </button>
        </div>

        {/* Form area */}
        <div className="flex flex-1 items-center justify-center px-6 py-10 sm:px-10">
          <div className="w-full max-w-md">
            {/* Badge */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1.5">
              <ShieldCheck size={13} className="text-indigo-600" />
              <span className="text-xs font-black uppercase tracking-[0.2em] text-indigo-600">
                {isArabic ? "وصول الأدمن" : "Admin access"}
              </span>
            </div>

            <h1 className="text-3xl font-black tracking-tight text-slate-900">
              {isArabic ? "تسجيل دخول الإدارة" : "Admin sign in"}
            </h1>
            <p className="mt-2 mb-8 text-sm text-slate-500">
              {isArabic ? "أدخل بيانات حساب المسؤول للمتابعة." : "Enter your admin credentials to continue."}
            </p>

            <AdminLoginForm t={t} />
          </div>
        </div>
      </div>
    </main>
  );
}
