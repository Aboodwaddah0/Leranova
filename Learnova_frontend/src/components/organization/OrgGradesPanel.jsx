import { useState, useEffect, useCallback, useMemo } from "react";
import {
  computeGrades,
  fetchComputedGrades,
  fetchGradeRankings,
  fetchTerms,
} from "../../services/organizationService";
import { formatGradeName } from "../../utils/gradeHelpers";

// ── helpers ────────────────────────────────────────────────────────────────────
const GRADE_COLOR = (letter) => {
  if (!letter) return { bg: "#f1f5f9", text: "#64748b" };
  const l = String(letter).toUpperCase();
  if (l.startsWith("A")) return { bg: "#d1fae5", text: "#065f46" };
  if (l.startsWith("B")) return { bg: "#dbeafe", text: "#1e40af" };
  if (l.startsWith("C")) return { bg: "#fef9c3", text: "#854d0e" };
  if (l.startsWith("D")) return { bg: "#ffedd5", text: "#9a3412" };
  return { bg: "#fee2e2", text: "#991b1b" };
};

const Pill = ({ children, bg = "#f1f5f9", text = "#475569", bold = true }) => (
  <span style={{
    display: "inline-block", padding: "2px 10px", borderRadius: 999,
    background: bg, color: text, fontSize: 12, fontWeight: bold ? 800 : 600,
  }}>{children}</span>
);

const ScoreBar = ({ score }) => {
  const pct = Math.min(Math.max(Number(score) || 0, 0), 100);
  const color = pct >= 85 ? "#10b981" : pct >= 65 ? "#6366f1" : pct >= 50 ? "#f59e0b" : "#ef4444";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 100 }}>
      <div style={{ flex: 1, height: 6, borderRadius: 99, background: "#e2e8f0", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 99, transition: "width 0.4s" }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 800, color, minWidth: 38, textAlign: "right" }}>{pct.toFixed(1)}%</span>
    </div>
  );
};

// ── main component ─────────────────────────────────────────────────────────────
export default function OrgGradesPanel({ isArabic, courses = [], academicYears = [], yearTerms = [] }) {
  // Filters
  const [selectedYear, setSelectedYear] = useState("");
  const [terms, setTerms] = useState([]);
  const [termId, setTermId] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [searchName, setSearchName] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [activeView, setActiveView] = useState("grades");

  // Data
  const [grades, setGrades] = useState([]);
  const [rankings, setRankings] = useState([]);
  const [computing, setComputing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [computeResult, setComputeResult] = useState(null);
  const [error, setError] = useState("");

  // Auto-select active year once academicYears loads (useState initializer runs before prop is ready)
  useEffect(() => {
    if (selectedYear || academicYears.length === 0) return;
    const active = academicYears.find(y => y.isActive) || academicYears[0];
    if (active) setSelectedYear(String(active.id));
  }, [academicYears]); // eslint-disable-line

  // Load terms when year changes
  useEffect(() => {
    if (!selectedYear) { setTerms([]); setTermId(""); return; }
    const activeId = String(academicYears.find(y => y.isActive)?.id || "");
    if (selectedYear === activeId && yearTerms.length > 0) {
      setTerms(yearTerms);
    } else {
      fetchTerms(Number(selectedYear)).then(setTerms).catch(() => setTerms([]));
    }
    setTermId("");
    setSelectedSubjectId("");
  }, [selectedYear]); // eslint-disable-line

  // Keep terms in sync when yearTerms prop updates
  useEffect(() => {
    if (!selectedYear || yearTerms.length === 0) return;
    const activeId = String(academicYears.find(y => y.isActive)?.id || "");
    if (selectedYear === activeId) setTerms(yearTerms);
  }, [yearTerms]); // eslint-disable-line

  // Grade options from courses
  const gradeOptions = useMemo(() => {
    const seen = new Set();
    return courses
      .filter(c => c.GradeLevel != null)
      .sort((a, b) => (a.GradeLevel ?? 0) - (b.GradeLevel ?? 0))
      .filter(c => { if (seen.has(c.GradeLevel)) return false; seen.add(c.GradeLevel); return true; });
  }, [courses]);

  // Subjects filtered by selected grade (derived from loaded grade records)
  const subjectOptions = useMemo(() => {
    const seen = new Map();
    const source = selectedGrade
      ? grades.filter(g => String(g.gradeLevel) === String(selectedGrade))
      : grades;
    source.forEach(g => { if (g.subjectId && !seen.has(g.subjectId)) seen.set(g.subjectId, g.subjectName || `Subject ${g.subjectId}`); });
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [grades, selectedGrade]);

  // Load computed grades when termId changes
  const loadGrades = useCallback(async () => {
    if (!termId) { setGrades([]); setRankings([]); return; }
    setLoading(true);
    setError("");
    try {
      const [g, r] = await Promise.all([
        fetchComputedGrades({ termId }),
        fetchGradeRankings({ termId }),
      ]);
      setGrades(Array.isArray(g) ? g : []);
      setRankings(Array.isArray(r) ? r : []);
    } catch {
      setError(isArabic ? "تعذّر تحميل البيانات" : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [termId, isArabic]);

  useEffect(() => { loadGrades(); }, [loadGrades]);

  // Compute grades
  const handleCompute = async () => {
    if (!termId) return;
    setComputing(true);
    setError("");
    setComputeResult(null);
    try {
      const result = await computeGrades(Number(termId));
      setComputeResult(result);
      await loadGrades();
    } catch (err) {
      setError(err?.response?.data?.message || (isArabic ? "حدث خطأ أثناء الاحتساب" : "Compute failed"));
    } finally {
      setComputing(false);
    }
  };

  // Client-side filtering
  const filteredGrades = useMemo(() => {
    let rows = grades;
    // Grade filter: each record now carries gradeLevel from the backend
    if (selectedGrade) rows = rows.filter(g => String(g.gradeLevel) === String(selectedGrade));
    if (selectedSubjectId) rows = rows.filter(g => String(g.subjectId) === String(selectedSubjectId));
    if (searchName.trim()) {
      const q = searchName.trim().toLowerCase();
      rows = rows.filter(g => (g.studentName || "").toLowerCase().includes(q));
    }
    if (statusFilter === "PASSED")  rows = rows.filter(g => g.isPassed);
    if (statusFilter === "FAILED")  rows = rows.filter(g => !g.isPassed);
    return rows;
  }, [grades, selectedGrade, selectedSubjectId, searchName, statusFilter]);

  // Summary stats
  const stats = useMemo(() => {
    if (!filteredGrades.length) return null;
    const avg = filteredGrades.reduce((s, g) => s + Number(g.rawScore), 0) / filteredGrades.length;
    const passed = filteredGrades.filter(g => g.isPassed).length;
    return { avg: avg.toFixed(1), passed, failed: filteredGrades.length - passed, total: filteredGrades.length };
  }, [filteredGrades]);

  const t = (ar, en) => isArabic ? ar : en;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── Header ── */}
      <div>
        <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", color: "#6366f1" }}>
          {t("الدرجات النهائية", "Final Grades")}
        </p>
        <h2 style={{ fontSize: 22, fontWeight: 900, color: "#1e293b", marginTop: 2 }}>
          {t("احتساب ومراجعة الدرجات", "Compute & Review Grades")}
        </h2>
      </div>

      {/* ── Filter bar ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px,1fr))", gap: 12, padding: "16px 20px", borderRadius: 16, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
        {/* Year */}
        <div>
          <label style={labelStyle}>{t("السنة الدراسية", "Academic Year")}</label>
          <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} style={selectStyle}>
            <option value="">{t("-- اختر --", "-- Select --")}</option>
            {academicYears.map(y => (
              <option key={y.id} value={y.id}>{y.name}{y.isActive ? (isArabic ? " (نشطة)" : " (Active)") : ""}</option>
            ))}
          </select>
        </div>

        {/* Term */}
        <div>
          <label style={labelStyle}>{t("الفصل الدراسي", "Term")} *</label>
          <select value={termId} onChange={e => { setTermId(e.target.value); setComputeResult(null); }} style={selectStyle} disabled={!selectedYear}>
            <option value="">{t("-- اختر الفصل --", "-- Select term --")}</option>
            {terms.map(t2 => (
              <option key={t2.id} value={t2.id}>{t2.name || (isArabic ? `الفصل ${t2.termNumber}` : `Term ${t2.termNumber}`)}</option>
            ))}
          </select>
        </div>

        {/* Grade filter */}
        <div>
          <label style={labelStyle}>{t("الصف", "Class")}</label>
          <select value={selectedGrade} onChange={e => { setSelectedGrade(e.target.value); setSelectedSubjectId(""); }} style={selectStyle}>
            <option value="">{t("-- كل الصفوف --", "-- All classes --")}</option>
            {gradeOptions.map(c => (
              <option key={c.id} value={c.GradeLevel}>
                {formatGradeName(c, true, isArabic) || `${isArabic ? "الصف" : "Class"} ${c.GradeLevel}`}
              </option>
            ))}
          </select>
        </div>

        {/* Subject filter */}
        <div>
          <label style={labelStyle}>{t("المادة", "Subject")}</label>
          <select value={selectedSubjectId} onChange={e => setSelectedSubjectId(e.target.value)} style={selectStyle} disabled={subjectOptions.length === 0}>
            <option value="">{t("-- كل المواد --", "-- All subjects --")}</option>
            {subjectOptions.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        {/* Status filter */}
        <div>
          <label style={labelStyle}>{t("الحالة", "Status")}</label>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={selectStyle}>
            <option value="ALL">{t("الكل", "All")}</option>
            <option value="PASSED">{t("ناجح", "Passed")}</option>
            <option value="FAILED">{t("راسب", "Failed")}</option>
          </select>
        </div>

        {/* Student search */}
        <div>
          <label style={labelStyle}>{t("بحث عن طالب", "Search student")}</label>
          <input
            value={searchName}
            onChange={e => setSearchName(e.target.value)}
            placeholder={t("اسم الطالب...", "Student name...")}
            style={{ ...selectStyle, outline: "none" }}
          />
        </div>
      </div>

      {/* ── Compute action ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={handleCompute}
          disabled={computing || !termId}
          style={{
            padding: "10px 24px", borderRadius: 12, fontWeight: 800, fontSize: 14, border: "none",
            background: termId ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "#e2e8f0",
            color: termId ? "#fff" : "#94a3b8", cursor: termId ? "pointer" : "not-allowed",
            opacity: computing ? 0.7 : 1,
          }}
        >
          {computing ? t("جاري الاحتساب...", "Computing...") : t("احتساب الدرجات النهائية", "Compute Final Grades")}
        </button>
        {!termId && (
          <span style={{ fontSize: 12, color: "#94a3b8" }}>{t("اختر الفصل الدراسي أولاً", "Select a term first")}</span>
        )}
      </div>

      {/* Compute result */}
      {computeResult && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          <StatCard label={t("محتسبة", "Computed")}  value={computeResult.computed} color="#6366f1" />
          <StatCard label={t("إجمالي", "Total")}     value={computeResult.total}    color="#64748b" />
          {computeResult.errors?.length > 0 && (
            <StatCard label={t("أخطاء", "Errors")} value={computeResult.errors.length} color="#ef4444" />
          )}
        </div>
      )}

      {error && (
        <div style={{ padding: "10px 16px", borderRadius: 10, background: "#fee2e2", color: "#991b1b", fontSize: 13, fontWeight: 600 }}>{error}</div>
      )}

      {/* ── Summary stats ── */}
      {stats && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          <StatCard label={t("متوسط الدرجات", "Average Score")} value={`${stats.avg}%`} color="#6366f1" />
          <StatCard label={t("ناجح", "Passed")} value={stats.passed} color="#10b981" />
          <StatCard label={t("راسب", "Failed")} value={stats.failed} color="#ef4444" />
          <StatCard label={t("نسبة النجاح", "Pass Rate")} value={`${stats.total > 0 ? ((stats.passed / stats.total) * 100).toFixed(0) : 0}%`} color="#f59e0b" />
        </div>
      )}

      {/* ── View toggle ── */}
      {(grades.length > 0 || rankings.length > 0) && (
        <div style={{ display: "flex", gap: 8 }}>
          {["grades", "rankings"].map(v => (
            <button
              key={v}
              type="button"
              onClick={() => setActiveView(v)}
              style={{
                padding: "7px 18px", borderRadius: 10, fontSize: 13, fontWeight: 700,
                border: activeView === v ? "none" : "1px solid #e2e8f0",
                background: activeView === v ? "#6366f1" : "transparent",
                color: activeView === v ? "#fff" : "#64748b", cursor: "pointer",
              }}
            >
              {v === "grades" ? t("جدول الدرجات", "Grades Table") : t("ترتيب الطلاب", "Rankings")}
            </button>
          ))}
        </div>
      )}

      {/* ── Loading ── */}
      {loading && (
        <div style={{ padding: "40px 0", textAlign: "center" }}>
          <div style={{ display: "inline-block", width: 28, height: 28, borderRadius: "50%", border: "3px solid #6366f1", borderTopColor: "transparent", animation: "spin .7s linear infinite" }} />
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && termId && grades.length === 0 && (
        <div style={{ padding: "60px 20px", textAlign: "center", borderRadius: 20, border: "2px dashed #e2e8f0", background: "#f8fafc" }}>
          <p style={{ color: "#94a3b8", fontSize: 14, fontWeight: 600 }}>
            {t("لا توجد درجات محتسبة لهذا الفصل — اضغط «احتساب الدرجات» أولاً", "No computed grades for this term — click «Compute Final Grades» first")}
          </p>
        </div>
      )}

      {/* ── Grades Table ── */}
      {!loading && activeView === "grades" && filteredGrades.length > 0 && (
        <div style={{ overflowX: "auto", borderRadius: 16, border: "1px solid #e2e8f0", background: "#fff" }}>
          <table style={{ minWidth: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                {[
                  { label: t("الطالب", "Student"),   align: "start"  },
                  { label: t("المادة", "Subject"),   align: "start"  },
                  { label: t("الدرجة", "Score"),     align: "start"  },
                  { label: t("التقدير", "Letter"),   align: "center" },
                  { label: "GPA",                    align: "center" },
                  { label: t("الحالة", "Status"),    align: "center" },
                ].map(({ label, align }) => (
                  <th key={label} style={{ padding: "10px 16px", textAlign: align, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "#64748b", whiteSpace: "nowrap", verticalAlign: "middle" }}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredGrades.map((g, i) => {
                const gc = GRADE_COLOR(g.letterGrade);
                const cell = (extra = {}) => ({
                  padding: "12px 16px", verticalAlign: "middle", ...extra,
                });
                return (
                  <tr key={g.id ?? i} style={{ borderTop: "1px solid #f1f5f9" }}>
                    <td style={cell({ fontWeight: 700, color: "#1e293b", whiteSpace: "nowrap" })}>
                      {g.studentName || `#${g.studentId}`}
                    </td>
                    <td style={cell({ color: "#475569", whiteSpace: "nowrap" })}>{g.subjectName || "—"}</td>
                    <td style={cell({ minWidth: 160 })}>
                      <ScoreBar score={g.rawScore} />
                    </td>
                    <td style={cell({ textAlign: "center", whiteSpace: "nowrap" })}>
                      {g.letterGrade
                        ? <Pill bg={gc.bg} text={gc.text}>{g.letterGrade}</Pill>
                        : <span style={{ color: "#cbd5e1" }}>—</span>}
                    </td>
                    <td style={cell({ textAlign: "center", whiteSpace: "nowrap", color: "#64748b", fontWeight: 700 })}>
                      {g.gpaPoints != null ? Number(g.gpaPoints).toFixed(1) : "—"}
                    </td>
                    <td style={cell({ textAlign: "center", whiteSpace: "nowrap" })}>
                      <Pill bg={g.isPassed ? "#d1fae5" : "#fee2e2"} text={g.isPassed ? "#065f46" : "#991b1b"}>
                        {g.isPassed ? t("ناجح ✓", "Passed ✓") : t("راسب ✗", "Failed ✗")}
                      </Pill>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Rankings ── */}
      {!loading && activeView === "rankings" && rankings.length > 0 && (
        <div style={{ overflowX: "auto", borderRadius: 16, border: "1px solid #e2e8f0", background: "#fff" }}>
          <table style={{ minWidth: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {[t("الترتيب", "Rank"), t("الطالب", "Student"), t("المتوسط", "Average"), t("التقدير", "Grade")].map(h => (
                  <th key={h} style={{ padding: "10px 16px", textAlign: "start", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "#64748b" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rankings.map((r) => {
                const gc = GRADE_COLOR(r.letterGrade);
                const medal = r.rank === 1 ? "🥇" : r.rank === 2 ? "🥈" : r.rank === 3 ? "🥉" : null;
                return (
                  <tr key={r.studentId} style={{ borderTop: "1px solid #f1f5f9", background: r.rank <= 3 ? "#fafaf9" : "transparent" }}>
                    <td style={{ padding: "10px 16px", fontWeight: 900, color: "#64748b", fontSize: 16, width: 60 }}>
                      {medal || `#${r.rank}`}
                    </td>
                    <td style={{ padding: "10px 16px", fontWeight: 700, color: "#1e293b" }}>{r.studentName}</td>
                    <td style={{ padding: "10px 16px", minWidth: 140 }}>
                      <ScoreBar score={r.averageScore} />
                    </td>
                    <td style={{ padding: "10px 16px" }}>
                      {r.letterGrade
                        ? <Pill bg={gc.bg} text={gc.text}>{r.letterGrade}</Pill>
                        : <span style={{ color: "#cbd5e1" }}>—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── small helpers ──────────────────────────────────────────────────────────────
const labelStyle = { fontSize: 12, fontWeight: 700, color: "#475569", display: "block", marginBottom: 4 };
const selectStyle = {
  width: "100%", padding: "8px 12px", borderRadius: 10,
  border: "1px solid #e2e8f0", fontSize: 13, background: "#fff",
  color: "#1e293b",
};

function StatCard({ label, value, color }) {
  return (
    <div style={{ padding: "10px 20px", borderRadius: 14, background: `${color}14`, border: `1px solid ${color}33`, textAlign: "center", minWidth: 90 }}>
      <p style={{ fontSize: 22, fontWeight: 900, color, margin: 0 }}>{value}</p>
      <p style={{ fontSize: 11, fontWeight: 700, color, margin: 0, textTransform: "uppercase" }}>{label}</p>
    </div>
  );
}
