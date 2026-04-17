import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import StudentLayout from "../../components/student/StudentLayout";
import CourseCard from "../../components/student/CourseCard";
import { notifyError, notifyInfo, notifySuccess } from "../../lib/notify";
import {
  fetchMyStudentPurchases,
  fetchStudentCourseCatalog,
  startCourseCheckout,
} from "../../services/studentService";

const safeError = (error) => error?.response?.data?.message || error?.message || "Request failed";

export default function StudentCoursesPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [activeCheckoutId, setActiveCheckoutId] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const [catalog, purchasesData] = await Promise.all([
          fetchStudentCourseCatalog(),
          fetchMyStudentPurchases(),
        ]);

        if (cancelled) {
          return;
        }

        setCourses(catalog);
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
  }, []);

  useEffect(() => {
    if (error) {
      notifyError(error);
    }
  }, [error]);

  const purchasedCourseIds = useMemo(
    () => new Set(
      purchases
        .filter((item) => String(item.status || "").toUpperCase() === "SUCCESS")
        .map((item) => item.course?.id)
        .filter(Boolean),
    ),
    [purchases],
  );

  const decoratedCourses = useMemo(
    () => courses.map((course) => ({
      ...course,
      purchased: purchasedCourseIds.has(course.id),
      status: purchasedCourseIds.has(course.id) ? "SUCCESS" : "PENDING",
      paymentStatus: purchasedCourseIds.has(course.id) ? "SUCCESS" : "PENDING",
    })),
    [courses, purchasedCourseIds],
  );

  const onSubscribe = async (course) => {
    setActiveCheckoutId(course.id);

    try {
      const checkout = await startCourseCheckout(course);
      notifySuccess("Redirecting to Stripe checkout...");
      if (checkout?.checkoutUrl) {
        window.open(checkout.checkoutUrl, "_blank", "noopener,noreferrer");
      } else {
        notifyInfo("Stripe checkout placeholder triggered.");
      }
    } catch (err) {
      notifyError(safeError(err));
    } finally {
      setActiveCheckoutId(null);
    }
  };

  return (
    <StudentLayout mode="ACADEMY" title="Courses" subtitle="Choose a course and continue your academy learning path.">
      {loading ? <p className="text-sm font-semibold text-slate-500">Loading...</p> : null}

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {decoratedCourses.length ? (
          decoratedCourses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              selected={false}
              onOpen={() => {
                if (course.purchased) {
                  navigate(`/student/courses/${course.id}`);
                  return;
                }
                onSubscribe(course);
              }}
              onStudy={() => {
                if (course.purchased) {
                  navigate(`/student/courses/${course.id}`);
                  return;
                }
                onSubscribe(course);
              }}
              ctaLabel={course.purchased ? "Continue" : activeCheckoutId === course.id ? "Subscribing..." : "Subscribe"}
              ctaDisabled={activeCheckoutId === course.id}
            />
          ))
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-10 text-sm text-slate-500 shadow-sm">
            No courses available at the moment.
          </div>
        )}
      </div>
    </StudentLayout>
  );
}
