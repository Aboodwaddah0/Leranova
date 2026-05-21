import { ChevronRight, Info, KeyRound, LogOut, School, UserCircle2 } from 'lucide-react';
import { useLanguage } from '../../../utils/i18n';
import { useTheme } from '../../../contexts/ThemeContext';

function ActionCard({ icon: Icon, title, description, onClick, T }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full rounded-3xl p-4 text-left transition duration-200 hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.99]"
      style={{ border: `1px solid ${T.border}`, background: T.card }}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-fuchsia-500 text-white shadow-md shadow-indigo-500/25">
          <Icon size={24} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-extrabold" style={{ color: T.text }}>{title}</h3>
          <p className="mt-1 text-xs leading-5" style={{ color: T.sub }}>{description}</p>
        </div>
        <ChevronRight
          size={18}
          className="mt-1 shrink-0 transition group-hover:translate-x-0.5 group-hover:text-indigo-500"
          style={{ color: T.muted }}
        />
      </div>
    </button>
  );
}

export default function ProfileCards({ onEditProfile, onChangePassword }) {
  const { isArabic } = useLanguage();
  const { isDark } = useTheme();

  const T = {
    card:   isDark ? '#111029'                : '#ffffff',
    border: isDark ? 'rgba(255,255,255,0.09)' : 'rgba(203,213,225,0.7)',
    text:   isDark ? '#f1f0f5'                : '#0f172a',
    sub:    isDark ? 'rgba(255,255,255,0.5)'  : '#475569',
    muted:  isDark ? 'rgba(255,255,255,0.28)' : '#94a3b8',
    label:  isDark ? 'rgba(255,255,255,0.35)' : '#64748b',
  };

  return (
    <section className="space-y-4">
      <h2 className="text-sm font-extrabold uppercase tracking-[0.22em]" style={{ color: T.label }}>
        {isArabic ? 'الإجراءات' : 'Actions'}
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <ActionCard
          T={T}
          icon={UserCircle2}
          title={isArabic ? 'البيانات الشخصية' : 'Personal Information'}
          description={isArabic ? 'عدّل الاسم والبريد ورقم الهاتف بتحديثات دقيقة لكل حقل.' : 'Edit your name, email, and phone with field-level updates.'}
          onClick={onEditProfile}
        />
        <ActionCard
          T={T}
          icon={KeyRound}
          title={isArabic ? 'تغيير كلمة المرور' : 'Change Password'}
          description={isArabic ? 'حدّث كلمة المرور بأمان مع التحكم في إظهارها.' : 'Update your password securely with visibility toggles.'}
          onClick={onChangePassword}
        />
      </div>
    </section>
  );
}

export function OrganizationInfoCard({ organizationName, organizationType }) {
  const { isArabic } = useLanguage();
  const { isDark } = useTheme();

  const T = {
    card:     isDark ? '#111029'                : '#ffffff',
    border:   isDark ? 'rgba(255,255,255,0.09)' : '#e2e8f0',
    rowBg:    isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc',
    rowBorder:isDark ? 'rgba(255,255,255,0.07)' : '#e2e8f0',
    label:    isDark ? 'rgba(255,255,255,0.35)' : '#64748b',
    heading:  isDark ? 'rgba(255,255,255,0.35)' : '#475569',
    icon:     isDark ? '#818cf8'                : '#4f46e5',
    text:     isDark ? '#f1f0f5'                : '#0f172a',
  };

  return (
    <section
      className="rounded-3xl p-5"
      style={{ border: `1px solid ${T.border}`, background: T.card }}
    >
      <div className="flex items-center gap-2">
        <School size={16} style={{ color: T.icon }} />
        <h2 className="text-sm font-extrabold uppercase tracking-[0.18em]" style={{ color: T.heading }}>
          {isArabic ? 'بيانات المؤسسة' : 'Organization Info'}
        </h2>
      </div>

      <dl className="mt-4 space-y-3 text-sm">
        <div className="rounded-2xl px-4 py-3" style={{ background: T.rowBg, border: `1px solid ${T.rowBorder}` }}>
          <dt className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: T.label }}>
            {isArabic ? 'الاسم' : 'Name'}
          </dt>
          <dd className="mt-1 font-semibold" style={{ color: T.text }}>
            {organizationName || (isArabic ? 'غير متاح' : 'Not available')}
          </dd>
        </div>

        <div className="rounded-2xl px-4 py-3" style={{ background: T.rowBg, border: `1px solid ${T.rowBorder}` }}>
          <dt className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: T.label }}>
            {isArabic ? 'النوع' : 'Type'}
          </dt>
          <dd className="mt-1 font-semibold" style={{ color: T.text }}>
            {organizationType || (isArabic ? 'غير متاح' : 'Not available')}
          </dd>
        </div>
      </dl>
    </section>
  );
}

export function QuickStats({ enrolledCoursesCount, membershipStatus, accountStatus }) {
  const { isArabic } = useLanguage();
  const { isDark } = useTheme();

  const T = {
    card:   isDark ? '#111029'                : '#ffffff',
    border: isDark ? 'rgba(255,255,255,0.09)' : 'rgba(203,213,225,0.7)',
    label:  isDark ? 'rgba(255,255,255,0.35)' : '#64748b',
    text:   isDark ? '#f1f0f5'                : '#0f172a',
  };

  const stats = [
    { label: isArabic ? 'الكورسات المسجلة' : 'Enrolled Courses', value: String(enrolledCoursesCount ?? 0) },
    { label: isArabic ? 'حالة العضوية' : 'Membership Status', value: membershipStatus || (isArabic ? 'نشط' : 'Active') },
    { label: isArabic ? 'حالة الحساب' : 'Account Status', value: accountStatus || (isArabic ? 'موثق' : 'Verified') },
  ];

  return (
    <section className="grid gap-3 sm:grid-cols-3">
      {stats.map((item) => (
        <article
          key={item.label}
          className="rounded-3xl px-5 py-4"
          style={{ border: `1px solid ${T.border}`, background: T.card }}
        >
          <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: T.label }}>{item.label}</p>
          <p className="mt-2 text-xl font-black" style={{ color: T.text }}>{item.value}</p>
        </article>
      ))}
    </section>
  );
}

export function LogoutSection({ onLogout }) {
  const { isArabic } = useLanguage();
  const { isDark } = useTheme();

  return (
    <section className="pt-2">
      <button
        type="button"
        onClick={onLogout}
        className="flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold transition"
        style={{
          border: `1px solid ${isDark ? 'rgba(248,113,113,0.25)' : '#fecaca'}`,
          background: isDark ? 'rgba(248,113,113,0.08)' : '#fff1f2',
          color: isDark ? '#f87171' : '#b91c1c',
        }}
      >
        <LogOut size={16} />
        {isArabic ? 'تسجيل الخروج' : 'Logout'}
      </button>
    </section>
  );
}

export function AboutProfileCard() {
  const { isArabic } = useLanguage();
  const { isDark } = useTheme();

  const T = {
    card:    isDark ? '#111029'                : '#ffffff',
    border:  isDark ? 'rgba(255,255,255,0.09)' : '#e2e8f0',
    heading: isDark ? 'rgba(255,255,255,0.35)' : '#475569',
    icon:    isDark ? '#818cf8'                : '#4f46e5',
    text:    isDark ? 'rgba(255,255,255,0.55)' : '#475569',
  };

  return (
    <section className="rounded-3xl p-5" style={{ border: `1px solid ${T.border}`, background: T.card }}>
      <div className="flex items-center gap-2">
        <Info size={15} style={{ color: T.icon }} />
        <h3 className="text-sm font-extrabold uppercase tracking-[0.18em]" style={{ color: T.heading }}>
          {isArabic ? 'حول هذا الملف' : 'About this profile'}
        </h3>
      </div>
      <p className="mt-3 text-sm leading-7" style={{ color: T.text }}>
        {isArabic
          ? 'يتم مزامنة هذا الملف من حسابك في Learnova ويُستخدم عبر لوحات الكورسات والتعليقات وسجل التعلم.'
          : 'Your profile is synced from your Learnova account and is used across course dashboards, comments, and learning history.'}
      </p>
    </section>
  );
}
