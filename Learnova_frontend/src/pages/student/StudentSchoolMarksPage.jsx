import { useEffect, useState } from 'react';
import { BarChart2, BookOpen, TrendingUp, Award, AlertCircle } from 'lucide-react';
import StudentLayout from '../../components/student/StudentLayout';
import EducationLoading from '../../components/ui/EducationLoading';
import { fetchMyStudentMarks, fetchStudentSchoolCertificate } from '../../services/studentService';
import { fetchAcademicYears, fetchTerms } from '../../services/organizationService';
import { SchoolCertificateCard } from '../../components/student/CertificateCard';
import { useLanguage } from '../../utils/i18n';
import { notifyError } from '../../lib/notify';

const fmt = (v) => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n.toFixed(1).replace(/\.0$/, '') : '0';
};

const pct = (score, outOf) => (Number(outOf) > 0 ? (Number(score) / Number(outOf)) * 100 : 0);

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

export default function StudentSchoolMarksPage() {
  const { isArabic } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [marks, setMarks] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [yearTerms, setYearTerms] = useState([]);
  const [selectedTerm, setSelectedTerm] = useState('all'); // 'all' or termNumber
  const [expandedSubject, setExpandedSubject] = useState(null);
  const [certData, setCertData] = useState(null);
  const [certLoading, setCertLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const data = await fetchMyStudentMarks();
        if (!cancelled) setMarks(Array.isArray(data) ? data : []);
        try {
          const years = await fetchAcademicYears().catch(() => []);
          if (!cancelled) setAcademicYears(years || []);
          const active = (years || []).find((y) => y.isActive) || years[0] || null;
          if (active && !cancelled) {
            setSelectedYear(active);
            const terms = await fetchTerms(active.id).catch(() => []);
            if (!cancelled) setYearTerms(terms || []);
          }
        } catch (e) {
          // ignore term/year loading errors
        }
      } catch (err) {
        if (!cancelled) notifyError(err?.message || (isArabic ? 'فشل تحميل الدرجات' : 'Failed to load marks'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [isArabic]);

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
    const totalWeightedScore = subject.marks.reduce((sum, m) => sum + pct(m.Numbers, m.OutOf), 0);
    const avg = subject.marks.length > 0 ? totalWeightedScore / subject.marks.length : 0;
    return { ...subject, avg };
  });

  const stats = (() => {
    if (!marks.length) return { avg: 0, passing: 0, total: 0, best: null };
    const percentages = marks.map((m) => pct(m.Numbers, m.OutOf));
    const avg = percentages.reduce((s, v) => s + v, 0) / percentages.length;
    const passing = percentages.filter((p) => p >= 50).length;
    const bestMark = marks.reduce((best, m) => {
      const p = pct(m.Numbers, m.OutOf);
      return p > pct(best.Numbers, best.OutOf) ? m : best;
    }, marks[0]);
    return { avg, passing, total: marks.length, best: bestMark };
  })();

  const overallGrade = gradeLabel(stats.avg);

  return (
    <StudentLayout
      title={isArabic ? 'درجاتي' : 'My Marks'}
      subtitle={isArabic ? 'عرض جميع الدرجات مجمعةً حسب المادة' : 'All marks grouped by subject'}
    >
      {loading ? (
        <EducationLoading
          isArabic={isArabic}
          title={isArabic ? 'جاري تحميل الدرجات' : 'Loading marks'}
          subtitle={isArabic ? 'نجهز سجلك الأكاديمي' : 'Preparing your academic record'}
          fullscreen
        />
      ) : null}

      {!loading && marks.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm">
          <BarChart2 size={48} className="mx-auto text-slate-300" />
          <p className="mt-4 text-lg font-black text-slate-700">{isArabic ? 'لا توجد درجات بعد' : 'No marks yet'}</p>
          <p className="mt-2 text-sm text-slate-500">{isArabic ? 'ستظهر درجاتك هنا بعد أن يُدخلها المدرس' : 'Your marks will appear here once your teacher adds them'}</p>
        </div>
      ) : null}

      {!loading && marks.length > 0 ? (
        <div className="space-y-6">


          {/* Per-subject sections */}
          <div className="space-y-4">
            {bySubject.map((subject) => {
              const isOpen = expandedSubject === subject.id;
              const sg = gradeLabel(subject.avg);
              return (
                <div key={subject.id} className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
                  {/* Subject header */}
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
                        {subject.course ? <p className="text-xs text-slate-500">{subject.course}{subject.gradeLevel ? ` · ${isArabic ? 'الصف' : 'Grade'} ${subject.gradeLevel}` : ''}</p> : null}
                      </div>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-bold text-slate-900">{fmt(subject.avg)}%</p>
                        <p className="text-xs text-slate-500">{subject.marks.length} {isArabic ? 'درجة' : 'mark(s)'}</p>
                      </div>
                      <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${sg.color}`}>{sg.label}</span>
                      <div className={`h-5 w-5 rounded-full border-2 border-slate-200 text-slate-400 flex items-center justify-center transition-transform ${isOpen ? 'rotate-180' : ''}`}>
                        <svg viewBox="0 0 10 6" fill="none" className="h-2.5 w-2.5"><path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </div>
                    </div>
                  </button>

                  {/* Progress bar */}
                  <div className="h-1 w-full bg-slate-100">
                    <div
                      className={`h-1 transition-all ${subject.avg >= 70 ? 'bg-emerald-400' : subject.avg >= 50 ? 'bg-amber-400' : 'bg-rose-400'}`}
                      style={{ width: `${Math.min(subject.avg, 100)}%` }}
                    />
                  </div>

                  {/* Marks table (expandable) */}
                  {isOpen ? (
                    <div className="overflow-x-auto border-t border-slate-100 px-5 pb-4 pt-3">
                      {/* Term filter */}
                      <div className="mb-3 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedTerm('all')}
                          className={`rounded-xl px-3 py-1 text-xs font-semibold ${selectedTerm === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}
                        >
                          {isArabic ? 'الكل' : 'All'}
                        </button>
                        {yearTerms.map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setSelectedTerm(String(t.termNumber))}
                            className={`rounded-xl px-3 py-1 text-xs font-semibold ${String(selectedTerm) === String(t.termNumber) ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}
                          >
                            {t.name || `${isArabic ? 'الفصل' : 'Term'} ${t.termNumber}`}
                          </button>
                        ))}
                      </div>

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
                          {subject.marks
                            .filter((mark) => {
                              if (selectedTerm === 'all') return true;
                              const termNumber = Number(selectedTerm);
                              const term = yearTerms.find((yt) => Number(yt.termNumber) === termNumber);
                              if (!term) return true;
                              if (!mark.time) return false;
                              const d = new Date(mark.time);
                              const start = term.startDate ? new Date(term.startDate) : null;
                              const end = term.endDate ? new Date(term.endDate) : null;
                              if (start && d < start) return false;
                              if (end && d > end) return false;
                              return true;
                            })
                            .map((mark) => {
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
                                      <div className={`h-1.5 rounded-full ${passed ? 'bg-emerald-400' : 'bg-rose-400'}`} style={{ width: `${Math.min(p, 100)}%` }} />
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
                  ) : null}
                </div>
              );
            })}
          </div>

          {/* Footer note */}
          <p className="text-center text-xs text-slate-400">
            {isArabic ? 'الدرجة الراسبة هي أقل من 50%' : 'Passing threshold is 50% or above'}
          </p>
        </div>
      ) : null}

    </StudentLayout>
  );
}
