import { Link } from "react-router-dom";
import { Sparkles, Bot, BarChart3, Shield } from "lucide-react";
import LoginForm from "../components/auth/LoginForm";
import { useLanguage } from "../utils/i18n";
import authPhoto from "../assets/authPhoto.jpg";

export default function LoginPage() {
  const { lang, isArabic, t, toggleLang } = useLanguage();

  const highlights = isArabic
    ? [
        { icon: Bot,       text: "مساعد ذكي مبني على محتوى دروسك" },
        { icon: BarChart3, text: "تحليلات ومتابعة الأداء الأكاديمي" },
        { icon: Shield,    text: "نظام آمن لكل الأدوار والمؤسسات" },
      ]
    : [
        { icon: Bot,       text: "AI tutor grounded in your lesson content" },
        { icon: BarChart3, text: "Analytics and academic progress tracking" },
        { icon: Shield,    text: "Secure system for every role and org" },
      ];

  return (
    <main
      dir={isArabic ? "rtl" : "ltr"}
      className={`flex min-h-screen ${isArabic ? "lang-ar" : "lang-en"}`}
      style={{ background: "#050510" }}
    >
      {/* ── Left visual panel ── */}
      <aside className="relative hidden flex-col overflow-hidden lg:flex lg:w-[44%]">
        <img src={authPhoto} alt="" className="absolute inset-0 h-full w-full object-cover" />
        {/* Indigo/violet overlay */}
        <div className="absolute inset-0" style={{ background: "linear-gradient(145deg,rgba(30,27,75,0.97) 0%,rgba(79,70,229,0.88) 45%,rgba(109,40,217,0.92) 100%)" }} />
        {/* Subtle grid */}
        <div className="absolute inset-0" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.04) 1px,transparent 1px)", backgroundSize: "52px 52px" }} />
        {/* Glow orb */}
        <div className="absolute -bottom-32 -start-32" style={{ width: 480, height: 480, borderRadius: "50%", background: "radial-gradient(circle,rgba(99,102,241,0.35) 0%,transparent 65%)" }} />

        <div className="relative z-10 flex h-full flex-col justify-between p-10">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6,#ec4899)", boxShadow: "0 4px 14px rgba(99,102,241,.5)" }}>
              <Sparkles size={17} className="text-white" />
            </div>
            <span className="text-[11px] font-black uppercase tracking-[0.26em] text-indigo-200">Learnova</span>
          </div>

          {/* Headline */}
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-indigo-400 mb-4">
              {t.login.sideBadge}
            </p>
            <h2 className="text-4xl font-black leading-[1.1] text-white max-w-xs">
              {t.login.sideTitle}
            </h2>
            <p className="mt-4 text-sm leading-7 text-indigo-200/75 max-w-xs">
              {t.login.sideText}
            </p>

            {/* Highlights */}
            <div className="mt-8 space-y-3">
              {highlights.map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl" style={{ background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.35)" }}>
                    <Icon size={14} className="text-indigo-300" />
                  </div>
                  <span className="text-sm text-indigo-100/80">{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom card */}
          <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(12px)" }}>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-300 mb-1">
              {isArabic ? "يدعم جميع الأدوار" : "Supports every role"}
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              {(isArabic
                ? ["طالب", "معلم", "مؤسسة", "أهل", "مشرف"]
                : ["Student", "Instructor", "Organization", "Parent", "Admin"]
              ).map((role) => (
                <span key={role} className="rounded-full px-3 py-1 text-xs font-semibold text-indigo-200"
                  style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.25)" }}>
                  {role}
                </span>
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* ── Right: form panel ── */}
      <div className="flex flex-1 flex-col overflow-y-auto bg-white">
        {/* Top bar */}
        <div className="flex items-center justify-between px-8 py-5">
          {/* Mobile logo */}
          <Link to="/" className="flex items-center gap-2 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", boxShadow: "0 3px 10px rgba(99,102,241,.4)" }}>
              <Sparkles size={14} className="text-white" />
            </div>
            <span className="text-xs font-black uppercase tracking-[0.22em] text-indigo-600">Learnova</span>
          </Link>
          <div className="hidden lg:block" />
          <button type="button" onClick={toggleLang}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-indigo-200 hover:text-indigo-600">
            {lang === "en" ? t.common.switchToArabic : t.common.switchToEnglish}
          </button>
        </div>

        {/* Form area */}
        <div className="flex flex-1 items-center justify-center px-6 py-10 sm:px-10">
          <div className="w-full max-w-md">
            {/* Heading */}
            <div className="mb-8">
              <h1 className="text-3xl font-black tracking-tight text-slate-900">{t.login.title}</h1>
              <p className="mt-2 text-sm text-slate-500">{t.login.subtitle}</p>
            </div>

            <div className="space-y-5">
              <LoginForm t={t} isArabic={isArabic} />
            </div>

            <div className="mt-8 border-t border-slate-100 pt-6 text-center">
              <p className="text-sm text-slate-500">{t.login.orgPrompt}</p>
              <Link to="/signup"
                className="mt-2 inline-block text-sm font-bold text-indigo-600 transition hover:text-indigo-700">
                {t.login.orgCta}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
