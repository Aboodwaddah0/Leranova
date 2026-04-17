import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import AdminLayout from "../../components/admin/AdminLayout";
import { clearAdminState } from "../../redux/slices/adminSlice";
import { logout } from "../../redux/slices/authSlice";
import { fetchRevenueThunk } from "../../redux/thunks/adminThunks";
import { useLanguage } from "../../utils/i18n";
import { notifyError } from "../../lib/notify";

export default function AdminRevenuePage() {
  const dispatch = useDispatch();
  const { t, lang } = useLanguage();
  const { revenue, loading, error } = useSelector((state) => state.admin);

  useEffect(() => {
    dispatch(fetchRevenueThunk({ days: 30 }));
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      notifyError(error);
    }
  }, [error]);

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

  return (
    <AdminLayout
      title={t.admin.revenue.title}
      subtitle={t.admin.revenue.subtitle}
      actions={[
        <button key="refresh" type="button" onClick={() => dispatch(fetchRevenueThunk({ days: 30 }))} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">
          {t.admin.common.refresh}
        </button>,
        <button key="logout" type="button" onClick={handleLogout} className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white">
          {t.dashboard.logout}
        </button>,
      ]}
    >
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 p-5">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">{t.admin.revenue.totalRevenue}</p>
          <p className="mt-2 text-3xl font-black text-slate-900">{formatMoney(revenue?.totalRevenue)}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 p-5">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">{t.admin.revenue.totalPayments}</p>
          <p className="mt-2 text-3xl font-black text-slate-900">{revenue?.totalPayments ?? 0}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 p-5">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">{t.admin.common.period}</p>
          <p className="mt-2 text-3xl font-black text-slate-900">{revenue?.days ?? 30} {t.admin.common.days}</p>
        </div>
      </div>

      {loading && <p className="text-sm text-slate-500">{t.common.loading}</p>}

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 p-5">
          <h2 className="text-lg font-black text-slate-900">{t.admin.revenue.byDate}</h2>
          <div className="mt-4 space-y-2 text-sm text-slate-600">
            {revenue?.byDate && Object.keys(revenue.byDate).length > 0 ? Object.entries(revenue.byDate).map(([date, amount]) => (
              <div key={date} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                <span>{date}</span>
                <span className="font-semibold text-slate-900">{formatMoney(amount)}</span>
              </div>
            )) : <p className="text-slate-500">{t.admin.revenue.empty}</p>}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 p-5">
          <h2 className="text-lg font-black text-slate-900">{t.admin.revenue.byPlan}</h2>
          <div className="mt-4 space-y-2 text-sm text-slate-600">
            {revenue?.byPlan && Object.keys(revenue.byPlan).length > 0 ? Object.entries(revenue.byPlan).map(([plan, amount]) => (
              <div key={plan} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                <span>{plan}</span>
                <span className="font-semibold text-slate-900">{formatMoney(amount)}</span>
              </div>
            )) : <p className="text-slate-500">{t.admin.revenue.empty}</p>}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 p-5">
        <h2 className="text-lg font-black text-slate-900">{t.admin.revenue.recentPayments}</h2>
        <div className="mt-4 space-y-3">
          {revenue?.recentPayments?.length ? revenue.recentPayments.map((payment) => (
            <div key={payment.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">{payment.organization?.Name}</p>
                  <p className="text-xs text-slate-500">{payment.subscription?.plan?.name || t.admin.revenue.unknownPlan}</p>
                </div>
                <p className="text-lg font-black text-sky-700">{formatMoney(payment.amount)}</p>
              </div>
              <p className="mt-2 text-xs text-slate-500">{new Date(payment.paymentDate).toLocaleString()} · {payment.paymentMethod}</p>
            </div>
          )) : <p className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">{t.admin.revenue.empty}</p>}
        </div>
      </section>
    </AdminLayout>
  );
}
