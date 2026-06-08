import { useState, useEffect, useCallback } from "react";

const EVENT_TYPES = ["HOLIDAY", "EXAM", "PTA_MEETING", "ACTIVITY", "ANNOUNCEMENT", "OTHER"];

const TYPE_META = {
  HOLIDAY:      { en: "Holiday",      ar: "عطلة",       color: "#10b981", bg: "rgba(16,185,129,0.12)" },
  EXAM:         { en: "Exam",         ar: "امتحان",     color: "#ef4444", bg: "rgba(239,68,68,0.12)"  },
  PTA_MEETING:  { en: "PTA Meeting",  ar: "اجتماع",     color: "#8b5cf6", bg: "rgba(139,92,246,0.12)" },
  ACTIVITY:     { en: "Activity",     ar: "نشاط",       color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  ANNOUNCEMENT: { en: "Announcement", ar: "إعلان",      color: "#3b82f6", bg: "rgba(59,130,246,0.12)" },
  OTHER:        { en: "Other",        ar: "أخرى",       color: "#64748b", bg: "rgba(100,116,139,0.12)" },
};

const fmt = (d) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "-";

export default function PublicCalendarView({ isArabic, fetchEvents }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterType, setFilterType] = useState("ALL");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchEvents({ type: filterType !== "ALL" ? filterType : undefined });
      setEvents(Array.isArray(data) ? data : []);
    } catch {
      setError(isArabic ? "تعذّر تحميل الأحداث" : "Failed to load events");
    } finally {
      setLoading(false);
    }
  }, [fetchEvents, filterType, isArabic]);

  useEffect(() => { load(); }, [load]);

  const filtered = filterType === "ALL" ? events : events.filter((e) => e.type === filterType);

  return (
    <div>
      {/* Type filter chips */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
        {["ALL", ...EVENT_TYPES].map((t) => {
          const meta = t !== "ALL" ? TYPE_META[t] : null;
          const active = filterType === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setFilterType(t)}
              style={{
                padding: "5px 14px", borderRadius: 999, fontSize: 12, fontWeight: 700,
                border: active ? "none" : "1px solid #e2e8f0",
                background: active ? (meta?.color || "#6366f1") : "transparent",
                color: active ? "#fff" : "#64748b",
                cursor: "pointer",
              }}
            >
              {t === "ALL"
                ? (isArabic ? "الكل" : "All")
                : (isArabic ? meta?.ar : meta?.en) || t}
            </button>
          );
        })}
      </div>

      {error && (
        <div style={{ marginBottom: 14, padding: "10px 16px", borderRadius: 10, background: "#fee2e2", color: "#991b1b", fontSize: 13, fontWeight: 600 }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ padding: "40px 0", textAlign: "center" }}>
          <div style={{ display: "inline-block", width: 28, height: 28, borderRadius: "50%", border: "3px solid #6366f1", borderTopColor: "transparent", animation: "spin 0.7s linear infinite" }} />
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: "60px 20px", textAlign: "center", borderRadius: 20, border: "2px dashed #e2e8f0", background: "#f8fafc" }}>
          <p style={{ color: "#94a3b8", fontSize: 14, fontWeight: 600 }}>
            {isArabic ? "لا توجد أحداث" : "No events found"}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((ev) => {
            const meta = TYPE_META[ev.type] || TYPE_META.OTHER;
            return (
              <div
                key={ev.id}
                style={{
                  borderRadius: 16, border: "1px solid #e2e8f0", background: "#fff",
                  padding: "14px 18px", display: "flex", alignItems: "flex-start", gap: 14,
                }}
              >
                <div style={{ width: 6, minHeight: 48, borderRadius: 99, background: meta.color, flexShrink: 0, marginTop: 2 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: "#1e293b" }}>{ev.title}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: meta.bg, color: meta.color }}>
                      {isArabic ? meta.ar : meta.en}
                    </span>
                  </div>
                  {ev.description && (
                    <p style={{ fontSize: 12, color: "#64748b", marginTop: 4, marginBottom: 0 }}>{ev.description}</p>
                  )}
                  <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 4, marginBottom: 0 }}>
                    {fmt(ev.startDate)}{ev.endDate && ev.endDate !== ev.startDate ? ` → ${fmt(ev.endDate)}` : ""}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
