// Shared weekly timetable grid — used by org (editable) and teacher/student (read-only)
const DAYS = [
  { num: 1, en: "Monday",    ar: "الاثنين"    },
  { num: 2, en: "Tuesday",   ar: "الثلاثاء"   },
  { num: 3, en: "Wednesday", ar: "الأربعاء"   },
  { num: 4, en: "Thursday",  ar: "الخميس"     },
  { num: 5, en: "Friday",    ar: "الجمعة"     },
  { num: 6, en: "Saturday",  ar: "السبت"      },
];

const PALETTE = [
  { bg: "#dbeafe", border: "#3b82f6", text: "#1e40af" },
  { bg: "#d1fae5", border: "#10b981", text: "#065f46" },
  { bg: "#fef9c3", border: "#eab308", text: "#713f12" },
  { bg: "#fce7f3", border: "#ec4899", text: "#831843" },
  { bg: "#ede9fe", border: "#8b5cf6", text: "#4c1d95" },
  { bg: "#ffedd5", border: "#f97316", text: "#7c2d12" },
  { bg: "#cffafe", border: "#06b6d4", text: "#164e63" },
  { bg: "#fee2e2", border: "#ef4444", text: "#7f1d1d" },
];

const courseColor = (courseId) => PALETTE[(courseId ?? 0) % PALETTE.length];

export default function TimetableGrid({
  slots = [],
  isArabic = false,
  editable = false,
  onEdit,
  onDelete,
  onAddSlot,  // (dayOfWeek, suggestedTime) => void
}) {
  if (slots.length === 0) {
    return (
      <div style={{ padding: "60px 20px", textAlign: "center", borderRadius: 20, border: "2px dashed #e2e8f0", background: "#f8fafc" }}>
        <p style={{ color: "#94a3b8", fontSize: 14, fontWeight: 600 }}>
          {isArabic ? "لا توجد حصص في الجدول بعد" : "No slots in the timetable yet"}
        </p>
        {editable && (
          <p style={{ color: "#cbd5e1", fontSize: 12, marginTop: 6 }}>
            {isArabic ? "اضغط «+ إضافة حصة» لبدء بناء الجدول" : "Click «+ Add Slot» to start building the schedule"}
          </p>
        )}
      </div>
    );
  }

  // Collect unique days that have slots
  const activeDays = DAYS.filter(d => slots.some(s => s.dayOfWeek === d.num));

  // Collect unique time rows sorted
  const timePairs = [...new Map(
    slots.map(s => [`${s.startTime}-${s.endTime}`, { startTime: s.startTime, endTime: s.endTime }])
  ).values()].sort((a, b) => a.startTime.localeCompare(b.startTime));

  const getSlot = (day, startTime) =>
    slots.find(s => s.dayOfWeek === day && s.startTime === startTime) ?? null;

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ borderCollapse: "collapse", width: "100%", minWidth: activeDays.length * 140 + 80 }}>
        <thead>
          <tr>
            {/* Time column header */}
            <th style={thStyle}>{isArabic ? "الوقت" : "Time"}</th>
            {activeDays.map(d => (
              <th key={d.num} style={thStyle}>
                {isArabic ? d.ar : d.en}
                {editable && (
                  <button
                    type="button"
                    onClick={() => onAddSlot?.(d.num, timePairs[0]?.startTime || "08:00")}
                    style={{ display: "block", margin: "4px auto 0", fontSize: 10, padding: "1px 8px", borderRadius: 999, border: "1px solid #6366f1", background: "transparent", color: "#6366f1", cursor: "pointer" }}
                  >
                    +
                  </button>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {timePairs.map(({ startTime, endTime }) => (
            <tr key={startTime}>
              <td style={timeStyle}>{startTime}<br /><span style={{ fontSize: 10, color: "#94a3b8" }}>{endTime}</span></td>
              {activeDays.map(d => {
                const slot = getSlot(d.num, startTime);
                if (!slot) {
                  return (
                    <td key={d.num} style={emptyCellStyle}>
                      {editable && (
                        <button
                          type="button"
                          onClick={() => onAddSlot?.(d.num, startTime)}
                          style={{ width: "100%", height: "100%", minHeight: 48, background: "transparent", border: "none", color: "#e2e8f0", fontSize: 18, cursor: "pointer" }}
                        >
                          +
                        </button>
                      )}
                    </td>
                  );
                }
                const color = courseColor(slot.courseId);
                return (
                  <td key={d.num} style={{ ...cellStyle, padding: 0 }}>
                    <div style={{
                      margin: 4, borderRadius: 10,
                      background: color.bg,
                      border: `1.5px solid ${color.border}`,
                      padding: "8px 10px",
                      position: "relative",
                    }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: color.text }}>{slot.subjectName}</p>
                      {slot.teacherName && (
                        <p style={{ margin: 0, fontSize: 11, color: color.text, opacity: 0.75, marginTop: 2 }}>{slot.teacherName}</p>
                      )}
                      {slot.trackName && (
                        <p style={{ margin: 0, fontSize: 11, color: color.text, opacity: 0.65, marginTop: 1 }}>{slot.trackName}</p>
                      )}
                      {slot.roomNumber && (
                        <p style={{ margin: 0, fontSize: 10, color: color.text, opacity: 0.6, marginTop: 2 }}>
                          {isArabic ? `قاعة ${slot.roomNumber}` : `Room ${slot.roomNumber}`}
                        </p>
                      )}
                      {editable && (
                        <div style={{ position: "absolute", top: 4, right: 4, display: "flex", gap: 2 }}>
                          <button
                            type="button"
                            onClick={() => onEdit?.(slot)}
                            style={{ padding: "1px 5px", borderRadius: 5, border: "none", background: "rgba(255,255,255,0.7)", color: color.text, fontSize: 10, cursor: "pointer", fontWeight: 800 }}
                          >
                            ✎
                          </button>
                          <button
                            type="button"
                            onClick={() => onDelete?.(slot.id)}
                            style={{ padding: "1px 5px", borderRadius: 5, border: "none", background: "rgba(255,255,255,0.7)", color: "#dc2626", fontSize: 10, cursor: "pointer", fontWeight: 800 }}
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const thStyle = {
  padding: "10px 8px", textAlign: "center", fontSize: 12, fontWeight: 800,
  textTransform: "uppercase", letterSpacing: "0.06em", color: "#64748b",
  background: "#f8fafc", borderBottom: "2px solid #e2e8f0", whiteSpace: "nowrap", minWidth: 130,
};

const timeStyle = {
  padding: "8px 12px", textAlign: "center", fontSize: 12, fontWeight: 700,
  color: "#475569", background: "#f8fafc", borderBottom: "1px solid #f1f5f9",
  borderRight: "1px solid #e2e8f0", whiteSpace: "nowrap", minWidth: 72,
};

const cellStyle = {
  borderBottom: "1px solid #f1f5f9", borderRight: "1px solid #f1f5f9",
  verticalAlign: "top", height: 72,
};

const emptyCellStyle = {
  ...cellStyle, background: "#fafafa",
};
