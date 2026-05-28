import { useState, useEffect, useCallback } from "react";
import api from "../../utils/api";

const EVENT_TYPES = ["HOLIDAY", "EXAM", "PTA_MEETING", "ACTIVITY", "ANNOUNCEMENT", "OTHER"];

const TYPE_META = {
  HOLIDAY:      { label: "Holiday",      ar: "عطلة",       color: "#10b981", bg: "rgba(16,185,129,0.1)" },
  EXAM:         { label: "Exam",         ar: "امتحان",     color: "#ef4444", bg: "rgba(239,68,68,0.1)"  },
  PTA_MEETING:  { label: "PTA Meeting",  ar: "اجتماع",     color: "#8b5cf6", bg: "rgba(139,92,246,0.1)" },
  ACTIVITY:     { label: "Activity",     ar: "نشاط",       color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  ANNOUNCEMENT: { label: "Announcement", ar: "إعلان",      color: "#3b82f6", bg: "rgba(59,130,246,0.1)" },
  OTHER:        { label: "Other",        ar: "أخرى",       color: "#64748b", bg: "rgba(100,116,139,0.1)" },
};

const fmt = (d) => d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "-";

const EMPTY_FORM = { title: "", description: "", startDate: "", endDate: "", type: "OTHER", isPublished: true };

export default function SchoolCalendar({ isArabic, courses }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [filterType, setFilterType] = useState("ALL");
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = filterType !== "ALL" ? `?type=${filterType}` : "";
      const res = await api.get(`/school-calendar${params}`);
      setEvents(res.data?.data || []);
    } catch {
      setError(isArabic ? "تعذّر تحميل الأحداث" : "Failed to load events");
    } finally {
      setLoading(false);
    }
  }, [filterType, isArabic]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  const openCreate = () => { setEditTarget(null); setForm(EMPTY_FORM); setModalOpen(true); };
  const openEdit = (ev) => {
    setEditTarget(ev);
    setForm({
      title: ev.title,
      description: ev.description || "",
      startDate: ev.startDate ? String(ev.startDate).slice(0, 10) : "",
      endDate: ev.endDate ? String(ev.endDate).slice(0, 10) : "",
      type: ev.type || "OTHER",
      isPublished: ev.isPublished !== false,
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (editTarget) {
        await api.patch(`/school-calendar/${editTarget.id}`, form);
      } else {
        await api.post("/school-calendar", form);
      }
      setSuccess(isArabic ? "تم الحفظ بنجاح" : "Saved successfully");
      setModalOpen(false);
      loadEvents();
    } catch (err) {
      setError(err?.response?.data?.message || (isArabic ? "حدث خطأ" : "An error occurred"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    setSaving(true);
    try {
      await api.delete(`/school-calendar/${id}`);
      setDeleteConfirm(null);
      setSuccess(isArabic ? "تم الحذف" : "Deleted");
      loadEvents();
    } catch {
      setError(isArabic ? "تعذّر الحذف" : "Failed to delete");
    } finally {
      setSaving(false);
    }
  };

  const filtered = filterType === "ALL" ? events : events.filter((e) => e.type === filterType);

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 20 }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", color: "#6366f1" }}>
            {isArabic ? "التقويم المدرسي" : "School Calendar"}
          </p>
          <h2 style={{ fontSize: 22, fontWeight: 900, color: "#1e293b", marginTop: 2 }}>
            {isArabic ? "الأحداث والمناسبات" : "Events & Occasions"}
          </h2>
        </div>
        <button
          type="button"
          onClick={openCreate}
          style={{ padding: "10px 20px", borderRadius: 12, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", fontWeight: 700, fontSize: 13, border: "none", cursor: "pointer" }}
        >
          {isArabic ? "+ إضافة حدث" : "+ Add Event"}
        </button>
      </div>

      {success && <div style={{ marginBottom: 12, padding: "10px 16px", borderRadius: 10, background: "#d1fae5", color: "#065f46", fontSize: 13, fontWeight: 600 }}>{success}</div>}
      {error && <div style={{ marginBottom: 12, padding: "10px 16px", borderRadius: 10, background: "#fee2e2", color: "#991b1b", fontSize: 13, fontWeight: 600 }}>{error}</div>}

      {/* Type filter */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
        {["ALL", ...EVENT_TYPES].map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setFilterType(t)}
            style={{
              padding: "5px 14px",
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 700,
              border: filterType === t ? "none" : "1px solid #e2e8f0",
              background: filterType === t ? "#6366f1" : "transparent",
              color: filterType === t ? "#fff" : "#64748b",
              cursor: "pointer",
            }}
          >
            {t === "ALL"
              ? isArabic ? "الكل" : "All"
              : isArabic
                ? TYPE_META[t]?.ar || t
                : TYPE_META[t]?.label || t}
          </button>
        ))}
      </div>

      {/* Events list */}
      {loading ? (
        <div style={{ padding: "40px 0", textAlign: "center" }}>
          <div style={{ display: "inline-block", width: 28, height: 28, borderRadius: "50%", border: "3px solid #6366f1", borderTopColor: "transparent", animation: "spin 0.7s linear infinite" }} />
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: "60px 20px", textAlign: "center", borderRadius: 20, border: "2px dashed #e2e8f0", background: "#f8fafc" }}>
          <p style={{ color: "#94a3b8", fontSize: 14, fontWeight: 600 }}>
            {isArabic ? "لا توجد أحداث بعد" : "No events yet"}
          </p>
          <button type="button" onClick={openCreate} style={{ marginTop: 12, padding: "8px 18px", borderRadius: 10, background: "#6366f1", color: "#fff", fontWeight: 700, fontSize: 13, border: "none", cursor: "pointer" }}>
            {isArabic ? "أضف أول حدث" : "Add first event"}
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((ev) => {
            const meta = TYPE_META[ev.type] || TYPE_META.OTHER;
            return (
              <div key={ev.id} style={{ borderRadius: 16, border: "1px solid #e2e8f0", background: "#fff", padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 6, height: 48, borderRadius: 99, background: meta.color, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: "#1e293b" }}>{ev.title}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: meta.bg, color: meta.color }}>
                      {isArabic ? meta.ar : meta.label}
                    </span>
                    {!ev.isPublished && (
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: "#fef3c7", color: "#92400e" }}>
                        {isArabic ? "مسودة" : "Draft"}
                      </span>
                    )}
                  </div>
                  {ev.description && <p style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>{ev.description}</p>}
                  <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>
                    {fmt(ev.startDate)} {ev.endDate && ev.endDate !== ev.startDate ? `→ ${fmt(ev.endDate)}` : ""}
                  </p>
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <button type="button" onClick={() => openEdit(ev)} style={{ padding: "6px 14px", borderRadius: 10, border: "1px solid #e2e8f0", background: "#f8fafc", fontSize: 12, fontWeight: 700, color: "#475569", cursor: "pointer" }}>
                    {isArabic ? "تعديل" : "Edit"}
                  </button>
                  <button type="button" onClick={() => setDeleteConfirm(ev.id)} style={{ padding: "6px 14px", borderRadius: 10, border: "1px solid #fee2e2", background: "#fff5f5", fontSize: 12, fontWeight: 700, color: "#dc2626", cursor: "pointer" }}>
                    {isArabic ? "حذف" : "Delete"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      {modalOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.4)", padding: 16 }}>
          <div style={{ width: "100%", maxWidth: 520, borderRadius: 24, background: "#fff", boxShadow: "0 20px 60px rgba(0,0,0,0.2)", overflow: "hidden" }}>
            <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #f1f5f9" }}>
              <h3 style={{ fontSize: 18, fontWeight: 900, color: "#1e293b", margin: 0 }}>
                {editTarget ? (isArabic ? "تعديل الحدث" : "Edit Event") : (isArabic ? "إضافة حدث جديد" : "Add New Event")}
              </h3>
            </div>
            <form onSubmit={handleSave} style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", display: "block", marginBottom: 4 }}>
                  {isArabic ? "عنوان الحدث *" : "Event Title *"}
                </label>
                <input required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 14, boxSizing: "border-box" }}
                  placeholder={isArabic ? "اكتب عنوان الحدث" : "Enter event title"} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", display: "block", marginBottom: 4 }}>
                  {isArabic ? "الوصف" : "Description"}
                </label>
                <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2} style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 14, resize: "none", boxSizing: "border-box" }}
                  placeholder={isArabic ? "وصف اختياري" : "Optional description"} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", display: "block", marginBottom: 4 }}>
                    {isArabic ? "تاريخ البداية *" : "Start Date *"}
                  </label>
                  <input required type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                    style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 14, boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", display: "block", marginBottom: 4 }}>
                    {isArabic ? "تاريخ النهاية *" : "End Date *"}
                  </label>
                  <input required type="date" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                    style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 14, boxSizing: "border-box" }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", display: "block", marginBottom: 4 }}>
                  {isArabic ? "نوع الحدث" : "Event Type"}
                </label>
                <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 14, boxSizing: "border-box" }}>
                  {EVENT_TYPES.map((t) => (
                    <option key={t} value={t}>{isArabic ? TYPE_META[t]?.ar : TYPE_META[t]?.label}</option>
                  ))}
                </select>
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input type="checkbox" checked={form.isPublished} onChange={(e) => setForm((f) => ({ ...f, isPublished: e.target.checked }))} style={{ width: 16, height: 16 }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: "#475569" }}>
                  {isArabic ? "نشر الحدث (مرئي لجميع المستخدمين)" : "Publish event (visible to all users)"}
                </span>
              </label>
              {error && <p style={{ fontSize: 12, color: "#dc2626", fontWeight: 600 }}>{error}</p>}
              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button type="submit" disabled={saving} style={{ flex: 1, padding: "11px 0", borderRadius: 12, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", fontWeight: 800, fontSize: 14, border: "none", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
                  {saving ? (isArabic ? "جاري الحفظ..." : "Saving...") : (isArabic ? "حفظ" : "Save")}
                </button>
                <button type="button" onClick={() => setModalOpen(false)} style={{ flex: 1, padding: "11px 0", borderRadius: 12, border: "1px solid #e2e8f0", background: "#f8fafc", color: "#64748b", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                  {isArabic ? "إلغاء" : "Cancel"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.4)", padding: 16 }}>
          <div style={{ width: "100%", maxWidth: 380, borderRadius: 20, background: "#fff", padding: 24, boxShadow: "0 16px 48px rgba(0,0,0,0.18)" }}>
            <h3 style={{ fontSize: 17, fontWeight: 900, color: "#1e293b", margin: "0 0 8px" }}>
              {isArabic ? "تأكيد الحذف" : "Confirm Delete"}
            </h3>
            <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 20px" }}>
              {isArabic ? "هل أنت متأكد من حذف هذا الحدث؟ لا يمكن التراجع." : "Are you sure you want to delete this event? This cannot be undone."}
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" onClick={() => handleDelete(deleteConfirm)} disabled={saving}
                style={{ flex: 1, padding: "10px 0", borderRadius: 12, background: "#dc2626", color: "#fff", fontWeight: 800, fontSize: 13, border: "none", cursor: "pointer" }}>
                {isArabic ? "حذف" : "Delete"}
              </button>
              <button type="button" onClick={() => setDeleteConfirm(null)}
                style={{ flex: 1, padding: "10px 0", borderRadius: 12, border: "1px solid #e2e8f0", background: "#f8fafc", color: "#64748b", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                {isArabic ? "إلغاء" : "Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
