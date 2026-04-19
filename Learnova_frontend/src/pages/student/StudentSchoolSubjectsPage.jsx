import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, BookOpenText, MessageCircle, PlayCircle } from 'lucide-react';
import StudentLayout from '../../components/student/StudentLayout';
import { fetchSchoolMySubjects, fetchStudentContext } from '../../services/studentService';
import { useLanguage } from '../../utils/i18n';

export default function StudentSchoolSubjectsPage() {
  const { isArabic } = useLanguage();
  const [context, setContext] = useState(null);
  const [payload, setPayload] = useState({ class: null, subjects: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      const [ctx, data] = await Promise.all([fetchStudentContext(), fetchSchoolMySubjects()]);
      if (cancelled) return;
      setContext(ctx);
      setPayload(data || { class: null, subjects: [] });
      setLoading(false);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (context && context.mode === 'ACADEMY') {
    return null;
  }

  return (
    <StudentLayout
      title={isArabic ? 'موادّي' : 'My Subjects'}
      subtitle={isArabic ? 'مواد الصف الحالية' : 'Current class subjects'}
      actions={
        <Link to="/student/chat" className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
          <MessageCircle size={16} /> {isArabic ? 'دردشة الصف' : 'Class chat'}
        </Link>
      }
    >
      <div className="rounded-[1.75rem] border border-white/70 bg-white/85 p-5 shadow-xl shadow-indigo-500/5 backdrop-blur-xl">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-indigo-600">{isArabic ? 'الصف' : 'Class'}</p>
        <h2 className="mt-2 text-2xl font-black text-slate-900">{payload?.class?.name || (isArabic ? 'صف غير محدد' : 'Unassigned class')}</h2>
        <p className="mt-2 text-sm text-slate-600">
          {isArabic ? 'هذه المواد مرتبطة مباشرة بصفك فقط.' : 'These subjects are linked to your assigned class only.'}
        </p>
      </div>

      {loading ? (
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-3xl border border-white/70 bg-white/85 shadow-xl shadow-indigo-500/5" />
          ))}
        </div>
      ) : (
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {(payload?.subjects || []).map((subject) => (
            <Link
              key={subject.id}
              to={`/courses/${payload?.class?.id}/subjects/${subject.id}`}
              className="group rounded-3xl border border-white/70 bg-white/90 p-5 shadow-lg shadow-indigo-500/5 transition hover:-translate-y-0.5 hover:border-indigo-200"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-lg font-black text-slate-900 group-hover:text-indigo-700">{subject.name}</p>
                  <p className="mt-1 text-sm text-slate-500">{subject.teacher?.name || (isArabic ? 'مدرس غير محدد' : 'Unassigned teacher')}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                  <BookOpenText size={18} />
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between text-xs font-semibold text-slate-500">
                <span>{subject.lessonCount || 0} {isArabic ? 'دروس' : 'lessons'}</span>
                <span className="inline-flex items-center gap-1 text-indigo-600">
                  <PlayCircle size={14} /> {isArabic ? 'فتح المادة' : 'Open subject'}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {!loading && !(payload?.subjects || []).length ? (
        <div className="mt-6 rounded-[1.75rem] border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-sm text-slate-500">
          {isArabic ? 'لا توجد مواد مرتبطة بالصف حالياً.' : 'No subjects are assigned to this class yet.'}
        </div>
      ) : null}

      <div className="mt-6">
        <Link to="/dashboard/student" className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
          <ArrowLeft size={16} /> {isArabic ? 'العودة للوحة الطالب' : 'Back to dashboard'}
        </Link>
      </div>
    </StudentLayout>
  );
}
