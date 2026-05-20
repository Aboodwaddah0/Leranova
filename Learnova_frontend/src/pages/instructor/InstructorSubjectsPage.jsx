import { useEffect, useState } from "react";
import InstructorLayout from "../../components/instructor/InstructorLayout";
import { fetchInstructorSubjects, fetchInstructorCourses } from "../../services/instructorService";
import { fetchCourseSubjects } from "../../services/organizationService";
import EducationLoading from "../../components/ui/EducationLoading";
import { useLanguage } from "../../utils/i18n";
import { notifyError } from "../../lib/notify";
import { useSelector } from "react-redux";
import { ORG_TYPES } from "../../utils/constants";
import { formatGradeName } from "../../utils/gradeHelpers";

const safeError = (error) => error?.response?.data?.message || error?.message || "Request failed";

export default function InstructorSubjectsPage() {
  const { isArabic } = useLanguage();
  const authUser = useSelector((state) => state.auth.user);
  const orgType = String(
    authUser?.organizationType || authUser?.organization?.Role || ""
  ).toUpperCase();
  const isSchool = orgType === ORG_TYPES.SCHOOL;
  const [loading, setLoading] = useState(true);
  
  const [error, setError] = useState("");
  const [subjects, setSubjects] = useState([]);
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const [coursesData, subjectsData] = await Promise.all([
          fetchInstructorCourses().catch(() => []),
          fetchInstructorSubjects().catch(() => []),
        ]);

        if (!cancelled) {
          setCourses(coursesData || []);

          // determine default selection
          let defaultCourseId = null;
          if (isSchool) {
            const withGrade = (coursesData || []).filter((c) => c?.GradeLevel != null || c?.gradeLevel != null);
            if (withGrade.length) {
              withGrade.sort((a, b) => Number(a.GradeLevel ?? a.gradeLevel ?? 0) - Number(b.GradeLevel ?? b.gradeLevel ?? 0));
              defaultCourseId = withGrade[0]?.id;
            } else if ((coursesData || []).length) {
              defaultCourseId = coursesData[0].id;
            }
          } else {
            if ((coursesData || []).length) defaultCourseId = coursesData[0].id;
          }

          setSelectedCourseId(defaultCourseId || null);

          if (defaultCourseId) {
            const byCourse = await fetchCourseSubjects(defaultCourseId).catch(() => []);
            setSubjects(byCourse || []);
          } else {
            setSubjects(subjectsData || []);
          }
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
    if (selectedCourseId) {
      const byCourse = await fetchCourseSubjects(selectedCourseId).catch(() => []);
      setSubjects(byCourse || []);
      return;
    }

    const subjectsData = await fetchInstructorSubjects();
    setSubjects(subjectsData);
  };

  const onCourseChange = async (courseId) => {
    setSelectedCourseId(courseId);
    setLoading(true);
    try {
      const byCourse = await fetchCourseSubjects(courseId).catch(() => []);
      setSubjects(byCourse || []);
    } catch (err) {
      setError(safeError(err));
    } finally {
      setLoading(false);
    }
  };

  // Delete action removed for instructors (read-only)

  return (
    <InstructorLayout
      title={isArabic ? "المواد" : "Subjects"}
      subtitle={isArabic ? "عرض المواد المرتبطة بحسابك كمعلم" : "View and manage your assigned subjects."}
    >
      {loading ? (
        <EducationLoading
          isArabic={isArabic}
          title={isArabic ? "جاري تحميل المواد" : "Loading subjects"}
          subtitle={isArabic ? "نسترجع المواد والكورسات المرتبطة" : "Fetching linked subjects and courses"}
          fullscreen
        />
      ) : null}
      
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4">
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            {isSchool ? (isArabic ? 'اختر الصف' : 'Select Grade') : (isArabic ? 'اختر المسار' : 'Select Track')}
          </label>
          <div>
            <select
              value={selectedCourseId || ""}
              onChange={(e) => onCourseChange(Number(e.target.value))}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"
            >
              {(courses || []).map((c) => (
                <option key={c.id} value={c.id}>
                  {formatGradeName(c, isSchool, isArabic) || c.name || c.Name || String(c.id)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">{isArabic ? "المادة" : "Subject"}</th>
              <th className="px-4 py-3">
                {isSchool
                  ? isArabic ? "الصف" : "Grade"
                  : isArabic ? "المسار" : "Track"}
              </th>
              <th className="px-4 py-3">{isArabic ? "الوصف" : "Description"}</th>
            </tr>
          </thead>
          <tbody>
            {subjects.length === 0 ? (
              <tr>
                <td colSpan="3" className="px-4 py-6 text-slate-500">{isArabic ? "لا توجد مواد." : "No subjects found."}</td>
              </tr>
            ) : subjects.map((subject) => (
              <tr key={subject.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-semibold text-slate-900">{subject.name}</td>
                <td className="px-4 py-3 text-slate-700">{formatGradeName(subject.track, isSchool, isArabic) || "-"}</td>
                <td className="px-4 py-3 text-slate-700">{subject.Description || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </InstructorLayout>
  );
}
