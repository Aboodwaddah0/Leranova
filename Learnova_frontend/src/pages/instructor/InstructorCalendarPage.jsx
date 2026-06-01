import { useCallback } from "react";
import InstructorLayout from "../../components/instructor/InstructorLayout";
import PublicCalendarView from "../../components/shared/PublicCalendarView";
import { fetchInstructorCalendar } from "../../services/instructorService";
import { useLanguage } from "../../utils/i18n";

export default function InstructorCalendarPage() {
  const { isArabic } = useLanguage();
  const fetchEvents = useCallback((params) => fetchInstructorCalendar(params), []);

  return (
    <InstructorLayout
      title={isArabic ? "التقويم المدرسي" : "School Calendar"}
      subtitle={isArabic ? "الأحداث والمناسبات المدرسية" : "School events and occasions"}
    >
      <div style={{ maxWidth: 760 }}>
        <PublicCalendarView isArabic={isArabic} fetchEvents={fetchEvents} />
      </div>
    </InstructorLayout>
  );
}
