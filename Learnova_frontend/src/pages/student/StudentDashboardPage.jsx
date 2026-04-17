import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import StudentLayout from "../../components/student/StudentLayout";
import TabsSection from "../../components/student/TabsSection";
import CourseCard from "../../components/student/CourseCard";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { notifyError } from "../../lib/notify";
import {
  fetchMyStudentPurchases,
  fetchStudentCourseCatalog,
  fetchStudentProfile,
} from "../../services/studentService";

const safeError = (error) => error?.response?.data?.message || error?.message || "Request failed";

export default function StudentDashboardPage() {
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("learning");
  const [courses, setCourses] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [profile, setProfile] = useState({ name: "", email: "" });
  const [error, setError] = useState("");

  const isAcademy = String(user?.organizationType || "").toUpperCase() === "ACADEMY";

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const [catalog, purchasesData, profileData] = await Promise.all([
          fetchStudentCourseCatalog(),
          fetchMyStudentPurchases(),
          fetchStudentProfile(user),
        ]);

        if (cancelled) {
          return;
        }

        setCourses(catalog);
        setPurchases(purchasesData);
        setProfile(profileData);
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
  }, [user]);

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
    })),
    [courses, purchasedCourseIds],
  );

  const continueLearningCourse = decoratedCourses.find((course) => course.purchased) || null;
  const recentCourses = decoratedCourses.slice(0, 3);

  return (
    <StudentLayout
      mode="ACADEMY"
      title="Student Dashboard"
      subtitle="Continue your academy learning journey from one place."
      actions={
        <>
          <Badge variant="inverse">Academy Mode</Badge>
          <Button type="button" size="sm" variant="secondary" onClick={() => navigate("/student/courses")}>
            Browse Courses
          </Button>
        </>
      }
    >
      {loading ? <p className="text-sm font-semibold text-slate-500">Loading...</p> : null}

      {!isAcademy ? (
        <article className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900 shadow-sm">
          This dashboard is configured for academy students only.
        </article>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#2379c3]">Enrolled Courses</p>
              <p className="mt-3 text-3xl font-black text-slate-900">{purchasedCourseIds.size}</p>
            </article>
            <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#2379c3]">Available Courses</p>
              <p className="mt-3 text-3xl font-black text-slate-900">{decoratedCourses.length}</p>
            </article>
            <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#2379c3]">Continue Learning</p>
              <p className="mt-3 text-lg font-bold text-slate-900">{continueLearningCourse?.name || "No purchased course yet"}</p>
            </article>
          </div>

          <div className="mt-6">
            <TabsSection
              tabs={[
                { id: "learning", label: "Learning" },
                { id: "profile", label: "Profile" },
              ]}
              activeTab={tab}
              onChange={setTab}
            />
          </div>

          {tab === "learning" ? (
            <div className="mt-6 space-y-6">
              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#2379c3]">Continue Learning</p>
                    <h3 className="mt-2 text-2xl font-black text-slate-900">{continueLearningCourse?.name || "Pick your first course"}</h3>
                    <p className="mt-2 text-sm text-slate-600">
                      {continueLearningCourse?.description || "Subscribe to a course to unlock lessons and continue your learning path."}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      if (continueLearningCourse) {
                        navigate(`/student/courses/${continueLearningCourse.id}`);
                        return;
                      }
                      navigate("/student/courses");
                    }}
                  >
                    {continueLearningCourse ? "Continue" : "Explore Courses"}
                  </Button>
                </div>
              </section>

              <section>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-2xl font-black text-slate-900">Recent Courses</h3>
                  <Button type="button" size="sm" variant="ghost" onClick={() => navigate("/student/courses")}>
                    View All
                  </Button>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {recentCourses.length ? (
                    recentCourses.map((course) => (
                      <CourseCard
                        key={course.id}
                        course={course}
                        onOpen={() => navigate(`/student/courses/${course.id}`)}
                        onStudy={() => navigate(`/student/courses/${course.id}`)}
                      />
                    ))
                  ) : (
                    <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-10 text-sm text-slate-500 shadow-sm">
                      No courses available yet.
                    </div>
                  )}
                </div>
              </section>
            </div>
          ) : (
            <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#2379c3]">Profile</p>
              <h3 className="mt-2 text-2xl font-black text-slate-900">{profile.name || user?.name || "Student"}</h3>
              <p className="mt-2 text-sm text-slate-600">{profile.email || user?.email || "-"}</p>
              <div className="mt-4">
                <Button type="button" size="sm" onClick={() => navigate("/student/profile")}>Edit Profile</Button>
              </div>
            </section>
          )}
        </>
      )}
    </StudentLayout>
  );
}
