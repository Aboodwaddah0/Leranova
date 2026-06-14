import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Sparkles, CheckCircle2, Mail, Clock } from "lucide-react";
import OrgSignupForm from "../components/auth/OrgSignupForm";
import { registerOrganizationThunk } from "../redux/thunks/authThunks";
import { useLanguage } from "../utils/i18n";
import authPhoto from "../assets/authPhoto.jpg";
import { notifyError } from "../lib/notify";

export default function SignupPage() {
  const dispatch  = useDispatch();
  const { loading, error } = useSelector((s) => s.auth);
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const { lang, isArabic, t, toggleLang } = useLanguage();

  useEffect(() => {
    if (error) notifyError(error);
  }, [error]);

  const handleSignup = async (payload) => {
    const result = await dispatch(registerOrganizationThunk(payload));
    if (registerOrganizationThunk.fulfilled.match(result)) {
      setRegistrationComplete(true);
    }
  };

  const benefits = isArabic
    ? ["إعداد المؤسسة في دقائق", "كورسات ودروس بلا حدود", "أدوات ذكاء اصطناعي لكل طالب", "دعم مباشر وبدون التزام"]
    : ["Organization setup in minutes", "Unlimited courses and lessons", "AI study tools for every student", "Direct support, no commitment"];

  return (
    <main
      dir={isArabic ? "rtl" : "ltr"}
      className={`flex min-h-screen ${isArabic ? "lang-ar" : "lang-en"}`}
      style={{ background: "#050510" }}
    >
      {/* ── Left visual panel ── */}
      <aside className="sticky top-0 hidden h-screen flex-col overflow-hidden lg:flex lg:w-[38%]">
        <img src={authPhoto} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(145deg,rgba(30,27,75,0.97) 0%,rgba(79,70,229,0.88) 45%,rgba(109,40,217,0.92) 100%)" }} />
        <div className="absolute inset-0" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.04) 1px,transparent 1px)", backgroundSize: "52px 52px" }} />
        <div className="absolute -top-20 -end-20" style={{ width: 380, height: 380, borderRadius: "50%", background: "radial-gradient(circle,rgba(99,102,241,0.3) 0%,transparent 65%)" }} />

        <div className="relative z-10 flex h-full flex-col justify-between p-10">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6,#ec4899)", boxShadow: "0 4px 14px rgba(99,102,241,.5)" }}>
              <Sparkles size={17} className="text-white" />
            </div>
            <span className="text-[11px] font-black uppercase tracking-[0.26em] text-indigo-200">Learnova</span>
          </Link>

          {/* Headline */}
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-indigo-400 mb-4">
              {t.signup.badge}
            </p>
            <h2 className="text-3xl font-black leading-[1.15] text-white">
              {isArabic
                ? "أنشئ مؤسستك وابدأ التعليم الذكي"
                : "Launch your organization and start smarter teaching"}
            </h2>

            <div className="mt-8 space-y-3">
              {benefits.map((b) => (
                <div key={b} className="flex items-center gap-3">
                  <CheckCircle2 size={16} className="shrink-0 text-indigo-400" />
                  <span className="text-sm text-indigo-100/80">{b}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom card */}
          <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(12px)" }}>
            <p className="text-xs leading-6 text-indigo-100/75">
              {t.signup.noPlansText}
            </p>
          </div>
        </div>
      </aside>

      {/* ── Right: form panel ── */}
      <div className="flex-1 overflow-y-auto bg-white">
        {/* Top bar */}
        <div className="flex items-center justify-between px-8 py-5">
          <Link to="/" className="flex items-center gap-2 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", boxShadow: "0 3px 10px rgba(99,102,241,.4)" }}>
              <Sparkles size={14} className="text-white" />
            </div>
            <span className="text-xs font-black uppercase tracking-[0.22em] text-indigo-600">Learnova</span>
          </Link>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm font-bold text-indigo-600 transition hover:text-indigo-700">
              {t.signup.backToLogin}
            </Link>
            <button type="button" onClick={toggleLang}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-indigo-200 hover:text-indigo-600">
              {lang === "en" ? t.common.switchToArabic : t.common.switchToEnglish}
            </button>
          </div>
        </div>

        {/* Form area */}
        {registrationComplete ? (
          <div className="mx-auto max-w-2xl px-6 pb-16 sm:px-10 flex flex-col items-center justify-center min-h-[70vh] text-center">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50">
              <CheckCircle2 size={32} className="text-indigo-600" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 mb-3">
              {t.signup.verifyEmail.title}
            </h1>
            <p className="text-slate-500 mb-8 max-w-sm">
              {t.signup.verifyEmail.description}
            </p>
            {/* Two-step process indicator */}
            <div className="w-full max-w-xs space-y-3 mb-8">
              <div className="flex items-center gap-3 rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-start">
                <Mail size={18} className="shrink-0 text-indigo-500" />
                <div>
                  <p className="text-xs font-black text-indigo-700">{isArabic ? "الخطوة ١ — تحقق من البريد" : "Step 1 — Verify your email"}</p>
                  <p className="text-xs text-slate-500">{isArabic ? "انقر على الرابط في بريدك الإلكتروني" : "Click the link sent to your inbox"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-start">
                <Clock size={18} className="shrink-0 text-slate-400" />
                <div>
                  <p className="text-xs font-black text-slate-600">{isArabic ? "الخطوة ٢ — موافقة المشرف" : "Step 2 — Admin approval"}</p>
                  <p className="text-xs text-slate-500">{isArabic ? "سيتم إعلامك بالبريد عند الموافقة" : "You'll receive an email once approved"}</p>
                </div>
              </div>
            </div>
            <Link to="/login" className="text-sm font-bold text-indigo-600 hover:text-indigo-700">
              {t.signup.backToLogin}
            </Link>
          </div>
        ) : (
          <div className="mx-auto max-w-2xl px-6 pb-16 sm:px-10">
            <div className="mb-8">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-indigo-600 mb-2">
                {t.signup.badge}
              </p>
              <h1 className="text-3xl font-black tracking-tight text-slate-900">{t.signup.title}</h1>
            </div>

            {/* Org details */}
            <OrgSignupForm
              onSubmit={handleSignup}
              loading={loading}
              t={t}
            />
          </div>
        )}
      </div>
    </main>
  );
}
