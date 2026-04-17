import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import StudentLayout from "../../components/student/StudentLayout";
import { Button } from "../../components/ui/button";
import { notifyError, notifySuccess } from "../../lib/notify";
import { setAuthSession } from "../../redux/slices/authSlice";
import { updateStudentProfile } from "../../services/studentService";

const safeError = (error) => error?.response?.data?.message || error?.message || "Request failed";

export default function StudentProfilePage() {
  const dispatch = useDispatch();
  const authState = useSelector((state) => state.auth);
  const user = authState.user;

  const [form, setForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    password: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      name: user?.name || "",
      email: user?.email || "",
      password: "",
    });
  }, [user]);

  return (
    <StudentLayout mode="ACADEMY" title="Profile" subtitle="Manage your account information.">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <form
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setSaving(true);

            try {
              const updated = await updateStudentProfile({
                name: form.name,
                email: form.email,
                password: form.password || undefined,
              });

              dispatch(
                setAuthSession({
                  token: authState.token,
                  role: authState.role,
                  user: {
                    ...user,
                    name: updated.name,
                    email: updated.email,
                  },
                }),
              );

              setForm((current) => ({ ...current, password: "" }));
              notifySuccess("Profile updated successfully.");
            } catch (error) {
              notifyError(safeError(error));
            } finally {
              setSaving(false);
            }
          }}
        >
          <label className="block space-y-2 text-sm font-semibold text-slate-700">
            <span>Name</span>
            <input
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 outline-none focus:border-[#2379c3] focus:bg-white"
              required
            />
          </label>

          <label className="block space-y-2 text-sm font-semibold text-slate-700">
            <span>Email</span>
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 outline-none focus:border-[#2379c3] focus:bg-white"
              required
            />
          </label>

          <label className="block space-y-2 text-sm font-semibold text-slate-700">
            <span>Password (optional)</span>
            <input
              type="password"
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 outline-none focus:border-[#2379c3] focus:bg-white"
              placeholder="Leave empty to keep current password"
            />
          </label>

          <div className="pt-2">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </section>
    </StudentLayout>
  );
}
