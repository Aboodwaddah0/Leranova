import { useEffect, useState } from "react";
import InstructorLayout from "../../components/instructor/InstructorLayout";
import { fetchInstructorStudents } from "../../services/instructorService";
import { useLanguage } from "../../utils/i18n";
import { notifyError } from "../../lib/notify";

const safeError = (error) => error?.response?.data?.message || error?.message || "Request failed";

export default function InstructorStudentsPage() {
  const { isArabic } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [students, setStudents] = useState([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const data = await fetchInstructorStudents();
        if (!cancelled) {
          setStudents(data);
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

  return (
    <InstructorLayout
      title={isArabic ? "الطلاب" : "Students"}
      subtitle={isArabic ? "عرض الطلاب المرتبطين بموادك" : "View students associated with your subjects."}
    >
      {loading && <p className="text-sm font-semibold text-slate-500">{isArabic ? "جاري التحميل..." : "Loading..."}</p>}

      <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">{isArabic ? "الاسم" : "Name"}</th>
              <th className="px-4 py-3">{isArabic ? "البريد" : "Email"}</th>
              <th className="px-4 py-3">{isArabic ? "الصف" : "Grade"}</th>
              <th className="px-4 py-3">{isArabic ? "الحالة" : "Status"}</th>
            </tr>
          </thead>
          <tbody>
            {students.length === 0 ? (
              <tr>
                <td colSpan="4" className="px-4 py-6 text-slate-500">{isArabic ? "لا يوجد طلاب." : "No students found."}</td>
              </tr>
            ) : students.map((entry) => (
              <tr key={entry.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-semibold text-slate-900">{entry.user?.name || "-"}</td>
                <td className="px-4 py-3 text-slate-700">{entry.user?.email || "-"}</td>
                <td className="px-4 py-3 text-slate-700">{entry.student?.gradeLevel ?? entry.student?.GradeLevel ?? "-"}</td>
                <td className="px-4 py-3 text-slate-700">{entry.student?.academicStatus || entry.student?.AcademicStatus || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </InstructorLayout>
  );
}
