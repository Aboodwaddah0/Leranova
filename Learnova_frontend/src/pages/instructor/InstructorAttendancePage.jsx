import { useState, useEffect, useCallback } from "react";
import InstructorLayout from "../../components/instructor/InstructorLayout";
import { useLanguage } from "../../utils/i18n";
import {
  fetchInstructorSubjects,
  fetchSubjectStudentsForAttendance,
  fetchSubjectAttendance,
  saveSubjectAttendance,
} from "../../services/instructorService";

const STATUS_OPTIONS = [
  { value: "PRESENT",  labelEn: "Present",  labelAr: "حاضر",   color: "#10b981", bg: "rgba(16,185,129,0.12)" },
  { value: "ABSENT",   labelEn: "Absent",   labelAr: "غائب",   color: "#ef4444", bg: "rgba(239,68,68,0.12)"  },
  { value: "LATE",     labelEn: "Late",     labelAr: "متأخر",  color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  { value: "EXCUSED",  labelEn: "Excused",  labelAr: "معذور",  color: "#8b5cf6", bg: "rgba(139,92,246,0.12)" },
];

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function InstructorAttendancePage() {
  const { isArabic } = useLanguage();

  const [subjects, setSubjects] = useState([]);
  const [subjectId, setSubjectId] = useState("");
  const [date, setDate] = useState(todayStr());

  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // Load teacher's subjects on mount
  useEffect(() => {
    fetchInstructorSubjects()
      .then(setSubjects)
      .catch(() => setSubjects([]));
  }, []);

  // Load students + existing attendance when subject or date changes
  const loadData = useCallback(async () => {
    if (!subjectId) return;
    setLoadingStudents(true);
    setError("");
    setSaved(false);
    try {
      const [studentList, existingRecords] = await Promise.all([
        fetchSubjectStudentsForAttendance(Number(subjectId)),
        fetchSubjectAttendance(Number(subjectId), { date }),
      ]);
      setStudents(studentList);

      // Default everyone to PRESENT, then override with saved records
      const map = {};
      studentList.forEach((s) => { map[s.id] = "PRESENT"; });
      existingRecords.forEach((rec) => { if (map[rec.studentId] !== undefined) map[rec.studentId] = rec.status; });
      setAttendance(map);
    } catch (err) {
      setError(err?.response?.data?.message || (isArabic ? "تعذّر تحميل البيانات" : "Failed to load data"));
    } finally {
      setLoadingStudents(false);
    }
  }, [subjectId, date, isArabic]);

  useEffect(() => { loadData(); }, [loadData]);

  const setStatus = (studentId, status) => {
    setSaved(false);
    setAttendance((prev) => ({ ...prev, [studentId]: status }));
  };

  const markAll = (status) => {
    setSaved(false);
    const next = {};
    students.forEach((s) => { next[s.id] = status; });
    setAttendance(next);
  };

  const handleSave = async () => {
    if (!subjectId || students.length === 0) return;
    setSaving(true);
    setError("");
    try {
      const records = students.map((s) => ({ studentId: s.id, status: attendance[s.id] || "PRESENT" }));
      await saveSubjectAttendance(Number(subjectId), { date, records });
      setSaved(true);
    } catch (err) {
      setError(err?.response?.data?.message || (isArabic ? "حدث خطأ أثناء الحفظ" : "Failed to save"));
    } finally {
      setSaving(false);
    }
  };

  const counts = STATUS_OPTIONS.reduce((acc, s) => {
    acc[s.value] = Object.values(attendance).filter((v) => v === s.value).length;
    return acc;
  }, {});

  const selectedSubject = subjects.find((s) => String(s.id) === String(subjectId));

  return (
    <InstructorLayout
      title={isArabic ? "الحضور" : "Attendance"}
      subtitle={isArabic ? "سجّل حضور طلابك لكل مادة تدرّسها" : "Record attendance for each subject you teach"}
    >
      <div style={{ maxWidth: 760 }}>

        {/* Subject + Date selectors */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", display: "block", marginBottom: 4 }}>
              {isArabic ? "المادة" : "Subject"}
            </label>
            <select
              value={subjectId}
              onChange={(e) => { setSubjectId(e.target.value); setSaved(false); }}
              style={{ width: "100%", padding: "10px 14px", borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 14, background: "#fff" }}
            >
              <option value="">{isArabic ? "-- اختر المادة --" : "-- Select subject --"}</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}{s.track?.Name ? ` · ${s.track.Name}` : ""}
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

        {/* Feedback */}
        {error && (
          <div style={{ marginBottom: 14, padding: "10px 16px", borderRadius: 10, background: "#fee2e2", color: "#991b1b", fontSize: 13, fontWeight: 600 }}>
            {error}
          </div>
        )}
        {saved && (
          <div style={{ marginBottom: 14, padding: "10px 16px", borderRadius: 10, background: "#d1fae5", color: "#065f46", fontSize: 13, fontWeight: 600 }}>
            {isArabic ? "✓ تم حفظ الحضور بنجاح" : "✓ Attendance saved successfully"}
          </div>
        )}

        {/* Empty state */}
        {!subjectId ? (
          <div style={{ padding: "60px 20px", textAlign: "center", borderRadius: 20, border: "2px dashed #e2e8f0", background: "#f8fafc" }}>
            <p style={{ color: "#94a3b8", fontSize: 14, fontWeight: 600 }}>
              {isArabic ? "اختر مادة لبدء تسجيل الحضور" : "Select a subject to start marking attendance"}
            </p>
          </div>
        ) : loadingStudents ? (
          <div style={{ padding: "40px 0", textAlign: "center" }}>
            <div style={{ display: "inline-block", width: 28, height: 28, borderRadius: "50%", border: "3px solid #6366f1", borderTopColor: "transparent", animation: "spin 0.7s linear infinite" }} />
          </div>
        ) : students.length === 0 ? (
          <div style={{ padding: "60px 20px", textAlign: "center", borderRadius: 20, border: "2px dashed #e2e8f0", background: "#f8fafc" }}>
            <p style={{ color: "#94a3b8", fontSize: 14, fontWeight: 600 }}>
              {isArabic ? "لا يوجد طلاب في هذه المادة" : "No students enrolled in this subject"}
            </p>
          </div>
        ) : (
          <>
            {/* Status summary */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 16 }}>
              {STATUS_OPTIONS.map((s) => (
                <div key={s.value} style={{ padding: "10px 14px", borderRadius: 14, background: s.bg, textAlign: "center" }}>
                  <p style={{ fontSize: 22, fontWeight: 900, color: s.color, margin: 0 }}>{counts[s.value] || 0}</p>
                  <p style={{ fontSize: 11, fontWeight: 700, color: s.color, margin: 0 }}>{isArabic ? s.labelAr : s.labelEn}</p>
                </div>
              ))}
            </div>

            {/* Mark-all shortcuts */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8" }}>
                {isArabic ? "تحديد الكل:" : "Mark all:"}
              </span>
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => markAll(s.value)}
                  style={{ padding: "4px 12px", borderRadius: 999, fontSize: 11, fontWeight: 700, border: "none", background: s.bg, color: s.color, cursor: "pointer" }}
                >
                  {isArabic ? s.labelAr : s.labelEn}
                </button>
              ))}
            </div>

            {/* Student rows */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
              {students.map((student, idx) => {
                const currentStatus = attendance[student.id] || "PRESENT";
                const meta = STATUS_OPTIONS.find((s) => s.value === currentStatus) || STATUS_OPTIONS[0];
                return (
                  <div
                    key={student.id}
                    style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "12px 16px", borderRadius: 14,
                      border: "1px solid #e2e8f0", background: "#fff",
                    }}
                  >
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
                            padding: "5px 12px", borderRadius: 999, fontSize: 11, fontWeight: 700,
                            border: currentStatus === s.value ? "none" : "1px solid #e2e8f0",
                            background: currentStatus === s.value ? s.color : "transparent",
                            color: currentStatus === s.value ? "#fff" : "#94a3b8",
                            cursor: "pointer", transition: "all 0.15s",
                          }}
                        >
                          {isArabic ? s.labelAr : s.labelEn}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Save button */}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              style={{
                width: "100%", padding: "14px 0", borderRadius: 14,
                background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                color: "#fff", fontWeight: 800, fontSize: 15,
                border: "none", cursor: saving ? "not-allowed" : "pointer",
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? (isArabic ? "جاري الحفظ..." : "Saving...") : (isArabic ? "حفظ الحضور" : "Save Attendance")}
            </button>
          </>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </InstructorLayout>
  );
}
