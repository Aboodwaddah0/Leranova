import { useState } from "react";
import { ORG_TYPES } from "../../utils/constants";
import { useLanguage } from "../../utils/i18n";

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
  classRanges: [{ startGradeLevel: 1, endGradeLevel: 5 }],
};

export default function OrgSignupForm({ selectedPlanId, onSubmit, loading, t }) {
  const { isArabic } = useLanguage();
  const [formState, setFormState] = useState(initialState);
  const [error, setError]         = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormState((prev) => ({ ...prev, [name]: name === "subdomain" ? value.toLowerCase() : value }));
  };

  const handleClassRangeChange = (index, field, value) => {
    setFormState((prev) => {
      const updated = [...prev.classRanges];
      updated[index] = { ...updated[index], [field]: Number(value) };
      return { ...prev, classRanges: updated };
    });
  };

  const addClassRange = () =>
    setFormState((prev) => ({ ...prev, classRanges: [...prev.classRanges, { startGradeLevel: 1, endGradeLevel: 5 }] }));

  const removeClassRange = (index) =>
    setFormState((prev) => ({ ...prev, classRanges: prev.classRanges.filter((_, i) => i !== index) }));

  const submit = (e) => {
    e.preventDefault();
    try {
      const normalizedPlanId = selectedPlanId ? Number(selectedPlanId) : undefined;
      const classRanges = formState.Role === ORG_TYPES.SCHOOL ? formState.classRanges : [];
      if (formState.Role === ORG_TYPES.SCHOOL && classRanges.length === 0) {
        throw new Error(t.signup.classRanges.errorEmpty);
      }
      setError("");
      onSubmit({
        Name:        formState.Name,
        subdomain:   formState.subdomain,
        Email:       formState.Email,
        password:    formState.password,
        Role:        formState.Role,
        Phone:       formState.Phone,
        Address:     formState.Address || null,
        Founded:     formState.Founded || null,
        Description: formState.Description || null,
        PhoneNumber: formState.Phone,
        ...(normalizedPlanId ? { planId: normalizedPlanId } : {}),
        ...(formState.Role === ORG_TYPES.SCHOOL ? { classRanges } : {}),
      });
    } catch (err) {
      setError(err.message || t.signup.classRanges.errorInvalid);
    }
  };

  /* Shared classes for this form's inputs */
  const inp = "auth-input";
  const sel = "auth-select";

  return (
    <form className="space-y-5" onSubmit={submit}>
      {/* Grid fields */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="auth-label">{t.signup.fields.name}</label>
          <input className={inp} name="Name" placeholder={t.signup.fields.name} value={formState.Name} onChange={handleChange} required />
        </div>
        <div>
          <label className="auth-label">{t.signup.fields.subdomain}</label>
          <input className={inp} name="subdomain" placeholder={t.signup.fields.subdomain} value={formState.subdomain} onChange={handleChange} pattern="[-a-z0-9]+" required />
        </div>
        <div>
          <label className="auth-label">{t.signup.fields.email}</label>
          <input className={inp} type="email" name="Email" placeholder={t.signup.fields.email} value={formState.Email} onChange={handleChange} required />
        </div>
        <div>
          <label className="auth-label">{t.signup.fields.password}</label>
          <input className={inp} type="password" name="password" placeholder={t.signup.fields.password} value={formState.password} minLength={6} onChange={handleChange} required />
        </div>
        <div>
          <label className="auth-label">{t.signup.fields.roleAcademy} / {t.signup.fields.roleSchool}</label>
          <div style={{ position: "relative" }}>
            <select className={sel} name="Role" value={formState.Role} onChange={handleChange}>
              <option value={ORG_TYPES.ACADEMY}>{t.signup.fields.roleAcademy}</option>
              <option value={ORG_TYPES.SCHOOL}>{t.signup.fields.roleSchool}</option>
            </select>
            <svg style={{ position:"absolute", top:"50%", insetInlineEnd:14, transform:"translateY(-50%)", pointerEvents:"none", color:"#94a3b8" }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
        </div>
        <div>
          <label className="auth-label">{t.signup.fields.phone}</label>
          <input className={inp} name="Phone" placeholder={t.signup.fields.phone} value={formState.Phone} onChange={handleChange} />
        </div>
        <div>
          <label className="auth-label">{t.signup.fields.founded}</label>
          <input className={inp} type="date" name="Founded" value={formState.Founded} onChange={handleChange} />
        </div>
        <div>
          <label className="auth-label">{t.signup.fields.address}</label>
          <input className={inp} name="Address" placeholder={t.signup.fields.address} value={formState.Address} onChange={handleChange} />
        </div>
      </div>

      {/* School class ranges */}
      {formState.Role === ORG_TYPES.SCHOOL && (
        <div className="rounded-[18px] border border-indigo-100 bg-indigo-50/50 p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-700">
                {t.signup.classRanges.title}
              </p>
              <p className="mt-1 text-xs text-slate-500">{t.signup.classRanges.desc}</p>
            </div>
            <button type="button" onClick={addClassRange}
              className="rounded-xl px-4 py-2 text-xs font-black text-white transition hover:-translate-y-0.5"
              style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", boxShadow: "0 4px 12px rgba(99,102,241,.3)" }}>
              {t.signup.classRanges.add}
            </button>
          </div>
          <div className="space-y-3">
            {formState.classRanges.map((range, index) => (
              <div key={index} className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="auth-label">{t.signup.classRanges.from}</label>
                  <div style={{ position:"relative" }}>
                    <select className={sel} value={range.startGradeLevel} onChange={(e) => handleClassRangeChange(index, "startGradeLevel", e.target.value)}>
                      {[...Array(12)].map((_, i) => <option key={i+1} value={i+1}>{t.signup.classRanges.grade} {i+1}</option>)}
                    </select>
                    <svg style={{ position:"absolute", top:"50%", insetInlineEnd:14, transform:"translateY(-50%)", pointerEvents:"none", color:"#94a3b8" }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                  </div>
                </div>
                <div className="flex-1">
                  <label className="auth-label">{t.signup.classRanges.to}</label>
                  <div style={{ position:"relative" }}>
                    <select className={sel} value={range.endGradeLevel} onChange={(e) => handleClassRangeChange(index, "endGradeLevel", e.target.value)}>
                      {[...Array(12)].map((_, i) => <option key={i+1} value={i+1}>{t.signup.classRanges.grade} {i+1}</option>)}
                    </select>
                    <svg style={{ position:"absolute", top:"50%", insetInlineEnd:14, transform:"translateY(-50%)", pointerEvents:"none", color:"#94a3b8" }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                  </div>
                </div>
                {formState.classRanges.length > 1 && (
                  <button type="button" onClick={() => removeClassRange(index)}
                    className="mb-0.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-600 transition hover:bg-rose-100">
                    {t.signup.classRanges.remove}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Description */}
      <div>
        <label className="auth-label">{t.signup.fields.description}</label>
        <textarea
          className="auth-textarea" name="Description"
          placeholder={t.signup.fields.description}
          value={formState.Description} onChange={handleChange}
        />
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {error}
        </div>
      )}

      <button type="submit" disabled={loading} className="auth-btn-primary">
        {loading ? t.signup.creating : t.signup.createAndPay}
      </button>
    </form>
  );
}
