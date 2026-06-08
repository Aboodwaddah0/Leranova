import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  Users, MessageSquare, Bell, BellOff,
  ChevronDown, ChevronUp, FileText, GraduationCap,
  UserCircle2, BarChart2, BookOpen, ArrowLeft, ArrowRight, ClipboardList,
} from 'lucide-react';
import ParentLayout from '../../components/parent/ParentLayout';
import {
  fetchMyChildren, fetchMyNotes, markNoteRead,
  fetchParentChildrenMarks, fetchChildrenAttendance,
} from '../../services/parentService';
import { useLanguage } from '../../utils/i18n';

/* ─── helpers ────────────────────────────────────────────────────────────── */
const fmtDate = (d, isArabic) => {
  try {
    return new Date(d).toLocaleDateString(isArabic ? 'ar-EG' : 'en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  } catch { return d; }
};

const STATUS_MAP = {
  ACTIVE:    { en: 'Active',    ar: 'نشط',      cls: 'bg-emerald-100 text-emerald-700' },
  INACTIVE:  { en: 'Inactive',  ar: 'غير نشط',  cls: 'bg-slate-100 text-slate-600'    },
  GRADUATED: { en: 'Graduated', ar: 'متخرج',    cls: 'bg-blue-100 text-blue-700'      },
  FILED:     { en: 'Filed',     ar: 'مؤرشف',    cls: 'bg-amber-100 text-amber-700'    },
};

const AVATAR_COLORS = [
  'bg-indigo-500', 'bg-violet-500', 'bg-pink-500',
  'bg-amber-500',  'bg-emerald-500','bg-cyan-500',
];

/* ─── marks helpers (inlined from ParentMarksPage) ───────────────────────── */
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
  if (t.includes('QUIZ'))                          return 'bg-sky-50 text-sky-700 border-sky-200';
  if (t.includes('MID'))                           return 'bg-amber-50 text-amber-700 border-amber-200';
  if (t.includes('HOME') || t.includes('ASSIGN'))  return 'bg-teal-50 text-teal-700 border-teal-200';
  return 'bg-slate-100 text-slate-700 border-slate-200';
};

/* ─── NoteCard ───────────────────────────────────────────────────────────── */
function NoteCard({ note, isArabic, onRead }) {
  const [open, setOpen] = useState(!note.isRead);

  const toggle = () => {
    setOpen(v => !v);
    if (!note.isRead) onRead(note.id);
  };

  return (
    <div className={`rounded-2xl border transition-all ${note.isRead ? 'border-slate-200 bg-white' : 'border-indigo-200 bg-indigo-50/60'}`}>
      <button type="button" onClick={toggle}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-start">
        <div className="flex items-center gap-2.5 min-w-0">
          {!note.isRead && <span className="h-2 w-2 shrink-0 rounded-full bg-indigo-500" />}
          <FileText size={14} className={note.isRead ? 'text-slate-400' : 'text-indigo-500'} />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-900">
              {note.title || (isArabic ? 'ملاحظة من المعلم' : 'Note from teacher')}
            </p>
            <p className="text-xs text-slate-500">
              {note.teacherName} · {fmtDate(note.createdAt, isArabic)}
            </p>
          </div>
        </div>
        {open
          ? <ChevronUp size={15} className="shrink-0 text-slate-400" />
          : <ChevronDown size={15} className="shrink-0 text-slate-400" />}
      </button>
      {open && (
        <div className="border-t border-slate-100 px-4 py-3">
          <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{note.content}</p>
        </div>
      )}
    </div>
  );
}

/* ─── MarksView (inlined) ────────────────────────────────────────────────── */
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

  if (marks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm">
        <BarChart2 size={48} className="mx-auto text-slate-300" />
        <p className="mt-4 text-lg font-black text-slate-700">
          {isArabic ? 'لا توجد درجات بعد' : 'No marks yet'}
        </p>
        <p className="mt-2 text-sm text-slate-500">
          {isArabic ? 'ستظهر الدرجات هنا بعد أن يُدخلها المدرس' : 'Marks will appear here once the teacher adds them'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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

/* ─── Attendance helpers ─────────────────────────────────────────────────── */
const STATUS_META = {
  PRESENT: { en: 'Present', ar: 'حاضر',  color: '#10b981', bg: 'rgba(16,185,129,0.12)'  },
  ABSENT:  { en: 'Absent',  ar: 'غائب',  color: '#ef4444', bg: 'rgba(239,68,68,0.12)'   },
  LATE:    { en: 'Late',    ar: 'متأخر', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)'  },
  EXCUSED: { en: 'Excused', ar: 'معذور', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)'  },
};
const STATUS_ICON = { PRESENT: '✓', ABSENT: '✗', LATE: '!', EXCUSED: '~' };
const fmtAttDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

function AttendanceView({ records, isArabic }) {
  const counts = Object.fromEntries(
    Object.keys(STATUS_META).map((s) => [s, records.filter((r) => r.status === s).length])
  );

  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-[24px] border-2 border-dashed border-slate-200 bg-white py-20 text-center">
        <ClipboardList size={40} className="mb-4 text-slate-300" />
        <p className="font-bold text-slate-500">
          {isArabic ? 'لا توجد سجلات حضور بعد' : 'No attendance records yet'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Object.entries(STATUS_META).map(([status, meta]) => (
          <div key={status} style={{ background: meta.bg }} className="rounded-2xl p-4 text-center">
            <p style={{ color: meta.color }} className="text-2xl font-black">{counts[status] || 0}</p>
            <p style={{ color: meta.color }} className="text-xs font-bold uppercase">
              {isArabic ? meta.ar : meta.en}
            </p>
          </div>
        ))}
      </div>

      {/* Records list */}
      <div className="flex flex-col gap-2">
        {records.map((rec) => {
          const meta = STATUS_META[rec.status] || STATUS_META.PRESENT;
          return (
            <div key={rec.id} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
              <div style={{ background: meta.bg, color: meta.color }}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black">
                {STATUS_ICON[rec.status] ?? '~'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-bold text-slate-800">
                  {rec.subjectName || (isArabic ? 'مادة' : 'Subject')}
                </p>
                <p className="text-xs text-slate-400">{fmtAttDate(rec.date)}</p>
              </div>
              <span style={{ background: meta.bg, color: meta.color }}
                className="shrink-0 rounded-full px-3 py-1 text-xs font-bold">
                {isArabic ? meta.ar : meta.en}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Main page ──────────────────────────────────────────────────────────── */
export default function ParentDashboardPage() {
  const { isArabic } = useLanguage();
  const user = useSelector(s => s.auth?.user);

  // core data
  const [children, setChildren]   = useState([]);
  const [groups,   setGroups]     = useState([]);
  const [loading,  setLoading]    = useState(true);

  // child-first flow
  const [selectedChild, setSelectedChild] = useState(null);
  const [activeTab,     setActiveTab]     = useState('notes'); // 'notes' | 'marks'

  // marks (lazy)
  const [marksData,     setMarksData]     = useState([]);
  const [loadingMarks,  setLoadingMarks]  = useState(false);
  const [marksFetched,  setMarksFetched]  = useState(false);

  // attendance (lazy)
  const [attendanceData,    setAttendanceData]    = useState([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [attendanceFetched, setAttendanceFetched] = useState(false);

  const totalUnread = groups.reduce((s, g) => s + g.unreadCount, 0);
  const totalNotes  = groups.reduce((s, g) => s + g.notes.length, 0);

  /* initial load */
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [ch, nt] = await Promise.all([fetchMyChildren(), fetchMyNotes()]);
        if (!cancelled) {
          const kids = ch || [];
          const notes = nt || [];
          setChildren(kids);
          setGroups(notes);
        }
      } catch {
        if (!cancelled) { setChildren([]); setGroups([]); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  /* lazy marks load */
  useEffect(() => {
    if (activeTab !== 'marks' || marksFetched || !selectedChild) return;
    let cancelled = false;
    const load = async () => {
      setLoadingMarks(true);
      try {
        const data = await fetchParentChildrenMarks();
        if (!cancelled) { setMarksData(Array.isArray(data) ? data : []); setMarksFetched(true); }
      } catch {
        if (!cancelled) setMarksData([]);
      } finally {
        if (!cancelled) setLoadingMarks(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [activeTab, marksFetched, selectedChild]);

  /* lazy attendance load */
  useEffect(() => {
    if (activeTab !== 'attendance' || attendanceFetched || !selectedChild) return;
    let cancelled = false;
    const load = async () => {
      setLoadingAttendance(true);
      try {
        const data = await fetchChildrenAttendance();
        if (!cancelled) { setAttendanceData(Array.isArray(data) ? data : []); setAttendanceFetched(true); }
      } catch {
        if (!cancelled) setAttendanceData([]);
      } finally {
        if (!cancelled) setLoadingAttendance(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [activeTab, attendanceFetched, selectedChild]);

  /* mark note as read */
  const handleRead = async (noteId) => {
    try {
      await markNoteRead(noteId);
      setGroups(prev => prev.map(g => ({
        ...g,
        notes: g.notes.map(n => n.id === noteId ? { ...n, isRead: true } : n),
        unreadCount: g.notes.filter(n => n.id !== noteId && !n.isRead).length,
      })));
    } catch { /* ignore */ }
  };

  /* derived data for selected child */
  const selectedGroup      = groups.find(g => g.studentId === selectedChild?.studentId);
  const childNotes         = selectedGroup?.notes || [];
  const childUnread        = selectedGroup?.unreadCount || 0;
  const childMarks         = marksData.find(m => m.studentId === selectedChild?.studentId)?.marks || [];
  const childAttendance    = attendanceData.find(a => a.studentId === selectedChild?.studentId)?.records || [];

  /* back to selector */
  const handleBack = () => {
    setSelectedChild(null);
    setActiveTab('notes');
    setAttendanceFetched(false);
    setMarksFetched(false);
  };

  const greeting = isArabic
    ? `أهلاً، ${user?.name || 'ولي الأمر'}`
    : `Welcome, ${user?.name || 'Parent'}`;

  const BackIcon = isArabic ? ArrowRight : ArrowLeft;

  return (
    <ParentLayout unreadCount={totalUnread}>

      {/* ── Hero header ──────────────────────────────────────────────────── */}
      <div className="mb-8 rounded-[24px] bg-gradient-to-br from-indigo-600 to-violet-600 p-6 text-white shadow-lg shadow-indigo-500/20">
        <div className="flex items-center gap-3 mb-1">
          <UserCircle2 size={28} className="opacity-80" />
          <h1 className="text-2xl font-black">{greeting}</h1>
        </div>
        <p className="text-indigo-200 text-sm">
          {isArabic
            ? 'تابع تقدم أبنائك وملاحظات المعلمين من مكان واحد'
            : "Track your children's progress and teacher notes in one place"}
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          {[
            { icon: Users,    value: children.length, label: isArabic ? 'أبنائي'    : 'Children' },
            { icon: FileText, value: totalNotes,      label: isArabic ? 'ملاحظات'   : 'Notes'    },
            { icon: Bell,     value: totalUnread,     label: isArabic ? 'غير مقروء' : 'Unread'   },
          ].map(({ icon: Icon, value, label }) => (
            <div key={label} className="flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2 backdrop-blur-sm">
              <Icon size={15} className="opacity-80" />
              <span className="text-lg font-black">{value}</span>
              <span className="text-xs text-indigo-200">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Loading skeleton ─────────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2].map(i => (
            <div key={i} className="h-32 animate-pulse rounded-[20px] border border-slate-200 bg-slate-50" />
          ))}
        </div>

      /* ── No children linked ─────────────────────────────────────────── */
      ) : children.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[24px] border-2 border-dashed border-slate-200 bg-white py-20 text-center">
          <Users size={40} className="mb-4 text-slate-300" />
          <p className="font-bold text-slate-500">
            {isArabic ? 'لا يوجد أبناء مرتبطون' : 'No children linked yet'}
          </p>
          <p className="mt-1 text-sm text-slate-400">
            {isArabic ? 'تواصل مع المدرسة لربط حساب أبنائك' : 'Contact the school to link your children'}
          </p>
        </div>

      /* ── STEP 1: Child selector (multiple children, none selected) ───── */
      ) : !selectedChild ? (
        <>
          <p className="mb-4 text-sm font-bold text-slate-500 uppercase tracking-wider">
            {isArabic ? 'اختر أحد أبنائك' : 'Select a child'}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {children.map((child, idx) => {
              const color    = AVATAR_COLORS[idx % AVATAR_COLORS.length];
              const initial  = (child.name || '?').charAt(0).toUpperCase();
              const status   = STATUS_MAP[child.academicStatus] || STATUS_MAP.ACTIVE;
              const unread   = groups.find(g => g.studentId === child.studentId)?.unreadCount || 0;
              return (
                <button
                  key={child.studentId}
                  type="button"
                  onClick={() => { setSelectedChild(child); setActiveTab('notes'); }}
                  className="relative rounded-[20px] border border-slate-200 bg-white p-5 text-start shadow-sm transition hover:shadow-md hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  {/* unread badge */}
                  {unread > 0 && (
                    <span className="absolute end-4 top-4 flex h-6 min-w-[24px] items-center justify-center rounded-full bg-rose-500 px-1.5 text-xs font-bold text-white">
                      {unread}
                    </span>
                  )}
                  <div className="flex items-center gap-4">
                    <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl ${color} text-white text-3xl font-black`}>
                      {initial}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-lg font-black text-slate-900">{child.name}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          <GraduationCap size={12} />
                          {isArabic ? `الصف ${child.gradeLevel || '-'}` : `Grade ${child.gradeLevel || '-'}`}
                        </span>
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold ${status.cls}`}>
                          {isArabic ? status.ar : status.en}
                        </span>
                      </div>
                      {unread > 0 && (
                        <p className="mt-2 text-xs font-semibold text-indigo-600">
                          {unread} {isArabic ? 'ملاحظة غير مقروءة' : 'unread note(s)'}
                        </p>
                      )}
                    </div>
                  </div>
                  {/* arrow hint */}
                  <div className="mt-4 flex items-center justify-end gap-1 text-xs font-bold text-indigo-500">
                    {isArabic ? 'عرض التفاصيل' : 'View details'}
                    <BackIcon size={13} className="rotate-180" />
                  </div>
                </button>
              );
            })}
          </div>
        </>

      /* ── STEP 2: Child detail (Notes / Marks) ───────────────────────── */
      ) : (() => {
        const colorIdx = children.findIndex(c => c.studentId === selectedChild.studentId);
        const color    = AVATAR_COLORS[colorIdx % AVATAR_COLORS.length];
        const initial  = (selectedChild.name || '?').charAt(0).toUpperCase();
        const status   = STATUS_MAP[selectedChild.academicStatus] || STATUS_MAP.ACTIVE;

        return (
          <>
            {/* back button — only when multiple children */}
            {children.length > 1 && (
              <button
                type="button"
                onClick={handleBack}
                className="mb-5 flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-indigo-600 transition"
              >
                <BackIcon size={15} />
                {isArabic ? 'رجوع إلى قائمة الأبناء' : 'Back to children'}
              </button>
            )}

            {/* child header strip */}
            <div className="mb-6 flex items-center gap-4 rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm">
              <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${color} text-white text-2xl font-black`}>
                {initial}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-black text-slate-900">{selectedChild.name}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="flex items-center gap-1 text-xs text-slate-500">
                    <GraduationCap size={12} />
                    {isArabic ? `الصف ${selectedChild.gradeLevel || '-'}` : `Grade ${selectedChild.gradeLevel || '-'}`}
                  </span>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold ${status.cls}`}>
                    {isArabic ? status.ar : status.en}
                  </span>
                </div>
              </div>
            </div>

            {/* Notes / Marks / Attendance tab bar */}
            <div className="mb-6 flex gap-1 rounded-2xl border border-slate-200 bg-slate-100 p-1">
              {[
                { id: 'notes',      icon: MessageSquare, en: 'Notes',      ar: 'الملاحظات', badge: childUnread },
                { id: 'marks',      icon: BarChart2,     en: 'Marks',      ar: 'الدرجات'   },
                { id: 'attendance', icon: ClipboardList, en: 'Attendance', ar: 'الحضور'    },
              ].map(({ id, icon: Icon, en, ar, badge }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveTab(id)}
                  className={`relative flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition ${
                    activeTab === id
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Icon size={15} />
                  {isArabic ? ar : en}
                  {badge > 0 && (
                    <span className="absolute -top-1 -end-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                      {badge}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* ── Notes tab ── */}
            {activeTab === 'notes' && (
              childNotes.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-[24px] border-2 border-dashed border-slate-200 bg-white py-20 text-center">
                  <BellOff size={40} className="mb-4 text-slate-300" />
                  <p className="font-bold text-slate-500">
                    {isArabic ? 'لا توجد ملاحظات لهذا الابن' : 'No notes for this child yet'}
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    {isArabic ? 'ستظهر هنا ملاحظات المعلمين عند إضافتها' : 'Teacher notes will appear here once added'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {childNotes.map(note => (
                    <NoteCard key={note.id} note={note} isArabic={isArabic} onRead={handleRead} />
                  ))}
                </div>
              )
            )}

            {/* ── Marks tab ── */}
            {activeTab === 'marks' && (
              loadingMarks ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-24 animate-pulse rounded-[1.5rem] border border-slate-200 bg-slate-50" />
                  ))}
                </div>
              ) : (
                <MarksView marks={childMarks} isArabic={isArabic} />
              )
            )}

            {/* ── Attendance tab ── */}
            {activeTab === 'attendance' && (
              loadingAttendance ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-16 animate-pulse rounded-xl border border-slate-200 bg-slate-50" />
                  ))}
                </div>
              ) : (
                <AttendanceView records={childAttendance} isArabic={isArabic} />
              )
            )}
          </>
        );
      })()}

    </ParentLayout>
  );
}
