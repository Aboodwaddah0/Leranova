import { useEffect, useState } from 'react';
import { Award } from 'lucide-react';
import StudentLayout from '../../components/student/StudentLayout';
import CertificatePDF from '../../components/student/CertificatePDF';
import { fetchMyCertificates } from '../../services/studentService';
import { useLanguage } from '../../utils/i18n';
import { useTheme } from '../../contexts/ThemeContext';

const CERT_ID = (id) => `CERT-${String(id).padStart(6, '0')}`;

const gradeColor = (score) => {
  if (score >= 85) return { bg: '#d1fae5', text: '#065f46', label: 'ممتاز' };
  if (score >= 70) return { bg: '#dbeafe', text: '#1e40af', label: 'جيد جداً' };
  if (score >= 60) return { bg: '#fef9c3', text: '#713f12', label: 'جيد' };
  if (score >= 50) return { bg: '#ffedd5', text: '#9a3412', label: 'مقبول' };
  return { bg: '#fee2e2', text: '#991b1b', label: 'راسب' };
};

export default function StudentCertificatesPage() {
  const { isArabic }  = useLanguage();
  const { isDark }    = useTheme();
  const [certs, setCerts]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState(null);

  useEffect(() => {
    fetchMyCertificates()
      .then((data) => setCerts(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const border = isDark ? 'rgba(255,255,255,0.09)' : '#e2e8f0';
  const sub    = isDark ? 'rgba(255,255,255,0.5)'  : '#64748b';

  return (
    <StudentLayout>
      {/* Hero */}
      <section className="rounded-[2rem] bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 p-6 text-white shadow-xl shadow-indigo-500/15">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
            <Award size={28} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-blue-100">
              {isArabic ? 'كشوف النتائج' : 'Academic Transcripts'}
            </p>
            <h1 className="mt-1 text-2xl font-black">
              {isArabic ? 'شهاداتي الدراسية' : 'My Certificates'}
            </h1>
            <p className="mt-1 text-sm text-blue-100/80">
              {isArabic
                ? 'كشف النتائج النهائية لكل فصل دراسي — صادر من إدارة المدرسة'
                : 'End-of-term results transcript — issued by school administration'}
            </p>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="mt-6 space-y-4">
          {[0, 1].map((i) => <div key={i} className="ln-skeleton h-56 rounded-[1.75rem]" />)}
        </div>
      ) : certs.length === 0 ? (
        <div className="mt-6 rounded-[1.75rem] px-6 py-14 text-center text-sm"
          style={{ border: `1.5px dashed ${border}`, color: sub }}>
          {isArabic
            ? 'لا توجد كشوف نتائج منشورة بعد. تواصل مع إدارة المدرسة.'
            : 'No transcripts published yet. Contact your school administration.'}
        </div>
      ) : (
        <div className="mt-6 space-y-5">
          {certs.map((cert) => {
            const avg       = Number(cert.overallAverage ?? 0);
            const gc        = gradeColor(avg);
            const passed    = avg >= 50;
            const subPassed = cert.subjects?.filter(s => s.isPassed).length ?? 0;

            return (
              <div key={cert.id} style={{
                border: `1.5px solid ${border}`,
                borderRadius: '1.75rem',
                background: isDark ? 'rgba(255,255,255,0.03)' : '#fff',
                overflow: 'hidden',
              }}>
                {/* Header strip */}
                <div style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <p style={{ margin: 0, fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.8)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                      {cert.orgName}
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: 15, fontWeight: 900, color: '#fff' }}>
                      {cert.termName} — {cert.academicYear}
                    </p>
                  </div>
                  {/* Overall average badge */}
                  <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: '8px 16px' }}>
                    <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.75)', fontWeight: 700 }}>
                      {isArabic ? 'المعدل العام' : 'Average'}
                    </p>
                    <p style={{ margin: 0, fontSize: 20, fontWeight: 900, color: '#fff' }}>
                      {avg.toFixed(1)}%
                    </p>
                    <p style={{ margin: 0, fontSize: 10, fontWeight: 800, color: passed ? '#86efac' : '#fca5a5' }}>
                      {passed ? (isArabic ? 'ناجح ✓' : 'Passed ✓') : (isArabic ? 'راسب ✗' : 'Failed ✗')}
                    </p>
                  </div>
                </div>

                <div style={{ padding: '16px 20px' }}>
                  {/* Student info row */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 14, paddingBottom: 12, borderBottom: `1px solid ${border}` }}>
                    {[
                      { label: isArabic ? 'الطالب' : 'Student',   value: cert.studentName },
                      { label: isArabic ? 'الصف' : 'Class',       value: cert.trackName },
                      { label: isArabic ? 'رقم الشهادة' : 'Cert ID', value: CERT_ID(cert.id), mono: true },
                    ].map(({ label, value, mono }) => (
                      <div key={label}>
                        <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: sub, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</p>
                        <p style={{ margin: '1px 0 0', fontSize: 13, fontWeight: 800, color: isDark ? '#e2e0f0' : '#1e1b4b', fontFamily: mono ? 'monospace' : 'inherit' }}>{value || '—'}</p>
                      </div>
                    ))}
                  </div>

                  {/* Subjects table */}
                  <div style={{ overflowX: 'auto', marginBottom: 14 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: isDark ? 'rgba(99,102,241,0.15)' : '#f0f0ff' }}>
                          {[
                            isArabic ? 'المادة'   : 'Subject',
                            isArabic ? 'الدرجة'   : 'Score',
                            isArabic ? 'التقدير'  : 'Grade',
                            isArabic ? 'GPA'      : 'GPA',
                            isArabic ? 'النتيجة'  : 'Result',
                          ].map((h) => (
                            <th key={h} style={{ padding: '8px 12px', textAlign: h === (isArabic ? 'المادة' : 'Subject') ? 'start' : 'center', fontSize: 10, fontWeight: 800, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(cert.subjects || []).map((s, i) => {
                          const sc = gradeColor(s.rawScore);
                          return (
                            <tr key={s.subjectId} style={{ borderTop: `1px solid ${border}`, background: i % 2 === 0 ? 'transparent' : isDark ? 'rgba(255,255,255,0.02)' : '#fafafa' }}>
                              <td style={{ padding: '9px 12px', fontWeight: 700, color: isDark ? '#e2e0f0' : '#1e293b' }}>{s.subjectName}</td>
                              <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                                <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 800, background: sc.bg, color: sc.text }}>
                                  {s.rawScore.toFixed(1)}%
                                </span>
                              </td>
                              <td style={{ padding: '9px 12px', textAlign: 'center', fontWeight: 800, color: '#4f46e5' }}>
                                {s.letterGrade || '—'}
                              </td>
                              <td style={{ padding: '9px 12px', textAlign: 'center', color: sub }}>
                                {s.gpaPoints != null ? s.gpaPoints.toFixed(1) : '—'}
                              </td>
                              <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                                <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 800, background: s.isPassed ? '#d1fae5' : '#fee2e2', color: s.isPassed ? '#065f46' : '#991b1b' }}>
                                  {s.isPassed ? (isArabic ? 'ناجح ✓' : 'Passed ✓') : (isArabic ? 'راسب ✗' : 'Failed ✗')}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      {/* Total row */}
                      <tfoot>
                        <tr style={{ borderTop: `2px solid ${isDark ? 'rgba(99,102,241,0.3)' : '#c7d2fe'}`, background: isDark ? 'rgba(99,102,241,0.08)' : '#eef2ff' }}>
                          <td style={{ padding: '9px 12px', fontWeight: 900, color: '#4f46e5', fontSize: 13 }}>
                            {isArabic ? `المجموع (${subPassed}/${cert.subjects?.length} ناجح)` : `Total (${subPassed}/${cert.subjects?.length} passed)`}
                          </td>
                          <td colSpan={2} style={{ padding: '9px 12px', textAlign: 'center' }}>
                            <span style={{ padding: '3px 12px', borderRadius: 999, fontSize: 13, fontWeight: 900, background: gc.bg, color: gc.text }}>
                              {avg.toFixed(1)}% — {gc.label}
                            </span>
                          </td>
                          <td />
                          <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                            <span style={{ padding: '4px 12px', borderRadius: 999, fontSize: 12, fontWeight: 900, background: passed ? '#10b981' : '#ef4444', color: '#fff' }}>
                              {passed ? (isArabic ? 'ناجح ✓' : 'Passed ✓') : (isArabic ? 'راسب ✗' : 'Failed ✗')}
                            </span>
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Download button */}
                  <button
                    type="button"
                    onClick={() => setViewing(cert)}
                    style={{ width: '100%', padding: '11px 0', borderRadius: 14, background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: '#fff', fontWeight: 800, fontSize: 14, border: 'none', cursor: 'pointer' }}
                  >
                    🎓 {isArabic ? 'عرض الشهادة وتحميل PDF' : 'View Certificate & Download PDF'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* PDF viewer */}
      {viewing && (
        <CertificatePDF cert={viewing} isArabic={isArabic} onClose={() => setViewing(null)} />
      )}
    </StudentLayout>
  );
}
