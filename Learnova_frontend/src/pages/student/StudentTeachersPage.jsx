import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Search, Users2, BadgeCheck, GraduationCap, BookOpen, UserCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import StudentLayout from '../../components/student/StudentLayout';
import { fetchStudentTeachers } from '../../services/studentService';
import { useLanguage } from '../../utils/i18n';
import { useTheme } from '../../contexts/ThemeContext';


const getTeacherSubjects = (teacher = {}) => [...new Set(
  (Array.isArray(teacher.subjects) ? teacher.subjects : []).filter(Boolean)
)].slice(0, 3);

const teacherSearchText = (teacher = {}) => [teacher.name, teacher.specialization, teacher.work, teacher.bio, teacher.email, ...(Array.isArray(teacher.subjects) ? teacher.subjects : [])]
  .filter(Boolean)
  .join(' ')
  .toLowerCase();

export default function StudentTeachersPage() {
  const { t, isArabic } = useLanguage();
  const { isDark } = useTheme();
  const T = {
    card:        isDark ? '#111029'                : 'rgba(255,255,255,0.95)',
    tabWrap:     isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.85)',
    border:      isDark ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,0.7)',
    inputBorder: isDark ? 'rgba(255,255,255,0.09)' : '#e2e8f0',
    inputBg:     isDark ? 'rgba(255,255,255,0.04)' : '#ffffff',
    avatarBg:    isDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9',
    text:        isDark ? '#f1f0f5'                : '#0f172a',
    sub:         isDark ? 'rgba(255,255,255,0.5)'  : '#475569',
    muted:       isDark ? 'rgba(255,255,255,0.32)' : '#64748b',
    accent:      isDark ? '#818cf8'                : '#4f46e5',
    tagBg:       isDark ? 'rgba(255,255,255,0.07)' : '#f1f5f9',
    tagText:     isDark ? 'rgba(255,255,255,0.55)' : '#475569',
    badgeBg:     isDark ? 'rgba(52,211,153,0.12)'  : '#ecfdf5',
    badgeText:   isDark ? '#34d399'                : '#065f46',
    emptyBorder: isDark ? 'rgba(255,255,255,0.12)' : '#cbd5e1',
    emptyIcon:   isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9',
    emptyIconTx: isDark ? 'rgba(255,255,255,0.3)'  : '#94a3b8',
    errorBg:     isDark ? 'rgba(251,191,36,0.08)'  : '#fffbeb',
    errorBorder: isDark ? 'rgba(251,191,36,0.25)'  : '#fde68a',
    errorText:   isDark ? '#fbbf24'                : '#92400e',
  };
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
      {/* ── Hero banner ── */}
      <section
        className="rounded-[2rem] bg-gradient-to-r from-violet-700 via-slate-900 to-indigo-700 p-6 text-white shadow-xl shadow-indigo-500/15"
        style={{ border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.7)'}` }}
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 backdrop-blur">
                <GraduationCap size={26} className="text-violet-200" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-violet-200">
                  {isArabic ? 'فريق التدريس' : 'Teaching staff'}
                </p>
                <h1 className="mt-1 text-2xl font-black md:text-3xl">
                  {isArabic ? 'المعلمون' : 'Instructors'}
                </h1>
                <p className="mt-1 text-sm text-white/70">
                  {isArabic
                    ? 'تعرّف على كادر التدريس وتصفح موادهم.'
                    : 'Meet the teaching staff and explore their subjects.'}
                </p>
              </div>
            </div>
            <Link
              to="/dashboard/student"
              className="inline-flex shrink-0 items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold backdrop-blur transition hover:border-white/40 hover:bg-white/20"
            >
              <ArrowLeft size={16} /> {isArabic ? 'عودة' : 'Back'}
            </Link>
          </div>

          {/* Stats strip */}
          <div className="flex flex-wrap gap-3">
            <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm backdrop-blur">
              <Users2 className="mr-2 inline-block" size={15} />
              <span className="font-bold">{teachers.length}</span>{' '}
              {isArabic ? 'معلم' : 'instructors'}
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm backdrop-blur">
              <BookOpen className="mr-2 inline-block" size={15} />
              <span className="font-bold">{totalSubjects}</span>{' '}
              {isArabic ? 'مادة' : 'subjects'}
            </div>
          </div>
        </div>
      </section>

      {/* ── Error ── */}
      {error ? (
        <div
          className="mt-5 rounded-[1.5rem] px-5 py-4 text-sm"
          style={{ background: T.errorBg, border: `1px solid ${T.errorBorder}`, color: T.errorText }}
        >
          {error}
        </div>
      ) : null}

      {/* ── Search ── */}
      <div
        className="mt-5 rounded-[1.75rem] p-4 shadow-lg shadow-indigo-500/5 backdrop-blur-xl"
        style={{ border: `1px solid ${T.border}`, background: T.tabWrap }}
      >
        <label
          className="flex items-center gap-3 rounded-2xl px-4 py-3"
          style={{ border: `1px solid ${T.inputBorder}`, background: T.inputBg }}
        >
          <Search size={16} style={{ color: T.muted }} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t.student.teachers.searchPlaceholder}
            className="w-full bg-transparent text-sm outline-none"
            style={{ color: T.text }}
          />
        </label>
      </div>

      {/* ── List ── */}
      {loading ? (
        <div className="mt-6 space-y-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="ln-skeleton h-[7.5rem] rounded-[1.25rem]" />
          ))}
        </div>
      ) : filteredTeachers.length ? (
        <div className="mt-6 space-y-4">
          {filteredTeachers.map((teacher, index) => {
            const subjectNames = getTeacherSubjects(teacher);

            return (
              <Link key={teacher.id} to={`/teachers/${teacher.id}`} className="block">
                <motion.article
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden rounded-[1.25rem] shadow-lg shadow-indigo-500/5 backdrop-blur-xl transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-500/10"
                  style={{ border: `1px solid ${T.border}`, background: T.card }}
                >
                  <div className={`grid items-center gap-4 p-4 sm:p-5 md:grid-cols-[88px_1fr] ${isArabic ? 'md:[direction:rtl]' : ''}`}>
                    <div
                      className="mx-auto h-[88px] w-[88px] shrink-0 overflow-hidden rounded-2xl shadow-sm shadow-indigo-500/10"
                      style={{ border: `1px solid ${T.border}`, background: T.avatarBg }}
                    >
                      <div className="flex h-full w-full items-center justify-center"
                        style={{ background: 'linear-gradient(135deg, #7c5ce0, #9c6ff0)' }}>
                        <UserCircle2 size={48} color="rgba(255,255,255,0.9)" strokeWidth={1.5} />
                      </div>
                    </div>

                    <div className="min-w-0">
                      <h2 className="text-lg font-black" style={{ color: T.text }}>{teacher.name}</h2>
                      <p className="mt-1 text-sm font-semibold" style={{ color: T.accent }}>
                        {teacher.specialization || teacher.work || (isArabic ? 'مدرس' : 'Teacher')}
                      </p>
                      <div
                        className="mt-2 inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-bold"
                        style={{ background: T.badgeBg, color: T.badgeText }}
                      >
                        <BadgeCheck size={12} /> {teacher.subjectCount || 0} {t.student.teachers.subjects}
                      </div>

                    </div>
                  </div>
                </motion.article>
              </Link>
            );
          })}
        </div>
      ) : (
        <div
          className="mt-6 rounded-[1.75rem] px-6 py-12 text-center shadow-lg shadow-indigo-500/5"
          style={{ border: `1.5px dashed ${T.emptyBorder}`, background: T.card }}
        >
          <div
            className="mx-auto flex h-16 w-16 items-center justify-center rounded-full"
            style={{ background: T.emptyIcon, color: T.emptyIconTx }}
          >
            <Users2 size={28} />
          </div>
          <p className="mt-4 text-lg font-bold" style={{ color: T.text }}>{t.student.teachers.empty}</p>
          <p className="mt-2 text-sm leading-7" style={{ color: T.sub }}>
            {isArabic
              ? 'جرّب تعديل البحث أو العودة لاحقًا عندما تتم إضافة مدرسين للأكاديمية.'
              : 'Try a different search or check back later when instructors are added.'}
          </p>
        </div>
      )}
    </StudentLayout>
  );
}
