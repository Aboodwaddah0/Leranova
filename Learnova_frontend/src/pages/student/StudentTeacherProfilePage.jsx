import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, Mail, UserRound, GraduationCap, UserCircle2 } from 'lucide-react';
import StudentLayout from '../../components/student/StudentLayout';
import { fetchStudentTeacherById } from '../../services/studentService';
import { useLanguage } from '../../utils/i18n';
import { useTheme } from '../../contexts/ThemeContext';


const formatDate = (value, isArabic) => {
  if (!value) return isArabic ? 'غير متوفر' : 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return isArabic ? 'غير متوفر' : 'Not available';
  return new Intl.DateTimeFormat(isArabic ? 'ar-JO' : 'en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  }).format(date);
};

export default function StudentTeacherProfilePage() {
  const { t, isArabic } = useLanguage();
  const { isDark } = useTheme();
  const { teacherId } = useParams();
  const numericTeacherId = Number(teacherId);
  const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const T = {
    card:        isDark ? '#111029'                : 'rgba(255,255,255,0.95)',
    border:      isDark ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,0.7)',
    rowBg:       isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc',
    rowBorder:   isDark ? 'rgba(255,255,255,0.07)' : '#e2e8f0',
    tagBg:       isDark ? 'rgba(255,255,255,0.08)' : '#ffffff',
    tagText:     isDark ? 'rgba(255,255,255,0.7)'  : '#334155',
    tagBorder:   isDark ? 'rgba(255,255,255,0.1)'  : '#e2e8f0',
    subjBg:      isDark ? 'rgba(255,255,255,0.04)' : '#f1f5f9',
    subjBorder:  isDark ? 'rgba(255,255,255,0.07)' : '#e2e8f0',
    avatarBorder:isDark ? 'rgba(255,255,255,0.12)' : '#e2e8f0',
    avatarBg:    isDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9',
    text:        isDark ? '#f1f0f5'                : '#0f172a',
    sub:         isDark ? 'rgba(255,255,255,0.5)'  : '#475569',
    muted:       isDark ? 'rgba(255,255,255,0.32)' : '#64748b',
    accent:      isDark ? '#818cf8'                : '#4f46e5',
    badgeBg:     isDark ? 'rgba(52,211,153,0.12)'  : '#ecfdf5',
    badgeText:   isDark ? '#34d399'                : '#065f46',
    emptyBorder: isDark ? 'rgba(255,255,255,0.12)' : '#cbd5e1',
    emptyIcon:   isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9',
    emptyIconTx: isDark ? 'rgba(255,255,255,0.3)'  : '#94a3b8',
    errorBg:     isDark ? 'rgba(251,191,36,0.08)'  : '#fffbeb',
    errorBorder: isDark ? 'rgba(251,191,36,0.25)'  : '#fde68a',
    errorText:   isDark ? '#fbbf24'                : '#92400e',
    glow1:       isDark ? 'rgba(99,102,241,0.12)'  : 'rgba(199,210,254,0.5)',
    glow2:       isDark ? 'rgba(52,211,153,0.07)'  : 'rgba(167,243,208,0.35)',
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [numericTeacherId]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const data = await fetchStudentTeacherById(numericTeacherId);
        if (!cancelled) setTeacher(data);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError?.message || (isArabic ? 'فشل تحميل ملف المدرس.' : 'Failed to load teacher profile.'));
          setTeacher(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    if (Number.isFinite(numericTeacherId)) load();
    return () => { cancelled = true; };
  }, [isArabic, numericTeacherId]);

  const subjectNames = Array.isArray(teacher?.subjects) ? teacher.subjects.filter(Boolean) : [];
  const dynamicSubjectCount = subjectNames.length || Number(teacher?.subjectCount || 0);
  const teacherDescription = teacher?.bio
    || (isArabic
      ? `${teacher?.name || 'هذا المعلم'} يقدم شرحًا منظمًا ومتابعة واضحة للطلاب في ${teacher?.specialization || 'تخصصه'}.`
      : `${teacher?.name || 'This instructor'} provides structured lessons and clear student support in ${teacher?.specialization || 'their field'}.`);

  return (
    <StudentLayout>
      {/* ── Error ── */}
      {error ? (
        <div
          className="mb-5 rounded-[1.5rem] px-5 py-4 text-sm"
          style={{ background: T.errorBg, border: `1px solid ${T.errorBorder}`, color: T.errorText }}
        >
          {error}
        </div>
      ) : null}

      {/* ── Back ── */}
      <div className="mx-auto mb-5 w-full max-w-4xl">
        <Link
          to="/teachers"
          className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition"
          style={{
            border: `1px solid ${T.border}`,
            background: T.card,
            color: T.sub,
          }}
        >
          <ArrowLeft size={16} /> {t.student.teachers.back}
        </Link>
      </div>

      {loading ? (
        <div className="space-y-6">
          <div className="ln-skeleton mx-auto h-[30rem] w-full max-w-4xl rounded-[2rem]" />
        </div>
      ) : teacher ? (
        <section
          className="relative mx-auto w-full max-w-4xl overflow-hidden rounded-[1.9rem] p-8 shadow-xl shadow-indigo-500/8 backdrop-blur-xl"
          style={{ border: `1px solid ${T.border}`, background: T.card }}
        >
          {/* Glow blobs */}
          <div className="pointer-events-none absolute -left-20 top-16 h-64 w-64 rounded-full blur-3xl" style={{ background: T.glow1 }} />
          <div className="pointer-events-none absolute right-10 top-8 h-28 w-28 rounded-full blur-2xl" style={{ background: T.glow2 }} />

          {/* ── Header: avatar + name ── */}
          <div className={`relative flex items-center gap-5 ${isArabic ? 'flex-row-reverse text-right' : ''}`}>
            <div
              className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl shadow-md shadow-indigo-500/10"
              style={{ border: `2px solid ${T.avatarBorder}`, background: T.avatarBg }}
            >
              <div className="flex h-full w-full items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #7c5ce0, #9c6ff0)' }}>
                <UserCircle2 size={56} color="rgba(255,255,255,0.9)" strokeWidth={1.5} />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-3xl font-black" style={{ color: T.text }}>{teacher.name}</h1>
                <span
                  className="inline-flex items-center rounded-full px-3 py-1 text-xs font-bold"
                  style={{ background: T.badgeBg, color: T.badgeText }}
                >
                  {dynamicSubjectCount} {isArabic ? 'مواد' : 'Subjects'}
                </span>
              </div>
              <p className="mt-1 text-sm font-semibold" style={{ color: T.accent }}>
                {teacher.specialization || teacher.work || (isArabic ? 'مدرس' : 'Teacher')}
              </p>
            </div>
          </div>


          {/* ── Info rows ── */}
          <div className="mt-4 space-y-3">
            <InfoRow T={T} label={t.student.teachers.contact} value={teacher.email || (isArabic ? 'لا يوجد بريد إلكتروني' : 'No email available')} icon={Mail} />
            <InfoRow T={T} label={t.student.teachers.bio} value={teacherDescription} icon={UserRound} />
            <InfoRow T={T} label={t.student.teachers.since} value={formatDate(teacher.createdAt, isArabic)} icon={BookOpen} />
          </div>
        </section>
      ) : (
        <div
          className="rounded-[1.75rem] px-6 py-12 text-center shadow-lg shadow-indigo-500/5"
          style={{ border: `1.5px dashed ${T.emptyBorder}`, background: T.card }}
        >
          <div
            className="mx-auto flex h-16 w-16 items-center justify-center rounded-full"
            style={{ background: T.emptyIcon, color: T.emptyIconTx }}
          >
            <GraduationCap size={28} />
          </div>
          <p className="mt-4 text-lg font-bold" style={{ color: T.text }}>
            {isArabic ? 'لم يتم العثور على المدرس' : 'Teacher not found'}
          </p>
          <p className="mt-2 text-sm leading-7" style={{ color: T.sub }}>
            {isArabic ? 'تأكد من الرابط أو ارجع إلى قائمة المدرسين.' : 'Check the URL or return to the teachers list.'}
          </p>
          <Link
            to="/teachers"
            className="mt-5 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
            style={{ background: 'linear-gradient(135deg,#6366f1,#818cf8)' }}
          >
            <ArrowLeft size={16} /> {t.student.teachers.back}
          </Link>
        </div>
      )}
    </StudentLayout>
  );
}

function InfoRow({ T, label, value, icon: Icon }) {
  return (
    <div
      className="rounded-2xl p-4"
      style={{ border: `1px solid ${T.rowBorder}`, background: T.rowBg }}
    >
      <div className="mb-2 flex items-center gap-2" style={{ color: T.muted }}>
        <Icon size={14} />
        <p className="text-[10px] font-bold uppercase tracking-[0.22em]">{label}</p>
      </div>
      <p className="text-sm leading-7" style={{ color: T.text }}>{String(value)}</p>
    </div>
  );
}
