import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import AdminLayout from "../../components/admin/AdminLayout";
import { setOrganizationFilters, clearAdminState } from "../../redux/slices/adminSlice";
import { logout } from "../../redux/slices/authSlice";
import { fetchDashboardMetricsThunk, fetchOrganizationsThunk } from "../../redux/thunks/adminThunks";
import { updateAdminOrganization } from "../../services/adminService";
import { useLanguage } from "../../utils/i18n";
import { notifyError } from "../../lib/notify";
import Pagination from "../../components/ui/Pagination";

const PAGE_SIZE = 10;

export default function AdminOrganizationsPage() {
  const dispatch = useDispatch();
  const { t, isArabic } = useLanguage();
  const { organizations, organizationFilters, loading, error } = useSelector((state) => state.admin);
  const [rejectModal, setRejectModal] = useState({ open: false, orgId: null, reason: "" });
  const [page, setPage] = useState(1);

  useEffect(() => {
    dispatch(fetchOrganizationsThunk(organizationFilters));
  }, [dispatch, organizationFilters]);

  useEffect(() => {
    if (error) notifyError(error);
  }, [error]);

  useEffect(() => { setPage(1); }, [organizationFilters]);

  const pagedOrgs = useMemo(
    () => organizations.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [organizations, page],
  );

  const handleRefresh = async () => {
    await dispatch(fetchOrganizationsThunk(organizationFilters));
    await dispatch(fetchDashboardMetricsThunk());
  };

  const handleLogout = () => {
    dispatch(clearAdminState());
    dispatch(logout());
  };

  const handleApprove = async (organizationId) => {
    await updateAdminOrganization(organizationId, { status: "APPROVED" });
    await handleRefresh();
  };

  const handleRejectClick = (organizationId) => {
    setRejectModal({ open: true, orgId: organizationId, reason: "" });
  };

  const handleRejectConfirm = async () => {
    await updateAdminOrganization(rejectModal.orgId, {
      status: "REJECTED",
      rejectionReason: rejectModal.reason || null,
    });
    setRejectModal({ open: false, orgId: null, reason: "" });
    await handleRefresh();
  };

  const handleRejectCancel = () => {
    setRejectModal({ open: false, orgId: null, reason: "" });
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
            <option value="EMAIL_VERIFIED">{statusLabel("EMAIL_VERIFIED")}</option>
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
              ) : pagedOrgs.map((organization) => (
                <tr key={organization.id} className="border-t border-slate-100 align-top">
                  <td className="py-3 pr-4 font-semibold text-slate-900">{organization.Name}</td>
                  <td className="py-3 pr-4 text-slate-600">{organization.Email}</td>
                  <td className="py-3 pr-4">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{statusLabel(organization.status)}</span>
                  </td>
                  <td className="py-3 pr-4 text-slate-600">{organization.Role}</td>
                  <td className="py-3 pr-4 text-slate-600">{new Date(organization.createdAt).toLocaleDateString()}</td>
                  <td className="py-3 pr-4">
                    {organization.status === "EMAIL_VERIFIED" ? (
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => handleApprove(organization.id)} className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white">
                          {t.admin.organizations.approve}
                        </button>
                        <button type="button" onClick={() => handleRejectClick(organization.id)} className="rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white">
                          {t.admin.organizations.reject}
                        </button>
                      </div>
                    ) : organization.status === "PENDING" ? (
                      <span className="text-xs text-slate-400">{t.admin.organizations.awaitingEmailVerification}</span>
                    ) : (
                      <span className="text-xs text-slate-400">{t.admin.common.noActions}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3">
          <Pagination page={page} totalPages={Math.ceil(organizations.length / PAGE_SIZE)} totalItems={organizations.length} pageSize={PAGE_SIZE} onPageChange={setPage} isArabic={isArabic} />
        </div>
      </section>

      {rejectModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" dir={isArabic ? "rtl" : "ltr"}>
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-base font-black text-slate-900">{t.admin.organizations.rejectTitle}</h3>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              {t.admin.organizations.rejectReasonLabel}
            </label>
            <textarea
              className="mb-4 h-24 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm resize-none focus:outline-none focus:border-indigo-300"
              placeholder={t.admin.organizations.rejectReasonPlaceholder}
              value={rejectModal.reason}
              onChange={(e) => setRejectModal((prev) => ({ ...prev, reason: e.target.value }))}
            />
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={handleRejectCancel}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-300">
                {t.admin.organizations.rejectCancel}
              </button>
              <button type="button" onClick={handleRejectConfirm}
                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700">
                {t.admin.organizations.rejectConfirm}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
