import { useState, useEffect } from "react";
import StudentLayout from "../../components/student/StudentLayout";
import { fetchMyAttendance } from "../../services/studentService";
import { useLanguage } from "../../utils/i18n";

const STATUS_META = {
  PRESENT:  { en: "Present",  ar: "حاضر",   color: "#10b981", bg: "rgba(16,185,129,0.12)"  },
  ABSENT:   { en: "Absent",   ar: "غائب",   color: "#ef4444", bg: "rgba(239,68,68,0.12)"   },
  LATE:     { en: "Late",     ar: "متأخر",  color: "#f59e0b", bg: "rgba(245,158,11,0.12)"  },
  EXCUSED:  { en: "Excused",  ar: "معذور",  color: "#8b5cf6", bg: "rgba(139,92,246,0.12)"  },
};

const fmt = (d) =>
  d ? new Date(d).toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric" }) : "-";

export default function StudentAttendancePage() {
  const { isArabic } = useLanguage();
  const [records, setRecords]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchMyAttendance()
      .then(data => { if (!cancelled) setRecords(Array.isArray(data) ? data : []); })
      .catch(() => { if (!cancelled) setError(isArabic ? "تعذّر تحميل سجلات الحضور" : "Failed to load attendance"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [isArabic]);

  const counts = Object.fromEntries(
    Object.keys(STATUS_META).map(s => [s, records.filter(r => r.status === s).length])
  );

  const visible = filterStatus === "ALL"
    ? records
    : records.filter(r => r.status === filterStatus);

  return (
    <StudentLayout>
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-6">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-600">
            {isArabic ? "سجل الحضور" : "Attendance Record"}
          </p>
          <h1 className="mt-1 text-2xl font-black text-slate-900">
            {isArabic ? "حضوري" : "My Attendance"}
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {isArabic ? "سجل حضورك اليومي" : "Your daily attendance record"}
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          </div>
        ) : error ? (
          <div className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>
        ) : (
          <>
            {/* Summary + filter chips */}
            {records.length > 0 && (
              <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {Object.entries(STATUS_META).map(([status, meta]) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setFilterStatus(prev => prev === status ? "ALL" : status)}
                    style={{ background: filterStatus === status ? meta.color : meta.bg, transition: "all 0.15s" }}
                    className="rounded-2xl p-4 text-center"
                  >
                    <p style={{ color: filterStatus === status ? "#fff" : meta.color }} className="text-2xl font-black m-0">
                      {counts[status] || 0}
                    </p>
                    <p style={{ color: filterStatus === status ? "rgba(255,255,255,0.9)" : meta.color }} className="text-xs font-bold uppercase m-0">
                      {isArabic ? meta.ar : meta.en}
                    </p>
                  </button>
                ))}
              </div>
            )}

            {/* Records */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              {records.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center">
                  <p className="text-sm font-semibold text-slate-400">
                    {isArabic ? "لا توجد سجلات حضور بعد" : "No attendance records yet"}
                  </p>
                </div>
              ) : visible.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-slate-200 py-12 text-center">
                  <p className="text-sm font-semibold text-slate-400">
                    {isArabic ? "لا توجد سجلات بهذا الفلتر" : "No records match this filter"}
                  </p>
                  <button type="button" onClick={() => setFilterStatus("ALL")} className="mt-2 text-xs text-indigo-500 hover:underline">
                    {isArabic ? "عرض الكل" : "Show all"}
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {visible.map((rec) => {
                    const meta = STATUS_META[rec.status] || STATUS_META.PRESENT;
                    return (
                      <div key={rec.id} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                        <div
                          style={{ background: meta.bg, color: meta.color }}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black"
                        >
                          {rec.status === "PRESENT" ? "✓" : rec.status === "ABSENT" ? "✗" : rec.status === "LATE" ? "!" : "~"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-800">{fmt(rec.date)}</p>
                          {rec.note && <p className="text-xs text-slate-400 truncate">{rec.note}</p>}
                        </div>
                        <span
                          style={{ background: meta.bg, color: meta.color }}
                          className="shrink-0 rounded-full px-3 py-1 text-xs font-bold"
                        >
                          {isArabic ? meta.ar : meta.en}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </StudentLayout>
  );
}
