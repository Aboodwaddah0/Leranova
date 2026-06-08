import { useState, useEffect } from "react";
import {
  fetchTerms,
  issueCertificates,
  publishCertificates,
  unpublishCertificates,
  fetchCertificateStatus,
} from "../../services/organizationService";

export default function CertificatesManager({ isArabic, academicYears = [], yearTerms = [] }) {
  const t = (ar, en) => isArabic ? ar : en;

  const [selectedYear, setSelectedYear] = useState("");
  const [terms, setTerms]               = useState([]);
  const [selectedTerm, setSelectedTerm] = useState("");
  const [certStatus, setCertStatus]     = useState(null);
  const [issuing, setIssuing]           = useState(false);
  const [publishing, setPublishing]     = useState(false);
  const [unpublishing, setUnpublishing] = useState(false);
  const [successMsg, setSuccessMsg]     = useState("");
  const [error, setError]               = useState("");

  // Auto-select active year
  useEffect(() => {
    if (selectedYear || academicYears.length === 0) return;
    const active = academicYears.find(y => y.isActive) || academicYears[0];
    if (active) setSelectedYear(String(active.id));
  }, [academicYears]); // eslint-disable-line

  // Load terms when year changes
  useEffect(() => {
    if (!selectedYear) { setTerms([]); setSelectedTerm(""); return; }
    const activeId = String(academicYears.find(y => y.isActive)?.id || "");
    const applyTerms = (data) => {
      setTerms(data);
      const auto = data.find(t => t.status === 'ACTIVE') || data[0];
      if (auto) setSelectedTerm(String(auto.id));
    };
    if (selectedYear === activeId && yearTerms.length > 0) {
      applyTerms(yearTerms);
    } else {
      fetchTerms(Number(selectedYear))
        .then(data => applyTerms(Array.isArray(data) ? data : []))
        .catch(() => setTerms([]));
    }
    setCertStatus(null);
    setSuccessMsg("");
    setError("");
  }, [selectedYear]); // eslint-disable-line

  // Keep terms in sync with prop
  useEffect(() => {
    if (!selectedYear || yearTerms.length === 0) return;
    const activeId = String(academicYears.find(y => y.isActive)?.id || "");
    if (selectedYear === activeId) {
      setTerms(yearTerms);
      if (!selectedTerm) {
        const auto = yearTerms.find(t => t.status === 'ACTIVE') || yearTerms[0];
        if (auto) setSelectedTerm(String(auto.id));
      }
    }
  }, [yearTerms]); // eslint-disable-line

  // Load cert status when term changes
  useEffect(() => {
    if (!selectedYear || !selectedTerm) { setCertStatus(null); return; }
    fetchCertificateStatus(Number(selectedYear), Number(selectedTerm))
      .then(setCertStatus)
      .catch(() => setCertStatus(null));
  }, [selectedYear, selectedTerm]);

  const handleIssue = async () => {
    setIssuing(true);
    setError("");
    setSuccessMsg("");
    try {
      const result = await issueCertificates(Number(selectedYear), Number(selectedTerm));
      const status = await fetchCertificateStatus(Number(selectedYear), Number(selectedTerm));
      setCertStatus(status);
      setSuccessMsg(t(
        `✓ تم إصدار ${result.created} شهادة (${result.skipped} موجودة مسبقاً)`,
        `✓ Issued ${result.created} certificates (${result.skipped} already existed)`
      ));
    } catch (err) {
      setError(err?.response?.data?.message || t("فشل إصدار الشهادات", "Failed to issue certificates"));
    } finally {
      setIssuing(false);
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    setError("");
    setSuccessMsg("");
    try {
      const result = await publishCertificates(Number(selectedYear), Number(selectedTerm));
      const status = await fetchCertificateStatus(Number(selectedYear), Number(selectedTerm));
      setCertStatus(status);
      setSuccessMsg(t(
        `✓ تم نشر ${result.published} شهادة للطلاب — يمكنهم الآن الاطلاع عليها`,
        `✓ Published ${result.published} certificates — students can now view them`
      ));
    } catch (err) {
      setError(err?.response?.data?.message || t("فشل نشر الشهادات", "Failed to publish certificates"));
    } finally {
      setPublishing(false);
    }
  };

  const handleUnpublish = async () => {
    setUnpublishing(true);
    setError("");
    setSuccessMsg("");
    try {
      const result = await unpublishCertificates(Number(selectedYear), Number(selectedTerm));
      const status = await fetchCertificateStatus(Number(selectedYear), Number(selectedTerm));
      setCertStatus(status);
      setSuccessMsg(t(
        `✓ تم سحب ${result.unpublished} شهادة — لم تعد مرئية للطلاب`,
        `✓ Unpublished ${result.unpublished} certificates — no longer visible to students`
      ));
    } catch (err) {
      setError(err?.response?.data?.message || t("فشل سحب النشر", "Failed to unpublish certificates"));
    } finally {
      setUnpublishing(false);
    }
  };

  const alreadyIssued = (certStatus?.total ?? 0) > 0;
  const allPublished  = alreadyIssued && (certStatus?.draft ?? 0) === 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 560 }}>
      {/* Header */}
      <div>
        <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", color: "#6366f1" }}>
          {t("الشهادات المدرسية", "School Certificates")}
        </p>
        <h2 style={{ fontSize: 22, fontWeight: 900, color: "#1e293b", marginTop: 2 }}>
          {t("إصدار الشهادات ونشرها", "Issue & Publish Certificates")}
        </h2>
        <p style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
          {t("تُصدر الشهادات لجميع الطلاب في الفصل المحدد بصرف النظر عن نتيجتهم", "Certificates are issued for all students in the selected term regardless of their result")}
        </p>
      </div>

      {/* Year + Term selectors */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label style={labelStyle}>{t("السنة الدراسية", "Academic Year")}</label>
          <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} style={selectStyle}>
            <option value="">{t("-- اختر --", "-- Select --")}</option>
            {academicYears.map(y => (
              <option key={y.id} value={y.id}>
                {y.name}{y.isActive ? (isArabic ? " (نشطة)" : " (Active)") : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>{t("الفصل الدراسي", "Term")} *</label>
          <select value={selectedTerm} onChange={e => setSelectedTerm(e.target.value)} style={selectStyle} disabled={terms.length === 0}>
            <option value="">{t("-- اختر الفصل --", "-- Select term --")}</option>
            {terms.map(term => (
              <option key={term.id} value={term.id}>
                {term.name || (isArabic ? `الفصل ${term.termNumber}` : `Term ${term.termNumber}`)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Status strip */}
      {certStatus && (
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <StatCard label={t("مُصدرة", "Issued")}    value={certStatus.total}     color="#6366f1" />
          <StatCard label={t("منشورة", "Published")} value={certStatus.published} color="#10b981" />
          <StatCard label={t("مسودة", "Draft")}      value={certStatus.draft}     color="#f59e0b" />
        </div>
      )}

      {/* Step 1 — Issue */}
      <div style={{ padding: "18px 20px", borderRadius: 16, border: "1px solid #e0e7ff", background: "#eef2ff" }}>
        <p style={{ margin: "0 0 4px", fontWeight: 800, fontSize: 15, color: "#4338ca" }}>
          {t("① إصدار الشهادات", "① Issue Certificates")}
        </p>
        <p style={{ margin: "0 0 14px", fontSize: 13, color: "#6366f1" }}>
          {alreadyIssued
            ? t("✓ تم إصدار الشهادات — محفوظة كمسودة غير مرئية للطلاب بعد", "✓ Certificates issued — saved as draft, not visible to students yet")
            : t("تُصدر لجميع الطلاب — تُحفظ كمسودة ولا تظهر للطلاب حتى النشر", "Issued to all students — saved as draft until you publish")}
        </p>
        <button
          type="button"
          onClick={handleIssue}
          disabled={issuing || alreadyIssued || !selectedTerm}
          style={{
            padding: "10px 24px", borderRadius: 10, fontWeight: 800, fontSize: 14, border: "none",
            background: alreadyIssued ? "#c7d2fe" : (!selectedTerm ? "#e2e8f0" : "#4f46e5"),
            color: alreadyIssued ? "#4338ca" : (!selectedTerm ? "#94a3b8" : "#fff"),
            cursor: (issuing || alreadyIssued || !selectedTerm) ? "not-allowed" : "pointer",
          }}
        >
          {issuing ? t("جاري الإصدار...", "Issuing...") : alreadyIssued ? t("تم الإصدار ✓", "Already Issued ✓") : t("إصدار الشهادات", "Issue Certificates")}
        </button>
      </div>

      {/* Step 2 — Publish */}
      <div style={{ padding: "18px 20px", borderRadius: 16, border: "1px solid #bbf7d0", background: "#f0fdf4" }}>
        <p style={{ margin: "0 0 4px", fontWeight: 800, fontSize: 15, color: "#166534" }}>
          {t("② نشر للطلاب", "② Publish to Students")}
        </p>
        <p style={{ margin: "0 0 14px", fontSize: 13, color: "#16a34a" }}>
          {allPublished
            ? t("✓ منشور — الشهادات مرئية في حساب كل طالب", "✓ Published — visible in each student's account")
            : !alreadyIssued
              ? t("يجب إصدار الشهادات أولاً قبل النشر", "Issue certificates first before publishing")
              : t("بعد النشر تظهر الشهادة في حساب كل طالب", "After publishing, the certificate appears in each student's account")}
        </p>
        <button
          type="button"
          onClick={handlePublish}
          disabled={publishing || !alreadyIssued || allPublished}
          style={{
            padding: "10px 24px", borderRadius: 10, fontWeight: 800, fontSize: 14, border: "none",
            background: allPublished ? "#86efac" : (!alreadyIssued ? "#e2e8f0" : "#16a34a"),
            color: allPublished ? "#166534" : (!alreadyIssued ? "#94a3b8" : "#fff"),
            cursor: (publishing || !alreadyIssued || allPublished) ? "not-allowed" : "pointer",
          }}
        >
          {publishing ? t("جاري النشر...", "Publishing...") : allPublished ? t("منشور للطلاب ✓", "Published ✓") : t("نشر للطلاب الآن", "Publish to Students Now")}
        </button>
      </div>

      {/* Unpublish — only shown when certificates are published */}
      {allPublished && (
        <div style={{ padding: "14px 20px", borderRadius: 16, border: "1px solid #fecdd3", background: "#fff1f2", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <p style={{ margin: "0 0 2px", fontWeight: 800, fontSize: 14, color: "#9f1239" }}>
              {t("سحب النشر", "Unpublish Certificates")}
            </p>
            <p style={{ margin: 0, fontSize: 12, color: "#be123c" }}>
              {t("ستختفي الشهادات من حسابات الطلاب — يمكن إعادة النشر لاحقاً", "Certificates will be hidden from students — you can republish later")}
            </p>
          </div>
          <button
            type="button"
            onClick={handleUnpublish}
            disabled={unpublishing}
            style={{
              padding: "9px 20px", borderRadius: 10, fontWeight: 800, fontSize: 13, border: "none",
              background: unpublishing ? "#fecdd3" : "#e11d48",
              color: "#fff", cursor: unpublishing ? "not-allowed" : "pointer", flexShrink: 0,
            }}
          >
            {unpublishing ? t("جاري السحب...", "Unpublishing...") : t("سحب النشر", "Unpublish")}
          </button>
        </div>
      )}

      {/* Feedback */}
      {successMsg && (
        <div style={{ padding: "12px 16px", borderRadius: 12, background: "#d1fae5", border: "1px solid #6ee7b7", color: "#065f46", fontWeight: 700, fontSize: 13 }}>
          {successMsg}
        </div>
      )}
      {error && (
        <div style={{ padding: "12px 16px", borderRadius: 12, background: "#fee2e2", color: "#991b1b", fontWeight: 600, fontSize: 13 }}>
          {error}
        </div>
      )}
    </div>
  );
}

const labelStyle = { fontSize: 12, fontWeight: 700, color: "#475569", display: "block", marginBottom: 4 };
const selectStyle = { width: "100%", padding: "9px 12px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 13, background: "#fff", color: "#1e293b", boxSizing: "border-box" };

function StatCard({ label, value, color }) {
  return (
    <div style={{ padding: "10px 20px", borderRadius: 14, background: `${color}14`, border: `1px solid ${color}33`, textAlign: "center", minWidth: 90 }}>
      <p style={{ fontSize: 22, fontWeight: 900, color, margin: 0 }}>{value}</p>
      <p style={{ fontSize: 11, fontWeight: 700, color, margin: 0, textTransform: "uppercase" }}>{label}</p>
    </div>
  );
}
