import { NavLink } from "react-router-dom";
import { useDispatch } from "react-redux";
import { logout } from "../../redux/slices/authSlice";
import { useLanguage } from "../../utils/i18n";

const navItems = [
  { to: "/dashboard/instructor/overview", labelAr: "النظرة العامة", labelEn: "Overview", end: true },
  { to: "/dashboard/instructor/subjects", labelAr: "المواد", labelEn: "Subjects" },
  { to: "/dashboard/instructor/lessons", labelAr: "الدروس", labelEn: "Lessons" },
  { to: "/dashboard/instructor/students", labelAr: "الطلاب", labelEn: "Students" },
  { to: "/dashboard/instructor/marks", labelAr: "العلامات", labelEn: "Marks" },
];

export default function InstructorLayout({ title, subtitle, children, actions }) {
  const dispatch = useDispatch();
  const { lang, isArabic, toggleLang } = useLanguage();

  return (
    <main className={`admin-management-theme min-h-screen bg-[#eff6fd] ${isArabic ? "lang-ar" : "lang-en"}`}>
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside className="w-full border-b border-blue-200/60 bg-gradient-to-b from-[#2379c3] to-[#1f69ab] text-white lg:w-72 lg:border-b-0 lg:border-r lg:border-r-white/15">
          <div className="p-6">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-100">Learnova</p>
            <h1 className="mt-2 text-2xl font-black text-white">{isArabic ? "لوحة المعلم" : "Instructor Hub"}</h1>
            <p className="mt-2 text-sm text-blue-50/90">{isArabic ? "إدارة المحتوى والطلاب والدرجات" : "Manage content, students, and marks"}</p>
          </div>

          <nav className="space-y-2 px-4 pb-6">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `block rounded-2xl px-4 py-3 text-sm transition ${
                    isActive
                      ? "bg-white font-bold text-[#1a5d96]"
                      : "font-semibold text-blue-50/85 hover:bg-white/20 hover:text-white"
                  }`
                }
              >
                {isArabic ? item.labelAr : item.labelEn}
              </NavLink>
            ))}
          </nav>

          <div className="border-t border-white/10 p-4">
            <button
              type="button"
              onClick={toggleLang}
              className="mb-3 w-full rounded-xl border border-white/30 bg-white/15 px-4 py-2 text-sm font-semibold text-white"
            >
              {lang === "en" ? "العربية" : "English"}
            </button>
            <button
              type="button"
              onClick={() => dispatch(logout())}
              className="w-full rounded-xl border border-white/30 bg-white px-4 py-2 text-sm font-semibold text-[#1f69ab]"
            >
              {isArabic ? "تسجيل الخروج" : "Logout"}
            </button>
          </div>
        </aside>

        <section className="flex-1 p-4 md:p-8">
          <header className="rounded-3xl bg-gradient-to-r from-[#2379c3] to-[#1f69ab] p-6 text-white shadow-xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-100">Learnova</p>
            <h2 className="mt-2 text-3xl font-black">{title}</h2>
            {subtitle ? <p className="mt-2 text-sm text-blue-100">{subtitle}</p> : null}
            {actions ? <div className="mt-4 flex flex-wrap gap-3">{actions}</div> : null}
          </header>

          <div className="mt-6">{children}</div>
        </section>
      </div>
    </main>
  );
}
