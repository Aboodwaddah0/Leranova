import { useEffect, useMemo, useState } from "react";
import InstructorLayout from "../../components/instructor/InstructorLayout";
import {
  fetchInstructorCourses,
  fetchInstructorLessons,
  fetchInstructorMarks,
  fetchInstructorProfile,
  fetchInstructorStudents,
  fetchInstructorSubjects,
} from "../../services/instructorService";
import { useLanguage } from "../../utils/i18n";
import { notifyError } from "../../lib/notify";

const safeError = (error) => error?.response?.data?.message || error?.message || "Request failed";

export default function InstructorOverviewPage() {
  const { isArabic } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState(null);
  const [courses, setCourses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [students, setStudents] = useState([]);
  const [marks, setMarks] = useState([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const [profileData, coursesData, subjectsData, lessonsData, studentsData, marksData] = await Promise.all([
          fetchInstructorProfile(),
          fetchInstructorCourses(),
          fetchInstructorSubjects(),
          fetchInstructorLessons(),
          fetchInstructorStudents(),
          fetchInstructorMarks(),
        ]);

        if (cancelled) {
          return;
        }

        setProfile(profileData);
        setCourses(coursesData);
        setSubjects(subjectsData);
        setLessons(lessonsData);
        setStudents(studentsData);
        setMarks(marksData);
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

  const stats = useMemo(() => ({
    courses: courses.length,
    subjects: subjects.length,
    lessons: lessons.length,
    students: students.length,
    marks: marks.length,
  }), [courses.length, subjects.length, lessons.length, students.length, marks.length]);

  const overviewNotes = useMemo(() => [
    profile?.organization?.name || profile?.organization?.Name || "Learnova",
    profile?.user?.name || (isArabic ? "معلم" : "Instructor"),
    profile?.organization?.role || profile?.organization?.Role || "-",
  ], [profile, isArabic]);

  const labels = {
    title: isArabic ? "نظرة عامة" : "Overview",
    subtitle: isArabic ? "إحصائيات ومعلومات سريعة عن الحساب والمحتوى المرتبط بالمعلم" : "Quick statistics and account insights for the instructor workspace.",
    loading: isArabic ? "جاري التحميل..." : "Loading...",
    accountInfo: isArabic ? "معلومات الحساب" : "Account information",
    latestData: isArabic ? "آخر البيانات" : "Latest data",
    name: isArabic ? "الاسم" : "Name",
    email: isArabic ? "البريد" : "Email",
    organization: isArabic ? "المنظمة" : "Organization",
    type: isArabic ? "النوع" : "Type",
    latestSubject: isArabic ? "أحدث مادة" : "Latest subject",
    latestLesson: isArabic ? "أحدث درس" : "Latest lesson",
    latestStudent: isArabic ? "أحدث طالب" : "Latest student",
    latestMark: isArabic ? "أحدث علامة" : "Latest mark",
  };

  return (
    <InstructorLayout
      title={labels.title}
      subtitle={labels.subtitle}
      actions={null}
    >
      {loading && <p className="text-sm font-semibold text-slate-500">{labels.loading}</p>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[
          [isArabic ? "الكورسات" : "Courses", stats.courses],
          [isArabic ? "المواد" : "Subjects", stats.subjects],
          [isArabic ? "الدروس" : "Lessons", stats.lessons],
          [isArabic ? "الطلاب" : "Students", stats.students],
          [isArabic ? "العلامات" : "Marks", stats.marks],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-widest text-[#2379c3]">{label}</p>
            <p className="mt-2 text-3xl font-black text-slate-900">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-xl font-black text-slate-900">{labels.accountInfo}</h3>
          <div className="mt-4 space-y-3 text-sm text-slate-700">
            <p><span className="font-semibold text-slate-900">{labels.name}:</span> {profile?.user?.name || "-"}</p>
            <p><span className="font-semibold text-slate-900">{labels.email}:</span> {profile?.user?.email || "-"}</p>
            <p><span className="font-semibold text-slate-900">{labels.organization}:</span> {overviewNotes[0]}</p>
            <p><span className="font-semibold text-slate-900">{labels.type}:</span> {overviewNotes[2]}</p>
          </div>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-xl font-black text-slate-900">{labels.latestData}</h3>
          <div className="mt-4 space-y-3 text-sm text-slate-700">
            <p><span className="font-semibold text-slate-900">{labels.latestSubject}:</span> {subjects[0]?.name || "-"}</p>
            <p><span className="font-semibold text-slate-900">{labels.latestLesson}:</span> {lessons[0]?.title || lessons[0]?.name || "-"}</p>
            <p><span className="font-semibold text-slate-900">{labels.latestStudent}:</span> {students[0]?.user?.name || "-"}</p>
            <p><span className="font-semibold text-slate-900">{labels.latestMark}:</span> {marks[0]?.subject?.name || "-"}</p>
          </div>
        </article>
      </div>
    </InstructorLayout>
  );
}
