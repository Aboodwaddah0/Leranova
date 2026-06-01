import { useState, useEffect } from "react";
import StudentLayout from "../../components/student/StudentLayout";
import TimetableGrid from "../../components/shared/TimetableGrid";
import { fetchMyTimetable } from "../../services/studentService";
import { useLanguage } from "../../utils/i18n";

export default function StudentTimetablePage() {
  const { isArabic } = useLanguage();
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetchMyTimetable()
      .then(data => { if (!cancelled) setSlots(Array.isArray(data) ? data : []); })
      .catch(() => { if (!cancelled) setError(isArabic ? "تعذّر تحميل الجدول" : "Failed to load timetable"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [isArabic]);

  return (
    <StudentLayout>
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-600">
            {isArabic ? "الجدول الدراسي" : "Class Timetable"}
          </p>
          <h1 className="mt-1 text-2xl font-black text-slate-900">
            {isArabic ? "جدولي الأسبوعي" : "My Weekly Schedule"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {isArabic ? "جدول حصص صفك الأسبوعي" : "Your class weekly period schedule"}
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          </div>
        ) : (
          <div className="rounded-3xl border border-slate-200 bg-white p-2 shadow-sm overflow-hidden">
            <TimetableGrid slots={slots} isArabic={isArabic} editable={false} />
          </div>
        )}
      </div>
    </StudentLayout>
  );
}
