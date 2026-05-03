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
  classRanges: [
    {
      startGradeLevel: 1,
      endGradeLevel: 5,
    },
  ],
};



export default function OrgSignupForm({ selectedPlanId, onSubmit, loading, t }) {
  const [formState, setFormState] = useState(initialState);
  const [error, setError] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormState((prev) => ({
      ...prev,
      [name]: name === "subdomain" ? value.toLowerCase() : value,
    }));
  };

  const handleClassRangeChange = (index, field, value) => {
    setFormState((prev) => {
      const updatedRanges = [...prev.classRanges];
      updatedRanges[index] = {
        ...updatedRanges[index],
        [field]: Number(value),
      };
      return { ...prev, classRanges: updatedRanges };
    });
  };

  const addClassRange = () => {
    setFormState((prev) => ({
      ...prev,
      classRanges: [
        ...prev.classRanges,
        {
          startGradeLevel: 1,
          endGradeLevel: 5,
        },
      ],
    }));
  };

  const removeClassRange = (index) => {
    setFormState((prev) => ({
      ...prev,
      classRanges: prev.classRanges.filter((_, i) => i !== index),
    }));
  };

  const submit = (event) => {
    event.preventDefault();

    try {
      const normalizedPlanId = selectedPlanId ? Number(selectedPlanId) : undefined;
      const classRanges = formState.Role === ORG_TYPES.SCHOOL ? formState.classRanges : [];

      if (formState.Role === ORG_TYPES.SCHOOL && classRanges.length === 0) {
        throw new Error("Please enter at least one class range for a school account.");
      }

      setError("");

      const payload = {
        Name: formState.Name,
        subdomain: formState.subdomain,
        Email: formState.Email,
        password: formState.password,
        Role: formState.Role,
        Phone: formState.Phone,
        Address: formState.Address || null,
        Founded: formState.Founded || null,
        Description: formState.Description || null,
        ...(normalizedPlanId ? { planId: normalizedPlanId } : {}),
        ...(formState.Role === ORG_TYPES.SCHOOL ? { classRanges } : {}),
        PhoneNumber: formState.Phone,
      };

      console.log("🚀 Sending payload:", payload);
      console.log("📌 Role:", formState.Role);
      console.log("📌 ORG_TYPES.SCHOOL:", ORG_TYPES.SCHOOL);
      console.log("📌 Will send classRanges?", formState.Role === ORG_TYPES.SCHOOL);

      onSubmit(payload);
    } catch (submitError) {
      setError(submitError.message || "Invalid class ranges");
    }
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
          pattern="[a-z0-9-]+"
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

      {formState.Role === ORG_TYPES.SCHOOL && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-4 flex items-center justify-between">
            <label className="block text-sm font-semibold text-slate-700">
              Class ranges / نطاقات الصفوف
            </label>
            <button
              type="button"
              onClick={addClassRange}
              className="rounded-lg bg-slate-900 px-3 py-1 text-xs font-semibold text-white hover:bg-slate-800"
            >
              + Add Range
            </button>
          </div>
          <div className="space-y-3">
            {formState.classRanges.map((range, index) => (
              <div key={index} className="flex items-end gap-2">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    From / من
                  </label>
                  <select
                    className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
                    value={range.startGradeLevel}
                    onChange={(e) => handleClassRangeChange(index, "startGradeLevel", e.target.value)}
                  >
                    {[...Array(12)].map((_, i) => (
                      <option key={i + 1} value={i + 1}>
                        Grade {i + 1}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    To / إلى
                  </label>
                  <select
                    className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
                    value={range.endGradeLevel}
                    onChange={(e) => handleClassRangeChange(index, "endGradeLevel", e.target.value)}
                  >
                    {[...Array(12)].map((_, i) => (
                      <option key={i + 1} value={i + 1}>
                        Grade {i + 1}
                      </option>
                    ))}
                  </select>
                </div>
                {formState.classRanges.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeClassRange(index)}
                    className="mb-1 rounded-lg bg-rose-100 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-200"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Define grade ranges for your school organization.
          </p>
        </div>
      )}

      <textarea
        className="min-h-24 w-full rounded-xl border border-slate-200 px-4 py-3"
        name="Description"
        placeholder={t.signup.fields.description}
        value={formState.Description}
        onChange={handleChange}
      />

      {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}

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
