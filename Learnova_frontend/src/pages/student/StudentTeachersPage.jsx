import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, BookOpen, Search, Sparkles, Users2, Mail, BadgeCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import StudentLayout from '../../components/student/StudentLayout';
import { fetchStudentTeachers } from '../../services/studentService';
import { useLanguage } from '../../utils/i18n';

const getInitials = (name = '') => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'L';
  return parts.slice(0, 2).map((part) => part.charAt(0)).join('').toUpperCase();
};

const teacherSearchText = (teacher = {}) => [teacher.name, teacher.specialization, teacher.work, teacher.bio, teacher.email]
  .filter(Boolean)
  .join(' ')
  .toLowerCase();

export default function StudentTeachersPage() {
  const { t, isArabic } = useLanguage();
  const [teachers, setTeachers] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        const data = await fetchStudentTeachers();
        if (!cancelled) {
          setTeachers(Array.isArray(data) ? data : []);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError?.message || (isArabic ? 'فشل تحميل قائمة المدرسين.' : 'Failed to load teachers.'));
          setTeachers([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [isArabic]);

  const filteredTeachers = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return teachers;
    return (teachers || []).filter((teacher) => teacherSearchText(teacher).includes(needle));
  }, [teachers, query]);

  const totalSubjects = useMemo(
    () => filteredTeachers.reduce((sum, teacher) => sum + Number(teacher?.subjectCount || 0), 0),
    [filteredTeachers],
  );

  return (
    <StudentLayout
      title={t.student.teachers.title}
      subtitle={t.student.teachers.subtitle}
      actions={
        <Link to="/dashboard/student" className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
          <ArrowLeft size={16} /> {isArabic ? 'لوحة الطالب' : 'Dashboard'}
        </Link>
      }
    >
      {error ? (
        <div className="mb-5 rounded-[1.5rem] border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
          {error}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-[2rem] border border-white/70 bg-gradient-to-r from-indigo-600 via-slate-900 to-cyan-600 p-6 text-white shadow-2xl shadow-indigo-500/15">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-blue-100">{isArabic ? 'دليل المدرسين' : 'Teacher directory'}</p>
            <h1 className="mt-2 text-2xl font-black md:text-3xl">{isArabic ? 'مدرسين الأكاديمية بين يديك' : 'Meet the people teaching your courses'}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-blue-50/90">
              {isArabic
                ? 'تصفح المدرسين، ابحث بالاسم، وافتح الملف الشخصي بسرعة.'
                : 'Browse the instructors, search by name, and open a profile in one tap.'}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-blue-100">{isArabic ? 'إجمالي المدرسين' : 'Teachers'}</p>
              <p className="mt-1 text-2xl font-black">{teachers.length}</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-blue-100">{isArabic ? 'إجمالي المواد' : 'Subjects'}</p>
              <p className="mt-1 text-2xl font-black">{totalSubjects}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-5 rounded-[1.75rem] border border-white/70 bg-white/85 p-4 shadow-lg shadow-indigo-500/5 backdrop-blur-xl">
        <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <Search size={16} className="text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t.student.teachers.searchPlaceholder}
            className="w-full bg-transparent text-sm outline-none"
          />
        </label>
      </div>

      {loading ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-[10.5rem] animate-pulse rounded-[1.75rem] border border-white/70 bg-white/85 shadow-xl shadow-indigo-500/5" />
          ))}
        </div>
      ) : filteredTeachers.length ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {filteredTeachers.map((teacher) => {
            const initials = getInitials(teacher.name);
            const isWide = Boolean(isArabic);

            return (
              <motion.article
                key={teacher.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden rounded-[1.75rem] border border-white/70 bg-white/90 shadow-xl shadow-indigo-500/5 backdrop-blur-xl"
              >
                <div className={`flex gap-4 p-4 sm:p-5 ${isWide ? 'flex-row-reverse text-right' : 'flex-row text-left'}`}>
                  <div className="shrink-0">
                    <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-indigo-600 via-sky-500 to-cyan-400 text-2xl font-black text-white shadow-lg shadow-indigo-500/20">
                      {teacher.avatarUrl ? (
                        <img src={teacher.avatarUrl} alt={teacher.name} className="h-full w-full object-cover" />
                      ) : (
                        initials
                      )}
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className={`flex flex-wrap items-start justify-between gap-3 ${isArabic ? 'flex-row-reverse' : ''}`}>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-lg font-black text-slate-900">{teacher.name}</h2>
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700">
                            <BadgeCheck size={12} /> {teacher.subjectCount || 0} {t.student.teachers.subjects}
                          </span>
                        </div>
                        <p className="mt-1 text-sm font-semibold text-indigo-600">{teacher.specialization || teacher.work || (isArabic ? 'مدرس' : 'Teacher')}</p>
                      </div>

                      <Link
                        to={`/teachers/${teacher.id}`}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-indigo-200 hover:text-indigo-700 hover:shadow-sm"
                      >
                        {t.student.teachers.profile}
                        <ArrowLeft size={16} className={isArabic ? 'rotate-180' : ''} />
                      </Link>
                    </div>

                    <p className="mt-3 line-clamp-2 text-sm leading-7 text-slate-600">
                      {teacher.bio || (isArabic ? 'نبذة قصيرة عن المدرس ستظهر هنا.' : 'A short instructor bio will appear here.')}
                    </p>

                    <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-500">
                      {teacher.email ? (
                        <span className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1.5">
                          <Mail size={12} /> {teacher.email}
                        </span>
                      ) : null}
                      <span className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1.5 text-indigo-700">
                        <BookOpen size={12} /> {teacher.subjectCount || 0} {t.student.teachers.subjects}
                      </span>
                      {teacher.work ? (
                        <span className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1.5">
                          <Sparkles size={12} /> {teacher.work}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      ) : (
        <div className="mt-6 rounded-[1.75rem] border border-dashed border-slate-300 bg-white px-6 py-12 text-center shadow-lg shadow-indigo-500/5">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <Users2 size={28} />
          </div>
          <p className="mt-4 text-lg font-bold text-slate-900">{t.student.teachers.empty}</p>
          <p className="mt-2 text-sm leading-7 text-slate-500">
            {isArabic
              ? 'جرّب تعديل البحث أو العودة لاحقًا عندما تتم إضافة مدرسين للأكاديمية.'
              : 'Try a different search or check back later when instructors are added.'}
          </p>
        </div>
      )}
    </StudentLayout>
  );
}
