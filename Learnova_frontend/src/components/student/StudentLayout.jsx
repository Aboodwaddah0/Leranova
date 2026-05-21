import { Link, NavLink, useLocation } from 'react-router-dom';
import { Home, BookOpen, UserCircle2, LogOut, MessageCircle, Users2, BarChart2, Trophy, Sun, Moon } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { logout } from '../../redux/slices/authSlice';
import { useLanguage } from '../../utils/i18n';
import { useTheme } from '../../contexts/ThemeContext';
import AIAssistantSidebar from './AIAssistantSidebar';

const getInitial = (name = 'L') => String(name).trim().charAt(0).toUpperCase() || 'L';

export default function StudentLayout({ title, subtitle, children, actions, aside, contentClassName = '', showAIAssistant = false }) {
  const { t, isArabic, lang, setLang } = useLanguage();
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth?.user);
  const organizationType = String(user?.organizationType || user?.organization?.Role || '').trim().toUpperCase();
  const isSchoolStudent = organizationType === 'SCHOOL';
  const isRtl = isArabic;

  const navItems = useMemo(() => ([
    {
      to: '/dashboard/student',
      label: t?.student?.title || (isArabic ? 'لوحة الطالب' : 'Student Dashboard'),
      icon: Home,
      match: (pathname) => pathname === '/dashboard/student' || pathname === '/dashboard/student/overview',
    },
    {
      to: isSchoolStudent ? '/student/subjects' : '/courses',
      label: isSchoolStudent
        ? (isArabic ? 'موادّي' : 'My Subjects')
        : (t?.student?.courses?.title || (isArabic ? 'الكورسات' : 'Courses')),
      icon: BookOpen,
      match: (pathname) => (isSchoolStudent
        ? pathname === '/student/subjects' || pathname.startsWith('/courses/')
        : pathname === '/courses' || pathname.startsWith('/courses/')),
    },
    ...(isSchoolStudent ? [{
      to: '/student/marks',
      label: isArabic ? 'درجاتي' : 'My Marks',
      icon: BarChart2,
      match: (pathname) => pathname === '/student/marks',
    }] : []),
    {
      to: '/student/social',
      label: isArabic ? 'المنافسة' : 'Competition',
      icon: Trophy,
      match: (pathname) => pathname === '/student/social',
    },
    {
      to: '/student/chat',
      label: t?.student?.chat?.title || (isArabic ? 'المحادثات' : 'Chat'),
      icon: MessageCircle,
      match: (pathname) => pathname === '/student/chat',
    },
    {
      to: '/teachers',
      label: t?.student?.teachers?.title || (isArabic ? 'المدرسين' : 'Teachers'),
      icon: Users2,
      match: (pathname) => pathname === '/teachers' || pathname.startsWith('/teachers/'),
    },
    {
      to: '/student/profile',
      label: t?.student?.profile?.title || (isArabic ? 'الملف الشخصي' : 'Profile'),
      icon: UserCircle2,
      match: (pathname) => pathname === '/student/profile',
    },
  ]), [isArabic, isSchoolStudent, t]);

  const displayName = useMemo(() => user?.fullName || user?.name || user?.email || (isArabic ? 'طالب أكاديمية' : 'Academy Student'), [isArabic, user]);
  const avatar = user?.avatarUrl || user?.avatar || '';
  const activeNavItem = navItems.find((item) => item.match(location.pathname)) || null;

  /* ── CSS variables cascaded to all child pages ── */
  const themeVars = isDark ? {
    '--ln-sec-bg':      'linear-gradient(135deg, rgba(17,24,39,0.97), rgba(30,27,75,0.95))',
    '--ln-sec-border':  'rgba(99,102,241,0.2)',
    '--ln-sec-text':    '#f5f3f7',
    '--ln-sec-subtext': 'rgba(167,139,250,0.7)',
    '--ln-item-bg':     'rgba(99,102,241,0.08)',
    '--ln-item-border': 'rgba(99,102,241,0.18)',
  } : {
    '--ln-sec-bg':      '#ffffff',
    '--ln-sec-border':  'rgba(0,0,0,0.08)',
    '--ln-sec-text':    '#1a1a2e',
    '--ln-sec-subtext': '#5a5f73',
    '--ln-item-bg':     'rgba(107,92,231,0.05)',
    '--ln-item-border': 'rgba(107,92,231,0.12)',
  };

  const sidebarHover = (e, on) => { e.currentTarget.style.background = on ? (isDark ? '#2d2538' : '#f1f3f7') : 'transparent'; };

  return (
    <div
      data-theme={isDark ? 'dark' : 'light'}
      dir={isRtl ? 'rtl' : 'ltr'}
      lang={lang}
      className={`min-h-screen ${isRtl ? 'lang-ar' : 'lang-en'}`}
      style={{ background: isDark ? '#1a1625' : 'radial-gradient(circle at top right, #e1e0ff 0%, #f7f9fb 42%, #c9e6ff 100%)', color: isDark ? '#f5f3f7' : '#1a1a2e', ...themeVars }}
    >
      {/* ── Top header ── */}
      <header
        className="sticky top-0 z-50 shadow-sm"
        style={{
          background: isDark ? 'rgba(35,29,46,0.95)' : 'rgba(255,255,255,0.75)',
          borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.6)'}`,
          backdropFilter: 'blur(20px)',
        }}
      >
        <div className="mx-auto flex max-w-[1700px] items-center justify-between gap-4 px-4 py-3 lg:px-6">
          <div className="flex items-center gap-4">
            <Link to="/dashboard/student" className="text-2xl font-black tracking-tight text-transparent bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text">
              Learnova
            </Link>
            <nav className="hidden md:flex items-center gap-6 text-sm font-semibold" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  end={item.to === '/dashboard/student' || item.to === '/student/profile'}
                  to={item.to}
                  className={({ isActive }) => isActive ? 'text-indigo-400' : ''}
                  style={({ isActive }) => isActive ? {} : { color: isDark ? '#94a3b8' : '#64748b' }}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {/* Theme toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200"
              style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(99,102,241,0.1)', color: isDark ? '#fbbf24' : '#6366f1' }}
              title={isDark ? (isArabic ? 'الوضع الفاتح' : 'Light mode') : (isArabic ? 'الوضع الداكن' : 'Dark mode')}
            >
              {isDark ? <Sun size={17} /> : <Moon size={17} />}
            </button>

            {/* Language switcher */}
            <div
              className="flex items-center rounded-full p-1"
              style={{ background: isDark ? 'rgba(255,255,255,0.06)' : '#ffffff', border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'}` }}
            >
              <button type="button" onClick={() => setLang('en')}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${lang === 'en' ? 'bg-indigo-600 text-white' : ''}`}
                style={lang !== 'en' ? { color: isDark ? '#94a3b8' : '#475569' } : {}}
              >EN</button>
              <button type="button" onClick={() => setLang('ar')}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${lang === 'ar' ? 'bg-indigo-600 text-white' : ''}`}
                style={lang !== 'ar' ? { color: isDark ? '#94a3b8' : '#475569' } : {}}
              >العربية</button>
            </div>

            {/* User card */}
            <div
              className="flex items-center gap-3 rounded-full px-3 py-1.5"
              style={{ background: isDark ? 'rgba(255,255,255,0.06)' : '#ffffff', border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'}` }}
            >
              <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 text-sm font-black text-white">
                {avatar ? <img src={avatar} alt={displayName} className="h-full w-full object-cover" /> : getInitial(displayName)}
              </div>
              <div className="hidden sm:block">
                <p className="text-xs font-semibold" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>{isArabic ? 'طالب أكاديمية' : 'Academy Student'}</p>
                <p className="text-sm font-bold" style={{ color: isDark ? '#f5f3f7' : '#1e293b' }}>{displayName}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── Sidebar ── */}
      <aside
        className={`fixed top-0 hidden h-full w-64 flex-col px-4 pb-6 pt-20 lg:flex ${isRtl ? 'right-0' : 'left-0'}`}
        style={{
          background: isDark ? '#231d2e' : 'rgba(255,255,255,0.78)',
          [isRtl ? 'borderLeft' : 'borderRight']: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.7)'}`,
          backdropFilter: isDark ? 'none' : 'blur(20px)',
          boxShadow: isDark ? 'none' : '2px 0 20px rgba(99,102,241,0.05)',
          borderRadius: isRtl ? '2rem 0 0 2rem' : '0 2rem 2rem 0',
        }}
      >
        <div className="mb-6 rounded-3xl bg-gradient-to-br from-indigo-600 to-cyan-500 p-4 text-white shadow-lg">
          <p className="text-xs uppercase tracking-[0.25em] text-blue-100">{isArabic ? 'تعلم متقدم' : 'Premium Learning'}</p>
          <h2 className="mt-2 text-xl font-black">{title || (isArabic ? 'مساحة الطالب' : 'Student space')}</h2>
          <p className="mt-1 text-sm text-blue-50/90">{subtitle || (isArabic ? 'مساحة تعلم منظمة' : 'Curated learning workspace')}</p>
        </div>

        <nav className="flex flex-1 flex-col gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeNavItem?.to === item.to;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={() => `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${active ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/20' : ''}`}
                style={!active ? { color: isDark ? '#b8b3c3' : '#475569' } : undefined}
                onMouseEnter={(e) => { if (!active) sidebarHover(e, true); }}
                onMouseLeave={(e) => { if (!active) sidebarHover(e, false); }}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}` }}>
          <button
            type="button"
            onClick={() => dispatch(logout())}
            className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition"
            style={{ color: isDark ? '#b8b3c3' : '#475569' }}
            onMouseEnter={(e) => sidebarHover(e, true)}
            onMouseLeave={(e) => sidebarHover(e, false)}
          >
            <LogOut size={18} />
            {isArabic ? 'تسجيل الخروج' : 'Logout'}
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className={`px-4 py-6 pb-24 lg:px-8 lg:pb-6 ${isRtl ? 'lg:mr-64' : 'lg:ml-64'}`}>
        <div className="mx-auto flex max-w-[1600px] gap-8">
          <div className="min-w-0 flex-1">
            {(title || subtitle || actions) ? (
              <motion.section
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="mb-6 overflow-hidden rounded-[2rem] p-6 shadow-xl backdrop-blur-2xl"
                style={{
                  background: isDark ? 'rgba(45,37,56,0.95)' : 'rgba(255,255,255,0.75)',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.7)'}`,
                }}
              >
                <div className="flex flex-col items-start gap-4">
                  <div>
                    {title ? <p className="text-xs font-bold uppercase tracking-[0.25em] text-indigo-400">{title}</p> : null}
                    {subtitle ? <h1 className="mt-2 text-3xl font-black tracking-tight" style={{ color: isDark ? '#f5f3f7' : '#0f172a' }}>{subtitle}</h1> : null}
                  </div>
                  {actions ? <div className="flex flex-wrap items-start justify-start gap-3">{actions}</div> : null}
                </div>
              </motion.section>
            ) : null}
            <div className={contentClassName}>{children}</div>
          </div>
          {aside ? <div className="hidden xl:block w-[360px] shrink-0">{aside}</div> : null}
        </div>
      </main>

      {/* ── Bottom nav (mobile) ── */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 pb-safe px-2 pt-2 lg:hidden"
        style={{
          background: isDark ? 'rgba(35,29,46,0.97)' : 'rgba(255,255,255,0.88)',
          borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.6)'}`,
          backdropFilter: 'blur(20px)',
        }}
      >
        <div className="mx-auto flex max-w-md items-center justify-around">
          {navItems.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const active = activeNavItem?.to === item.to;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={() => `flex flex-col items-center gap-0.5 rounded-xl px-2.5 py-2 text-[10px] font-bold uppercase tracking-wider transition-all ${active ? 'scale-105' : ''}`}
                style={{ color: active ? '#6366f1' : (isDark ? '#94a3b8' : '#64748b'), background: active ? (isDark ? 'rgba(99,102,241,0.15)' : '#eef2ff') : 'transparent' }}
              >
                <Icon size={20} />
                <span className="mt-0.5 max-w-[56px] truncate text-center">{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>

      {showAIAssistant ? <AIAssistantSidebar isArabic={isArabic} /> : null}
    </div>
  );
}
