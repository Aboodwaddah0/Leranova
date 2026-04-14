import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import AdminLayout from "../../components/admin/AdminLayout";
import { clearAdminState } from "../../redux/slices/adminSlice";
import { logout } from "../../redux/slices/authSlice";
import { fetchPlansThunk } from "../../redux/thunks/adminThunks";
import { useLanguage } from "../../utils/i18n";
import {
  assignFeatureToPlan,
  createAdminFeature,
  fetchAdminFeatures,
  removePlanFeature,
  updatePlanFeature,
} from "../../services/adminService";

export default function AdminPlansPage() {
  const dispatch = useDispatch();
  const { t, lang } = useLanguage();
  const { plans, loading, error } = useSelector((state) => state.admin);
  const [features, setFeatures] = useState([]);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [featureForm, setFeatureForm] = useState({
    featureKey: "",
    name: "",
    description: "",
    hasLimit: false,
    defaultLimit: "",
  });
  const [assignForm, setAssignForm] = useState({
    planId: "",
    featureId: "",
    featureLimit: "",
  });

  useEffect(() => {
    dispatch(fetchPlansThunk());
  }, [dispatch]);

  useEffect(() => {
    const loadFeatures = async () => {
      try {
        const result = await fetchAdminFeatures();
        setFeatures(Array.isArray(result) ? result : []);
      } catch (loadError) {
        setFeedback(loadError.message || t.admin.plans.loadFeaturesFailed);
      }
    };

    loadFeatures();
  }, [t.admin.plans.loadFeaturesFailed]);

  const planOptions = useMemo(
    () => plans.map((plan) => ({ value: String(plan.id), label: `${plan.name} (#${plan.id})` })),
    [plans],
  );

  const featureOptions = useMemo(
    () => features.map((feature) => ({ value: String(feature.id), label: `${feature.featureKey} (#${feature.id})` })),
    [features],
  );

  const formatMoney = (value) => {
    const amount = Number(value || 0);
    return new Intl.NumberFormat(lang === "ar" ? "ar" : "en", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const handleLogout = () => {
    dispatch(clearAdminState());
    dispatch(logout());
  };

  const refreshAll = async () => {
    await Promise.all([dispatch(fetchPlansThunk()), fetchAdminFeatures().then((data) => setFeatures(data || []))]);
  };

  const handleCreateFeature = async (event) => {
    event.preventDefault();
    setBusy(true);
    setFeedback("");

    try {
      const payload = {
        featureKey: featureForm.featureKey.trim(),
        name: featureForm.name.trim(),
        description: featureForm.description.trim() || null,
        hasLimit: featureForm.hasLimit,
        defaultLimit:
          featureForm.defaultLimit === "" ? null : Number(featureForm.defaultLimit),
      };

      await createAdminFeature(payload);
      setFeatureForm({
        featureKey: "",
        name: "",
        description: "",
        hasLimit: false,
        defaultLimit: "",
      });
      await refreshAll();
      setFeedback(t.admin.plans.featureCreatedSuccess);
    } catch (createError) {
      setFeedback(createError.message || t.admin.plans.createFeatureFailed);
    } finally {
      setBusy(false);
    }
  };

  const handleAssignFeature = async (event) => {
    event.preventDefault();
    setBusy(true);
    setFeedback("");

    try {
      if (!assignForm.planId || !assignForm.featureId) {
        throw new Error(t.admin.plans.choosePlanFeatureError);
      }

      const payload = {
        featureId: Number(assignForm.featureId),
        featureLimit: assignForm.featureLimit === "" ? null : Number(assignForm.featureLimit),
      };

      await assignFeatureToPlan(Number(assignForm.planId), payload);
      setAssignForm((prev) => ({ ...prev, featureLimit: "" }));
      await dispatch(fetchPlansThunk());
      setFeedback(t.admin.plans.featureAssignedSuccess);
    } catch (assignError) {
      setFeedback(assignError.message || t.admin.plans.assignFeatureFailed);
    } finally {
      setBusy(false);
    }
  };

  const handleUpdateLimit = async (planId, featureId, nextLimit) => {
    setBusy(true);
    setFeedback("");

    try {
      await updatePlanFeature(planId, featureId, {
        featureLimit: nextLimit === "" ? null : Number(nextLimit),
      });
      await dispatch(fetchPlansThunk());
      setFeedback(t.admin.plans.featureLimitUpdatedSuccess);
    } catch (updateError) {
      setFeedback(updateError.message || t.admin.plans.updateLimitFailed);
    } finally {
      setBusy(false);
    }
  };

  const handleRemoveFeature = async (planId, featureId) => {
    setBusy(true);
    setFeedback("");

    try {
      await removePlanFeature(planId, featureId);
      await dispatch(fetchPlansThunk());
      setFeedback(t.admin.plans.featureRemovedSuccess);
    } catch (removeError) {
      setFeedback(removeError.message || t.admin.plans.removeFeatureFailed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminLayout
      title={t.admin.plans.title}
      subtitle={t.admin.plans.subtitle}
      actions={[
        <button key="refresh" type="button" onClick={refreshAll} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">
          {t.admin.common.refresh}
        </button>,
        <button key="logout" type="button" onClick={handleLogout} className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white">
          {t.dashboard.logout}
        </button>,
      ]}
    >
      {loading && <p className="text-sm text-slate-500">{t.common.loading}</p>}
      {error && <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {feedback && <p className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">{feedback}</p>}

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <form onSubmit={handleCreateFeature} className="space-y-3 rounded-3xl border border-slate-200 p-5">
          <h3 className="text-base font-bold text-slate-900">{t.admin.plans.createFeatureTitle}</h3>
          <input value={featureForm.featureKey} onChange={(e) => setFeatureForm((prev) => ({ ...prev, featureKey: e.target.value }))} placeholder={t.admin.plans.featureKeyPlaceholder} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" required />
          <input value={featureForm.name} onChange={(e) => setFeatureForm((prev) => ({ ...prev, name: e.target.value }))} placeholder={t.admin.plans.featureNamePlaceholder} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" required />
          <input value={featureForm.description} onChange={(e) => setFeatureForm((prev) => ({ ...prev, description: e.target.value }))} placeholder={t.admin.plans.featureDescriptionPlaceholder} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={featureForm.hasLimit} onChange={(e) => setFeatureForm((prev) => ({ ...prev, hasLimit: e.target.checked }))} />
            {t.admin.plans.hasLimit}
          </label>
          <input type="number" min="1" value={featureForm.defaultLimit} onChange={(e) => setFeatureForm((prev) => ({ ...prev, defaultLimit: e.target.value }))} placeholder={t.admin.plans.defaultLimitPlaceholder} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          <button type="submit" disabled={busy} className="rounded-xl bg-sky-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{t.admin.plans.createFeatureButton}</button>
        </form>

        <form onSubmit={handleAssignFeature} className="space-y-3 rounded-3xl border border-slate-200 p-5">
          <h3 className="text-base font-bold text-slate-900">{t.admin.plans.assignFeatureTitle}</h3>
          <select value={assignForm.planId} onChange={(e) => setAssignForm((prev) => ({ ...prev, planId: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" required>
            <option value="">{t.admin.plans.selectPlan}</option>
            {planOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <select value={assignForm.featureId} onChange={(e) => setAssignForm((prev) => ({ ...prev, featureId: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" required>
            <option value="">{t.admin.plans.selectFeature}</option>
            {featureOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <input type="number" min="1" value={assignForm.featureLimit} onChange={(e) => setAssignForm((prev) => ({ ...prev, featureLimit: e.target.value }))} placeholder={t.admin.plans.featureLimitPlaceholder} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          <button type="submit" disabled={busy} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{t.admin.plans.assignFeatureButton}</button>
        </form>
      </div>

      {plans.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">{t.admin.plans.empty}</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {plans.map((plan) => (
            <div key={plan.id} className="rounded-3xl border border-slate-200 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">{plan.durationDays} {t.admin.common.days}</p>
              <h3 className="mt-2 text-2xl font-black text-slate-900">{plan.name}</h3>
              <p className="mt-2 text-3xl font-black text-sky-700">{formatMoney(plan.price)}</p>
              <p className="mt-2 text-sm text-slate-600">{plan.description || t.admin.common.noDescription}</p>
              {Array.isArray(plan.features) && plan.features.length > 0 && (
                <ul className="mt-4 space-y-1 text-sm text-slate-600">
                  {plan.features.slice(0, 5).map((item, index) => (
                    <li key={`${plan.id}-${index}`}>- {String(item)}</li>
                  ))}
                </ul>
              )}

              {Array.isArray(plan.planFeatures) && plan.planFeatures.length > 0 && (
                <div className="mt-4 space-y-2 rounded-2xl border border-slate-200 p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">{t.admin.plans.assignedFeatureLimits}</p>
                  {plan.planFeatures.map((planFeature) => (
                    <div key={`${plan.id}-${planFeature.featureId}`} className="rounded-xl border border-slate-100 p-2">
                      <div className="flex items-center justify-between gap-2 text-xs text-slate-700">
                        <span className="font-semibold">{planFeature.feature?.featureKey || `Feature #${planFeature.featureId}`}</span>
                        <button type="button" onClick={() => handleRemoveFeature(plan.id, planFeature.featureId)} className="text-red-600">{t.admin.plans.remove}</button>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          defaultValue={planFeature.featureLimit ?? ""}
                          placeholder={t.admin.plans.noLimitPlaceholder}
                          className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs"
                          onBlur={(e) => handleUpdateLimit(plan.id, planFeature.featureId, e.target.value)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
