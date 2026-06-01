import { useState, useEffect, useCallback, useMemo } from "react";
import TimetableGrid from "../shared/TimetableGrid";
import {
  fetchTimetable,
  createTimetableSlot,
  updateTimetableSlot,
  deleteTimetableSlot,
} from "../../services/organizationService";
import { formatGradeName } from "../../utils/gradeHelpers";

const DAYS = [
  { num: 1, en: "Monday",    ar: "الاثنين"  },
  { num: 2, en: "Tuesday",   ar: "الثلاثاء" },
  { num: 3, en: "Wednesday", ar: "الأربعاء" },
  { num: 4, en: "Thursday",  ar: "الخميس"   },
  { num: 5, en: "Friday",    ar: "الجمعة"   },
  { num: 6, en: "Saturday",  ar: "السبت"    },
];

const EMPTY_FORM = { trackId: "", courseId: "", teacherId: "", teacherName: "", dayOfWeek: "", startTime: "08:00", endTime: "08:45", roomNumber: "" };

export default function TimetableManager({ isArabic, courses = [], subjectsByCourse = {}, academicYears = [] }) {
  const [selectedTrack, setSelectedTrack] = useState("");
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const t = (ar, en) => isArabic ? ar : en;

  // Subjects for the selected class (with teacher info)
  const classSubjects = selectedTrack ? (subjectsByCourse[selectedTrack] || []) : [];

  const load = useCallback(async () => {
    if (!selectedTrack) { setSlots([]); return; }
    setLoading(true);
    setError("");
    try {
      const data = await fetchTimetable({ trackId: selectedTrack });
      setSlots(Array.isArray(data) ? data : []);
    } catch {
      setError(t("تعذّر تحميل الجدول", "Failed to load timetable"));
    } finally {
      setLoading(false);
    }
  }, [selectedTrack]); // eslint-disable-line

  useEffect(() => { load(); }, [load]);

  // Conflict detection: does an existing slot occupy the same day+time? (excluding edit target)
  const conflict = useMemo(() => {
    if (!form.dayOfWeek || !form.startTime) return null;
    return slots.find(s =>
      s.dayOfWeek === Number(form.dayOfWeek) &&
      s.startTime === form.startTime &&
      (!editTarget || s.id !== editTarget.id)
    ) || null;
  }, [slots, form.dayOfWeek, form.startTime, editTarget]);

  // Auto-fill teacher when subject changes
  const handleSubjectChange = (courseId) => {
    const subject = classSubjects.find(s => String(s.id) === String(courseId));
    const teacherId   = subject?.Teacher_id ? String(subject.Teacher_id) : "";
    const teacherName = subject?.teacher?.user?.name || "";
    setForm(f => ({ ...f, courseId, teacherId, teacherName }));
  };

  const openCreate = (dayOfWeek = "", startTime = "08:00") => {
    setEditTarget(null);
    setForm({ ...EMPTY_FORM, trackId: selectedTrack, dayOfWeek: String(dayOfWeek), startTime });
    setModalOpen(true);
  };

  const openEdit = (slot) => {
    setEditTarget(slot);
    // Find teacher name from classSubjects
    const subject = classSubjects.find(s => s.id === slot.courseId);
    setForm({
      trackId:     String(slot.trackId),
      courseId:    String(slot.courseId),
      teacherId:   slot.teacherId ? String(slot.teacherId) : "",
      teacherName: slot.teacherName || subject?.teacher?.user?.name || "",
      dayOfWeek:   String(slot.dayOfWeek),
      startTime:   slot.startTime,
      endTime:     slot.endTime,
      roomNumber:  slot.roomNumber || "",
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = {
        trackId:    Number(form.trackId),
        courseId:   Number(form.courseId),
        teacherId:  form.teacherId ? Number(form.teacherId) : null,
        dayOfWeek:  Number(form.dayOfWeek),
        startTime:  form.startTime,
        endTime:    form.endTime,
        roomNumber: form.roomNumber || null,
      };
      if (editTarget) {
        await updateTimetableSlot(editTarget.id, payload);
      } else {
        await createTimetableSlot(payload);
      }
      setModalOpen(false);
      setError("");
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || t("حدث خطأ أثناء الحفظ", "Failed to save"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    setSaving(true);
    try {
      await deleteTimetableSlot(id);
      setDeleteConfirm(null);
      await load();
    } catch {
      setError(t("تعذّر الحذف", "Failed to delete"));
    } finally {
      setSaving(false);
    }
  };

  const classCourses = courses.filter(c => (c.kind || c.Kind || "CLASS").toString().toUpperCase() === "CLASS");

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", color: "#6366f1" }}>
          {t("الجدول الدراسي", "Class Timetable")}
        </p>
        <h2 style={{ fontSize: 22, fontWeight: 900, color: "#1e293b", marginTop: 2 }}>
          {t("إدارة الجدول الأسبوعي", "Weekly Schedule Management")}
        </h2>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 20 }}>
        <div>
          <label style={labelStyle}>{t("الصف / الشعبة", "Class / Grade")}</label>
          <select value={selectedTrack} onChange={e => setSelectedTrack(e.target.value)} style={selectStyle}>
            <option value="">{t("-- اختر الصف --", "-- Select class --")}</option>
            {classCourses.map(c => (
              <option key={c.id} value={c.id}>
                {formatGradeName(c, true, isArabic) || c.Name || c.name}
              </option>
            ))}
          </select>
        </div>
        {selectedTrack && (
          <button
            type="button"
            onClick={() => openCreate()}
            style={{ padding: "10px 20px", borderRadius: 12, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", fontWeight: 800, fontSize: 13, border: "none", cursor: "pointer" }}
          >
            {t("+ إضافة حصة", "+ Add Slot")}
          </button>
        )}
      </div>

      {error && !modalOpen && (
        <div style={{ marginBottom: 14, padding: "10px 16px", borderRadius: 10, background: "#fee2e2", color: "#991b1b", fontSize: 13, fontWeight: 600 }}>{error}</div>
      )}

      {!selectedTrack ? (
        <div style={{ padding: "60px 20px", textAlign: "center", borderRadius: 20, border: "2px dashed #e2e8f0", background: "#f8fafc" }}>
          <p style={{ color: "#94a3b8", fontSize: 14, fontWeight: 600 }}>
            {t("اختر صفًا لعرض أو إنشاء الجدول", "Select a class to view or create its timetable")}
          </p>
        </div>
      ) : loading ? (
        <div style={{ padding: "40px 0", textAlign: "center" }}>
          <div style={{ display: "inline-block", width: 28, height: 28, borderRadius: "50%", border: "3px solid #6366f1", borderTopColor: "transparent", animation: "spin .7s linear infinite" }} />
        </div>
      ) : (
        <div style={{ borderRadius: 16, border: "1px solid #e2e8f0", background: "#fff", overflow: "hidden" }}>
          <TimetableGrid
            slots={slots}
            isArabic={isArabic}
            editable
            onEdit={openEdit}
            onDelete={(id) => setDeleteConfirm(id)}
            onAddSlot={openCreate}
          />
        </div>
      )}

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.4)", padding: 16 }}>
          <div style={{ width: "100%", maxWidth: 460, borderRadius: 24, background: "#fff", boxShadow: "0 20px 60px rgba(0,0,0,0.2)", overflow: "hidden" }}>
            <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #f1f5f9" }}>
              <h3 style={{ fontSize: 18, fontWeight: 900, color: "#1e293b", margin: 0 }}>
                {editTarget ? t("تعديل الحصة", "Edit Slot") : t("إضافة حصة جديدة", "Add New Slot")}
              </h3>
            </div>
            <form onSubmit={handleSave} style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>

              {/* Subject — auto-fills teacher */}
              <div>
                <label style={labelStyle}>{t("المادة *", "Subject *")}</label>
                <select
                  required
                  value={form.courseId}
                  onChange={e => handleSubjectChange(e.target.value)}
                  style={selectStyle}
                >
                  <option value="">{t("-- اختر المادة --", "-- Select subject --")}</option>
                  {classSubjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* Teacher — auto-filled, read-only */}
              {form.teacherName && (
                <div style={{ padding: "8px 12px", borderRadius: 10, background: "#f0fdf4", border: "1px solid #bbf7d0", fontSize: 13 }}>
                  <span style={{ fontWeight: 600, color: "#166534" }}>
                    {t("المعلم:", "Teacher:")} {form.teacherName}
                  </span>
                </div>
              )}
              {form.courseId && !form.teacherName && (
                <div style={{ padding: "8px 12px", borderRadius: 10, background: "#fef9c3", border: "1px solid #fde047", fontSize: 13, color: "#713f12" }}>
                  {t("⚠ لم يُعيَّن معلم لهذه المادة بعد", "⚠ No teacher assigned to this subject yet")}
                </div>
              )}

              {/* Day + Time row */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <div>
                  <label style={labelStyle}>{t("اليوم *", "Day *")}</label>
                  <select
                    required
                    value={form.dayOfWeek}
                    onChange={e => setForm(f => ({ ...f, dayOfWeek: e.target.value }))}
                    style={selectStyle}
                  >
                    <option value="">{t("اليوم", "Day")}</option>
                    {DAYS.map(d => <option key={d.num} value={d.num}>{isArabic ? d.ar : d.en}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>{t("من *", "From *")}</label>
                  <input
                    required
                    type="time"
                    value={form.startTime}
                    onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
                    style={selectStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>{t("إلى *", "To *")}</label>
                  <input
                    required
                    type="time"
                    value={form.endTime}
                    onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))}
                    style={selectStyle}
                  />
                </div>
              </div>

              {/* Conflict warning */}
              {conflict && (
                <div style={{ padding: "10px 14px", borderRadius: 10, background: "#fef2f2", border: "1.5px solid #fca5a5", fontSize: 13 }}>
                  <p style={{ margin: 0, fontWeight: 800, color: "#991b1b" }}>
                    {t("⚠ تعارض في الجدول!", "⚠ Schedule conflict!")}
                  </p>
                  <p style={{ margin: "4px 0 0", color: "#b91c1c", fontSize: 12 }}>
                    {t(
                      `يوجد بالفعل حصة "${conflict.subjectName}" في هذا الوقت`,
                      `"${conflict.subjectName}" already occupies this time slot`
                    )}
                  </p>
                </div>
              )}

              {/* Room */}
              <div>
                <label style={labelStyle}>{t("رقم القاعة", "Room Number")}</label>
                <input
                  type="text"
                  value={form.roomNumber}
                  onChange={e => setForm(f => ({ ...f, roomNumber: e.target.value }))}
                  placeholder={t("مثال: 101", "e.g. 101")}
                  style={selectStyle}
                />
              </div>

              {error && (
                <p style={{ fontSize: 12, color: "#dc2626", fontWeight: 600, margin: 0 }}>{error}</p>
              )}

              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button
                  type="submit"
                  disabled={saving || !!conflict}
                  style={{
                    flex: 1, padding: "11px 0", borderRadius: 12,
                    background: conflict ? "#e2e8f0" : "linear-gradient(135deg,#6366f1,#8b5cf6)",
                    color: conflict ? "#94a3b8" : "#fff",
                    fontWeight: 800, fontSize: 14, border: "none",
                    cursor: (saving || conflict) ? "not-allowed" : "pointer",
                    opacity: saving ? 0.7 : 1,
                  }}
                  title={conflict ? (isArabic ? "لا يمكن الحفظ — يوجد تعارض" : "Cannot save — conflict exists") : ""}
                >
                  {saving ? t("جاري الحفظ...", "Saving...") : t("حفظ", "Save")}
                </button>
                <button
                  type="button"
                  onClick={() => { setModalOpen(false); setError(""); }}
                  style={{ flex: 1, padding: "11px 0", borderRadius: 12, border: "1px solid #e2e8f0", background: "#f8fafc", color: "#64748b", fontWeight: 700, fontSize: 14, cursor: "pointer" }}
                >
                  {t("إلغاء", "Cancel")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.4)", padding: 16 }}>
          <div style={{ width: "100%", maxWidth: 360, borderRadius: 20, background: "#fff", padding: 24, boxShadow: "0 16px 48px rgba(0,0,0,0.18)" }}>
            <h3 style={{ fontSize: 17, fontWeight: 900, color: "#1e293b", margin: "0 0 8px" }}>{t("تأكيد الحذف", "Confirm Delete")}</h3>
            <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 20px" }}>{t("هل أنت متأكد من حذف هذه الحصة؟", "Are you sure you want to delete this slot?")}</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" onClick={() => handleDelete(deleteConfirm)} disabled={saving}
                style={{ flex: 1, padding: "10px 0", borderRadius: 12, background: "#dc2626", color: "#fff", fontWeight: 800, fontSize: 13, border: "none", cursor: "pointer" }}>
                {t("حذف", "Delete")}
              </button>
              <button type="button" onClick={() => setDeleteConfirm(null)}
                style={{ flex: 1, padding: "10px 0", borderRadius: 12, border: "1px solid #e2e8f0", background: "#f8fafc", color: "#64748b", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                {t("إلغاء", "Cancel")}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const labelStyle = { fontSize: 12, fontWeight: 700, color: "#475569", display: "block", marginBottom: 4 };
const selectStyle = { width: "100%", padding: "9px 12px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 13, background: "#fff", boxSizing: "border-box" };
