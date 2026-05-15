import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, Mail, UserRound } from 'lucide-react';
import StudentLayout from '../../components/student/StudentLayout';
import { fetchStudentTeacherById } from '../../services/studentService';
import { useLanguage } from '../../utils/i18n';

const PEOPLE_FALLBACK_AVATARS = [
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=500&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=500&q=80',
  'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=500&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=500&q=80',
  'https://images.unsplash.com/photo-1542206395-9feb3edaa68d?auto=format&fit=crop&w=500&q=80',
  'https://images.unsplash.com/photo-1541534401786-2077eed87a72?auto=format&fit=crop&w=500&q=80',
];

const getTeacherAvatarUrl = (teacher = {}) => {
  if (teacher.avatarUrl) {
    return teacher.avatarUrl;
  }

  const seed = Number(teacher.id || 0) % PEOPLE_FALLBACK_AVATARS.length;
  return PEOPLE_FALLBACK_AVATARS[seed];
};

const formatDate = (value, isArabic) => {
  if (!value) return isArabic ? 'غير متوفر' : 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return isArabic ? 'غير متوفر' : 'Not available';
  return new Intl.DateTimeFormat(isArabic ? 'ar-JO' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
};

export default function StudentTeacherProfilePage() {
  const { t, isArabic } = useLanguage();
  const { teacherId } = useParams();
  const numericTeacherId = Number(teacherId);
  const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [numericTeacherId]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        const data = await fetchStudentTeacherById(numericTeacherId);
        if (!cancelled) {
          setTeacher(data);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError?.message || (isArabic ? 'فشل تحميل ملف المدرس.' : 'Failed to load teacher profile.'));
          setTeacher(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    if (Number.isFinite(numericTeacherId)) {
      load();
    }

    return () => {
      cancelled = true;
    };
  }, [isArabic, numericTeacherId]);

  const avatarUrl = getTeacherAvatarUrl(teacher || {});
  const subjectNames = Array.isArray(teacher?.subjects) ? teacher.subjects.filter(Boolean) : [];
  const dynamicSubjectCount = subjectNames.length || Number(teacher?.subjectCount || 0);
  const teacherDescription = teacher?.bio
    || (isArabic
      ? `${teacher?.name || 'هذا المعلم'} يقدم شرحًا منظمًا ومتابعة واضحة للطلاب في ${teacher?.specialization || 'تخصصه'}.`
      : `${teacher?.name || 'This instructor'} provides structured lessons and clear student support in ${teacher?.specialization || 'their field'}.`);

  return (
    <StudentLayout>
      {error ? <div className="mb-5 rounded-[1.5rem] border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">{error}</div> : null}

      <div className="mx-auto mb-4 w-full max-w-4xl">
        <Link to="/teachers" className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
          <ArrowLeft size={16} /> {t.student.teachers.back}
        </Link>
      </div>

      {loading ? (
        <div className="space-y-6">
          <div className="ln-skeleton mx-auto h-[30rem] w-full max-w-4xl rounded-[2rem]" />
        </div>
      ) : teacher ? (
        <section className="relative mx-auto w-full max-w-4xl overflow-hidden rounded-[1.9rem] border border-white/70 bg-white/95 p-8 shadow-xl shadow-indigo-500/5 backdrop-blur-xl">
          <div className="pointer-events-none absolute -left-20 top-16 h-64 w-64 rounded-full bg-gradient-to-br from-indigo-200/50 to-cyan-200/10 blur-3xl" />
          <div className="pointer-events-none absolute right-10 top-8 h-28 w-28 rounded-full bg-emerald-100/35 blur-2xl" />

          <div className={`flex items-center gap-4 ${isArabic ? 'flex-row-reverse text-right' : ''}`}>
            <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
              <img src={avatarUrl} alt={teacher.name} className="h-full w-full object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-3xl font-black text-slate-900">{teacher.name}</h1>
                <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                  {dynamicSubjectCount} {isArabic ? 'مواد' : 'Subjects'}
                </span>
              </div>
              <p className="mt-1 text-sm font-semibold text-indigo-600">{teacher.specialization || teacher.work || (isArabic ? 'مدرس' : 'Teacher')}</p>
            </div>
          </div>

          <section className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">
              {isArabic ? 'المواد التي يدرّسها' : 'Subjects Taught'}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {subjectNames.length ? subjectNames.map((subjectName) => (
                <span key={subjectName} className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                  {subjectName}
                </span>
              )) : (
                <span className="text-sm text-slate-500">
                  {isArabic ? 'لا توجد مواد مرتبطة بهذا المعلم حالياً.' : 'No subjects linked to this teacher yet.'}
                </span>
              )}
            </div>
          </section>

          <div className="mt-6 space-y-3">
            <InfoRow label={t.student.teachers.contact} value={teacher.email || (isArabic ? 'لا يوجد بريد إلكتروني' : 'No email available')} icon={Mail} />
            <InfoRow label={t.student.teachers.bio} value={teacherDescription} icon={UserRound} />
            <InfoRow label={t.student.teachers.since} value={formatDate(teacher.createdAt, isArabic)} icon={BookOpen} />
          </div>
        </section>
      ) : (
        <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-white px-6 py-12 text-center shadow-lg shadow-indigo-500/5">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <UserRound size={28} />
          </div>
          <p className="mt-4 text-lg font-bold text-slate-900">{isArabic ? 'لم يتم العثور على المدرس' : 'Teacher not found'}</p>
          <p className="mt-2 text-sm leading-7 text-slate-500">
            {isArabic ? 'تأكد من الرابط أو ارجع إلى قائمة المدرسين.' : 'Check the URL or return to the teachers list.'}
          </p>
          <Link to="/teachers" className="mt-5 inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700">
            <ArrowLeft size={16} /> {t.student.teachers.back}
          </Link>
        </div>
      )}
    </StudentLayout>
  );
}

function InfoRow({ label, value, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="mb-2 flex items-center gap-2 text-slate-500">
        <Icon size={14} />
        <p className="text-[10px] font-bold uppercase tracking-[0.22em]">{label}</p>
      </div>
      <p className="text-sm leading-7 text-slate-800">{String(value)}</p>
    </div>
  );
}
