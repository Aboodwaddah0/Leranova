import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import StudentLayout from "../../components/student/StudentLayout";
import { Button } from "../../components/ui/button";
import { notifyError } from "../../lib/notify";
import { fetchSubjectLessons } from "../../services/studentService";

const safeError = (error) => error?.response?.data?.message || error?.message || "Request failed";

export default function StudentSubjectPage() {
  const { subjectId } = useParams();
  const [searchParams] = useSearchParams();
  const courseId = searchParams.get("courseId") || "";
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [lessons, setLessons] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const lessonsData = await fetchSubjectLessons(subjectId);
        if (!cancelled) {
          setLessons(lessonsData);
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
  }, [subjectId]);

  useEffect(() => {
    if (error) {
      notifyError(error);
    }
  }, [error]);

  return (
    <StudentLayout mode="ACADEMY" title={`Subject #${subjectId}`} subtitle="Lessons in this subject.">
      {loading ? <p className="text-sm font-semibold text-slate-500">Loading...</p> : null}

      <div className="mb-6">
        <Button type="button" variant="secondary" onClick={() => navigate(`/student/courses/${courseId}`)}>
          Back to Course
        </Button>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#2379c3]">Lessons</p>
        <div className="mt-4 space-y-3">
          {lessons.length ? (
            lessons.map((lesson) => (
              <article key={lesson.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 p-4 transition hover:border-[#2379c3] hover:shadow-sm">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{lesson.name}</h3>
                  <p className="text-sm text-slate-500">Lesson #{lesson.id}</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => navigate(`/student/lessons/${lesson.id}?subjectId=${subjectId}&courseId=${courseId}`)}
                >
                  Open Lesson
                </Button>
              </article>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-sm text-slate-500">No lessons found.</div>
          )}
        </div>
      </section>
    </StudentLayout>
  );
}
