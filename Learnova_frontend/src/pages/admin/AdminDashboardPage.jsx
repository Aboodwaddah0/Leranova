import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import AdminSidebar from "../../components/admin/AdminSidebar";
import AdminStatCard from "../../components/admin/AdminStatCard";
import { clearAdminState } from "../../redux/slices/adminSlice";
import { logout } from "../../redux/slices/authSlice";
import { updateAdminOrganization } from "../../services/adminService";
import {
  fetchDashboardMetricsThunk,
  fetchOrganizationsThunk,
  fetchRevenueThunk,
  fetchPlansThunk,
} from "../../redux/thunks/adminThunks";
import { useLanguage } from "../../utils/i18n";
import QuantumMeshBackground from "../../components/ui/QuantumMeshBackground";
import { notifyError } from "../../lib/notify";

export default function AdminDashboardPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { lang, isArabic, t, toggleLang } = useLanguage();
  const { metrics, organizations, revenue, plans, loading, error, organizationFilters } = useSelector((state) => state.admin);
  const role = useSelector((state) => state.auth.role);
  const user = useSelector((state) => state.auth.user);

  useEffect(() => {
    dispatch(fetchDashboardMetricsThunk());
    dispatch(fetchOrganizationsThunk(organizationFilters));
    dispatch(fetchRevenueThunk({ days: 30 }));
    dispatch(fetchPlansThunk());
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      notifyError(error);
    }
  }, [error]);

  const handleLogout = () => {
    dispatch(clearAdminState());
    dispatch(logout());
    navigate("/login");
  };

  const refreshOrganizations = async () => {
    await dispatch(fetchOrganizationsThunk(organizationFilters));
    await dispatch(fetchDashboardMetricsThunk());
  };

  const handleOrganizationStatus = async (organizationId, status) => {
    await updateAdminOrganization(organizationId, { status });
    await refreshOrganizations();
  };

  const formatMoney = (value) => {
    const amount = Number(value || 0);
    return new Intl.NumberFormat(lang === "ar" ? "ar" : "en", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const statusLabel = (status) => t.admin.organizations.statusValues?.[status] || status;

  return (
    <main className={`admin-management-theme relative min-h-screen overflow-hidden bg-[#eff6fd] px-4 py-6 ${isArabic ? "lang-ar" : "lang-en"}`}>
      <QuantumMeshBackground />

      <button
        type="button"
        onClick={toggleLang}
        className="absolute right-6 top-6 z-20 rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-[#1f69ab]"
      >
        {lang === "en" ? t.common.switchToArabic : t.common.switchToEnglish}
      </button>

      <div className="relative z-10 mx-auto grid min-h-[92vh] w-full max-w-7xl gap-6 lg:grid-cols-[260px_1fr]">
        <AdminSidebar />

        <section className="space-y-6 rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_56px_-26px_rgba(16,20,26,0.35)] md:p-8">
          <div className="flex flex-col gap-4 border-b border-slate-100 pb-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-sky-700">{t.admin.badge}</p>
              <h1 className="mt-2 text-3xl font-black text-slate-900">{t.admin.title}</h1>
              <p className="mt-2 max-w-2xl text-slate-600">{t.admin.subtitle}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to="/admin/organizations" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">
                {t.admin.tabs.organizations}
              </Link>
              <button type="button" onClick={handleLogout} className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white">
                {t.dashboard.logout}
              </button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <AdminStatCard label={t.admin.metrics.organizations} value={metrics?.totalOrganizations ?? "—"} />
            <AdminStatCard label={t.admin.metrics.pending} value={metrics?.pendingOrganizations ?? "—"} />
            <AdminStatCard label={t.admin.metrics.activeSubscriptions} value={metrics?.activeSubscriptions ?? "—"} />
            <AdminStatCard label={t.admin.metrics.revenue} value={formatMoney(metrics?.totalRevenue)} />
            <AdminStatCard label={t.admin.metrics.plans} value={metrics?.totalPlans ?? "—"} />
            <AdminStatCard label={t.admin.metrics.payments} value={metrics?.totalPayments ?? "—"} />
          </div>

          {loading && <p className="text-sm text-slate-500">{t.common.loading}</p>}

          <div className="grid gap-6 xl:grid-cols-2">
            <section className="rounded-3xl border border-slate-200 p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-black text-slate-900">{t.admin.organizations.title}</h2>
                <button
                  type="button"
                  className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600"
                  onClick={() => dispatch(fetchOrganizationsThunk(organizationFilters))}
                >
                  {t.admin.common.refresh}
                </button>
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-xs uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="py-3 pr-4">{t.admin.organizations.name}</th>
                      <th className="py-3 pr-4">{t.admin.organizations.email}</th>
                      <th className="py-3 pr-4">{t.admin.organizations.status}</th>
                      <th className="py-3 pr-4">{t.admin.organizations.role}</th>
                      <th className="py-3 pr-4">{t.admin.organizations.createdAt}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {organizations.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="py-6 text-center text-slate-500">
                          {t.admin.organizations.empty}
                        </td>
                      </tr>
                    ) : organizations.map((organization) => (
                      <tr key={organization.id} className="border-t border-slate-100 align-top">
                        <td className="py-3 pr-4 font-semibold text-slate-900">{organization.Name}</td>
                        <td className="py-3 pr-4 text-slate-600">{organization.Email}</td>
                        <td className="py-3 pr-4">
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                            {statusLabel(organization.status)}
                          </span>
                          {organization.status === "PENDING" && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => handleOrganizationStatus(organization.id, "APPROVED")}
                                className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white"
                              >
                                {t.admin.organizations.approve}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOrganizationStatus(organization.id, "REJECTED")}
                                className="rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white"
                              >
                                {t.admin.organizations.reject}
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="py-3 pr-4 text-slate-600">{organization.Role}</td>
                        <td className="py-3 pr-4 text-slate-600">{new Date(organization.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 p-5">
              <h2 className="text-lg font-black text-slate-900">{t.admin.revenue.title}</h2>
              <div className="mt-4 space-y-3">
                {revenue?.recentPayments?.length ? (
                  revenue.recentPayments.map((payment) => (
                    <div key={payment.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-900">{payment.organization?.Name}</p>
                          <p className="text-xs text-slate-500">{payment.subscription?.plan?.name || t.admin.revenue.unknownPlan}</p>
                        </div>
                        <p className="text-lg font-black text-sky-700">{formatMoney(payment.amount)}</p>
                      </div>
                      <p className="mt-2 text-xs text-slate-500">
                        {new Date(payment.paymentDate).toLocaleString()} · {payment.paymentMethod}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                    {t.admin.revenue.empty}
                  </p>
                )}
              </div>
            </section>
          </div>

          <section className="rounded-3xl border border-slate-200 p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-black text-slate-900">{t.admin.plans.title}</h2>
              <span className="text-sm text-slate-500">{plans.length} {t.admin.plans.countSuffix}</span>
            </div>
            {plans.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">{t.admin.plans.empty}</p>
            ) : (
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                {plans.map((plan) => (
                  <div key={plan.id} className="rounded-3xl border border-slate-200 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">{plan.durationDays} {t.admin.common.days}</p>
                    <h3 className="mt-2 text-xl font-black text-slate-900">{plan.name}</h3>
                    <p className="mt-2 text-2xl font-black text-sky-700">{formatMoney(plan.price)}</p>
                    {Array.isArray(plan.features) && plan.features.length > 0 && (
                      <ul className="mt-3 space-y-1 text-sm text-slate-600">
                        {plan.features.slice(0, 3).map((item, index) => (
                          <li key={`${plan.id}-${index}`}>- {String(item)}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
            <p><span className="font-semibold text-slate-900">{t.dashboard.rolePrefix}</span> {role}</p>
            <p className="mt-1"><span className="font-semibold text-slate-900">{t.login.email}:</span> {user?.email || user?.Email || t.admin.common.unknown}</p>
          </div>
        </section>
      </div>
    </main>
  );
}
