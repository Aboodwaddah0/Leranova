import { useEffect, useState } from "react";
import { useLanguage } from "../../utils/i18n";

export default function SubjectForm({ courses = [], initialValues = {}, onSubmit, saving = false }) {
  const { isArabic } = useLanguage();
  const [form, setForm] = useState({ courseId: "", name: "", Description: "" });

  useEffect(() => {
    setForm((current) => ({
      courseId: initialValues.courseId ?? current.courseId ?? String(courses[0]?.id || ""),
      name: initialValues.name ?? "",
      Description: initialValues.Description ?? "",
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialValues, courses]);

  const handleSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (typeof onSubmit === "function") {
      onSubmit({ ...form });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mb-6 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-lg font-black text-slate-900">{isArabic ? "إضافة مادة" : "Add subject"}</h3>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <select
          value={form.courseId}
          onChange={(event) => setForm((current) => ({ ...current, courseId: event.target.value }))}
          className="h-11 rounded-xl border border-slate-200 px-3 text-sm"
          required
        >
          <option value="">{isArabic ? "اختر الكورس" : "Select course"}</option>
          {courses.map((course) => (
            <option key={course.id} value={course.id}>{course.Name}</option>
          ))}
        </select>
        <input
          value={form.name}
          onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          className="h-11 rounded-xl border border-slate-200 px-3 text-sm"
          placeholder={isArabic ? "اسم المادة" : "Subject name"}
          required
        />
        <div className="flex gap-2">
          <input
            value={form.Description}
            onChange={(event) => setForm((current) => ({ ...current, Description: event.target.value }))}
            className="h-11 flex-1 rounded-xl border border-slate-200 px-3 text-sm"
            placeholder={isArabic ? "الوصف" : "Description"}
          />
          <button type="submit" disabled={saving} className="rounded-xl bg-slate-950 px-4 text-sm font-bold text-white disabled:opacity-50">
            {isArabic ? "إضافة" : "Add"}
          </button>
        </div>
      </div>
    </form>
  );
}
