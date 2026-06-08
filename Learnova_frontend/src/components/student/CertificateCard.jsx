import { Award } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

export function CertificateCard({ cert, onPrint }) {
  const { isDark } = useTheme();
  const border = isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0';
  const bg = isDark ? '#111029' : '#fff';
  const text = isDark ? '#f1f0f5' : '#0f172a';
  const sub = isDark ? 'rgba(255,255,255,0.55)' : '#475569';

  return (
    <div
      className="cert-card rounded-[2rem] p-8 shadow-xl shadow-indigo-500/10 flex flex-col gap-4"
      style={{ border: `1.5px solid ${border}`, background: bg }}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-500 text-white shadow-lg">
          <Award size={22} />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.25em]" style={{ color: '#6366f1' }}>
            Certificate of Completion
          </p>
          <p className="text-xs mt-0.5" style={{ color: sub }}>{cert.orgName}</p>
        </div>
      </div>

      <div className="border-t pt-4" style={{ borderColor: border }}>
        <p className="text-sm" style={{ color: sub }}>This certifies that</p>
        <h2 className="mt-1 text-2xl font-black" style={{ color: text }}>{cert.studentName || 'Student'}</h2>
        <p className="mt-3 text-sm" style={{ color: sub }}>
          has successfully completed
        </p>
        <p className="mt-1 text-lg font-bold" style={{ color: text }}>{cert.subjectName}</p>
        {cert.trackName && (
          <p className="text-sm" style={{ color: sub }}>Track: {cert.trackName}</p>
        )}
      </div>

      <div className="border-t pt-3 flex items-center justify-between" style={{ borderColor: border }}>
        <span className="text-xs font-semibold" style={{ color: sub }}>
          {cert.issuedAt ? new Date(cert.issuedAt).toLocaleDateString() : ''}
        </span>
        {onPrint && (
          <button
            type="button"
            onClick={onPrint}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-indigo-500"
          >
            Print Certificate
          </button>
        )}
      </div>
    </div>
  );
}

// School-term variant
export function SchoolCertificateCard({ cert, onPrint }) {
  const { isDark } = useTheme();
  const border = isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0';
  const bg = isDark ? '#111029' : '#fff';
  const text = isDark ? '#f1f0f5' : '#0f172a';
  const sub = isDark ? 'rgba(255,255,255,0.55)' : '#475569';
  const passColor = isDark ? '#34d399' : '#047857';
  const failColor = isDark ? '#f87171' : '#b91c1c';

  return (
    <div
      className="cert-card rounded-[2rem] p-8 shadow-xl shadow-indigo-500/10"
      style={{ border: `1.5px solid ${border}`, background: bg }}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 text-white shadow-lg">
          <Award size={22} />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.25em]" style={{ color: '#10b981' }}>
            Term Report Certificate
          </p>
          <p className="text-xs mt-0.5" style={{ color: sub }}>{cert.orgName} · {cert.termName} · {cert.academicYear}</p>
        </div>
      </div>

      <div className="border-t pt-4 mb-4" style={{ borderColor: border }}>
        <p className="text-sm" style={{ color: sub }}>Student</p>
        <h2 className="mt-0.5 text-xl font-black" style={{ color: text }}>{cert.studentName}</h2>
        {cert.gradeLevel && (
          <p className="text-xs mt-0.5" style={{ color: sub }}>Grade {cert.gradeLevel}</p>
        )}
      </div>

      <div className="space-y-2 mb-4">
        {(cert.subjects || []).map((s) => (
          <div key={s.subjectId} className="flex items-center justify-between rounded-xl px-4 py-2" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc', border: `1px solid ${border}` }}>
            <span className="text-sm font-semibold" style={{ color: text }}>{s.subjectName}</span>
            <div className="flex items-center gap-3 text-xs font-bold">
              <span style={{ color: sub }}>{s.rawScore.toFixed(1)}%</span>
              {s.letterGrade && <span style={{ color: text }}>{s.letterGrade}</span>}
              <span style={{ color: s.isPassed ? passColor : failColor }}>{s.isPassed ? '✓' : '✗'}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t pt-3 flex items-center justify-between" style={{ borderColor: border }}>
        <span className="text-sm font-bold" style={{ color: text }}>
          Overall: {cert.overallAverage?.toFixed(1)}%
        </span>
        {onPrint && (
          <button
            type="button"
            onClick={onPrint}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-500"
          >
            Print Certificate
          </button>
        )}
      </div>
    </div>
  );
}
