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
    <aside className="flex h-full flex-col justify-between rounded-[28px] border border-slate-200 bg-slate-950 p-6 text-white shadow-[0_18px_56px_-26px_rgba(2,6,23,0.75)]">
      <div>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-300 text-slate-950">
            <span className="material-symbols-outlined">admin_panel_settings</span>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Learnova</p>
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
                    ? "bg-white text-slate-950"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <Link to="/" className="mt-8 rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/5">
        {t.admin.common.backToSite}
      </Link>
    </aside>
  );
}
