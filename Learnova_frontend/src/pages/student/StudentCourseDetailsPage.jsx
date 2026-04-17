import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import StudentLayout from "../../components/student/StudentLayout";
import { Button } from "../../components/ui/button";
import { notifyError } from "../../lib/notify";
import {
  fetchCourseSubjects,
  fetchMyStudentPurchases,
  fetchStudentCourseCatalog,
  startCourseCheckout,
} from "../../services/studentService";

const safeError = (error) => error?.response?.data?.message || error?.message || "Request failed";

export default function StudentCourseDetailsPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [subscribing, setSubscribing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const [catalog, subjectsData, purchasesData] = await Promise.all([
          fetchStudentCourseCatalog(),
          fetchCourseSubjects(courseId),
          fetchMyStudentPurchases(),
        ]);

        if (cancelled) {
          return;
        }

        const selectedCourse = catalog.find((item) => String(item.id) === String(courseId)) || null;
        setCourse(selectedCourse);
        setSubjects(subjectsData);
        setPurchases(purchasesData);
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
  }, [courseId]);

  useEffect(() => {
    if (error) {
      notifyError(error);
    }
  }, [error]);

  const isPurchased = useMemo(
    () => purchases.some((item) => String(item.course?.id) === String(courseId) && String(item.status || "").toUpperCase() === "SUCCESS"),
    [courseId, purchases],
  );

  return (
    <StudentLayout mode="ACADEMY" title={course?.name || "Course Details"} subtitle={course?.description || "Course structure and subjects."}>
      {loading ? <p className="text-sm font-semibold text-slate-500">Loading...</p> : null}

      <div className="mb-6 flex flex-wrap gap-3">
        <Button type="button" variant="secondary" onClick={() => navigate("/student/courses")}>Back to Courses</Button>
        {isPurchased ? (
          <Button type="button" onClick={() => {
            if (subjects[0]?.id) {
              navigate(`/student/subjects/${subjects[0].id}?courseId=${courseId}`);
            }
          }}>
            Continue
          </Button>
        ) : (
          <Button
            type="button"
            disabled={subscribing}
            onClick={async () => {
              setSubscribing(true);
              try {
                const checkout = await startCourseCheckout(course);
                if (checkout?.checkoutUrl) {
                  window.open(checkout.checkoutUrl, "_blank", "noopener,noreferrer");
                }
              } catch (err) {
                notifyError(safeError(err));
              } finally {
                setSubscribing(false);
              }
            }}
          >
            {subscribing ? "Subscribing..." : "Subscribe"}
          </Button>
        )}
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#2379c3]">Subjects</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {subjects.length ? (
            subjects.map((subject) => (
              <article key={subject.id} className="rounded-2xl border border-slate-200 p-4 transition hover:border-[#2379c3] hover:shadow-sm">
                <h3 className="text-lg font-bold text-slate-900">{subject.name}</h3>
                <div className="mt-3">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/student/subjects/${subject.id}?courseId=${courseId}`)}
                  >
                    Open Subject
                  </Button>
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-sm text-slate-500">No subjects available for this course.</div>
          )}
        </div>
      </section>
    </StudentLayout>
  );
}
