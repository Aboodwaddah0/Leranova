import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { CheckCircle2, Lock } from "lucide-react";
import { getPlansThunk } from "../../redux/thunks/authThunks";
import { useLanguage } from "../../utils/i18n";
import api from "../../utils/api";

const FEATURE_LABELS_AR = {
  GROUP_CHAT:    "محادثة جماعية",
  AI_CHAT:       "مساعد ذكي",
  NOTIFICATIONS: "إشعارات",
};

const formatFeatureLabel = (item, isArabic) => {
  const key = String(item || "").toUpperCase();
  if (isArabic && FEATURE_LABELS_AR[key]) return FEATURE_LABELS_AR[key];
  return String(item).toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

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
          <span className="font-bold">Stripe is not configured.</span> Paid plans are disabled. Select a free plan or{" "}
          <span className="font-semibold">add STRIPE_SECRET_KEY to backend .env</span> to enable payments.
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => {
          const active    = selectedPlanId === plan.id;
          const features  = Array.isArray(plan.features) ? plan.features : Object.values(plan.features || {});
          const price     = Number(plan.price ?? 0);
          const isPaid    = price > 0;
          const disabled  = isPaid && !stripeEnabled;

          return (
            <button
              key={plan.id}
              type="button"
              disabled={disabled}
              onClick={() => !disabled && onSelect(plan.id)}
              className="rounded-[20px] border p-5 text-start transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
              style={active ? {
                borderColor: "#6366f1",
                background: "linear-gradient(180deg,#f5f3ff 0%,#ede9fe 100%)",
                boxShadow: "0 8px 24px rgba(99,102,241,.2)",
              } : {
                borderColor: "#e2e8f0",
                background: "#ffffff",
                boxShadow: "0 2px 8px rgba(15,23,42,.05)",
              }}
            >
              {/* Plan header */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                    {plan.durationDays} {t.signup.days}
                  </p>
                  <h4 className="mt-1 text-lg font-black text-slate-900">{plan.name}</h4>
                </div>
                {active && <CheckCircle2 size={18} style={{ color: "#6366f1", flexShrink: 0, marginTop: 2 }} />}
                {disabled && <Lock size={16} style={{ color: "#f59e0b", flexShrink: 0, marginTop: 2 }} />}
              </div>

              {/* Price */}
              <p className="mt-3 text-3xl font-black tracking-tight" style={{ color: active ? "#6366f1" : "#1e293b" }}>
                {price === 0 ? (isArabic ? "مجاني" : "Free") : `$${price}`}
                {price > 0 && <span className="text-sm font-semibold text-slate-400 ms-1">{isArabic ? "/شهر" : "/mo"}</span>}
              </p>

              {/* Stripe required note */}
              {disabled && (
                <p className="mt-2 text-xs font-semibold text-amber-600">Requires Stripe configuration</p>
              )}

              {/* Features */}
              {features.length > 0 && (
                <ul className="mt-4 space-y-2 border-t border-slate-100 pt-4">
                  {features.slice(0, 3).map((item, i) => (
                    <li key={`${plan.id}-${i}`} className="flex items-center gap-2 text-xs text-slate-600">
                      <span className="font-bold" style={{ color: active ? "#6366f1" : "#94a3b8" }}>✓</span>
                      {formatFeatureLabel(item, isArabic)}
                    </li>
                  ))}
                </ul>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
