import { useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

const CERT_ID = (id) => `CERT-${String(id).padStart(6, "0")}`;

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" }) : "";

const gradeColor = (score) => {
  if (score >= 85) return { bg: "#d1fae5", text: "#065f46", label: "Excellent" };
  if (score >= 70) return { bg: "#dbeafe", text: "#1e40af", label: "Very Good" };
  if (score >= 60) return { bg: "#fef9c3", text: "#713f12", label: "Good" };
  if (score >= 50) return { bg: "#ffedd5", text: "#9a3412", label: "Pass" };
  return { bg: "#fee2e2", text: "#991b1b", label: "Fail" };
};

export default function CertificatePDF({ cert, onClose }) {
  const certRef   = useRef(null);
  const [loading, setLoading] = useState(false);

  const cid  = CERT_ID(cert.id);
  const avg  = Number(cert.overallAverage ?? 0);
  const passed = avg >= 50;
  const gc   = gradeColor(avg);
  const subPassed = cert.subjects?.filter((s) => s.isPassed).length ?? 0;
  const subTotal  = cert.subjects?.length ?? 0;

  const qrText = [
    `ID: ${cid}`,
    `Student: ${cert.studentName}`,
    `School: ${cert.orgName}`,
    `Term: ${cert.termName}`,
    `Average: ${avg.toFixed(1)}%`,
    `Issued: ${cert.issuedAt}`,
  ].join("\n");

  const downloadPDF = async () => {
    if (!certRef.current) return;
    setLoading(true);
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      await html2pdf()
        .set({
          margin:      0,
          filename:    `${cid}.pdf`,
          image:       { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, logging: false, windowWidth: 794 },
          jsPDF:       { unit: "px", format: [794, 1122], orientation: "portrait" },
        })
        .from(certRef.current)
        .save();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(10,10,20,0.92)", display: "flex", flexDirection: "column", alignItems: "center", overflowY: "auto", padding: "20px 16px 60px" }}>

      {/* Toolbar */}
      <div style={{ position: "sticky", top: 0, zIndex: 10, display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", background: "rgba(10,10,20,0.9)", padding: "12px 20px", borderRadius: 16, backdropFilter: "blur(8px)", marginBottom: 24, width: "100%", maxWidth: 500, boxSizing: "border-box" }}>
        <button type="button" onClick={downloadPDF} disabled={loading}
          style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 28px", borderRadius: 12, background: loading ? "#6b7280" : "linear-gradient(135deg,#4f46e5,#7c3aed)", color: "#fff", fontWeight: 800, fontSize: 14, border: "none", cursor: loading ? "wait" : "pointer", minWidth: 160 }}>
          {loading ? "⏳ Generating..." : "⬇ Download PDF"}
        </button>
        <button type="button" onClick={onClose}
          style={{ padding: "10px 24px", borderRadius: 12, background: "rgba(255,255,255,0.1)", color: "#fff", fontWeight: 700, fontSize: 14, border: "1px solid rgba(255,255,255,0.2)", cursor: "pointer" }}>
          ✕ Close
        </button>
      </div>

      {/* Scale wrapper — ONLY for screen preview, NOT captured by html2pdf */}
      <div style={{ transform: "scale(0.62)", transformOrigin: "top center", marginBottom: "-420px" }}>

        {/* ── A4 Portrait certificate — 794×1122 px ─────────────────────── */}
        <div ref={certRef} style={{
          width: 794, minHeight: 1122,
          background: "#fff",
          fontFamily: "'Segoe UI', Arial, sans-serif",
          position: "relative",
          overflow: "hidden",
          boxSizing: "border-box",
          boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
        }}>
          {/* Top gradient bar */}
          <div style={{ height: 10, background: "linear-gradient(90deg,#4338ca,#7c3aed,#0891b2)" }} />

          {/* Outer border frame */}
          <div style={{ position: "absolute", top: 18, left: 18, right: 18, bottom: 18, border: "1.5px solid #e0e7ff", borderRadius: 4, pointerEvents: "none" }} />

          {/* Watermark */}
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.03, fontSize: 120, fontWeight: 900, color: "#4338ca", userSelect: "none", letterSpacing: "0.1em" }}>
            LEARNOVA
          </div>

          <div style={{ padding: "40px 56px 40px" }}>

            {/* ── Header ──────────────────────────────────────────────────── */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
              {/* School seal */}
              <div style={{ width: 72, height: 72, borderRadius: "50%", background: "linear-gradient(135deg,#4338ca,#7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 4px 16px rgba(67,56,202,0.3)" }}>
                <span style={{ fontSize: 36 }}>🎓</span>
              </div>

              {/* Title */}
              <div style={{ textAlign: "center", flex: 1, padding: "0 24px" }}>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "#4338ca", letterSpacing: "0.05em", unicodeBidi: "plaintext", direction: "ltr", textAlign: "center" }}>
                  {cert.orgName}
                </p>
                <h1 style={{ margin: "6px 0 4px", fontSize: 32, fontWeight: 900, color: "#1e1b4b", letterSpacing: "0.04em" }}>
                  Academic Transcript
                </h1>
                <p style={{ margin: 0, fontSize: 13, color: "#94a3b8", letterSpacing: "0.08em" }}>
                  End of Term Certificate of Achievement
                </p>
              </div>

              {/* QR code — rendered as SVG via qrcode.react */}
              {qrText && (
                <div style={{ textAlign: "center", flexShrink: 0 }}>
                  <div style={{ width: 72, height: 72, borderRadius: 8, border: "1px solid #e0e7ff", overflow: "hidden", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <QRCodeSVG value={qrText} size={64} fgColor="#312e81" bgColor="#ffffff" level="M" />
                  </div>
                  <p style={{ margin: "4px 0 0", fontSize: 10, color: "#94a3b8" }}>Scan to verify</p>
                </div>
              )}
            </div>

            {/* Divider */}
            <div style={{ height: 2, background: "linear-gradient(90deg,transparent,#c7d2fe,transparent)", marginBottom: 28 }} />

            {/* ── Student Info ─────────────────────────────────────────────── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 28, padding: "20px 24px", background: "#f8faff", borderRadius: 12, border: "1px solid #e0e7ff" }}>
              {[
                { label: "STUDENT NAME",   value: cert.studentName },
                { label: "CLASS / GRADE",  value: cert.trackName },
                { label: "ACADEMIC YEAR",  value: cert.academicYear },
                { label: "TERM",           value: cert.termName },
                { label: "DATE OF ISSUE",  value: fmtDate(cert.issuedAt) },
                { label: "CERTIFICATE ID", value: cid, mono: true },
              ].map(({ label, value, mono }) => (
                <div key={label}>
                  <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.12em" }}>{label}</p>
                  <p style={{ margin: "3px 0 0", fontSize: 15, fontWeight: 800, color: mono ? "#4338ca" : "#1e1b4b", fontFamily: mono ? "monospace" : "inherit" }}>
                    {value || "—"}
                  </p>
                </div>
              ))}
            </div>

            {/* ── Subjects Table ───────────────────────────────────────────── */}
            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 24 }}>
              <thead>
                <tr style={{ background: "#4338ca" }}>
                  {["Subject", "Score", "Grade", "GPA", "Result"].map((h) => (
                    <th key={h} style={{ padding: "12px 16px", color: "#fff", fontWeight: 800, fontSize: 12, textAlign: h === "Subject" ? "left" : "center", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(cert.subjects || []).map((s, i) => {
                  const sc = gradeColor(s.rawScore);
                  return (
                    <tr key={s.subjectId} style={{ background: i % 2 === 0 ? "#fff" : "#f8faff", borderBottom: "1px solid #e0e7ff" }}>
                      <td style={{ padding: "13px 16px", fontWeight: 700, fontSize: 14, color: "#1e293b" }}>{s.subjectName}</td>
                      <td style={{ padding: "13px 16px", textAlign: "center" }}>
                        <span style={{ padding: "4px 12px", borderRadius: 999, fontSize: 13, fontWeight: 800, background: sc.bg, color: sc.text }}>
                          {s.rawScore.toFixed(1)}%
                        </span>
                      </td>
                      <td style={{ padding: "13px 16px", textAlign: "center", fontWeight: 800, fontSize: 15, color: "#4338ca" }}>
                        {s.letterGrade || "—"}
                      </td>
                      <td style={{ padding: "13px 16px", textAlign: "center", fontSize: 13, color: "#64748b" }}>
                        {s.gpaPoints != null ? Number(s.gpaPoints).toFixed(1) : "—"}
                      </td>
                      <td style={{ padding: "13px 16px", textAlign: "center" }}>
                        <span style={{ padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 800, background: s.isPassed ? "#d1fae5" : "#fee2e2", color: s.isPassed ? "#065f46" : "#991b1b" }}>
                          {s.isPassed ? "Passed ✓" : "Failed ✗"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {/* Summary footer */}
              <tfoot>
                <tr style={{ background: "#eef2ff", borderTop: "2px solid #c7d2fe" }}>
                  <td style={{ padding: "16px 16px", fontWeight: 900, fontSize: 14, color: "#4338ca" }}>
                    Overall Result &nbsp;·&nbsp; {subPassed} / {subTotal} subjects passed
                  </td>
                  <td colSpan={2} style={{ padding: "16px 16px", textAlign: "center", verticalAlign: "middle" }}>
                    <span style={{ display: "inline-block", padding: "6px 20px", borderRadius: 999, fontSize: 14, fontWeight: 900, background: gc.bg, color: gc.text }}>
                      {avg.toFixed(1)}% &nbsp;—&nbsp; {gc.label}
                    </span>
                  </td>
                  <td colSpan={2} style={{ padding: "16px 16px", textAlign: "center", verticalAlign: "middle" }}>
                    <span style={{ display: "inline-block", padding: "8px 24px", borderRadius: 999, fontSize: 14, fontWeight: 900, background: passed ? "#10b981" : "#ef4444", color: "#fff", boxShadow: passed ? "0 2px 8px rgba(16,185,129,0.3)" : "0 2px 8px rgba(239,68,68,0.3)" }}>
                      {passed ? "PASSED ✓" : "FAILED ✗"}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>

            {/* ── Signature / Footer ──────────────────────────────────────── */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 32, paddingTop: 20, borderTop: "1px solid #e0e7ff" }}>
              {/* Signature line */}
              <div style={{ textAlign: "center" }}>
                <div style={{ width: 160, height: 1, background: "#475569", marginBottom: 8 }} />
                <p style={{ margin: 0, fontSize: 12, color: "#475569", fontWeight: 600 }}>School Principal</p>
                <p style={{ margin: "2px 0 0", fontSize: 11, color: "#94a3b8" }}>{cert.orgName}</p>
              </div>

              {/* Cert ID */}
              <div style={{ textAlign: "center" }}>
                <p style={{ margin: 0, fontSize: 11, color: "#94a3b8", letterSpacing: "0.08em" }}>CERTIFICATE ID</p>
                <p style={{ margin: "2px 0 0", fontSize: 13, fontWeight: 900, color: "#4338ca", fontFamily: "monospace", letterSpacing: "0.05em" }}>{cid}</p>
              </div>

              {/* Official stamp */}
              <div style={{ textAlign: "center" }}>
                <div style={{ width: 160, height: 1, background: "#475569", marginBottom: 8 }} />
                <p style={{ margin: 0, fontSize: 12, color: "#475569", fontWeight: 600 }}>Official Stamp</p>
                <p style={{ margin: "2px 0 0", fontSize: 11, color: "#94a3b8" }}>{fmtDate(cert.issuedAt)}</p>
              </div>
            </div>

          </div>

          {/* Bottom gradient bar */}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 8, background: "linear-gradient(90deg,#0891b2,#7c3aed,#4338ca)" }} />
        </div>
        {/* ── End of A4 ── */}

      </div>{/* end scale wrapper */}

    </div>
  );
}
