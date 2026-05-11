import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Bell, ChevronDown, Search, UserCircle2 } from "lucide-react";
import { useDispatch } from "react-redux";
import { useSelector } from "react-redux";
import { logout } from "../../redux/slices/authSlice";
import { fetchInstructorProfile } from "../../services/instructorService";
import { ORG_TYPES } from "../../utils/constants";
import { useLanguage } from "../../utils/i18n";

const navItems = [
  { to: "/dashboard/instructor/overview", labelAr: "النظرة العامة", labelEn: "Overview", end: true },
  { to: "/dashboard/instructor/courses", labelAr: "الكورسات", labelEn: "Courses" },
  { to: "/dashboard/instructor/lessons", labelAr: "الدروس", labelEn: "Lessons" },
  { to: "/dashboard/instructor/students", labelAr: "الطلاب", labelEn: "Students" },
  { to: "/dashboard/instructor/marks", labelAr: "العلامات", labelEn: "Marks" },
];

export default function InstructorLayout({ title, subtitle, children, actions }) {
  const dispatch = useDispatch();
  const { lang, isArabic, toggleLang } = useLanguage();
  const authUser = useSelector((state) => state.auth.user);
  const [showTopUserMenu, setShowTopUserMenu] = useState(false);
  const [organizationType, setOrganizationType] = useState(() =>
    String(
      authUser?.organizationType || authUser?.organization?.Role || authUser?.organization?.role || "",
    ).toUpperCase(),
  );

  const navigate = useNavigate();
  const displayName = authUser?.name || authUser?.Name || (isArabic ? "المعلم" : "Instructor");
  const roleLabel = String(authUser?.role || "TEACHER").toUpperCase();
  useEffect(() => {
    const fromAuth = String(
      authUser?.organizationType || authUser?.organization?.Role || authUser?.organization?.role || "",
    ).toUpperCase();

    if (fromAuth) {
      setOrganizationType(fromAuth);
      return;
    }

    let cancelled = false;

    const loadProfileType = async () => {
      try {
        const profile = await fetchInstructorProfile();
        const fromProfile = String(
          profile?.organizationType || profile?.organization?.Role || profile?.organization?.role || "",
        ).toUpperCase();

        if (!cancelled && fromProfile) {
          setOrganizationType(fromProfile);
        }
      } catch (_error) {
        // Keep current fallback behavior when profile call fails.
      }
    };

    loadProfileType();

    return () => {
      cancelled = true;
    };
  }, [authUser]);

  const isSchool = organizationType === ORG_TYPES.SCHOOL;
  const canViewMarks = isSchool;
  const visibleNavItems = isSchool
    ? navItems.map((item) => ({
        ...item,
        labelEn: item.to === "/dashboard/instructor/courses" ? "Grades" : item.labelEn,
        labelAr: item.to === "/dashboard/instructor/courses" ? "الصفوف" : item.labelAr,
      }))
    : navItems.filter((item) => item.to !== "/dashboard/instructor/marks");

  return (
    <main dir={isArabic ? "rtl" : "ltr"} className={`admin-management-theme dashboard-page relative min-h-screen overflow-hidden px-4 py-8 ${isArabic ? "lang-ar" : "lang-en"}`}>
      <header className="dashboard-topbar relative z-20 mx-auto mb-6 w-full max-w-[1800px] rounded-[28px] px-5 py-4 backdrop-blur-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="dashboard-brand-icon flex h-12 w-12 items-center justify-center rounded-2xl">
              <UserCircle2 size={24} />
            </div>
            <div>
              <p className="dashboard-kicker text-xs font-black uppercase tracking-[0.22em]">Learnova</p>
              <h1 className="dashboard-title mt-1 text-2xl font-black">{isArabic ? "لوحة المعلم" : "Instructor Hub"}</h1>
              <p className="dashboard-subtitle mt-1 text-sm">{isArabic ? "إدارة المحتوى والطلاب والدرجات" : "Manage content, students, and marks"}</p>
            </div>
          </div>

          <div className="flex flex-1 flex-wrap items-center justify-end gap-3 lg:max-w-4xl">
            <label className="dashboard-input-shell flex min-w-[240px] flex-1 items-center gap-3 rounded-2xl border px-4 py-3 text-sm">
              <Search size={16} />
              <input
                type="search"
                placeholder={isArabic ? "ابحث في لوحة المعلم" : "Search instructor workspace"}
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
                onClick={() => setShowTopUserMenu((prev) => !prev)}
                className="dashboard-user-chip flex items-center gap-3 rounded-2xl border px-4 py-2.5"
              >
                <div className="dashboard-user-avatar flex h-10 w-10 items-center justify-center rounded-full">
                  <UserCircle2 size={20} />
                </div>
                <div className="min-w-0 text-left">
                  <p className="dashboard-title truncate text-sm font-semibold">{displayName}</p>
                  <p className="dashboard-muted truncate text-xs">{roleLabel}</p>
                </div>
                <ChevronDown size={16} className="dashboard-muted" />
              </button>

              {showTopUserMenu ? (
                <div className="dashboard-menu absolute right-0 z-30 mt-2 w-56 rounded-2xl border p-2 shadow-xl">
                  <button
                    type="button"
                    onClick={() => { setShowTopUserMenu(false); navigate('/dashboard/instructor/settings'); }}
                    className="dashboard-menu-item w-full rounded-xl px-3 py-2 text-left text-sm font-medium"
                  >
                    {isArabic ? "الملف الشخصي" : "Profile"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowTopUserMenu(false); navigate('/dashboard/instructor/settings'); }}
                    className="dashboard-menu-item w-full rounded-xl px-3 py-2 text-left text-sm font-medium"
                  >
                    {isArabic ? "الإعدادات" : "Settings"}
                  </button>
                  <button
                    type="button"
                    onClick={() => dispatch(logout())}
                    className="w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-rose-700 hover:bg-rose-50"
                  >
                    {isArabic ? "تسجيل الخروج" : "Logout"}
                  </button>
                </div>
              ) : null}
            </div>

            <button type="button" onClick={toggleLang} className="dashboard-lang-btn rounded-2xl border px-4 py-2 text-sm font-semibold">
              {lang === "en" ? "العربية" : "English"}
            </button>
          </div>
        </div>
      </header>

      <div className="relative z-10 grid min-h-[92vh] w-full gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="dashboard-sidebar flex h-full flex-col justify-between rounded-[28px] border p-6">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em]">Learnova</p>
            <h1 className="mt-2 text-2xl font-black">{isArabic ? "لوحة المعلم" : "Instructor Hub"}</h1>
            <p className="mt-2 text-sm text-[#EAE0CF]/90">{isArabic ? "المعلم" : "Instructor"}</p>

            <nav className="mt-8 space-y-2">
            {visibleNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `block rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                    isActive
                      ? "dashboard-sidebar-item-active"
                      : "dashboard-sidebar-item"
                  }`
                }
              >
                {isArabic ? item.labelAr : item.labelEn}
              </NavLink>
            ))}
            </nav>
          </div>

          <div className="border-t border-[#EAE0CF]/20 pt-4">
            <button
              type="button"
              onClick={() => dispatch(logout())}
              className="w-full rounded-2xl border border-[#EAE0CF]/50 bg-white/10 px-4 py-3 text-sm font-semibold text-[#EAE0CF] transition hover:bg-white/20"
            >
              {isArabic ? "تسجيل الخروج" : "Logout"}
            </button>
          </div>
        </aside>

        <section className="dashboard-panel space-y-5 rounded-[28px] border p-6 md:p-8">
          <header className="dashboard-hero rounded-3xl p-6 shadow-xl">
            <p className="dashboard-hero-kicker text-xs font-bold uppercase tracking-[0.2em]">Learnova</p>
            <h2 className="mt-2 text-3xl font-black">{title}</h2>
            {subtitle ? <p className="mt-2 text-sm">{subtitle}</p> : null}
            {actions ? <div className="mt-4 flex flex-wrap gap-3">{actions}</div> : null}
          </header>

          <div>{children}</div>
        </section>
      </div>
    </main>
  );
}
