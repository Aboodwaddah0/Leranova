import { ChevronRight, KeyRound, LogOut, School, UserCircle2 } from 'lucide-react';

const baseCardClass =
  'group w-full rounded-3xl border border-slate-200/70 bg-white p-4 text-left shadow-sm shadow-slate-200/70 transition duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-100/60 active:scale-[0.99]';

function ActionCard({ icon: Icon, title, description, onClick }) {
  return (
    <button type="button" onClick={onClick} className={baseCardClass}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-fuchsia-500 text-white shadow-md shadow-indigo-200">
          <Icon size={24} />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-extrabold text-slate-900">{title}</h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
        </div>

        <ChevronRight size={18} className="mt-1 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-indigo-600" />
      </div>
    </button>
  );
}

export default function ProfileCards({ onEditProfile, onChangePassword }) {
  return (
    <section className="space-y-4">
      <h2 className="text-sm font-extrabold uppercase tracking-[0.22em] text-slate-500">Actions</h2>

      <div className="grid gap-3 sm:grid-cols-2">
        <ActionCard
          icon={UserCircle2}
          title="Personal Information"
          description="Edit your name, email, and phone with field-level updates."
          onClick={onEditProfile}
        />

        <ActionCard
          icon={KeyRound}
          title="Change Password"
          description="Update your password securely with visibility toggles."
          onClick={onChangePassword}
        />
      </div>
    </section>
  );
}

export function OrganizationInfoCard({ organizationName, organizationType }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/60">
      <div className="flex items-center gap-2 text-slate-900">
        <School size={17} className="text-indigo-600" />
        <h2 className="text-sm font-extrabold uppercase tracking-[0.18em] text-slate-600">Organization Info</h2>
      </div>

      <dl className="mt-4 space-y-3 text-sm text-slate-700">
        <div className="rounded-2xl bg-slate-50 px-4 py-3">
          <dt className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Name</dt>
          <dd className="mt-1 font-semibold text-slate-900">{organizationName || 'Not available'}</dd>
        </div>

        <div className="rounded-2xl bg-slate-50 px-4 py-3">
          <dt className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Type</dt>
          <dd className="mt-1 font-semibold text-slate-900">{organizationType || 'Not available'}</dd>
        </div>
      </dl>
    </section>
  );
}

export function QuickStats({ enrolledCoursesCount, membershipStatus, accountStatus }) {
  const stats = [
    { label: 'Enrolled Courses', value: String(enrolledCoursesCount ?? 0) },
    { label: 'Membership Status', value: membershipStatus || 'Active' },
    { label: 'Account Status', value: accountStatus || 'Verified' },
  ];

  return (
    <section className="grid gap-3 sm:grid-cols-3">
      {stats.map((item) => (
        <article key={item.label} className="rounded-3xl border border-slate-200/80 bg-white/95 px-4 py-4 shadow-sm shadow-slate-200/70">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{item.label}</p>
          <p className="mt-2 text-lg font-black text-slate-900">{item.value}</p>
        </article>
      ))}
    </section>
  );
}

export function LogoutSection({ onLogout }) {
  return (
    <section className="pt-2">
      <button
        type="button"
        onClick={onLogout}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700 transition hover:bg-rose-100"
      >
        <LogOut size={16} />
        Logout
      </button>
    </section>
  );
}
