import { useState, useEffect, useCallback } from "react";
import api from "../../utils/api";
import { formatGradeName } from "../../utils/gradeHelpers";

const STATUS_OPTIONS = [
  { value: "PRESENT",  label: "Present",  ar: "حاضر",   color: "#10b981", bg: "rgba(16,185,129,0.1)" },
  { value: "ABSENT",   label: "Absent",   ar: "غائب",   color: "#ef4444", bg: "rgba(239,68,68,0.1)"  },
  { value: "LATE",     label: "Late",     ar: "متأخر",  color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  { value: "EXCUSED",  label: "Excused",  ar: "معذور",  color: "#8b5cf6", bg: "rgba(139,92,246,0.1)" },
];

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function AttendanceTracker({ isArabic, courses }) {
  const [classId, setClassId] = useState("");
  const [date, setDate] = useState(todayStr());
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const loadStudents = useCallback(async () => {
    if (!classId) return;
    setStudentsLoading(true);
    setError("");
    setSaved(false);
    try {
      const studentsRes = await api.get(`/attendance/class/${classId}/students`);
      const list = studentsRes.data?.data || [];
      setStudents(list);

      const attRes = await api.get(`/attendance/class/${classId}?date=${date}`);
      const existing = attRes.data?.data || [];
      const map = {};
      list.forEach((s) => { map[s.id] = "PRESENT"; });
      existing.forEach((rec) => { if (map[rec.studentId] !== undefined) map[rec.studentId] = rec.status; });
      setAttendance(map);
    } catch {
      setError(isArabic ? "تعذّر تحميل الطلاب" : "Failed to load students");
    } finally {
      setStudentsLoading(false);
    }
  }, [classId, date, isArabic]);

  useEffect(() => { loadStudents(); }, [loadStudents]);

  const setStatus = (studentId, status) => {
    setAttendance((prev) => ({ ...prev, [studentId]: status }));
    setSaved(false);
  };

  const handleMarkAll = (status) => {
    const next = {};
    students.forEach((s) => { next[s.id] = status; });
    setAttendance(next);
    setSaved(false);
  };

  const handleSubmit = async () => {
    if (!classId || students.length === 0) return;
    setSaving(true);
    setError("");
    try {
      const records = students.map((s) => ({ studentId: s.id, status: attendance[s.id] || "PRESENT" }));
      await api.post(`/attendance/class/${classId}`, { date, records });
      setSaved(true);
    } catch (err) {
      setError(err?.response?.data?.message || (isArabic ? "حدث خطأ أثناء الحفظ" : "Failed to save attendance"));
    } finally {
      setSaving(false);
    }
  };

  const counts = STATUS_OPTIONS.reduce((acc, s) => {
    acc[s.value] = Object.values(attendance).filter((v) => v === s.value).length;
    return acc;
  }, {});

  const classCourses = Array.isArray(courses)
    ? courses.filter((c) => String(c.kind || c.Kind || "CLASS").toUpperCase() === "CLASS" || true)
    : [];

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", color: "#6366f1" }}>
          {isArabic ? "متابعة الحضور" : "Attendance Tracking"}
        </p>
        <h2 style={{ fontSize: 22, fontWeight: 900, color: "#1e293b", marginTop: 2 }}>
          {isArabic ? "تسجيل الحضور اليومي" : "Daily Attendance"}
        </h2>
      </div>

      {/* Selectors */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", display: "block", marginBottom: 4 }}>
            {isArabic ? "الصف" : "Class / Grade"}
          </label>
          <select
            value={classId}
            onChange={(e) => { setClassId(e.target.value); setSaved(false); }}
            style={{ width: "100%", padding: "10px 14px", borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 14, background: "#fff" }}
          >
            <option value="">{isArabic ? "-- اختر صف --" : "-- Select class --"}</option>
            {classCourses.map((c) => (
              <option key={c.id} value={c.id}>
                {formatGradeName(c, true, isArabic) || c.Name || c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", display: "block", marginBottom: 4 }}>
            {isArabic ? "التاريخ" : "Date"}
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => { setDate(e.target.value); setSaved(false); }}
            style={{ width: "100%", padding: "10px 14px", borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 14, boxSizing: "border-box" }}
          />
        </div>
      </div>

      {error && <div style={{ marginBottom: 14, padding: "10px 16px", borderRadius: 10, background: "#fee2e2", color: "#991b1b", fontSize: 13, fontWeight: 600 }}>{error}</div>}
      {saved && <div style={{ marginBottom: 14, padding: "10px 16px", borderRadius: 10, background: "#d1fae5", color: "#065f46", fontSize: 13, fontWeight: 600 }}>{isArabic ? "تم حفظ الحضور بنجاح ✓" : "Attendance saved successfully ✓"}</div>}

      {!classId ? (
        <div style={{ padding: "60px 20px", textAlign: "center", borderRadius: 20, border: "2px dashed #e2e8f0", background: "#f8fafc" }}>
          <p style={{ color: "#94a3b8", fontSize: 14, fontWeight: 600 }}>
            {isArabic ? "اختر صفًا لتسجيل الحضور" : "Select a class to start marking attendance"}
          </p>
        </div>
      ) : studentsLoading ? (
        <div style={{ padding: "40px 0", textAlign: "center" }}>
          <div style={{ display: "inline-block", width: 28, height: 28, borderRadius: "50%", border: "3px solid #6366f1", borderTopColor: "transparent", animation: "spin 0.7s linear infinite" }} />
        </div>
      ) : students.length === 0 ? (
        <div style={{ padding: "60px 20px", textAlign: "center", borderRadius: 20, border: "2px dashed #e2e8f0", background: "#f8fafc" }}>
          <p style={{ color: "#94a3b8", fontSize: 14, fontWeight: 600 }}>
            {isArabic ? "لا يوجد طلاب في هذا الصف" : "No students in this class"}
          </p>
        </div>
      ) : (
        <>
          {/* Summary counts */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 16 }}>
            {STATUS_OPTIONS.map((s) => (
              <div key={s.value} style={{ padding: "10px 14px", borderRadius: 14, background: s.bg, textAlign: "center" }}>
                <p style={{ fontSize: 22, fontWeight: 900, color: s.color, margin: 0 }}>{counts[s.value] || 0}</p>
                <p style={{ fontSize: 11, fontWeight: 700, color: s.color, margin: 0 }}>{isArabic ? s.ar : s.label}</p>
              </div>
            ))}
          </div>

          {/* Mark all buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8" }}>
              {isArabic ? "تحديد الكل:" : "Mark all:"}
            </span>
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => handleMarkAll(s.value)}
                style={{ padding: "4px 12px", borderRadius: 999, fontSize: 11, fontWeight: 700, border: "none", background: s.bg, color: s.color, cursor: "pointer" }}
              >
                {isArabic ? s.ar : s.label}
              </button>
            ))}
          </div>

          {/* Student rows */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
            {students.map((student, idx) => {
              const currentStatus = attendance[student.id] || "PRESENT";
              const meta = STATUS_OPTIONS.find((s) => s.value === currentStatus) || STATUS_OPTIONS[0];
              return (
                <div key={student.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 14, border: "1px solid #e2e8f0", background: "#fff" }}>
                  <span style={{ width: 28, height: 28, borderRadius: "50%", background: "#6366f1", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, flexShrink: 0 }}>
                    {idx + 1}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: "#1e293b", margin: 0 }}>{student.name || (isArabic ? "طالب" : "Student")}</p>
                    {student.gradeLevel && (
                      <p style={{ fontSize: 11, color: "#94a3b8", margin: 0 }}>
                        {isArabic ? `الصف ${student.gradeLevel}` : `Grade ${student.gradeLevel}`}
                      </p>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    {STATUS_OPTIONS.map((s) => (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => setStatus(student.id, s.value)}
                        style={{
                          padding: "5px 12px",
                          borderRadius: 999,
                          fontSize: 11,
                          fontWeight: 700,
                          border: currentStatus === s.value ? "none" : "1px solid #e2e8f0",
                          background: currentStatus === s.value ? s.color : "transparent",
                          color: currentStatus === s.value ? "#fff" : "#94a3b8",
                          cursor: "pointer",
                          transition: "all 0.15s",
                        }}
                      >
                        {isArabic ? s.ar : s.label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Submit */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving || students.length === 0}
            style={{
              width: "100%",
              padding: "14px 0",
              borderRadius: 14,
              background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
              color: "#fff",
              fontWeight: 800,
              fontSize: 15,
              border: "none",
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving
              ? (isArabic ? "جاري الحفظ..." : "Saving...")
              : (isArabic ? "حفظ الحضور" : "Save Attendance")}
          </button>
        </>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
