import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import StudentLayout from "../../components/student/StudentLayout";
import MarksTable from "../../components/student/MarksTable";
import { fetchMyStudentMarks } from "../../services/studentService";
import { ORG_TYPES } from "../../utils/constants";
import { useLanguage } from "../../utils/i18n";
import { notifyError } from "../../lib/notify";

const safeError = (error) => error?.response?.data?.message || error?.message || "Request failed";

const getStudentMode = (user) => {
  if (String(user?.organizationType || user?.organization?.Role || "").toUpperCase() === ORG_TYPES.SCHOOL) {
    return ORG_TYPES.SCHOOL;
  }

  if (String(user?.organizationType || user?.organization?.Role || "").toUpperCase() === ORG_TYPES.ACADEMY) {
    return ORG_TYPES.ACADEMY;
  }

  return user?.academyUser ? ORG_TYPES.ACADEMY : ORG_TYPES.SCHOOL;
};

export default function StudentMarksPage() {
  const { t, isArabic } = useLanguage();
  const user = useSelector((state) => state.auth.user);
  const mode = getStudentMode(user);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [marks, setMarks] = useState([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        const marksData = await fetchMyStudentMarks();
        if (!cancelled) {
          setMarks(marksData);
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
    <StudentLayout mode={mode} title={t.student.marks.title} subtitle={t.student.marks.subtitle}>
      {loading && <p className="text-sm font-semibold text-slate-500">{t.student.common.loading}</p>}
      <MarksTable marks={marks} isArabic={isArabic} emptyLabel={t.student.marks.noMarks} />
    </StudentLayout>
  );
}