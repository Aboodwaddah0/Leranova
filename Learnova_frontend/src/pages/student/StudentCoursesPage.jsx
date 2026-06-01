import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, CheckCircle2, Layers3, Search, Sparkles } from 'lucide-react';
import StudentLayout from '../../components/student/StudentLayout';
import {
  fetchAcademySubscriptions,
  fetchAcademyTrackSubjects,
  fetchAcademyTracks,
  fetchStudentContext,
  fetchSubjectLessons,
} from '../../services/studentService';
import { useLanguage } from '../../utils/i18n';
import { calculateProgressForLessons, subscribeToProgress } from '../../utils/studentProgress';
import { useTheme } from '../../contexts/ThemeContext';

export default function StudentCoursesPage() {
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
    iconBg:      isDark ? 'rgba(99,102,241,0.18)'  : '#eef2ff',
    emptyBorder: isDark ? 'rgba(255,255,255,0.12)' : '#cbd5e1',
  };
  const [context, setContext] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [myCourses, setMyCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('MY_COURSES');
  const [query, setQuery] = useState('');
  const [progressTick, setProgressTick] = useState(0);

  useEffect(() => subscribeToProgress(() => setProgressTick((value) => value + 1)), []);

  const loadMyCourses = async () => {
    const subscriptions = await fetchAcademySubscriptions();

    const courseCards = await Promise.all(
      (Array.isArray(subscriptions) ? subscriptions : []).map(async (subscription) => {
        const subjectId = Number(subscription.subjectId || 0);
        const trackId = Number(subscription.trackId || 0);

        if (!subjectId || !trackId) {
          return null;
        }

        const [lessons, trackDetails] = await Promise.all([
          fetchSubjectLessons(subjectId),
          fetchAcademyTrackSubjects(trackId),
        ]);

        const lessonItems = Array.isArray(lessons) ? lessons : [];
        const lessonIds = lessonItems
          .map((lesson) => Number(lesson?.id))
          .filter((id) => Number.isInteger(id) && id > 0);

        const backendCompleted = lessonItems.filter((lesson) => Boolean(lesson?.isCompleted)).length;
        const progress = lessonItems.some((lesson) => Object.prototype.hasOwnProperty.call(lesson || {}, 'isCompleted'))
          ? {
              total: lessonIds.length,
              completed: backendCompleted,
              percent: lessonIds.length ? Math.round((backendCompleted / lessonIds.length) * 100) : 0,
            }
          : calculateProgressForLessons(lessonIds);

        const subjectMeta = (trackDetails?.subjects || []).find((item) => Number(item.id) === subjectId) || null;

        return {
          subjectId,
          subjectName: subscription.subjectName || subjectMeta?.name || (isArabic ? 'مادة' : 'Subject'),
          trackId,
          trackName: subscription.trackName || trackDetails?.track?.name || (isArabic ? 'تخصص' : 'Specialization'),
          imageUrl: subjectMeta?.imageUrl || '',
          lessonTotal: progress.total,
          lessonDone: progress.completed,
          percent: progress.percent,
        };
      }),
    );

    return courseCards.filter(Boolean);
  };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      const ctx = await fetchStudentContext();
      if (cancelled) return;
      setContext(ctx);

      if (ctx?.mode === 'ACADEMY') {
        const [trackItems, myCourseItems] = await Promise.all([
          fetchAcademyTracks(),
          loadMyCourses(),
        ]);
        if (!cancelled) {
          setTracks(Array.isArray(trackItems) ? trackItems : []);
          setMyCourses(Array.isArray(myCourseItems) ? myCourseItems : []);
        }
      }

      if (!cancelled) {
        setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [isArabic, progressTick]);

  const filteredTracks = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return tracks;
    return tracks.filter((track) => `${track?.name || ''} ${track?.description || ''}`.toLowerCase().includes(needle));
  }, [query, tracks]);

  const filteredMyCourses = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return myCourses;
    return myCourses.filter((course) => `${course?.subjectName || ''} ${course?.trackName || ''}`.toLowerCase().includes(needle));
  }, [myCourses, query]);

  if (context?.mode === 'SCHOOL') {
    return <Navigate to="/student/subjects" replace />;
  }

  return (
    <StudentLayout>
      {/* ── Hero banner (gradient — looks fine in both modes) ── */}
      <section className="rounded-[2rem] bg-gradient-to-r from-indigo-600 via-slate-900 to-cyan-600 p-6 text-white shadow-xl shadow-indigo-500/15"
        style={{ border:`1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.7)'}` }}>
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-blue-100">{isArabic ? 'أكاديمية Learnova' : 'Learnova academy'}</p>
              <h1 className="mt-2 text-2xl font-black md:text-3xl">{isArabic ? 'تصفح الكورسات المتاحة' : 'Browse available courses'}</h1>
              <p className="mt-2 text-sm text-blue-50/90">
                {isArabic ? 'ادخل أي مسار، ثم اشترك بالمادة التي تريدها لفتح المحتوى والدردشة الخاصة بها.' : 'Open any track, then subscribe to a material to unlock its content and chat.'}
              </p>
            </div>
            <Link to="/dashboard/student" className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold backdrop-blur transition hover:border-white/40 hover:bg-white/20">
              <ArrowLeft size={16} /> {isArabic ? 'عودة' : 'Back'}
            </Link>
          </div>
          <div className="flex gap-3">
            <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm backdrop-blur">
              <Sparkles className="mr-2 inline-block" size={16} /> {tracks.length} {isArabic ? 'كورسات' : 'courses'}
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm backdrop-blur">
              <CheckCircle2 className="mr-2 inline-block" size={16} /> {myCourses.length} {isArabic ? 'مادة مشتراة' : 'purchased'}
            </div>
          </div>
        </div>
      </section>

      {/* ── Tab switcher ── */}
      <div className="mt-5 inline-flex rounded-2xl p-1 shadow-lg shadow-indigo-500/5"
        style={{ border:`1px solid ${T.border}`, background:T.tabWrap }}>
        <button type="button" onClick={() => setActiveTab('MY_COURSES')}
          className={`rounded-xl px-4 py-2 text-sm font-bold transition ${activeTab === 'MY_COURSES' ? 'bg-indigo-600 text-white' : ''}`}
          style={activeTab !== 'MY_COURSES' ? { color:T.sub } : {}}>
          {isArabic ? 'كورساتي' : 'My courses'}
        </button>
        <button type="button" onClick={() => setActiveTab('TRACKS')}
          className={`rounded-xl px-4 py-2 text-sm font-bold transition ${activeTab === 'TRACKS' ? 'bg-indigo-600 text-white' : ''}`}
          style={activeTab !== 'TRACKS' ? { color:T.sub } : {}}>
          {isArabic ? 'كل الكورسات' : 'All courses'}
        </button>
      </div>

      {/* ── Search ── */}
      <div className="mt-5 rounded-[1.75rem] p-4 shadow-lg shadow-indigo-500/5 backdrop-blur-xl"
        style={{ border:`1px solid ${T.border}`, background:T.tabWrap }}>
        <label className="flex items-center gap-3 rounded-2xl px-4 py-3"
          style={{ border:`1px solid ${T.inputBorder}`, background:T.inputBg }}>
          <Search size={16} style={{ color:T.muted }} />
          <input value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder={isArabic ? 'ابحث عن تخصص...' : 'Search a specialization...'}
            className="w-full bg-transparent text-sm outline-none"
            style={{ color:T.text }} />
        </label>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="ln-skeleton h-48 rounded-[1.75rem]" />
          ))}
        </div>

      ) : activeTab === 'TRACKS' && filteredTracks.length ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredTracks.map((track) => (
            <Link key={track.id} to={`/courses/${track.id}`}
              className="block rounded-[1.75rem] p-5 shadow-xl shadow-indigo-500/5 transition hover:-translate-y-0.5"
              style={{ border:`1px solid ${T.border}`, background:T.card }}>
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-black" style={{ color:T.text }}>{track.name}</h2>
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl"
                  style={{ background:T.iconBg, color:T.accent }}>
                  <Layers3 size={18} />
                </div>
              </div>
              <p className="mt-3 line-clamp-3 text-sm leading-7" style={{ color:T.sub }}>
                {track.description || (isArabic ? 'وصف الكورس غير متوفر.' : 'Course description is not available.')}
              </p>
              <div className="mt-4 flex items-center justify-between text-xs font-semibold" style={{ color:T.muted }}>
                <span>{track.subjectCount || 0} {isArabic ? 'مواد' : 'materials'}</span>
                <span>{track.subscribedSubjectCount || 0} {isArabic ? 'مشترك' : 'subscribed'}</span>
              </div>
            </Link>
          ))}
        </div>

      ) : activeTab === 'MY_COURSES' && filteredMyCourses.length ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredMyCourses.map((course) => (
            <article key={`${course.trackId}-${course.subjectId}`}
              className="rounded-[1.75rem] p-5 shadow-xl shadow-indigo-500/5"
              style={{ border:`1px solid ${T.border}`, background:T.card }}>
              <div className="mb-3 overflow-hidden rounded-2xl"
                style={{ border:`1px solid ${T.inputBorder}`, background:T.imgBg }}>
                <img src={course.imageUrl || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80'}
                  alt={course.subjectName} className="h-40 w-full object-cover" loading="lazy" />
              </div>
              <p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color:T.accent }}>{course.trackName}</p>
              <h2 className="mt-2 text-lg font-black" style={{ color:T.text }}>{course.subjectName}</h2>
              <div className="mt-4 space-y-2 text-sm" style={{ color:T.sub }}>
                <div className="flex items-center justify-between">
                  <span>{isArabic ? 'المحاضرات' : 'Lectures'}</span>
                  <span className="font-semibold" style={{ color:T.text }}>{course.lessonTotal}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>{isArabic ? 'المنجز' : 'Completed'}</span>
                  <span className="font-semibold" style={{ color:T.done }}>{course.lessonDone}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full" style={{ background:T.progressBg }}>
                  <div className="ln-progress-fill h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500" style={{ width:`${course.percent}%` }} />
                </div>
                <div className="text-xs font-bold" style={{ color:T.muted }}>{course.percent}%</div>
              </div>
              <Link to={`/courses/${course.trackId}/subjects/${course.subjectId}`}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-indigo-500">
                <BookOpen size={14} /> {isArabic ? 'ادخل التخصص' : 'Open specialization'}
              </Link>
            </article>
          ))}
        </div>

      ) : (
        <div className="mt-6 rounded-[1.75rem] px-6 py-10 text-center text-sm"
          style={{ border:`1.5px dashed ${T.emptyBorder}`, background:T.card, color:T.muted }}>
          {activeTab === 'MY_COURSES'
            ? (isArabic ? 'لا يوجد كورسات مشتراة بعد. اشترك بمادة مدفوعة وستظهر هنا مباشرة.' : 'No purchased courses yet. Buy a paid material and it will appear here immediately.')
            : (isArabic ? 'لا توجد كورسات متاحة حالياً.' : 'No courses available yet.')}
        </div>
      )}
    </StudentLayout>
  );
}
