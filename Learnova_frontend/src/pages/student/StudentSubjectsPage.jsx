import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import StudentLayout from "../../components/student/StudentLayout";
import { Badge } from "../../components/ui/badge";
import EducationLoading from "../../components/ui/EducationLoading";
import { fetchMyStudentMarks } from "../../services/studentService";
import { ORG_TYPES } from "../../utils/constants";
import { useLanguage } from "../../utils/i18n";
import { notifyError } from "../../lib/notify";

const safeError = (error, isArabic) => error?.response?.data?.message || error?.message || (isArabic ? 'فشل الطلب.' : 'Request failed');

const getStudentMode = (user) => {
  if (String(user?.organizationType || user?.organization?.Role || "").toUpperCase() === ORG_TYPES.SCHOOL) {
    return ORG_TYPES.SCHOOL;
  }

  if (String(user?.organizationType || user?.organization?.Role || "").toUpperCase() === ORG_TYPES.ACADEMY) {
    return ORG_TYPES.ACADEMY;
  }

  return user?.academyUser ? ORG_TYPES.ACADEMY : ORG_TYPES.SCHOOL;
};

const buildSubjects = (marks = []) => {
  const grouped = new Map();

  marks.forEach((mark) => {
    const subject = mark.subject;
    if (!subject?.id) {
      return;
    }

    const percent = Number(mark.OutOf) ? (Number(mark.Numbers) / Number(mark.OutOf)) * 100 : 0;
    const current = grouped.get(subject.id) || {
      id: subject.id,
      name: subject.name || subject.Name,
      course: subject.course || null,
      latestPercent: 0,
      latestMark: null,
    };

    if (percent >= current.latestPercent) {
      current.latestPercent = percent;
      current.latestMark = mark;
    }

    grouped.set(subject.id, current);
  });

  return Array.from(grouped.values());
};

export default function StudentSubjectsPage() {
  const { isArabic, t } = useLanguage();
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
          setError(safeError(err, isArabic));
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

  const subjects = useMemo(() => buildSubjects(marks), [marks]);

  return (
    <StudentLayout mode={mode} title={t.student.subjects.title} subtitle={t.student.subjects.subtitle}>
      {loading ? (
        <EducationLoading
          isArabic={isArabic}
          title={isArabic ? "جاري تحميل المواد" : "Loading subjects"}
          subtitle={isArabic ? "نرتب موادك وآخر درجاتك" : "Preparing your subjects and latest marks"}
          fullscreen
        />
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {subjects.length ? (
          subjects.map((subject) => (
            <article key={subject.id} className="rounded-[1.75rem] border border-white/70 bg-white/90 p-5 shadow-xl shadow-indigo-500/5 backdrop-blur-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600">{t.student.subjects.title}</p>
                  <h3 className="mt-2 text-xl font-black text-slate-900">{subject.name}</h3>
                </div>
                <Badge variant="subtle">
                  {subject.latestPercent ? `${subject.latestPercent.toFixed(0)}%` : t.student.common.noData}
                </Badge>
              </div>

              <p className="mt-4 text-sm text-slate-600">
                {isArabic ? "الكورس المرتبط" : "Linked course"}: {subject.course?.Name || subject.course?.name || t.student.common.noData}
              </p>
              <p className="mt-2 text-sm text-slate-600">
                {isArabic ? "آخر درجة" : "Latest mark"}: {subject.latestMark ? `${subject.latestMark.Numbers} / ${subject.latestMark.OutOf}` : t.student.common.noData}
              </p>
            </article>
          ))
        ) : (
          <div className="col-span-full rounded-[1.75rem] border border-dashed border-slate-300 bg-white/90 px-6 py-12 text-center text-sm text-slate-500 shadow-sm">
            {t.student.subjects.noSubjects}
          </div>
        )}
      </div>
    </StudentLayout>
  );
}