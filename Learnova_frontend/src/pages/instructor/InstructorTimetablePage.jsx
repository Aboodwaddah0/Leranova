import { useState, useEffect } from "react";
import InstructorLayout from "../../components/instructor/InstructorLayout";
import TimetableGrid from "../../components/shared/TimetableGrid";
import { fetchMyTimetable } from "../../services/instructorService";
import { useLanguage } from "../../utils/i18n";

export default function InstructorTimetablePage() {
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
    <InstructorLayout
      title={isArabic ? "الجدول الدراسي" : "My Timetable"}
      subtitle={isArabic ? "جدولك الأسبوعي لجميع الحصص" : "Your weekly teaching schedule"}
    >
      <div style={{ maxWidth: 900 }}>
        {error && (
          <div style={{ marginBottom: 16, padding: "10px 16px", borderRadius: 10, background: "#fee2e2", color: "#991b1b", fontSize: 13, fontWeight: 600 }}>{error}</div>
        )}
        {loading ? (
          <div style={{ padding: "40px 0", textAlign: "center" }}>
            <div style={{ display: "inline-block", width: 28, height: 28, borderRadius: "50%", border: "3px solid #6366f1", borderTopColor: "transparent", animation: "spin .7s linear infinite" }} />
          </div>
        ) : (
          <div style={{ borderRadius: 16, border: "1px solid #e2e8f0", background: "#fff", overflow: "hidden" }}>
            <TimetableGrid slots={slots} isArabic={isArabic} editable={false} />
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </InstructorLayout>
  );
}
