import { School, Sparkles } from 'lucide-react';

const initialsOf = (name = '') => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'ST';
  return parts.slice(0, 2).map((value) => value[0].toUpperCase()).join('');
};

export default function ProfileHeader({ profile, studentMode }) {
  const displayName = profile?.fullName || profile?.name || 'Student';
  const email = profile?.email || 'student@learnova.com';
  const avatarUrl = profile?.avatarUrl || profile?.avatar || '';
  const badgeLabel = studentMode === 'SCHOOL' ? 'School Student' : 'Academy Student';

  return (
    <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-indigo-600 via-violet-600 to-pink-500 p-6 text-white shadow-xl shadow-indigo-500/25 md:p-7">
      <div className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full bg-white/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-pink-300/25 blur-2xl" />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white/30 bg-white/15 text-base font-black text-white">
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
            ) : (
              initialsOf(displayName)
            )}
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-indigo-100">Student profile</p>
            <h1 className="mt-1 text-2xl font-black leading-tight md:text-3xl">{displayName}</h1>
            <p className="mt-1 text-sm text-indigo-100/95">{email}</p>
          </div>
        </div>

        <div className="inline-flex items-center gap-2 self-start rounded-full border border-white/25 bg-white/15 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-white/95 sm:self-center">
          <Sparkles size={14} />
          {badgeLabel}
        </div>
      </div>

      <div className="relative mt-6 flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-indigo-50">
        <School size={16} />
        <span>Keep your profile details up to date for a smoother course experience.</span>
      </div>
    </section>
  );
}
