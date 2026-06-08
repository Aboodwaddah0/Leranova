import { useState, useMemo } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Building2, TrendingUp,
  Menu, X, Sun, Moon, LogOut, ShieldCheck,
} from "lucide-react";
import NotificationDropdown from "../shared/NotificationDropdown";
import { logout } from "../../redux/slices/authSlice";
import { clearAdminState } from "../../redux/slices/adminSlice";
import { useLanguage } from "../../utils/i18n";
import { useTheme } from "../../contexts/ThemeContext";

const getInitial = (name = "A") => String(name).trim().charAt(0).toUpperCase() || "A";

export default function AdminLayout({ title, subtitle, children, actions }) {
  const { t, isArabic, lang } = useLanguage();
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const adminUser = useSelector((state) => state.auth.user);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = useMemo(() => [
    { to: "/admin",                label: t.admin.tabs.overview,       icon: LayoutDashboard, end: true },
    { to: "/admin/organizations",  label: t.admin.tabs.organizations,  icon: Building2 },
    { to: "/admin/revenue",        label: t.admin.tabs.revenue,        icon: TrendingUp },
  ], [t]);

  const displayName = adminUser?.name || adminUser?.Name || adminUser?.email || "Admin";
  const activeItem = navItems.find((item) =>
    item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)
  ) || null;

  const handleLogout = () => {
    dispatch(clearAdminState());
    dispatch(logout());
    navigate("/login");
  };

  const themeVars = isDark ? {
    "--ln-sec-bg": "linear-gradient(135deg, rgba(17,24,39,0.97), rgba(30,27,75,0.95))",
    "--ln-sec-border": "rgba(99,102,241,0.2)",
    "--ln-sec-text": "#f5f3f7",
    "--ln-sec-subtext": "rgba(167,139,250,0.7)",
    "--ln-item-bg": "rgba(99,102,241,0.08)",
    "--ln-item-border": "rgba(99,102,241,0.18)",
  } : {
    "--ln-sec-bg": "#ffffff",
    "--ln-sec-border": "rgba(0,0,0,0.08)",
    "--ln-sec-text": "#1a1a2e",
    "--ln-sec-subtext": "#5a5f73",
    "--ln-item-bg": "rgba(107,92,231,0.05)",
    "--ln-item-border": "rgba(107,92,231,0.12)",
  };

  const isRtl = isArabic;

  const SidebarContent = ({ onClose }) => (
    <>
      <div className="mb-6 rounded-3xl bg-gradient-to-br from-indigo-600 to-purple-600 p-4 text-white shadow-lg">
        <p className="text-xs uppercase tracking-[0.25em] text-indigo-100">Learnova</p>
        <h2 className="mt-2 text-xl font-black">{t.admin.title}</h2>
        <p className="mt-1 text-sm text-indigo-50/90">{isArabic ? "لوحة التحكم الإدارية" : "Admin Control Panel"}</p>
      </div>

      <nav className="flex flex-1 flex-col gap-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = activeItem?.to === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onClose}
              className={() =>
                `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                  active ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/20" : ""
                }`
              }
              style={!active ? { color: isDark ? "#b8b3c3" : "#475569" } : undefined}
              onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = isDark ? "#2d2538" : "#f1f3f7"; }}
              onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
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
          className="flex w-full items-center gap-3 rounded-2xl border border-transparent bg-transparent px-4 py-3 text-sm font-semibold text-red-500 transition-all duration-200 hover:border-red-500 hover:bg-red-500 hover:text-white hover:shadow-md"
        >
          <LogOut size={18} />
          {isArabic ? "تسجيل الخروج" : "Logout"}
        </button>
      </div>
    </>
  );

  return (
    <div
      data-theme={isDark ? "dark" : "light"}
      dir={isRtl ? "rtl" : "ltr"}
      lang={lang}
      className={`min-h-screen ${isRtl ? "lang-ar" : "lang-en"}`}
      style={{
        background: isDark
          ? "#1a1625"
          : "radial-gradient(circle at top right, #e1e0ff 0%, #f7f9fb 42%, #c9e6ff 100%)",
        color: isDark ? "#f5f3f7" : "#1a1a2e",
        ...themeVars,
      }}
    >
      {/* ── Top header ── */}
      <header
        className="sticky top-0 z-50 flex items-center justify-between px-4 lg:px-6 relative"
        style={{
          height: "68px",
          background: isDark
            ? "linear-gradient(180deg, #2a2438 0%, #241e32 100%)"
            : "linear-gradient(180deg, #ffffff 0%, #f8f9fb 100%)",
          borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
          boxShadow: isDark ? "0 4px 20px rgba(0,0,0,0.15)" : "0 2px 12px rgba(0,0,0,0.04)",
        }}
      >
        {/* Accent line */}
        <div
          className="absolute bottom-0 left-0 right-0 h-px pointer-events-none"
          style={{
            background: `linear-gradient(90deg, transparent, ${isDark ? "rgba(124,92,224,0.5)" : "rgba(107,92,231,0.3)"}, transparent)`,
          }}
        />

        {/* Left: Hamburger + Logo */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            className="flex lg:hidden h-9 w-9 items-center justify-center rounded-[10px] transition-all duration-200"
            style={{
              background: isDark ? "rgba(124,92,224,0.1)" : "rgba(107,92,231,0.08)",
              border: `1px solid ${isDark ? "rgba(124,92,224,0.2)" : "rgba(107,92,231,0.15)"}`,
              color: isDark ? "#c4b5fd" : "#6b5ce7",
            }}
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={18} />
          </button>

          <Link
            to="/admin"
            className="flex items-center gap-2 text-xl font-bold tracking-tight transition-all duration-300"
            style={{
              background: "linear-gradient(135deg, #7c5ce0, #9c6ff0)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              filter: "drop-shadow(0 0 0px rgba(124,92,224,0))",
              transition: "filter 0.3s ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.filter = "drop-shadow(0 0 8px rgba(124,92,224,0.6))"; }}
            onMouseLeave={(e) => { e.currentTarget.style.filter = "drop-shadow(0 0 0px rgba(124,92,224,0))"; }}
          >
            <ShieldCheck size={20} style={{ color: "#7c5ce0" }} />
            Learnova Admin
          </Link>
        </div>

        {/* Center: Nav (desktop) */}
        <div className="hidden md:flex flex-1 justify-center px-6">
          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const active = activeItem?.to === item.to;
              return (
                <NavLink
                  key={item.to}
                  end={item.end}
                  to={item.to}
                  className="rounded-lg px-4 py-2 text-sm font-medium whitespace-nowrap transition-all duration-200"
                  style={
                    active
                      ? { background: "linear-gradient(135deg, #7c5ce0, #8e6fe8)", color: "#ffffff", boxShadow: "0 2px 8px rgba(124,92,224,0.3)" }
                      : { color: isDark ? "rgba(255,255,255,0.6)" : "rgba(26,26,46,0.6)" }
                  }
                  onMouseEnter={(e) => { if (!active) { e.currentTarget.style.background = isDark ? "rgba(124,92,224,0.12)" : "rgba(107,92,231,0.08)"; e.currentTarget.style.color = isDark ? "rgba(255,255,255,0.9)" : "rgba(26,26,46,0.9)"; } }}
                  onMouseLeave={(e) => { if (!active) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = isDark ? "rgba(255,255,255,0.6)" : "rgba(26,26,46,0.6)"; } }}
                >
                  {item.label}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Right: Notifications + Theme toggle + User */}
        <div className="flex items-center gap-2 shrink-0">
          <NotificationDropdown />
          <button
            type="button"
            onClick={toggleTheme}
            className="flex h-9 w-9 items-center justify-center rounded-[10px] transition-all duration-200"
            style={{
              background: isDark ? "rgba(124,92,224,0.1)" : "rgba(107,92,231,0.08)",
              border: `1px solid ${isDark ? "rgba(124,92,224,0.2)" : "rgba(107,92,231,0.15)"}`,
              color: isDark ? "#fbbf24" : "#6b5ce7",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.05)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          <div
            className="flex items-center gap-2 rounded-[10px] px-2.5 py-1.5 cursor-pointer transition-all duration-200"
            style={{ border: "1px solid transparent" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = isDark ? "rgba(124,92,224,0.1)" : "rgba(107,92,231,0.08)"; e.currentTarget.style.borderColor = isDark ? "rgba(124,92,224,0.2)" : "rgba(107,92,231,0.15)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "transparent"; }}
          >
            <div
              className="flex h-[34px] w-[34px] shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-black text-white"
              style={{ background: "linear-gradient(135deg, #7c5ce0, #9c6ff0)", border: "2px solid #7c5ce0" }}
            >
              {getInitial(displayName)}
            </div>
            <div className="hidden sm:flex flex-col leading-tight">
              <span className="text-sm font-semibold" style={{ color: isDark ? "rgba(255,255,255,0.95)" : "rgba(26,26,46,0.95)" }}>{displayName}</span>
              <span className="text-[11px]" style={{ color: isDark ? "rgba(255,255,255,0.45)" : "rgba(26,26,46,0.45)" }}>{isArabic ? "مدير" : "Admin"}</span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Desktop Sidebar ── */}
      <aside
        className={`fixed top-0 hidden h-full w-64 flex-col px-4 pb-6 pt-20 lg:flex ${isRtl ? "right-0" : "left-0"}`}
        style={{
          background: isDark ? "#231d2e" : "rgba(255,255,255,0.78)",
          [isRtl ? "borderLeft" : "borderRight"]: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.7)"}`,
          backdropFilter: isDark ? "none" : "blur(20px)",
          boxShadow: isDark ? "none" : "2px 0 20px rgba(99,102,241,0.05)",
          borderRadius: isRtl ? "2rem 0 0 2rem" : "0 2rem 2rem 0",
        }}
      >
        <SidebarContent onClose={() => {}} />
      </aside>

      {/* ── Mobile Sidebar Drawer ── */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[60] lg:hidden"
              style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: isRtl ? "100%" : "-100%" }} animate={{ x: 0 }} exit={{ x: isRtl ? "100%" : "-100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className={`fixed top-0 z-[70] h-full w-72 flex flex-col px-4 pb-6 pt-6 lg:hidden ${isRtl ? "right-0" : "left-0"}`}
              style={{
                background: isDark ? "#231d2e" : "#ffffff",
                boxShadow: isDark ? "4px 0 30px rgba(0,0,0,0.4)" : "4px 0 30px rgba(99,102,241,0.12)",
              }}
            >
              <div className="mb-4 flex items-center justify-between">
                <span
                  className="text-lg font-bold"
                  style={{ background: "linear-gradient(135deg, #7c5ce0, #9c6ff0)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
                >
                  Learnova Admin
                </span>
                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg transition"
                  style={{ background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)", color: isDark ? "#c4b5fd" : "#6b5ce7" }}
                >
                  <X size={16} />
                </button>
              </div>
              <SidebarContent onClose={() => setSidebarOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Main content ── */}
      <main className={`px-4 py-6 pb-24 lg:px-8 lg:pb-6 ${isRtl ? "lg:mr-64" : "lg:ml-64"}`}>
        <div className="mx-auto max-w-[1600px]">
          {(title || subtitle || actions) ? (
            <motion.section
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
              className="mb-6 overflow-hidden rounded-[2rem] p-6 shadow-xl backdrop-blur-2xl"
              style={{
                background: isDark ? "rgba(45,37,56,0.95)" : "rgba(255,255,255,0.75)",
                border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.7)"}`,
              }}
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  {title ? <p className="text-xs font-bold uppercase tracking-[0.25em] text-indigo-400">{title}</p> : null}
                  {subtitle ? (
                    <h1 className="mt-2 text-3xl font-black tracking-tight" style={{ color: isDark ? "#f5f3f7" : "#0f172a" }}>
                      {subtitle}
                    </h1>
                  ) : null}
                </div>
                {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
              </div>
            </motion.section>
          ) : null}

          {children}
        </div>
      </main>

      {/* ── Bottom nav (mobile) ── */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 pb-safe px-2 pt-2 lg:hidden"
        style={{
          background: isDark ? "rgba(35,29,46,0.97)" : "rgba(255,255,255,0.88)",
          borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.6)"}`,
          backdropFilter: "blur(20px)",
        }}
      >
        <div className="mx-auto flex max-w-md items-center justify-around">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeItem?.to === item.to;
            return (
              <NavLink
                key={item.to}
                end={item.end}
                to={item.to}
                className={() =>
                  `flex flex-col items-center gap-0.5 rounded-xl px-2.5 py-2 text-[10px] font-bold uppercase tracking-wider transition-all ${active ? "scale-105" : ""}`
                }
                style={{
                  color: active ? "#6366f1" : isDark ? "#94a3b8" : "#64748b",
                  background: active ? (isDark ? "rgba(99,102,241,0.15)" : "#eef2ff") : "transparent",
                }}
              >
                <Icon size={20} />
                <span className="mt-0.5 max-w-[56px] truncate text-center">{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
