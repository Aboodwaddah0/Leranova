import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useLanguage } from "../utils/i18n";
import { getPlansThunk } from "../redux/thunks/authThunks";
import heroImg from "../assets/hero.png";

/* ── Feature cards ──────────────────────────────────────────────────── */
const FEAT_ICONS  = ["🤖", "📚", "🧠", "👨‍👩‍👧", "💬", "📊"];
const FEAT_COLORS = [
  { bg: "#eef2ff", icon: "#4f46e5" },
  { bg: "#eff6ff", icon: "#2379c3" },
  { bg: "#fef9c3", icon: "#b45309" },
  { bg: "#f0fdf4", icon: "#15803d" },
  { bg: "#fdf4ff", icon: "#7c3aed" },
  { bg: "#fff1f2", icon: "#be185d" },
];

/* ── Audience cards ─────────────────────────────────────────────────── */
const AUD_ICONS  = ["🏫", "🎓", "👨‍🏫", "👨‍👩‍👧"];
const AUD_ACCENT = ["#4f46e5", "#7c3aed", "#2379c3", "#0ea5e9"];

export default function LandingPage() {
  const dispatch  = useDispatch();
  const { lang, isArabic, t, toggleLang } = useLanguage();
  const { plans } = useSelector((s) => s.auth);
  const l = t.landing;

  useEffect(() => { dispatch(getPlansThunk()); }, [dispatch]);

  const stats = [
    { value: l.stat1Value, label: l.stat1Label },
    { value: l.stat2Value, label: l.stat2Label },
    { value: l.stat3Value, label: l.stat3Label },
    { value: l.stat4Value, label: l.stat4Label },
  ];

  const features = [
    { title: l.feat1Title, desc: l.feat1Desc },
    { title: l.feat2Title, desc: l.feat2Desc },
    { title: l.feat3Title, desc: l.feat3Desc },
    { title: l.feat4Title, desc: l.feat4Desc },
    { title: l.feat5Title, desc: l.feat5Desc },
    { title: l.feat6Title, desc: l.feat6Desc },
  ];

  const audience = [
    { title: l.aud1Title, desc: l.aud1Desc },
    { title: l.aud2Title, desc: l.aud2Desc },
    { title: l.aud3Title, desc: l.aud3Desc },
    { title: l.aud4Title, desc: l.aud4Desc },
  ];

  const hasPlans = Array.isArray(plans) && plans.length > 0;

  return (
    <main
      dir={isArabic ? "rtl" : "ltr"}
      className={`relative min-h-screen overflow-x-hidden ${isArabic ? "lang-ar" : "lang-en"}`}
      style={{
        background:
          "radial-gradient(circle at 16% 12%, rgba(99,102,241,0.14), transparent 32%), " +
          "radial-gradient(circle at 86% 14%, rgba(168,85,247,0.10), transparent 26%), " +
          "radial-gradient(circle at 78% 84%, rgba(14,165,233,0.08), transparent 28%), " +
          "#f0f2ff",
        color: "#0f172a",
      }}
    >

      {/* ════════════════════════════════════
          NAV
          ════════════════════════════════════ */}
      <nav className="sticky top-0 z-50 mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-10"
        style={{ background: "rgba(255,255,255,0.90)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(229,231,235,0.95)", boxShadow: "0 4px 24px rgba(124,58,237,0.05)" }}>
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl text-white text-lg font-black shadow-lg"
            style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)", boxShadow: "0 8px 20px -8px rgba(99,102,241,0.5)" }}>
            ✦
          </div>
          <span className="text-xl font-black tracking-tight" style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            learnova
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button type="button" onClick={toggleLang}
            className="rounded-xl border px-4 py-2 text-sm font-semibold transition hover:bg-slate-50"
            style={{ borderColor: "rgba(229,231,235,0.95)", color: "#475569", background: "#fff" }}>
            {lang === "en" ? "العربية" : "English"}
          </button>
          <Link to="/login"
            className="hidden rounded-xl px-5 py-2 text-sm font-bold text-white shadow-lg transition hover:opacity-90 sm:block"
            style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)", boxShadow: "0 8px 20px -8px rgba(99,102,241,0.45)" }}>
            {l.loginCta}
          </Link>
        </div>
      </nav>

      {/* ════════════════════════════════════
          HERO BANNER
          ════════════════════════════════════ */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 pt-14 pb-0 lg:px-10 lg:pt-20">
        <div className="overflow-hidden rounded-[32px] shadow-2xl"
          style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5,#3b82f6)", boxShadow: "0 32px 64px -24px rgba(79,70,229,0.45)" }}>
          <div className="grid grid-cols-1 items-center gap-0 lg:grid-cols-2">

            {/* Left text */}
            <div className={`p-8 lg:p-12 ${isArabic ? "text-right" : "text-left"}`}>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold"
                style={{ background: "rgba(255,255,255,0.15)", color: "#e0e7ff" }}>
                <span>✦</span>
                {isArabic ? "منصة تعليمية ذكية" : "Smart Learning Platform"}
              </div>
              <h1 className="text-3xl font-black leading-tight text-white md:text-4xl xl:text-5xl">
                {l.heroTitle}
              </h1>
              <p className="mt-4 max-w-lg text-base leading-7" style={{ color: "rgba(224,231,255,0.85)" }}>
                {l.heroSubtitle}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/signup"
                  className="inline-flex h-11 items-center justify-center rounded-2xl px-6 text-sm font-bold text-indigo-700 shadow transition hover:bg-slate-50"
                  style={{ background: "#ffffff" }}>
                  {l.startNow}
                </Link>
                <Link to="/login"
                  className="inline-flex h-11 items-center justify-center rounded-2xl border px-6 text-sm font-semibold text-white transition hover:bg-white/20"
                  style={{ borderColor: "rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.1)" }}>
                  {l.loginCta}
                </Link>
              </div>
            </div>

            {/* Right — 3D visual */}
            <div className="relative hidden items-center justify-center py-10 lg:flex" style={{ perspective: "800px" }}>
              {/* Glow ring */}
              <div className="absolute h-64 w-64 rounded-full lp-pulse"
                style={{ background: "radial-gradient(circle, rgba(255,255,255,0.2) 0%, transparent 70%)" }} />

              {/* Central circle */}
              <div className="lp-float relative flex h-44 w-44 flex-col items-center justify-center rounded-full shadow-2xl"
                style={{ background: "rgba(255,255,255,0.15)", border: "2px solid rgba(255,255,255,0.25)", backdropFilter: "blur(8px)", transform: "perspective(800px) rotateY(-6deg) rotateX(4deg)", boxShadow: "0 24px 48px rgba(0,0,0,0.2)" }}>
                <span className="text-5xl">🤖</span>
                <span className="mt-1 text-xs font-bold text-indigo-200">AI</span>
              </div>

              {/* Floating mini-cards */}
              <div className="lp-float absolute right-6 top-8 flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-bold shadow-lg"
                style={{ background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.25)", backdropFilter: "blur(8px)", color: "#fff", animationDelay: "0.5s" }}>
                <span className="flex h-6 w-6 items-center justify-center rounded-lg text-[10px] font-black text-indigo-700" style={{ background: "#fff" }}>AI</span>
                {isArabic ? "تعلم ذكي" : "Smart Learning"}
              </div>

              <div className="lp-float absolute bottom-10 left-4 flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-bold shadow-lg"
                style={{ background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.25)", backdropFilter: "blur(8px)", color: "#fff", animationDelay: "1s" }}>
                <span className="text-base">📚</span>
                {isArabic ? "إدارة المحتوى" : "Content Hub"}
              </div>

              <div className="lp-float-slow absolute left-4 top-10 flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-bold shadow-lg"
                style={{ background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.25)", backdropFilter: "blur(8px)", color: "#fff", animationDelay: "0.8s" }}>
                <span className="text-base">✅</span>
                98%
              </div>

              <div className="lp-float-slow absolute bottom-6 right-2" style={{ animationDelay: "1.6s" }}>
                <img src={heroImg} alt="" className="h-20 w-20 drop-shadow-2xl"
                  style={{ filter: "drop-shadow(0 0 16px rgba(255,255,255,0.4))" }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════
          STATS
          ════════════════════════════════════ */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 py-10 lg:px-10">
        <div className="overflow-hidden rounded-[24px] border shadow-sm"
          style={{ background: "#ffffff", borderColor: "rgba(229,231,235,0.95)", boxShadow: "0 4px 24px rgba(124,58,237,0.07)" }}>
          <div className="grid grid-cols-2 divide-x divide-slate-100 md:grid-cols-4">
            {stats.map((s, i) => (
              <div key={i} className="flex flex-col items-center justify-center px-6 py-7 text-center">
                <p className="text-3xl font-black" style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  {s.value}
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-500">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════
          FEATURES
          ════════════════════════════════════ */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-16 lg:px-10">
        <div className={`mb-8 ${isArabic ? "text-right" : "text-left"}`}>
          <p className="mb-2 text-xs font-black uppercase tracking-[0.22em]" style={{ color: "#4f46e5" }}>
            {isArabic ? "المميزات" : "Features"}
          </p>
          <h2 className="text-3xl font-black text-slate-900 md:text-4xl">{l.featuresTitle}</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <div key={i} className="flex gap-4 rounded-[20px] border p-5 transition hover:shadow-md"
              style={{ background: "#ffffff", borderColor: "rgba(229,231,235,0.95)", boxShadow: "0 2px 12px rgba(124,58,237,0.06)" }}>
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl text-xl shadow-sm"
                style={{ background: FEAT_COLORS[i].bg }}>
                {FEAT_ICONS[i]}
              </div>
              <div className="min-w-0">
                <p className="font-black text-slate-900">{f.title}</p>
                <p className="mt-1.5 text-xs leading-5 text-slate-500">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ════════════════════════════════════
          AUDIENCE
          ════════════════════════════════════ */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-16 lg:px-10">
        <div className={`mb-8 ${isArabic ? "text-right" : "text-left"}`}>
          <p className="mb-2 text-xs font-black uppercase tracking-[0.22em]" style={{ color: "#4f46e5" }}>
            {isArabic ? "لمن؟" : "Who is it for?"}
          </p>
          <h2 className="text-3xl font-black text-slate-900 md:text-4xl">{l.audienceTitle}</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {audience.map((a, i) => (
            <div key={i} className="rounded-[20px] border p-5 transition hover:shadow-md"
              style={{ background: "#ffffff", borderColor: "rgba(229,231,235,0.95)", borderTop: `3px solid ${AUD_ACCENT[i]}`, boxShadow: "0 2px 12px rgba(124,58,237,0.06)" }}>
              <div className="mb-3 text-3xl">{AUD_ICONS[i]}</div>
              <p className="font-black text-slate-900">{a.title}</p>
              <p className="mt-2 text-xs leading-5 text-slate-500">{a.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ════════════════════════════════════
          PLANS
          ════════════════════════════════════ */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-24 lg:px-10">
        <div className={`mb-8 ${isArabic ? "text-right" : "text-left"}`}>
          <p className="mb-2 text-xs font-black uppercase tracking-[0.22em]" style={{ color: "#4f46e5" }}>
            {isArabic ? "الأسعار" : "Pricing"}
          </p>
          <h2 className="text-3xl font-black text-slate-900 md:text-4xl">{l.plansTitle}</h2>
          <p className="mt-2 text-slate-500">{l.plansSubtitle}</p>
        </div>

        {hasPlans ? (
          <div className={`grid gap-5 sm:grid-cols-2 lg:grid-cols-${Math.min(plans.length, 3)}`}>
            {plans.map((plan, i) => {
              const isPopular = i === 1 || plan.isPopular || plan.recommended;
              const price = Number(plan.price ?? plan.Price ?? 0);
              const name  = plan.name || plan.Name || `Plan ${i + 1}`;
              const feats = Array.isArray(plan.features) ? plan.features
                : Array.isArray(plan.Features) ? plan.Features : [];

              return (
                <div key={plan.id || i}
                  className="relative flex flex-col rounded-[24px] border p-6 transition hover:shadow-lg"
                  style={{
                    background: isPopular ? "linear-gradient(135deg,#f5f3ff,#ede9fe)" : "#ffffff",
                    borderColor: isPopular ? "#a78bfa" : "rgba(229,231,235,0.95)",
                    boxShadow: isPopular
                      ? "0 8px 32px rgba(124,58,237,0.18)"
                      : "0 2px 12px rgba(124,58,237,0.06)",
                  }}>
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-4 py-1 text-xs font-bold text-white shadow-lg"
                      style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)" }}>
                      {isArabic ? "الأكثر شيوعاً" : "Most Popular"}
                    </div>
                  )}
                  <p className="text-lg font-black text-slate-900">{name}</p>
                  <div className="mt-3 flex items-end gap-1">
                    <span className="text-4xl font-black"
                      style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                      {price === 0 ? l.planFree : `$${price}`}
                    </span>
                    {price > 0 && <span className="mb-1 text-sm text-slate-400">{l.planPerMonth}</span>}
                  </div>
                  {(plan.description || plan.Description) && (
                    <p className="mt-2 text-sm text-slate-500">{plan.description || plan.Description}</p>
                  )}
                  {feats.length > 0 && (
                    <ul className="mt-4 space-y-2 border-t border-slate-100 pt-4">
                      {feats.map((f, fi) => (
                        <li key={fi} className="flex items-start gap-2 text-sm text-slate-600">
                          <span className="mt-0.5 flex-shrink-0 font-bold" style={{ color: "#4f46e5" }}>✓</span>
                          <span>{typeof f === "string" ? f : f.name || f.feature || ""}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <Link to="/signup"
                    className="mt-6 inline-flex w-full items-center justify-center rounded-2xl py-3 text-sm font-bold transition"
                    style={isPopular
                      ? { background: "linear-gradient(135deg,#4f46e5,#7c3aed)", color: "#fff", boxShadow: "0 8px 20px -8px rgba(99,102,241,0.45)" }
                      : { background: "#f1f5f9", color: "#0f172a" }}>
                    {l.planCta}
                  </Link>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-[24px] border px-8 py-16 text-center"
            style={{ background: "#ffffff", borderColor: "rgba(229,231,235,0.95)", boxShadow: "0 4px 24px rgba(124,58,237,0.07)" }}>
            <p className="text-2xl font-black text-slate-900">{l.noPlans}</p>
            <Link to="/signup"
              className="mt-5 inline-flex h-12 items-center justify-center rounded-2xl px-8 font-bold text-white shadow-lg transition hover:opacity-90"
              style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)", boxShadow: "0 8px 20px -8px rgba(99,102,241,0.45)" }}>
              {l.startNow}
            </Link>
          </div>
        )}
      </section>

      {/* ════════════════════════════════════
          FOOTER
          ════════════════════════════════════ */}
      <footer className="relative z-10 border-t py-8 text-center"
        style={{ background: "#ffffff", borderColor: "rgba(229,231,235,0.95)" }}>
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg text-white text-sm font-black"
            style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)" }}>✦</div>
          <span className="font-black" style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>learnova</span>
        </div>
        <p className="text-xs text-slate-400">
          © {new Date().getFullYear()} Learnova &nbsp;·&nbsp;
          <Link to="/login"  className="font-semibold hover:underline" style={{ color: "#4f46e5" }}>{l.loginCta}</Link>
          &nbsp;·&nbsp;
          <Link to="/signup" className="font-semibold hover:underline" style={{ color: "#4f46e5" }}>{l.signupCta}</Link>
        </p>
      </footer>
    </main>
  );
}
