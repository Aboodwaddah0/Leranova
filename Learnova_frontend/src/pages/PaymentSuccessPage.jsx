import { useEffect, useRef, useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { CheckCircle, Mail, ShieldCheck, Sparkles, Loader2, XCircle } from "lucide-react";
import api from "../utils/api";
import { useLanguage } from "../utils/i18n";

export default function PaymentSuccessPage() {
  const { lang, isArabic, t, toggleLang } = useLanguage();
  const [searchParams]  = useSearchParams();
  const navigate        = useNavigate();
  const sessionId       = searchParams.get("session_id");

  const [phase, setPhase]         = useState("confirming");
  const [orgStatus, setOrgStatus] = useState(null);
  const called = useRef(false);

  const applyStatus = (status) => {
    setOrgStatus(status);
    if (status === "APPROVED")            setPhase("approved");
    else if (status === "EMAIL_VERIFIED") setPhase("waiting_admin");
    else                                  setPhase("waiting_email");
  };

  // Initial load — run once
  useEffect(() => {
    if (called.current) return;
    called.current = true;
    if (!sessionId) { setPhase("waiting_email"); return; }
    api.get(`/checkout/confirm?session_id=${encodeURIComponent(sessionId)}`)
      .then(({ data }) => {
        const sessionType = data?.data?.sessionType || '';
        // Subject-subscription sessions were mistakenly sent here — redirect immediately
        if (sessionType === 'SUBJECT_SUBSCRIPTION' || sessionType === 'COURSE_PAYMENT') {
          navigate(`/student/payment-success?session_id=${encodeURIComponent(sessionId)}`, { replace: true });
          return;
        }
        applyStatus(data?.data?.orgStatus);
      })
      .catch(() => setPhase("waiting_email"));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Poll every 5 s while waiting — inline to avoid stale-closure issues
  useEffect(() => {
    if (phase === "confirming" || phase === "approved") return;
    if (!sessionId) return;
    const id = setInterval(() => {
      api.get(`/checkout/confirm?session_id=${encodeURIComponent(sessionId)}`)
        .then(({ data }) => {
          const s = data?.data?.orgStatus;
          if (s === "APPROVED")            setPhase("approved");
          else if (s === "EMAIL_VERIFIED") setPhase("waiting_admin");
          else                             setPhase("waiting_email");
        })
        .catch(() => {/* silent */});
    }, 5000);
    return () => clearInterval(id);
  }, [phase, sessionId]);

  /* ── Step indicators ── */
  const stepsDone = phase === "approved"
    ? [true, true, true]
    : phase === "waiting_admin"
    ? [true, true, false]
    : [true, false, false];

  const stepLabels = isArabic
    ? ["تم استلام الدفع", "تحقق من البريد", "موافقة المشرف"]
    : ["Payment received", "Email verified", "Admin approval"];

  const stepIcons = [CheckCircle, Mail, ShieldCheck];

  return (
    <main
      dir={isArabic ? "rtl" : "ltr"}
      className={`grid min-h-screen place-items-center px-4 ${isArabic ? "lang-ar" : "lang-en"}`}
      style={{ background: "#f0f4ff" }}
    >
      {/* Lang toggle */}
      <button type="button" onClick={toggleLang}
        className="absolute end-6 top-6 z-20 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-indigo-200">
        {lang === "en" ? t.common.switchToArabic : t.common.switchToEnglish}
      </button>

      <div className="w-full max-w-lg">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl text-center">

          {/* ── Confirming spinner ── */}
          {phase === "confirming" && (
            <>
              <Loader2 size={44} className="mx-auto mb-5 animate-spin text-indigo-500" />
              <h1 className="text-xl font-black text-slate-900">
                {isArabic ? "جاري تأكيد الدفع..." : "Confirming your payment…"}
              </h1>
              <p className="mt-3 text-sm text-slate-500">
                {isArabic ? "لحظة من فضلك." : "Please wait a moment."}
              </p>
            </>
          )}

          {/* ── Approved ── */}
          {phase === "approved" && (
            <>
              <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full"
                style={{ background: "linear-gradient(135deg,#10b981,#059669)", boxShadow: "0 8px 24px rgba(16,185,129,.35)" }}>
                <CheckCircle size={36} className="text-white" />
              </div>
              <span className="inline-block rounded-full px-3 py-1 text-xs font-black uppercase tracking-widest"
                style={{ background: "rgba(16,185,129,.1)", color: "#059669" }}>
                {isArabic ? "مُفعَّل" : "Activated"}
              </span>
              <h1 className="mt-4 text-2xl font-black text-slate-900">
                {isArabic ? "تم تفعيل حسابك!" : "Your account is active!"}
              </h1>
              <p className="mt-3 text-sm leading-7 text-slate-500 max-w-sm mx-auto">
                {isArabic
                  ? "تم استلام الدفع والتحقق من حسابك تلقائياً. يمكنك تسجيل الدخول الآن."
                  : "Payment received and your account was automatically approved. You can log in now."}
              </p>
              <Link to="/login"
                className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl px-8 text-sm font-bold text-white transition hover:-translate-y-0.5"
                style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", boxShadow: "0 4px 14px rgba(99,102,241,.4)" }}>
                <Sparkles size={15} />
                {isArabic ? "تسجيل الدخول" : "Log in now"}
              </Link>
            </>
          )}

          {/* ── Waiting for admin ── */}
          {phase === "waiting_admin" && (
            <>
              <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full"
                style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", boxShadow: "0 8px 24px rgba(99,102,241,.35)" }}>
                <ShieldCheck size={36} className="text-white" />
              </div>
              <span className="inline-block rounded-full px-3 py-1 text-xs font-black uppercase tracking-widest"
                style={{ background: "rgba(99,102,241,.1)", color: "#6366f1" }}>
                {isArabic ? "قيد المراجعة" : "Pending review"}
              </span>
              <h1 className="mt-4 text-2xl font-black text-slate-900">
                {isArabic ? "في انتظار موافقة المشرف" : "Awaiting admin approval"}
              </h1>
              <p className="mt-3 text-sm leading-7 text-slate-500 max-w-sm mx-auto">
                {isArabic
                  ? "تم استلام الدفع والتحقق من بريدك بنجاح. سيتم مراجعة حسابك من قبل الإدارة قريباً."
                  : "Payment received and email verified. An admin will review and approve your account shortly."}
              </p>
              <Link to="/"
                className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 px-8 text-sm font-bold text-slate-700 transition hover:border-indigo-200">
                {isArabic ? "العودة للرئيسية" : "Back to home"}
              </Link>
            </>
          )}

          {/* ── Waiting for email ── */}
          {phase === "waiting_email" && (
            <>
              <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full"
                style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", boxShadow: "0 8px 24px rgba(99,102,241,.35)" }}>
                <Mail size={36} className="text-white" />
              </div>
              <span className="inline-block rounded-full px-3 py-1 text-xs font-black uppercase tracking-widest"
                style={{ background: "rgba(99,102,241,.1)", color: "#6366f1" }}>
                {isArabic ? "خطوة واحدة متبقية" : "One step remaining"}
              </span>
              <h1 className="mt-4 text-2xl font-black text-slate-900">
                {isArabic ? "تحقق من بريدك الإلكتروني" : "Check your email"}
              </h1>
              <p className="mt-3 text-sm leading-7 text-slate-500 max-w-sm mx-auto">
                {isArabic
                  ? "تم استلام الدفع بنجاح. أرسلنا إليك رسالة تحقق — انقر على الرابط لتفعيل حسابك."
                  : "Payment received! We sent you a verification email — click the link to activate your account."}
              </p>
              <p className="mt-4 text-xs text-slate-400">
                {isArabic ? "لم تجد الرسالة؟ تحقق من مجلد السبام." : "Can't find it? Check your spam folder."}
              </p>
              <Link to="/login"
                className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl px-6 text-sm font-bold text-white transition hover:-translate-y-0.5"
                style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", boxShadow: "0 4px 14px rgba(99,102,241,.4)" }}>
                <Sparkles size={15} />
                {isArabic ? "الانتقال إلى تسجيل الدخول" : "Go to login"}
              </Link>
            </>
          )}

          {/* ── Steps tracker (shown after confirming) ── */}
          {phase !== "confirming" && (
            <div className="mt-8 flex items-center justify-center gap-0 border-t border-slate-100 pt-6">
              {stepLabels.map((label, i) => {
                const Icon   = stepIcons[i];
                const done   = stepsDone[i];
                const active = !done && (i === 0 || stepsDone[i - 1]);
                const isLast = i === stepLabels.length - 1;
                return (
                  <div key={i} className="flex items-center">
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 transition"
                        style={done
                          ? { background: "#10b981", borderColor: "#10b981" }
                          : active
                          ? { background: "rgba(99,102,241,.12)", borderColor: "#6366f1" }
                          : { background: "#f8fafc", borderColor: "#e2e8f0" }}>
                        <Icon size={16} style={done ? { color: "#fff" } : active ? { color: "#6366f1" } : { color: "#94a3b8" }} />
                      </div>
                      <span className="text-[10px] font-bold text-center max-w-[72px] leading-tight"
                        style={done ? { color: "#10b981" } : active ? { color: "#6366f1" } : { color: "#94a3b8" }}>
                        {label}
                      </span>
                    </div>
                    {!isLast && (
                      <div className="mx-2 mb-5 h-0.5 w-10 rounded"
                        style={{ background: done ? "#10b981" : "#e2e8f0" }} />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
