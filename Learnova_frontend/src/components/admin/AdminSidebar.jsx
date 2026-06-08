import { NavLink } from "react-router-dom";
import { LayoutDashboard, Building2, TrendingUp, LogOut } from "lucide-react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { logout } from "../../redux/slices/authSlice";
import { clearAdminState } from "../../redux/slices/adminSlice";
import { useLanguage } from "../../utils/i18n";
import { useTheme } from "../../contexts/ThemeContext";

export default function AdminSidebar() {
  const { t, isArabic } = useLanguage();
  const { isDark } = useTheme();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const navItems = [
    { to: "/admin",               label: t.admin.tabs.overview,       icon: LayoutDashboard, end: true },
    { to: "/admin/organizations", label: t.admin.tabs.organizations,  icon: Building2 },
    { to: "/admin/revenue",       label: t.admin.tabs.revenue,        icon: TrendingUp },
  ];

  const handleLogout = () => {
    dispatch(clearAdminState());
    dispatch(logout());
    navigate("/login");
  };

  return (
    <aside
      className="flex h-full flex-col px-4 pb-6 pt-6"
      style={{
        background: isDark ? "#231d2e" : "rgba(255,255,255,0.78)",
        borderRight: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.7)"}`,
        backdropFilter: isDark ? "none" : "blur(20px)",
      }}
    >
      <div className="mb-6 rounded-3xl bg-gradient-to-br from-indigo-600 to-purple-600 p-4 text-white shadow-lg">
        <p className="text-xs uppercase tracking-[0.25em] text-indigo-100">Learnova</p>
        <h2 className="mt-2 text-xl font-black">{t.admin.title}</h2>
      </div>

      <nav className="flex flex-1 flex-col gap-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                  isActive
                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/20"
                    : ""
                }`
              }
              style={({ isActive }) =>
                !isActive ? { color: isDark ? "#b8b3c3" : "#475569" } : undefined
              }
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}` }}>
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-2xl border border-transparent bg-transparent px-4 py-3 text-sm font-semibold text-red-500 transition-all duration-200 hover:border-red-500 hover:bg-red-500 hover:text-white"
        >
          <LogOut size={18} />
          {isArabic ? "تسجيل الخروج" : "Logout"}
        </button>
      </div>
    </aside>
  );
}
