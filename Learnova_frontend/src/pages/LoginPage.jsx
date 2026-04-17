import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import LoginForm from "../components/auth/LoginForm";
import RoleSelector from "../components/auth/RoleSelector";
import { setSelectedRole } from "../redux/slices/uiSlice";
import { AUTH_ROLES } from "../utils/constants";
import { useLanguage } from "../utils/i18n";
import authPhoto from "../assets/authPhoto.jpg";
import QuantumMeshBackground from "../components/ui/QuantumMeshBackground";

export default function LoginPage() {
  const dispatch = useDispatch();
  const { lang, isArabic, t, toggleLang } = useLanguage();

  useEffect(() => {
    dispatch(setSelectedRole(AUTH_ROLES.STUDENT));
  }, [dispatch]);

  return (
    <main className={`relative min-h-screen overflow-hidden bg-[#f7f9fb] px-4 py-8 ${isArabic ? "lang-ar" : "lang-en"}`}>
      <QuantumMeshBackground />

      <button
        type="button"
        onClick={toggleLang}
        className="absolute right-6 top-6 z-20 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
      >
        {lang === "en" ? t.common.switchToArabic : t.common.switchToEnglish}
      </button>

      <div className="relative z-10 mx-auto grid w-full max-w-5xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_56px_-26px_rgba(16,20,26,0.55)] md:grid-cols-2">
        <section className="relative hidden min-h-[620px] md:block">
          <img src={authPhoto} alt="Auth visual" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-br from-sky-900/80 via-blue-700/60 to-cyan-500/35" />
          <div className="absolute inset-0 flex flex-col justify-between p-10 text-white">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-100">
                {t.login.sideBadge}
              </p>
              <h2 className="mt-4 max-w-sm text-4xl font-black leading-tight">
                {t.login.sideTitle}
              </h2>
            </div>

            <div className="rounded-3xl border border-white/25 bg-slate-900/25 p-5 backdrop-blur-md">
              <p className="text-sm leading-7 text-blue-50">
                {t.login.sideText}
              </p>
            </div>
          </div>
        </section>

        <section className="p-6 md:p-10">
          <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200 md:hidden">
            <img src={authPhoto} alt="Auth visual" className="h-44 w-full object-cover" />
          </div>

          <div className="mb-7 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-700 to-blue-500 text-white">
              <span className="material-symbols-outlined">auto_stories</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900">Learnova</h1>
          </div>

          <h3 className="text-2xl font-bold text-slate-900">{t.login.title}</h3>
          <p className="mb-6 mt-1 text-slate-500">
            {t.login.subtitle}
          </p>

          <div className="space-y-4">
            <RoleSelector t={t} />
            <LoginForm t={t} />
          </div>

          <div className="mt-8 border-t border-slate-100 pt-6 text-center">
            <p className="text-sm text-slate-500">{t.login.orgPrompt}</p>
            <Link to="/signup" className="mt-2 inline-block font-bold text-sky-700">
              {t.login.orgCta}
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
