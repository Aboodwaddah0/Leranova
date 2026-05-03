import { useEffect, useState } from "react";
import { useLanguage } from "../../utils/i18n";

export default function LessonForm({ subjects = [], initialValues = {}, onSubmit, saving = false }) {
  const { isArabic } = useLanguage();
  const [form, setForm] = useState({ subjectId: "", title: "", description: "", videoFile: null });

  useEffect(() => {
    setForm((current) => ({
      subjectId: initialValues.subjectId ?? current.subjectId ?? String(subjects[0]?.id || ""),
      title: initialValues.title ?? "",
      description: initialValues.description ?? "",
      videoFile: initialValues.videoFile ?? null,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialValues, subjects]);

  const handleSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (typeof onSubmit === "function") {
      onSubmit({ ...form });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mb-6 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-lg font-black text-slate-900">{isArabic ? "إضافة درس" : "Add lesson"}</h3>
      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <select
          value={form.subjectId}
          onChange={(event) => setForm((current) => ({ ...current, subjectId: event.target.value }))}
          className="h-11 rounded-xl border border-slate-200 px-3 text-sm"
          required
        >
          <option value="">{isArabic ? "اختر المادة" : "Select subject"}</option>
          {subjects.map((subj) => (
            <option key={subj.id} value={subj.id}>{subj.name || subj.Name}</option>
          ))}
        </select>

        <input
          value={form.title}
          onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
          className="h-11 rounded-xl border border-slate-200 px-3 text-sm"
          placeholder={isArabic ? "عنوان الدرس" : "Lesson title"}
          required
        />

        <input
          value={form.description}
          onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
          className="h-11 rounded-xl border border-slate-200 px-3 text-sm"
          placeholder={isArabic ? "الوصف" : "Description"}
        />

        <div className="flex items-center gap-2">
          <input
            type="file"
            accept="video/*"
            onChange={(e) => setForm((current) => ({ ...current, videoFile: e.target.files?.[0] ?? null }))}
            className="h-11 rounded-xl border border-slate-200 px-3 text-sm"
          />
          <button type="submit" disabled={saving} className="rounded-xl bg-slate-950 px-4 text-sm font-bold text-white disabled:opacity-50">
            {isArabic ? "إضافة" : "Add"}
          </button>
        </div>
      </div>
    </form>
  );
}
