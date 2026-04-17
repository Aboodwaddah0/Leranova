import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getPlansThunk } from "../../redux/thunks/authThunks";

export default function PlanSelector({ selectedPlanId, onSelect, t }) {
  const dispatch = useDispatch();
  const { plans, loading } = useSelector((state) => state.auth);

  useEffect(() => {
    dispatch(getPlansThunk());
  }, [dispatch]);

  if (loading && plans.length === 0) {
    return <p className="text-sm text-slate-500">{t.signup.loadingPlans}</p>;
  }

  if (!loading && plans.length === 0) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <p className="font-semibold">{t.signup.noPlansTitle}</p>
        <p className="mt-1">{t.signup.noPlansText}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-3">
      {plans.map((plan) => {
        const active = selectedPlanId === plan.id;
        const features = Array.isArray(plan.features)
          ? plan.features
          : Object.values(plan.features || {});

        return (
          <button
            key={plan.id}
            type="button"
            onClick={() => onSelect(plan.id)}
            className={`rounded-2xl border p-4 text-left transition ${
              active
                ? "border-sky-600 bg-sky-50 shadow"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
              {plan.durationDays} {t.signup.days}
            </p>
            <h4 className="mt-1 text-lg font-bold text-slate-900">{plan.name}</h4>
            <p className="mt-1 text-xl font-extrabold text-sky-700">${plan.price}</p>
            <ul className="mt-3 space-y-1 text-sm text-slate-600">
              {features.slice(0, 3).map((item, index) => (
                <li key={`${plan.id}-${index}`}>- {String(item)}</li>
              ))}
            </ul>
          </button>
        );
      })}
    </div>
  );
}
