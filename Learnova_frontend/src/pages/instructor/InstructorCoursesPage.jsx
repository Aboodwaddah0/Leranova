import { useEffect, useState } from "react";
import { ChevronRight, FolderOpen } from "lucide-react";
import InstructorLayout from "../../components/instructor/InstructorLayout";
import { fetchInstructorCourses, fetchInstructorLessons, fetchInstructorLessonAttachments, fetchInstructorSubjects } from "../../services/instructorService";
import EducationLoading from "../../components/ui/EducationLoading";
import { useLanguage } from "../../utils/i18n";
import { notifyError } from "../../lib/notify";
import { useSelector } from "react-redux";
import { formatGradeName } from "../../utils/gradeHelpers";
import { ORG_TYPES } from "../../utils/constants";

const safeError = (e) => e?.response?.data?.message || e?.message || "Request failed";

const DEFAULT_THUMBNAIL =
  "https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=600&auto=format&fit=crop&ixlib=rb-4.0.3";

const getThumbnail = (thumb) => String(thumb || "").trim() || DEFAULT_THUMBNAIL;

const AUTO_GRADE_RE = /^Auto-created grade course for level (\d+)$/i;
const translateDesc = (desc, isArabic) => {
  if (!desc) return desc;
  const m = desc.match(AUTO_GRADE_RE);
  if (m && isArabic) return `تم إنشاء مسار الصف تلقائيًا للمستوى ${m[1]}`;
  return desc;
};

const ACCENT_CLASSES = [
  "from-cyan-500 to-blue-600",
  "from-violet-500 to-fuchsia-600",
  "from-amber-500 to-orange-500",
  "from-emerald-500 to-teal-500",
];

export default function InstructorCoursesPage() {
  const { isArabic } = useLanguage();
  const authUser = useSelector((s) => s.auth.user);
  const orgType = String(authUser?.organizationType || authUser?.organization?.Role || "").toUpperCase();
  const isSchool = orgType === ORG_TYPES.SCHOOL;

  const [loading,  setLoading]  = useState(true);
  const [courses,  setCourses]  = useState([]);

  // ── Drill-down state ──
  const [drillCourse,          setDrillCourse]          = useState(null);
  const [drillSubject,         setDrillSubject]          = useState(null);
  const [drillSubjects,        setDrillSubjects]         = useState([]);
  const [drillSubjectsLoading, setDrillSubjectsLoading] = useState(false);
  const [drillLessons,         setDrillLessons]          = useState([]);
  const [drillLessonsLoading,  setDrillLessonsLoading]  = useState(false);
  const [drillExpandedLesson,  setDrillExpandedLesson]  = useState(null);
  const [drillAttachments,     setDrillAttachments]     = useState({}); // { [lessonId]: attachment[] }
  const [drillAttachLoading,   setDrillAttachLoading]   = useState({}); // { [lessonId]: boolean }

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchInstructorCourses();
        if (!cancelled) setCourses(data || []);
      } catch (err) {
        if (!cancelled) notifyError(safeError(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const enterCourse = async (course) => {
    setDrillCourse(course);
    setDrillSubject(null);
    setDrillLessons([]);
    setDrillExpandedLesson(null);
    setDrillSubjects([]);
    setDrillSubjectsLoading(true);
    try {
      const all = await fetchInstructorSubjects();
      const mine = (all || []).filter(
        (s) => (s.Course_id ?? s.course_id ?? s.course?.id) === course.id
      );
      setDrillSubjects(mine);
    } catch {
      setDrillSubjects([]);
    } finally {
      setDrillSubjectsLoading(false);
    }
  };

  const enterSubject = async (subject) => {
    setDrillSubject(subject);
    setDrillLessons([]);
    setDrillExpandedLesson(null);
    setDrillAttachments({});
    setDrillAttachLoading({});
    setDrillLessonsLoading(true);
    try {
      const data = await fetchInstructorLessons({ Subject_id: subject.id });
      setDrillLessons(data || []);
    } catch {
      setDrillLessons([]);
    } finally {
      setDrillLessonsLoading(false);
    }
  };

  const toggleLesson = async (lessonId) => {
    const closing = drillExpandedLesson === lessonId;
    setDrillExpandedLesson(closing ? null : lessonId);
    if (closing) return;
    // Fetch attachments the first time this lesson is opened
    if (drillAttachments[lessonId] !== undefined) return;
    setDrillAttachLoading((prev) => ({ ...prev, [lessonId]: true }));
    try {
      const data = await fetchInstructorLessonAttachments(lessonId);
      setDrillAttachments((prev) => ({ ...prev, [lessonId]: data || [] }));
    } catch {
      setDrillAttachments((prev) => ({ ...prev, [lessonId]: [] }));
    } finally {
      setDrillAttachLoading((prev) => ({ ...prev, [lessonId]: false }));
    }
  };

  const courseName = (c) => formatGradeName(c, isSchool, isArabic) || c.Name || c.name || "-";

  const titleLabel    = isSchool ? (isArabic ? "الصفوف" : "My Grades")   : (isArabic ? "الكورسات" : "My Courses");
  const subtitleLabel = isSchool ? (isArabic ? "الصفوف التي تدرسها" : "Grades you are teaching") : (isArabic ? "الكورسات التي تدرسها" : "Courses you are teaching");

  return (
    <InstructorLayout title={titleLabel} subtitle={subtitleLabel}>
      {loading && (
        <EducationLoading
          isArabic={isArabic}
          title={isArabic ? "جاري التحميل" : "Loading"}
          subtitle={isArabic ? "نجهز بياناتك" : "Preparing your data"}
          fullscreen
        />
      )}

      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">

        {/* ── Breadcrumb ── */}
        {drillCourse && (
          <div className="mb-5 flex flex-wrap items-center gap-2 text-sm">
            <button
              type="button"
              onClick={() => { setDrillCourse(null); setDrillSubject(null); setDrillExpandedLesson(null); }}
              className="font-bold text-indigo-600 hover:underline"
            >
              {isSchool ? (isArabic ? "الصفوف" : "Grades") : (isArabic ? "الكورسات" : "Courses")}
            </button>
            <ChevronRight size={14} className="flex-shrink-0 text-slate-400" />
            {drillSubject ? (
              <>
                <button
                  type="button"
                  onClick={() => { setDrillSubject(null); setDrillExpandedLesson(null); }}
                  className="font-bold text-indigo-600 hover:underline"
                >
                  {courseName(drillCourse)}
                </button>
                <ChevronRight size={14} className="flex-shrink-0 text-slate-400" />
                <span className="font-bold text-slate-900">{drillSubject.name}</span>
              </>
            ) : (
              <span className="font-bold text-slate-900">{courseName(drillCourse)}</span>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════
            Level 1 — Course Cards Grid
            ══════════════════════════════════════ */}
        {!drillCourse && (
          <>
            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-5">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-700">
                  {isSchool ? (isArabic ? "قسم الصفوف" : "Grades section") : (isArabic ? "قسم الكورسات" : "Courses section")}
                </p>
                <h2 className="mt-2 text-2xl font-black text-slate-900">{titleLabel}</h2>
                <p className="mt-2 text-sm text-slate-600">{subtitleLabel}</p>
              </div>
              <span className="rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-sm font-bold text-sky-700">
                {courses.length} {isSchool ? (isArabic ? "صف" : "grades") : (isArabic ? "كورس" : "courses")}
              </span>
            </div>

            {/* Cards grid */}
            {courses.length === 0 ? (
              <div className="mt-6 rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center text-sm text-slate-500">
                {isSchool ? (isArabic ? "لا توجد صفوف" : "No grades assigned yet.") : (isArabic ? "لا توجد كورسات" : "No courses assigned yet.")}
              </div>
            ) : (
              <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {courses.map((course, index) => {
                  const accent      = ACCENT_CLASSES[index % ACCENT_CLASSES.length];
                  const trackLabel  = courseName(course);
                  const priceLabel  = course?.isPaid ? (isArabic ? "مدفوع" : "Paid") : (isArabic ? "مجاني" : "Free");
                  const courseLevel = course?.level || null;
                  const levelLabels = {
                    BEGINNER:     { en: "Beginner",     ar: "مبتدئ",  cls: "bg-emerald-100 text-emerald-700" },
                    INTERMEDIATE: { en: "Intermediate", ar: "متوسط",  cls: "bg-sky-100 text-sky-700"         },
                    ADVANCED:     { en: "Advanced",     ar: "متقدم",  cls: "bg-violet-100 text-violet-700"   },
                    EXPERT:       { en: "Expert",       ar: "خبير",   cls: "bg-rose-100 text-rose-700"       },
                  };
                  const levelInfo   = courseLevel ? levelLabels[courseLevel] : null;

                  return (
                    <article
                      key={course.id}
                      className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                    >
                      {/* Thumbnail */}
                      <div className={`flex h-44 items-center justify-center bg-gradient-to-br ${accent} p-6`}>
                        <img
                          src={getThumbnail(course.Thumbnail)}
                          alt={course.Name || (isArabic ? "صورة الكورس" : "Course image")}
                          onError={(e) => { e.currentTarget.src = DEFAULT_THUMBNAIL; }}
                          className="h-full w-full rounded-[20px] object-cover shadow-lg shadow-black/10"
                        />
                      </div>

                      {/* Body */}
                      <div className="p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="truncate text-lg font-black text-slate-900">{trackLabel}</h3>
                          </div>
                          {!isSchool && (
                            <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                              {priceLabel}
                            </div>
                          )}
                        </div>

                        <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">
                          {translateDesc(course.Description, isArabic) || (isArabic ? "لا يوجد وصف" : "No description")}
                        </p>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">{trackLabel}</span>
                          {!isSchool && levelInfo && (
                            <span className={`rounded-full px-3 py-1 text-xs font-bold ${levelInfo.cls}`}>
                              {isArabic ? levelInfo.ar : levelInfo.en}
                            </span>
                          )}
                          {!isSchool && (
                            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">{priceLabel}</span>
                          )}
                        </div>

                        {/* Footer */}
                        <div className="mt-5 flex items-center justify-end border-t border-slate-200 pt-4">
                          <button
                            type="button"
                            onClick={() => enterCourse(course)}
                            className="flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-bold text-indigo-700 transition hover:bg-indigo-100"
                          >
                            <FolderOpen size={15} />
                            {isArabic ? "فتح" : "Open"}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ══════════════════════════════════════
            Level 2 — Subjects for drillCourse
            ══════════════════════════════════════ */}
        {drillCourse && !drillSubject && (
          <>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-5">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-indigo-700">{isArabic ? "المواد" : "Subjects"}</p>
                <h3 className="mt-1 text-2xl font-black text-slate-900">{courseName(drillCourse)}</h3>
              </div>
              <span className="rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-sm font-bold text-indigo-700">
                {drillSubjects.length} {isArabic ? "مادة" : "subject(s)"}
              </span>
            </div>

            {drillSubjectsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl border border-slate-200 bg-slate-50" />)}
              </div>
            ) : drillSubjects.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
                <p className="text-sm font-semibold text-slate-500">
                  {isArabic ? "لا توجد مواد في هذا الكورس." : "No subjects in this course."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="text-xs uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="py-2 pr-4 text-left">#</th>
                      <th className="py-2 pr-4 text-left">{isArabic ? "المادة" : "Subject"}</th>
                      <th className="py-2 pr-4 text-left">{isArabic ? "الوصف" : "Description"}</th>
                      <th className="py-2 text-right" />
                    </tr>
                  </thead>
                  <tbody>
                    {drillSubjects.map((subject, idx) => (
                      <tr key={subject.id} className="border-t border-slate-100 transition hover:bg-slate-50">
                        <td className="py-3 pr-4 font-semibold text-slate-500">{idx + 1}</td>
                        <td className="py-3 pr-4 font-semibold text-slate-900">{subject.name}</td>
                        <td className="py-3 pr-4 text-slate-600 line-clamp-2">{subject.Description || "-"}</td>
                        <td className="py-3 text-right">
                          <button
                            type="button"
                            onClick={() => enterSubject(subject)}
                            className="flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100"
                          >
                            <FolderOpen size={13} />
                            {isArabic ? "عرض الدروس" : "View Lessons"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* ══════════════════════════════════════
            Level 3 — Lessons for drillSubject
            ══════════════════════════════════════ */}
        {drillCourse && drillSubject && (
          <>
            <div className="mb-5 border-b border-slate-200 pb-5">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-indigo-700">
                {isArabic ? "دروس المادة" : "Lesson content"}
              </p>
              <h3 className="mt-1 text-2xl font-black text-slate-900">{drillSubject.name}</h3>
              {!drillLessonsLoading && (
                <p className="mt-1 text-sm text-slate-500">
                  {isArabic
                    ? `${drillLessons.length} درس`
                    : `${drillLessons.length} lesson${drillLessons.length !== 1 ? "s" : ""}`}
                </p>
              )}
            </div>

            {drillLessonsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
              </div>
            ) : drillLessons.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
                <p className="text-sm font-semibold text-slate-500">
                  {isArabic ? "لا توجد دروس في هذه المادة بعد." : "No lessons in this subject yet."}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {drillLessons.map((lesson, idx) => {
                  const isOpen      = drillExpandedLesson === lesson.id;
                  const attachments = drillAttachments[lesson.id] || [];
                  const attachLoading = drillAttachLoading[lesson.id] || false;
                  const videoAtt    = attachments.find((a) => String(a.fileType || a.type || a.mimeType || "").toUpperCase().includes("VIDEO"));
                  const videoUrl    = lesson.videoUrl || videoAtt?.url || videoAtt?.fileUrl || null;
                  const files       = attachments.filter((a) => !String(a.fileType || a.type || a.mimeType || "").toUpperCase().includes("VIDEO"));
                  const hasVideo    = Boolean(lesson.videoUrl) || attachments.some((a) => String(a.fileType || a.type || a.mimeType || "").toUpperCase().includes("VIDEO"));

                  const getExt = (a) => {
                    const n = a.originalName || a.name || "";
                    const d = n.lastIndexOf(".");
                    return d !== -1 ? n.slice(d + 1).toUpperCase() : (a.mimeType || "FILE").split("/").pop().toUpperCase();
                  };

                  return (
                    <div key={lesson.id} className="overflow-hidden rounded-2xl border border-slate-200">
                      <button
                        type="button"
                        onClick={() => toggleLesson(lesson.id)}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-50"
                      >
                        <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                          {idx + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-900">{lesson.title || lesson.name || "-"}</p>
                          {lesson.description ? (
                            <p className="mt-0.5 line-clamp-1 text-xs text-slate-400">{lesson.description}</p>
                          ) : null}
                        </div>
                        <div className="flex flex-shrink-0 items-center gap-2">
                          {lesson.videoUrl && (
                            <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">
                              {isArabic ? "فيديو" : "Video"}
                            </span>
                          )}
                          <span className="text-slate-400">{isOpen ? "▲" : "▼"}</span>
                        </div>
                      </button>

                      {isOpen && (
                        <div className="space-y-4 border-t border-slate-100 bg-slate-50 px-4 pb-4 pt-4">
                          {attachLoading ? (
                            <div className="flex items-center gap-2 text-xs text-slate-400">
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
                              {isArabic ? "جاري تحميل المحتوى..." : "Loading content..."}
                            </div>
                          ) : (
                            <>
                              {/* Video */}
                              {videoUrl ? (
                                <div>
                                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                                    {isArabic ? "الفيديو" : "Video"}
                                  </p>
                                  <video controls src={videoUrl} className="w-full rounded-xl bg-slate-900" style={{ maxHeight: 320 }} />
                                </div>
                              ) : !hasVideo ? (
                                <p className="text-xs text-slate-400">
                                  {isArabic ? "لا يوجد فيديو لهذا الدرس." : "No video for this lesson."}
                                </p>
                              ) : null}

                              {/* Non-video attachments */}
                              {files.length > 0 && (
                                <div>
                                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                                    {isArabic ? "المرفقات" : "Attachments"}
                                  </p>
                                  <div className="space-y-2">
                                    {files.map((att) => (
                                      <a
                                        key={att.id}
                                        href={att.fileUrl || att.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        download={att.originalName || att.name}
                                        className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50"
                                      >
                                        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-[10px] font-black text-indigo-600">
                                          {getExt(att)}
                                        </span>
                                        <span className="truncate">{att.originalName || att.name || "File"}</span>
                                        <span className="ml-auto flex-shrink-0 text-xs text-slate-400">↓</span>
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {!videoUrl && files.length === 0 && !hasVideo && attachments.length === 0 && (
                                <p className="text-xs text-slate-400">{isArabic ? "لا يوجد محتوى لهذا الدرس." : "No content for this lesson."}</p>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </InstructorLayout>
  );
}
