import { useCallback } from "react";
import StudentLayout from "../../components/student/StudentLayout";
import PublicCalendarView from "../../components/shared/PublicCalendarView";
import { fetchMyCalendar } from "../../services/studentService";
import { useLanguage } from "../../utils/i18n";

export default function StudentCalendarPage() {
  const { isArabic } = useLanguage();
  const fetchEvents = useCallback((params) => fetchMyCalendar(params), []);

  return (
    <StudentLayout>
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-600">
            {isArabic ? "التقويم المدرسي" : "School Calendar"}
          </p>
          <h1 className="mt-1 text-2xl font-black text-slate-900">
            {isArabic ? "الأحداث والمناسبات" : "Events & Occasions"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {isArabic ? "جميع الأحداث المدرسية المنشورة" : "All published school events"}
          </p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <PublicCalendarView isArabic={isArabic} fetchEvents={fetchEvents} />
        </div>
      </div>
    </StudentLayout>
  );
}
