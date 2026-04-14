import { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import AdminLayout from "../../components/admin/AdminLayout";
import { setOrganizationFilters, clearAdminState } from "../../redux/slices/adminSlice";
import { logout } from "../../redux/slices/authSlice";
import { fetchDashboardMetricsThunk, fetchOrganizationsThunk } from "../../redux/thunks/adminThunks";
import { updateAdminOrganization } from "../../services/adminService";
import { useLanguage } from "../../utils/i18n";

export default function AdminOrganizationsPage() {
  const dispatch = useDispatch();
  const { t } = useLanguage();
  const { organizations, organizationFilters, loading, error } = useSelector((state) => state.admin);

  useEffect(() => {
    dispatch(fetchOrganizationsThunk(organizationFilters));
  }, [dispatch, organizationFilters]);

  const handleRefresh = async () => {
    await dispatch(fetchOrganizationsThunk(organizationFilters));
    await dispatch(fetchDashboardMetricsThunk());
  };

  const handleLogout = () => {
    dispatch(clearAdminState());
    dispatch(logout());
  };

  const handleStatusChange = async (organizationId, status) => {
    await updateAdminOrganization(organizationId, { status });
    await handleRefresh();
  };

  const filters = useMemo(() => organizationFilters, [organizationFilters]);

  const statusLabel = (status) => t.admin.organizations.statusValues?.[status] || status;

  return (
    <AdminLayout
      title={t.admin.organizations.title}
      subtitle={t.admin.organizations.subtitle}
      actions={[
        <button key="refresh" type="button" onClick={handleRefresh} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">
          {t.admin.common.refresh}
        </button>,
        <button key="logout" type="button" onClick={handleLogout} className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white">
          {t.dashboard.logout}
        </button>,
      ]}
    >
      <div className="grid gap-4 md:grid-cols-3">
        <label className="space-y-2 text-sm font-semibold text-slate-700">
          <span>{t.admin.organizations.status}</span>
          <select
            value={filters.status}
            onChange={(event) => dispatch(setOrganizationFilters({ status: event.target.value, skip: 0 }))}
            className="h-11 w-full rounded-2xl border border-slate-200 px-4"
          >
            <option value="">{t.admin.organizations.all}</option>
            <option value="PENDING">{statusLabel("PENDING")}</option>
            <option value="APPROVED">{statusLabel("APPROVED")}</option>
            <option value="REJECTED">{statusLabel("REJECTED")}</option>
          </select>
        </label>

        <label className="space-y-2 text-sm font-semibold text-slate-700 md:col-span-2">
          <span>{t.admin.organizations.search}</span>
          <input
            value={filters.search}
            onChange={(event) => dispatch(setOrganizationFilters({ search: event.target.value, skip: 0 }))}
            className="h-11 w-full rounded-2xl border border-slate-200 px-4"
            placeholder={t.admin.organizations.searchPlaceholder}
          />
        </label>
      </div>

      {loading && <p className="text-sm text-slate-500">{t.common.loading}</p>}
      {error && <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <section className="rounded-3xl border border-slate-200 p-5">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-3 pr-4">{t.admin.organizations.name}</th>
                <th className="py-3 pr-4">{t.admin.organizations.email}</th>
                <th className="py-3 pr-4">{t.admin.organizations.status}</th>
                <th className="py-3 pr-4">{t.admin.organizations.role}</th>
                <th className="py-3 pr-4">{t.admin.organizations.createdAt}</th>
                <th className="py-3 pr-4">{t.admin.organizations.actions}</th>
              </tr>
            </thead>
            <tbody>
              {organizations.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-6 text-center text-slate-500">
                    {t.admin.organizations.empty}
                  </td>
                </tr>
              ) : organizations.map((organization) => (
                <tr key={organization.id} className="border-t border-slate-100 align-top">
                  <td className="py-3 pr-4 font-semibold text-slate-900">{organization.Name}</td>
                  <td className="py-3 pr-4 text-slate-600">{organization.Email}</td>
                  <td className="py-3 pr-4">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{statusLabel(organization.status)}</span>
                  </td>
                  <td className="py-3 pr-4 text-slate-600">{organization.Role}</td>
                  <td className="py-3 pr-4 text-slate-600">{new Date(organization.createdAt).toLocaleDateString()}</td>
                  <td className="py-3 pr-4">
                    {organization.status === "PENDING" ? (
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => handleStatusChange(organization.id, "APPROVED")} className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white">
                          {t.admin.organizations.approve}
                        </button>
                        <button type="button" onClick={() => handleStatusChange(organization.id, "REJECTED")} className="rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white">
                          {t.admin.organizations.reject}
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">{t.admin.common.noActions}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AdminLayout>
  );
}
