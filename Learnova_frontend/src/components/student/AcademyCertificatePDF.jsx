/**
 * AcademyCertificatePDF.jsx
 * Udemy/Udacity-style course completion certificate for academy students.
 * Shows: student name, specialization, course, date, cert ID, QR, and hours.
 */

import { useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

const CERT_ID = (id) => `CERT-${String(id).padStart(6, "0")}`;

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" })
    : "";

/** Estimate total course hours: each lesson ≈ 2 h, minimum 5 h */
const calcHours = (lessonCount) => Math.max(5, (lessonCount ?? 3) * 2);

export default function AcademyCertificatePDF({ cert, onClose }) {
  const certRef   = useRef(null);
  const [loading, setLoading] = useState(false);

  const cid     = CERT_ID(cert.id);
  const hours   = calcHours(cert.lessonCount);
  const issueDate = fmtDate(cert.issuedAt);

  const qrValue = [
    `Certificate: ${cid}`,
    `Student: ${cert.studentName}`,
    `Course: ${cert.subjectName}`,
    `Track: ${cert.trackName}`,
    `Issued: ${issueDate}`,
    `Academy: ${cert.orgName}`,
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
          html2canvas: { scale: 2, useCORS: true, logging: false, windowWidth: 1122 },
          jsPDF:       { unit: "px", format: [1122, 794], orientation: "landscape" },
        })
        .from(certRef.current)
        .save();
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(5,5,15,0.95)",
      display: "flex", flexDirection: "column", alignItems: "center",
      overflowY: "auto", padding: "20px 16px 60px",
    }}>
      {/* Toolbar */}
      <div style={{
        position: "sticky", top: 0, zIndex: 10,
        display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap",
        background: "rgba(5,5,15,0.92)", padding: "12px 20px", borderRadius: 16,
        backdropFilter: "blur(12px)", marginBottom: 24,
        width: "100%", maxWidth: 540, boxSizing: "border-box",
      }}>
        <button type="button" onClick={downloadPDF} disabled={loading} style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "10px 28px", borderRadius: 12,
          background: loading ? "#6b7280" : "linear-gradient(135deg,#a855f7,#6366f1)",
          color: "#fff", fontWeight: 800, fontSize: 14, border: "none",
          cursor: loading ? "wait" : "pointer", minWidth: 160,
        }}>
          {loading ? "⏳ Generating..." : "⬇ Download PDF"}
        </button>
        <button type="button" onClick={onClose} style={{
          padding: "10px 24px", borderRadius: 12,
          background: "rgba(255,255,255,0.08)", color: "#fff",
          fontWeight: 700, fontSize: 14,
          border: "1px solid rgba(255,255,255,0.18)", cursor: "pointer",
        }}>✕ Close</button>
      </div>

      {/* Scale wrapper for screen preview */}
      <div style={{ transform: "scale(0.72)", transformOrigin: "top center", marginBottom: "-220px" }}>

        {/* ── A4 Landscape — 1122 × 794 px ──────────────────────────────── */}
        <div ref={certRef} style={{
          width: 1122, height: 794,
          background: "#fff",
          fontFamily: "'Segoe UI', Arial, sans-serif",
          position: "relative",
          overflow: "hidden",
          boxSizing: "border-box",
          boxShadow: "0 32px 100px rgba(0,0,0,0.7)",
          display: "flex",
        }}>

          {/* ── Left accent strip ────────────────────────────────────────── */}
          <div style={{
            width: 8,
            background: "linear-gradient(180deg, #a855f7 0%, #6366f1 50%, #06b6d4 100%)",
            flexShrink: 0,
          }} />

          {/* ── Left panel (dark) ─────────────────────────────────────────── */}
          <div style={{
            width: 340, flexShrink: 0,
            background: "linear-gradient(160deg, #0f0a1e 0%, #1a0a2e 60%, #0a1628 100%)",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            padding: "40px 32px",
            position: "relative", overflow: "hidden",
          }}>

            {/* Subtle glow circles */}
            <div style={{ position: "absolute", top: -60, left: -60, width: 220, height: 220, borderRadius: "50%", background: "radial-gradient(circle, rgba(168,85,247,0.15) 0%, transparent 70%)" }} />
            <div style={{ position: "absolute", bottom: -40, right: -40, width: 180, height: 180, borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)" }} />

            {/* Org logo placeholder */}
            <div style={{
              width: 80, height: 80, borderRadius: "50%",
              background: "linear-gradient(135deg, #a855f7, #6366f1)",
              display: "flex", alignItems: "center", justifyContent: "center",
              marginBottom: 20,
              boxShadow: "0 8px 32px rgba(168,85,247,0.4)",
            }}>
              <span style={{ fontSize: 38 }}>🎓</span>
            </div>

            {/* Org name */}
            <p style={{
              margin: "0 0 6px", fontSize: 13, fontWeight: 800,
              color: "rgba(255,255,255,0.9)", textAlign: "center",
              letterSpacing: "0.05em", textTransform: "uppercase",
            }}>{cert.orgName}</p>

            {/* Divider */}
            <div style={{ width: 40, height: 2, background: "linear-gradient(90deg,#a855f7,#6366f1)", borderRadius: 2, margin: "12px 0" }} />

            {/* "CERTIFICATE OF COMPLETION" */}
            <p style={{
              margin: 0, fontSize: 11, fontWeight: 700,
              color: "rgba(255,255,255,0.5)",
              letterSpacing: "0.18em", textTransform: "uppercase", textAlign: "center",
            }}>Certificate of</p>
            <p style={{
              margin: "4px 0 0", fontSize: 22, fontWeight: 900,
              color: "#fff", letterSpacing: "0.05em", textAlign: "center",
            }}>Completion</p>

            {/* QR code */}
            <div style={{
              marginTop: 32,
              padding: 8, borderRadius: 12, background: "#fff",
              boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
            }}>
              <QRCodeSVG value={qrValue} size={90} fgColor="#1a0a2e" bgColor="#ffffff" level="M" />
            </div>
            <p style={{
              margin: "8px 0 0", fontSize: 10, color: "rgba(255,255,255,0.4)",
              letterSpacing: "0.08em",
            }}>Scan to verify</p>
          </div>

          {/* ── Right panel (white) ───────────────────────────────────────── */}
          <div style={{
            flex: 1, display: "flex", flexDirection: "column",
            justifyContent: "center", padding: "50px 56px",
            position: "relative",
          }}>

            {/* Watermark */}
            <div style={{
              position: "absolute", top: 0, right: -20,
              fontSize: 180, fontWeight: 900, color: "rgba(168,85,247,0.04)",
              userSelect: "none", lineHeight: 1, pointerEvents: "none",
            }}>★</div>

            {/* "This is to certify that" */}
            <p style={{
              margin: 0, fontSize: 14, color: "#94a3b8",
              letterSpacing: "0.06em", fontStyle: "italic",
            }}>
              This is to certify that
            </p>

            {/* Student name */}
            <h1 style={{
              margin: "10px 0 0", fontSize: 48, fontWeight: 900,
              color: "#0f172a", letterSpacing: "-0.02em", lineHeight: 1.1,
            }}>{cert.studentName || "Student"}</h1>

            {/* "has successfully completed" */}
            <p style={{
              margin: "18px 0 0", fontSize: 15, color: "#64748b",
              letterSpacing: "0.03em",
            }}>
              has successfully completed the course
            </p>

            {/* Course name */}
            <div style={{
              marginTop: 10,
              padding: "14px 20px",
              borderLeft: "4px solid #a855f7",
              background: "linear-gradient(90deg, rgba(168,85,247,0.06), transparent)",
              borderRadius: "0 8px 8px 0",
            }}>
              <h2 style={{
                margin: 0, fontSize: 26, fontWeight: 800,
                color: "#1e1b4b", letterSpacing: "-0.01em",
              }}>{cert.subjectName || "Course"}</h2>

              {cert.trackName && (
                <p style={{
                  margin: "4px 0 0", fontSize: 13, color: "#7c3aed",
                  fontWeight: 700, letterSpacing: "0.04em",
                }}>
                  {cert.trackName}
                </p>
              )}
            </div>

            {/* Meta row: date + cert ID */}
            <div style={{
              marginTop: 28,
              display: "flex", gap: 32, alignItems: "flex-start",
            }}>
              <div>
                <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.12em", textTransform: "uppercase" }}>Date of Issue</p>
                <p style={{ margin: "3px 0 0", fontSize: 15, fontWeight: 800, color: "#1e293b" }}>{issueDate}</p>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.12em", textTransform: "uppercase" }}>Certificate ID</p>
                <p style={{ margin: "3px 0 0", fontSize: 15, fontWeight: 800, color: "#7c3aed", fontFamily: "monospace", letterSpacing: "0.05em" }}>{cid}</p>
              </div>
            </div>

            {/* Bottom completion banner */}
            <div style={{
              marginTop: 36,
              padding: "16px 24px",
              borderRadius: 14,
              background: "linear-gradient(135deg, #f5f3ff, #eef2ff)",
              border: "1.5px solid #e0e7ff",
              display: "flex", alignItems: "center", gap: 14,
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
                background: "linear-gradient(135deg, #a855f7, #6366f1)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 4px 12px rgba(168,85,247,0.3)",
              }}>
                <span style={{ fontSize: 22 }}>✓</span>
              </div>
              <div>
                <p style={{
                  margin: 0, fontSize: 16, fontWeight: 800, color: "#1e1b4b",
                }}>
                  Successfully completed with&nbsp;
                  <span style={{ color: "#7c3aed" }}>{hours}+ hours</span>
                  &nbsp;of learning
                </p>
                <p style={{
                  margin: "2px 0 0", fontSize: 12, color: "#94a3b8",
                }}>
                  All lessons and assessments fulfilled · Verified by {cert.orgName}
                </p>
              </div>
            </div>

          </div>

          {/* ── Right accent strip ────────────────────────────────────────── */}
          <div style={{
            width: 8,
            background: "linear-gradient(180deg, #06b6d4 0%, #6366f1 50%, #a855f7 100%)",
            flexShrink: 0,
          }} />

        </div>
        {/* ── End A4 ── */}

      </div>
    </div>
  );
}
