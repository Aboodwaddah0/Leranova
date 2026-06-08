import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { CheckCircle2, Lock, School } from "lucide-react";
import { getPlansThunk } from "../../redux/thunks/authThunks";
import { useLanguage } from "../../utils/i18n";
import api from "../../utils/api";
import { useState } from "react";

/* ── Feature humaniser (same logic as landing page) ─────── */
const KNOWN_ACRONYMS = new Set(["AI", "RAG", "XP", "LMS", "API", "PDF"]);
const humanize = (str) => {
  if (!str) return "";
  if (str.includes(" ") || (str !== str.toUpperCase() && !str.includes("_"))) return str;
  return str.split("_")
    .map((w) => KNOWN_ACRONYMS.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
};

const SCHOOL_FEATS  = new Set(["ATTENDANCE_TRACKING","PARENT_PORTAL","SCHOOL_CALENDAR","GRADE_REPORTS","PARENT_NOTIFICATIONS","CLASS_MANAGEMENT","ACADEMIC_YEARS","TIMETABLE"]);
const PRO_NEW_FEATS = new Set(["AI_CHAT","NOTIFICATIONS","ADVANCED_ANALYTICS"]);

const PRO_FEAT_DESC = {
  AI_CHAT:            { en: "RAG-powered tutor grounded in your lessons",          ar: "مساعد ذكي مرتبط بمحتوى دروسك" },
  NOTIFICATIONS:      { en: "Real-time push alerts for students & teachers",       ar: "إشعارات فورية للطلاب والمعلمين" },
  ADVANCED_ANALYTICS: { en: "Live performance dashboards for instructors",         ar: "لوحات أداء لحظية للمعلمين" },
};

/* ── Plan card ──────────────────────────────────────────── */
function PlanCard({ plan, active, disabled, onSelect, isArabic, t }) {
  const rawKeys    = Array.isArray(plan.features) ? plan.features : Object.values(plan.features || {});
  const schoolKeys = rawKeys.filter(k => SCHOOL_FEATS.has(String(k).toUpperCase()));
  const proNewKeys = rawKeys.filter(k => PRO_NEW_FEATS.has(String(k).toUpperCase()));
  const coreKeys   = rawKeys.filter(k => !SCHOOL_FEATS.has(String(k).toUpperCase()) && !PRO_NEW_FEATS.has(String(k).toUpperCase()));

  const isSchool = String(plan.name || "").toLowerCase().includes("school");
  const isPro    = String(plan.name || "").toLowerCase().includes("pro");
  const price    = Number(plan.price ?? 0);

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => !disabled && onSelect(plan.id)}
      className="w-full rounded-2xl border p-5 text-start transition-all duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
      style={active ? {
        borderColor: "#6366f1",
        background:  "linear-gradient(180deg,#f5f3ff 0%,#ede9fe 100%)",
        boxShadow:   "0 8px 24px rgba(99,102,241,.22)",
      } : {
        borderColor: "#e2e8f0",
        background:  "#ffffff",
        boxShadow:   "0 2px 8px rgba(15,23,42,.05)",
      }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            {plan.durationDays} {t.signup.days}
          </p>
          <h4 className="mt-1 text-lg font-black text-slate-900">{plan.name}</h4>
        </div>
        {active   && <CheckCircle2 size={18} className="mt-1 shrink-0 text-indigo-600" />}
        {disabled && <Lock size={16} className="mt-1 shrink-0 text-amber-500" />}
      </div>

      {/* Price */}
      <p className="mt-3 text-3xl font-black tracking-tight" style={{ color: active ? "#6366f1" : "#1e293b" }}>
        {price === 0 ? (isArabic ? "مجاني" : "Free") : `$${price}`}
        {price > 0 && <span className="ms-1 text-sm font-semibold text-slate-400">{isArabic ? "/شهر" : "/mo"}</span>}
      </p>

      {/* Trial note */}
      <p className="mt-1 text-[11px] font-semibold text-emerald-600">
        {isArabic ? "✓ تجربة مجانية 30 يوم" : "✓ 30-day free trial"}
      </p>

      {/* Description */}
      {plan.description && (
        <p className="mt-3 text-xs leading-5 text-slate-500 line-clamp-2">
          {plan.description.split('\n')[0]}
        </p>
      )}

      {disabled && (
        <p className="mt-2 text-xs font-semibold text-amber-600">Requires Stripe configuration</p>
      )}

      {/* Features list */}
      {rawKeys.length > 0 && (
        <ul className="mt-4 space-y-1.5 border-t border-slate-100 pt-4">
          {/* Core features */}
          {coreKeys.slice(0, 5).map((key) => (
            <li key={key} className="flex items-center gap-2 text-xs text-slate-600">
              <CheckCircle2 size={12} className="shrink-0" style={{ color: active ? "#6366f1" : "#94a3b8" }} />
              <span>{humanize(key)}</span>
            </li>
          ))}

          {/* Pro new features */}
          {isPro && proNewKeys.length > 0 && (
            <>
              <li className="pt-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  {isArabic ? "ما الجديد في Pro" : "New in Pro"}
                </span>
              </li>
              {proNewKeys.map((key) => {
                const desc = PRO_FEAT_DESC[String(key).toUpperCase()];
                return (
                  <li key={key} className="flex items-start gap-2 text-xs">
                    <div className="mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full"
                      style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
                      <CheckCircle2 size={8} className="text-white" />
                    </div>
                    <div>
                      <span className="font-bold text-slate-800">{humanize(key)}</span>
                      {desc && (
                        <p className="text-[10px] text-slate-400">
                          {isArabic ? desc.ar : desc.en}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </>
          )}

          {/* School-only features */}
          {isSchool && schoolKeys.length > 0 && (
            <>
              <li className="pt-1">
                <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-indigo-600">
                  <School size={8} /> {isArabic ? "حصري للمدارس" : "School only"}
                </span>
              </li>
              {schoolKeys.slice(0, 4).map((key) => (
                <li key={key} className="flex items-center gap-2 text-xs">
                  <CheckCircle2 size={12} className="shrink-0 text-violet-500" />
                  <span className="font-medium text-violet-700">{humanize(key)}</span>
                </li>
              ))}
            </>
          )}
        </ul>
      )}
    </button>
  );
}

/* ── Main component ─────────────────────────────────────── */
export default function PlanSelector({ selectedPlanId, onSelect, t }) {
  const dispatch = useDispatch();
  const { isArabic } = useLanguage();
  const { plans, loading } = useSelector((s) => s.auth);
  const [stripeEnabled, setStripeEnabled] = useState(true);

  useEffect(() => {
    dispatch(getPlansThunk());
    api.get("/auth/stripe-status")
      .then(({ data }) => setStripeEnabled(data?.data?.stripeEnabled ?? false))
      .catch(() => setStripeEnabled(false));
  }, [dispatch]);

  if (loading && plans.length === 0) {
    return <p className="text-sm text-slate-400">{t.signup.loadingPlans}</p>;
  }

  if (!loading && plans.length === 0) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm">
        <p className="font-bold text-amber-900">{t.signup.noPlansTitle}</p>
        <p className="mt-1 text-amber-700">{t.signup.noPlansText}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {!stripeEnabled && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span className="font-bold">Stripe is not configured.</span> Paid plans require{" "}
          <span className="font-semibold">STRIPE_SECRET_KEY</span> in backend .env.
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            active={selectedPlanId === plan.id}
            disabled={Number(plan.price ?? 0) > 0 && !stripeEnabled}
            onSelect={onSelect}
            isArabic={isArabic}
            t={t}
          />
        ))}
      </div>
    </div>
  );
}
