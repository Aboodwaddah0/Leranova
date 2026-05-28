import { useTheme } from "../../contexts/ThemeContext";

export default function AdminStatCard({ label, value, hint }) {
  const { isDark } = useTheme();
  return (
    <div
      className="rounded-3xl p-5"
      style={{
        background: isDark ? "rgba(45,37,56,0.8)" : "#ffffff",
        border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "#e2e8f0"}`,
        boxShadow: isDark ? "none" : "0 12px 30px -24px rgba(15,23,42,0.4)",
      }}
    >
      <p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: isDark ? "rgba(167,139,250,0.7)" : "#64748b" }}>{label}</p>
      <p className="mt-3 text-3xl font-black" style={{ color: isDark ? "#f5f3f7" : "#0f172a" }}>{value}</p>
      {hint ? <p className="mt-2 text-sm" style={{ color: isDark ? "rgba(255,255,255,0.45)" : "#64748b" }}>{hint}</p> : null}
    </div>
  );
}
