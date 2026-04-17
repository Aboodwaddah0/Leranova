import { useEffect, useState } from "react";
import InstructorLayout from "../../components/instructor/InstructorLayout";
import {
  createInstructorSubject,
  deleteInstructorSubject,
  fetchInstructorCourses,
  fetchInstructorSubjects,
} from "../../services/instructorService";
import { useLanguage } from "../../utils/i18n";
import { notifyError } from "../../lib/notify";

const safeError = (error) => error?.response?.data?.message || error?.message || "Request failed";

export default function InstructorSubjectsPage() {
  const { isArabic } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [subjects, setSubjects] = useState([]);
  const [courses, setCourses] = useState([]);
  const [form, setForm] = useState({ courseId: "", name: "", Description: "" });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const [subjectsData, coursesData] = await Promise.all([
          fetchInstructorSubjects(),
          fetchInstructorCourses(),
        ]);

        if (!cancelled) {
          setSubjects(subjectsData);
          setCourses(coursesData);
          setForm((current) => ({
            ...current,
            courseId: current.courseId || String(coursesData[0]?.id || ""),
          }));
        }
      } catch (err) {
        if (!cancelled) {
          setError(safeError(err));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
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

  const refreshSubjects = async () => {
    const [subjectsData] = await Promise.all([fetchInstructorSubjects()]);
    setSubjects(subjectsData);
  };

  const onCreateSubject = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      await createInstructorSubject(form.courseId, {
        name: form.name,
        Description: form.Description,
      });

      setForm({ courseId: form.courseId, name: "", Description: "" });
      await refreshSubjects();
    } catch (err) {
      setError(safeError(err));
    } finally {
      setSaving(false);
    }
  };

  const onDeleteSubject = async (subject) => {
    const confirmed = window.confirm(
      isArabic ? `هل تريد حذف المادة \"${subject.name}\"؟` : `Delete subject \"${subject.name}\"?`,
    );
    if (!confirmed) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      await deleteInstructorSubject(subject.course?.id || subject.Course_id, subject.id);
      await refreshSubjects();
    } catch (err) {
      setError(safeError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <InstructorLayout
      title={isArabic ? "المواد" : "Subjects"}
      subtitle={isArabic ? "عرض المواد المرتبطة بحسابك كمعلم" : "View and manage your assigned subjects."}
    >
      {loading && <p className="text-sm font-semibold text-slate-500">{isArabic ? "جاري التحميل..." : "Loading..."}</p>}

      <form onSubmit={onCreateSubject} className="mb-6 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
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

      <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">{isArabic ? "المادة" : "Subject"}</th>
              <th className="px-4 py-3">{isArabic ? "الكورس" : "Course"}</th>
              <th className="px-4 py-3">{isArabic ? "الوصف" : "Description"}</th>
              <th className="px-4 py-3">{isArabic ? "الإجراءات" : "Actions"}</th>
            </tr>
          </thead>
          <tbody>
            {subjects.length === 0 ? (
              <tr>
                <td colSpan="4" className="px-4 py-6 text-slate-500">{isArabic ? "لا توجد مواد." : "No subjects found."}</td>
              </tr>
            ) : subjects.map((subject) => (
              <tr key={subject.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-semibold text-slate-900">{subject.name}</td>
                <td className="px-4 py-3 text-slate-700">{subject.course?.Name || "-"}</td>
                <td className="px-4 py-3 text-slate-700">{subject.Description || "-"}</td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => onDeleteSubject(subject)}
                    disabled={saving}
                    className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700 disabled:opacity-50"
                  >
                    {isArabic ? "حذف" : "Delete"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </InstructorLayout>
  );
}
