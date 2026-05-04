import { useEffect, useState } from "react";
import InstructorLayout from "../../components/instructor/InstructorLayout";
import { fetchInstructorCourses } from "../../services/instructorService";
import EducationLoading from "../../components/ui/EducationLoading";
import { useLanguage } from "../../utils/i18n";
import { notifyError } from "../../lib/notify";
import { useSelector } from "react-redux";
import { formatGradeName } from "../../utils/gradeHelpers";

const safeError = (error) =>
  error?.response?.data?.message || error?.message || "Request failed";

export default function InstructorCoursesPage() {
  const { isArabic } = useLanguage();
  const authUser = useSelector((state) => state.auth.user);

  // ✅ FIXED: clean and reliable school detection
  const isSchool = String(authUser?.organization?.type || "")
    .toLowerCase()
    .includes("SCHOOL");

  // 🔍 DEBUG (احذفه بعد التأكد)
  console.log("ORG DEBUG:", authUser);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [courses, setCourses] = useState([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const coursesData = await fetchInstructorCourses();
        if (!cancelled) {
          setCourses(coursesData || []);
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
    if (error) notifyError(error);
  }, [error]);

  const labels = {
    title: isSchool
      ? isArabic ? "الصفوف" : "My Grades"
      : isArabic ? "الكورسات" : "My Courses",

    subtitle: isSchool
      ? isArabic ? "الصفوف التي تدرسها" : "Grades you are teaching"
      : isArabic ? "الكورسات التي تدرسها" : "Courses you are teaching",

    noCourses: isSchool
      ? isArabic ? "لا توجد صفوف" : "No grades assigned yet."
      : isArabic ? "لا توجد كورسات" : "No courses assigned yet.",

    courseName: isSchool
      ? isArabic ? "اسم الصف" : "Grade Name"
      : isArabic ? "اسم المساق" : "Course Name",

    gradeLevel: isArabic ? "المستوى" : "Grade Level",
    type: isArabic ? "النوع" : "Type",
    price: isArabic ? "السعر" : "Price",
    status: isArabic ? "الحالة" : "Status",
    free: isArabic ? "مجاني" : "Free",
    paid: isArabic ? "مدفوع" : "Paid",
  };

  const renderCoursesTable = () => {
    // ✅ SCHOOL VIEW (NO PRICE / STATUS)
    if (isSchool) {
      return (
        <table className="min-w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="py-2 pr-3">{labels.courseName}</th>
              <th className="py-2 pr-3">{labels.gradeLevel}</th>
              <th className="py-2 pr-3">{labels.type}</th>
            </tr>
          </thead>

          <tbody>
            {courses.map((course) => (
              <tr key={course.id} className="border-t border-slate-100">
                <td className="py-3 pr-3 font-semibold text-slate-900">
                  {formatGradeName(course, isSchool, isArabic) ||
                    course.Name ||
                    course.name ||
                    "-"}
                </td>

                <td className="py-3 pr-3 text-slate-700">
                  {course.GradeLevel ?? course.gradeLevel ?? "-"}
                </td>

                <td className="py-3 pr-3 text-slate-700">
                  {course.kind === "CLASS"
                    ? isArabic ? "صف" : "Class"
                    : isArabic ? "مساق" : "Track"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    // ❌ NON-SCHOOL (Academy)
    return (
      <table className="min-w-full text-left text-sm">
        <thead className="text-xs uppercase tracking-wider text-slate-500">
          <tr>
            <th className="py-2 pr-3">{labels.courseName}</th>
            <th className="py-2 pr-3">{labels.type}</th>
            <th className="py-2 pr-3">{labels.price}</th>
            <th className="py-2 pr-3">{labels.status}</th>
          </tr>
        </thead>

        <tbody>
          {courses.map((course) => (
            <tr key={course.id} className="border-t border-slate-100">
              <td className="py-3 pr-3 font-semibold text-slate-900">
                {formatGradeName(course, isSchool, isArabic) ||
                  course.Name ||
                  course.name ||
                  "-"}
              </td>

              <td className="py-3 pr-3 text-slate-700">
                {course.kind === "CLASS"
                  ? isArabic ? "صف" : "Class"
                  : isArabic ? "مساق" : "Track"}
              </td>

              <td className="py-3 pr-3 text-slate-700">
                {course.isPaid
                  ? `$${Number(course.price ?? 0).toFixed(2)}`
                  : labels.free}
              </td>

              <td className="py-3 pr-3">
                <span
                  className={`rounded-full px-2 py-1 text-xs font-bold ${
                    course.isPaid
                      ? "bg-amber-100 text-amber-700"
                      : "bg-emerald-100 text-emerald-700"
                  }`}
                >
                  {course.isPaid ? labels.paid : labels.free}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  return (
    <InstructorLayout title={labels.title} subtitle={labels.subtitle}>
      {loading && (
        <EducationLoading
          isArabic={isArabic}
          title={isArabic ? "جاري التحميل" : "Loading"}
          subtitle={
            isArabic
              ? "نجهز بياناتك"
              : "Preparing your data"
          }
          fullscreen
        />
      )}

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-xl font-black text-slate-900">
          {labels.title}
        </h3>

        <p className="mt-1 text-sm text-slate-500">
          {labels.subtitle}
        </p>

        <div className="mt-6 overflow-x-auto">
          {courses.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              {labels.noCourses}
            </p>
          ) : (
            renderCoursesTable()
          )}
        </div>
      </div>
    </InstructorLayout>
  );
}