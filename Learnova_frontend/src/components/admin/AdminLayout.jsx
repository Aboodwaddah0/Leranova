import { useLanguage } from "../../utils/i18n";
import AdminSidebar from "./AdminSidebar";
import QuantumMeshBackground from "../ui/QuantumMeshBackground";

export default function AdminLayout({ title, subtitle, children, actions }) {
  const { lang, isArabic, t, toggleLang } = useLanguage();

  return (
    <main className={`admin-management-theme relative min-h-screen overflow-hidden bg-[#eff6fd] px-4 py-6 ${isArabic ? "lang-ar" : "lang-en"}`}>
      <QuantumMeshBackground />

      <button
        type="button"
        onClick={toggleLang}
        className="absolute right-6 top-6 z-20 rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-[#1f69ab]"
      >
        {lang === "en" ? t.common.switchToArabic : t.common.switchToEnglish}
      </button>

      <div className="relative z-10 mx-auto grid min-h-[92vh] w-full max-w-7xl gap-6 lg:grid-cols-[260px_1fr]">
        <AdminSidebar />

        <section className="space-y-6 rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_56px_-26px_rgba(16,20,26,0.35)] md:p-8">
          <div className="flex flex-col gap-4 border-b border-slate-100 pb-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-sky-700">{t.admin.badge}</p>
              <h1 className="mt-2 text-3xl font-black text-slate-900">{title}</h1>
              {subtitle ? <p className="mt-2 max-w-2xl text-slate-600">{subtitle}</p> : null}
            </div>
            {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
          </div>

          {children}
        </section>
      </div>
    </main>
  );
}