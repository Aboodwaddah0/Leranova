import { useEffect, useState } from "react";
import InstructorLayout from "../../components/instructor/InstructorLayout";
import EducationLoading from "../../components/ui/EducationLoading";
import { fetchInstructorStudents, fetchInstructorCourses } from "../../services/instructorService";
import { useLanguage } from "../../utils/i18n";
import { notifyError } from "../../lib/notify";
import { useSelector } from "react-redux";
import { ORG_TYPES } from "../../utils/constants";
import { formatGradeName, getCourseLabel } from "../../utils/gradeHelpers";

const safeError = (error) => error?.response?.data?.message || error?.message || "Request failed";

export default function InstructorStudentsPage() {
  const { isArabic } = useLanguage();
  const authUser = useSelector((state) => state.auth.user);
  const orgType = String(
    authUser?.organizationType || authUser?.organization?.Role || ""
  ).toUpperCase();
  const isSchool = orgType === ORG_TYPES.SCHOOL;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const params = {};
        if (selectedCourseId) params.courseId = selectedCourseId;
        const data = await fetchInstructorStudents(params);
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
  }, [selectedCourseId]);

  useEffect(() => {
    let cancelled = false;

    const loadCourses = async () => {
      try {
        const list = await fetchInstructorCourses();
        if (!cancelled) setCourses(list || []);
      } catch (err) {
        // non-fatal
      }
    };

    loadCourses();

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
      {loading ? (
        <EducationLoading
          isArabic={isArabic}
          title={isArabic ? "جاري تحميل قائمة الطلاب" : "Loading students"}
          subtitle={isArabic ? "نرتب بيانات الطلاب الخاصة بموادك" : "Preparing students linked to your subjects"}
          fullscreen
        />
      ) : null}

      <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="px-6 py-4 flex items-center gap-4">
          <label className="text-sm text-slate-600">{isArabic ? `الفلتر حسب ${getCourseLabel(isSchool, isArabic).toLowerCase()}` : `Filter by ${getCourseLabel(isSchool, isArabic).toLowerCase()}`}</label>
          <select
            className="border rounded-md px-3 py-2 text-sm"
            value={selectedCourseId ?? ""}
            onChange={(e) => setSelectedCourseId(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">{isArabic ? `كل ${getCourseLabel(isSchool, isArabic).toLowerCase()}` : `All ${getCourseLabel(isSchool, isArabic).toLowerCase()}`}</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{formatGradeName(c, isSchool, isArabic) || c.Name || c.name}</option>
            ))}
          </select>
        </div>
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
