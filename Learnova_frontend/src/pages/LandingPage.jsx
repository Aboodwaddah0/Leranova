import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { motion } from "framer-motion";
import {
  ArrowRight, BarChart3, Bot, Brain, BookOpen,
  CheckCircle2, ChevronRight, Globe2, LayoutDashboard,
  Menu, MessageCircle, Sparkles, Target, Users, X, Zap,
  Trophy, Flame, Star, TrendingUp, Map, Award, Cpu, FileText,
  Lightbulb, Shield, Smartphone, School, CalendarDays,
  ClipboardList, UserCheck, Bell, GraduationCap, Download,
} from "lucide-react";
import { getPlansThunk } from "../redux/thunks/authThunks";
import { AUTH_ROLES } from "../utils/constants";
import { useLanguage } from "../utils/i18n";

/* ─── Routing ──────────────────────────────────────────────────────────────── */
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

const scrollTo = (id) =>
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

const KNOWN_ACRONYMS = new Set(["AI", "RAG", "XP", "LMS", "API", "SMS", "PDF", "QR"]);

const humanizeFeatureName = (str) => {
  if (!str) return "";
  // Leave already-readable strings untouched (contain spaces, mixed case)
  if (str.includes(" ") || (str !== str.toUpperCase() && !str.includes("_"))) return str;
  return str
    .split("_")
    .map((word) => KNOWN_ACRONYMS.has(word) ? word : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

const formatFeatureList = (features = []) =>
  Array.isArray(features)
    ? features
        .map((i) => humanizeFeatureName(typeof i === "string" ? i : i?.name || i?.feature || i?.label || i?.title || ""))
        .filter(Boolean)
    : [];

/* ─── Animation presets ────────────────────────────────────────────────────── */
const fadeUp = (delay = 0) => ({
  initial:    { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport:   { once: true, margin: "-60px" },
  transition: { duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] },
});

const fadeIn = (delay = 0) => ({
  initial:    { opacity: 0 },
  whileInView: { opacity: 1 },
  viewport:   { once: true },
  transition: { duration: 0.5, delay },
});

/* ─── Gradient text ────────────────────────────────────────────────────────── */
const GT = {
  background: "linear-gradient(135deg,#a78bfa 0%,#38bdf8 55%,#34d399 100%)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  backgroundClip: "text",
};

const GT2 = {
  background: "linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  backgroundClip: "text",
};

/* ─── Static CSS ────────────────────────────────────────────────────────────── */
const CSS = `
  @keyframes lnv-float  { 0%,100%{transform:translateY(0)}   50%{transform:translateY(-14px)} }
  @keyframes lnv-float2 { 0%,100%{transform:translateY(0)}   50%{transform:translateY(-9px)}  }
  @keyframes lnv-float3 { 0%,100%{transform:translateY(0)}   50%{transform:translateY(-18px)} }
  @keyframes lnv-orb    { 0%,100%{opacity:.45;transform:scale(1)} 50%{opacity:.8;transform:scale(1.08)} }
  @keyframes lnv-ping   { 0%,100%{transform:scale(1);opacity:.8} 50%{transform:scale(2.2);opacity:0} }
  @keyframes lnv-ticker { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }

  .lnv-f1  { animation: lnv-float  7s ease-in-out infinite; }
  .lnv-f2  { animation: lnv-float2 9s ease-in-out 1.5s infinite; }
  .lnv-f3  { animation: lnv-float3 11s ease-in-out 3s infinite; }
  .lnv-orb { animation: lnv-orb    5s ease-in-out infinite; }
  .lnv-ping{ animation: lnv-ping   1.7s cubic-bezier(0,0,.2,1) infinite; }
  .lnv-ticker { animation: lnv-ticker 30s linear infinite; }

  .lnv-card { transition: transform .22s ease, box-shadow .22s ease, border-color .22s ease; }
  .lnv-card:hover { transform: translateY(-5px); }

  .lnv-glow { transition: transform .2s ease, box-shadow .2s ease; }
  .lnv-glow:hover { transform: translateY(-2px); box-shadow: 0 14px 48px rgba(99,102,241,.6) !important; }

  .lnv-nav-link { position:relative; }
  .lnv-nav-link::after {
    content:''; position:absolute; bottom:-3px; left:0; right:0;
    height:2px; border-radius:2px;
    background:linear-gradient(90deg,#6366f1,#8b5cf6);
    transform:scaleX(0); transform-origin:center; transition:transform .2s;
  }
  .lnv-nav-link:hover::after { transform:scaleX(1); }

  .lnv-icon-hover { transition:transform .2s ease; }
  .lnv-card:hover .lnv-icon-hover { transform: scale(1.12) rotate(-5deg); }
`;

/* ══════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  const dispatch = useDispatch();
  const { lang, isArabic, t, toggleLang } = useLanguage();
  const { plans, isAuthenticated, role } = useSelector((s) => s.auth);
  const l = t.landing;

  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled,   setScrolled]   = useState(false);

  useEffect(() => { dispatch(getPlansThunk()); }, [dispatch]);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 28);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  const planList     = Array.isArray(plans) ? plans : [];
  const dashPath     = isAuthenticated ? getDashboardPath(role) : "/signup";
  const primaryHref  = dashPath;
  const primaryLabel = isAuthenticated ? l.dashboardCta : l.startNow;

  const navLinks = [
    { id: "features",   label: isArabic ? "المميزات"   : "Features"   },
    { id: "mobile",     label: isArabic ? "التطبيق"     : "Mobile App" },
    { id: "ai-section", label: isArabic ? "الذكاء"      : "AI"         },
    { id: "experience", label: isArabic ? "التجربة"     : "Experience" },
    { id: "pricing",    label: isArabic ? "الأسعار"     : "Pricing"    },
  ];

  /* ─── Data ── */
  const features = [
    { icon: Bot,            title: isArabic ? "مرشد ذكي"       : "AI Mentor",        desc: isArabic ? "مساعد مرتبط بمحتوى الدرس الفعلي."      : "Context-aware tutor grounded in lesson content.",       color: "#6366f1" },
    { icon: MessageCircle,  title: isArabic ? "محادثة ذكية"    : "AI Chat",           desc: isArabic ? "نقاش جماعي وخاص بنظام RAG."            : "Group & private chat powered by RAG retrieval.",        color: "#8b5cf6" },
    { icon: BookOpen,       title: isArabic ? "فلاش كاردز"     : "Smart Flashcards",  desc: isArabic ? "بطاقات مولّدة من محتوى الدرس."         : "Auto-generated cards from lesson material.",            color: "#0ea5e9" },
    { icon: Map,            title: isArabic ? "خرائط ذهنية"    : "Mind Maps",         desc: isArabic ? "تصورات مرئية تبني الروابط المعرفية."    : "Visual concept maps that build connections.",           color: "#f59e0b" },
    { icon: Brain,          title: isArabic ? "اختبارات ذكية"  : "Quiz Generation",   desc: isArabic ? "أسئلة مولّدة آليًا من المواد."         : "AI-generated quizzes from lesson assets.",              color: "#10b981" },
    { icon: Trophy,         title: isArabic ? "تصنيفات"        : "Rankings",          desc: isArabic ? "قوائم متصدرين حية بين الطلاب."         : "Live leaderboards driving healthy competition.",        color: "#f43f5e" },
    { icon: Flame,          title: isArabic ? "تحفيز وإنجازات" : "Gamification",      desc: isArabic ? "نقاط XP، سلاسل، ومستويات."            : "XP, streaks, achievements, and level-ups.",             color: "#f97316" },
    { icon: BarChart3,      title: isArabic ? "تحليلات متقدمة" : "Analytics",         desc: isArabic ? "لوحات بيانات لحظية للمعلمين."          : "Real-time dashboards for instructors.",                 color: "#22d3ee" },
    { icon: LayoutDashboard,title: isArabic ? "لوحة المعلمين"  : "Instructor Hub",    desc: isArabic ? "إدارة كاملة للدروس من مكان واحد."      : "Full lesson management in one workspace.",              color: "#a78bfa" },
    { icon: Users,          title: isArabic ? "تعلم اجتماعي"  : "Social Learning",   desc: isArabic ? "تغذية اجتماعية وتعاون بين الطلاب."    : "Social feed and peer collaboration tools.",             color: "#34d399" },
  ];

  const schoolFeatures = [
    { icon: ClipboardList, title: isArabic ? "تتبع الحضور"      : "Attendance Tracker",    desc: isArabic ? "حضور يومي بنقرة واحدة مع تقارير تلقائية."       : "One-click daily attendance with automated reports.",      color: "#6366f1" },
    { icon: UserCheck,     title: isArabic ? "بوابة الوالدين"   : "Parent Portal",          desc: isArabic ? "الوالدان يرون الدرجات والحضور لحظياً."           : "Parents see grades and attendance in real time.",          color: "#8b5cf6" },
    { icon: CalendarDays,  title: isArabic ? "تقويم المدرسة"    : "School Calendar",        desc: isArabic ? "جدول الأحداث والاختبارات للطلاب والمعلمين."     : "Events and exam schedules visible to all roles.",          color: "#0ea5e9" },
    { icon: GraduationCap, title: isArabic ? "تقارير الدرجات"  : "Grade Reports",           desc: isArabic ? "تقارير شاملة قابلة للتصدير بصيغة Excel."        : "Comprehensive grade reports exportable to Excel.",         color: "#10b981" },
    { icon: Bell,          title: isArabic ? "إشعارات الوالدين" : "Parent Notifications",   desc: isArabic ? "تنبيهات فورية للغياب والدرجات والأحداث."         : "Instant alerts for absences, grades, and events.",         color: "#f59e0b" },
    { icon: School,        title: isArabic ? "إدارة الفصول"     : "Class Management",       desc: isArabic ? "فصول، شُعب، وجداول في مكان واحد."                : "Classes, sections, and schedules in one workspace.",       color: "#f43f5e" },
  ];

  const testimonials = [
    { name: isArabic ? "أحمد الزهراني" : "Ahmed Al-Zahrani", role: isArabic ? "مدير أكاديمية" : "Academy Director",  avatar: "AZ", color: "#6366f1",
      quote: isArabic ? "Learnova حوّلت طريقة عمل معلمينا — الدرس يُبنى مرة، والذكاء يشرحه آلاف المرات." : "Learnova transformed how our teachers operate — build a lesson once, AI explains it a thousand times." },
    { name: isArabic ? "سارة المحمود"  : "Sara Al-Mahmoud",  role: isArabic ? "مديرة مدرسة"   : "School Principal",   avatar: "SM", color: "#8b5cf6",
      quote: isArabic ? "رؤية الوالدين للدرجات والتقارير أصبحت لحظية. المنصة تحل مشكلة التواصل بالكامل." : "Parent visibility into grades and progress is now instant. The platform solves communication entirely." },
    { name: isArabic ? "خالد إبراهيم"  : "Khaled Ibrahim",   role: isArabic ? "معلم فيزياء"   : "Physics Teacher",    avatar: "KI", color: "#0ea5e9",
      quote: isArabic ? "أنشأت اختباراً من درس 40 دقيقة خلال ثوانٍ. الطلاب يدرسون بفلاش كاردز مخصصة." : "I generated a quiz from a 40-minute lesson in seconds. Students study with personalized flashcards." },
  ];

  const stats = [
    { value: "50K+",  label: isArabic ? "طالب نشط"     : "Active students", color: "#6366f1" },
    { value: "2K+",   label: isArabic ? "معلم"          : "Instructors",     color: "#8b5cf6" },
    { value: "99.9%", label: isArabic ? "وقت التشغيل"  : "Uptime",          color: "#22d3ee" },
    { value: "4×",    label: isArabic ? "تحسن التحصيل" : "Learning gains",  color: "#34d399" },
  ];

  const ticker = isArabic
    ? ["مرشد ذكي", "فلاش كاردز", "اختبارات", "خرائط ذهنية", "تصنيفات", "تحفيز", "تحليلات", "محادثة", "سلاسل", "إنجازات", "RAG"]
    : ["AI Mentor", "Flashcards", "Quizzes", "Mind Maps", "Rankings", "Gamification", "Analytics", "Live Chat", "Streaks", "Achievements", "RAG-Powered"];

  return (
    <main
      dir={isArabic ? "rtl" : "ltr"}
      className={`relative overflow-x-hidden ${isArabic ? "lang-ar" : "lang-en"}`}
      style={{ background: "#ffffff", color: "#0f172a" }}
    >
      <style>{CSS}</style>

      {/* ══════════ NAVBAR ══════════ */}
      <nav
        className="fixed inset-x-0 top-0 z-50 transition-all duration-300"
        style={{
          background:    scrolled ? "rgba(255,255,255,0.97)" : "rgba(255,255,255,0.85)",
          backdropFilter: "blur(20px)",
          borderBottom:  scrolled ? "1px solid #e2e8f0" : "1px solid rgba(99,102,241,0.08)",
          boxShadow:     scrolled ? "0 1px 0 rgba(99,102,241,.04), 0 4px 24px rgba(0,0,0,.06)" : "none",
        }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3.5 sm:px-8 lg:px-10">
          {/* Logo */}
          <Link to="/" className="flex shrink-0 items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl"
              style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", boxShadow: "0 0 18px rgba(99,102,241,.35)" }}>
              <Sparkles size={13} className="text-white" />
            </div>
            <span className="text-[13px] font-black uppercase tracking-[0.26em] text-slate-800">Learnova</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden items-center gap-0.5 lg:flex">
            {navLinks.map((link) => (
              <button key={link.id} type="button" onClick={() => scrollTo(link.id)}
                className="lnv-nav-link rounded-lg px-4 py-2 text-sm font-semibold text-slate-500 transition-colors hover:text-slate-900">
                {link.label}
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button type="button" onClick={toggleLang}
              className="hidden rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-500 transition hover:border-indigo-200 hover:text-indigo-600 sm:inline-flex">
              <Globe2 size={12} className="me-1.5 inline-block" />
              {lang === "en" ? "العربية" : "English"}
            </button>
            <Link to={isAuthenticated ? dashPath : "/login"}
              className="hidden rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-indigo-200 hover:text-indigo-700 sm:inline-flex">
              {isAuthenticated ? l.dashboardCta : l.loginCta}
            </Link>
            <Link to={primaryHref}
              className="lnv-glow inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold text-white"
              style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", boxShadow: "0 4px 20px rgba(99,102,241,.35)" }}>
              {primaryLabel}
              <ArrowRight size={13} />
            </Link>
            <button type="button" onClick={() => setMobileOpen((v) => !v)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 lg:hidden">
              {mobileOpen ? <X size={15} /> : <Menu size={15} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="border-t px-5 pb-5 pt-2 lg:hidden"
            style={{ background: "rgba(255,255,255,0.99)", borderColor: "#e2e8f0" }}>
            {navLinks.map((link) => (
              <button key={link.id} type="button"
                onClick={() => { scrollTo(link.id); setMobileOpen(false); }}
                className="block w-full rounded-xl px-4 py-2.5 text-start text-sm font-semibold text-slate-500 transition hover:bg-slate-50 hover:text-slate-900">
                {link.label}
              </button>
            ))}
            <div className="mt-3 flex gap-2 border-t pt-3" style={{ borderColor: "#e2e8f0" }}>
              <Link to="/login" onClick={() => setMobileOpen(false)}
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-center text-sm font-semibold text-slate-600">
                {l.loginCta}
              </Link>
              <Link to={primaryHref} onClick={() => setMobileOpen(false)}
                className="flex-1 rounded-xl py-2.5 text-center text-sm font-bold text-white"
                style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
                {primaryLabel}
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* ══════════ HERO ══════════ */}
      <section
        className="relative flex min-h-screen items-center overflow-hidden pt-16"
        style={{ background: "radial-gradient(ellipse 80% 55% at 50% -5%,rgba(99,102,241,0.10) 0%,transparent 65%), #f9fafb" }}
      >
        {/* Grid */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0"
          style={{ backgroundImage: "linear-gradient(rgba(99,102,241,0.06) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,0.06) 1px,transparent 1px)", backgroundSize: "64px 64px" }} />

        {/* Orbs */}
        <div aria-hidden="true" className="lnv-orb pointer-events-none absolute -left-1/4 -top-1/4 h-[900px] w-[900px] rounded-full"
          style={{ background: "radial-gradient(circle,rgba(99,102,241,0.10) 0%,transparent 65%)" }} />
        <div aria-hidden="true" className="lnv-orb pointer-events-none absolute -right-1/4 top-1/4 h-[700px] w-[700px] rounded-full"
          style={{ background: "radial-gradient(circle,rgba(139,92,246,0.08) 0%,transparent 65%)", animationDelay: "2.5s" }} />

        <div className="relative z-10 mx-auto w-full max-w-7xl px-5 py-24 sm:px-8 lg:px-10 lg:py-32">
          <div className="grid items-center gap-16 lg:grid-cols-2">

            {/* ── Copy ── */}
            <div className={isArabic ? "text-right" : "text-left"}>
              <motion.div {...fadeIn(0.08)}
                className="mb-7 inline-flex items-center gap-2.5 rounded-full border px-4 py-2"
                style={{ borderColor: "rgba(99,102,241,0.28)", background: "rgba(99,102,241,0.07)" }}>
                <span className="relative flex h-2 w-2">
                  <span className="lnv-ping absolute h-full w-full rounded-full bg-emerald-500 opacity-75" />
                  <span className="relative h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                <span className="text-xs font-bold tracking-wide text-indigo-700">{l.badge}</span>
              </motion.div>

              <motion.h1 {...fadeUp(0.12)}
                className="text-5xl font-black leading-[1.04] tracking-tight text-slate-900 md:text-6xl xl:text-[4.5rem]">
                {isArabic
                  ? <>{isArabic ? "منصة التعلم" : "The AI-Powered"}<br /><span style={GT}>{isArabic ? "بالذكاء الاصطناعي" : "Learning Platform"}</span></>
                  : <>The AI-Powered<br /><span style={GT}>Learning Platform</span></>}
              </motion.h1>

              <motion.p {...fadeUp(0.22)}
                className="mt-6 max-w-lg text-lg leading-8 text-slate-500">
                {l.heroSubtitle}
              </motion.p>

              <motion.div {...fadeUp(0.32)} className="mt-10 flex flex-wrap gap-3">
                <Link to={primaryHref}
                  className="lnv-glow inline-flex h-14 items-center gap-2 rounded-2xl px-8 text-[15px] font-black text-white"
                  style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", boxShadow: "0 8px 36px rgba(99,102,241,.35)" }}>
                  {primaryLabel}
                  <ArrowRight size={17} />
                </Link>
                <button type="button" onClick={() => scrollTo("features")}
                  className="inline-flex h-14 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-8 text-[15px] font-semibold text-slate-600 transition hover:border-indigo-300 hover:text-indigo-700">
                  {isArabic ? "استكشف المميزات" : "Explore features"}
                  <ChevronRight size={16} className={isArabic ? "rotate-180" : ""} />
                </button>
              </motion.div>

              {/* Audience pills */}
              <motion.div {...fadeUp(0.42)} className="mt-9 flex flex-wrap gap-2">
                {(isArabic
                  ? ["مدارس", "أكاديميات", "معلمون", "طلاب", "أهل", "مشرفون"]
                  : ["Schools", "Academies", "Teachers", "Students", "Parents", "Admins"]
                ).map((item) => (
                  <span key={item}
                    className="rounded-full border border-slate-200 bg-white px-3.5 py-1 text-xs font-semibold text-slate-500">
                    {item}
                  </span>
                ))}
              </motion.div>
            </div>

            {/* ── Dashboard mockup ── */}
            <div className="relative hidden min-h-[580px] lg:block">
              {/* Main card */}
              <motion.div
                initial={{ opacity: 0, scale: 0.93, y: 24 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.85, delay: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className="lnv-f1 absolute left-1/2 top-10 w-[340px] -translate-x-1/2 overflow-hidden rounded-2xl"
                style={{ background: "rgba(12,12,36,0.88)", border: "1px solid rgba(99,102,241,0.28)", backdropFilter: "blur(24px)", boxShadow: "0 40px 100px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.04) inset" }}
              >
                {/* Chrome */}
                <div className="flex items-center gap-1.5 border-b px-4 py-3" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                  <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
                  <span className="ms-3 text-[10px] font-semibold text-white/22">learnova · student</span>
                </div>
                <div className="space-y-3.5 p-4">
                  {/* XP row */}
                  <div>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-black uppercase tracking-wide text-indigo-400">⚡ Level 7</span>
                      <span className="text-white/38">2,340 / 3,000 XP</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
                      <div style={{ width: "78%", height: "100%", borderRadius: 99, background: "linear-gradient(90deg,#6366f1,#22d3ee)" }} />
                    </div>
                  </div>
                  {/* Lesson */}
                  <div className="rounded-xl p-3.5" style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.22)" }}>
                    <p className="text-[10px] font-black uppercase tracking-wider text-indigo-400">{isArabic ? "الدرس الحالي" : "Current lesson"}</p>
                    <p className="mt-1 text-sm font-bold leading-snug text-white">
                      {isArabic ? "مقدمة في الفيزياء الكمية" : "Introduction to Quantum Physics"}
                    </p>
                    <div className="mt-2.5 h-1.5 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.1)" }}>
                      <div style={{ width: "62%", height: "100%", borderRadius: 99, background: "linear-gradient(90deg,#6366f1,#22d3ee)" }} />
                    </div>
                    <p className="mt-1 text-[10px] text-indigo-300">62% {isArabic ? "مكتمل" : "complete"}</p>
                  </div>
                  {/* AI answer */}
                  <div>
                    <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-white/28">
                      <Bot size={9} /> AI Mentor
                    </p>
                    <div className="rounded-xl p-3 text-xs leading-6 text-indigo-100/88"
                      style={{ background: "rgba(99,102,241,0.14)", border: "1px solid rgba(99,102,241,0.2)" }}>
                      {isArabic
                        ? "مبدأ عدم اليقين يعني أن موضع الجسيم وزخمه لا يمكن معرفتهما معاً بدقة مطلقة..."
                        : "The uncertainty principle means position and momentum can't both be precisely known simultaneously..."}
                    </div>
                  </div>
                  {/* Input */}
                  <div className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/4 px-3.5 py-2.5">
                    <span className="flex-1 text-xs text-white/22">{isArabic ? "اسأل عن الدرس..." : "Ask about the lesson…"}</span>
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg" style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
                      <ArrowRight size={10} className="text-white" />
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Floating: study tools */}
              <motion.div
                initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.7, delay: 0.55 }}
                className="lnv-f2 absolute end-0 top-6 w-[188px] rounded-xl p-3.5"
                style={{ background: "rgba(12,12,36,0.9)", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(20px)", boxShadow: "0 20px 60px rgba(0,0,0,.55)" }}
              >
                <p className="mb-2.5 text-[9px] font-black uppercase tracking-wider text-white/28">
                  {isArabic ? "أدوات الدراسة" : "Study tools"}
                </p>
                {[
                  { e: "🃏", l: isArabic ? "فلاش كاردز" : "Flashcards", v: "12" },
                  { e: "🗺️", l: isArabic ? "خريطة ذهنية" : "Mind map",  v: "1" },
                  { e: "📝", l: isArabic ? "اختبار"      : "Quiz",       v: "8 Qs" },
                ].map((t) => (
                  <div key={t.l} className="mb-1.5 flex items-center justify-between rounded-lg px-2.5 py-1.5 last:mb-0"
                    style={{ background: "rgba(255,255,255,0.06)" }}>
                    <span className="text-[11px] text-white/72">{t.e} {t.l}</span>
                    <span className="text-[10px] font-bold text-indigo-300">{t.v}</span>
                  </div>
                ))}
              </motion.div>

              {/* Floating: leaderboard */}
              <motion.div
                initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.7, delay: 0.72 }}
                className="lnv-f3 absolute bottom-10 start-0 w-[192px] rounded-xl p-3.5"
                style={{ background: "rgba(12,12,36,0.9)", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(20px)", boxShadow: "0 20px 60px rgba(0,0,0,.55)" }}
              >
                <p className="mb-2.5 text-[9px] font-black uppercase tracking-wider text-white/28">
                  🏆 {isArabic ? "المتصدرون" : "Leaderboard"}
                </p>
                {[
                  { n: isArabic ? "سارة م."  : "Sara M.",    xp: "4,200", r: "🥇" },
                  { n: isArabic ? "أنت"      : "You",        xp: "2,340", r: "🥈" },
                  { n: isArabic ? "خالد ع."  : "Khalid A.",  xp: "1,980", r: "🥉" },
                ].map((r) => (
                  <div key={r.n} className="mb-1.5 flex items-center gap-2 last:mb-0">
                    <span className="text-[11px]">{r.r}</span>
                    <span className="flex-1 text-[11px] text-white/65">{r.n}</span>
                    <span className="text-[10px] font-bold text-indigo-300">{r.xp}</span>
                  </div>
                ))}
              </motion.div>

              {/* Live badge */}
              <motion.div
                initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.95 }}
                className="lnv-f2 absolute bottom-28 end-4 flex items-center gap-2 rounded-full px-3.5 py-2"
                style={{ background: "rgba(16,185,129,0.14)", border: "1px solid rgba(16,185,129,0.3)", backdropFilter: "blur(12px)", animationDelay: "0.6s" }}
              >
                <span className="relative flex h-2 w-2">
                  <span className="lnv-ping absolute h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                <span className="text-[11px] font-bold text-emerald-300">
                  {isArabic ? "٢٤ طالب الآن" : "24 students online"}
                </span>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Bottom fade */}
        <div aria-hidden="true" className="pointer-events-none absolute bottom-0 inset-x-0 h-28"
          style={{ background: "linear-gradient(to bottom,transparent,#f9fafb)" }} />
      </section>

      {/* ══════════ TICKER ══════════ */}
      <div className="overflow-hidden border-y border-indigo-100 bg-indigo-50 py-4">
        <div className="lnv-ticker flex w-max gap-12 whitespace-nowrap">
          {[...ticker, ...ticker].map((item, i) => (
            <span key={i} className="flex items-center gap-2.5 text-sm font-semibold text-slate-400">
              <Sparkles size={11} className="text-indigo-400" />
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* ══════════ STATS ══════════ */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
            {stats.map((s, i) => (
              <motion.div key={s.label} {...fadeUp(i * 0.1)}
                className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
                <p className="text-4xl font-black tracking-tight" style={{ color: s.color }}>{s.value}</p>
                <p className="mt-2 text-sm text-slate-400">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ FEATURES ══════════ */}
      <section id="features" className="py-28 bg-slate-50">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          {/* ── All-plan features ── */}
          <motion.div {...fadeUp(0)} className={`mb-16 ${isArabic ? "text-right" : "text-left"}`}>
            <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-indigo-600">
              <Zap size={11} /> {isArabic ? "المميزات" : "Platform features"}
            </span>
            <h2 className="mt-4 max-w-2xl text-4xl font-black tracking-tight text-slate-900 md:text-5xl" style={{ lineHeight: 1.1 }}>
              {isArabic
                ? <>{isArabic ? "كل ما تحتاجه" : "Everything you need"}<br /><span style={GT}>{isArabic ? "في مكان واحد" : "in one platform"}</span></>
                : <>Everything you need<br /><span style={GT}>in one platform</span></>}
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-8 text-slate-500">
              {isArabic
                ? "Learnova تجمع الذكاء الاصطناعي، التحفيز، والتحليلات في بيئة تعليمية متكاملة — للأكاديميات والمدارس على حد سواء."
                : "Learnova combines AI, gamification, and analytics in one connected environment — for both academies and schools."}
            </p>
          </motion.div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {features.map((f, i) => (
              <motion.article key={f.title} {...fadeUp(i * 0.06)}
                className="lnv-card group relative cursor-default overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = `${f.color}55`;
                  e.currentTarget.style.background   = `${f.color}08`;
                  e.currentTarget.style.boxShadow    = `0 8px 30px ${f.color}18`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#e2e8f0";
                  e.currentTarget.style.background   = "#ffffff";
                  e.currentTarget.style.boxShadow    = "";
                }}
              >
                <div className="absolute inset-x-0 top-0 h-0.5 opacity-0 transition-opacity group-hover:opacity-100"
                  style={{ background: `linear-gradient(90deg,transparent,${f.color},transparent)` }} />
                <div className="lnv-icon-hover mb-5 flex h-11 w-11 items-center justify-center rounded-xl"
                  style={{ background: `${f.color}18`, border: `1px solid ${f.color}30` }}>
                  <f.icon size={19} style={{ color: f.color }} />
                </div>
                <h3 className="text-lg font-black text-slate-900">{f.title}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-500">{f.desc}</p>
              </motion.article>
            ))}
          </div>

          {/* ── School Edition separator ── */}
          <motion.div {...fadeUp(0.05)} className="mt-24">
            <div className="mb-12 flex flex-col items-center text-center gap-4">
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 w-16 bg-slate-200" />
                <span className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-xs font-black uppercase tracking-widest text-white"
                  style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", boxShadow: "0 4px 20px rgba(99,102,241,.30)" }}>
                  <School size={12} />
                  {isArabic ? "حصري للمدارس" : "School Edition Only"}
                </span>
                <div className="h-px flex-1 w-16 bg-slate-200" />
              </div>
              <h3 className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
                {isArabic
                  ? <>{isArabic ? "مميزات مخصصة" : "Purpose-built"} <span style={GT2}>{isArabic ? "للبيئة المدرسية" : "for schools"}</span></>
                  : <>Purpose-built <span style={GT2}>for schools</span></>}
              </h3>
              <p className="max-w-xl text-sm leading-7 text-slate-500">
                {isArabic
                  ? "بالإضافة إلى كل مميزات المنصة، المدارس تحصل على أدوات متخصصة تربط الإدارة، المعلمين، الطلاب، والأهل معاً."
                  : "On top of every platform feature, schools get specialized tools that connect administration, teachers, students, and parents together."}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {schoolFeatures.map((f, i) => (
                <motion.article key={f.title} {...fadeUp(i * 0.08)}
                  className="lnv-card group relative cursor-default overflow-hidden rounded-2xl border p-6 shadow-sm"
                  style={{ background: "rgba(99,102,241,0.03)", borderColor: "rgba(99,102,241,0.18)" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = `${f.color}60`;
                    e.currentTarget.style.background   = `${f.color}08`;
                    e.currentTarget.style.boxShadow    = `0 8px 30px ${f.color}18`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "rgba(99,102,241,0.18)";
                    e.currentTarget.style.background   = "rgba(99,102,241,0.03)";
                    e.currentTarget.style.boxShadow    = "";
                  }}
                >
                  <div className="absolute inset-x-0 top-0 h-0.5 opacity-60"
                    style={{ background: `linear-gradient(90deg,transparent,${f.color},transparent)` }} />
                  <div className="lnv-icon-hover mb-5 flex h-11 w-11 items-center justify-center rounded-xl"
                    style={{ background: `${f.color}18`, border: `1px solid ${f.color}30` }}>
                    <f.icon size={19} style={{ color: f.color }} />
                  </div>
                  <h3 className="text-lg font-black text-slate-900">{f.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-slate-500">{f.desc}</p>
                  <span className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-[10px] font-bold text-indigo-600">
                    <School size={9} /> {isArabic ? "مدارس" : "Schools"}
                  </span>
                </motion.article>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══════════ MOBILE APP ══════════ */}
      <section id="mobile" className="relative overflow-hidden py-28"
        style={{ background: "linear-gradient(160deg,#0f0c29 0%,#302b63 50%,#24243e 100%)" }}>
        {/* Grid overlay */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0"
          style={{ backgroundImage: "linear-gradient(rgba(99,102,241,0.08) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,0.08) 1px,transparent 1px)", backgroundSize: "56px 56px" }} />
        {/* Glow orbs */}
        <div aria-hidden="true" className="lnv-orb pointer-events-none absolute -left-32 top-1/4 h-[600px] w-[600px] rounded-full"
          style={{ background: "radial-gradient(circle,rgba(99,102,241,0.18) 0%,transparent 65%)" }} />
        <div aria-hidden="true" className="lnv-orb pointer-events-none absolute -right-32 bottom-0 h-[500px] w-[500px] rounded-full"
          style={{ background: "radial-gradient(circle,rgba(139,92,246,0.14) 0%,transparent 65%)", animationDelay: "2s" }} />

        <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          {/* Header */}
          <motion.div {...fadeUp(0)} className="mb-16 text-center">
            <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-indigo-300">
              <Smartphone size={11} /> {isArabic ? "التطبيق المحمول" : "Mobile App"}
            </span>
            <h2 className="mt-4 text-4xl font-black tracking-tight text-white md:text-5xl" style={{ lineHeight: 1.1 }}>
              {isArabic
                ? <>{isArabic ? "التعلم في جيبك" : "Learning in your pocket"}<br /><span style={GT}>{isArabic ? "للطلاب والأهل" : "for students & parents"}</span></>
                : <>Learning in your pocket<br /><span style={GT}>for students & parents</span></>}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-8 text-white/55">
              {isArabic
                ? "تطبيق محمول متكامل يتيح للطلاب متابعة دروسهم ومهامهم، وللأهل مراقبة تقدم أبنائهم — في أي وقت ومن أي مكان."
                : "A full-featured mobile app that lets students follow their lessons and tasks, and parents monitor their child's progress — anytime, anywhere."}
            </p>
          </motion.div>

          {/* Two-column: Student + Parent apps */}
          <div className="grid gap-8 lg:grid-cols-2">

            {/* ── Student App ── */}
            <motion.div {...fadeUp(0.1)} className="flex flex-col">
              {/* Label */}
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{ background: "linear-gradient(135deg,#6366f1,#22d3ee)" }}>
                  <GraduationCap size={18} className="text-white" />
                </div>
                <div>
                  <p className="font-black text-white">{isArabic ? "تطبيق الطالب" : "Student App"}</p>
                  <p className="text-xs text-white/45">{isArabic ? "التعلم، التحفيز، والاختبارات" : "Learning, gamification & quizzes"}</p>
                </div>
              </div>

              {/* Phone mockup */}
              <div className="flex-1 overflow-hidden rounded-2xl"
                style={{ background: "rgba(8,8,26,0.92)", border: "1px solid rgba(99,102,241,0.30)", boxShadow: "0 40px 80px rgba(0,0,0,.6), 0 0 60px rgba(99,102,241,0.08)" }}>
                {/* Chrome bar */}
                <div className="flex items-center gap-1.5 border-b px-4 py-3" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                  <span className="h-2.5 w-2.5 rounded-full bg-red-400/60" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400/60" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/60" />
                  <div className="ms-3 flex items-center gap-1.5">
                    <Smartphone size={10} className="text-white/25" />
                    <span className="text-[10px] font-semibold text-white/22">Learnova · Student</span>
                  </div>
                </div>
                <div className="space-y-3.5 p-5">
                  {/* XP bar */}
                  <div>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-black uppercase tracking-wide text-indigo-400">⚡ Level 7</span>
                      <span className="text-white/38">2,340 / 3,000 XP</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
                      <div style={{ width: "78%", height: "100%", borderRadius: 99, background: "linear-gradient(90deg,#6366f1,#22d3ee)" }} />
                    </div>
                  </div>
                  {/* Today's lessons */}
                  <div>
                    <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-white/28">
                      📚 {isArabic ? "دروس اليوم" : "Today's lessons"}
                    </p>
                    {[
                      { title: isArabic ? "مقدمة في الفيزياء الكمية" : "Intro to Quantum Physics",     pct: 62, color: "#6366f1" },
                      { title: isArabic ? "مشتقات الدوال المثلثية"    : "Trigonometric Derivatives",   pct: 40, color: "#22d3ee" },
                      { title: isArabic ? "قصة: ألف ليلة وليلة"        : "Story: 1001 Nights",          pct: 88, color: "#34d399" },
                    ].map((les) => (
                      <div key={les.title} className="mb-2 rounded-xl px-3 py-2.5 last:mb-0"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                        <div className="flex items-center justify-between">
                          <span className="truncate text-xs font-semibold text-white/72 max-w-[200px]">{les.title}</span>
                          <span className="ms-2 shrink-0 text-[10px] font-bold" style={{ color: les.color }}>{les.pct}%</span>
                        </div>
                        <div className="mt-1.5 h-1 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.07)" }}>
                          <div style={{ width: `${les.pct}%`, height: "100%", borderRadius: 99, background: `linear-gradient(90deg,${les.color},${les.color}99)` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Quick tools */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { e: "🃏", l: isArabic ? "فلاش كاردز" : "Flashcards" },
                      { e: "📝", l: isArabic ? "اختبار"      : "Quiz"       },
                      { e: "🗺️", l: isArabic ? "خريطة ذهنية" : "Mind Map"  },
                    ].map((t) => (
                      <div key={t.l} className="flex flex-col items-center gap-1 rounded-xl py-3 text-center"
                        style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.20)" }}>
                        <span className="text-lg">{t.e}</span>
                        <span className="text-[9px] font-bold text-indigo-300">{t.l}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Student app feature bullets */}
              <div className="mt-6 grid grid-cols-2 gap-3">
                {[
                  { icon: Bot,           label: isArabic ? "مرشد ذكي بالذكاء"  : "AI Mentor chat"        },
                  { icon: Flame,         label: isArabic ? "XP وسلاسل يومية"   : "XP & daily streaks"    },
                  { icon: BookOpen,      label: isArabic ? "فلاش كاردز واختبارات" : "Flashcards & quizzes" },
                  { icon: Trophy,        label: isArabic ? "قوائم متصدرين"      : "Live leaderboards"     },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2.5 rounded-xl border border-indigo-500/20 bg-indigo-500/8 px-3 py-2.5">
                    <item.icon size={14} className="shrink-0 text-indigo-400" />
                    <span className="text-xs font-semibold text-white/70">{item.label}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* ── Parent App ── */}
            <motion.div {...fadeUp(0.18)} className="flex flex-col">
              {/* Label */}
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{ background: "linear-gradient(135deg,#8b5cf6,#f59e0b)" }}>
                  <Users size={18} className="text-white" />
                </div>
                <div>
                  <p className="font-black text-white">{isArabic ? "تطبيق ولي الأمر" : "Parent App"}</p>
                  <p className="text-xs text-white/45">{isArabic ? "متابعة الأبناء والتواصل مع المدرسة" : "Track children & connect with school"}</p>
                </div>
              </div>

              {/* Phone mockup */}
              <div className="flex-1 overflow-hidden rounded-2xl"
                style={{ background: "rgba(8,8,26,0.92)", border: "1px solid rgba(139,92,246,0.30)", boxShadow: "0 40px 80px rgba(0,0,0,.6), 0 0 60px rgba(139,92,246,0.08)" }}>
                {/* Chrome bar */}
                <div className="flex items-center gap-1.5 border-b px-4 py-3" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                  <span className="h-2.5 w-2.5 rounded-full bg-red-400/60" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400/60" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/60" />
                  <div className="ms-3 flex items-center gap-1.5">
                    <Smartphone size={10} className="text-white/25" />
                    <span className="text-[10px] font-semibold text-white/22">Learnova · Parent</span>
                  </div>
                </div>
                <div className="space-y-3.5 p-5">
                  {/* Child selector */}
                  <div className="flex gap-2">
                    {[
                      { name: isArabic ? "سارة" : "Sara",   active: true  },
                      { name: isArabic ? "أحمد" : "Ahmed",  active: false },
                    ].map((ch) => (
                      <div key={ch.name}
                        className="flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-bold transition"
                        style={ch.active
                          ? { background: "linear-gradient(135deg,#8b5cf6,#6366f1)", color: "#fff" }
                          : { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.40)", border: "1px solid rgba(255,255,255,0.10)" }}>
                        {ch.name}
                      </div>
                    ))}
                  </div>
                  {/* Stats grid */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { val: "94%",   label: isArabic ? "الحضور"   : "Attendance", color: "#34d399" },
                      { val: "87%",   label: isArabic ? "المعدل"   : "Avg. Grade", color: "#22d3ee" },
                      { val: "14",    label: isArabic ? "سلسلة"    : "Day streak",  color: "#f59e0b" },
                    ].map((s) => (
                      <div key={s.label} className="rounded-xl p-3 text-center"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                        <p className="text-xl font-black" style={{ color: s.color }}>{s.val}</p>
                        <p className="mt-0.5 text-[9px] text-white/32">{s.label}</p>
                      </div>
                    ))}
                  </div>
                  {/* Subject grades */}
                  <div>
                    <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-white/28">
                      📊 {isArabic ? "درجات المواد" : "Subject grades"}
                    </p>
                    {[
                      { subj: isArabic ? "الرياضيات" : "Mathematics", grade: "A+", pct: 96, color: "#34d399" },
                      { subj: isArabic ? "العلوم"     : "Science",     grade: "A",  pct: 87, color: "#22d3ee" },
                      { subj: isArabic ? "اللغة العربية" : "Arabic",  grade: "B+", pct: 78, color: "#f59e0b" },
                    ].map((s) => (
                      <div key={s.subj} className="mb-2 flex items-center gap-3">
                        <span className="w-24 shrink-0 truncate text-xs text-white/50">{s.subj}</span>
                        <div className="flex-1 overflow-hidden rounded-full h-1.5" style={{ background: "rgba(255,255,255,0.08)" }}>
                          <div style={{ width: `${s.pct}%`, height: "100%", borderRadius: 99, background: s.color }} />
                        </div>
                        <span className="w-7 shrink-0 text-right text-[11px] font-black" style={{ color: s.color }}>{s.grade}</span>
                      </div>
                    ))}
                  </div>
                  {/* Notification */}
                  <div className="flex items-start gap-3 rounded-xl p-3"
                    style={{ background: "rgba(251,191,36,0.10)", border: "1px solid rgba(251,191,36,0.25)" }}>
                    <Bell size={13} className="mt-0.5 shrink-0 text-amber-400" />
                    <p className="text-xs leading-5 text-white/65">
                      {isArabic
                        ? "سارة لم تسجل حضور اليوم في مادة الرياضيات"
                        : "Sara was absent today in Mathematics class"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Parent app feature bullets */}
              <div className="mt-6 grid grid-cols-2 gap-3">
                {[
                  { icon: ClipboardList, label: isArabic ? "تتبع الحضور اليومي"  : "Daily attendance"      },
                  { icon: BarChart3,     label: isArabic ? "درجات ومعدلات حية"   : "Live grades & GPA"     },
                  { icon: Bell,          label: isArabic ? "إشعارات فورية"        : "Instant notifications" },
                  { icon: MessageCircle, label: isArabic ? "تواصل مع المعلمين"    : "Teacher messaging"     },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2.5 rounded-xl border border-violet-500/20 bg-violet-500/8 px-3 py-2.5">
                    <item.icon size={14} className="shrink-0 text-violet-400" />
                    <span className="text-xs font-semibold text-white/70">{item.label}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Download note */}
          <motion.div {...fadeUp(0.25)} className="mt-16 flex flex-col items-center gap-4 text-center">
            <p className="text-sm font-semibold text-white/40">
              {isArabic ? "التطبيق متاح على Android وiOS" : "Available on Android & iOS"}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <div className="flex items-center gap-2.5 rounded-xl border border-white/15 bg-white/8 px-5 py-3 backdrop-blur-sm">
                <Download size={15} className="text-white/60" />
                <div className={isArabic ? "text-right" : "text-left"}>
                  <p className="text-[9px] font-semibold uppercase tracking-widest text-white/40">{isArabic ? "متاح على" : "Get it on"}</p>
                  <p className="text-sm font-black text-white">Google Play</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 rounded-xl border border-white/15 bg-white/8 px-5 py-3 backdrop-blur-sm">
                <Download size={15} className="text-white/60" />
                <div className={isArabic ? "text-right" : "text-left"}>
                  <p className="text-[9px] font-semibold uppercase tracking-widest text-white/40">{isArabic ? "حمّل من" : "Download on"}</p>
                  <p className="text-sm font-black text-white">App Store</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══════════ AI EXPERIENCE ══════════ */}
      <section id="ai-section" className="relative overflow-hidden py-28"
        style={{ background: "radial-gradient(ellipse 55% 45% at 50% 50%,rgba(99,102,241,0.06) 0%,transparent 70%), #ffffff" }}>
        <div aria-hidden="true" className="pointer-events-none absolute inset-0"
          style={{ backgroundImage: "linear-gradient(rgba(99,102,241,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,0.04) 1px,transparent 1px)", backgroundSize: "48px 48px" }} />

        <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <div className="grid items-center gap-16 lg:grid-cols-2">

            {/* AI Chat mockup */}
            <motion.div {...fadeUp(0)}>
              <div className="relative rounded-2xl overflow-hidden"
                style={{ background: "rgba(8,8,26,0.94)", border: "1px solid rgba(99,102,241,0.28)", boxShadow: "0 40px 100px rgba(0,0,0,.65), 0 0 80px rgba(99,102,241,0.07)" }}>
                {/* Header */}
                <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl"
                      style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
                      <Bot size={14} className="text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-white">AI Mentor</p>
                      <p className="text-[10px] text-emerald-400">● {isArabic ? "نشط" : "Active"}</p>
                    </div>
                  </div>
                  <span className="rounded-full border border-indigo-500/28 bg-indigo-500/10 px-2.5 py-1 text-[10px] font-bold text-indigo-300">
                    RAG
                  </span>
                </div>
                {/* Chat messages */}
                <div className="space-y-3 p-5">
                  {[
                    { role: "user",      text: isArabic ? "اشرح مبدأ عدم اليقين لهايزنبرغ" : "Explain Heisenberg's uncertainty principle" },
                    { role: "assistant", text: isArabic ? "من محتوى درس الفيزياء الكمية:\nمبدأ عدم اليقين يقرر أنه يستحيل تحديد موضع الجسيم وكميته الحركية بدقة مطلقة في الوقت نفسه..." : "From your Quantum Physics lesson:\nThe uncertainty principle states it's impossible to know both position and momentum with perfect precision simultaneously..." },
                    { role: "user",      text: isArabic ? "هل يمكنك اختباري الآن؟" : "Can you quiz me on this now?" },
                    { role: "assistant", text: isArabic ? "بالتأكيد! سؤال ١:\nإذا قلّت عدم دقة قياس الموضع Δx، ماذا يحدث لـ Δp؟" : "Sure! Question 1:\nIf position uncertainty Δx decreases, what happens to Δp?" },
                  ].map((m, i) => (
                    <div key={i} className={`flex ${m.role === "user" ? (isArabic ? "justify-start" : "justify-end") : (isArabic ? "justify-end" : "justify-start")}`}>
                      <div className="max-w-[82%] rounded-xl px-3.5 py-2.5 text-xs leading-6"
                        style={m.role === "user"
                          ? { background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff" }
                          : { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.78)", whiteSpace: "pre-line" }}>
                        {m.text}
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/4 px-3.5 py-2.5">
                    <span className="flex-1 text-xs text-white/22">{isArabic ? "اسأل عن الدرس..." : "Ask about the lesson..."}</span>
                    <div className="flex h-6 w-6 items-center justify-center rounded-lg" style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
                      <ArrowRight size={10} className="text-white" />
                    </div>
                  </div>
                </div>
              </div>
              {/* Source chip */}
              <div className="absolute -bottom-4 -end-4 rounded-xl border border-indigo-500/22 px-3.5 py-2.5"
                style={{ background: "rgba(10,10,40,0.96)", backdropFilter: "blur(12px)", boxShadow: "0 8px 28px rgba(0,0,0,.5)" }}>
                <p className="text-[10px] font-black uppercase tracking-wider text-indigo-400">{isArabic ? "المصدر" : "Source"}</p>
                <p className="text-xs text-white/65">{isArabic ? "فيزياء كمية — الفصل ٣" : "Quantum Physics — Ch.3"}</p>
              </div>
            </motion.div>

            {/* AI feature list */}
            <motion.div {...fadeUp(0.15)}>
              <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-violet-600">
                <Cpu size={11} /> {isArabic ? "تجربة الذكاء الاصطناعي" : "AI Experience"}
              </span>
              <h2 className="mt-4 text-4xl font-black leading-tight tracking-tight text-slate-900 md:text-5xl">
                {isArabic
                  ? <>{isArabic ? "ذكاء مبني على" : "Intelligence built on"}<br /><span style={GT}>{isArabic ? "محتوى دروسك" : "your lesson content"}</span></>
                  : <>Intelligence built on<br /><span style={GT}>your lesson content</span></>}
              </h2>
              <p className="mt-5 text-base leading-8 text-slate-500">
                {isArabic
                  ? "النظام يقرأ ملفات الدرس ويبني قاعدة معرفية، ثم يجيب الطلاب بدقة من المصدر — لا توليد عشوائي."
                  : "The system indexes lesson files into a vector knowledge base, then answers students precisely from source — no hallucination."}
              </p>
              <div className="mt-8 space-y-3">
                {[
                  { icon: Cpu,       title: isArabic ? "RAG — استرجاع من المصدر" : "RAG-powered retrieval",    desc: isArabic ? "إجابات مبنية على نص الدرس الفعلي." : "Answers grounded in actual lesson text." },
                  { icon: Brain,     title: isArabic ? "توليد اختبارات تلقائي"   : "Auto quiz generation",    desc: isArabic ? "أسئلة تلقائية من مواد الدرس."    : "Questions auto-generated from lesson assets." },
                  { icon: Lightbulb, title: isArabic ? "توصيات مخصصة"            : "Personalized coaching",  desc: isArabic ? "مسار تعلم مخصص لكل طالب."      : "Adaptive learning path per student." },
                  { icon: FileText,  title: isArabic ? "ملخصات ذكية"             : "AI summaries",           desc: isArabic ? "ملخص كل درس بضغطة واحدة."       : "One-click lesson summarization." },
                ].map((item) => (
                  <div key={item.title}
                    className="flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-indigo-300 hover:shadow-md">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                      style={{ background: "rgba(99,102,241,0.10)", border: "1px solid rgba(99,102,241,0.18)" }}>
                      <item.icon size={16} className="text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900">{item.title}</p>
                      <p className="mt-0.5 text-xs text-slate-400">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ══════════ STUDENT EXPERIENCE ══════════ */}
      <section id="experience" className="py-28 bg-slate-50">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <motion.div {...fadeUp(0)} className={`mb-16 ${isArabic ? "text-right" : "text-left"}`}>
            <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-orange-600">
              <Flame size={11} /> {isArabic ? "تجربة الطالب" : "Student experience"}
            </span>
            <h2 className="mt-4 max-w-2xl text-4xl font-black tracking-tight text-slate-900 md:text-5xl" style={{ lineHeight: 1.1 }}>
              {isArabic
                ? <>{isArabic ? "تعلّم يُثير الشغف" : "Learning that sparks"}<br /><span style={GT}>{isArabic ? "ويكافئ التقدم" : "passion and progress"}</span></>
                : <>Learning that sparks<br /><span style={GT}>passion and progress</span></>}
            </h2>
            <p className="mt-4 max-w-xl text-base leading-8 text-slate-500">
              {isArabic
                ? "نقاط XP، سلاسل يومية، إنجازات، ومنافسة صحية — كلها تحفّز الطالب على الاستمرار كل يوم."
                : "XP points, daily streaks, achievements, and healthy competition keep students motivated every single day."}
            </p>
          </motion.div>

          <div className="grid gap-5 lg:grid-cols-3">
            {/* XP & Streak */}
            <motion.div {...fadeUp(0.1)}
              className="rounded-2xl border border-orange-200 bg-orange-50 p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-xs font-black uppercase tracking-wider text-orange-600">⚡ XP &amp; Streaks</p>
                <span className="rounded-full bg-orange-100 px-2.5 py-1 text-[10px] font-bold text-orange-600">
                  🔥 14 {isArabic ? "أيام" : "days"}
                </span>
              </div>
              <p className="text-5xl font-black text-slate-900">2,340</p>
              <p className="mt-1 text-sm text-slate-400">XP {isArabic ? "هذا الأسبوع" : "this week"}</p>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-orange-100">
                <div style={{ width: "78%", height: "100%", borderRadius: 99, background: "linear-gradient(90deg,#f97316,#fbbf24)" }} />
              </div>
              <p className="mt-2 text-xs text-slate-400">Level 7 · 660 XP to next level</p>
              <div className="mt-5 grid grid-cols-7 gap-1.5">
                {["M","T","W","T","F","S","S"].map((d, i) => (
                  <div key={i} className="flex flex-col items-center gap-1 rounded-lg py-2 text-[9px] font-bold"
                    style={i < 5 ? { background: "rgba(249,115,22,0.12)", color: "#ea580c" } : { background: "#f1f5f9", color: "#94a3b8" }}>
                    {i < 5 ? "🔥" : "○"}
                    {d}
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Achievements */}
            <motion.div {...fadeUp(0.15)}
              className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
              <p className="mb-4 text-xs font-black uppercase tracking-wider text-amber-600">🏆 {isArabic ? "الإنجازات" : "Achievements"}</p>
              <div className="space-y-2.5">
                {[
                  { icon: "🎯", title: isArabic ? "إتقان الفيزياء" : "Physics Master",  desc: isArabic ? "100% في 5 اختبارات" : "5 perfect quizzes",      done: true  },
                  { icon: "📚", title: isArabic ? "قارئ نهم"       : "Avid Reader",     desc: isArabic ? "أكمل 20 درساً"     : "Completed 20 lessons",   done: true  },
                  { icon: "⚡", title: isArabic ? "طالب نشط"       : "Power Student",   desc: isArabic ? "7 أيام متتالية"    : "7-day streak",            done: true  },
                  { icon: "🏅", title: isArabic ? "الأول على القسم" : "Class #1",        desc: isArabic ? "تصدّر القائمة"     : "Top of leaderboard",     done: false },
                ].map((a) => (
                  <div key={a.title}
                    className="flex items-center gap-3 rounded-xl p-3 transition"
                    style={a.done
                      ? { background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.30)" }
                      : { background: "#f8fafc", border: "1px solid #e2e8f0", opacity: 0.5 }}>
                    <span className="text-xl">{a.icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-black text-slate-900">{a.title}</p>
                      <p className="text-[10px] text-slate-400">{a.desc}</p>
                    </div>
                    {a.done && <CheckCircle2 size={14} className="shrink-0 text-amber-500" />}
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Rankings */}
            <motion.div {...fadeUp(0.2)}
              className="rounded-2xl border border-violet-200 bg-violet-50 p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-xs font-black uppercase tracking-wider text-violet-600">🏅 {isArabic ? "التصنيف" : "Rankings"}</p>
                <span className="text-[10px] text-slate-400">{isArabic ? "هذا الأسبوع" : "This week"}</span>
              </div>
              <div className="space-y-2">
                {[
                  { rank: 1, name: isArabic ? "سارة م."  : "Sara M.",    xp: "4,200", you: false },
                  { rank: 2, name: isArabic ? "أنت"      : "You",        xp: "2,340", you: true  },
                  { rank: 3, name: isArabic ? "خالد ع."  : "Khalid A.",  xp: "1,980", you: false },
                  { rank: 4, name: isArabic ? "منى س."   : "Mona S.",    xp: "1,750", you: false },
                  { rank: 5, name: isArabic ? "عمر ر."   : "Omar R.",    xp: "1,600", you: false },
                ].map((r) => (
                  <div key={r.rank}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition"
                    style={r.you
                      ? { background: "linear-gradient(135deg,rgba(99,102,241,0.12),rgba(139,92,246,0.10))", border: "1px solid rgba(99,102,241,0.30)" }
                      : { background: "#ffffff", border: "1px solid #e2e8f0" }}>
                    <span className="w-5 text-center text-xs font-black"
                      style={{ color: r.rank <= 3 ? ["#d97706","#94a3b8","#b45309"][r.rank - 1] : "#94a3b8" }}>
                      {r.rank <= 3 ? ["🥇","🥈","🥉"][r.rank - 1] : r.rank}
                    </span>
                    <span className={`flex-1 text-xs font-semibold ${r.you ? "text-indigo-700" : "text-slate-500"}`}>{r.name}</span>
                    <span className="text-xs font-black" style={{ color: r.you ? "#6366f1" : "#94a3b8" }}>{r.xp} XP</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ══════════ INSTRUCTOR EXPERIENCE ══════════ */}
      <section className="relative overflow-hidden py-28 bg-white">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0"
          style={{ backgroundImage: "linear-gradient(rgba(99,102,241,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,0.03) 1px,transparent 1px)", backgroundSize: "60px 60px" }} />

        <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <div className="grid items-center gap-16 lg:grid-cols-2">
            {/* Copy */}
            <motion.div {...fadeUp(0)} className={isArabic ? "lg:order-2" : "lg:order-1"}>
              <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-cyan-700">
                <BarChart3 size={11} /> {isArabic ? "تجربة المعلم" : "Instructor experience"}
              </span>
              <h2 className="mt-4 text-4xl font-black leading-tight tracking-tight text-slate-900 md:text-5xl">
                {isArabic
                  ? <>{isArabic ? "لوحة تحكم" : "A dashboard that"}<br /><span style={GT}>{isArabic ? "تقود الفصل كاملاً" : "runs your classroom"}</span></>
                  : <>A dashboard that<br /><span style={GT}>runs your classroom</span></>}
              </h2>
              <p className="mt-5 text-base leading-8 text-slate-500">
                {isArabic
                  ? "المعلم يرى كل شيء: من درجات الطلاب إلى معدل مشاركتهم، وينشئ اختبارات ذكية بضغطة واحدة."
                  : "Instructors see everything: from student grades to engagement rates, and generate smart quizzes in one click."}
              </p>
              <div className="mt-8 grid grid-cols-2 gap-3">
                {[
                  { icon: BarChart3,     label: isArabic ? "تحليلات لحظية" : "Live analytics",    color: "#0891b2" },
                  { icon: Brain,        label: isArabic ? "توليد اختبارات" : "Quiz generation",  color: "#7c3aed" },
                  { icon: BookOpen,     label: isArabic ? "إدارة الدروس"   : "Lesson management",color: "#059669" },
                  { icon: MessageCircle,label: isArabic ? "تواصل مباشر"    : "Direct messaging", color: "#ea580c" },
                  { icon: TrendingUp,   label: isArabic ? "تتبع التقدم"    : "Progress tracking",color: "#d97706" },
                  { icon: Users,        label: isArabic ? "إدارة الطلاب"   : "Student roster",   color: "#e11d48" },
                ].map((item) => (
                  <div key={item.label}
                    className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm transition hover:border-slate-300 hover:shadow-md">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
                      style={{ background: `${item.color}15` }}>
                      <item.icon size={15} style={{ color: item.color }} />
                    </div>
                    <p className="text-sm font-semibold text-slate-600">{item.label}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Analytics mockup */}
            <motion.div {...fadeUp(0.14)} className={isArabic ? "lg:order-1" : "lg:order-2"}>
              <div className="overflow-hidden rounded-2xl"
                style={{ background: "rgba(6,6,24,0.96)", border: "1px solid rgba(34,211,238,0.2)", boxShadow: "0 40px 100px rgba(0,0,0,.65), 0 0 60px rgba(34,211,238,0.05)" }}>
                <div className="border-b px-5 py-4" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                  <p className="text-xs font-black text-white">{isArabic ? "لوحة المعلم — تحليلات الفصل" : "Instructor Dashboard — Class Analytics"}</p>
                </div>
                <div className="space-y-4 p-5">
                  {/* Stat row */}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { val: "94%",  label: isArabic ? "نسبة الاجتياز"  : "Pass rate",     color: "#34d399" },
                      { val: "87%",  label: isArabic ? "نسبة المشاركة"  : "Engagement",    color: "#22d3ee" },
                      { val: "4.8★", label: isArabic ? "تقييم الدرس"    : "Lesson rating", color: "#fbbf24" },
                    ].map((s) => (
                      <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                        <p className="text-xl font-black" style={{ color: s.color }}>{s.val}</p>
                        <p className="mt-1 text-[10px] text-white/32">{s.label}</p>
                      </div>
                    ))}
                  </div>
                  {/* Student rows */}
                  <div>
                    <p className="mb-2.5 text-[10px] font-black uppercase tracking-wider text-white/28">
                      {isArabic ? "أداء الطلاب" : "Student performance"}
                    </p>
                    <div className="space-y-2.5">
                      {[
                        { name: isArabic ? "سارة محمود"  : "Sara Mahmoud",  pct: 98 },
                        { name: isArabic ? "أحمد سالم"   : "Ahmed Salem",   pct: 87 },
                        { name: isArabic ? "مريم خالد"   : "Mariam Khaled", pct: 75 },
                        { name: isArabic ? "عمر إبراهيم" : "Omar Ibrahim",  pct: 61 },
                      ].map((s) => {
                        const bar = s.pct >= 80 ? "linear-gradient(90deg,#22d3ee,#34d399)" : s.pct >= 60 ? "linear-gradient(90deg,#f59e0b,#f97316)" : "linear-gradient(90deg,#f43f5e,#f97316)";
                        const col = s.pct >= 80 ? "#34d399" : s.pct >= 60 ? "#f59e0b" : "#f43f5e";
                        return (
                          <div key={s.name} className="flex items-center gap-3">
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-black text-white"
                              style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>{s.name[0]}</div>
                            <span className="w-24 shrink-0 truncate text-xs text-white/52">{s.name}</span>
                            <div className="flex-1 overflow-hidden rounded-full h-1.5" style={{ background: "rgba(255,255,255,0.08)" }}>
                              <div style={{ width: `${s.pct}%`, height: "100%", borderRadius: 99, background: bar }} />
                            </div>
                            <span className="w-9 shrink-0 text-right text-xs font-bold" style={{ color: col }}>{s.pct}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  {/* Quick actions */}
                  <div className="grid grid-cols-2 gap-2">
                    <button className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/4 px-3 py-2.5 text-xs font-bold text-white/55 transition hover:bg-white/7">
                      <Brain size={12} className="text-indigo-400" />
                      {isArabic ? "إنشاء اختبار" : "Generate quiz"}
                    </button>
                    <button className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/4 px-3 py-2.5 text-xs font-bold text-white/55 transition hover:bg-white/7">
                      <TrendingUp size={12} className="text-cyan-400" />
                      {isArabic ? "تقرير كامل" : "Full report"}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ══════════ TESTIMONIALS ══════════ */}
      <section className="py-28 bg-slate-50">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <motion.div {...fadeUp(0)} className="mb-16 text-center">
            <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-emerald-700">
              <Star size={11} /> {isArabic ? "قالوا عنا" : "What they say"}
            </span>
            <h2 className="mt-4 text-4xl font-black tracking-tight text-slate-900 md:text-5xl" style={{ lineHeight: 1.1 }}>
              {isArabic
                ? <><span style={GT}>مؤسسات حقيقية</span> تثق في Learnova</>
                : <>Real institutions trust <span style={GT}>Learnova</span></>}
            </h2>
          </motion.div>

          <div className="grid gap-5 md:grid-cols-3">
            {testimonials.map((t, i) => (
              <motion.article key={t.name} {...fadeUp(i * 0.12)}
                className="lnv-card rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-5 flex gap-1">
                  {Array.from({ length: 5 }, (_, j) => (
                    <Star key={j} size={13} className="fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-sm italic leading-8 text-slate-600">"{t.quote}"</p>
                <div className="mt-6 flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-black text-white"
                    style={{ background: `linear-gradient(135deg,${t.color},${t.color}99)` }}>
                    {t.avatar}
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900">{t.name}</p>
                    <p className="text-xs text-slate-400">{t.role}</p>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ PRICING ══════════ */}
      <section id="pricing" className="py-28 bg-white">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <motion.div {...fadeUp(0)} className="mb-16 text-center">
            <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-indigo-600">
              <Target size={11} /> {isArabic ? "الأسعار" : "Pricing"}
            </span>
            <h2 className="mt-4 text-4xl font-black tracking-tight text-slate-900 md:text-5xl" style={{ lineHeight: 1.1 }}>
              {l.plansTitle}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-8 text-slate-500">{l.plansSubtitle}</p>
            {/* Trial banner */}
            <div className="mt-7 inline-flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-3">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="lnv-ping absolute h-full w-full rounded-full bg-emerald-500 opacity-75" />
                <span className="relative h-2.5 w-2.5 rounded-full bg-emerald-500" />
              </span>
              <span className="text-sm font-black text-emerald-700">{l.planTrial}</span>
            </div>
          </motion.div>

          {planList.length > 0 ? (
            <div className="grid gap-5 lg:grid-cols-3">
              {planList.map((plan, index) => {
                const isPopular   = Boolean(plan.isPopular || plan.recommended || index === 1);
                const isSchool    = String(plan.name || '').toLowerCase().includes('school');
                const feats        = formatFeatureList(plan.features || plan.Features || []);
                const SCHOOL_FEAT_NAMES = ['Attendance Tracking','Parent Portal','School Calendar','Grade Reports','Parent Notifications','Class Management','Academic Years & Terms','Timetable Management'];
                const PRO_NEW_NAMES     = ['AI Chat','Notifications','Analytics'];
                const schoolFeats  = feats.filter(f => SCHOOL_FEAT_NAMES.includes(f));
                const proNewFeats  = feats.filter(f => PRO_NEW_NAMES.includes(f));
                const coreFeats    = feats.filter(f => !schoolFeats.includes(f) && !proNewFeats.includes(f));
                const isPro        = String(plan.name || '').toLowerCase().includes('pro');
                const price        = Number(plan.price ?? plan.Price ?? 0);
                const label        = plan.name || plan.Name || `Plan ${index + 1}`;
                return (
                  <motion.article key={plan.id || label} {...fadeUp(index * 0.1)}
                    className="relative flex flex-col rounded-2xl p-7"
                    style={isPopular ? {
                      background: "linear-gradient(180deg,rgba(99,102,241,0.07) 0%,rgba(139,92,246,0.04) 100%)",
                      border: "2px solid rgba(99,102,241,0.40)",
                      boxShadow: "0 0 40px rgba(99,102,241,0.10), 0 20px 40px rgba(99,102,241,0.08)",
                    } : {
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                    }}>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      {plan.durationDays} {isArabic ? "يوم" : "days"}
                    </p>
                    <h3 className="mt-2 text-2xl font-black text-slate-900">{label}</h3>
                    <div className="mt-3 flex items-end gap-1.5">
                      <span className="text-5xl font-black tracking-tight text-slate-900" style={{ lineHeight: 1 }}>
                        {price === 0 ? l.planFree : `$${price}`}
                      </span>
                      {price > 0 && <span className="mb-1.5 text-sm text-slate-400">{l.planPerMonth}</span>}
                    </div>
                    <p className="mt-4 text-sm leading-7 text-slate-500">
                      {plan.description || plan.Description || (isArabic ? "خطة جاهزة للاستخدام." : "Ready-to-use plan.")}
                    </p>
                    {feats.length > 0 && (
                      <ul className="mt-6 space-y-2 border-t border-slate-200 pt-6 text-sm text-slate-500">
                        {/* Inherited / core features */}
                        {coreFeats.slice(0, 6).map((item) => (
                          <li key={item} className="flex items-start gap-2.5">
                            <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-indigo-500" />
                            <span>{item}</span>
                          </li>
                        ))}

                        {/* Academy Pro — new features section */}
                        {isPro && proNewFeats.length > 0 && (
                          <>
                            <li className="pt-2">
                              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                {isArabic ? "ما الجديد في Pro" : "New in Pro"}
                              </span>
                            </li>
                            {proNewFeats.map((item) => (
                              <li key={item} className="flex items-start gap-2.5">
                                <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full"
                                  style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
                                  <CheckCircle2 size={10} className="text-white" />
                                </div>
                                <div>
                                  <span className="font-bold text-slate-800">{item}</span>
                                  {item === 'AI Chat' && (
                                    <p className="text-[11px] text-slate-400 mt-0.5">
                                      {isArabic ? "مساعد ذكي مرتبط بمحتوى دروسك" : "RAG-powered tutor grounded in your lessons"}
                                    </p>
                                  )}
                                  {item === 'Notifications' && (
                                    <p className="text-[11px] text-slate-400 mt-0.5">
                                      {isArabic ? "إشعارات فورية للطلاب والمعلمين" : "Real-time push alerts for students & teachers"}
                                    </p>
                                  )}
                                  {item === 'Analytics' && (
                                    <p className="text-[11px] text-slate-400 mt-0.5">
                                      {isArabic ? "لوحات أداء لحظية للمعلمين" : "Live performance dashboards for instructors"}
                                    </p>
                                  )}
                                </div>
                              </li>
                            ))}
                          </>
                        )}

                        {/* School Edition — school-only features */}
                        {isSchool && schoolFeats.length > 0 && (
                          <>
                            <li className="pt-2">
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-indigo-600">
                                <School size={9} /> {isArabic ? "حصري للمدارس" : "School only"}
                              </span>
                            </li>
                            {schoolFeats.slice(0, 4).map((item) => (
                              <li key={item} className="flex items-start gap-2.5">
                                <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-violet-500" />
                                <span className="font-medium text-violet-700">{item}</span>
                              </li>
                            ))}
                          </>
                        )}
                      </ul>
                    )}
                    <Link
                      to={isAuthenticated && String(role).toUpperCase() === AUTH_ROLES.ORGANIZATION ? dashPath : "/signup"}
                      className="lnv-glow mt-auto inline-flex h-12 items-center justify-center rounded-xl px-5 text-sm font-bold transition"
                      style={Object.assign({ marginTop: "1.75rem" }, isPopular
                        ? { background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", boxShadow: "0 6px 24px rgba(99,102,241,.35)" }
                        : { background: "#ffffff", border: "1px solid #e2e8f0", color: "#374151" }
                      )}>
                      {l.planCta}
                    </Link>
                  </motion.article>
                );
              })}
            </div>
          ) : (
            <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-slate-50 p-12 text-center shadow-sm">
              <p className="text-2xl font-black text-slate-900">{l.noPlans}</p>
              <p className="mt-3 text-sm leading-7 text-slate-500">
                {isArabic ? "أنشئ حسابك وعد لاحقاً لاختيار الخطة." : "Create your account and choose a plan later."}
              </p>
              <Link to="/signup"
                className="lnv-glow mt-7 inline-flex h-12 items-center justify-center rounded-xl px-8 text-sm font-bold text-white"
                style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", boxShadow: "0 6px 24px rgba(99,102,241,.35)" }}>
                {l.startNow}
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ══════════ FINAL CTA ══════════ */}
      <section className="relative overflow-hidden py-32"
        style={{ background: "radial-gradient(ellipse 65% 55% at 50% 50%,rgba(99,102,241,0.08) 0%,transparent 70%), #f0f4ff" }}>
        <div aria-hidden="true" className="pointer-events-none absolute inset-0"
          style={{ backgroundImage: "linear-gradient(rgba(99,102,241,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,0.05) 1px,transparent 1px)", backgroundSize: "56px 56px" }} />

        <div className="relative z-10 mx-auto max-w-3xl px-5 text-center sm:px-8">
          <motion.div {...fadeIn(0)}>
            <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2 text-xs font-black uppercase tracking-widest text-indigo-600">
              <Sparkles size={11} /> {isArabic ? "ابدأ اليوم" : "Get started today"}
            </span>
          </motion.div>

          <motion.h2 {...fadeUp(0.1)}
            className="text-5xl font-black leading-[1.05] tracking-tight text-slate-900 md:text-6xl">
            {isArabic
              ? <>{isArabic ? "حوّل تجربة التعلم" : "Transform learning"}<br /><span style={GT}>{isArabic ? "في مؤسستك اليوم" : "in your organization"}</span></>
              : <>Transform learning<br /><span style={GT}>in your organization</span></>}
          </motion.h2>

          <motion.p {...fadeUp(0.18)} className="mx-auto mt-6 max-w-lg text-lg leading-8 text-slate-500">
            {isArabic
              ? "أنشئ حساب المؤسسة خلال دقائق وابدأ تفعيل الكورسات الذكية فوراً."
              : "Create your organization account in minutes and start activating AI-powered courses immediately."}
          </motion.p>

          <motion.div {...fadeUp(0.26)} className="mt-10 flex flex-wrap justify-center gap-4">
            <Link to={primaryHref}
              className="lnv-glow inline-flex h-14 items-center gap-2.5 rounded-2xl px-10 text-[15px] font-black text-white"
              style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", boxShadow: "0 8px 40px rgba(99,102,241,.35)" }}>
              {primaryLabel}
              <ArrowRight size={18} />
            </Link>
            <Link to="/login"
              className="inline-flex h-14 items-center rounded-2xl border border-slate-300 bg-white px-10 text-[15px] font-semibold text-slate-600 transition hover:border-indigo-300 hover:text-indigo-700">
              {l.loginCta}
            </Link>
          </motion.div>

          <motion.p {...fadeIn(0.36)} className="mt-8 text-sm text-slate-400">
            {isArabic ? "تجربة مجانية 30 يوم · إعداد فوري · دعم مباشر" : "30-day free trial · Instant setup · Direct support"}
          </motion.p>
        </div>
      </section>

      {/* ══════════ FOOTER ══════════ */}
      <footer className="border-t border-slate-200 bg-slate-50 px-5 py-16 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 lg:grid-cols-[1.6fr_0.8fr_0.8fr_1fr]">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl"
                  style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", boxShadow: "0 0 18px rgba(99,102,241,.28)" }}>
                  <Sparkles size={15} className="text-white" />
                </div>
                <span className="text-[13px] font-black uppercase tracking-[0.26em] text-slate-700">Learnova</span>
              </div>
              <p className="mt-4 max-w-xs text-sm leading-7 text-slate-400">
                {isArabic
                  ? "منصة تعلم ذكية للمدارس والأكاديميات — دروس حقيقية، ذكاء اصطناعي، وتحليلات."
                  : "AI-powered learning for schools and academies — real lessons, AI mentor, and analytics."}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {(isArabic ? ["مدارس", "أكاديميات", "معلمون"] : ["Schools", "Academies", "Teachers"]).map((t) => (
                  <span key={t} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-400">{t}</span>
                ))}
              </div>
            </div>

            {/* Product */}
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">{isArabic ? "المنتج" : "Product"}</p>
              <div className="mt-5 flex flex-col gap-3 text-sm text-slate-500">
                {navLinks.map((link) => (
                  <button key={link.id} type="button" onClick={() => scrollTo(link.id)}
                    className="text-start transition hover:text-indigo-600">
                    {link.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Roles */}
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">{isArabic ? "الأدوار" : "Roles"}</p>
              <div className="mt-5 flex flex-col gap-3 text-sm text-slate-500">
                {[
                  { to: "/login",       label: isArabic ? "طالب"   : "Student" },
                  { to: "/login",       label: isArabic ? "معلم"   : "Instructor" },
                  { to: "/signup",      label: isArabic ? "مؤسسة" : "Organization" },
                  { to: "/admin/login", label: isArabic ? "أدمن"  : "Admin" },
                ].map((r) => (
                  <Link key={r.label} to={r.to} className="transition hover:text-indigo-600">{r.label}</Link>
                ))}
              </div>
            </div>

            {/* Get started */}
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">{isArabic ? "ابدأ الآن" : "Get started"}</p>
              <div className="mt-5 flex flex-col gap-3">
                <Link to={primaryHref}
                  className="lnv-glow inline-flex h-11 items-center justify-center gap-1.5 rounded-xl px-5 text-sm font-bold text-white"
                  style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", boxShadow: "0 4px 18px rgba(99,102,241,.28)" }}>
                  {primaryLabel}
                  <ArrowRight size={13} />
                </Link>
                <Link to="/login"
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-500 transition hover:border-indigo-200 hover:text-indigo-700">
                  {l.loginCta}
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-12 flex flex-col gap-3 border-t border-slate-200 pt-8 text-xs text-slate-400 md:flex-row md:items-center md:justify-between">
            <p>© {new Date().getFullYear()} Learnova. {isArabic ? "جميع الحقوق محفوظة." : "All rights reserved."}</p>
            <div className="flex flex-wrap gap-5">
              {navLinks.slice(0, 3).map((link) => (
                <button key={link.id} type="button" onClick={() => scrollTo(link.id)}
                  className="transition hover:text-indigo-600">{link.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
