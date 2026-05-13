import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  ArrowRight, BarChart3, Bot, Brain, BookOpen, Building2,
  CheckCircle2, ChevronRight, Globe2, GraduationCap, LayoutDashboard,
  Menu, MessageCircle, ShieldCheck, Sparkles, Target, Users, Video, X, Zap,
} from "lucide-react";
import heroImg from "../assets/hero.png";
import { getPlansThunk } from "../redux/thunks/authThunks";
import { AUTH_ROLES } from "../utils/constants";
import { useLanguage } from "../utils/i18n";

const getDashboardPath = (role) => {
  switch (String(role || "").toUpperCase()) {
    case AUTH_ROLES.ADMIN:        return "/admin";
    case AUTH_ROLES.ORGANIZATION: return "/dashboard/organization";
    case AUTH_ROLES.INSTRUCTOR:   return "/dashboard/instructor/overview";
    case AUTH_ROLES.STUDENT:      return "/dashboard/student";
    case AUTH_ROLES.PARENT:       return "/dashboard/parent";
    default:                      return "/dashboard";
  }
};

const scrollToSection = (id) => {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
};

const formatFeatureList = (features = []) => {
  if (!Array.isArray(features)) return [];
  return features.map((item) => {
    if (typeof item === "string") return item;
    return item?.name || item?.feature || item?.label || item?.title || "";
  }).filter(Boolean);
};

/* ─── Gradient text helper ─────────────────────────────────────────────── */
const GRAD_TEXT = {
  background: "linear-gradient(135deg, #a78bfa 0%, #38bdf8 60%, #34d399 100%)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  backgroundClip: "text",
};

export default function LandingPage() {
  const dispatch = useDispatch();
  const { lang, isArabic, t, toggleLang } = useLanguage();
  const { plans, isAuthenticated, role } = useSelector((s) => s.auth);
  const l = t.landing;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => { dispatch(getPlansThunk()); }, [dispatch]);
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const planList       = Array.isArray(plans) ? plans : [];
  const dashboardPath  = isAuthenticated ? getDashboardPath(role) : "/signup";
  const primaryAction  = isAuthenticated ? { label: l.dashboardCta, href: dashboardPath } : { label: l.startNow, href: "/signup" };
  const secondaryAction = isAuthenticated ? { label: l.exploreCta, isAnchor: true } : { label: l.loginCta, href: "/login" };

  const navLinks = [
    { id: "features",  label: isArabic ? "المميزات"   : "Features"     },
    { id: "solutions", label: isArabic ? "الحلول"     : "Solutions"    },
    { id: "workflow",  label: isArabic ? "كيف يعمل"  : "How it works"  },
    { id: "pricing",   label: isArabic ? "الأسعار"    : "Pricing"      },
    { id: "about",     label: isArabic ? "عن المنصة"  : "About"        },
  ];

  const featureCards = [
    { icon: Bot,           title: l.feat1Title, desc: l.feat1Desc, color: "#818cf8", glow: "rgba(99,102,241,0.18)",  bg: "linear-gradient(135deg,#6366f1,#4f46e5)" },
    { icon: BookOpen,      title: l.feat2Title, desc: l.feat2Desc, color: "#38bdf8", glow: "rgba(14,165,233,0.18)",  bg: "linear-gradient(135deg,#0ea5e9,#0284c7)" },
    { icon: Brain,         title: l.feat3Title, desc: l.feat3Desc, color: "#fbbf24", glow: "rgba(245,158,11,0.18)",  bg: "linear-gradient(135deg,#f59e0b,#d97706)" },
    { icon: MessageCircle, title: l.feat4Title, desc: l.feat4Desc, color: "#e879f9", glow: "rgba(217,70,239,0.18)",  bg: "linear-gradient(135deg,#d946ef,#a21caf)" },
    { icon: BarChart3,     title: l.feat5Title, desc: l.feat5Desc, color: "#34d399", glow: "rgba(16,185,129,0.18)",  bg: "linear-gradient(135deg,#10b981,#059669)" },
    { icon: ShieldCheck,   title: l.feat6Title, desc: l.feat6Desc, color: "#c084fc", glow: "rgba(139,92,246,0.18)",  bg: "linear-gradient(135deg,#8b5cf6,#7c3aed)" },
  ];

  const audienceCards = [
    { icon: GraduationCap,   title: l.aud1Title, desc: l.aud1Desc, grad: "linear-gradient(135deg,#6366f1,#8b5cf6)", glow: "rgba(99,102,241,0.25)"  },
    { icon: Building2,       title: l.aud2Title, desc: l.aud2Desc, grad: "linear-gradient(135deg,#8b5cf6,#a855f7)", glow: "rgba(139,92,246,0.25)"  },
    { icon: LayoutDashboard, title: l.aud3Title, desc: l.aud3Desc, grad: "linear-gradient(135deg,#0ea5e9,#6366f1)", glow: "rgba(14,165,233,0.25)"   },
    { icon: Users,           title: l.aud4Title, desc: l.aud4Desc, grad: "linear-gradient(135deg,#10b981,#0ea5e9)", glow: "rgba(16,185,129,0.25)"   },
  ];

  const flowCards = [
    { number: "01", icon: LayoutDashboard, title: l.flow1Title, desc: l.flow1Desc },
    { number: "02", icon: Video,           title: l.flow2Title, desc: l.flow2Desc },
    { number: "03", icon: Sparkles,        title: l.flow3Title, desc: l.flow3Desc },
  ];

  const statCards = [
    { value: "5",  label: l.stat1Label, icon: Users,    color: "#818cf8" },
    { value: "2",  label: l.stat2Label, icon: Globe2,   color: "#38bdf8" },
    { value: "4",  label: l.stat3Label, icon: Bot,      color: "#34d399" },
    { value: "3",  label: l.stat4Label, icon: BookOpen, color: "#fbbf24" },
    { value: planList.length > 0 ? String(planList.length) : "—", label: l.stat5Label, icon: Target, color: "#e879f9" },
  ];

  const heroBadgeItems = isArabic
    ? ["مدارس", "أكاديميات", "معلمون", "طلاب", "أهل", "مشرفون"]
    : ["Schools", "Academies", "Teachers", "Students", "Parents", "Admins"];

  return (
    <main dir={isArabic ? "rtl" : "ltr"} className={`relative overflow-x-hidden ${isArabic ? "lang-ar" : "lang-en"}`} style={{ background: "#fafafa", color: "#0f172a" }}>

      {/* ── Global animations ─────────────────────────────────────────────────── */}
      <style>{`
        @keyframes lnv-float  { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(-14px)} }
        @keyframes lnv-float2 { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(-9px)} }
        @keyframes lnv-float3 { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(-18px)} }
        @keyframes lnv-orb    { 0%,100%{opacity:.55;transform:scale(1)} 50%{opacity:.85;transform:scale(1.12)} }
        @keyframes lnv-ping   { 0%,100%{transform:scale(1);opacity:.8} 50%{transform:scale(1.9);opacity:0} }
        @keyframes lnv-slide  { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
        @keyframes lnv-grad   { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }

        .lnv-float1  { animation: lnv-float  7s ease-in-out infinite; }
        .lnv-float2  { animation: lnv-float2 9s ease-in-out 1.8s infinite; }
        .lnv-float3  { animation: lnv-float3 11s ease-in-out 3.5s infinite; }
        .lnv-orb     { animation: lnv-orb    5s ease-in-out infinite; }
        .lnv-ping    { animation: lnv-ping   1.8s cubic-bezier(0,0,.2,1) infinite; }
        .lnv-slide   { animation: lnv-slide  .7s cubic-bezier(.4,0,.2,1) both; }

        .lnv-feat-card { transition: transform .25s, box-shadow .25s; }
        .lnv-feat-card:hover { transform: translateY(-6px); }

        .lnv-sol-card  { transition: transform .25s, box-shadow .25s; }
        .lnv-sol-card:hover  { transform: translateY(-5px); }

        .lnv-nav-link  { position:relative; }
        .lnv-nav-link::after { content:''; position:absolute; bottom:-2px; left:0; right:0; height:2px; border-radius:2px; background:linear-gradient(90deg,#6366f1,#8b5cf6); transform:scaleX(0); transform-origin:center; transition:transform .2s; }
        .lnv-nav-link:hover::after { transform:scaleX(1); }

        .lnv-price-popular { transition: transform .25s, box-shadow .25s; }
        .lnv-price-popular:hover { transform: translateY(-8px); box-shadow: 0 30px 80px rgba(99,102,241,.28) !important; }
        .lnv-price-card { transition: transform .25s; }
        .lnv-price-card:hover { transform: translateY(-4px); }
      `}</style>

      {/* ── Navbar ─────────────────────────────────────────────────────────────── */}
      <nav
        className="fixed inset-x-0 top-0 z-50 transition-all duration-300"
        style={{
          background:  scrolled ? "rgba(255,255,255,0.88)" : "rgba(5,5,20,0.6)",
          backdropFilter: "blur(24px)",
          borderBottom: scrolled ? "1px solid rgba(226,232,240,0.7)" : "1px solid rgba(255,255,255,0.08)",
          boxShadow:   scrolled ? "0 2px 20px rgba(15,23,42,0.08)" : "none",
        }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3.5 sm:px-8 lg:px-10">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 shrink-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6,#ec4899)", boxShadow: "0 4px 14px rgba(99,102,241,.4)" }}>
              <Sparkles size={16} className="text-white" />
            </div>
            <span className="text-sm font-black uppercase tracking-[0.22em]" style={{ color: scrolled ? "#6366f1" : "#e0e7ff" }}>
              Learnova
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden items-center gap-1 lg:flex">
            {navLinks.map((link) => (
              <button key={link.id} type="button" onClick={() => scrollToSection(link.id)}
                className="lnv-nav-link rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
                style={{ color: scrolled ? "#475569" : "rgba(226,232,240,0.85)" }}
                onMouseEnter={e => e.currentTarget.style.color = scrolled ? "#6366f1" : "#e0e7ff"}
                onMouseLeave={e => e.currentTarget.style.color = scrolled ? "#475569" : "rgba(226,232,240,0.85)"}
              >
                {link.label}
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button type="button" onClick={toggleLang}
              className="rounded-xl border px-3 py-2 text-xs font-bold transition-colors"
              style={{
                borderColor: scrolled ? "rgba(226,232,240,0.9)" : "rgba(255,255,255,0.15)",
                color:       scrolled ? "#475569"               : "rgba(226,232,240,0.8)",
                background:  scrolled ? "white"                  : "rgba(255,255,255,0.07)",
              }}
            >
              <Globe2 size={13} className="me-1 inline-block" />
              {lang === "en" ? "العربية" : "English"}
            </button>
            <Link to={isAuthenticated ? dashboardPath : "/login"}
              className="hidden rounded-xl border px-4 py-2 text-sm font-bold transition-colors sm:inline-flex"
              style={{
                borderColor: scrolled ? "rgba(226,232,240,0.9)" : "rgba(255,255,255,0.15)",
                color:       scrolled ? "#334155"               : "rgba(226,232,240,0.85)",
                background:  scrolled ? "white"                  : "rgba(255,255,255,0.07)",
              }}
            >
              {isAuthenticated ? l.dashboardCta : l.loginCta}
            </Link>
            <Link to={isAuthenticated ? dashboardPath : "/signup"}
              className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold text-white transition hover:-translate-y-0.5"
              style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", boxShadow: "0 4px 16px rgba(99,102,241,.4)" }}
            >
              {isAuthenticated ? l.dashboardCta : l.startNow}
              <ArrowRight size={14} />
            </Link>
            <button type="button" onClick={() => setMobileOpen(v => !v)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border transition lg:hidden"
              style={{
                borderColor: scrolled ? "rgba(226,232,240,0.9)" : "rgba(255,255,255,0.15)",
                color:       scrolled ? "#334155"               : "rgba(226,232,240,0.85)",
                background:  scrolled ? "white"                  : "rgba(255,255,255,0.07)",
              }}
            >
              {mobileOpen ? <X size={15} /> : <Menu size={15} />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {mobileOpen && (
          <div style={{ background: "rgba(5,5,20,0.97)", borderTop: "1px solid rgba(255,255,255,0.08)" }} className="px-5 pb-5 pt-3 lg:hidden">
            {navLinks.map((link) => (
              <button key={link.id} type="button"
                onClick={() => { scrollToSection(link.id); setMobileOpen(false); }}
                className="block w-full rounded-xl px-4 py-2.5 text-start text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
              >
                {link.label}
              </button>
            ))}
            <div className="mt-3 border-t border-white/10 pt-3">
              <Link to={isAuthenticated ? dashboardPath : "/login"} onClick={() => setMobileOpen(false)}
                className="block rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-center text-sm font-bold text-white"
              >
                {isAuthenticated ? l.dashboardCta : l.loginCta}
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* ── HERO ───────────────────────────────────────────────────────────────── */}
      <section style={{ background: "#050510", minHeight: "100vh", position: "relative", overflow: "hidden" }} className="flex items-center pt-16">

        {/* Background grid */}
        <div aria-hidden="true" style={{
          position: "absolute", inset: 0, zIndex: 0,
          backgroundImage: "linear-gradient(rgba(99,102,241,0.06) 1px,transparent 1px), linear-gradient(90deg,rgba(99,102,241,0.06) 1px,transparent 1px)",
          backgroundSize: "72px 72px",
        }} />

        {/* Glow orbs */}
        <div aria-hidden="true" className="lnv-orb" style={{ position:"absolute", top:"-8%",  left:"5%",  width:700, height:700, borderRadius:"50%", background:"radial-gradient(circle,rgba(99,102,241,0.22) 0%,transparent 65%)", zIndex:0 }} />
        <div aria-hidden="true" className="lnv-orb" style={{ position:"absolute", top:"10%",  right:"-8%", width:600, height:600, borderRadius:"50%", background:"radial-gradient(circle,rgba(139,92,246,0.16) 0%,transparent 65%)", zIndex:0, animationDelay:"2s" }} />
        <div aria-hidden="true" className="lnv-orb" style={{ position:"absolute", bottom:"5%", left:"25%", width:500, height:500, borderRadius:"50%", background:"radial-gradient(circle,rgba(14,165,233,0.10) 0%,transparent 65%)", zIndex:0, animationDelay:"4s" }} />

        <div className="relative z-10 mx-auto w-full max-w-7xl px-5 py-20 sm:px-8 lg:px-10 lg:py-28">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">

            {/* ── Left: copy ── */}
            <div className={`lnv-slide ${isArabic ? "text-right" : "text-left"}`}>
              {/* Live badge */}
              <div className="mb-8 inline-flex items-center gap-2.5 rounded-full border px-4 py-2" style={{ borderColor:"rgba(99,102,241,0.35)", background:"rgba(99,102,241,0.12)", backdropFilter:"blur(10px)" }}>
                <span className="relative flex h-2 w-2">
                  <span className="lnv-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                <span className="text-xs font-bold text-indigo-200">{l.badge}</span>
              </div>

              {/* Headline */}
              <h1 className="text-5xl font-black leading-[1.05] tracking-tight text-white md:text-6xl xl:text-7xl">
                {isArabic ? (
                  <>
                    المنصة الشاملة<br />
                    <span style={GRAD_TEXT}>للتعلم الذكي</span>
                  </>
                ) : (
                  <>
                    The platform<br />
                    for{" "}
                    <span style={GRAD_TEXT}>smarter learning</span>
                  </>
                )}
              </h1>

              <p className="mt-6 max-w-lg text-base leading-8 text-slate-400 md:text-lg">
                {l.heroSubtitle}
              </p>

              {/* CTAs */}
              <div className="mt-10 flex flex-wrap gap-3">
                <Link to={primaryAction.href}
                  className="inline-flex h-13 items-center justify-center gap-2 rounded-2xl px-8 text-sm font-black text-white transition hover:-translate-y-0.5 hover:shadow-2xl"
                  style={{ background:"linear-gradient(135deg,#6366f1,#8b5cf6)", boxShadow:"0 8px 28px rgba(99,102,241,.45)", height:52 }}
                >
                  {primaryAction.label}
                  <ArrowRight size={16} />
                </Link>
                {secondaryAction.isAnchor ? (
                  <button type="button" onClick={() => scrollToSection("features")}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border px-8 text-sm font-bold text-slate-300 transition hover:border-indigo-500/50 hover:text-white"
                    style={{ height:52, borderColor:"rgba(255,255,255,0.14)", background:"rgba(255,255,255,0.05)", backdropFilter:"blur(8px)" }}
                  >
                    {secondaryAction.label}
                    <ChevronRight size={15} className={isArabic ? "rotate-180" : ""} />
                  </button>
                ) : (
                  <Link to={secondaryAction.href}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border px-8 text-sm font-bold text-slate-300 transition hover:border-indigo-500/50 hover:text-white"
                    style={{ height:52, borderColor:"rgba(255,255,255,0.14)", background:"rgba(255,255,255,0.05)", backdropFilter:"blur(8px)" }}
                  >
                    {secondaryAction.label}
                  </Link>
                )}
              </div>

              {/* Badge pills */}
              <div className="mt-10 flex flex-wrap gap-2">
                {heroBadgeItems.map((item) => (
                  <span key={item} className="rounded-full border px-3 py-1 text-xs font-semibold text-indigo-200"
                    style={{ borderColor:"rgba(99,102,241,0.25)", background:"rgba(99,102,241,0.1)" }}>
                    {item}
                  </span>
                ))}
              </div>
            </div>

            {/* ── Right: product preview ── */}
            <div className="relative hidden min-h-[600px] lg:block">

              {/* Main lesson card */}
              <div className="lnv-float1 absolute inset-x-0 top-8 mx-auto w-[340px]" style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 24,
                backdropFilter: "blur(24px)",
                boxShadow: "0 32px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.05) inset",
                padding: 20,
              }}>
                {/* Window chrome */}
                <div className="mb-4 flex items-center gap-2">
                  <span style={{ width:10, height:10, borderRadius:"50%", background:"#ef4444", display:"block" }} />
                  <span style={{ width:10, height:10, borderRadius:"50%", background:"#f59e0b", display:"block" }} />
                  <span style={{ width:10, height:10, borderRadius:"50%", background:"#10b981", display:"block" }} />
                  <span className="ms-2 text-[10px] font-semibold text-white/30">Learnova · lesson</span>
                </div>
                {/* Lesson title */}
                <div className="mb-4 rounded-xl p-3" style={{ background:"rgba(99,102,241,0.12)", border:"1px solid rgba(99,102,241,0.2)" }}>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 mb-1">
                    {isArabic ? "الدرس الحالي" : "Current lesson"}
                  </p>
                  <p className="text-sm font-bold text-white leading-snug">
                    {isArabic ? "مقدمة في الفيزياء الكمية" : "Introduction to Quantum Physics"}
                  </p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full" style={{ background:"rgba(255,255,255,0.1)" }}>
                    <div style={{ width:"62%", height:"100%", borderRadius:99, background:"linear-gradient(90deg,#6366f1,#22d3ee)" }} />
                  </div>
                  <p className="mt-1 text-[10px] text-indigo-300">62% {isArabic ? "مكتمل" : "complete"}</p>
                </div>
                {/* AI tutor chat */}
                <div className="space-y-2">
                  <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                    <Bot size={11} /> {isArabic ? "المساعد الذكي" : "AI Tutor"}
                  </p>
                  <div className="rounded-xl p-3 text-xs leading-6 text-indigo-100" style={{ background:"rgba(99,102,241,0.15)", border:"1px solid rgba(99,102,241,0.22)" }}>
                    {isArabic
                      ? "مبدأ عدم اليقين يعني أن موضع الجسيم وسرعته لا يمكن معرفتهما بدقة تامة في آنٍ واحد..."
                      : "The uncertainty principle states that position and momentum cannot both be known precisely at the same time..."}
                  </div>
                  <div className="flex items-center gap-2 rounded-xl border px-3 py-2" style={{ borderColor:"rgba(255,255,255,0.1)", background:"rgba(255,255,255,0.04)" }}>
                    <span className="text-xs text-white/25 flex-1">{isArabic ? "اسأل سؤالاً..." : "Ask a question…"}</span>
                    <div className="flex h-6 w-6 items-center justify-center rounded-lg" style={{ background:"linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
                      <ArrowRight size={11} className="text-white" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating: Study tools card */}
              <div className="lnv-float2 absolute end-0 top-4 w-52" style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 18,
                backdropFilter: "blur(20px)",
                boxShadow: "0 20px 50px rgba(0,0,0,0.4)",
                padding: 14,
              }}>
                <p className="mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                  {isArabic ? "أدوات الدراسة" : "Study tools"}
                </p>
                {[
                  { icon:"🃏", label: isArabic ? "فلاش كاردز" : "Flashcards", val:"12" },
                  { icon:"🗺️", label: isArabic ? "خريطة ذهنية" : "Mind map",   val:"1"  },
                  { icon:"📝", label: isArabic ? "اختبار"      : "Quiz",       val:"8"  },
                ].map((tool) => (
                  <div key={tool.label} className="mb-1.5 flex items-center justify-between rounded-lg px-2.5 py-1.5" style={{ background:"rgba(255,255,255,0.06)" }}>
                    <span className="text-xs text-white/80">{tool.icon} {tool.label}</span>
                    <span className="text-xs font-bold text-indigo-300">{tool.val}</span>
                  </div>
                ))}
              </div>

              {/* Floating: Progress card */}
              <div className="lnv-float3 absolute bottom-8 start-0 w-48" style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 18,
                backdropFilter: "blur(20px)",
                boxShadow: "0 20px 50px rgba(0,0,0,0.4)",
                padding: 14,
              }}>
                <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                  {isArabic ? "تقدم الطالب" : "Student progress"}
                </p>
                {[78, 91, 64].map((pct, i) => (
                  <div key={i} className="mb-1.5">
                    <div className="mb-1 flex justify-between text-[10px] text-white/40">
                      <span>{isArabic ? ["فيزياء","رياضيات","كيمياء"][i] : ["Physics","Math","Chemistry"][i]}</span>
                      <span>{pct}%</span>
                    </div>
                    <div style={{ height:4, borderRadius:99, background:"rgba(255,255,255,0.08)" }}>
                      <div style={{ width:`${pct}%`, height:"100%", borderRadius:99, background:"linear-gradient(90deg,#6366f1,#22d3ee)" }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Floating: Active users badge */}
              <div className="lnv-float2 absolute bottom-24 end-2" style={{ display:"flex", alignItems:"center", gap:8, borderRadius:99, padding:"8px 14px", background:"rgba(16,185,129,0.15)", border:"1px solid rgba(16,185,129,0.3)", backdropFilter:"blur(12px)", boxShadow:"0 10px 30px rgba(0,0,0,0.3)", animationDelay:"0.8s" }}>
                <span className="relative flex h-2 w-2">
                  <span className="lnv-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                <span className="text-xs font-bold text-emerald-300">
                  {isArabic ? "٢٤ طالب نشط الآن" : "24 students online now"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom fade */}
        <div aria-hidden="true" style={{ position:"absolute", bottom:0, inset:"auto 0 0 0", height:120, background:"linear-gradient(to bottom,transparent,#fafafa)", zIndex:5 }} />
      </section>

      {/* ── Stats strip ────────────────────────────────────────────────────────── */}
      <section className="relative z-10 bg-white">
        <div className="mx-auto max-w-7xl px-5 py-4 sm:px-8 lg:px-10">
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-slate-100 bg-slate-100 shadow-sm md:grid-cols-5">
            {statCards.map((item) => (
              <div key={item.label} className="flex flex-col items-center justify-center gap-1 bg-white px-4 py-8 text-center">
                <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background:`${item.color}18` }}>
                  <item.icon size={20} style={{ color: item.color }} />
                </div>
                <p className="text-3xl font-black tracking-tight text-slate-900" style={{ lineHeight:1 }}>{item.value}</p>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────────────────────── */}
      <section id="features" className="relative bg-white py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          {/* Section header */}
          <div className={`mb-16 ${isArabic ? "text-right" : "text-left"}`}>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1.5">
              <Zap size={13} className="text-indigo-600" />
              <span className="text-xs font-black uppercase tracking-[0.22em] text-indigo-600">
                {isArabic ? "المميزات" : "Features"}
              </span>
            </div>
            <h2 className="max-w-2xl text-4xl font-black tracking-tight text-slate-900 md:text-5xl" style={{ lineHeight:1.1 }}>
              {l.featuresTitle}
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-8 text-slate-500">
              {isArabic
                ? "واجهة Learnova مصممة حول الدرس نفسه — يرفع المدرس المحتوى، ويحصل الطالب على أدوات ذكاء اصطناعي حقيقية."
                : "Learnova is built around the lesson itself — instructors publish content, students get real AI-powered study tools."}
            </p>
          </div>

          {/* Cards */}
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {featureCards.map((card, i) => (
              <article key={card.title} className="lnv-feat-card group relative overflow-hidden rounded-[24px] border border-slate-100 bg-white p-7"
                style={{ boxShadow:"0 2px 12px rgba(15,23,42,0.06)" }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = `0 20px 50px ${card.glow}`}
                onMouseLeave={e => e.currentTarget.style.boxShadow = "0 2px 12px rgba(15,23,42,0.06)"}
              >
                {/* Top gradient bar */}
                <div className="absolute inset-x-0 top-0 h-[2px] rounded-t-[24px]" style={{ background: card.bg }} />
                <div className="mb-5 flex h-13 w-13 items-center justify-center rounded-2xl text-white" style={{ background:card.bg, boxShadow:`0 6px 18px ${card.glow}`, width:52, height:52 }}>
                  <card.icon size={22} />
                </div>
                <h3 className="text-xl font-black text-slate-900">{card.title}</h3>
                <p className="mt-2.5 text-sm leading-7 text-slate-500">{card.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Solutions ──────────────────────────────────────────────────────────── */}
      <section id="solutions" className="relative py-24" style={{ background:"#f8fafc" }}>
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <div className={`mb-16 ${isArabic ? "text-right" : "text-left"}`}>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-4 py-1.5">
              <Users size={13} className="text-violet-600" />
              <span className="text-xs font-black uppercase tracking-[0.22em] text-violet-600">
                {isArabic ? "الحلول" : "Solutions"}
              </span>
            </div>
            <h2 className="max-w-2xl text-4xl font-black tracking-tight text-slate-900 md:text-5xl" style={{ lineHeight:1.1 }}>
              {l.audienceTitle}
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-8 text-slate-500">
              {isArabic
                ? "المنصة تخدم الأكاديميات والمدارس عبر نفس البنية، لكنها تمنح كل دور تجربة مخصصة."
                : "One platform serving academies and schools, giving each role a tailored daily experience."}
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {audienceCards.map((card) => (
              <article key={card.title} className="lnv-sol-card rounded-[24px] border border-slate-200 bg-white p-6"
                style={{ boxShadow:"0 2px 12px rgba(15,23,42,0.05)" }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = `0 16px 40px ${card.glow}`}
                onMouseLeave={e => e.currentTarget.style.boxShadow = "0 2px 12px rgba(15,23,42,0.05)"}
              >
                <div className="mb-5 flex h-13 w-13 items-center justify-center rounded-2xl text-white" style={{ background:card.grad, boxShadow:`0 6px 18px ${card.glow}`, width:52, height:52 }}>
                  <card.icon size={22} />
                </div>
                <h3 className="text-xl font-black text-slate-900">{card.title}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-500">{card.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Workflow ───────────────────────────────────────────────────────────── */}
      <section id="workflow" className="relative overflow-hidden py-28" style={{ background:"#05050f" }}>
        {/* Background grid */}
        <div aria-hidden="true" style={{ position:"absolute", inset:0, backgroundImage:"linear-gradient(rgba(99,102,241,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,0.05) 1px,transparent 1px)", backgroundSize:"60px 60px" }} />
        {/* Glow */}
        <div aria-hidden="true" className="lnv-orb" style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:900, height:900, borderRadius:"50%", background:"radial-gradient(circle,rgba(99,102,241,0.1) 0%,transparent 65%)" }} />

        <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <div className={`mb-16 ${isArabic ? "text-right" : "text-left"}`}>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border px-4 py-1.5" style={{ borderColor:"rgba(99,102,241,0.35)", background:"rgba(99,102,241,0.12)" }}>
              <BarChart3 size={13} className="text-indigo-400" />
              <span className="text-xs font-black uppercase tracking-[0.22em] text-indigo-400">
                {isArabic ? "كيف يعمل" : "How it works"}
              </span>
            </div>
            <h2 className="max-w-2xl text-4xl font-black tracking-tight text-white md:text-5xl" style={{ lineHeight:1.1 }}>
              {l.workflowTitle}
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-8 text-slate-400">{l.workflowSubtitle}</p>
          </div>

          <div className="relative grid gap-5 lg:grid-cols-3">
            {/* Connector line */}
            <div aria-hidden="true" className="absolute hidden lg:block" style={{ top:48, [isArabic?"right":"left"]:"calc(16.66% + 16px)", width:"66.66%", height:1, background:"linear-gradient(90deg,rgba(99,102,241,0.6),rgba(139,92,246,0.6),rgba(14,165,233,0.6))", zIndex:0 }} />

            {flowCards.map((step, i) => (
              <article key={step.number} className="relative z-10 rounded-[24px] p-7" style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", backdropFilter:"blur(12px)" }}>
                {/* Step icon */}
                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl text-white" style={{ background:"linear-gradient(135deg,#6366f1,#8b5cf6)", boxShadow:"0 8px 24px rgba(99,102,241,.4)" }}>
                  <step.icon size={24} />
                </div>
                <p className="mb-1 text-xs font-black uppercase tracking-[0.26em]" style={{ color:"#818cf8" }}>{step.number}</p>
                <h3 className="text-xl font-black leading-tight text-white">{step.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-400">{step.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ────────────────────────────────────────────────────────────── */}
      <section id="pricing" className="relative bg-white py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <div className={`mb-16 text-center`}>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5">
              <Target size={13} className="text-emerald-600" />
              <span className="text-xs font-black uppercase tracking-[0.22em] text-emerald-600">
                {isArabic ? "الأسعار" : "Pricing"}
              </span>
            </div>
            <h2 className="text-4xl font-black tracking-tight text-slate-900 md:text-5xl" style={{ lineHeight:1.1 }}>{l.plansTitle}</h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-8 text-slate-500">{l.plansSubtitle}</p>
          </div>

          {planList.length > 0 ? (
            <div className="grid gap-6 lg:grid-cols-3">
              {planList.map((plan, index) => {
                const isPopular = Boolean(plan.isPopular || plan.recommended || index === 1);
                const features  = formatFeatureList(plan.features || plan.Features || []);
                const price     = Number(plan.price ?? plan.Price ?? 0);
                const label     = plan.name || plan.Name || `Plan ${index + 1}`;
                return (
                  <article key={plan.id || label}
                    className={`relative flex flex-col rounded-[28px] p-7 ${isPopular ? "lnv-price-popular" : "lnv-price-card"}`}
                    style={isPopular ? {
                      background: "linear-gradient(180deg,#ffffff 0%,#f5f3ff 100%)",
                      border: "2px solid transparent",
                      backgroundClip: "padding-box",
                      boxShadow: "0 0 0 2px #8b5cf6, 0 20px 60px rgba(99,102,241,.2)",
                    } : {
                      background: "white",
                      border: "1px solid #e2e8f0",
                      boxShadow: "0 4px 20px rgba(15,23,42,.06)",
                    }}
                  >
                    {isPopular && (
                      <div className="absolute -top-3.5 start-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-4 py-1 text-xs font-black text-white"
                        style={{ background:"linear-gradient(135deg,#6366f1,#8b5cf6)", boxShadow:"0 4px 14px rgba(99,102,241,.4)" }}>
                        {isArabic ? "★ الأكثر شيوعاً" : "★ Most popular"}
                      </div>
                    )}
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
                      {plan.durationDays} {isArabic ? "يوم" : "days"}
                    </p>
                    <h3 className="mt-2 text-2xl font-black text-slate-900">{label}</h3>
                    <div className="mt-3 flex items-end gap-1.5">
                      <span className="text-5xl font-black tracking-tight" style={{ color:"#4f46e5", lineHeight:1 }}>
                        {price === 0 ? l.planFree : `$${price}`}
                      </span>
                      {price > 0 && <span className="mb-1.5 text-sm text-slate-400">{l.planPerMonth}</span>}
                    </div>
                    <p className="mt-4 text-sm leading-7 text-slate-500">
                      {plan.description || plan.Description || (isArabic ? "خطة جاهزة للاستخدام داخل Learnova." : "Ready-to-use Learnova plan.")}
                    </p>
                    {features.length > 0 && (
                      <ul className="mt-6 space-y-2.5 border-t border-slate-100 pt-6 text-sm text-slate-600">
                        {features.slice(0, 5).map((item) => (
                          <li key={item} className="flex items-start gap-2.5">
                            <CheckCircle2 size={16} className="mt-0.5 shrink-0" style={{ color:"#6366f1" }} />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    <Link
                      to={isAuthenticated && String(role).toUpperCase() === AUTH_ROLES.ORGANIZATION ? dashboardPath : "/signup"}
                      className="mt-auto inline-flex h-12 items-center justify-center rounded-2xl px-5 text-sm font-bold transition hover:-translate-y-0.5"
                      style={Object.assign({ marginTop:"1.75rem" }, isPopular
                        ? { background:"linear-gradient(135deg,#6366f1,#8b5cf6)", color:"#fff", boxShadow:"0 6px 18px rgba(99,102,241,.35)" }
                        : { background:"#f8fafc", color:"#334155", border:"1px solid #e2e8f0" }
                      )}
                    >
                      {l.planCta}
                    </Link>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="mx-auto max-w-lg rounded-[28px] border border-dashed border-slate-300 bg-white px-8 py-16 text-center">
              <p className="text-2xl font-black text-slate-900">{l.noPlans}</p>
              <p className="mt-3 text-sm leading-7 text-slate-500">
                {isArabic
                  ? "يمكنك إنشاء حساب مؤسسة الآن والعودة لاحقاً لاختيار الخطة المناسبة."
                  : "Create an organization account now and choose a plan later."}
              </p>
              <Link to="/signup"
                className="mt-7 inline-flex h-12 items-center justify-center rounded-2xl px-8 text-sm font-bold text-white transition hover:-translate-y-0.5"
                style={{ background:"linear-gradient(135deg,#6366f1,#8b5cf6)", boxShadow:"0 6px 20px rgba(99,102,241,.35)" }}
              >
                {l.startNow}
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ── About ──────────────────────────────────────────────────────────────── */}
      <section id="about" className="relative overflow-hidden py-24" style={{ background:"#f8fafc" }}>
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <div className="overflow-hidden rounded-[36px] px-8 py-14 text-white sm:px-12 lg:px-16"
            style={{ background:"linear-gradient(135deg,#1e1b4b 0%,#312e81 35%,#4c1d95 70%,#2e1065 100%)", boxShadow:"0 32px 80px rgba(30,27,75,.35)" }}>
            <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.26em] text-indigo-300">
                  {isArabic ? "عن المنصة" : "About Learnova"}
                </p>
                <h2 className="mt-3 text-3xl font-black leading-tight tracking-tight text-white md:text-4xl">
                  {isArabic
                    ? "منصة واحدة تربط المحتوى، الذكاء، والمتابعة"
                    : "One platform linking content, AI, and progress tracking"}
                </h2>
                <p className="mt-5 text-sm leading-8 text-indigo-200/80 md:text-base">
                  {isArabic
                    ? "Learnova مصممة لتكون جزءاً حقيقياً من المؤسسة التعليمية: الدروس تُبنى وتُشرح وتُقاس داخل نفس النظام."
                    : "Learnova lives inside the real education workflow — lessons are built, explained, and measured inside one connected system."}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Link to={dashboardPath} className="group rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur transition hover:bg-white/20">
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-indigo-300">
                    {isAuthenticated ? l.dashboardCta : (isArabic ? "سجّل الدخول" : "Sign in")}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    {isArabic ? "افتح الواجهة المناسبة لدورك الحالي." : "Open the right workspace for your role."}
                  </p>
                </Link>
                <button type="button" onClick={() => scrollToSection("features")}
                  className="rounded-2xl border border-white/15 bg-white/10 p-5 text-start backdrop-blur transition hover:bg-white/20">
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-indigo-300">
                    {isArabic ? "استكشف" : "Explore"}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    {isArabic ? "شاهد الأدوات التي تجعل Learnova مختلفة." : "See the tools that make Learnova stand out."}
                  </p>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-white py-24">
        {/* Subtle background gradient */}
        <div aria-hidden="true" style={{ position:"absolute", inset:0, background:"radial-gradient(ellipse at 50% 0%,rgba(99,102,241,0.08),transparent 60%)" }} />

        <div className="relative z-10 mx-auto max-w-3xl px-5 text-center sm:px-8">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1.5">
            <Sparkles size={13} className="text-indigo-600" />
            <span className="text-xs font-black uppercase tracking-[0.22em] text-indigo-600">
              {isArabic ? "ابدأ اليوم" : "Get started today"}
            </span>
          </div>

          <h2 className="text-4xl font-black tracking-tight text-slate-900 md:text-5xl" style={{ lineHeight:1.1 }}>
            {isArabic
              ? <>جاهز لتحويل تجربة<br /><span style={GRAD_TEXT}>التعلم في مؤسستك؟</span></>
              : <>Ready to transform<br /><span style={GRAD_TEXT}>learning in your org?</span></>}
          </h2>

          <p className="mx-auto mt-5 max-w-xl text-base leading-8 text-slate-500">
            {isArabic
              ? "أنشئ حساب المؤسسة خلال دقائق، وابدأ بتفعيل الكورسات والدروس الذكية فوراً."
              : "Create your organization account in minutes and start activating AI-powered courses and lessons immediately."}
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link to="/signup"
              className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl px-10 text-sm font-black text-white transition hover:-translate-y-0.5 hover:shadow-2xl"
              style={{ background:"linear-gradient(135deg,#6366f1,#8b5cf6)", boxShadow:"0 8px 28px rgba(99,102,241,.4)", fontSize:15 }}
            >
              {l.startNow}
              <ArrowRight size={17} />
            </Link>
            <Link to="/login"
              className="inline-flex h-14 items-center justify-center rounded-2xl border border-slate-200 bg-white px-10 text-sm font-bold text-slate-700 shadow-sm transition hover:border-indigo-300 hover:text-indigo-700"
              style={{ fontSize:15 }}
            >
              {l.loginCta}
            </Link>
          </div>

          {/* Trust note */}
          <p className="mt-8 text-xs text-slate-400">
            {isArabic ? "لا يلزم بطاقة ائتمانية · إعداد فوري · دعم مباشر" : "No credit card required · Instant setup · Direct support"}
          </p>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────────── */}
      <footer style={{ background:"#05050f", borderTop:"1px solid rgba(255,255,255,0.07)" }} className="px-5 py-14 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 lg:grid-cols-[1.5fr_0.7fr_0.7fr_0.9fr]">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl text-white" style={{ background:"linear-gradient(135deg,#6366f1,#8b5cf6,#ec4899)", boxShadow:"0 4px 14px rgba(99,102,241,.35)" }}>
                  <Sparkles size={17} />
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.26em] text-indigo-400">Learnova</p>
                  <p className="text-xs text-slate-500">{isArabic ? "المنصة التعليمية الذكية" : "The intelligent LMS"}</p>
                </div>
              </div>
              <p className="mt-5 max-w-sm text-sm leading-7 text-slate-500">
                {isArabic
                  ? "تعلّم بالذكاء الاصطناعي للمدارس والأكاديميات مع دروس حقيقية ولوحات متابعة حية."
                  : "AI learning for schools and academies with real lessons, dashboards, and progress tracking."}
              </p>
            </div>

            {/* Product */}
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
                {isArabic ? "المنتج" : "Product"}
              </p>
              <div className="mt-5 flex flex-col gap-3.5 text-sm text-slate-500">
                {navLinks.map((link) => (
                  <button key={link.id} type="button" onClick={() => scrollToSection(link.id)}
                    className="text-start transition hover:text-indigo-400">
                    {link.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Roles */}
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
                {isArabic ? "الأدوار" : "Roles"}
              </p>
              <div className="mt-5 flex flex-col gap-3.5 text-sm text-slate-500">
                <Link to="/login"       className="transition hover:text-indigo-400">{isArabic ? "طالب"   : "Student"}</Link>
                <Link to="/login"       className="transition hover:text-indigo-400">{isArabic ? "معلم"   : "Instructor"}</Link>
                <Link to="/signup"      className="transition hover:text-indigo-400">{isArabic ? "مؤسسة" : "Organization"}</Link>
                <Link to="/admin/login" className="transition hover:text-indigo-400">{isArabic ? "أدمن"  : "Admin"}</Link>
              </div>
            </div>

            {/* Get started */}
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
                {isArabic ? "ابدأ الآن" : "Get started"}
              </p>
              <div className="mt-5 flex flex-col gap-3">
                <Link to={primaryAction.href}
                  className="inline-flex h-11 items-center justify-center gap-1.5 rounded-2xl px-5 text-sm font-bold text-white transition hover:-translate-y-0.5"
                  style={{ background:"linear-gradient(135deg,#6366f1,#8b5cf6)", boxShadow:"0 4px 14px rgba(99,102,241,.3)" }}
                >
                  {primaryAction.label}
                  <ArrowRight size={14} />
                </Link>
                <Link to="/login"
                  className="inline-flex h-11 items-center justify-center rounded-2xl border px-5 text-sm font-bold text-slate-400 transition hover:border-indigo-500/40 hover:text-indigo-300"
                  style={{ borderColor:"rgba(255,255,255,0.1)", background:"rgba(255,255,255,0.04)" }}
                >
                  {l.loginCta}
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-12 flex flex-col gap-3 border-t pt-8 text-xs text-slate-600 md:flex-row md:items-center md:justify-between"
            style={{ borderColor:"rgba(255,255,255,0.07)" }}>
            <p>© {new Date().getFullYear()} Learnova. {isArabic ? "جميع الحقوق محفوظة." : "All rights reserved."}</p>
            <div className="flex flex-wrap gap-5">
              {navLinks.slice(0, 3).map((link) => (
                <button key={link.id} type="button" onClick={() => scrollToSection(link.id)}
                  className="transition hover:text-indigo-400">{link.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
