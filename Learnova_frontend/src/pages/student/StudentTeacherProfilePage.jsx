import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, Mail, UserRound } from 'lucide-react';
import StudentLayout from '../../components/student/StudentLayout';
import { fetchStudentTeacherById } from '../../services/studentService';
import { useLanguage } from '../../utils/i18n';

const getInitials = (name = '') => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'L';
  return parts.slice(0, 2).map((part) => part.charAt(0)).join('').toUpperCase();
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

  const initials = getInitials(teacher?.name);

  return (
    <StudentLayout
      title={t.student.teachers.title}
      subtitle={teacher?.name || (isArabic ? 'ملف المدرس' : 'Teacher profile')}
      actions={
        <Link to="/teachers" className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
          <ArrowLeft size={16} /> {t.student.teachers.back}
        </Link>
      }
    >
      {error ? <div className="mb-5 rounded-[1.5rem] border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">{error}</div> : null}

      {loading ? (
        <div className="space-y-6">
          <div className="h-[18rem] animate-pulse rounded-[2rem] border border-white/70 bg-white/85 shadow-xl shadow-indigo-500/5" />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-32 animate-pulse rounded-[1.75rem] border border-white/70 bg-white/85 shadow-xl shadow-indigo-500/5" />
            ))}
          </div>
        </div>
      ) : teacher ? (
        <div className="space-y-6">
          <section className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/90 shadow-2xl shadow-indigo-500/5 backdrop-blur-xl">
            <div className="grid gap-0 lg:grid-cols-[1fr_0.9fr]">
              <div className="relative min-h-[18rem] overflow-hidden bg-gradient-to-br from-indigo-600 via-slate-900 to-cyan-600 p-6 text-white">
                <div className={`flex h-full flex-col justify-between gap-6 ${isArabic ? 'text-right' : 'text-left'}`}>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.25em] text-blue-100">{isArabic ? 'ملف المدرس' : 'Teacher profile'}</p>
                    <h1 className="mt-3 text-3xl font-black md:text-4xl">{teacher.name}</h1>
                    <p className="mt-3 max-w-2xl text-sm leading-7 text-blue-50/90">
                      {teacher.bio || (isArabic ? 'تعرف على نبذة المدرس ومجالاته التعليمية.' : 'Learn more about the instructor and the subjects they teach.')}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3 text-sm font-semibold">
                    <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2 backdrop-blur">{teacher.specialization || (isArabic ? 'مدرس' : 'Teacher')}</span>
                    <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2 backdrop-blur">{teacher.subjectCount || 0} {t.student.teachers.subjects}</span>
                    <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2 backdrop-blur">{t.student.teachers.since} {formatDate(teacher.createdAt, isArabic)}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col justify-between gap-5 p-6 md:p-7">
                <div className={`flex items-start gap-4 ${isArabic ? 'flex-row-reverse text-right' : ''}`}>
                  <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-indigo-600 via-sky-500 to-cyan-400 text-2xl font-black text-white shadow-lg shadow-indigo-500/20">
                    {teacher.avatarUrl ? <img src={teacher.avatarUrl} alt={teacher.name} className="h-full w-full object-cover" /> : initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-2xl font-black text-slate-900">{teacher.name}</h2>
                    <p className="mt-1 text-sm font-semibold text-indigo-600">{teacher.specialization || teacher.work || (isArabic ? 'مدرس' : 'Teacher')}</p>
                    <p className="mt-3 text-sm leading-7 text-slate-600">
                      {teacher.bio || (isArabic ? 'لا توجد نبذة مضافة بعد.' : 'No bio has been added yet.')}
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <ProfileStat label={t.student.teachers.subjects} value={teacher.subjectCount || 0} icon={BookOpen} />
                  <ProfileStat label={t.student.teachers.contact} value={teacher.email ? 1 : 0} icon={Mail} />
                  <ProfileStat label={isArabic ? 'المعرف' : 'Profile ID'} value={teacher.id} icon={UserRound} />
                </div>
              </div>
            </div>
          </section>

          <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <section className="rounded-[1.75rem] border border-white/70 bg-white/85 p-5 shadow-xl shadow-indigo-500/5 backdrop-blur-xl md:p-6">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-indigo-600">{isArabic ? 'التفاصيل الأساسية' : 'Core details'}</p>
              <div className="mt-4 space-y-4">
                <InfoRow label={t.student.teachers.bio} value={teacher.bio || (isArabic ? 'لا توجد نبذة.' : 'No bio available.')} />
                <InfoRow label={t.student.teachers.subjects} value={teacher.subjectCount || 0} />
                <InfoRow label={isArabic ? 'العمل' : 'Work'} value={teacher.work || (isArabic ? 'غير متوفر' : 'Not available')} />
                <InfoRow label={isArabic ? 'العمر' : 'Age'} value={teacher.age || (isArabic ? 'غير متوفر' : 'Not available')} />
                <InfoRow label={isArabic ? 'العنوان' : 'Address'} value={teacher.address || (isArabic ? 'غير متوفر' : 'Not available')} />
              </div>
            </section>

            <section className="rounded-[1.75rem] border border-white/70 bg-gradient-to-br from-slate-900 to-indigo-950 p-5 text-white shadow-xl shadow-indigo-500/10 md:p-6">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-blue-100">{isArabic ? 'التواصل' : 'Contact'}</p>
              <div className="mt-4 space-y-4 text-sm leading-7 text-slate-200">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-blue-100">{t.student.teachers.contact}</p>
                  <p className="mt-2 font-semibold text-white">{teacher.email || (isArabic ? 'لا يوجد بريد إلكتروني' : 'No email available')}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-blue-100">{isArabic ? 'موقع العمل' : 'Location'}</p>
                  <p className="mt-2 font-semibold text-white">{teacher.work || (isArabic ? 'غير متوفر' : 'Not available')}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-blue-100">{isArabic ? 'ملاحظة' : 'Note'}</p>
                  <p className="mt-2 text-slate-200">
                    {isArabic
                      ? 'هذه الصفحة تعتمد على البيانات الحقيقية القادمة من قاعدة البيانات، لذلك أي تعديل على ملف المدرس يظهر هنا مباشرة.'
                      : 'This page is driven by real database data, so any teacher update appears here immediately.'}
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>
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

function ProfileStat({ label, value, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">{label}</p>
          <p className="mt-1 text-xl font-black text-slate-900">{value}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm">
          <Icon size={18} />
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm leading-7 text-slate-800">{String(value)}</p>
    </div>
  );
}
