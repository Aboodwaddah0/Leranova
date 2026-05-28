import { Link, useLocation } from 'react-router-dom';
import { LogOut, BarChart2, Home, Settings } from 'lucide-react';
import NotificationDropdown from '../shared/NotificationDropdown';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../../redux/slices/authSlice';
import { useLanguage } from '../../utils/i18n';

export default function ParentLayout({ children }) {
  const { isArabic, lang } = useLanguage();
  const dispatch = useDispatch();
  const user = useSelector((s) => s.auth?.user);
  const { pathname } = useLocation();

  const navLinks = [
    { to: '/dashboard/parent',          icon: Home,     en: 'Home',     ar: 'الرئيسية', exact: true  },
    { to: '/dashboard/parent/marks',    icon: BarChart2, en: 'Marks',   ar: 'الدرجات', exact: false },
    { to: '/dashboard/parent/settings', icon: Settings,  en: 'Settings', ar: 'الإعدادات', exact: false },
  ];

  const initial = (user?.name || 'P').charAt(0).toUpperCase();

  return (
    <div
      dir={isArabic ? 'rtl' : 'ltr'}
      lang={lang}
      className="min-h-screen bg-[radial-gradient(circle_at_top_right,_#e1e0ff_0%,_#f7f9fb_42%,_#c9e6ff_100%)] text-slate-900"
    >
      <header className="sticky top-0 z-50 border-b border-white/60 bg-white/80 backdrop-blur-xl shadow-sm">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-4 py-3 lg:px-8">
          {/* Logo */}
          <Link to="/dashboard/parent"
            className="text-2xl font-black tracking-tight text-transparent bg-gradient-to-r from-indigo-500 to-violet-600 bg-clip-text shrink-0">
            Learnova
          </Link>

          {/* Nav links */}
          <nav className="flex items-center gap-1">
            {navLinks.map(({ to, icon: Icon, en, ar, exact }) => {
              const active = exact ? pathname === to : pathname.startsWith(to);
              return (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-semibold transition ${
                    active
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Icon size={14} />
                  {isArabic ? ar : en}
                </Link>
              );
            })}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <NotificationDropdown />

            {/* Avatar + name */}
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-sm font-black text-white">
                {initial}
              </div>
              <span className="hidden text-sm font-semibold text-slate-700 sm:block">
                {user?.name || (isArabic ? 'ولي الأمر' : 'Parent')}
              </span>
            </div>

            <button
              type="button"
              onClick={() => dispatch(logout())}
              className="flex items-center gap-1.5 rounded-xl border border-transparent bg-transparent px-3 py-1.5 text-sm font-semibold text-red-500 transition-all duration-200 hover:border-red-500 hover:bg-red-500 hover:text-white"
            >
              <LogOut size={14} />
              {isArabic ? 'خروج' : 'Logout'}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-4 py-8 lg:px-8">
        {children}
      </main>
    </div>
  );
}
