import { useState } from "react";
import { Bell, ChevronDown, Search, UserCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useLanguage } from "../../utils/i18n";
import AdminSidebar from "./AdminSidebar";
import QuantumMeshBackground from "../ui/QuantumMeshBackground";

export default function AdminLayout({ title, subtitle, children, actions }) {
  const { lang, isArabic, t, toggleLang } = useLanguage();
  const adminUser = useSelector((state) => state.auth.user);
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState("");
  const [showUserMenu, setShowUserMenu] = useState(false);

  const displayName = adminUser?.name || adminUser?.Name || adminUser?.fullName || adminUser?.email || t.admin.common.unknown;
  const displayRole = adminUser?.role || adminUser?.Role || t.admin.tabs.overview;

  const handleSearchSubmit = () => {
    const q = String(searchValue || "").trim().toLowerCase();
    if (!q) {
      return;
    }

    if (q.includes("org") || q.includes("منظ") || q.includes("organ")) {
      navigate("/admin/organizations");
      return;
    }

    if (q.includes("rev") || q.includes("إيراد") || q.includes("payment")) {
      navigate("/admin/revenue");
      return;
    }

    if (q.includes("plan") || q.includes("خط") || q.includes("feature")) {
      navigate("/admin/plans");
      return;
    }

    navigate("/admin");
  };

  return (
    <main dir={isArabic ? "rtl" : "ltr"} className={`admin-management-theme dashboard-page relative min-h-screen overflow-hidden px-4 py-6 ${isArabic ? "lang-ar" : "lang-en"}`}>
      <QuantumMeshBackground />

      <div className="dashboard-topbar relative z-10 mx-auto mb-6 w-full max-w-[1800px] rounded-[28px] px-5 py-4 backdrop-blur-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="dashboard-brand-icon flex h-12 w-12 items-center justify-center rounded-2xl">
              <UserCircle2 size={24} />
            </div>
            <div>
              <p className="dashboard-kicker text-xs font-black uppercase tracking-[0.22em]">Learnova Admin</p>
              <h1 className="dashboard-title mt-1 text-2xl font-black">{title}</h1>
              {subtitle ? <p className="dashboard-subtitle mt-1 max-w-3xl text-sm">{subtitle}</p> : null}
            </div>
          </div>

          <div className="flex flex-1 flex-wrap items-center justify-end gap-3 lg:max-w-3xl">
            <label className="dashboard-input-shell flex min-w-[240px] flex-1 items-center gap-3 rounded-2xl border px-4 py-3 text-sm">
              <Search size={16} />
              <input
                type="search"
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleSearchSubmit();
                  }
                }}
                placeholder={isArabic ? "ابحث داخل لوحة الأدمن" : "Search admin dashboard"}
                className="w-full bg-transparent outline-none"
              />
            </label>

            <button
              type="button"
              className="dashboard-icon-btn relative rounded-2xl border p-3 transition hover:text-slate-900"
              aria-label={isArabic ? "الإشعارات" : "Notifications"}
            >
              <Bell size={18} />
              <span className="dashboard-notification-dot absolute right-2 top-2 h-2.5 w-2.5 rounded-full" />
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setShowUserMenu((prev) => !prev)}
                className="dashboard-user-chip flex items-center gap-3 rounded-2xl border px-4 py-2.5"
              >
                <div className="dashboard-user-avatar flex h-10 w-10 items-center justify-center rounded-full">
                  <UserCircle2 size={20} />
                </div>
                <div className="min-w-0 text-left">
                  <p className="dashboard-title truncate text-sm font-semibold">{displayName}</p>
                  <p className="dashboard-muted truncate text-xs">{String(displayRole).toUpperCase()}</p>
                </div>
                <ChevronDown size={16} className="dashboard-muted" />
              </button>

              {showUserMenu ? (
                <div className="dashboard-menu absolute right-0 z-30 mt-2 w-56 rounded-2xl border p-2 shadow-xl">
                  <button type="button" className="dashboard-menu-item w-full rounded-xl px-3 py-2 text-left text-sm font-medium">
                    {isArabic ? "الملف الشخصي" : "Profile"}
                  </button>
                  <button type="button" className="dashboard-menu-item w-full rounded-xl px-3 py-2 text-left text-sm font-medium">
                    {isArabic ? "الإعدادات" : "Settings"}
                  </button>
                  <button type="button" className="w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-rose-700 hover:bg-rose-50">
                    {isArabic ? "تسجيل الخروج" : "Logout"}
                  </button>
                </div>
              ) : null}
            </div>

            <button
              type="button"
              onClick={handleSearchSubmit}
              className="dashboard-action-btn rounded-2xl border px-4 py-2 text-sm font-semibold"
            >
              {isArabic ? "بحث" : "Search"}
            </button>

            <button
              type="button"
              onClick={toggleLang}
              className="dashboard-lang-btn rounded-2xl border px-4 py-2 text-sm font-semibold"
            >
              {lang === "en" ? t.common.switchToArabic : t.common.switchToEnglish}
            </button>
          </div>
        </div>
      </div>

      <div className="relative z-10 grid min-h-[92vh] w-full gap-6 lg:grid-cols-[260px_1fr]">
        <AdminSidebar />

        <section className="dashboard-panel space-y-6 rounded-[28px] border p-6 md:p-8">
          <div className="dashboard-panel-divider flex flex-col gap-4 border-b pb-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="dashboard-kicker text-xs font-bold uppercase tracking-[0.22em]">{t.admin.badge}</p>
              <h2 className="dashboard-title mt-2 text-3xl font-black">{title}</h2>
              {subtitle ? <p className="dashboard-subtitle mt-2 max-w-2xl">{subtitle}</p> : null}
            </div>
            {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
          </div>

          {children}
        </section>
      </div>
    </main>
  );
}