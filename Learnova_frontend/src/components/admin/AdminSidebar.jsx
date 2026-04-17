import { Link, NavLink } from "react-router-dom";
import { useLanguage } from "../../utils/i18n";

export default function AdminSidebar() {
  const { t } = useLanguage();

  const navItems = [
    { to: "/admin", label: t.admin.tabs.overview },
    { to: "/admin/organizations", label: t.admin.tabs.organizations },
    { to: "/admin/revenue", label: t.admin.tabs.revenue },
    { to: "/admin/plans", label: t.admin.tabs.plans },
  ];

  return (
    <aside className="flex h-full flex-col justify-between rounded-[28px] border border-slate-200 bg-gradient-to-b from-[#2379c3] to-[#1f69ab] p-6 text-white shadow-[0_18px_56px_-26px_rgba(31,105,171,0.45)]">
      <div>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 text-white">
            <span className="material-symbols-outlined">admin_panel_settings</span>
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-100">Learnova</p>
            <h2 className="text-xl font-black">{t.admin.title}</h2>
          </div>
        </div>

        <nav className="mt-10 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/admin"}
              className={({ isActive }) =>
                `block rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                  isActive
                    ? "bg-white text-[#1a5d96]"
                    : "text-blue-50/85 hover:bg-white/20 hover:text-white"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <Link to="/" className="mt-8 rounded-2xl border border-white/30 bg-white/15 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/25">
        {t.admin.common.backToSite}
      </Link>
    </aside>
  );
}
