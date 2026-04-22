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

export default function StudentCoursesPage() {
  const { isArabic } = useLanguage();
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
          trackName: subscription.trackName || trackDetails?.track?.name || (isArabic ? 'مسار' : 'Track'),
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

  if (context?.mode === 'SCHOOL') {
    return <Navigate to="/student/subjects" replace />;
  }

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

  return (
    <StudentLayout>
      <section className="rounded-[2rem] border border-white/70 bg-gradient-to-r from-indigo-600 via-slate-900 to-cyan-600 p-6 text-white shadow-xl shadow-indigo-500/15">
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-blue-100">{isArabic ? 'أكاديمية Learnova' : 'Learnova academy'}</p>
              <h1 className="mt-2 text-2xl font-black md:text-3xl">{isArabic ? 'تصفح الكورسات المتاحة' : 'Browse available courses'}</h1>
              <p className="mt-2 text-sm text-blue-50/90">
                {isArabic
                  ? 'ادخل أي كورس، ثم اشترك بالمادة التي تريدها لفتح المحتوى والدردشة الخاصة بها.'
                  : 'Open any course, then subscribe to a material to unlock its content and chat.'}
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

      <div className="mt-5 inline-flex rounded-2xl border border-white/70 bg-white/85 p-1 shadow-lg shadow-indigo-500/5">
        <button
          type="button"
          onClick={() => setActiveTab('MY_COURSES')}
          className={`rounded-xl px-4 py-2 text-sm font-bold transition ${activeTab === 'MY_COURSES' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          {isArabic ? 'كورساتي' : 'My courses'}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('TRACKS')}
          className={`rounded-xl px-4 py-2 text-sm font-bold transition ${activeTab === 'TRACKS' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          {isArabic ? 'كل الكورسات' : 'All courses'}
        </button>
      </div>

      <div className="mt-5 rounded-[1.75rem] border border-white/70 bg-white/85 p-4 shadow-lg shadow-indigo-500/5 backdrop-blur-xl">
        <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <Search size={16} className="text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={isArabic ? 'ابحث عن كورس...' : 'Search a course...'}
            className="w-full bg-transparent text-sm outline-none"
          />
        </label>
      </div>

      {loading ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-48 animate-pulse rounded-[1.75rem] border border-white/70 bg-white/85 shadow-xl shadow-indigo-500/5" />
          ))}
        </div>
      ) : activeTab === 'TRACKS' && filteredTracks.length ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredTracks.map((track) => (
            <Link
              key={track.id}
              to={`/courses/${track.id}`}
              className="rounded-[1.75rem] border border-white/70 bg-white/90 p-5 shadow-xl shadow-indigo-500/5 transition hover:-translate-y-0.5 hover:border-indigo-200"
            >
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-black text-slate-900">{track.name}</h2>
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                  <Layers3 size={18} />
                </div>
              </div>
              <p className="mt-3 line-clamp-3 text-sm leading-7 text-slate-600">{track.description || (isArabic ? 'وصف الكورس غير متوفر.' : 'Course description is not available.')}</p>
              <div className="mt-4 flex items-center justify-between text-xs font-semibold text-slate-500">
                <span>{track.subjectCount || 0} {isArabic ? 'مواد' : 'materials'}</span>
                <span>{track.subscribedSubjectCount || 0} {isArabic ? 'مشترك' : 'subscribed'}</span>
              </div>
            </Link>
          ))}
        </div>
      ) : activeTab === 'MY_COURSES' && filteredMyCourses.length ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredMyCourses.map((course) => (
            <article key={`${course.trackId}-${course.subjectId}`} className="rounded-[1.75rem] border border-white/70 bg-white/90 p-5 shadow-xl shadow-indigo-500/5">
              <div className="mb-3 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                <img
                  src={course.imageUrl || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80'}
                  alt={course.subjectName}
                  className="h-40 w-full object-cover"
                  loading="lazy"
                />
              </div>

              <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600">{course.trackName}</p>
              <h2 className="mt-2 text-lg font-black text-slate-900">{course.subjectName}</h2>

              <div className="mt-4 space-y-2 text-sm text-slate-600">
                <div className="flex items-center justify-between">
                  <span>{isArabic ? 'المحاضرات' : 'Lectures'}</span>
                  <span className="font-semibold text-slate-900">{course.lessonTotal}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>{isArabic ? 'المنجز' : 'Completed'}</span>
                  <span className="font-semibold text-emerald-700">{course.lessonDone}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500" style={{ width: `${course.percent}%` }} />
                </div>
                <div className="text-xs font-bold text-slate-500">{course.percent}%</div>
              </div>

              <Link
                to={`/courses/${course.trackId}/subjects/${course.subjectId}`}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-indigo-500"
              >
                <BookOpen size={14} /> {isArabic ? 'ادخل الكورس' : 'Open course'}
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-[1.75rem] border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-sm text-slate-500">
          {activeTab === 'MY_COURSES'
            ? (isArabic ? 'لا يوجد كورسات مشتراة بعد. اشترك بمادة مدفوعة وستظهر هنا مباشرة.' : 'No purchased courses yet. Buy a paid material and it will appear here immediately.')
            : (isArabic ? 'لا توجد كورسات متاحة حالياً.' : 'No courses available yet.')}
        </div>
      )}
    </StudentLayout>
  );
}
