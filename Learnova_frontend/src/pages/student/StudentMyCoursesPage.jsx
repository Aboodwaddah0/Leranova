import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, Search } from 'lucide-react';
import StudentLayout from '../../components/student/StudentLayout';
import {
  fetchAcademySubscriptions,
  fetchAcademyTrackSubjects,
  fetchStudentContext,
  fetchSubjectLessons,
} from '../../services/studentService';
import { useLanguage } from '../../utils/i18n';
import { calculateProgressForLessons, subscribeToProgress } from '../../utils/studentProgress';
import { useTheme } from '../../contexts/ThemeContext';

export default function StudentMyCoursesPage() {
  const { isArabic } = useLanguage();
  const { isDark } = useTheme();
  const T = {
    card:        isDark ? '#111029'                : 'rgba(255,255,255,0.9)',
    tabWrap:     isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.85)',
    border:      isDark ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,0.7)',
    inputBorder: isDark ? 'rgba(255,255,255,0.09)' : '#e2e8f0',
    inputBg:     isDark ? 'rgba(255,255,255,0.04)' : '#ffffff',
    imgBg:       isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9',
    progressBg:  isDark ? 'rgba(255,255,255,0.1)'  : '#e2e8f0',
    text:        isDark ? '#f1f0f5'                : '#0f172a',
    sub:         isDark ? 'rgba(255,255,255,0.5)'  : '#475569',
    muted:       isDark ? 'rgba(255,255,255,0.32)' : '#64748b',
    accent:      isDark ? '#818cf8'                : '#4f46e5',
    done:        isDark ? '#34d399'                : '#047857',
    emptyBorder: isDark ? 'rgba(255,255,255,0.12)' : '#cbd5e1',
  };

  const [context,      setContext]      = useState(null);
  const [myCourses,    setMyCourses]    = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [query,        setQuery]        = useState('');
  const [progressTick, setProgressTick] = useState(0);

  useEffect(() => subscribeToProgress(() => setProgressTick((v) => v + 1)), []);

  const loadMyCourses = async () => {
    const subscriptions = await fetchAcademySubscriptions();
    const cards = await Promise.all(
      (Array.isArray(subscriptions) ? subscriptions : []).map(async (sub) => {
        const subjectId = Number(sub.subjectId || 0);
        const trackId   = Number(sub.trackId   || 0);
        if (!subjectId || !trackId) return null;

        const [lessons, trackDetails] = await Promise.all([
          fetchSubjectLessons(subjectId),
          fetchAcademyTrackSubjects(trackId),
        ]);

        const lessonItems = Array.isArray(lessons) ? lessons : [];
        const lessonIds   = lessonItems
          .map((l) => Number(l?.id))
          .filter((id) => Number.isInteger(id) && id > 0);

        const backendCompleted = lessonItems.filter((l) => Boolean(l?.isCompleted)).length;
        const progress = lessonItems.some((l) => Object.prototype.hasOwnProperty.call(l || {}, 'isCompleted'))
          ? {
              total:     lessonIds.length,
              completed: backendCompleted,
              percent:   lessonIds.length ? Math.round((backendCompleted / lessonIds.length) * 100) : 0,
            }
          : calculateProgressForLessons(lessonIds);

        const subjectMeta = (trackDetails?.subjects || []).find((s) => Number(s.id) === subjectId) || null;

        return {
          subjectId,
          subjectName: sub.subjectName || subjectMeta?.name || (isArabic ? 'مادة' : 'Subject'),
          trackId,
          trackName:   sub.trackName  || trackDetails?.track?.name || (isArabic ? 'تخصص' : 'Specialization'),
          imageUrl:    subjectMeta?.imageUrl || trackDetails?.track?.thumbnail || '',
          lessonTotal: progress.total,
          lessonDone:  progress.completed,
          percent:     progress.percent,
        };
      }),
    );
    return cards.filter(Boolean);
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const ctx = await fetchStudentContext();
      if (cancelled) return;
      setContext(ctx);
      if (ctx?.mode === 'ACADEMY') {
        const items = await loadMyCourses();
        if (!cancelled) setMyCourses(Array.isArray(items) ? items : []);
      }
      if (!cancelled) setLoading(false);
    };
    load();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isArabic, progressTick]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return myCourses;
    return myCourses.filter((c) =>
      `${c?.subjectName || ''} ${c?.trackName || ''}`.toLowerCase().includes(needle)
    );
  }, [myCourses, query]);

  if (context?.mode === 'SCHOOL') {
    return <Navigate to="/student/subjects" replace />;
  }

  return (
    <StudentLayout>
      {/* ── Hero banner ── */}
      <section
        className="rounded-[2rem] bg-gradient-to-r from-indigo-600 via-slate-900 to-cyan-600 p-6 text-white shadow-xl shadow-indigo-500/15"
        style={{ border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.7)'}` }}
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-blue-100">
                {isArabic ? 'أكاديمية Learnova' : 'Learnova Academy'}
              </p>
              <h1 className="mt-2 text-2xl font-black md:text-3xl">
                {isArabic ? 'كورساتي' : 'My Courses'}
              </h1>
              <p className="mt-2 text-sm text-blue-50/90">
                {isArabic
                  ? 'تابع تقدمك في الكورسات التي اشتركت بها.'
                  : 'Track your progress across all the courses you enrolled in.'}
              </p>
            </div>
            <Link
              to="/dashboard/student"
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold backdrop-blur transition hover:border-white/40 hover:bg-white/20"
            >
              <ArrowLeft size={16} /> {isArabic ? 'عودة' : 'Back'}
            </Link>
          </div>
          <div className="flex gap-3">
            <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm backdrop-blur">
              <BookOpen className="mr-2 inline-block" size={16} />
              {myCourses.length} {isArabic ? 'مادة مشتركة' : 'enrolled courses'}
            </div>
          </div>
        </div>
      </section>

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
            onChange={(e) => setQuery(e.target.value)}
            placeholder={isArabic ? 'ابحث عن كورس...' : 'Search a course...'}
            className="w-full bg-transparent text-sm outline-none"
            style={{ color: T.text }}
          />
        </label>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="ln-skeleton h-48 rounded-[1.75rem]" />
          ))}
        </div>
      ) : filtered.length ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((course) => (
            <article
              key={`${course.trackId}-${course.subjectId}`}
              className="rounded-[1.75rem] p-5 shadow-xl shadow-indigo-500/5"
              style={{ background: T.card }}
            >
              {/* Thumbnail */}
              <div className="mb-3 overflow-hidden rounded-2xl" style={{ background: T.imgBg }}>
                <img
                  src={course.imageUrl || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80'}
                  alt={course.subjectName}
                  className="h-40 w-full object-contain"
                  loading="lazy"
                />
              </div>

              {/* Meta */}
              <p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: T.accent }}>
                {course.trackName}
              </p>
              <h2 className="mt-2 text-lg font-black" style={{ color: T.text }}>{course.subjectName}</h2>

              {/* Progress */}
              <div className="mt-4 space-y-2 text-sm" style={{ color: T.sub }}>
                <div className="flex items-center justify-between">
                  <span>{isArabic ? 'المحاضرات' : 'Lectures'}</span>
                  <span className="font-semibold" style={{ color: T.text }}>{course.lessonTotal}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>{isArabic ? 'المنجز' : 'Completed'}</span>
                  <span className="font-semibold" style={{ color: T.done }}>{course.lessonDone}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full" style={{ background: T.progressBg }}>
                  <div
                    className="ln-progress-fill h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500"
                    style={{ width: `${course.percent}%` }}
                  />
                </div>
                <div className="text-xs font-bold" style={{ color: T.muted }}>{course.percent}%</div>
              </div>

              {/* CTA */}
              <Link
                to={`/courses/${course.trackId}/subjects/${course.subjectId}`}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-indigo-500"
              >
                <BookOpen size={14} /> {isArabic ? 'ادخل التخصص' : 'Open course'}
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <div
          className="mt-6 rounded-[1.75rem] px-6 py-10 text-center text-sm"
          style={{ border: `1.5px dashed ${T.emptyBorder}`, background: T.card, color: T.muted }}
        >
          {isArabic
            ? 'لا يوجد كورسات مشتركة بعد. اشترك بمادة مدفوعة وستظهر هنا.'
            : 'No enrolled courses yet. Subscribe to a paid material and it will appear here.'}
        </div>
      )}
    </StudentLayout>
  );
}
