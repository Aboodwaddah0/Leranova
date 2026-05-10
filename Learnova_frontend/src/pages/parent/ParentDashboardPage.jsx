import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  Users, MessageSquare, Bell, BellOff,
  ChevronDown, ChevronUp, FileText, GraduationCap,
  CheckCircle, Clock, BookOpen, UserCircle2,
} from 'lucide-react';
import ParentLayout from '../../components/parent/ParentLayout';
import { fetchMyChildren, fetchMyNotes, markNoteRead } from '../../services/parentService';
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

/* ─── Note card ──────────────────────────────────────────────────────────── */
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

/* ─── Child card (overview tab) ──────────────────────────────────────────── */
function ChildCard({ child, unreadCount, isArabic, colorIdx, onViewNotes }) {
  const initial = (child.name || '?').charAt(0).toUpperCase();
  const color   = AVATAR_COLORS[colorIdx % AVATAR_COLORS.length];
  const status  = STATUS_MAP[child.academicStatus] || STATUS_MAP.ACTIVE;

  return (
    <div className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-4">
        <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${color} text-white text-2xl font-black`}>
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-black text-slate-900">{child.name}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1 text-xs text-slate-500">
              <GraduationCap size={12} />
              {isArabic ? `الصف ${child.gradeLevel || '-'}` : `Grade ${child.gradeLevel || '-'}`}
            </span>
            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold ${status.cls}`}>
              {isArabic ? status.ar : status.en}
            </span>
          </div>
        </div>
        {unreadCount > 0 && (
          <span className="flex h-6 min-w-[24px] shrink-0 items-center justify-center rounded-full bg-rose-500 px-1.5 text-xs font-bold text-white">
            {unreadCount}
          </span>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-100 pt-4">
        <div className="rounded-xl bg-slate-50 p-3 text-center">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {isArabic ? 'الملاحظات' : 'Notes'}
          </p>
          <p className="mt-1 text-xl font-black text-slate-900">{unreadCount > 0 ? unreadCount : '—'}</p>
          <p className="text-[10px] text-slate-400">{isArabic ? 'غير مقروء' : 'unread'}</p>
        </div>
        <button
          type="button"
          onClick={onViewNotes}
          className="flex flex-col items-center justify-center rounded-xl bg-indigo-600 p-3 text-center text-white transition hover:bg-indigo-700"
        >
          <MessageSquare size={16} className="mb-1" />
          <span className="text-xs font-bold">{isArabic ? 'عرض الملاحظات' : 'View Notes'}</span>
        </button>
      </div>
    </div>
  );
}

/* ─── Notes group (notes tab) ────────────────────────────────────────────── */
function NotesGroup({ group, isArabic, onRead, colorIdx }) {
  const [open, setOpen] = useState(true);
  const color = AVATAR_COLORS[colorIdx % AVATAR_COLORS.length];
  const initial = (group.studentName || '?').charAt(0).toUpperCase();

  return (
    <div className="overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-sm">
      <button type="button" onClick={() => setOpen(v => !v)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-start">
        <div className="flex items-center gap-3">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${color} text-white font-black`}>
            {initial}
          </div>
          <div>
            <p className="font-bold text-slate-900">{group.studentName}</p>
            <p className="text-xs text-slate-500">
              {group.notes.length} {isArabic ? 'ملاحظة' : 'notes'}
              {group.unreadCount > 0 && ` · ${group.unreadCount} ${isArabic ? 'غير مقروء' : 'unread'}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {group.unreadCount > 0 && (
            <span className="inline-flex h-6 min-w-[24px] items-center justify-center rounded-full bg-indigo-600 px-2 text-xs font-bold text-white">
              {group.unreadCount}
            </span>
          )}
          {open ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-slate-100 px-5 py-4 space-y-2">
          {group.notes.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-400">
              {isArabic ? 'لا توجد ملاحظات' : 'No notes yet'}
            </p>
          ) : group.notes.map(note => (
            <NoteCard key={note.id} note={note} isArabic={isArabic} onRead={onRead} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Main page ──────────────────────────────────────────────────────────── */
export default function ParentDashboardPage() {
  const { isArabic } = useLanguage();
  const user = useSelector(s => s.auth?.user);

  const [children, setChildren] = useState([]);
  const [groups,   setGroups]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [tab,      setTab]      = useState('children'); // 'children' | 'notes'

  const totalUnread  = groups.reduce((s, g) => s + g.unreadCount, 0);
  const totalNotes   = groups.reduce((s, g) => s + g.notes.length, 0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [ch, nt] = await Promise.all([fetchMyChildren(), fetchMyNotes()]);
        if (!cancelled) { setChildren(ch || []); setGroups(nt || []); }
      } catch {
        if (!cancelled) { setChildren([]); setGroups([]); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

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

  // merge children list with their note groups
  const childrenWithNotes = children.map(child => ({
    ...child,
    unreadCount: groups.find(g => g.studentId === child.studentId)?.unreadCount || 0,
  }));

  const greeting = isArabic
    ? `أهلاً، ${user?.name || 'ولي الأمر'}`
    : `Welcome, ${user?.name || 'Parent'}`;

  return (
    <ParentLayout unreadCount={totalUnread}>
      {/* ── Hero header ── */}
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

        {/* stat pills */}
        <div className="mt-5 flex flex-wrap gap-3">
          {[
            { icon: Users,         value: children.length, label: isArabic ? 'أبنائي' : 'Children'    },
            { icon: FileText,      value: totalNotes,      label: isArabic ? 'ملاحظات' : 'Notes'      },
            { icon: Bell,          value: totalUnread,     label: isArabic ? 'غير مقروء' : 'Unread'   },
          ].map(({ icon: Icon, value, label }) => (
            <div key={label} className="flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2 backdrop-blur-sm">
              <Icon size={15} className="opacity-80" />
              <span className="text-lg font-black">{value}</span>
              <span className="text-xs text-indigo-200">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="mb-6 flex gap-1 rounded-2xl border border-slate-200 bg-slate-100 p-1">
        {[
          { id: 'children', icon: Users,        en: 'My Children',    ar: 'أبنائي'        },
          { id: 'notes',    icon: MessageSquare, en: 'Teacher Notes',  ar: 'ملاحظات المعلمين', badge: totalUnread },
        ].map(({ id, icon: Icon, en, ar, badge }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`relative flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition ${
              tab === id
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

      {/* ── Content ── */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2].map(i => (
            <div key={i} className="h-32 animate-pulse rounded-[20px] border border-slate-200 bg-slate-50" />
          ))}
        </div>
      ) : tab === 'children' ? (
        children.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-[24px] border-2 border-dashed border-slate-200 bg-white py-20 text-center">
            <Users size={40} className="mb-4 text-slate-300" />
            <p className="font-bold text-slate-500">{isArabic ? 'لا يوجد أبناء مرتبطون' : 'No children linked yet'}</p>
            <p className="mt-1 text-sm text-slate-400">
              {isArabic ? 'تواصل مع المدرسة لربط حساب أبنائك' : 'Contact the school to link your children'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {childrenWithNotes.map((child, idx) => (
              <ChildCard
                key={child.studentId}
                child={child}
                unreadCount={child.unreadCount}
                isArabic={isArabic}
                colorIdx={idx}
                onViewNotes={() => setTab('notes')}
              />
            ))}
          </div>
        )
      ) : (
        groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-[24px] border-2 border-dashed border-slate-200 bg-white py-20 text-center">
            <BellOff size={40} className="mb-4 text-slate-300" />
            <p className="font-bold text-slate-500">{isArabic ? 'لا توجد ملاحظات حتى الآن' : 'No notes yet'}</p>
            <p className="mt-1 text-sm text-slate-400">
              {isArabic ? 'ستظهر هنا ملاحظات المعلمين عند إضافتها' : 'Teacher notes will appear here once added'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {groups.map((group, idx) => (
              <NotesGroup
                key={group.studentId}
                group={group}
                isArabic={isArabic}
                onRead={handleRead}
                colorIdx={idx}
              />
            ))}
          </div>
        )
      )}
    </ParentLayout>
  );
}
