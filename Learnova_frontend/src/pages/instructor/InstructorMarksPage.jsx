import { useEffect, useState } from "react";
import InstructorLayout from "../../components/instructor/InstructorLayout";
import {
  createInstructorMark,
  deleteInstructorMark,
  fetchInstructorMarks,
  fetchInstructorStudents,
  fetchInstructorSubjects,
  updateInstructorMark,
} from "../../services/instructorService";
import { useLanguage } from "../../utils/i18n";
import { notifyError } from "../../lib/notify";

const safeError = (error) => error?.response?.data?.message || error?.message || "Request failed";

const formatScore = (value) => {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n.toFixed(2).replace(/\.00$/, "") : "0";
};

export default function InstructorMarksPage() {
  const { isArabic } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [marks, setMarks] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [form, setForm] = useState({
    id: null,
    Student_id: "",
    Subject_id: "",
    Numbers: "",
    OutOf: "100",
    ExamPercentage: "100",
    MarkType: "EXAM",
    time: "",
  });

  const loadData = async () => {
    setLoading(true);
    setError("");

    try {
      const [marksData, subjectsData, studentsData] = await Promise.all([
        fetchInstructorMarks(),
        fetchInstructorSubjects(),
        fetchInstructorStudents(),
      ]);

      setMarks(marksData);
      setSubjects(subjectsData);
      setStudents(studentsData);

      setForm((current) => ({
        ...current,
        Subject_id: current.Subject_id || String(subjectsData[0]?.id || ""),
        Student_id: current.Student_id || String(studentsData[0]?.id || ""),
      }));
    } catch (err) {
      setError(safeError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        if (!cancelled) {
          await loadData();
        }
      } catch (err) {
        if (!cancelled) {
          setError(safeError(err));
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (error) {
      notifyError(error);
    }
  }, [error]);

  const refreshMarks = async () => {
    const data = await fetchInstructorMarks();
    setMarks(data);
  };

  const onEdit = (mark) => {
    setForm({
      id: mark.id,
      Student_id: String(mark.Student_id || mark.student?.id || ""),
      Subject_id: String(mark.Subject_id || mark.subject?.id || ""),
      Numbers: String(mark.Numbers ?? ""),
      OutOf: String(mark.OutOf ?? "100"),
      ExamPercentage: String(mark.ExamPercentage ?? "100"),
      MarkType: mark.MarkType || "EXAM",
      time: mark.time ? String(mark.time).slice(0, 10) : "",
    });
  };

  const clearForm = () => {
    setForm({
      id: null,
      Student_id: String(students[0]?.id || ""),
      Subject_id: String(subjects[0]?.id || ""),
      Numbers: "",
      OutOf: "100",
      ExamPercentage: "100",
      MarkType: "EXAM",
      time: "",
    });
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");

    const payload = {
      Student_id: Number(form.Student_id),
      Subject_id: Number(form.Subject_id),
      Numbers: Number(form.Numbers),
      OutOf: Number(form.OutOf),
      ExamPercentage: Number(form.ExamPercentage),
      MarkType: form.MarkType || "EXAM",
      ...(form.time ? { time: form.time } : {}),
    };

    try {
      if (form.id) {
        await updateInstructorMark(form.id, payload);
      } else {
        await createInstructorMark(payload);
      }

      clearForm();
      await refreshMarks();
    } catch (err) {
      setError(safeError(err));
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (mark) => {
    const confirmed = window.confirm(
      isArabic
        ? `هل تريد حذف علامة الطالب ${mark.student?.user?.name || ""}؟`
        : `Delete mark for ${mark.student?.user?.name || "student"}?`,
    );
    if (!confirmed) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      await deleteInstructorMark(mark.id);
      await refreshMarks();
    } catch (err) {
      setError(safeError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <InstructorLayout
      title={isArabic ? "العلامات" : "Marks"}
      subtitle={isArabic ? "استعراض العلامات المسجلة للطلاب" : "View and manage students' marks."}
    >
      {loading && <p className="text-sm font-semibold text-slate-500">{isArabic ? "جاري التحميل..." : "Loading..."}</p>}

      <form onSubmit={onSubmit} className="mb-6 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-lg font-black text-slate-900">{isArabic ? "إضافة أو تعديل علامة" : "Add or edit mark"}</h3>
        <p className="mt-1 text-xs text-slate-500">{isArabic ? "الحقول بعلامة * مطلوبة" : "Fields marked with * are required."}</p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <label className="space-y-1 text-xs font-semibold text-slate-700">
            <span>{isArabic ? "الطالب" : "Student"} *</span>
            <select
              value={form.Student_id}
              onChange={(event) => setForm((current) => ({ ...current, Student_id: event.target.value }))}
              className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
              required
            >
              <option value="">{isArabic ? "اختر الطالب" : "Select student"}</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>{student.user?.name || student.name || `#${student.id}`}</option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-xs font-semibold text-slate-700">
            <span>{isArabic ? "المادة" : "Subject"} *</span>
            <select
              value={form.Subject_id}
              onChange={(event) => setForm((current) => ({ ...current, Subject_id: event.target.value }))}
              className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
              required
            >
              <option value="">{isArabic ? "اختر المادة" : "Select subject"}</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>{subject.name}</option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-xs font-semibold text-slate-700">
            <span>{isArabic ? "نوع التقييم" : "Assessment type"}</span>
            <input
              value={form.MarkType}
              onChange={(event) => setForm((current) => ({ ...current, MarkType: event.target.value }))}
              className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
              placeholder={isArabic ? "مثال: EXAM" : "Example: EXAM"}
            />
          </label>

          <label className="space-y-1 text-xs font-semibold text-slate-700">
            <span>{isArabic ? "العلامة" : "Score"} *</span>
            <input
              value={form.Numbers}
              onChange={(event) => setForm((current) => ({ ...current, Numbers: event.target.value }))}
              type="number"
              step="0.01"
              className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
              placeholder={isArabic ? "مثال: 85" : "Example: 85"}
              required
            />
          </label>

          <label className="space-y-1 text-xs font-semibold text-slate-700">
            <span>{isArabic ? "من" : "Out of"} *</span>
            <input
              value={form.OutOf}
              onChange={(event) => setForm((current) => ({ ...current, OutOf: event.target.value }))}
              type="number"
              step="0.01"
              className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
              placeholder={isArabic ? "مثال: 100" : "Example: 100"}
              required
            />
          </label>

          <label className="space-y-1 text-xs font-semibold text-slate-700">
            <span>{isArabic ? "نسبة الاختبار" : "Exam percentage"}</span>
            <input
              value={form.ExamPercentage}
              onChange={(event) => setForm((current) => ({ ...current, ExamPercentage: event.target.value }))}
              type="number"
              step="0.01"
              className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
              placeholder={isArabic ? "مثال: 100" : "Example: 100"}
            />
          </label>

          <label className="space-y-1 text-xs font-semibold text-slate-700">
            <span>{isArabic ? "تاريخ العلامة" : "Mark date"}</span>
            <input
              value={form.time}
              onChange={(event) => setForm((current) => ({ ...current, time: event.target.value }))}
              type="date"
              className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
            />
          </label>

          <div className="md:col-span-3 flex gap-2">
            <button type="submit" disabled={saving} className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
              {form.id ? (isArabic ? "تحديث" : "Update") : (isArabic ? "إضافة" : "Add")}
            </button>
            <button type="button" onClick={clearForm} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700">
              {isArabic ? "تفريغ" : "Clear"}
            </button>
          </div>
        </div>
      </form>

      <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">{isArabic ? "الطالب" : "Student"}</th>
              <th className="px-4 py-3">{isArabic ? "المادة" : "Subject"}</th>
              <th className="px-4 py-3">{isArabic ? "العلامة" : "Score"}</th>
              <th className="px-4 py-3">{isArabic ? "النوع" : "Type"}</th>
              <th className="px-4 py-3">{isArabic ? "التاريخ" : "Date"}</th>
              <th className="px-4 py-3">{isArabic ? "الإجراءات" : "Actions"}</th>
            </tr>
          </thead>
          <tbody>
            {marks.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-4 py-6 text-slate-500">{isArabic ? "لا توجد علامات." : "No marks found."}</td>
              </tr>
            ) : marks.map((mark) => (
              <tr key={mark.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-semibold text-slate-900">{mark.student?.user?.name || "-"}</td>
                <td className="px-4 py-3 text-slate-700">{mark.subject?.name || "-"}</td>
                <td className="px-4 py-3 text-slate-700">{formatScore(mark.Numbers)} / {formatScore(mark.OutOf)}</td>
                <td className="px-4 py-3 text-slate-700">{mark.MarkType || "EXAM"}</td>
                <td className="px-4 py-3 text-slate-700">{mark.time ? String(mark.time).slice(0, 10) : "-"}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onEdit(mark)}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700"
                    >
                      {isArabic ? "تعديل" : "Edit"}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(mark)}
                      disabled={saving}
                      className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700 disabled:opacity-50"
                    >
                      {isArabic ? "حذف" : "Delete"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </InstructorLayout>
  );
}
