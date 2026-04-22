import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Search, Users2, BadgeCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import StudentLayout from '../../components/student/StudentLayout';
import { fetchStudentTeachers } from '../../services/studentService';
import { useLanguage } from '../../utils/i18n';

const PEOPLE_FALLBACK_AVATARS = [
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=500&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=500&q=80',
  'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=500&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=500&q=80',
  'https://images.unsplash.com/photo-1542206395-9feb3edaa68d?auto=format&fit=crop&w=500&q=80',
  'https://images.unsplash.com/photo-1541534401786-2077eed87a72?auto=format&fit=crop&w=500&q=80',
  'https://images.unsplash.com/photo-1546961329-78bef0414d7c?auto=format&fit=crop&w=500&q=80',
  'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=500&q=80',
];

const getTeacherAvatarUrl = (teacher = {}, index = 0) => {
  if (teacher.avatarUrl) {
    return teacher.avatarUrl;
  }
  return PEOPLE_FALLBACK_AVATARS[index % PEOPLE_FALLBACK_AVATARS.length];
};

const getTeacherSubjects = (teacher = {}) => (Array.isArray(teacher.subjects) ? teacher.subjects : [])
  .filter(Boolean)
  .slice(0, 3);

const teacherSearchText = (teacher = {}) => [teacher.name, teacher.specialization, teacher.work, teacher.bio, teacher.email, ...(Array.isArray(teacher.subjects) ? teacher.subjects : [])]
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
    <StudentLayout>
      <div className="mb-4">
        <Link to="/dashboard/student" className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold backdrop-blur transition hover:border-white/40 hover:bg-white/20">
          <ArrowLeft size={16} /> {isArabic ? 'عودة' : 'Back'}
        </Link>
      </div>

      {error ? (
        <div className="mb-5 rounded-[1.5rem] border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
          {error}
        </div>
      ) : null}

      <section className="rounded-[1.6rem] border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-bold text-slate-700">
            {isArabic ? 'قائمة المعلمين' : 'Teachers list'}
          </p>
          <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
            {teachers.length} {isArabic ? 'معلم' : 'Teachers'} • {totalSubjects} {t.student.teachers.subjects}
          </span>
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
        <div className="mt-6 space-y-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-[7.5rem] animate-pulse rounded-[1.25rem] border border-white/70 bg-white/85 shadow-xl shadow-indigo-500/5" />
          ))}
        </div>
      ) : filteredTeachers.length ? (
        <div className="mt-6 space-y-4">
          {filteredTeachers.map((teacher, index) => {
            const avatarUrl = getTeacherAvatarUrl(teacher, index);
            const subjectNames = getTeacherSubjects(teacher);

            return (
              <Link
                key={teacher.id}
                to={`/teachers/${teacher.id}`}
                className="block"
              >
                <motion.article
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden rounded-[1.25rem] border border-white/70 bg-white/95 shadow-lg shadow-indigo-500/5 backdrop-blur-xl transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-500/10"
                >
                  <div className={`grid items-center gap-4 p-4 sm:p-5 md:grid-cols-[88px_1fr] ${isArabic ? 'md:[direction:rtl]' : ''}`}>
                    <div className="mx-auto h-[88px] w-[88px] shrink-0 overflow-hidden rounded-2xl border border-white/80 bg-slate-100 shadow-sm shadow-indigo-500/10">
                      <img src={avatarUrl} alt={teacher.name} className="h-full w-full object-cover" />
                    </div>

                    <div className="min-w-0">
                      <h2 className="text-lg font-black text-slate-900">{teacher.name}</h2>
                      <p className="mt-1 text-sm font-semibold text-indigo-600">{teacher.specialization || teacher.work || (isArabic ? 'مدرس' : 'Teacher')}</p>
                      <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700">
                        <BadgeCheck size={12} /> {teacher.subjectCount || 0} {t.student.teachers.subjects}
                      </div>

                      {subjectNames.length ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {subjectNames.map((subjectName) => (
                            <span key={subjectName} className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
                              {subjectName}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>

                  </div>
                </motion.article>
              </Link>
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
