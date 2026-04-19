import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowLeft, BadgeCheck, CreditCard, PlayCircle } from 'lucide-react';
import StudentLayout from '../../components/student/StudentLayout';
import { fetchAcademyTrackSubjects, fetchStudentContext, subscribeAcademyMaterial } from '../../services/studentService';
import { useLanguage } from '../../utils/i18n';

export default function StudentCourseDetailsPage() {
  const { isArabic } = useLanguage();
  const { courseId } = useParams();
  const trackId = Number(courseId);
  const [context, setContext] = useState(null);
  const [trackData, setTrackData] = useState({ track: null, subjects: [] });
  const [loading, setLoading] = useState(true);
  const [subscribingId, setSubscribingId] = useState(null);
  const [error, setError] = useState('');

  const loadTrack = async () => {
    const data = await fetchAcademyTrackSubjects(trackId);
    setTrackData(data || { track: null, subjects: [] });
  };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      const ctx = await fetchStudentContext();
      if (cancelled) return;
      setContext(ctx);

      if (ctx?.mode === 'ACADEMY' && Number.isFinite(trackId)) {
        const data = await fetchAcademyTrackSubjects(trackId);
        if (!cancelled) {
          setTrackData(data || { track: null, subjects: [] });
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
  }, [trackId]);

  const subjectStats = useMemo(() => {
    const all = trackData?.subjects || [];
    return {
      total: all.length,
      subscribed: all.filter((subject) => subject.isSubscribed).length,
      paid: all.filter((subject) => subject.isPaid).length,
    };
  }, [trackData]);

  if (context?.mode === 'SCHOOL') {
    return <Navigate to="/student/subjects" replace />;
  }

  const handleSubscribe = async (subjectId) => {
    try {
      setSubscribingId(subjectId);
      const result = await subscribeAcademyMaterial(subjectId);

      if (result?.requiresPayment && result?.checkoutUrl) {
        window.location.assign(result.checkoutUrl);
        return;
      }

      await loadTrack();
    } catch (subscribeError) {
      setError(subscribeError?.message || (isArabic ? 'فشل الاشتراك بالمادة.' : 'Failed to subscribe to material.'));
    } finally {
      setSubscribingId(null);
    }
  };

  return (
    <StudentLayout
      title={isArabic ? 'تفاصيل الكورس' : 'Course details'}
      subtitle={trackData?.track?.name || (isArabic ? 'الكورس' : 'Course')}
      actions={
        <Link to="/courses" className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
          <ArrowLeft size={16} /> {isArabic ? 'العودة للكورسات' : 'Back to courses'}
        </Link>
      }
    >
      {error ? <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{error}</div> : null}

      <section className="rounded-[2rem] border border-white/70 bg-gradient-to-r from-indigo-600 via-slate-900 to-cyan-600 p-6 text-white shadow-xl shadow-indigo-500/15">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-blue-100">{isArabic ? 'الكورس' : 'Course'}</p>
        <h1 className="mt-2 text-3xl font-black">{trackData?.track?.name || (isArabic ? 'غير متوفر' : 'Unavailable')}</h1>
        <p className="mt-2 text-sm leading-7 text-blue-50/90">
          {trackData?.track?.description || (isArabic ? 'اختر مادة واشترك بها لفتح الدروس والدردشة الخاصة بها.' : 'Select a material and subscribe to unlock lessons and its dedicated chat.')}
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <StatPill label={isArabic ? 'إجمالي المواد' : 'Total materials'} value={subjectStats.total} />
          <StatPill label={isArabic ? 'المواد المشتركة' : 'Subscribed'} value={subjectStats.subscribed} />
          <StatPill label={isArabic ? 'المواد المدفوعة' : 'Paid materials'} value={subjectStats.paid} />
        </div>
      </section>

      {loading ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-40 animate-pulse rounded-[1.75rem] border border-white/70 bg-white/85 shadow-xl shadow-indigo-500/5" />
          ))}
        </div>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {(trackData?.subjects || []).map((subject) => {
            const canOpen = Boolean(subject.isSubscribed);
            return (
              <article key={subject.id} className="rounded-[1.75rem] border border-white/70 bg-white/90 p-5 shadow-xl shadow-indigo-500/5">
                <div className="mb-3 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                  <img
                    src={subject.imageUrl || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80'}
                    alt={subject.name}
                    className="h-40 w-full object-cover"
                    loading="lazy"
                  />
                </div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-black text-slate-900">{subject.name}</h3>
                    <p className="mt-1 text-sm text-slate-500">{subject.teacher?.name || (isArabic ? 'مدرس غير محدد' : 'Unassigned teacher')}</p>
                  </div>
                  {subject.isSubscribed ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                      <BadgeCheck size={12} /> {isArabic ? 'مشترك' : 'Subscribed'}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                      <CreditCard size={12} /> {subject.isPaid ? `${subject.price} USD` : (isArabic ? 'مجاني' : 'Free')}
                    </span>
                  )}
                </div>

                <p className="mt-3 line-clamp-3 text-sm leading-7 text-slate-600">{subject.description || (isArabic ? 'لا يوجد وصف متاح.' : 'No description available.')}</p>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-slate-500">{subject.lessonCount || 0} {isArabic ? 'دروس' : 'lessons'}</span>

                  {canOpen ? (
                    <Link
                      to={`/courses/${trackId}/subjects/${subject.id}`}
                      className="inline-flex items-center gap-1 rounded-full bg-indigo-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-indigo-500"
                    >
                      <PlayCircle size={14} /> {isArabic ? 'فتح المادة' : 'Open material'}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      disabled={subscribingId === subject.id}
                      onClick={() => handleSubscribe(subject.id)}
                      className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <CreditCard size={14} />
                      {subscribingId === subject.id
                        ? (isArabic ? 'جاري الاشتراك...' : 'Subscribing...')
                        : (isArabic ? 'اشترك الآن' : 'Subscribe now')}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {!loading && !(trackData?.subjects || []).length ? (
        <div className="mt-6 rounded-[1.75rem] border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-sm text-slate-500">
          {isArabic ? 'لا توجد مواد داخل هذا المسار حالياً.' : 'No materials found in this track yet.'}
        </div>
      ) : null}
    </StudentLayout>
  );
}

function StatPill({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur">
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-blue-100">{label}</p>
      <p className="mt-1 text-2xl font-black">{value}</p>
    </div>
  );
}
