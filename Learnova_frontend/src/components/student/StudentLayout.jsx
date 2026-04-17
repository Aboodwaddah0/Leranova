import { Link, NavLink, useLocation } from 'react-router-dom';
import { Bell, Search, Settings, Home, BookOpen, Users, PlayCircle, BarChart3, UserCircle2 } from 'lucide-react';
import { useSelector } from 'react-redux';
import { useMemo } from 'react';
import { motion } from 'framer-motion';

const navItems = [
  { to: '/dashboard/student', label: 'Dashboard', icon: Home },
  { to: '/dashboard/student/courses', label: 'My Courses', icon: BookOpen },
  { to: '/student/subjects/201', label: 'Subjects', icon: Users },
  { to: '/student/lessons/301', label: 'Lessons', icon: PlayCircle },
  { to: '/student/profile', label: 'Profile', icon: UserCircle2 },
];

const getInitial = (name = 'L') => String(name).trim().charAt(0).toUpperCase() || 'L';

export default function StudentLayout({ title, subtitle, children, actions, aside, contentClassName = '' }) {
  const location = useLocation();
  const user = useSelector((state) => state.auth?.user);

  const displayName = useMemo(() => user?.fullName || user?.name || user?.email || 'Academy Student', [user]);
  const avatar = user?.avatarUrl || user?.avatar || '';

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,_#e1e0ff_0%,_#f7f9fb_42%,_#c9e6ff_100%)] text-slate-900">
      <header className="sticky top-0 z-50 border-b border-white/60 bg-white/75 backdrop-blur-xl shadow-sm">
        <div className="mx-auto flex max-w-[1700px] items-center justify-between gap-4 px-4 py-3 lg:px-6">
          <div className="flex items-center gap-4">
            <Link to="/dashboard/student" className="text-2xl font-black tracking-tight text-transparent bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text">
              Learnova
            </Link>
            <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-500">
              <NavLink to="/dashboard/student" className={({ isActive }) => (isActive ? 'text-indigo-600' : 'hover:text-slate-800')}>Dashboard</NavLink>
              <NavLink to="/dashboard/student/courses" className={({ isActive }) => (isActive ? 'text-indigo-600' : 'hover:text-slate-800')}>My Courses</NavLink>
              <NavLink to="/student/profile" className={({ isActive }) => (isActive ? 'text-indigo-600' : 'hover:text-slate-800')}>Profile</NavLink>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <button className="hidden sm:flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-500 transition hover:bg-slate-200">
              <Search size={16} />
              Search
            </button>
            <button className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800">
              <Bell size={18} />
            </button>
            <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
              <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 text-sm font-black text-white">
                {avatar ? <img src={avatar} alt={displayName} className="h-full w-full object-cover" /> : getInitial(displayName)}
              </div>
              <div className="hidden sm:block">
                <p className="text-xs font-semibold text-slate-500">Academy Student</p>
                <p className="text-sm font-bold text-slate-800">{displayName}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <aside className="fixed left-0 top-0 hidden h-full w-64 flex-col rounded-r-[2rem] border-r border-white/70 bg-white/75 px-4 pb-6 pt-20 shadow-2xl shadow-indigo-500/5 backdrop-blur-2xl lg:flex">
        <div className="mb-6 rounded-3xl bg-gradient-to-br from-indigo-600 to-cyan-500 p-4 text-white shadow-lg">
          <p className="text-xs uppercase tracking-[0.25em] text-blue-100">Premium Learning</p>
          <h2 className="mt-2 text-xl font-black">{title || 'Student space'}</h2>
          <p className="mt-1 text-sm text-blue-50/90">{subtitle || 'Curated learning workspace'}</p>
        </div>

        <nav className="flex flex-1 flex-col gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${isActive || active ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="mt-4 border-t border-slate-200 pt-4">
          <Link to="/student/profile" className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900">
            <Settings size={18} />
            Settings
          </Link>
        </div>
      </aside>

      <main className="px-4 py-6 lg:ml-64 lg:px-8">
        <div className="mx-auto flex max-w-[1600px] gap-8">
          <div className="min-w-0 flex-1">
            {(title || subtitle || actions) ? (
              <motion.section
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="mb-6 overflow-hidden rounded-[2rem] border border-white/70 bg-white/75 p-6 shadow-xl backdrop-blur-2xl"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    {title ? <p className="text-xs font-bold uppercase tracking-[0.25em] text-indigo-600">{title}</p> : null}
                    {subtitle ? <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">{subtitle}</h1> : null}
                  </div>
                  {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
                </div>
              </motion.section>
            ) : null}

            <div className={contentClassName}>{children}</div>
          </div>

          {aside ? <div className="hidden xl:block w-[360px] shrink-0">{aside}</div> : null}
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/60 bg-white/80 px-4 py-3 backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex max-w-xl items-center justify-around gap-2">
          {navItems.slice(0, 4).map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `flex flex-col items-center gap-1 rounded-2xl px-3 py-2 text-[10px] font-bold uppercase tracking-[0.2em] transition ${isActive || active ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400'}`}
              >
                <Icon size={18} />
                {item.label}
              </NavLink>
            );
          })}
          <NavLink
            to="/student/profile"
            className={({ isActive }) => `flex flex-col items-center gap-1 rounded-2xl px-3 py-2 text-[10px] font-bold uppercase tracking-[0.2em] transition ${isActive ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400'}`}
          >
            <UserCircle2 size={18} />
            Profile
          </NavLink>
        </div>
      </nav>
    </div>
  );
}
