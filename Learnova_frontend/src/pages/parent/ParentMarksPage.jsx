import { useEffect, useState } from 'react';
import { BarChart2, BookOpen, Users } from 'lucide-react';
import ParentLayout from '../../components/parent/ParentLayout';
import { fetchParentChildrenMarks } from '../../services/parentService';
import { useLanguage } from '../../utils/i18n';

const AVATAR_COLORS = [
  'bg-indigo-500', 'bg-violet-500', 'bg-pink-500',
  'bg-amber-500', 'bg-emerald-500', 'bg-cyan-500',
];

const fmt = (v) => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n.toFixed(1).replace(/\.0$/, '') : '0';
};

const pct = (score, outOf) =>
  Number(outOf) > 0 ? (Number(score) / Number(outOf)) * 100 : 0;

const gradeLabel = (percent) => {
  if (percent >= 90) return { label: 'A+', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
  if (percent >= 80) return { label: 'A',  color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
  if (percent >= 70) return { label: 'B',  color: 'text-sky-700 bg-sky-50 border-sky-200' };
  if (percent >= 60) return { label: 'C',  color: 'text-amber-700 bg-amber-50 border-amber-200' };
  if (percent >= 50) return { label: 'D',  color: 'text-orange-700 bg-orange-50 border-orange-200' };
  return { label: 'F', color: 'text-rose-700 bg-rose-50 border-rose-200' };
};

const typeColor = (type) => {
  const t = String(type || '').toUpperCase();
  if (t.includes('EXAM') || t.includes('FINAL')) return 'bg-purple-50 text-purple-700 border-purple-200';
  if (t.includes('QUIZ')) return 'bg-sky-50 text-sky-700 border-sky-200';
  if (t.includes('MID')) return 'bg-amber-50 text-amber-700 border-amber-200';
  if (t.includes('HOME') || t.includes('ASSIGN')) return 'bg-teal-50 text-teal-700 border-teal-200';
  return 'bg-slate-100 text-slate-700 border-slate-200';
};

function MarksView({ marks, isArabic }) {
  const [expandedSubject, setExpandedSubject] = useState(null);

  const bySubjectMap = new Map();
  marks.forEach((mark) => {
    const key = mark.subject?.id ?? 'unknown';
    if (!bySubjectMap.has(key)) {
      bySubjectMap.set(key, {
        id: key,
        name: mark.subject?.name || mark.subject?.Name || (isArabic ? 'مادة غير معروفة' : 'Unknown Subject'),
        course: mark.subject?.course?.Name || mark.subject?.course?.name || '',
        gradeLevel: mark.subject?.course?.GradeLevel || null,
        marks: [],
      });
    }
    bySubjectMap.get(key).marks.push(mark);
  });

  const bySubject = Array.from(bySubjectMap.values()).map((subject) => {
    const avg = subject.marks.length > 0
      ? subject.marks.reduce((sum, m) => sum + pct(m.Numbers, m.OutOf), 0) / subject.marks.length
      : 0;
    return { ...subject, avg };
  });

  const stats = (() => {
    if (!marks.length) return { avg: 0, passing: 0, total: 0, best: null };
    const percentages = marks.map((m) => pct(m.Numbers, m.OutOf));
    const avg = percentages.reduce((s, v) => s + v, 0) / percentages.length;
    const passing = percentages.filter((p) => p >= 50).length;
    const best = marks.reduce((b, m) => pct(m.Numbers, m.OutOf) > pct(b.Numbers, b.OutOf) ? m : b, marks[0]);
    return { avg, passing, total: marks.length, best };
  })();

  const overallGrade = gradeLabel(stats.avg);

  if (marks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm">
        <BarChart2 size={48} className="mx-auto text-slate-300" />
        <p className="mt-4 text-lg font-black text-slate-700">{isArabic ? 'لا توجد درجات بعد' : 'No marks yet'}</p>
        <p className="mt-2 text-sm text-slate-500">
          {isArabic ? 'ستظهر الدرجات هنا بعد أن يُدخلها المدرس' : 'Marks will appear here once the teacher adds them'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-[1.5rem] border border-white/70 bg-gradient-to-br from-indigo-600 to-purple-600 p-5 text-white shadow-lg shadow-indigo-500/20">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-200">{isArabic ? 'المعدل العام' : 'Overall Average'}</p>
          <p className="mt-2 text-4xl font-black">{fmt(stats.avg)}%</p>
          <span className={`mt-2 inline-block rounded-full border px-2 py-0.5 text-xs font-bold ${overallGrade.color}`}>
            {overallGrade.label}
          </span>
        </div>
        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">{isArabic ? 'عدد الدرجات' : 'Total Marks'}</p>
          <p className="mt-2 text-4xl font-black text-slate-900">{stats.total}</p>
          <p className="mt-1 text-sm text-slate-500">
            {isArabic ? `عبر ${bySubject.length} مادة` : `across ${bySubject.length} subject${bySubject.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">{isArabic ? 'ناجح / راسب' : 'Passing / Failing'}</p>
          <p className="mt-2 text-4xl font-black text-slate-900">
            <span className="text-emerald-600">{stats.passing}</span>
            <span className="text-slate-300"> / </span>
            <span className="text-rose-500">{stats.total - stats.passing}</span>
          </p>
          <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100">
            <div
              className="h-1.5 rounded-full bg-emerald-500 transition-all"
              style={{ width: stats.total ? `${(stats.passing / stats.total) * 100}%` : '0%' }}
            />
          </div>
        </div>
        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">{isArabic ? 'أفضل درجة' : 'Best Mark'}</p>
          {stats.best ? (
            <>
              <p className="mt-2 text-4xl font-black text-slate-900">{fmt(pct(stats.best.Numbers, stats.best.OutOf))}%</p>
              <p className="mt-1 truncate text-sm text-slate-500">{stats.best.subject?.name || '-'} · {stats.best.MarkType || ''}</p>
            </>
          ) : <p className="mt-2 text-slate-400">-</p>}
        </div>
      </div>

      {/* Per-subject sections */}
      <div className="space-y-4">
        {bySubject.map((subject) => {
          const isOpen = expandedSubject === subject.id;
          const sg = gradeLabel(subject.avg);
          return (
            <div key={subject.id} className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
              <button
                type="button"
                onClick={() => setExpandedSubject(isOpen ? null : subject.id)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-slate-50"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                    <BookOpen size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-black text-slate-900">{subject.name}</p>
                    {subject.course && (
                      <p className="text-xs text-slate-500">
                        {subject.course}
                        {subject.gradeLevel ? ` · ${isArabic ? 'الصف' : 'Grade'} ${subject.gradeLevel}` : ''}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-shrink-0 items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-900">{fmt(subject.avg)}%</p>
                    <p className="text-xs text-slate-500">{subject.marks.length} {isArabic ? 'درجة' : 'mark(s)'}</p>
                  </div>
                  <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${sg.color}`}>{sg.label}</span>
                  <div className={`h-5 w-5 rounded-full border-2 border-slate-200 text-slate-400 flex items-center justify-center transition-transform ${isOpen ? 'rotate-180' : ''}`}>
                    <svg viewBox="0 0 10 6" fill="none" className="h-2.5 w-2.5">
                      <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>
              </button>

              <div className="h-1 w-full bg-slate-100">
                <div
                  className={`h-1 transition-all ${subject.avg >= 70 ? 'bg-emerald-400' : subject.avg >= 50 ? 'bg-amber-400' : 'bg-rose-400'}`}
                  style={{ width: `${Math.min(subject.avg, 100)}%` }}
                />
              </div>

              {isOpen && (
                <div className="overflow-x-auto border-t border-slate-100 px-5 pb-4 pt-3">
                  <table className="min-w-full text-sm">
                    <thead className="hidden sm:table-header-group">
                      <tr className="text-xs uppercase tracking-wider text-slate-400">
                        <th className="py-2 pr-4 text-left font-semibold">{isArabic ? 'النوع' : 'Type'}</th>
                        <th className="py-2 pr-4 text-left font-semibold">{isArabic ? 'الدرجة' : 'Score'}</th>
                        <th className="py-2 pr-4 text-left font-semibold">{isArabic ? 'النسبة' : '%'}</th>
                        <th className="py-2 pr-4 text-left font-semibold">{isArabic ? 'التقدير' : 'Grade'}</th>
                        <th className="py-2 text-left font-semibold">{isArabic ? 'التاريخ' : 'Date'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subject.marks.map((mark) => {
                        const p = pct(mark.Numbers, mark.OutOf);
                        const g = gradeLabel(p);
                        const passed = p >= 50;
                        return (
                          <tr key={mark.id} className="border-t border-slate-50">
                            <td className="py-2.5 pr-4">
                              <div className="block sm:hidden text-xs text-slate-400 mb-1">{isArabic ? 'النوع' : 'Type'}</div>
                              <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-semibold ${typeColor(mark.MarkType)}`}>
                                {mark.MarkType || (isArabic ? 'درجة' : 'Mark')}
                              </span>
                            </td>
                            <td className="py-2.5 pr-4 font-bold text-slate-900">
                              <div className="block sm:hidden text-xs text-slate-400 mb-1">{isArabic ? 'الدرجة' : 'Score'}</div>
                              {fmt(mark.Numbers)} <span className="font-normal text-slate-400">/ {fmt(mark.OutOf)}</span>
                            </td>
                            <td className="py-2.5 pr-4">
                              <div className="block sm:hidden text-xs text-slate-400 mb-1">{isArabic ? 'النسبة' : '%'}</div>
                              <div className="flex items-center gap-2">
                                <div className="h-1.5 w-16 rounded-full bg-slate-100">
                                  <div
                                    className={`h-1.5 rounded-full ${passed ? 'bg-emerald-400' : 'bg-rose-400'}`}
                                    style={{ width: `${Math.min(p, 100)}%` }}
                                  />
                                </div>
                                <span className="text-xs font-semibold text-slate-700">{fmt(p)}%</span>
                              </div>
                            </td>
                            <td className="py-2.5 pr-4">
                              <div className="block sm:hidden text-xs text-slate-400 mb-1">{isArabic ? 'التقدير' : 'Grade'}</div>
                              <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-bold ${g.color}`}>{g.label}</span>
                            </td>
                            <td className="py-2.5 text-slate-500">
                              <div className="block sm:hidden text-xs text-slate-400 mb-1">{isArabic ? 'التاريخ' : 'Date'}</div>
                              {mark.time ? new Date(mark.time).toLocaleDateString(isArabic ? 'ar-SA' : 'en-GB') : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-center text-xs text-slate-400">
        {isArabic ? 'الدرجة الراسبة هي أقل من 50%' : 'Passing threshold is 50% or above'}
      </p>
    </div>
  );
}

export default function ParentMarksPage() {
  const { isArabic } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [children, setChildren] = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchParentChildrenMarks();
        if (!cancelled) {
          setChildren(Array.isArray(data) ? data : []);
          setSelectedIdx(0);
        }
      } catch {
        if (!cancelled) setChildren([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const selected = children[selectedIdx] || null;

  return (
    <ParentLayout>
      {/* Header */}
      <div className="mb-8 rounded-[24px] bg-gradient-to-br from-indigo-600 to-violet-600 p-6 text-white shadow-lg shadow-indigo-500/20">
        <div className="flex items-center gap-3 mb-1">
          <BarChart2 size={28} className="opacity-80" />
          <h1 className="text-2xl font-black">
            {isArabic ? 'درجات الأبناء' : "Children's Marks"}
          </h1>
        </div>
        <p className="text-indigo-200 text-sm">
          {isArabic
            ? 'تابع الأداء الأكاديمي لأبنائك حسب المادة والدرجة'
            : "Track your children's academic performance by subject and grade"}
        </p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-[1.5rem] border border-slate-200 bg-slate-50" />
          ))}
        </div>
      ) : children.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[24px] border-2 border-dashed border-slate-200 bg-white py-20 text-center">
          <Users size={40} className="mb-4 text-slate-300" />
          <p className="font-bold text-slate-500">{isArabic ? 'لا يوجد أبناء مرتبطون' : 'No children linked yet'}</p>
          <p className="mt-1 text-sm text-slate-400">
            {isArabic ? 'تواصل مع المدرسة لربط حساب أبنائك' : 'Contact the school to link your children'}
          </p>
        </div>
      ) : (
        <>
          {/* Child selector tabs */}
          {children.length > 1 && (
            <div className="mb-6 flex gap-2 flex-wrap">
              {children.map((child, idx) => {
                const color = AVATAR_COLORS[idx % AVATAR_COLORS.length];
                const initial = (child.studentName || '?').charAt(0).toUpperCase();
                return (
                  <button
                    key={child.studentId}
                    type="button"
                    onClick={() => setSelectedIdx(idx)}
                    className={`flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-bold transition ${
                      selectedIdx === idx
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25'
                        : 'bg-white text-slate-700 border border-slate-200 hover:border-indigo-300'
                    }`}
                  >
                    <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-black text-white ${color}`}>
                      {initial}
                    </div>
                    {child.studentName}
                  </button>
                );
              })}
            </div>
          )}

          {/* Single child label when only one child */}
          {children.length === 1 && (
            <div className="mb-6 flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${AVATAR_COLORS[0]} text-white text-lg font-black`}>
                {(children[0].studentName || '?').charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-black text-slate-900">{children[0].studentName}</p>
                <p className="text-xs text-slate-500">
                  {children[0].marks?.length || 0} {isArabic ? 'درجة إجمالية' : 'total marks'}
                </p>
              </div>
            </div>
          )}

          {selected && (
            <MarksView marks={selected.marks || []} isArabic={isArabic} />
          )}
        </>
      )}
    </ParentLayout>
  );
}
