import { useState } from "react";
import { ORG_TYPES } from "../../utils/constants";

const initialState = {
  Name: "",
  subdomain: "",
  Email: "",
  password: "",
  Role: ORG_TYPES.ACADEMY,
  Phone: "",
  Founded: "",
  Address: "",
  Description: "",
};

export default function OrgSignupForm({ selectedPlanId, onSubmit, loading, t }) {
  const [formState, setFormState] = useState(initialState);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormState((prev) => ({
      ...prev,
      [name]: name === "subdomain" ? value.toLowerCase() : value,
    }));
  };

  const submit = (event) => {
    event.preventDefault();

    const normalizedPlanId = selectedPlanId ? Number(selectedPlanId) : undefined;

    onSubmit({
      ...formState,
      ...(normalizedPlanId ? { planId: normalizedPlanId } : {}),
      PhoneNumber: formState.Phone,
      Address: formState.Address || null,
      Founded: formState.Founded || null,
      Description: formState.Description || null,
    });
  };

  return (
    <form className="space-y-4" onSubmit={submit}>
      <div className="grid gap-4 md:grid-cols-2">
        <input
          className="h-11 rounded-xl border border-slate-200 px-4"
          name="Name"
          placeholder={t.signup.fields.name}
          value={formState.Name}
          onChange={handleChange}
          required
        />
        <input
          className="h-11 rounded-xl border border-slate-200 px-4"
          name="subdomain"
          placeholder={t.signup.fields.subdomain}
          value={formState.subdomain}
          onChange={handleChange}
          pattern="^[a-z0-9-]+$"
          required
        />
        <input
          className="h-11 rounded-xl border border-slate-200 px-4"
          type="email"
          name="Email"
          placeholder={t.signup.fields.email}
          value={formState.Email}
          onChange={handleChange}
          required
        />
        <input
          className="h-11 rounded-xl border border-slate-200 px-4"
          type="password"
          name="password"
          placeholder={t.signup.fields.password}
          value={formState.password}
          minLength={6}
          onChange={handleChange}
          required
        />
        <select
          className="h-11 rounded-xl border border-slate-200 px-4"
          name="Role"
          value={formState.Role}
          onChange={handleChange}
        >
          <option value={ORG_TYPES.ACADEMY}>{t.signup.fields.roleAcademy}</option>
          <option value={ORG_TYPES.SCHOOL}>{t.signup.fields.roleSchool}</option>
        </select>
        <input
          className="h-11 rounded-xl border border-slate-200 px-4"
          name="Phone"
          placeholder={t.signup.fields.phone}
          value={formState.Phone}
          onChange={handleChange}
        />
        <input
          className="h-11 rounded-xl border border-slate-200 px-4"
          type="date"
          name="Founded"
          aria-label={t.signup.fields.founded}
          value={formState.Founded}
          onChange={handleChange}
        />
        <input
          className="h-11 rounded-xl border border-slate-200 px-4"
          name="Address"
          placeholder={t.signup.fields.address}
          value={formState.Address}
          onChange={handleChange}
        />
      </div>

      <textarea
        className="min-h-24 w-full rounded-xl border border-slate-200 px-4 py-3"
        name="Description"
        placeholder={t.signup.fields.description}
        value={formState.Description}
        onChange={handleChange}
      />

      <button
        type="submit"
        disabled={loading}
        className="h-11 w-full rounded-xl bg-gradient-to-r from-sky-700 to-blue-500 font-semibold text-white disabled:opacity-60"
      >
        {loading ? t.signup.creating : t.signup.createAndPay}
      </button>
    </form>
  );
}
