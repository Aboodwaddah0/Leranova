import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import AdminLayout from "../../components/admin/AdminLayout";
import AdminStatCard from "../../components/admin/AdminStatCard";
import { clearAdminState } from "../../redux/slices/adminSlice";
import { logout } from "../../redux/slices/authSlice";
import { fetchDashboardMetricsThunk, fetchOrganizationsThunk, fetchRevenueThunk, fetchPlansThunk } from "../../redux/thunks/adminThunks";
import { useLanguage } from "../../utils/i18n";
import { notifyError } from "../../lib/notify";

export default function AdminOverviewPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { t, lang } = useLanguage();
  const { metrics, loading, error, organizationFilters } = useSelector((state) => state.admin);

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

  const formatMoney = (value) => {
    const amount = Number(value || 0);
    return new Intl.NumberFormat(lang === "ar" ? "ar" : "en", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <AdminLayout
      title={t.admin.title}
      subtitle={t.admin.subtitle}
      actions={[
        <Link key="orgs" to="/admin/organizations" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">
          {t.admin.tabs.organizations}
        </Link>,
        <button key="logout" type="button" onClick={handleLogout} className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white">
          {t.dashboard.logout}
        </button>,
      ]}
    >
      {loading && <p className="text-sm text-slate-500">{t.common.loading}</p>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <AdminStatCard label={t.admin.metrics.organizations} value={metrics?.totalOrganizations ?? "—"} />
        <AdminStatCard label={t.admin.metrics.pending} value={metrics?.pendingOrganizations ?? "—"} />
        <AdminStatCard label={t.admin.metrics.activeSubscriptions} value={metrics?.activeSubscriptions ?? "—"} />
        <AdminStatCard label={t.admin.metrics.revenue} value={formatMoney(metrics?.totalRevenue)} />
        <AdminStatCard label={t.admin.metrics.plans} value={metrics?.totalPlans ?? "—"} />
        <AdminStatCard label={t.admin.metrics.payments} value={metrics?.totalPayments ?? "—"} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-3xl border border-slate-200 p-5">
          <h2 className="text-lg font-black text-slate-900">{t.admin.organizations.title}</h2>
          <p className="mt-2 text-sm text-slate-500">{t.admin.organizations.openHint}</p>
        </section>

        <section className="rounded-3xl border border-slate-200 p-5">
          <h2 className="text-lg font-black text-slate-900">{t.admin.revenue.title}</h2>
          <p className="mt-2 text-sm text-slate-500">{t.admin.revenue.openHint}</p>
        </section>
      </div>
    </AdminLayout>
  );
}
