import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowLeft, BadgeCheck, CreditCard, Eye, PlayCircle, Search } from 'lucide-react';
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
  const [search, setSearch] = useState('');
  const [priceFilter, setPriceFilter] = useState('ALL');
  const [subFilter, setSubFilter] = useState('ALL');
  const [levelFilter, setLevelFilter] = useState('ALL');

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

  const filteredSubjects = useMemo(() => {
    const all = trackData?.subjects || [];
    const query = search.trim().toLowerCase();

    return all.filter((subject) => {
      if (query && !String(subject.name || '').toLowerCase().includes(query)) return false;
      if (priceFilter === 'FREE' && subject.isPaid) return false;
      if (priceFilter === 'PAID' && !subject.isPaid) return false;
      if (subFilter === 'SUBSCRIBED' && !subject.isSubscribed) return false;
      if (subFilter === 'NOT_SUBSCRIBED' && subject.isSubscribed) return false;
      if (levelFilter !== 'ALL' && subject.level !== levelFilter) return false;
      return true;
    });
  }, [trackData, search, priceFilter, subFilter, levelFilter]);

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
    <StudentLayout>
      <div className="mb-4">
        <Link to="/courses" className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold backdrop-blur transition hover:border-white/40 hover:bg-white/20">
          <ArrowLeft size={16} /> {isArabic ? 'عودة' : 'Back'}
        </Link>
      </div>

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

      <div className="mt-6 flex flex-wrap items-end gap-3">
        <label className="flex min-w-[240px] flex-1 items-center gap-2 rounded-[14px] border border-slate-300 bg-white px-4 py-3">
          <Search size={16} className="text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={isArabic ? 'البحث بالاسم' : 'Search by name'}
            className="w-full bg-transparent text-sm outline-none"
          />
        </label>

        <select value={priceFilter} onChange={(event) => setPriceFilter(event.target.value)} className="h-11 rounded-[14px] border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700">
          <option value="ALL">{isArabic ? 'كل الأسعار' : 'All prices'}</option>
          <option value="FREE">{isArabic ? 'مجاني' : 'Free'}</option>
          <option value="PAID">{isArabic ? 'مدفوع' : 'Paid'}</option>
        </select>

        <select value={subFilter} onChange={(event) => setSubFilter(event.target.value)} className="h-11 rounded-[14px] border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700">
          <option value="ALL">{isArabic ? 'كل الحالات' : 'All subjects'}</option>
          <option value="SUBSCRIBED">{isArabic ? 'مشترك' : 'Subscribed'}</option>
          <option value="NOT_SUBSCRIBED">{isArabic ? 'غير مشترك' : 'Not subscribed'}</option>
        </select>

        <select value={levelFilter} onChange={(event) => setLevelFilter(event.target.value)} className="h-11 rounded-[14px] border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700">
          <option value="ALL">{isArabic ? 'كل المستويات' : 'All levels'}</option>
          <option value="BEGINNER">{isArabic ? 'مبتدئ' : 'Beginner'}</option>
          <option value="INTERMEDIATE">{isArabic ? 'متوسط' : 'Intermediate'}</option>
          <option value="ADVANCED">{isArabic ? 'متقدم' : 'Advanced'}</option>
          <option value="EXPERT">{isArabic ? 'خبير' : 'Expert'}</option>
        </select>

        <button
          type="button"
          onClick={() => { setSearch(''); setPriceFilter('ALL'); setSubFilter('ALL'); setLevelFilter('ALL'); }}
          className="h-11 rounded-[14px] border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          {isArabic ? 'مسح' : 'Clear'}
        </button>
      </div>

      {loading ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="ln-skeleton h-40 rounded-[1.75rem]" />
          ))}
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredSubjects.map((subject) => {
            const canOpen = Boolean(subject.isSubscribed);
            return (
              <article key={subject.id} className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                <div className="relative aspect-video overflow-hidden bg-slate-100">
                  <img
                    src={subject.imageUrl || trackData?.track?.thumbnail || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80'}
                    alt={subject.name}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  {subject.isSubscribed && (
                    <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-emerald-500/90 px-2.5 py-1 text-xs font-bold text-white shadow-sm backdrop-blur">
                      <BadgeCheck size={12} /> {isArabic ? 'مشترك' : 'Subscribed'}
                    </span>
                  )}
                </div>

                <div className="flex flex-1 flex-col space-y-2 p-4">
                  <h3 className="line-clamp-2 min-h-[2.75rem] text-base font-extrabold leading-snug text-slate-900">{subject.name}</h3>
                  <p className="text-sm text-slate-500">{subject.teacher?.name || (isArabic ? 'مدرس غير محدد' : 'Unassigned teacher')}</p>
                  <p className="line-clamp-2 min-h-[2.625rem] text-sm leading-6 text-slate-600">{subject.description || (isArabic ? 'لا يوجد وصف متاح.' : 'No description available.')}</p>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {subject.level && (
                      <span className={`inline-block rounded px-2 py-0.5 text-xs font-bold ${
                        subject.level === 'BEGINNER'     ? 'bg-emerald-100 text-emerald-700' :
                        subject.level === 'INTERMEDIATE' ? 'bg-blue-100 text-blue-700'       :
                        subject.level === 'ADVANCED'     ? 'bg-violet-100 text-violet-700'   :
                        'bg-rose-100 text-rose-700'
                      }`}>
                        {isArabic
                          ? (subject.level === 'BEGINNER' ? 'مبتدئ' : subject.level === 'INTERMEDIATE' ? 'متوسط' : subject.level === 'ADVANCED' ? 'متقدم' : 'خبير')
                          : subject.level.charAt(0) + subject.level.slice(1).toLowerCase()}
                      </span>
                    )}
                    <span className="text-xs font-semibold text-slate-500">{subject.lessonCount || 0} {isArabic ? 'دروس' : 'lessons'}</span>
                  </div>

                  <p className="pt-1 text-lg font-black text-slate-900">
                    {subject.isPaid ? `${subject.price} USD` : (isArabic ? 'مجاني' : 'Free')}
                  </p>

                  <div className="mt-auto flex items-center gap-2 pt-2">
                    {!canOpen && (
                      <Link
                        to={`/courses/${trackId}/subjects/${subject.id}`}
                        className="inline-flex items-center gap-1.5 rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-bold text-indigo-700 transition hover:bg-indigo-100"
                      >
                        <Eye size={14} /> {isArabic ? 'معاينة' : 'Preview'}
                      </Link>
                    )}

                    {canOpen ? (
                      <Link
                        to={`/courses/${trackId}/subjects/${subject.id}`}
                        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-500"
                      >
                        <PlayCircle size={14} /> {isArabic ? 'فتح المادة' : 'Open material'}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        disabled={subscribingId === subject.id}
                        onClick={() => handleSubscribe(subject.id)}
                        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {subject.isPaid ? <CreditCard size={14} /> : <BadgeCheck size={14} />}
                        {subject.isPaid
                          ? (subscribingId === subject.id
                              ? (isArabic ? 'جاري الاشتراك...' : 'Subscribing...')
                              : (isArabic ? 'اشترك الآن' : 'Subscribe now'))
                          : (subscribingId === subject.id
                              ? (isArabic ? 'جاري الالتحاق...' : 'Enrolling...')
                              : (isArabic ? 'التحق الآن' : 'Enroll now'))}
                      </button>
                    )}
                  </div>
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

      {!loading && (trackData?.subjects || []).length > 0 && filteredSubjects.length === 0 ? (
        <div className="mt-6 rounded-[1.75rem] border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-sm text-slate-500">
          {isArabic ? 'لا توجد نتائج مطابقة لعوامل التصفية.' : 'No subjects match your filters.'}
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
