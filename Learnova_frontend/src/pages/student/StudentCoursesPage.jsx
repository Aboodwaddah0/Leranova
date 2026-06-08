import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ArrowLeft, Layers3, Search, Sparkles } from 'lucide-react';
import StudentLayout from '../../components/student/StudentLayout';
import {
  fetchAcademyTracks,
  fetchStudentContext,
} from '../../services/studentService';
import { useLanguage } from '../../utils/i18n';
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
    text:        isDark ? '#f1f0f5'                : '#0f172a',
    sub:         isDark ? 'rgba(255,255,255,0.5)'  : '#475569',
    muted:       isDark ? 'rgba(255,255,255,0.32)' : '#64748b',
    accent:      isDark ? '#818cf8'                : '#4f46e5',
    iconBg:      isDark ? 'rgba(99,102,241,0.18)'  : '#eef2ff',
    emptyBorder: isDark ? 'rgba(255,255,255,0.12)' : '#cbd5e1',
  };

  const [context, setContext] = useState(null);
  const [tracks,  setTracks]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [query,   setQuery]   = useState('');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const ctx = await fetchStudentContext();
      if (cancelled) return;
      setContext(ctx);
      if (ctx?.mode === 'ACADEMY') {
        const trackItems = await fetchAcademyTracks();
        if (!cancelled) setTracks(Array.isArray(trackItems) ? trackItems : []);
      }
      if (!cancelled) setLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const filteredTracks = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return tracks;
    return tracks.filter((t) =>
      `${t?.name || ''} ${t?.description || ''}`.toLowerCase().includes(needle)
    );
  }, [query, tracks]);

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
                {isArabic ? 'كل التخصصات' : 'All Specializations'}
              </h1>
              <p className="mt-2 text-sm text-blue-50/90">
                {isArabic
                  ? 'اختر تخصصًا وادخل موادّه لفتح المحتوى والدردشة.'
                  : 'Choose a specialization and open its materials to unlock content and chat.'}
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
              <Sparkles className="mr-2 inline-block" size={16} />
              {tracks.length} {isArabic ? 'تخصص' : 'specializations'}
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
            placeholder={isArabic ? 'ابحث عن تخصص...' : 'Search a specialization...'}
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
      ) : filteredTracks.length ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredTracks.map((track) => (
            <Link
              key={track.id}
              to={`/courses/${track.id}`}
              className="block rounded-[1.75rem] p-5 shadow-xl shadow-indigo-500/5 transition hover:-translate-y-0.5"
              style={{ border: `1px solid ${T.border}`, background: T.card }}
            >
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-black" style={{ color: T.text }}>{track.name}</h2>
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-2xl"
                  style={{ background: T.iconBg, color: T.accent }}
                >
                  <Layers3 size={18} />
                </div>
              </div>
              <p className="mt-3 line-clamp-3 text-sm leading-7" style={{ color: T.sub }}>
                {track.description || (isArabic ? 'وصف التخصص غير متوفر.' : 'Specialization description is not available.')}
              </p>
              <div className="mt-4 flex items-center justify-between text-xs font-semibold" style={{ color: T.muted }}>
                <span>{track.subjectCount || 0} {isArabic ? 'مواد' : 'materials'}</span>
                <span>{track.subscribedSubjectCount || 0} {isArabic ? 'مشترك' : 'subscribed'}</span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div
          className="mt-6 rounded-[1.75rem] px-6 py-10 text-center text-sm"
          style={{ border: `1.5px dashed ${T.emptyBorder}`, background: T.card, color: T.muted }}
        >
          {isArabic ? 'لا توجد تخصصات متاحة حالياً.' : 'No specializations available yet.'}
        </div>
      )}
    </StudentLayout>
  );
}
