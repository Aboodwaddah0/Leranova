import { useDispatch, useSelector } from "react-redux";
import { logout } from "../redux/slices/authSlice";
import { useLanguage } from "../utils/i18n";

export default function DashboardPlaceholderPage() {
  const dispatch = useDispatch();
  const role = useSelector((state) => state.auth.role);
  const user = useSelector((state) => state.auth.user);
  const { lang, isArabic, t, toggleLang } = useLanguage();

  return (
    <main className={`min-h-screen bg-[#f7f9fb] px-4 py-8 ${isArabic ? "lang-ar" : "lang-en"}`}>
      <button
        type="button"
        onClick={toggleLang}
        className="absolute right-6 top-6 z-20 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
      >
        {lang === "en" ? t.common.switchToArabic : t.common.switchToEnglish}
      </button>

      <div className="mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-white p-8 shadow">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">{t.dashboard.badge}</p>
        <h1 className="mt-2 text-3xl font-black text-slate-900">{t.dashboard.title}</h1>
        <p className="mt-2 text-slate-600">
          {t.dashboard.rolePrefix} <span className="font-bold text-slate-900">{role || t.dashboard.unknownRole}</span>
        </p>
        <pre className="mt-4 overflow-auto rounded-xl bg-slate-900 p-4 text-xs text-slate-100">
          {JSON.stringify(user, null, 2)}
        </pre>
        <button
          type="button"
          onClick={() => dispatch(logout())}
          className="mt-6 h-10 rounded-xl bg-slate-900 px-4 font-semibold text-white"
        >
          {t.dashboard.logout}
        </button>
      </div>
    </main>
  );
}
