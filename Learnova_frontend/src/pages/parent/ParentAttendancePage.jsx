import { useState, useEffect } from "react";
import ParentLayout from "../../components/parent/ParentLayout";
import { fetchChildrenAttendance } from "../../services/parentService";
import { useLanguage } from "../../utils/i18n";

const STATUS_META = {
  PRESENT:  { en: "Present",  ar: "حاضر",   color: "#10b981", bg: "rgba(16,185,129,0.12)"  },
  ABSENT:   { en: "Absent",   ar: "غائب",   color: "#ef4444", bg: "rgba(239,68,68,0.12)"   },
  LATE:     { en: "Late",     ar: "متأخر",  color: "#f59e0b", bg: "rgba(245,158,11,0.12)"  },
  EXCUSED:  { en: "Excused",  ar: "معذور",  color: "#8b5cf6", bg: "rgba(139,92,246,0.12)"  },
};

const AVATAR_COLORS = [
  "bg-indigo-500", "bg-violet-500", "bg-pink-500",
  "bg-amber-500", "bg-emerald-500", "bg-cyan-500",
];

const fmt = (d) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "-";

export default function ParentAttendancePage() {
  const { isArabic } = useLanguage();
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchChildrenAttendance()
      .then((data) => { if (!cancelled) setChildren(Array.isArray(data) ? data : []); })
      .catch(() => { if (!cancelled) setError(isArabic ? "تعذّر تحميل سجلات الحضور" : "Failed to load attendance"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [isArabic]);

  const selected = children[selectedIdx] ?? null;

  const counts = selected
    ? Object.fromEntries(
        Object.keys(STATUS_META).map((s) => [s, (selected.records || []).filter((r) => r.status === s).length])
      )
    : {};

  return (
    <ParentLayout>
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-600">
            {isArabic ? "سجلات الحضور" : "Attendance Records"}
          </p>
          <h1 className="mt-1 text-2xl font-black text-slate-900">
            {isArabic ? "حضور أبنائي" : "Children Attendance"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {isArabic ? "عرض سجلات حضور أبنائك لكل مادة" : "View your children's attendance records per subject"}
          </p>
        </div>

        {/* Child selector */}
        {!loading && children.length > 1 && (
          <div className="mb-5 flex flex-wrap gap-2">
            {children.map((child, idx) => (
              <button
                key={child.studentId}
                type="button"
                onClick={() => setSelectedIdx(idx)}
                className={`flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-semibold transition ${
                  selectedIdx === idx
                    ? "border-indigo-500 bg-indigo-600 text-white shadow-sm"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-black text-white ${AVATAR_COLORS[idx % AVATAR_COLORS.length]}`}>
                  {(child.studentName || "?").charAt(0).toUpperCase()}
                </span>
                {child.studentName || (isArabic ? "طالب" : "Student")}
              </button>
            ))}
          </div>
        )}

        {/* Summary stats */}
        {!loading && selected && selected.records?.length > 0 && (
          <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Object.entries(STATUS_META).map(([status, meta]) => (
              <div
                key={status}
                style={{ background: meta.bg }}
                className="rounded-2xl p-4 text-center"
              >
                <p style={{ color: meta.color }} className="text-2xl font-black m-0">{counts[status] || 0}</p>
                <p style={{ color: meta.color }} className="text-xs font-bold uppercase m-0">
                  {isArabic ? meta.ar : meta.en}
                </p>
              </div>
            ))}
          </div>
        )}

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          {error && (
            <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
            </div>
          ) : children.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center">
              <p className="text-sm font-semibold text-slate-400">
                {isArabic ? "لا يوجد أبناء مرتبطون بحسابك" : "No children linked to your account"}
              </p>
            </div>
          ) : !selected || (selected.records || []).length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center">
              <p className="text-sm font-semibold text-slate-400">
                {isArabic ? "لا توجد سجلات حضور بعد" : "No attendance records yet"}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {(selected.records || []).map((rec) => {
                const meta = STATUS_META[rec.status] || STATUS_META.PRESENT;
                return (
                  <div
                    key={rec.id}
                    className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3"
                  >
                    <div
                      style={{ background: meta.bg, color: meta.color }}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black"
                    >
                      {rec.status === "PRESENT" ? "✓" : rec.status === "ABSENT" ? "✗" : rec.status === "LATE" ? "!" : "~"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-bold text-slate-800">
                        {rec.subjectName || (isArabic ? "مادة" : "Subject")}
                      </p>
                      <p className="text-xs text-slate-400">{fmt(rec.date)}</p>
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
      </div>
    </ParentLayout>
  );
}
