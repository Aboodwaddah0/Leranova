import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { BadgeCheck, Bell, ChevronDown, ChevronRight, Eye, FolderOpen, Search, UserCircle2, Trash2, Pencil } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { logout, setAuthSession } from "../redux/slices/authSlice";
import {
  createCourseSubject,
  createOrganizationCourse,
  createOrganizationTeacher,
  createOrganizationUser,
  createOrganizationUserWithGeneratedCredentials,
  deleteCourseSubject,
  deleteOrganizationCourse,
  fetchSubjectLessonsForOrg,
  deleteOrganizationTeacher,
  deleteOrganizationUser,
  addStudentToCourse,
  fetchCourseSubjects,
  fetchMyOrganizationProfile,
  fetchOrganizationCourses,
  fetchOrganizationRevenue,
  fetchOrganizationTeachers,
  fetchOrganizationUsers,
  fetchSchoolSettings,
  fetchStudentCourses,
  importUsersFromExcel,
  linkParentToStudents,
  removeStudentFromCourse,
  runAnnualPromotion,
  updateCourseSubject,
  updateMyOrganizationProfile,
  updateOrganizationCourse,
  updateOrganizationTeacher,
  updateOrganizationUser,
  updateSchoolSettings,
  fetchAcademicYears,
  createAcademicYear,
  fetchTerms,
  createTerm,
  updateTerm,
  reopenTerm,
  fetchOrganizationMarks,
} from "../services/organizationService";
import { useLanguage, getSubjectLabels } from "../utils/i18n";
import { notifyError, notifySuccess } from "../lib/notify";
import { formatGradeName } from "../utils/gradeHelpers";
import QuantumMeshBackground from "../components/ui/QuantumMeshBackground";
import Modal from "../components/ui/Modal";
import Pagination from "../components/ui/Pagination";

/* ─── Read-only lesson viewer used by org admins ──────────────────────── */
function LessonsViewModal({ open, subject, lessons, loading, isArabic, onClose }) {
  const [expandedId, setExpandedId] = useState(null);

  if (!open) return null;

  const nonVideoAttachments = (lesson) =>
    (lesson.attachments || []).filter(
      (a) => String(a.fileType || a.type || '').toUpperCase() !== 'VIDEO'
    );

  const ext = (a) => {
    const name = a.originalName || a.name || '';
    const dot = name.lastIndexOf('.');
    return dot !== -1 ? name.slice(dot + 1).toUpperCase() : (a.mimeType || 'FILE').split('/').pop().toUpperCase();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-[24px] border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 rounded-t-[24px] border-b border-slate-100 bg-white px-6 py-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-600">
              {isArabic ? "محتوى المادة" : "Subject content"}
            </p>
            <h2 className="mt-0.5 text-xl font-black text-slate-900">{subject?.name || ""}</h2>
            {!loading && (
              <p className="mt-1 text-xs text-slate-400">
                {isArabic
                  ? `${lessons.length} درس مُضاف من المدرس`
                  : `${lessons.length} lesson${lessons.length !== 1 ? 's' : ''} installed by teacher`}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="mt-1 rounded-xl border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-50"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
            </div>
          ) : lessons.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
              <p className="text-sm font-semibold text-slate-500">
                {isArabic
                  ? "لم يقم المدرس بإضافة أي دروس لهذه المادة بعد."
                  : "The teacher has not installed any lessons yet."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {lessons.map((lesson, idx) => {
                const open2 = expandedId === lesson.id;
                const files = nonVideoAttachments(lesson);
                return (
                  <div key={lesson.id} className="overflow-hidden rounded-2xl border border-slate-200">
                    {/* Lesson header row — click to expand */}
                    <button
                      type="button"
                      onClick={() => setExpandedId(open2 ? null : lesson.id)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-50"
                    >
                      <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                        {idx + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-900">{lesson.title || lesson.name || "-"}</p>
                        {lesson.description ? (
                          <p className="mt-0.5 text-xs text-slate-400 line-clamp-1">{lesson.description}</p>
                        ) : null}
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-2">
                        {lesson.videoUrl ? (
                          <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">
                            {isArabic ? "فيديو" : "Video"}
                          </span>
                        ) : null}
                        {files.length > 0 ? (
                          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                            {files.length} {isArabic ? "ملف" : "file(s)"}
                          </span>
                        ) : null}
                        <span className="text-slate-400">{open2 ? "▲" : "▼"}</span>
                      </div>
                    </button>

                    {/* Expanded content */}
                    {open2 && (
                      <div className="space-y-4 border-t border-slate-100 bg-slate-50 px-4 pb-4 pt-4">
                        {/* Video player */}
                        {lesson.videoUrl ? (
                          <div>
                            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                              {isArabic ? "الفيديو" : "Video"}
                            </p>
                            <video
                              controls
                              src={lesson.videoUrl}
                              className="w-full rounded-xl bg-slate-900"
                              style={{ maxHeight: 320 }}
                            />
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400">{isArabic ? "لا يوجد فيديو لهذا الدرس." : "No video for this lesson."}</p>
                        )}

                        {/* Attachments */}
                        {files.length > 0 ? (
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
                                    {ext(att)}
                                  </span>
                                  <span className="truncate">{att.originalName || att.name || "File"}</span>
                                  <span className="ml-auto flex-shrink-0 text-xs text-slate-400">↓</span>
                                </a>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const DEFAULT_COURSE_THUMBNAIL =
  "https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=600&auto=format&fit=crop&ixlib=rb-4.0.3";

const TABS = {
  OVERVIEW: "overview",
  TEACHERS: "teachers",
  COURSES: "courses",
  STUDENTS: "students",
  PARENTS: "parents",
  MARKS: "marks",
  SCHOOL: "school",
  FINANCE: "finance",
};

const AUTO_GRADE_RE = /^Auto-created grade course for level (\d+)$/i;
const translateCourseDescription = (desc, isArabic) => {
  if (!desc) return desc;
  const m = desc.match(AUTO_GRADE_RE);
  if (m && isArabic) return `تم إنشاء مسار الصف تلقائيًا للمستوى ${m[1]}`;
  return desc;
};

const safeError = (error) => {
  const responseData = error?.response?.data;
  const responseMessage = responseData?.message;
  const nestedErrorMessage = responseData?.error?.message || responseData?.error;
  const detailsMessage = Array.isArray(responseData?.errors)
    ? responseData.errors.map((item) => item?.message || item?.detail || String(item)).filter(Boolean).join(" | ")
    : typeof responseData?.details === "string"
      ? responseData.details
      : null;

  const message = responseMessage || nestedErrorMessage || detailsMessage || error?.message;
  if (message) {
    return message;
  }

  const requestUrl = String(error?.config?.url || error?.response?.config?.url || "");
  if (requestUrl.includes("/school-settings/promotions/run")) {
    return "تعذر تشغيل الترقية السنوية. تأكد من أن جميع الفصول مغلقة أو مقفلة وأن الدرجات مكتملة، ثم أعد المحاولة.";
  }

  return "Request failed";
};

const formatSkippedRows = (rows) => {
  return rows
    .map(({ index, name, reason }) => {
      const reason_str = reason || "Unknown validation issue";
      return `${index + 1}) ${name}${reason_str}`;
    })
    .join(" | ");
};



const normalizeText = (value) => String(value || "").trim().toLowerCase();

const getCourseThumbnailUrl = (thumbnail) => {
  const value = String(thumbnail || "").trim();
  return value || DEFAULT_COURSE_THUMBNAIL;
};

const includesQuery = (fields, query) => {
  const q = normalizeText(query);
  if (!q) {
    return true;
  }

  return fields.some((field) => normalizeText(field).includes(q));
};

const triggerBlobDownload = (blob, fileName) => {
  if (!blob) {
    return;
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const toCsvCell = (value) => {
  const normalized = value === undefined || value === null ? "" : String(value);
  return `"${normalized.replace(/"/g, '""')}"`;
};

const downloadCsvFromRows = (fileName, headers, rows) => {
  const csv = [headers, ...rows]
    .map((row) => row.map(toCsvCell).join(","))
    .join("\r\n");

  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv; charset=utf-8" });
  triggerBlobDownload(blob, fileName);
};

const copyCredentialsToClipboard = async (email, password) => {
  const value = `${email || "-"} / ${password || "-"}`;
  if (!navigator?.clipboard?.writeText) {
    return;
  }

  try {
    await navigator.clipboard.writeText(value);
  } catch {
    // Ignore clipboard failures and keep UI flow successful.
  }
};

const loadImageFromFile = (file) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Unable to read the selected image'));
    };

    image.src = objectUrl;
  });

const prepareCourseThumbnailFile = async (file) => {
  if (!file || !String(file.type || '').startsWith('image/')) {
    return file || null;
  }

  const image = await loadImageFromFile(file);
  const targetSize = 1200;
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  const squareSize = Math.min(sourceWidth, sourceHeight);
  const sourceX = Math.max(0, Math.floor((sourceWidth - squareSize) / 2));
  const sourceY = Math.max(0, Math.floor((sourceHeight - squareSize) / 2));

  const canvas = document.createElement('canvas');
  canvas.width = targetSize;
  canvas.height = targetSize;

  const context = canvas.getContext('2d');
  if (!context) {
    return file;
  }

  context.drawImage(image, sourceX, sourceY, squareSize, squareSize, 0, 0, targetSize, targetSize);

  const blob = await new Promise((resolve) => {
    canvas.toBlob((result) => resolve(result), 'image/jpeg', 0.84);
  });

  if (!blob) {
    return file;
  }

  return new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
    type: 'image/jpeg',
    lastModified: Date.now(),
  });
};

export default function OrganizationWorkspacePage() {
  const dispatch = useDispatch();
  const { lang, isArabic, t, toggleLang } = useLanguage();
  const auth = useSelector((state) => state.auth);
  const organization = auth.user || {};
  const [organizationProfile, setOrganizationProfile] = useState(organization);
  const organizationType = String((organizationProfile?.type || organization?.type || organizationProfile?.Role || organization?.Role) || "").toUpperCase();
  const isSchool = organizationType === "SCHOOL";
  const isAcademy = organizationType === "ACADEMY";
  const canManageCourses = isSchool || isAcademy;
  const sl = getSubjectLabels(isAcademy, isArabic);

  const [activeTab, setActiveTab] = useState(TABS.OVERVIEW);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [teachers, setTeachers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [subjectsByCourse, setSubjectsByCourse] = useState({});
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [subjectsLoading, setSubjectsLoading] = useState(false);

  // Drill-down navigation state
  const [drillCourse,          setDrillCourse]          = useState(null);
  const [drillSubject,         setDrillSubject]          = useState(null);
  const [drillSubjects,        setDrillSubjects]         = useState([]);
  const [drillSubjectsLoading, setDrillSubjectsLoading] = useState(false);
  const [drillLessons,         setDrillLessons]          = useState([]);
  const [drillLessonsLoading,  setDrillLessonsLoading]  = useState(false);
  const [drillExpandedLesson,  setDrillExpandedLesson]  = useState(null);
  const [subjectSelectionTouched, setSubjectSelectionTouched] = useState(false);
  const [subjectsFilterInitialized, setSubjectsFilterInitialized] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [confirmDelete, setConfirmDelete] = useState({
    open: false,
    title: "",
    label: "",
    onConfirm: null,
  });
  const [users, setUsers] = useState([]);

  // Academic Year & Terms state
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [yearTerms, setYearTerms] = useState([]);

  useEffect(() => {
    const active = academicYears.find(y => y.isActive);
    if (!active) return;
    const start = new Date(active.startDate);
    const end = new Date(active.endDate);
    setSchoolForm(f => ({
      ...f,
      schoolYearStartMonth: start.getUTCMonth() + 1,
      schoolYearStartDay: start.getUTCDate(),
      promotionMonth: end.getUTCMonth() + 1,
      promotionDay: end.getUTCDate(),
    }));
  }, [academicYears]);
  const [academicYearLoading, setAcademicYearLoading] = useState(false);
  const [yearModal, setYearModal] = useState(false);
  const [yearWizardStep, setYearWizardStep] = useState(1);
  const [yearForm, setYearForm] = useState({ name: "", startDate: "", endDate: "", numberOfTerms: 1 });
  const [termForm, setTermForm] = useState({ termNumber: 1, name: "", startDate: "", endDate: "", changeReason: "" });
  const [editTermModal, setEditTermModal] = useState(null); // { term, changeReason, endDate }
  const [reopenModal, setReopenModal] = useState(null);    // { term, changeReason }

  const [organizationRevenue, setOrganizationRevenue] = useState(null);

  const [profileForm, setProfileForm] = useState({
    Name: organization?.Name || "",
    Email: organization?.Email || "",
    subdomain: organization?.subdomain || "",
    Phone: organization?.Phone || organization?.PhoneNumber || "",
    Address: organization?.Address || "",
    Description: organization?.Description || "",
    Founded: organization?.Founded ? String(organization.Founded).slice(0, 10) : "",
    password: "",
  });

  const [teacherForm, setTeacherForm] = useState({
    id: null,
    name: "",
    email: "",
    password: "",
    specialization: "",
    bio: "",
  });
  const [teacherEmailAuto, setTeacherEmailAuto] = useState(false);

  const [courseForm, setCourseForm] = useState({
    id: null,
    Name: "",
    Description: "",
    Thumbnail: "",
    Teacher_id: "",
    Start: "",
    End: "",
    price: "",
    isPaid: false,
    GradeLevel: "",
    level: "",
  });
  const [courseThumbnailFile, setCourseThumbnailFile] = useState(null);
  const [courseThumbnailPreview, setCourseThumbnailPreview] = useState("");

  const [subjectForm, setSubjectForm] = useState({
    id: null,
    name: "",
    Description: "",
    Teacher_id: "",
    isPaid: false,
    price: "",
    level: "",
    imageUrl: "",
  });
  const [subjectImageFile, setSubjectImageFile] = useState(null);
  const [subjectImagePreview, setSubjectImagePreview] = useState("");

  const [studentForm, setStudentForm] = useState({
    id: null,
    name: "",
    email: "",
    password: "",
    age: "",
    gender: "MALE",
    address: "",
    dob: "",
    parentNationalId: "",
  });
  const [studentEmailAuto, setStudentEmailAuto] = useState(false);

  const [parentForm, setParentForm] = useState({
    id: null,
    name: "",
    email: "",
    password: "",
    address: "",
  });
  const [parentEmailAuto, setParentEmailAuto] = useState(false);
  const [isLinkDrawerOpen, setIsLinkDrawerOpen] = useState(false);
  const [linkTargetParent, setLinkTargetParent] = useState(null);
  const [linkSearchTerm, setLinkSearchTerm] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);

  const [isEnrollmentModalOpen, setIsEnrollmentModalOpen] = useState(false);
  const [enrollmentTargetStudent, setEnrollmentTargetStudent] = useState(null);
  const [studentEnrollments, setStudentEnrollments] = useState([]);

  const [teacherSearch, setTeacherSearch] = useState("");
  const [teacherTrack, setTeacherTrack] = useState("ALL");
  const [teacherPage, setTeacherPage] = useState(1);
  const [studentPage, setStudentPage] = useState(1);
  const [parentPage, setParentPage] = useState(1);
  const [courseSearch, setCourseSearch] = useState("");
  const [courseTrack, setCourseTrack] = useState("ALL");
  const [coursePrice, setCoursePrice] = useState("ALL");
  const [subjectSearch, setSubjectSearch] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [studentStatus, setStudentStatus] = useState("ALL");
  const [parentSearch, setParentSearch] = useState("");
  const [parentLinkFilter, setParentLinkFilter] = useState("ALL");
  const [studentGenderFilter, setStudentGenderFilter] = useState("ALL");

  const [schoolForm, setSchoolForm] = useState({
    schoolYearStartMonth: 9,
    schoolYearStartDay: 1,
    promotionMonth: 9,
    promotionDay: 1,
    entryGradeMinAge: 6,
    passThresholdPercentage: 50,
    minSubjectPassPercentage: 50,
    requireAllSubjectsPass: true,
    classRanges: [
      {
        startGradeLevel: 1,
        endGradeLevel: 5,
      },
    ],
  });
  const [schoolSettingsModalOpen, setSchoolSettingsModalOpen] = useState(false);
  const [showPromotionConfirm, setShowPromotionConfirm] = useState(false);

  // ── Marks tab state ────────────────────────────────────────────────────────
  const [orgMarks, setOrgMarks] = useState([]);
  const [marksLoading, setMarksLoading] = useState(false);
  const [marksFilters, setMarksFilters] = useState({ gradeLevel: '', subjectId: '', studentName: '', yearId: '', termId: '', markType: '' });
  const [marksTerms, setMarksTerms] = useState([]);

  const [credentialsModal, setCredentialsModal] = useState({ open: false, name: "", email: "", password: "" });
  const [bulkCredentialsModal, setBulkCredentialsModal] = useState({ open: false, users: [] });
  const [teacherModalOpen, setTeacherModalOpen] = useState(false);
  const [courseModalOpen, setCourseModalOpen] = useState(false);
  const [subjectModalOpen, setSubjectModalOpen] = useState(false);
  const [lessonsModalOpen, setLessonsModalOpen] = useState(false);
  const [lessonsModalSubject, setLessonsModalSubject] = useState(null);
  const [lessonsModalData, setLessonsModalData] = useState([]);
  const [lessonsModalLoading, setLessonsModalLoading] = useState(false);
  const [studentModalOpen, setStudentModalOpen] = useState(false);
  const [parentModalOpen, setParentModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  const studentUsers = useMemo(
    () => users.filter((user) => String(user.role || "").toUpperCase() === "STUDENT"),
    [users],
  );

  const parentUsers = useMemo(
    () => users.filter((user) => String(user.role || "").toUpperCase() === "PARENT"),
    [users],
  );

  const teachersWithPasswords = teachers;

  const parentNameById = useMemo(() => {
    const map = new Map();
    for (const parent of parentUsers) {
      map.set(Number(parent.id), parent.name || "-");
    }
    return map;
  }, [parentUsers]);

  const childrenByParentId = useMemo(() => {
    const map = new Map();
    for (const student of studentUsers) {
      const parentId = Number(student?.student?.Parent_id);
      if (!Number.isInteger(parentId) || parentId <= 0) {
        continue;
      }

      const list = map.get(parentId) || [];
      list.push({
        id: Number(student?.id),
        name: student?.name || "-",
      });
      map.set(parentId, list);
    }
    return map;
  }, [studentUsers]);

  const linkedParentIds = useMemo(() => {
    const ids = new Set();
    for (const student of studentUsers) {
      const parentId = Number(student?.student?.Parent_id);
      if (Number.isInteger(parentId) && parentId > 0) {
        ids.add(parentId);
      }
    }
    return ids;
  }, [studentUsers]);

  const currentSubjects = useMemo(() => {
    return selectedCourseId ? subjectsByCourse[selectedCourseId] || [] : [];
  }, [selectedCourseId, subjectsByCourse]);

  const teacherOptions = useMemo(() => {
    return teachersWithPasswords
      .map((teacher) => {
        const label = teacher?.user?.name || teacher?.name || `#${teacher.id}`;
        const id = teacher.id || teacher.Teacher_id;
        return { id, label };
      })
      .filter((option) => option.id);
  }, [teachersWithPasswords]);

  const filteredTeachers = useMemo(() => {
    return teachersWithPasswords.filter((teacher) => {
      const matchesTrack = teacherTrack === "ALL" || normalizeText(teacher?.specialization) === normalizeText(teacherTrack);
      const matchesSearch = includesQuery([
        teacher?.user?.name,
        teacher?.user?.email,
        teacher?.specialization,
        teacher?.bio,
      ], teacherSearch);

      return matchesTrack && matchesSearch;
    });
  }, [teachersWithPasswords, teacherSearch, teacherTrack]);

  const teacherTrackOptions = useMemo(() => {
    const tracks = new Set();
    teachersWithPasswords.forEach((teacher) => {
      const value = String(teacher?.specialization || "").trim();
      if (value) {
        tracks.add(value);
      }
    });
    return Array.from(tracks);
  }, [teachersWithPasswords]);

  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      const trackLabel = formatGradeName(course, isSchool, isArabic) || course?.Name || course?.name || "";
      const priceLabel = course?.isPaid ? "PAID" : "FREE";
      const matchesTrack = courseTrack === "ALL" || normalizeText(trackLabel) === normalizeText(courseTrack);
      const matchesPrice = coursePrice === "ALL" || normalizeText(priceLabel) === normalizeText(coursePrice);
      const matchesSearch = includesQuery([
        course?.Name,
        course?.Description,
        course?.Teacher_name,
      ], courseSearch);

      return matchesTrack && matchesPrice && matchesSearch;
    });
  }, [courses, courseSearch, courseTrack, coursePrice, isSchool, isArabic]);

  const courseTrackOptions = useMemo(() => {
    const tracks = new Set();
    courses.forEach((course) => {
      const label = formatGradeName(course, isSchool, isArabic) || course?.Name || course?.name || "";
      if (label) {
        tracks.add(label);
      }
    });
    return Array.from(tracks);
  }, [courses, isSchool, isArabic]);

  const filteredSubjects = useMemo(() => {
    return currentSubjects.filter((subject) => {
      const teacherId = Number(subject?.Teacher_id || subject?.teacher?.user?.id || 0);
      const matchesTeacher = !selectedTeacherId || teacherId === Number(selectedTeacherId);

      const courseName = subject?.course?.Name || subject?.course?.name || "";
      const gradeLabel = formatGradeName(subject?.course, isSchool, isArabic) || "";

      const matchesSearch = includesQuery([
        subject?.name,
        subject?.Description,
        subject?.teacher?.user?.name,
        courseName,
        gradeLabel,
      ], subjectSearch);

      return matchesTeacher && matchesSearch;
    });
  }, [currentSubjects, subjectSearch, selectedTeacherId, isArabic, isSchool]);

  const sortedSubjectCourses = useMemo(() => {
    const list = Array.isArray(courses) ? [...courses] : [];

    if (isSchool) {
      list.sort((a, b) => {
        const aLevel = Number(a?.GradeLevel ?? a?.gradeLevel ?? Number.MAX_SAFE_INTEGER);
        const bLevel = Number(b?.GradeLevel ?? b?.gradeLevel ?? Number.MAX_SAFE_INTEGER);
        if (aLevel !== bLevel) return aLevel - bLevel;
        return Number(a?.id || 0) - Number(b?.id || 0);
      });
      return list;
    }

    list.sort((a, b) => Number(a?.id || 0) - Number(b?.id || 0));
    return list;
  }, [courses, isSchool]);

  const shouldShowSubjectsEmptyState =
    subjectSelectionTouched && !subjectsLoading && selectedCourseId && filteredSubjects.length === 0;

  const filteredStudents = useMemo(() => {
    return studentUsers.filter((student) => {
      const matchesSearch = includesQuery([
        student?.name,
        student?.email,
        student?.address,
        student?.age,
      ], studentSearch);

      const gender = normalizeText(student?.gender);
      const matchesGender = studentGenderFilter === "ALL" || gender === normalizeText(studentGenderFilter);
      const statusValue = normalizeText(student?.status || student?.Status || student?.student?.status);
      const matchesStatus = studentStatus === "ALL" || statusValue === normalizeText(studentStatus);

      return matchesSearch && matchesGender && matchesStatus;
    });
  }, [studentUsers, studentSearch, studentGenderFilter, studentStatus]);

  const filteredParents = useMemo(() => {
    return parentUsers.filter((parent) => {
      const matchesSearch = includesQuery([
        parent?.name,
        parent?.email,
        parent?.address,
      ], parentSearch);

      const isLinked = linkedParentIds.has(Number(parent?.id));
      const matchesLink = parentLinkFilter === "ALL"
        || (parentLinkFilter === "LINKED" && isLinked)
        || (parentLinkFilter === "UNLINKED" && !isLinked);

      return matchesSearch && matchesLink;
    });
  }, [parentUsers, parentSearch, parentLinkFilter, linkedParentIds]);

  const TEACHER_PAGE_SIZE = 10;
  const STUDENT_PAGE_SIZE = 15;
  const PARENT_PAGE_SIZE  = 15;

  useEffect(() => { setTeacherPage(1); }, [teacherSearch, teacherTrack]);
  useEffect(() => { setStudentPage(1); }, [studentSearch, studentGenderFilter, studentStatus]);
  useEffect(() => { setParentPage(1);  }, [parentSearch, parentLinkFilter]);

  const pagedTeachers  = useMemo(() => filteredTeachers.slice((teacherPage - 1) * TEACHER_PAGE_SIZE, teacherPage * TEACHER_PAGE_SIZE),  [filteredTeachers, teacherPage]);
  const pagedStudents  = useMemo(() => filteredStudents.slice((studentPage - 1) * STUDENT_PAGE_SIZE, studentPage * STUDENT_PAGE_SIZE),  [filteredStudents, studentPage]);
  const pagedParents   = useMemo(() => filteredParents.slice((parentPage  - 1) * PARENT_PAGE_SIZE,  parentPage  * PARENT_PAGE_SIZE),   [filteredParents,  parentPage]);

  const linkCandidateStudents = useMemo(() => {
    return studentUsers.filter((student) => {
      const parentId = Number(student?.student?.Parent_id);
      return !Number.isInteger(parentId) || parentId <= 0;
    });
  }, [studentUsers]);

  const filteredLinkCandidateStudents = useMemo(() => {
    return linkCandidateStudents.filter((student) => includesQuery([
      student?.name,
      student?.email,
      String(student?.id || ""),
    ], linkSearchTerm));
  }, [linkCandidateStudents, linkSearchTerm]);

  // ── Client-side marks filtering (instant — no API call) ──────────────────
  const visibleOrgMarks = useMemo(() => {
    const { gradeLevel, subjectId, studentName, termId, markType } = marksFilters;
    const nameQ = studentName.trim().toLowerCase();
    const term  = termId ? marksTerms.find((t) => String(t.id) === String(termId)) : null;
    const dateFrom = term?.startDate ? new Date(term.startDate) : null;
    const dateTo   = term?.endDate   ? new Date(term.endDate)   : null;

    return orgMarks.filter((m) => {
      if (gradeLevel && String(m.subject?.course?.GradeLevel) !== String(gradeLevel)) return false;
      if (subjectId  && String(m.Subject_id) !== String(subjectId)) return false;
      if (markType   && m.MarkType !== markType) return false;
      if (nameQ && !(m.student?.user?.name || '').toLowerCase().includes(nameQ)) return false;
      if (dateFrom || dateTo) {
        if (!m.time) return false;
        const d = new Date(m.time);
        if (dateFrom && d < dateFrom) return false;
        if (dateTo   && d > dateTo)   return false;
      }
      return true;
    });
  }, [orgMarks, marksFilters, marksTerms]);

  const overviewStats = useMemo(() => {
    const totalStudents = studentUsers.length;
    const totalTeachers = teachers.length;
    const totalCourses = courses.length;
    const totalSubjects = Object.values(subjectsByCourse).reduce((acc, list) => {
      if (!Array.isArray(list)) {
        return acc;
      }
      return acc + list.length;
    }, 0);

    return {
      totalStudents,
      totalTeachers,
      totalCourses,
      totalSubjects,
      totalUsers: users.length,
    };
  }, [studentUsers.length, teachers.length, courses.length, subjectsByCourse, users.length]);

  const formatMoney = (amount) => {
    const value = Number(amount || 0);
    return new Intl.NumberFormat(isArabic ? "ar-EG" : "en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    }).format(value);
  };

  const loadInitialData = async () => {
    setLoading(true);
    setError("");

    try {
      const [profileResult, teachersResult, coursesResult, usersResult, revenueResult] = await Promise.allSettled([
        fetchMyOrganizationProfile(),
        fetchOrganizationTeachers(),
        fetchOrganizationCourses(),
        fetchOrganizationUsers(),
        isAcademy ? fetchOrganizationRevenue() : Promise.resolve(null),
      ]);

      const criticalFailure = [profileResult, teachersResult, coursesResult, usersResult].find(
        (result) => result.status === "rejected",
      );

      if (criticalFailure) {
        throw criticalFailure.reason;
      }

      const profileData = profileResult.value;
      const teachersData = teachersResult.value;
      const coursesData = coursesResult.value;
      const usersData = usersResult.value;
      const revenueData = revenueResult.status === "fulfilled" ? revenueResult.value : null;

      setOrganizationProfile(profileData || organization);
      setProfileForm({
        Name: profileData?.Name || "",
        Email: profileData?.Email || "",
        subdomain: profileData?.subdomain || "",
        Phone: profileData?.Phone || profileData?.PhoneNumber || "",
        Address: profileData?.Address || "",
        Description: profileData?.Description || "",
        Founded: profileData?.Founded ? String(profileData.Founded).slice(0, 10) : "",
        password: "",
      });

      setTeachers(teachersData);
      setCourses(coursesData);
      setUsers(usersData);
      setOrganizationRevenue(isAcademy ? revenueData : null);

      // Do not auto-select the first course so the Students tab shows all students by default.
      // The selected course will be set when the user explicitly selects one in the UI.

      if (isSchool) {
        const settings = await fetchSchoolSettings();
        const years = await fetchAcademicYears().catch(() => []);
        setAcademicYears(years);
        if (settings) {
          setSchoolForm({
            schoolYearStartMonth: Number(settings.schoolYearStartMonth || 9),
            schoolYearStartDay: Number(settings.schoolYearStartDay || 1),
            promotionMonth: Number(settings.promotionMonth || 9),
            promotionDay: Number(settings.promotionDay || 1),
            entryGradeMinAge: Number(settings.entryGradeMinAge || 6),
            passThresholdPercentage: Number(settings.passThresholdPercentage || 50),
            minSubjectPassPercentage: Number(settings.minSubjectPassPercentage || 50),
            requireAllSubjectsPass: Boolean(settings.requireAllSubjectsPass),
            classRanges: Array.isArray(settings.classRanges) ? settings.classRanges : [],
          });
        }
      }
    } catch (err) {
      setError(safeError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const loadFilteredUsers = async () => {
      try {
        setLoading(true);
        const params = {};
        if (selectedCourseId) params.courseId = selectedCourseId;
        const nextUsers = await fetchOrganizationUsers(params);
        if (!cancelled) setUsers(nextUsers);
      } catch {
        // ignore filter errors silently
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    // Load filtered users whenever selectedCourseId changes OR activeTab becomes STUDENTS
    if (activeTab === TABS.STUDENTS || selectedCourseId) {
      loadFilteredUsers();
    }

    return () => {
      cancelled = true;
    };
  }, [selectedCourseId, activeTab]);

  useEffect(() => {
    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSchool, isAcademy]);

  // ── Load ALL marks once when the MARKS tab is first opened ────────────────
  // Filtering is done client-side in visibleOrgMarks — no re-fetch on filter change.
  const [marksLoaded, setMarksLoaded] = useState(false);
  useEffect(() => {
    if (activeTab !== TABS.MARKS || marksLoaded) return;
    let cancelled = false;
    setMarksLoading(true);
    fetchOrganizationMarks()
      .then((data) => { if (!cancelled) { setOrgMarks(data); setMarksLoaded(true); } })
      .catch(() => { if (!cancelled) setOrgMarks([]); })
      .finally(() => { if (!cancelled) setMarksLoading(false); });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const refreshOrgMarks = () => {
    setMarksLoading(true);
    fetchOrganizationMarks()
      .then(setOrgMarks)
      .catch(() => setOrgMarks([]))
      .finally(() => setMarksLoading(false));
  };

  // Load terms when year filter changes (lightweight — only fired on year select)
  useEffect(() => {
    if (!marksFilters.yearId) { setMarksTerms([]); return; }
    fetchTerms(Number(marksFilters.yearId)).then(setMarksTerms).catch(() => setMarksTerms([]));
  }, [marksFilters.yearId]);

  const loadSubjectsForCourse = async (courseId, options = {}) => {
    const force = Boolean(options.force);
    if (!courseId) {
      return [];
    }

    if (!force && subjectsByCourse[courseId]) {
      return subjectsByCourse[courseId];
    }

    try {
      const subjects = await fetchCourseSubjects(courseId);
      setSubjectsByCourse((prev) => ({ ...prev, [courseId]: subjects }));
      return subjects;
    } catch (err) {
      setError(safeError(err));
      return [];
    }
  };

  useEffect(() => {
    loadSubjectsForCourse(selectedCourseId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCourseId]);

  useEffect(() => {
    if (activeTab !== "subjects" || subjectsFilterInitialized || sortedSubjectCourses.length === 0) {
      return;
    }

    let cancelled = false;

    const chooseDefaultSelection = async () => {
      setSubjectsLoading(true);

      try {
        let fallbackId = Number(sortedSubjectCourses[0]?.id || 0) || null;
        let bestId = fallbackId;

        for (const course of sortedSubjectCourses) {
          const candidateId = Number(course?.id || 0);
          if (!candidateId) {
            continue;
          }

          const subjects = await loadSubjectsForCourse(candidateId);
          if (!fallbackId) {
            fallbackId = candidateId;
          }

          if (Array.isArray(subjects) && subjects.length > 0) {
            bestId = candidateId;
            break;
          }
        }

        if (!cancelled) {
          setSelectedCourseId(bestId || fallbackId || null);
          setSubjectSelectionTouched(false);
          setSubjectsFilterInitialized(true);
        }
      } finally {
        if (!cancelled) {
          setSubjectsLoading(false);
        }
      }
    };

    chooseDefaultSelection();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, sortedSubjectCourses, subjectsFilterInitialized]);

  const handleSubjectsCourseChange = async (nextCourseId) => {
    setSubjectSelectionTouched(true);
    setSelectedCourseId(nextCourseId || null);
    if (!nextCourseId) {
      return;
    }

    setSubjectsLoading(true);
    await loadSubjectsForCourse(nextCourseId);
    setSubjectsLoading(false);
  };

  useEffect(() => {
    if (error) {
      notifyError(error);
    }
  }, [error]);

  useEffect(() => {
    if (success) {
      notifySuccess(success);
    }
  }, [success]);

  useEffect(() => {
    if (!isLinkDrawerOpen) {
      return undefined;
    }

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setIsLinkDrawerOpen(false);
        setLinkTargetParent(null);
        setLinkSearchTerm("");
        setSelectedStudentIds([]);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isLinkDrawerOpen]);

  const setField = (setter) => (event) => {
    const { name, value, type, checked } = event.target;
    setter((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const resetTeacherForm = () => {
    setTeacherForm({ id: null, name: "", email: "", password: "", specialization: "", bio: "" });
    setTeacherEmailAuto(false);
  };

  const resetCourseForm = () => {
    setCourseForm({
      id: null,
      Name: "",
      Description: "",
      Thumbnail: "",
      Teacher_id: "",
      Start: "",
      End: "",
      price: "",
      isPaid: false,
    });
    setCourseThumbnailFile(null);
    setCourseThumbnailPreview("");
  };

  useEffect(() => {
    return () => {
      if (courseThumbnailPreview && courseThumbnailPreview.startsWith("blob:")) {
        URL.revokeObjectURL(courseThumbnailPreview);
      }
    };
  }, [courseThumbnailPreview]);

  const handleCourseThumbnailChange = (event) => {
    const file = event.target.files?.[0] || null;

    if (!file) {
      setCourseThumbnailFile(null);
      setCourseThumbnailPreview("");
      setCourseForm((prev) => ({
        ...prev,
        Thumbnail: "",
      }));
      return;
    }

    setCourseForm((prev) => ({
      ...prev,
      Thumbnail: "",
    }));

    prepareCourseThumbnailFile(file)
      .then((preparedFile) => {
        setCourseThumbnailFile(preparedFile);
        setCourseThumbnailPreview(URL.createObjectURL(preparedFile));
      })
      .catch(() => {
        setCourseThumbnailFile(null);
        setCourseThumbnailPreview("");
      });
  };

  const clearCourseThumbnail = () => {
    setCourseThumbnailFile(null);
    setCourseThumbnailPreview("");
    setCourseForm((prev) => ({
      ...prev,
      Thumbnail: "",
    }));
  };

  const _handleCoursePaidToggle = (event) => {
    const checked = event.target.checked;
    setCourseForm((prev) => ({
      ...prev,
      isPaid: checked,
      price: checked ? prev.price : "",
    }));
  };

  const openLessonsModal = async (subject) => {
    setLessonsModalSubject(subject);
    setLessonsModalData([]);
    setLessonsModalOpen(true);
    setLessonsModalLoading(true);
    try {
      const lessons = await fetchSubjectLessonsForOrg(subject.id);
      setLessonsModalData(lessons);
    } catch {
      setLessonsModalData([]);
    } finally {
      setLessonsModalLoading(false);
    }
  };

  const enterCourse = async (course) => {
    setDrillCourse(course);
    setDrillSubject(null);
    setDrillLessons([]);
    setDrillExpandedLesson(null);
    setDrillSubjects([]);
    setDrillSubjectsLoading(true);
    try {
      const data = await fetchCourseSubjects(course.id);
      setDrillSubjects(data || []);
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
    setDrillLessonsLoading(true);
    try {
      const data = await fetchSubjectLessonsForOrg(subject.id);
      setDrillLessons(data || []);
    } catch {
      setDrillLessons([]);
    } finally {
      setDrillLessonsLoading(false);
    }
  };

  const resetSubjectForm = () => {
    setSubjectForm({ id: null, name: "", Description: "", Teacher_id: "", isPaid: false, price: "", level: "", imageUrl: "" });
    setSubjectImageFile(null);
    setSubjectImagePreview("");
  };

  const resetStudentForm = () => {
    setStudentForm({ id: null, name: "", email: "", password: "", age: "", gender: "MALE", address: "", dob: "", parentNationalId: "" });
    setStudentEmailAuto(false);
  };

  const resetParentForm = () => {
    setParentForm({ id: null, name: "", email: "", password: "", address: "" });
    setParentEmailAuto(false);
  };

  const handleAction = async (work, successMessage) => {
    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      const customSuccessMessage = await work();
      setSuccess(customSuccessMessage || successMessage);
    } catch (err) {
      setError(safeError(err));
    } finally {
      setActionLoading(false);
    }
  };

  const closeDeleteConfirm = () => {
    setConfirmDelete({ open: false, title: "", label: "", onConfirm: null });
  };

  const openDeleteConfirm = ({ title, label, onConfirm }) => {
    setConfirmDelete({
      open: true,
      title,
      label,
      onConfirm,
    });
  };

  const saveTeacher = async (event) => {
    event.preventDefault();

    await handleAction(async () => {
      if (teacherForm.id) {
        await updateOrganizationTeacher(teacherForm.id, {
          name: teacherForm.name,
          specialization: teacherForm.specialization || undefined,
          bio: teacherForm.bio || undefined,
        });
        const next = await fetchOrganizationTeachers();
        setTeachers(next);
        resetTeacherForm();
        setTeacherModalOpen(false);
      } else if (teacherEmailAuto) {
        const generated = await createOrganizationUserWithGeneratedCredentials({
          name: teacherForm.name,
          role: "TEACHER",
          specialization: teacherForm.specialization || undefined,
          bio: teacherForm.bio || undefined,
        });
        const generatedTeacherId = generated?.data?.id;
        if (generatedTeacherId && (teacherForm.specialization || teacherForm.bio)) {
          await updateOrganizationTeacher(generatedTeacherId, {
            specialization: teacherForm.specialization || undefined,
            bio: teacherForm.bio || undefined,
          });
        }
        const next = await fetchOrganizationTeachers();
        setTeachers(next);
        resetTeacherForm();
        setTeacherModalOpen(false);
        const email = generated?.credentials?.email || "-";
        const password = generated?.credentials?.password || "-";
        setCredentialsModal({ open: true, name: teacherForm.name, email, password });
        return isArabic ? "تم إنشاء حساب المدرس" : "Teacher account created";
      } else {
        const created = await createOrganizationTeacher({
          name: teacherForm.name,
          email: teacherForm.email,
          specialization: teacherForm.specialization || undefined,
          bio: teacherForm.bio || undefined,
        });
        const next = await fetchOrganizationTeachers();
        setTeachers(next);
        resetTeacherForm();
        setTeacherModalOpen(false);
        const tempPassword = created?.data?.tempPassword || "-";
        setCredentialsModal({ open: true, name: teacherForm.name, email: teacherForm.email, password: tempPassword });
        return isArabic ? "تم إنشاء حساب المدرس" : "Teacher account created";
      }
    }, t.organization.messages.teacherSaved);
  };

  const saveProfile = async (event) => {
    event.preventDefault();

    const payload = {
      Name: profileForm.Name,
      Email: profileForm.Email,
      subdomain: profileForm.subdomain,
      Phone: profileForm.Phone,
      Address: profileForm.Address,
      Description: profileForm.Description,
      Founded: profileForm.Founded || undefined,
      password: profileForm.password || undefined,
    };

    await handleAction(async () => {
      const updated = await updateMyOrganizationProfile(payload);
      setOrganizationProfile(updated);
      setProfileForm((prev) => ({
        ...prev,
        password: "",
      }));

      dispatch(setAuthSession({
        token: auth.token,
        role: auth.role,
        user: updated,
      }));
      setProfileModalOpen(false);
    }, t.organization.messages.profileSaved);
  };

  const openCourseEditor = (course) => {
    setCourseForm({
      id: course.id,
      Name: course.Name,
      Description: course.Description || "",
      Thumbnail: course.Thumbnail || "",
      price: isAcademy && course.price != null ? String(course.price) : "",
      isPaid: isAcademy ? Boolean(course.isPaid) : false,
      GradeLevel: course.GradeLevel || course.gradeLevel || "",
      level: course.level || "",
    });
    setCourseThumbnailFile(null);
    setCourseThumbnailPreview(course.Thumbnail || "");
    setCourseModalOpen(true);
  };

  const saveCourse = async (event) => {
    event.preventDefault();

    if (!canManageCourses) {
      return;
    }

    const payload = new FormData();
    payload.append("Name", courseForm.Name);

    if (courseForm.Description) {
      payload.append("Description", courseForm.Description);
    }

    if (courseThumbnailFile) {
      payload.append("thumbnail", courseThumbnailFile);
    }

    if (courseForm.Thumbnail) {
      payload.append("Thumbnail", courseForm.Thumbnail);
    }

    if (!isSchool && courseForm.level) {
      payload.append("level", courseForm.level);
    }

    await handleAction(async () => {
      if (courseForm.id) {
        await updateOrganizationCourse(courseForm.id, payload);
      } else {
        await createOrganizationCourse(payload);
      }
      const next = await fetchOrganizationCourses();
      setCourses(next);
      if (!selectedCourseId && next.length) {
        setSelectedCourseId(next[0].id);
      }
      resetCourseForm();
      setCourseModalOpen(false);
    }, t.organization.messages.courseSaved);
  };

  const saveSubject = async (event) => {
    event.preventDefault();
    if (!selectedCourseId) {
      return;
    }

    // Validation: if isPaid is true, price must be > 0
    if (isAcademy && subjectForm.isPaid) {
      const price = Number(subjectForm.price || 0);
      if (price <= 0) {
        setError(isArabic 
          ? "سعر المادة المدفوعة يجب أن يكون أكبر من صفر"
          : "Paid subject price must be greater than 0"
        );
        return;
      }
    }

    await handleAction(async () => {
      let imageUrl = subjectForm.imageUrl || "";
      if (subjectImageFile) {
        const fd = new FormData();
        fd.append("image", subjectImageFile);
        const res = await fetch(`/api/courses/${selectedCourseId}/subjects/upload-image`, { method: "POST", body: fd, headers: { Authorization: `Bearer ${localStorage.getItem("learnova_token")}` } });
        if (res.ok) { const json = await res.json(); imageUrl = json?.data?.imageUrl || imageUrl; }
      }

      const payload = {
        name: subjectForm.name,
        Description: subjectForm.Description || undefined,
        ...(subjectForm.Teacher_id ? { Teacher_id: Number(subjectForm.Teacher_id) } : {}),
        ...(isAcademy ? { isPaid: Boolean(subjectForm.isPaid), price: subjectForm.isPaid ? Number(subjectForm.price) || 0 : 0, level: subjectForm.level || null } : {}),
        imageUrl: imageUrl || undefined,
      };

      if (subjectForm.id) {
        await updateCourseSubject(selectedCourseId, subjectForm.id, payload);
      } else {
        await createCourseSubject(selectedCourseId, payload);
      }

      const nextSubjects = await fetchCourseSubjects(selectedCourseId);
      setSubjectsByCourse((prev) => ({
        ...prev,
        [selectedCourseId]: nextSubjects,
      }));
      resetSubjectForm();
      setSubjectModalOpen(false);
    }, sl.saved);
  };


  const saveStudent = async (event) => {
    event.preventDefault();

    const basePayload = {
      name: studentForm.name,
      role: "STUDENT",
      age: studentForm.age ? Number(studentForm.age) : undefined,
      gender: studentForm.gender || undefined,
      address: studentForm.address || undefined,
      dob: studentForm.dob || undefined,
      parentNationalId: studentForm.parentNationalId || undefined,
    };

    const buildParentLinkMessage = (parentLinkStatus) => {
      if (!studentForm.parentNationalId) return "";
      if (parentLinkStatus === "existing") return isArabic ? " | تم الربط مع حساب ولي أمر موجود مسبقًا" : " | Linked to existing parent account";
      if (parentLinkStatus === "created") return isArabic ? " | تم إنشاء حساب ولي أمر جديد تلقائيًا وربطه" : " | New parent account was auto-created and linked";
      return "";
    };

    await handleAction(async () => {
      if (studentForm.id) {
        await updateOrganizationUser(studentForm.id, { ...basePayload, email: studentForm.email });
        const nextUsers = await fetchOrganizationUsers();
        setUsers(nextUsers);
        resetStudentForm();
        setStudentModalOpen(false);
      } else if (studentEmailAuto) {
        const generated = await createOrganizationUserWithGeneratedCredentials(basePayload);
        const nextUsers = await fetchOrganizationUsers();
        setUsers(nextUsers);
        resetStudentForm();
        setStudentModalOpen(false);
        const email = generated?.credentials?.email || "-";
        const password = generated?.credentials?.password || "-";
        const parentLinkMessage = buildParentLinkMessage(generated?.parentLinkStatus);
        setCredentialsModal({ open: true, name: studentForm.name, email, password });
        return `${isArabic ? "تم إنشاء حساب الطالب" : "Student account created"}${parentLinkMessage}`;
      } else {
        const created = await createOrganizationUser({ ...basePayload, email: studentForm.email });
        const nextUsers = await fetchOrganizationUsers();
        setUsers(nextUsers);
        resetStudentForm();
        setStudentModalOpen(false);
        const tempPassword = created?.tempPassword || "-";
        const parentLinkMessage = buildParentLinkMessage(created?.parentLinkStatus);
        setCredentialsModal({ open: true, name: studentForm.name, email: studentForm.email, password: tempPassword });
        return `${isArabic ? "تم إنشاء حساب الطالب" : "Student account created"}${parentLinkMessage}`;
      }
    }, t.organization.messages.studentSaved);
  };

  const saveParent = async (event) => {
    event.preventDefault();

    const basePayload = {
      name: parentForm.name,
      role: "PARENT",
      address: parentForm.address || undefined,
    };

    await handleAction(async () => {
      if (parentForm.id) {
        await updateOrganizationUser(parentForm.id, { ...basePayload, email: parentForm.email });
        const nextUsers = await fetchOrganizationUsers();
        setUsers(nextUsers);
        resetParentForm();
        setParentModalOpen(false);
      } else if (parentEmailAuto) {
        const generated = await createOrganizationUserWithGeneratedCredentials(basePayload);
        const nextUsers = await fetchOrganizationUsers();
        setUsers(nextUsers);
        resetParentForm();
        setParentModalOpen(false);
        const email = generated?.credentials?.email || "-";
        const password = generated?.credentials?.password || "-";
        setCredentialsModal({ open: true, name: parentForm.name, email, password });
        return isArabic ? "تم إنشاء حساب ولي الأمر" : "Parent account created";
      } else {
        const created = await createOrganizationUser({ ...basePayload, email: parentForm.email });
        const nextUsers = await fetchOrganizationUsers();
        setUsers(nextUsers);
        resetParentForm();
        setParentModalOpen(false);
        const tempPassword = created?.tempPassword || "-";
        setCredentialsModal({ open: true, name: parentForm.name, email: parentForm.email || "", password: tempPassword });
        return isArabic ? "تم إنشاء حساب ولي الأمر" : "Parent account created";
      }
    }, t.organization.messages.parentSaved);
  };

  const openLinkDrawer = (parent) => {
    setLinkTargetParent(parent);
    setIsLinkDrawerOpen(true);
    setLinkSearchTerm("");
    setSelectedStudentIds([]);
  };

  const closeLinkDrawer = () => {
    setIsLinkDrawerOpen(false);
    setLinkTargetParent(null);
    setLinkSearchTerm("");
    setSelectedStudentIds([]);
  };

  const openEnrollmentModal = async (student) => {
    setEnrollmentTargetStudent(student);
    setIsEnrollmentModalOpen(true);
    try {
      const enrollments = await fetchStudentCourses(student.id);
      setStudentEnrollments(enrollments);
    } catch (err) {
      setError(safeError(err));
      setStudentEnrollments([]);
    }
  };

  const closeEnrollmentModal = () => {
    setIsEnrollmentModalOpen(false);
    setEnrollmentTargetStudent(null);
    setStudentEnrollments([]);
  };

  const handleEnrollStudent = async (courseId) => {
    if (!enrollmentTargetStudent?.id) return;

    await handleAction(async () => {
      await addStudentToCourse(enrollmentTargetStudent.id, courseId, isSchool);
      const enrollments = await fetchStudentCourses(enrollmentTargetStudent.id);
      setStudentEnrollments(enrollments);
      return isArabic ? "تم إضافة الطالب إلى التخصص" : "Student enrolled in specialization";
    }, isArabic ? "تم إضافة الطالب إلى التخصص" : "Student enrolled in specialization");
  };

  const handleUnenrollStudent = async (courseId) => {
    if (!enrollmentTargetStudent?.id) return;

    await handleAction(async () => {
      await removeStudentFromCourse(enrollmentTargetStudent.id, courseId);
      const enrollments = await fetchStudentCourses(enrollmentTargetStudent.id);
      setStudentEnrollments(enrollments);
      return isArabic ? "تم إزالة الطالب من الكورس" : "Student unenrolled from course";
    }, isArabic ? "تم إزالة الطالب من الكورس" : "Student unenrolled from course");
  };

  const toggleStudentSelection = (studentId) => {
    setSelectedStudentIds((prev) => {
      if (prev.includes(studentId)) {
        return prev.filter((id) => id !== studentId);
      }
      return [...prev, studentId];
    });
  };

  const submitParentChildrenLink = async () => {
    if (!linkTargetParent?.id) {
      return;
    }

    if (selectedStudentIds.length === 0) {
      setError(t.organization.parents.linkValidation);
      return;
    }

    await handleAction(async () => {
      const result = await linkParentToStudents(linkTargetParent.id, { studentIds: selectedStudentIds });
      const nextUsers = await fetchOrganizationUsers();
      setUsers(nextUsers);
      closeLinkDrawer();
      return isArabic
        ? `تم ربط ${result?.linkedCount || selectedStudentIds.length} طالب مع ولي الأمر`
        : `Linked ${result?.linkedCount || selectedStudentIds.length} students to parent`;
    }, t.organization.parents.linkSuccess);
  };

  const downloadTeachersList = () => {
    const dateLabel = new Date().toISOString().slice(0, 10);
    const rows = filteredTeachers.map((teacher) => [
      teacher?.id || "",
      teacher?.user?.name || "",
      teacher?.user?.email || "",
      teacher?.specialization || "",
      teacher?.bio || "",
    ]);

    downloadCsvFromRows(`teachers-list-${dateLabel}.csv`, ["id", "name", "email", "specialization", "bio"], rows);
    setSuccess(isArabic ? "تم تنزيل قائمة المعلمين" : "Teachers list downloaded");
  };

  const downloadCoursesList = () => {
    const dateLabel = new Date().toISOString().slice(0, 10);
    const rows = filteredCourses.map((course) => {
      const displayName = formatGradeName(course, isSchool, isArabic) || course?.Name || "";
      if (isAcademy) {
        return [
          course?.id || "",
          displayName,
          course?.Description || "",
          course?.isPaid ? "PAID" : "FREE",
          Number(course?.price || 0).toFixed(2),
        ];
      }
      return [
        course?.id || "",
        displayName,
        course?.Description || "",
        "",
        "",
      ];
    });

    downloadCsvFromRows(`courses-list-${dateLabel}.csv`, ["id", "name", "description", "type", "price"], rows);
    setSuccess(isArabic ? "تم تنزيل قائمة التخصصات" : "Specializations list downloaded");
  };

  const _downloadSubjectsList = () => {
    const dateLabel = new Date().toISOString().slice(0, 10);
    const rows = filteredSubjects.map((subject) => [
      subject?.id || "",
      subject?.name || "",
      subject?.Description || "",
      subject?.teacher?.user?.name || "",
      selectedCourseId || "",
    ]);

    downloadCsvFromRows(`subjects-list-${dateLabel}.csv`, ["id", "name", "description", "teacher", "courseId"], rows);
    setSuccess(sl.downloadedList);
  };

  const downloadStudentsList = () => {
    const dateLabel = new Date().toISOString().slice(0, 10);
    const rows = filteredStudents.map((student) => [
      student?.id || "",
      student?.name || "",
      student?.email || "",
      parentNameById.get(Number(student?.student?.Parent_id)) || "",
      student?.age ?? "",
      student?.gender || "",
      student?.address || "",
    ]);

    downloadCsvFromRows(`students-list-${dateLabel}.csv`, ["id", "name", "email", "parent", "age", "gender", "address"], rows);
    setSuccess(isArabic ? "تم تنزيل قائمة الطلاب" : "Students list downloaded");
  };

  const downloadParentsList = () => {
    const dateLabel = new Date().toISOString().slice(0, 10);
    const rows = filteredParents.map((parent) => [
      parent?.id || "",
      parent?.name || "",
      parent?.email || "",
      linkedParentIds.has(Number(parent?.id)) ? "YES" : "NO",
      (childrenByParentId.get(Number(parent?.id)) || []).map((child) => `${child.name} (ID: ${child.id})`).join(" | "),
      parent?.address || "",
    ]);

    downloadCsvFromRows(`parents-list-${dateLabel}.csv`, ["id", "name", "email", "linked", "children", "address"], rows);
    setSuccess(isArabic ? "تم تنزيل قائمة أولياء الأمور" : "Parents list downloaded");
  };

  const uploadStudentExcel = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    await handleAction(async () => {
      const result = await importUsersFromExcel(file);
      const summary = result?.summary;
      const skippedRows = Array.isArray(result?.skipped) ? result.skipped : [];
      const createdUsers = Array.isArray(result?.users) ? result.users : [];
      const autoParents = Array.isArray(result?.autoCreatedParents) ? result.autoCreatedParents : [];
      const nextUsers = await fetchOrganizationUsers();
      setUsers(nextUsers);

      if (skippedRows.length > 0) {
        setError(`Some rows were skipped (${skippedRows.length}): ${formatSkippedRows(skippedRows)}`);
      }

      const allCreated = [
        ...createdUsers.map((u) => ({ name: u.name, email: u.email, password: u.password || "-", role: u.role })),
        ...autoParents.map((p) => ({ name: `Parent ${p.nationalId}`, email: p.email, password: p.password || "-", role: "PARENT" })),
      ].filter((u) => u.password && u.password !== "-");

      if (allCreated.length > 0) {
        setBulkCredentialsModal({ open: true, users: allCreated });
      }

      if (summary) return `${t.organization.messages.importDone} (${summary.created}/${summary.totalRows})`;
      return t.organization.messages.importDone;
    }, t.organization.messages.importDone);

    event.target.value = "";
  };

  const uploadTeacherExcel = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    await handleAction(async () => {
      const result = await importUsersFromExcel(file);
      const summary = result?.summary;
      const skippedRows = Array.isArray(result?.skipped) ? result.skipped : [];
      const createdUsers = Array.isArray(result?.users) ? result.users : [];
      const [nextTeachers, nextUsers] = await Promise.all([
        fetchOrganizationTeachers(),
        fetchOrganizationUsers(),
      ]);

      setTeachers(nextTeachers);
      setUsers(nextUsers);

      if (skippedRows.length > 0) {
        setError(`Some rows were skipped (${skippedRows.length}): ${formatSkippedRows(skippedRows)}`);
      }

      const allCreated = createdUsers
        .map((u) => ({ name: u.name, email: u.email, password: u.password || "-", role: u.role }))
        .filter((u) => u.password && u.password !== "-");

      if (allCreated.length > 0) {
        setBulkCredentialsModal({ open: true, users: allCreated });
      }

      if (summary) return `${t.organization.messages.teacherImportDone} (${summary.created}/${summary.totalRows})`;
      return t.organization.messages.teacherImportDone;
    }, t.organization.messages.teacherImportDone);

    event.target.value = "";
  };

  const saveSchoolSettingsAction = async (event) => {
    event.preventDefault();
    await handleAction(async () => {
      const payload = {
        schoolYearStartMonth: Number(schoolForm.schoolYearStartMonth),
        schoolYearStartDay: Number(schoolForm.schoolYearStartDay),
        promotionMonth: Number(schoolForm.promotionMonth),
        promotionDay: Number(schoolForm.promotionDay),
        entryGradeMinAge: Number(schoolForm.entryGradeMinAge),
        passThresholdPercentage: Number(schoolForm.passThresholdPercentage),
        minSubjectPassPercentage: Number(schoolForm.minSubjectPassPercentage),
        requireAllSubjectsPass: Boolean(schoolForm.requireAllSubjectsPass),
        classRanges: schoolForm.classRanges,
      };

      await updateSchoolSettings(payload);
    }, t.organization.messages.schoolSaved);
  };

  const confirmRunPromotionAction = async () => {
    await handleAction(async () => {
      await runAnnualPromotion({});
    }, t.organization.messages.promotionDone);
    setShowPromotionConfirm(false);
  };

  // ── Academic Year handlers ──────────────────────────────────────────────
  const loadTermsForYear = async (year) => {
    setSelectedYear(year);
    setAcademicYearLoading(true);
    try {
      const terms = await fetchTerms(year.id);
      setYearTerms(terms);
    } catch { setYearTerms([]); }
    finally { setAcademicYearLoading(false); }
  };

  const handleCreateYear = async (e) => {
    e.preventDefault();
    await handleAction(async () => {
      const created = await createAcademicYear({
        name: yearForm.name,
        startDate: yearForm.startDate,
        endDate: yearForm.endDate,
        numberOfTerms: Number(yearForm.numberOfTerms),
      });
      setAcademicYears((prev) => [created, ...prev.filter((y) => y.id !== created.id)]);
      setSelectedYear(created);
      setYearTerms([]);
      setYearWizardStep(2);
      setTermForm({ termNumber: 1, name: "", startDate: "", endDate: "", changeReason: "" });
    }, isArabic ? "تم إنشاء السنة الدراسية" : "Academic year created");
  };

  const handleCreateTerm = async (e) => {
    e.preventDefault();
    if (!selectedYear) return;
    const maxTerms = Number(selectedYear.numberOfTerms || 0);
    if (maxTerms && yearTerms.length >= maxTerms) {
      setError(isArabic ? "لقد وصلت إلى العدد المحدد من الفصول لهذه السنة" : "This academic year already has the configured number of terms");
      return;
    }
    await handleAction(async () => {
      const created = await createTerm(selectedYear.id, {
        termNumber: Number(termForm.termNumber),
        name: termForm.name,
        startDate: termForm.startDate,
        endDate: termForm.endDate,
      });
      setYearTerms((prev) => [...prev, created].sort((a, b) => a.termNumber - b.termNumber));
      const nextTermNumber = Number(created.termNumber || termForm.termNumber) + 1;
      const hasMoreTerms = nextTermNumber <= maxTerms;

      if (hasMoreTerms) {
        setTermForm({ termNumber: nextTermNumber, name: "", startDate: "", endDate: "", changeReason: "" });
        return isArabic
          ? `تم حفظ الفصل ${created.termNumber}. أكمل الفصل التالي ${nextTermNumber}/${maxTerms}.`
          : `Saved term ${created.termNumber}. Continue with term ${nextTermNumber}/${maxTerms}.`;
      }

      setYearModal(false);
      setYearWizardStep(1);
      setSelectedYear(null);
      setYearForm({ name: "", startDate: "", endDate: "", numberOfTerms: 1 });
      setTermForm({ termNumber: 1, name: "", startDate: "", endDate: "", changeReason: "" });
      return isArabic ? "تم إنشاء جميع الفصول لهذه السنة" : "All terms for this year were created";
    }, isArabic ? "تم إنشاء الفصل" : "Term created");
  };

  const handleUpdateTerm = async (e) => {
    e.preventDefault();
    if (!selectedYear || !editTermModal) return;
    await handleAction(async () => {
      const payload = { changeReason: editTermModal.changeReason };
      if (editTermModal.term.status === "PLANNED" && editTermModal.startDate) payload.startDate = editTermModal.startDate;
      if (editTermModal.endDate) payload.endDate = editTermModal.endDate;
      if (editTermModal.name) payload.name = editTermModal.name;
      const updated = await updateTerm(selectedYear.id, editTermModal.term.id, payload);
      setYearTerms((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setEditTermModal(null);
    }, isArabic ? "تم تحديث الفصل" : "Term updated");
  };

  const handleReopenTerm = async (e) => {
    e.preventDefault();
    if (!selectedYear || !reopenModal) return;
    await handleAction(async () => {
      const updated = await reopenTerm(selectedYear.id, reopenModal.term.id, reopenModal.changeReason);
      setYearTerms((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setReopenModal(null);
    }, isArabic ? "تم إعادة فتح الفصل" : "Term reopened");
  };

  const termStatusColor = (status) => ({
    PLANNED: "bg-slate-100 text-slate-600",
    ACTIVE:  "bg-green-100 text-green-700",
    CLOSED:  "bg-amber-100 text-amber-700",
    LOCKED:  "bg-red-100 text-red-700",
  }[status] || "bg-slate-100 text-slate-600");

  const tabs = useMemo(() => {
    const courseTabLabel = isSchool
      ? (isArabic ? "الصفوف" : "Grades")
      : t.organization.tabs.courses;

    const baseTabs = [
      { id: TABS.OVERVIEW, label: t.organization.tabs.overview },
      { id: TABS.TEACHERS, label: t.organization.tabs.teachers },
      { id: TABS.COURSES, label: courseTabLabel },
      { id: "subjects", label: sl.tab },
      { id: TABS.STUDENTS, label: t.organization.tabs.students },
    ];

    if (isSchool) {
      baseTabs.push({ id: TABS.PARENTS, label: t.organization.tabs.parents });
      baseTabs.push({ id: TABS.MARKS,   label: isArabic ? 'الدرجات' : 'Marks' });
      baseTabs.push({ id: TABS.SCHOOL,  label: t.organization.tabs.schoolSettings });
    }

    if (isAcademy) {
      baseTabs.push({ id: TABS.FINANCE, label: isArabic ? "الإيرادات" : "Finance" });
    }

    return baseTabs;
  }, [isSchool, isAcademy, isArabic, t.organization.tabs, sl]);

  const organizationTitle =
    organizationProfile?.Name ||
    organization?.Name ||
    organizationProfile?.SchoolName ||
    organizationProfile?.schoolName ||
    t.organization.title;

  return (
    <main dir={isArabic ? "rtl" : "ltr"} className={`admin-management-theme dashboard-page organization-workspace-shell relative min-h-screen overflow-hidden ${isArabic ? "lang-ar" : "lang-en"}`}>
      <QuantumMeshBackground />

      {credentialsModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-8 shadow-2xl">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 border border-emerald-200">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <h3 className="text-lg font-black text-slate-900">{isArabic ? "بيانات الحساب" : "Account Credentials"}</h3>
            <p className="mt-1 text-xs text-slate-400">{isArabic ? "احفظ هذه البيانات الآن — لن تظهر مجدداً." : "Save these credentials now — they won't be shown again."}</p>

            <div className="mt-5 space-y-3">
              {credentialsModal.name && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{isArabic ? "الاسم" : "Name"}</p>
                  <p className="mt-0.5 text-sm font-semibold text-slate-800">{credentialsModal.name}</p>
                </div>
              )}
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{isArabic ? "البريد الإلكتروني" : "Email"}</p>
                <p className="mt-0.5 text-sm font-semibold text-slate-800 break-all">{credentialsModal.email}</p>
              </div>
              <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5">
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">{isArabic ? "كلمة المرور المؤقتة" : "Temporary Password"}</p>
                <p className="mt-0.5 font-mono text-sm font-bold text-indigo-700 tracking-wider">{credentialsModal.password}</p>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={async () => {
                  await copyCredentialsToClipboard(credentialsModal.email, credentialsModal.password);
                }}
                className="flex-1 rounded-2xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                {isArabic ? "نسخ" : "Copy"}
              </button>
              <button
                type="button"
                onClick={() => setCredentialsModal({ open: false, name: "", email: "", password: "" })}
                className="flex-1 rounded-2xl bg-slate-900 py-2.5 text-sm font-bold text-white transition hover:bg-slate-700"
              >
                {isArabic ? "تم، أغلق" : "Done"}
              </button>
            </div>
          </div>
        </div>
      )}

      {bulkCredentialsModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm">
          <div className="flex w-full max-w-2xl flex-col rounded-3xl border border-slate-200 bg-white shadow-2xl" style={{ maxHeight: "85vh" }}>
            {/* Header */}
            <div className="flex items-start gap-4 border-b border-slate-100 p-6">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
              <div className="flex-1">
                <h3 className="font-black text-slate-900">{isArabic ? "بيانات الحسابات المُنشأة" : "Created Accounts Credentials"}</h3>
                <p className="mt-0.5 text-xs text-slate-400">
                  {isArabic
                    ? `${bulkCredentialsModal.users.length} حساب — احفظ هذه البيانات الآن، لن تظهر مجدداً.`
                    : `${bulkCredentialsModal.users.length} account(s) — save these now, they won't be shown again.`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const rows = bulkCredentialsModal.users.map((u) => [u.name, u.email, u.password, u.role]);
                  downloadCsvFromRows(`credentials-${new Date().toISOString().slice(0, 10)}.csv`, ["name", "email", "temp_password", "role"], rows);
                }}
                className="shrink-0 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-bold text-sky-700 transition hover:bg-sky-100"
              >
                {isArabic ? "تنزيل CSV" : "Download CSV"}
              </button>
            </div>

            {/* Table */}
            <div className="overflow-y-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="sticky top-0 bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3">{isArabic ? "الاسم" : "Name"}</th>
                    <th className="px-5 py-3">{isArabic ? "البريد الإلكتروني" : "Email"}</th>
                    <th className="px-5 py-3">{isArabic ? "كلمة المرور المؤقتة" : "Temp Password"}</th>
                    <th className="px-5 py-3">{isArabic ? "الدور" : "Role"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bulkCredentialsModal.users.map((u, i) => (
                    <tr key={i} className="hover:bg-slate-50/60">
                      <td className="px-5 py-3 font-semibold text-slate-900">{u.name || "-"}</td>
                      <td className="px-5 py-3 text-slate-600 break-all">{u.email}</td>
                      <td className="px-5 py-3 font-mono font-bold text-indigo-700">{u.password}</td>
                      <td className="px-5 py-3">
                        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">{u.role}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="border-t border-slate-100 p-5 text-right">
              <button
                type="button"
                onClick={() => setBulkCredentialsModal({ open: false, users: [] })}
                className="rounded-2xl bg-slate-900 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-slate-700"
              >
                {isArabic ? "تم، أغلق" : "Done"}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 px-4 py-6 backdrop-blur-sm"
          onClick={closeDeleteConfirm}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-subject-title"
            className="w-full max-w-[320px] rounded-[28px] border border-slate-200 bg-white px-5 py-6 text-center shadow-[0_28px_80px_-24px_rgba(15,23,42,0.45)] sm:max-w-[340px]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#fceef1] text-slate-800 shadow-inner">
              <Trash2 size={34} strokeWidth={1.8} />
            </div>

            <h3 id="delete-subject-title" className="mt-5 text-2xl font-black tracking-tight text-slate-900">
              {confirmDelete.title || (isArabic ? "حذف؟" : "Delete?")}
            </h3>

            <p className="mt-3 text-sm font-medium leading-6 text-slate-500">
              {isArabic
                ? "هل أنت متأكد أنك تريد حذف هذا العنصر؟"
                : "Are you sure you want to delete this item?"}
            </p>

            <p className="mt-3 text-lg font-semibold text-slate-900">
              {`"${confirmDelete.label || ""}"`}
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={closeDeleteConfirm}
                className="h-12 flex-1 rounded-2xl border-2 border-indigo-100 bg-white text-base font-bold text-[#6b6e99] transition hover:border-indigo-200 hover:bg-indigo-50/40"
              >
                {isArabic ? "إلغاء" : "Cancel"}
              </button>

              <button
                type="button"
                onClick={async () => {
                  if (!confirmDelete.onConfirm) return;
                  await confirmDelete.onConfirm();
                }}
                className="h-12 flex-1 rounded-2xl bg-gradient-to-r from-rose-500 to-red-500 text-base font-bold text-white shadow-[0_16px_30px_-14px_rgba(239,68,68,0.85)] transition hover:from-rose-600 hover:to-red-600"
              >
                <span className="inline-flex items-center justify-center gap-2">
                  <Trash2 size={16} />
                  {isArabic ? "حذف" : "Delete"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      <div dir={isArabic ? "rtl" : "ltr"} className="organization-workspace-shell__content relative z-10">
        <aside className={`dashboard-sidebar organization-workspace-shell__sidebar flex h-full flex-col gap-5 rounded-none border p-4 ${isArabic ? "right-0 left-auto" : "left-0"}`}>
          <div className="rounded-[1.75rem] bg-gradient-to-br from-indigo-600 via-violet-600 to-cyan-500 p-5 text-white shadow-lg shadow-indigo-500/20">
            <p className="text-xs font-black uppercase tracking-[0.22em]">Learnova</p>
            <div className="mt-2 flex items-center gap-1.5">
              <h1 className="text-2xl font-black">{organizationTitle}</h1>
              {organizationProfile?.status === 'APPROVED' && organizationProfile?.Role === 'ACADEMY' && (
                <BadgeCheck size={20} className="shrink-0 text-cyan-300" title="Verified Academy" />
              )}
            </div>
            <p className="mt-2 text-sm text-indigo-50/90">{t.organization.badge}</p>
          </div>

          <nav className="space-y-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => { setActiveTab(tab.id); setDrillCourse(null); setDrillSubject(null); setDrillExpandedLesson(null); }}
                className={`w-full rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${
                  activeTab === tab.id
                    ? "dashboard-sidebar-item-active"
                    : "dashboard-sidebar-item"
                } ${isArabic ? "text-right" : "text-left"}`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          <button
            type="button"
            onClick={() => dispatch(logout())}
            className="mt-auto rounded-2xl border border-transparent bg-transparent px-4 py-3 text-sm font-semibold text-red-500 transition-all duration-200 hover:border-red-500 hover:bg-red-500 hover:text-white hover:shadow-md hover:scale-[1.01]"
          >
            {t.dashboard.logout}
          </button>
        </aside>

        <section className={`dashboard-panel organization-workspace-shell__main space-y-5 rounded-[2rem] border p-5 md:p-8 ${isArabic ? "mr-[272px] ml-0" : ""}`}>
          <header className="dashboard-hero rounded-[2rem] p-6 shadow-xl flex items-start justify-between">
            <div>
              <p className="dashboard-hero-kicker text-xs font-bold uppercase tracking-[0.2em]">{t.organization.badge}</p>
              <div className="mt-2 flex items-center gap-2">
                <h2 className="text-3xl font-black">{organizationTitle}</h2>
                {organizationProfile?.status === 'APPROVED' && organizationProfile?.Role === 'ACADEMY' && (
                  <BadgeCheck size={28} className="shrink-0 text-white/80" title="Verified Academy" />
                )}
              </div>
              <p className="mt-2 text-sm">{t.organization.subtitle}</p>
            </div>
            <button
              type="button"
              onClick={toggleLang}
              className="rounded-xl border border-white/30 bg-white/20 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/30"
            >
              {lang === "en" ? t.common.switchToArabic : t.common.switchToEnglish}
            </button>
          </header>

          {loading && <p className="text-sm text-slate-500">{t.common.loading}</p>}
        {!loading && activeTab === TABS.OVERVIEW && (
          <section className="grid gap-4 md:grid-cols-2">
            <article className="rounded-3xl border border-slate-200 bg-white p-5">
              <h2 className="text-lg font-bold text-slate-900">{t.organization.organizationInfo.title}</h2>
              <div className="mt-4 space-y-2 text-sm text-slate-700">
                <p><span className="font-semibold">{t.organization.organizationInfo.name}:</span> {organizationProfile?.Name || "-"}</p>
                <p><span className="font-semibold">{t.organization.organizationInfo.email}:</span> {organizationProfile?.Email || "-"}</p>
                <p><span className="font-semibold">{t.organization.organizationInfo.subdomain}:</span> {organizationProfile?.subdomain || "-"}</p>
                {organizationProfile?.Phone && <p><span className="font-semibold">{t.organization.organizationInfo.phone}:</span> {organizationProfile.Phone}</p>}
                {organizationProfile?.Address && <p><span className="font-semibold">{t.organization.organizationInfo.address}:</span> {organizationProfile.Address}</p>}
                {organizationProfile?.Founded && <p><span className="font-semibold">{t.organization.organizationInfo.founded}:</span> {String(organizationProfile.Founded).slice(0, 10)}</p>}
                {organizationProfile?.Description && <p className="mt-2 text-slate-600">{organizationProfile.Description}</p>}
              </div>
              <button
                type="button"
                onClick={() => setProfileModalOpen(true)}
                className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
              >
                {isArabic ? "تعديل الملف الشخصي" : "Edit Profile"}
              </button>
            </article>

            <Modal
              open={profileModalOpen}
              onClose={() => setProfileModalOpen(false)}
              title={isArabic ? "تعديل الملف الشخصي" : "Edit Organization Profile"}
              maxWidth="max-w-lg"
            >
              <form onSubmit={saveProfile} className="space-y-3 text-sm text-slate-700">
                <input name="Name" value={profileForm.Name} onChange={setField(setProfileForm)} placeholder={t.organization.organizationInfo.name} className="h-11 w-full rounded-xl border border-slate-200 px-3" required />
                <input name="Email" value={profileForm.Email} onChange={setField(setProfileForm)} placeholder={t.organization.organizationInfo.email} className="h-11 w-full rounded-xl border border-slate-200 px-3" required />
                <input name="subdomain" value={profileForm.subdomain} onChange={setField(setProfileForm)} placeholder={t.organization.organizationInfo.subdomain} className="h-11 w-full rounded-xl border border-slate-200 px-3" required />
                <input name="Phone" value={profileForm.Phone} onChange={setField(setProfileForm)} placeholder={t.organization.organizationInfo.phone} className="h-11 w-full rounded-xl border border-slate-200 px-3" />
                <input name="Address" value={profileForm.Address} onChange={setField(setProfileForm)} placeholder={t.organization.organizationInfo.address} className="h-11 w-full rounded-xl border border-slate-200 px-3" />
                <input name="Founded" type="date" value={profileForm.Founded} onChange={setField(setProfileForm)} className="h-11 w-full rounded-xl border border-slate-200 px-3" />
                <textarea name="Description" value={profileForm.Description} onChange={setField(setProfileForm)} placeholder={t.organization.organizationInfo.description} className="min-h-24 w-full rounded-xl border border-slate-200 px-3 py-2" />
                <input name="password" type="password" value={profileForm.password} onChange={setField(setProfileForm)} placeholder={t.organization.organizationInfo.passwordHint} className="h-11 w-full rounded-xl border border-slate-200 px-3" />
                <button type="submit" disabled={actionLoading} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">{t.organization.common.save}</button>
              </form>
            </Modal>

            <article className="rounded-3xl border border-slate-200 bg-white p-5">
              <h2 className="text-lg font-bold text-slate-900">{t.organization.overview.statsTitle}</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t.organization.overview.studentsCount}</p>
                  <p className="mt-1 text-2xl font-black text-slate-900">{overviewStats.totalStudents}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t.organization.overview.teachersCount}</p>
                  <p className="mt-1 text-2xl font-black text-slate-900">{overviewStats.totalTeachers}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{isSchool ? (isArabic ? "الصفوف" : "Grades") : t.organization.overview.coursesCount}</p>
                  <p className="mt-1 text-2xl font-black text-slate-900">{overviewStats.totalCourses}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{sl.count}</p>
                  <p className="mt-1 text-2xl font-black text-slate-900">{overviewStats.totalSubjects}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t.organization.overview.totalUsers}</p>
                  <p className="mt-1 text-2xl font-black text-slate-900">{overviewStats.totalUsers}</p>
                </div>
              </div>


              <h3 className="mt-5 text-sm font-bold text-slate-900">{t.organization.organizationInfo.notesTitle}</h3>
              <div className="mb-4 space-y-1 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                <p><span className="font-semibold">{t.organization.organizationInfo.type}:</span> {String(organizationProfile?.Role || organizationType || "-")}</p>
                <p><span className="font-semibold">{t.organization.organizationInfo.status}:</span> {String(organizationProfile?.status || "-")}</p>
              </div>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-slate-700">
                <li>{t.organization.organizationInfo.note1}</li>
                <li>{t.organization.organizationInfo.note2}</li>
                <li>{t.organization.organizationInfo.note3}</li>
              </ul>
            </article>
          </section>
        )}

        {/* ══════════════════════════════════════
            FINANCE TAB (Academy only)
            ══════════════════════════════════════ */}
        {!loading && activeTab === TABS.FINANCE && isAcademy && (
          <section className="space-y-5">
            {!organizationRevenue ? (
              <div className="flex items-center justify-center rounded-[2rem] border border-slate-200 bg-white py-20 text-center">
                <p className="text-sm text-slate-400">{isArabic ? "جاري تحميل بيانات الإيرادات..." : "Loading revenue data..."}</p>
              </div>
            ) : (<>
              {/* KPI cards */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  {
                    label: isArabic ? "إجمالي الإيرادات" : "Total Revenue",
                    value: formatMoney(organizationRevenue.totalRevenue),
                    icon: "💰",
                    color: "from-indigo-600 to-violet-600",
                    shadow: "shadow-indigo-500/20",
                  },
                  {
                    label: isArabic ? "عدد المدفوعات" : "Total Payments",
                    value: organizationRevenue.totalPayments,
                    icon: "💳",
                    color: "from-sky-500 to-blue-600",
                    shadow: "shadow-sky-500/20",
                  },
                  {
                    label: isArabic ? "كورسات مدفوعة" : "Paid Courses",
                    value: organizationRevenue.paidCoursesCount,
                    icon: "🎓",
                    color: "from-amber-500 to-orange-500",
                    shadow: "shadow-amber-500/20",
                  },
                  {
                    label: isArabic ? "كورسات مجانية" : "Free Courses",
                    value: organizationRevenue.freeCoursesCount,
                    icon: "🆓",
                    color: "from-emerald-500 to-teal-500",
                    shadow: "shadow-emerald-500/20",
                  },
                ].map((kpi) => (
                  <div key={kpi.label} className={`rounded-[1.5rem] bg-gradient-to-br ${kpi.color} p-5 text-white shadow-lg ${kpi.shadow}`}>
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/80">{kpi.label}</p>
                      <span className="text-2xl">{kpi.icon}</span>
                    </div>
                    <p className="mt-3 text-3xl font-black">{kpi.value}</p>
                  </div>
                ))}
              </div>

              {/* Top courses + Recent payments */}
              <div className="grid gap-5 lg:grid-cols-2">

                {/* Top courses by revenue */}
                <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="mb-4 font-black text-slate-900">
                    {isArabic ? "أعلى الكورسات إيرادًا" : "Top Courses by Revenue"}
                  </h3>
                  {(organizationRevenue.byCourse || []).length === 0 ? (
                    <p className="py-8 text-center text-sm text-slate-400">{isArabic ? "لا توجد بيانات بعد" : "No data yet"}</p>
                  ) : (
                    <div className="space-y-3">
                      {(organizationRevenue.byCourse || []).slice(0, 6).map((c, idx) => {
                        const total = organizationRevenue.totalRevenue || 1;
                        const pct = Math.min(100, Math.round((Number(c.revenue) / Number(total)) * 100));
                        return (
                          <div key={c.courseId}>
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-black text-indigo-700">{idx + 1}</span>
                                <span className="truncate font-semibold text-slate-800">{c.courseName}</span>
                              </div>
                              <div className="flex flex-shrink-0 items-center gap-3">
                                <span className="text-xs text-slate-500">{c.payments} {isArabic ? "دفعة" : "payments"}</span>
                                <span className="font-black text-indigo-700">{formatMoney(c.revenue)}</span>
                              </div>
                            </div>
                            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                              <div className="h-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Recent payments */}
                <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="mb-4 font-black text-slate-900">
                    {isArabic ? "آخر المدفوعات" : "Recent Payments"}
                  </h3>
                  {(organizationRevenue.recentPayments || []).length === 0 ? (
                    <p className="py-8 text-center text-sm text-slate-400">{isArabic ? "لا توجد مدفوعات بعد" : "No payments yet"}</p>
                  ) : (
                    <div className="space-y-2">
                      {(organizationRevenue.recentPayments || []).slice(0, 8).map((p) => (
                        <div key={p.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900">{p.student?.name || (isArabic ? "طالب" : "Student")}</p>
                            <p className="truncate text-xs text-slate-500">{p.course?.Name || "-"}</p>
                          </div>
                          <div className="flex flex-shrink-0 flex-col items-end gap-0.5">
                            <span className="font-black text-emerald-700">{formatMoney(p.amount)}</span>
                            <span className="text-[10px] text-slate-400">
                              {p.paidAt ? new Date(p.paidAt).toLocaleDateString(isArabic ? "ar-EG" : "en-GB") : "-"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Course revenue breakdown (full table) */}
              {(organizationRevenue.byCourse || []).length > 0 && (
                <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="mb-4 font-black text-slate-900">
                    {isArabic ? "تفاصيل الإيرادات لكل كورس" : "Revenue Breakdown by Course"}
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-slate-500">{isArabic ? "الكورس" : "Course"}</th>
                          <th className="px-3 py-2 text-center text-xs font-bold uppercase tracking-wider text-slate-500">{isArabic ? "النوع" : "Type"}</th>
                          <th className="px-3 py-2 text-center text-xs font-bold uppercase tracking-wider text-slate-500">{isArabic ? "السعر" : "Price"}</th>
                          <th className="px-3 py-2 text-center text-xs font-bold uppercase tracking-wider text-slate-500">{isArabic ? "المدفوعات" : "Payments"}</th>
                          <th className="px-3 py-2 text-right text-xs font-bold uppercase tracking-wider text-slate-500">{isArabic ? "الإيراد" : "Revenue"}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(organizationRevenue.byCourse || []).map((c) => (
                          <tr key={c.courseId} className="border-b border-slate-100 hover:bg-slate-50 transition">
                            <td className="px-3 py-3 font-semibold text-slate-900">{c.courseName}</td>
                            <td className="px-3 py-3 text-center">
                              <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${c.isPaid ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                                {c.isPaid ? (isArabic ? "مدفوع" : "Paid") : (isArabic ? "مجاني" : "Free")}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-center text-slate-700">{c.isPaid ? formatMoney(c.price) : "—"}</td>
                            <td className="px-3 py-3 text-center text-slate-700">{c.payments}</td>
                            <td className="px-3 py-3 text-right font-black text-indigo-700">{formatMoney(c.revenue)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-slate-200">
                          <td colSpan={4} className="px-3 py-3 text-right font-bold text-slate-700">{isArabic ? "الإجمالي" : "Total"}</td>
                          <td className="px-3 py-3 text-right text-lg font-black text-indigo-700">{formatMoney(organizationRevenue.totalRevenue)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}
            </> )}
          </section>
        )}

        {!loading && activeTab === TABS.TEACHERS && (
          <section className="space-y-4">
            <Modal open={teacherModalOpen} onClose={() => { setTeacherModalOpen(false); resetTeacherForm(); }} title={teacherForm.id ? t.organization.teachers.formTitle : (isArabic ? "إضافة مدرس جديد" : "Add New Teacher")} maxWidth="max-w-lg">
              <form onSubmit={saveTeacher} className="space-y-3">
                <input name="name" value={teacherForm.name} onChange={setField(setTeacherForm)} placeholder={t.organization.teachers.name} className="h-11 w-full rounded-xl border border-slate-200 px-3" required />
                {!teacherForm.id && (
                  <div className="flex overflow-hidden rounded-xl border border-slate-200">
                    <button type="button" onClick={() => setTeacherEmailAuto(false)}
                      className={`flex-1 py-2 text-xs font-semibold transition ${!teacherEmailAuto ? "bg-slate-900 text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}>
                      {isArabic ? "إدخال البريد يدوياً" : "Enter email manually"}
                    </button>
                    <button type="button" onClick={() => setTeacherEmailAuto(true)}
                      className={`flex-1 py-2 text-xs font-semibold transition ${teacherEmailAuto ? "bg-indigo-600 text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}>
                      {isArabic ? "توليد تلقائي بالنطاق" : "Auto-generate by domain"}
                    </button>
                  </div>
                )}
                {(!teacherForm.id && !teacherEmailAuto) || teacherForm.id ? (
                  <input name="email" value={teacherForm.email} onChange={setField(setTeacherForm)} placeholder={t.organization.teachers.email} className="h-11 w-full rounded-xl border border-slate-200 px-3" required={!teacherForm.id} />
                ) : (
                  <p className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-2.5 text-xs text-indigo-600">
                    {isArabic ? "سيتم توليد البريد تلقائياً بناءً على اسم المدرس ونطاق المنظمة." : "Email will be auto-generated based on the teacher's name and your organization's domain."}
                  </p>
                )}
                <input name="specialization" value={teacherForm.specialization} onChange={setField(setTeacherForm)} placeholder={t.organization.teachers.specialization} className="h-11 w-full rounded-xl border border-slate-200 px-3" />
                <textarea name="bio" value={teacherForm.bio} onChange={setField(setTeacherForm)} placeholder={t.organization.teachers.bio} className="min-h-20 w-full rounded-xl border border-slate-200 px-3 py-2" />
                <div className="flex gap-2 pt-1">
                  <button type="submit" disabled={actionLoading} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">{t.organization.common.save}</button>
                  <button type="button" onClick={resetTeacherForm} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">{t.organization.common.clear}</button>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-800">{t.organization.teachers.importTitle}</p>
                  <p className="mt-1 text-xs text-slate-500">{t.organization.teachers.importHint}</p>
                  <label className="mt-3 inline-flex cursor-pointer items-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
                    <input type="file" accept=".xlsx,.xls" className="hidden" onChange={uploadTeacherExcel} />
                    {t.organization.teachers.importAction}
                  </label>
                </div>
              </form>
            </Modal>

            <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-5">
                <div>
                  <h2 className="text-2xl font-black text-slate-900">{isArabic ? "إدارة المدرسين" : "Teachers Management"}</h2>
                  <p className="mt-1 text-sm text-slate-600">{isArabic ? "كل المدرسين داخل المنظمة" : "All instructors in your organization"}</p>
                </div>
                <button type="button" onClick={() => { resetTeacherForm(); setTeacherModalOpen(true); }} className="rounded-full bg-purple-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-purple-700">
                  {isArabic ? "+ إضافة مدرس" : "+ Add Teacher"}
                </button>
              </div>

              <div className="mt-4 flex flex-wrap items-end gap-3">
                <label className="flex min-w-[240px] flex-1 items-center gap-2 rounded-[14px] border border-slate-300 bg-white px-4 py-3">
                  <Search size={16} className="text-slate-400" />
                  <input
                    value={teacherSearch}
                    onChange={(event) => setTeacherSearch(event.target.value)}
                    placeholder={isArabic ? "ابحث عن مدرس..." : "Search teachers..."}
                    className="w-full bg-transparent text-sm outline-none"
                  />
                </label>

                <select value={teacherTrack} onChange={(event) => setTeacherTrack(event.target.value)} className="h-11 rounded-[14px] border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700">
                  <option value="ALL">{isArabic ? "كل التخصصات" : "All Specializations"}</option>
                  {teacherTrackOptions.map((track) => (
                    <option key={track} value={track}>{track}</option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => { setTeacherSearch(""); setTeacherTrack("ALL"); }}
                  className="h-11 rounded-[14px] border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  {isArabic ? "مسح" : "Clear"}
                </button>

                <button
                  type="button"
                  onClick={downloadTeachersList}
                  className="h-11 rounded-[14px] border border-sky-200 bg-sky-50 px-4 text-sm font-semibold text-sky-700 transition hover:bg-sky-100"
                >
                  {isArabic ? "تنزيل CSV" : "Download CSV"}
                </button>
              </div>

              <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-5 py-3">{isArabic ? "المدرس" : "Teacher"}</th>
                      <th className="px-5 py-3">{isArabic ? "البريد الإلكتروني" : "Email"}</th>
                      <th className="px-5 py-3">{isArabic ? "التخصص" : "Specialization"}</th>
                      <th className="px-5 py-3 text-center">{isArabic ? "المواد" : "Subjects"}</th>
                      <th className="px-5 py-3 text-center">{isArabic ? "الطلاب" : "Students"}</th>
                      <th className="px-5 py-3">{t.organization.common.actions}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredTeachers.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-5 py-10 text-center text-slate-400">{t.organization.common.empty}</td>
                      </tr>
                    ) : pagedTeachers.map((teacher) => {
                      const initials = String(teacher?.user?.name || teacher?.name || "T")
                        .trim().split(/\s+/).filter(Boolean).slice(0, 2)
                        .map((p) => p[0]?.toUpperCase()).join("") || "T";
                      const specialization = teacher?.specialization || "-";
                      const courseCount = Number(teacher?.subjectCount || teacher?.coursesCount || teacher?.courseCount || 0);
                      const studentCount = Number(teacher?.studentsCount || teacher?.studentCount || 0);

                      return (
                        <tr key={teacher.id} className="hover:bg-slate-50/60">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-black text-white">
                                {initials}
                              </div>
                              <span className="font-semibold text-slate-900">{teacher?.user?.name || "-"}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-slate-500">{teacher?.user?.email || "-"}</td>
                          <td className="px-5 py-3">
                            <span className="inline-flex rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700">{specialization}</span>
                          </td>
                          <td className="px-5 py-3 text-center font-black text-purple-600">{courseCount}</td>
                          <td className="px-5 py-3 text-center font-black text-purple-600">{studentCount}</td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => { setTeacherForm({ id: teacher.id, name: teacher?.user?.name || "", email: teacher?.user?.email || "", password: "", specialization: teacher?.specialization || "", bio: teacher?.bio || "" }); setTeacherModalOpen(true); }}
                                className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
                                title={t.organization.common.edit}
                              >
                                <Pencil size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => openDeleteConfirm({
                                  title: isArabic ? "حذف المدرس؟" : "Delete Teacher?",
                                  label: teacher?.user?.name || teacher?.user?.email || `${teacher.id}`,
                                  onConfirm: async () => {
                                    await handleAction(async () => {
                                      await deleteOrganizationTeacher(teacher.id);
                                      const next = await fetchOrganizationTeachers();
                                      setTeachers(next);
                                      closeDeleteConfirm();
                                    }, t.organization.messages.teacherDeleted);
                                  },
                                })}
                                className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-rose-50 hover:text-rose-700"
                                title={t.organization.common.delete}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 px-1">
                <Pagination page={teacherPage} totalPages={Math.ceil(filteredTeachers.length / TEACHER_PAGE_SIZE)} totalItems={filteredTeachers.length} pageSize={TEACHER_PAGE_SIZE} onPageChange={setTeacherPage} isArabic={isArabic} />
              </div>
            </article>
          </section>
        )}

        {!loading && activeTab === TABS.COURSES && (
          <section className="space-y-4">
            {canManageCourses && (
              <Modal open={courseModalOpen} onClose={() => { setCourseModalOpen(false); resetCourseForm(); }} title={courseForm.id ? t.organization.courses.formTitle : (isSchool ? (isArabic ? "إضافة صف جديد" : "Add New Grade") : (isArabic ? "إضافة تخصص جديد" : "Add New Specialization"))} maxWidth="max-w-lg">
                <form onSubmit={saveCourse} className="space-y-3">
                  {isSchool ? (
                    <div className="space-y-3">
                      <input name="GradeLevel" type="number" min="1" max="12" value={courseForm.GradeLevel} onChange={(e) => { const level = e.target.value; setCourseForm((prev) => ({ ...prev, GradeLevel: level, Name: level ? `Grade ${level}` : "" })); }} placeholder={isArabic ? "مستوى الصف (1-12)" : "Grade level (1-12)"} className="h-11 w-full rounded-xl border border-slate-200 px-3" required />
                      <input name="Name" value={courseForm.Name} onChange={setField(setCourseForm)} placeholder={isArabic ? "اسم الصف" : "Grade name"} className="h-11 w-full rounded-xl border border-slate-200 px-3 bg-slate-50" readOnly />
                      <p className="text-xs text-slate-500">{isArabic ? "سيتم عرض الصفوف كالتالي: الصف الأول، الصف الثاني..." : "Grades will be displayed as: Grade 1, Grade 2..."}</p>
                    </div>
                  ) : (
                    <input name="Name" value={courseForm.Name} onChange={setField(setCourseForm)} placeholder={t.organization.courses.name} className="h-11 w-full rounded-xl border border-slate-200 px-3" required />
                  )}
                  <textarea name="Description" value={courseForm.Description} onChange={setField(setCourseForm)} placeholder={t.organization.courses.description} className="min-h-24 w-full rounded-xl border border-slate-200 px-3 py-2" />
                  <div className="space-y-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{t.organization.courses.thumbnail}</p>
                        <p className="mt-1 text-xs text-slate-500">{isArabic ? 'ارفع صورة من جهازك وسيتم حفظها تلقائيًا.' : 'Upload an image from your device and it will be saved automatically.'}</p>
                      </div>
                      {courseThumbnailPreview ? (<button type="button" onClick={clearCourseThumbnail} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">{isArabic ? 'مسح الصورة' : 'Clear image'}</button>) : null}
                    </div>
                    <input type="file" accept="image/*" onChange={handleCourseThumbnailChange} className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-full file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-slate-800" />
                    {courseThumbnailPreview ? (<div className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><img src={courseThumbnailPreview} alt={isArabic ? 'معاينة صورة الكورس' : 'Course image preview'} className="h-40 w-full object-cover" /></div>) : null}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button type="submit" disabled={actionLoading} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">{t.organization.common.save}</button>
                    <button type="button" onClick={resetCourseForm} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">{t.organization.common.clear}</button>
                  </div>
                </form>
              </Modal>
            )}

            <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              {drillCourse && (
                <div className="mb-5 flex flex-wrap items-center gap-2 text-sm">
                  <button type="button" onClick={() => { setDrillCourse(null); setDrillSubject(null); setDrillExpandedLesson(null); }} className="font-bold text-indigo-600 hover:underline">
                    {isSchool ? (isArabic ? "الصفوف" : "Grades") : (isArabic ? "التخصصات" : "Specializations")}
                  </button>
                  <ChevronRight size={14} className="flex-shrink-0 text-slate-400" />
                  {drillSubject ? (
                    <>
                      <button type="button" onClick={() => { setDrillSubject(null); setDrillExpandedLesson(null); }} className="font-bold text-indigo-600 hover:underline">
                        {formatGradeName(drillCourse, isSchool, isArabic) || drillCourse.Name || drillCourse.name}
                      </button>
                      <ChevronRight size={14} className="flex-shrink-0 text-slate-400" />
                      <span className="font-bold text-slate-900">{drillSubject.name}</span>
                    </>
                  ) : (
                    <span className="font-bold text-slate-900">
                      {formatGradeName(drillCourse, isSchool, isArabic) || drillCourse.Name || drillCourse.name}
                    </span>
                  )}
                </div>
              )}
              {!drillCourse && (<>
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-5">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-700">{isSchool ? (isArabic ? "قسم الصفوف" : "Grades section") : (isArabic ? "قسم التخصصات" : "Specializations section")}</p>
                  <h2 className="mt-2 text-2xl font-black text-slate-900">{isSchool ? (isArabic ? "الصفوف" : "Grades") : t.organization.courses.listTitle}</h2>
                  <p className="mt-2 text-sm text-slate-600">{isSchool ? (isArabic ? "هنا تضيف الصفوف وتعدّلها" : "Add and edit grades in their own section") : (isArabic ? "هنا تضيف التخصصات وتعدّلها وتدير تفاصيلها بشكل مستقل" : "Add, edit, and manage specializations in their own section")}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-sm font-bold text-sky-700">
                    {filteredCourses.length} {isSchool ? (isArabic ? "صف" : "grades") : (isArabic ? "مسار" : "tracks")}
                  </span>
                  {canManageCourses && (
                    <button type="button" onClick={() => { resetCourseForm(); setCourseModalOpen(true); }} className="rounded-full bg-purple-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-purple-700">
                      {isSchool ? (isArabic ? "+ إضافة صف" : "+ Add Grade") : (isArabic ? "+ إضافة تخصص" : "+ Add Specialization")}
                    </button>
                  )}
                </div>
              </div>

              {!canManageCourses && (
                <div className="mt-5 rounded-[24px] border border-amber-200 bg-amber-50 p-5">
                  <p className="text-sm font-bold text-amber-900">{isArabic ? "إنشاء التخصص متاح فقط لحسابات المنظمة." : "Specialization creation is available only for organization accounts."}</p>
                  <p className="mt-2 text-sm text-amber-800">{isArabic ? "المعلمون يمكنهم إدارة المواد والدروس فقط." : "Teachers can manage subjects and lessons only."}</p>
                </div>
              )}

              <div className="mt-5 flex flex-wrap items-end gap-3">
                <label className="flex min-w-[240px] flex-1 items-center gap-2 rounded-[14px] border border-slate-300 bg-white px-4 py-3">
                  <Search size={16} className="text-slate-400" />
                  <input
                    value={courseSearch}
                    onChange={(event) => setCourseSearch(event.target.value)}
                    placeholder={isSchool ? (isArabic ? "فلترة الصفوف" : "Filter grades") : (isArabic ? "فلترة الكورسات (الاسم/الوصف)" : "Filter courses (name/description)")}
                    className="w-full bg-transparent text-sm outline-none"
                  />
                </label>

                <select value={courseTrack} onChange={(event) => setCourseTrack(event.target.value)} className="h-11 rounded-[14px] border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700">
                  <option value="ALL">{isArabic ? "كل التخصصات" : "All Specializations"}</option>
                  {courseTrackOptions.map((track) => (
                    <option key={track} value={track}>{track}</option>
                  ))}
                </select>

                <select value={coursePrice} onChange={(event) => setCoursePrice(event.target.value)} className="h-11 rounded-[14px] border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700">
                  <option value="ALL">{isArabic ? "كل الأسعار" : "All Prices"}</option>
                  <option value="FREE">{isArabic ? "مجاني" : "Free"}</option>
                  <option value="PAID">{isArabic ? "مدفوع" : "Paid"}</option>
                </select>

                <button
                  type="button"
                  onClick={() => { setCourseSearch(""); setCourseTrack("ALL"); setCoursePrice("ALL"); }}
                  className="h-11 rounded-[14px] border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  {isArabic ? "مسح" : "Clear"}
                </button>

                <button
                  type="button"
                  onClick={downloadCoursesList}
                  className="h-11 rounded-[14px] border border-sky-200 bg-sky-50 px-4 text-sm font-semibold text-sky-700 transition hover:bg-sky-100"
                >
                  {isArabic ? "تنزيل CSV" : "Download CSV"}
                </button>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filteredCourses.length === 0 ? (
                  <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center text-sm text-slate-500 md:col-span-2 xl:col-span-3">
                    {t.organization.common.empty}
                  </div>
                ) : filteredCourses.map((course, index) => {
                  const accentClasses = ["from-cyan-500 to-blue-600", "from-violet-500 to-fuchsia-600", "from-amber-500 to-orange-500", "from-emerald-500 to-teal-500"];
                  const accent = accentClasses[index % accentClasses.length];
                  const trackLabel = formatGradeName(course, isSchool, isArabic) || course.Name || course.name || "-";
                  const priceLabel = course?.isPaid ? (isArabic ? "مدفوع" : "Paid") : (isArabic ? "مجاني" : "Free");
                  const courseLevel = course?.level || null;
                  const LEVEL_MAP = {
                    BEGINNER:     { en: "Beginner",     ar: "مبتدئ", cls: "bg-emerald-100 text-emerald-700" },
                    INTERMEDIATE: { en: "Intermediate", ar: "متوسط", cls: "bg-sky-100 text-sky-700"         },
                    ADVANCED:     { en: "Advanced",     ar: "متقدم", cls: "bg-violet-100 text-violet-700"   },
                    EXPERT:       { en: "Expert",       ar: "خبير",  cls: "bg-rose-100 text-rose-700"       },
                  };
                  const levelInfo = courseLevel ? LEVEL_MAP[courseLevel] : null;
                  const teacherName = (() => {
                    const raw = course?.Teacher_name || course?.teacherName || course?.teacher?.name || course?.teacher?.user?.name || "";
                    return raw && raw.toLowerCase() !== "unknown" ? raw : null;
                  })();

                  return (
                    <article key={course.id} className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                      <div className={`flex h-44 items-center justify-center bg-gradient-to-br ${accent} p-6`}>
                        <img
                          src={getCourseThumbnailUrl(course.Thumbnail)}
                          alt={course.Name || (isArabic ? 'صورة الكورس' : 'Course image')}
                          onError={(event) => {
                            event.currentTarget.src = DEFAULT_COURSE_THUMBNAIL;
                          }}
                          className="h-full w-full rounded-[20px] object-cover shadow-lg shadow-black/10"
                        />
                      </div>
                      <div className="p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="truncate text-lg font-black text-slate-900">{trackLabel}</h3>
                            {teacherName && (
                              <p className="mt-1 text-sm text-slate-500">{teacherName}</p>
                            )}
                          </div>
                        </div>

                        <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">{translateCourseDescription(course.Description, isArabic) || (isArabic ? "لا يوجد وصف" : "No description")}</p>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">{trackLabel}</span>
                        </div>

                        <div className="mt-5 flex items-center justify-end border-t border-slate-200 pt-4">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => enterCourse(course)}
                              className="flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100"
                              title={isArabic ? "فتح الكورس" : "Open course"}
                            >
                              <FolderOpen size={13} />
                              {isArabic ? "فتح" : "Open"}
                            </button>
                            <button
                              type="button"
                              onClick={() => openCourseEditor(course)}
                              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                              title={t.organization.common.edit}
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => openDeleteConfirm({
                                title: isArabic ? "حذف الكورس؟" : "Delete Course?",
                                label: trackLabel,
                                onConfirm: async () => {
                                  await handleAction(async () => {
                                    await deleteOrganizationCourse(course.id);
                                    const next = await fetchOrganizationCourses();
                                    setCourses(next);
                                    setSubjectsByCourse((prev) => {
                                      const clone = { ...prev };
                                      delete clone[course.id];
                                      return clone;
                                    });
                                    if (selectedCourseId === course.id) {
                                      setSelectedCourseId(next?.[0]?.id || null);
                                    }
                                    closeDeleteConfirm();
                                  }, t.organization.messages.courseDeleted);
                                },
                              })}
                              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-rose-50 hover:text-rose-700"
                              title={t.organization.common.delete}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
              </>)}

              {/* ── Level 2: subjects for drillCourse ── */}
              {drillCourse && !drillSubject && (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-5">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.22em] text-indigo-700">{sl.plural}</p>
                      <h2 className="mt-2 text-2xl font-black text-slate-900">{formatGradeName(drillCourse, isSchool, isArabic) || drillCourse.Name || drillCourse.name}</h2>
                    </div>
                    <span className="rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-sm font-bold text-indigo-700">
                      {drillSubjects.length} {sl.countOf}
                    </span>
                  </div>
                  {drillSubjectsLoading ? (
                    <div className="mt-6 space-y-3">
                      {[1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl border border-slate-200 bg-slate-50" />)}
                    </div>
                  ) : drillSubjects.length === 0 ? (
                    <div className="mt-6 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
                      <p className="text-sm font-semibold text-slate-500">{isArabic ? "لا توجد مواد في هذا التخصص بعد." : "No subjects in this specialization yet."}</p>
                    </div>
                  ) : (
                    <div className="mt-6 overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-slate-200">
                            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600">#</th>
                            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600">{sl.singular}</th>
                            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600">{isArabic ? "المدرس" : "Teacher"}</th>
                            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600">{isArabic ? "الوصف" : "Description"}</th>
                            <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-slate-600">{isArabic ? "الإجراءات" : "Actions"}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {drillSubjects.map((subject, idx) => (
                            <tr key={subject.id} className="border-b border-slate-200 transition hover:bg-slate-50">
                              <td className="px-4 py-3 text-sm font-semibold text-slate-600">{idx + 1}</td>
                              <td className="px-4 py-3 text-sm font-semibold text-slate-900">{subject.name}</td>
                              <td className="px-4 py-3 text-sm text-slate-700">{subject?.teacher?.user?.name || "-"}</td>
                              <td className="px-4 py-3 text-sm text-slate-600 line-clamp-2">{subject.Description || "-"}</td>
                              <td className="px-4 py-3 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <button type="button" onClick={() => enterSubject(subject)} className="flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100">
                                    <FolderOpen size={13} />
                                    {isArabic ? "عرض الدروس" : "View Lessons"}
                                  </button>
                                  <button type="button" onClick={() => { setSubjectForm({ id: subject.id, name: subject.name, Description: subject.Description || "", Teacher_id: subject.Teacher_id || "", isPaid: Boolean(subject.isPaid), price: subject.price ? String(subject.price) : "", level: subject.level || "", imageUrl: subject.imageUrl || "" }); setSubjectImageFile(null); setSubjectImagePreview(subject.imageUrl || ""); setSubjectModalOpen(true); }} className="rounded-lg border border-slate-300 bg-white p-2 text-slate-700 transition hover:bg-slate-50" title={isArabic ? "تعديل" : "Edit"}>
                                    <Pencil size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}

              {/* ── Level 3: lessons for drillSubject ── */}
              {drillCourse && drillSubject && (
                <>
                  <div className="border-b border-slate-200 pb-5">
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-indigo-700">{isArabic ? "دروس المادة" : "Lesson content"}</p>
                    <h2 className="mt-2 text-2xl font-black text-slate-900">{drillSubject.name}</h2>
                    {!drillLessonsLoading && (
                      <p className="mt-1 text-sm text-slate-500">
                        {isArabic ? `${drillLessons.length} درس مُضاف من المدرس` : `${drillLessons.length} lesson${drillLessons.length !== 1 ? "s" : ""} installed by teacher`}
                      </p>
                    )}
                  </div>
                  {drillLessonsLoading ? (
                    <div className="mt-6 flex items-center justify-center py-12">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                    </div>
                  ) : drillLessons.length === 0 ? (
                    <div className="mt-6 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
                      <p className="text-sm font-semibold text-slate-500">{isArabic ? "لم يقم المدرس بإضافة أي دروس لهذه المادة بعد." : "The teacher has not installed any lessons yet."}</p>
                    </div>
                  ) : (
                    <div className="mt-6 space-y-3">
                      {drillLessons.map((lesson, idx) => {
                        const isOpen = drillExpandedLesson === lesson.id;
                        const files = (lesson.attachments || []).filter((a) => String(a.fileType || a.type || "").toUpperCase() !== "VIDEO");
                        const getExt = (a) => { const n = a.originalName || a.name || ""; const d = n.lastIndexOf("."); return d !== -1 ? n.slice(d + 1).toUpperCase() : (a.mimeType || "FILE").split("/").pop().toUpperCase(); };
                        return (
                          <div key={lesson.id} className="overflow-hidden rounded-2xl border border-slate-200">
                            <button type="button" onClick={() => setDrillExpandedLesson(isOpen ? null : lesson.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-50">
                              <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">{idx + 1}</span>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-slate-900">{lesson.title || lesson.name || "-"}</p>
                                {lesson.description ? <p className="mt-0.5 line-clamp-1 text-xs text-slate-400">{lesson.description}</p> : null}
                              </div>
                              <div className="flex flex-shrink-0 items-center gap-2">
                                {lesson.videoUrl ? <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">{isArabic ? "فيديو" : "Video"}</span> : null}
                                {files.length > 0 ? <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">{files.length} {isArabic ? "ملف" : "file(s)"}</span> : null}
                                <span className="text-slate-400">{isOpen ? "▲" : "▼"}</span>
                              </div>
                            </button>
                            {isOpen && (
                              <div className="space-y-4 border-t border-slate-100 bg-slate-50 px-4 pb-4 pt-4">
                                {lesson.videoUrl ? (
                                  <div>
                                    <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">{isArabic ? "الفيديو" : "Video"}</p>
                                    <video controls src={lesson.videoUrl} className="w-full rounded-xl bg-slate-900" style={{ maxHeight: 320 }} />
                                  </div>
                                ) : (
                                  <p className="text-xs text-slate-400">{isArabic ? "لا يوجد فيديو لهذا الدرس." : "No video for this lesson."}</p>
                                )}
                                {files.length > 0 && (
                                  <div>
                                    <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">{isArabic ? "المرفقات" : "Attachments"}</p>
                                    <div className="space-y-2">
                                      {files.map((att) => (
                                        <a key={att.id} href={att.fileUrl || att.url} target="_blank" rel="noreferrer" download={att.originalName || att.name} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50">
                                          <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-[10px] font-black text-indigo-600">{getExt(att)}</span>
                                          <span className="truncate">{att.originalName || att.name || "File"}</span>
                                          <span className="ml-auto flex-shrink-0 text-xs text-slate-400">↓</span>
                                        </a>
                                      ))}
                                    </div>
                                  </div>
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
            </article>
          </section>
        )}


        {!loading && activeTab === "subjects" && (
          <section className="space-y-6">
            <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-[20px] border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{isArabic ? "إجمالي المواد" : "Total Subjects"}</p>
                      <p className="mt-2 text-3xl font-black text-slate-900">{currentSubjects.length}</p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 text-xl">📚</div>
                  </div>
                </div>
                
                <div className="rounded-[20px] border border-slate-200 bg-gradient-to-br from-blue-50 to-white p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{isArabic ? "المدرسون" : "Instructors"}</p>
                      <p className="mt-2 text-3xl font-black text-slate-900">{teachers.length}</p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-xl">👨‍🏫</div>
                  </div>
                </div>
                
                <div className="rounded-[20px] border border-slate-200 bg-gradient-to-br from-green-50 to-white p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{isArabic ? "المسار الحالي" : "Current Track"}</p>
                      <p className="mt-2 text-lg font-black text-slate-900 line-clamp-1">{selectedCourseId ? (formatGradeName(courses.find((c) => c.id === selectedCourseId), isSchool, isArabic) || "-") : "-"}</p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-xl">🎓</div>
                  </div>
                </div>
              </div>
            </article>

            <Modal open={subjectModalOpen} onClose={() => { setSubjectModalOpen(false); resetSubjectForm(); }} title={subjectForm.id ? sl.formTitle : sl.addNew} maxWidth="max-w-lg">
              <form onSubmit={saveSubject} className="space-y-3">
                <p className="text-xs text-slate-500">{isSchool ? sl.gradeHint : sl.courseHint}</p>
                <div className="mt-4 space-y-3">
                  <select value={selectedCourseId || ""} onChange={(event) => handleSubjectsCourseChange(Number(event.target.value) || null)} className="h-11 w-full rounded-xl border border-slate-200 px-3">
                     <option value="">
                       {isSchool ? sl.selectGradeFirst : sl.selectCourseFirst}
                     </option>
                     {sortedSubjectCourses.map((course) => (
                       <option key={course.id} value={course.id}>{formatGradeName(course, isSchool, isArabic) || course.Name}</option>
                     ))}
                  </select>
                  <input name="name" value={subjectForm.name} onChange={setField(setSubjectForm)} placeholder={sl.name} className="h-11 w-full rounded-xl border border-slate-200 px-3" required />
                  <textarea name="Description" value={subjectForm.Description} onChange={setField(setSubjectForm)} placeholder={sl.description} className="min-h-24 w-full rounded-xl border border-slate-200 px-3 py-2" />
                  <select name="Teacher_id" value={subjectForm.Teacher_id} onChange={setField(setSubjectForm)} className="h-11 w-full rounded-xl border border-slate-200 px-3">
                    <option value="">{isArabic ? "اختر المدرس (اختياري)" : "Select teacher (optional)"}</option>
                    {teacherOptions.map((option) => (
                      <option key={option.id} value={option.id}>{option.label}</option>
                    ))}
                  </select>

                  {/* Subject image */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                      {sl.image}
                    </label>
                    {subjectImagePreview && (
                      <div className="relative overflow-hidden rounded-2xl border border-slate-200">
                        <img src={subjectImagePreview} alt="" className="h-32 w-full object-cover" />
                        <button type="button" onClick={() => { setSubjectImageFile(null); setSubjectImagePreview(""); setSubjectForm(p => ({ ...p, imageUrl: "" })); }}
                          className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70">✕</button>
                      </div>
                    )}
                    <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-3 transition hover:border-indigo-300 hover:bg-indigo-50">
                      <span className="text-xl">🖼</span>
                      <span className="text-sm text-slate-500">{isArabic ? "اختر صورة..." : "Choose image..."}</span>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setSubjectImageFile(file);
                        setSubjectImagePreview(URL.createObjectURL(file));
                      }} />
                    </label>
                  </div>

                  {isAcademy ? (
                    <div className="space-y-2">
                      {/* Level selector — academy only */}
                      <div>
                        <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">
                          {sl.level}
                        </label>
                        <div className="grid grid-cols-4 gap-2">
                          {[
                            { value: "BEGINNER",     arLabel: "مبتدئ",    enLabel: "Beginner",     color: "emerald" },
                            { value: "INTERMEDIATE", arLabel: "متوسط",    enLabel: "Intermediate", color: "blue"    },
                            { value: "ADVANCED",     arLabel: "متقدم",    enLabel: "Advanced",     color: "violet"  },
                            { value: "EXPERT",       arLabel: "خبير",     enLabel: "Expert",       color: "rose"    },
                          ].map(({ value, arLabel, enLabel, color }) => {
                            const selected = subjectForm.level === value;
                            const colorMap = {
                              emerald: selected ? "bg-emerald-600 text-white border-emerald-600" : "border-emerald-200 text-emerald-700 hover:bg-emerald-50",
                              blue:    selected ? "bg-blue-600 text-white border-blue-600"       : "border-blue-200 text-blue-700 hover:bg-blue-50",
                              violet:  selected ? "bg-violet-600 text-white border-violet-600"   : "border-violet-200 text-violet-700 hover:bg-violet-50",
                              rose:    selected ? "bg-rose-600 text-white border-rose-600"       : "border-rose-200 text-rose-700 hover:bg-rose-50",
                            };
                            return (
                              <button
                                key={value}
                                type="button"
                                onClick={() => setSubjectForm((prev) => ({ ...prev, level: prev.level === value ? "" : value }))}
                                className={`rounded-xl border px-2 py-2 text-xs font-bold transition ${colorMap[color]}`}
                              >
                                {isArabic ? arLabel : enLabel}
                              </button>
                            );
                          })}
                        </div>
                        {subjectForm.level && (
                          <button
                            type="button"
                            onClick={() => setSubjectForm((prev) => ({ ...prev, level: "" }))}
                            className="mt-1 text-xs text-slate-400 underline"
                          >
                            {isArabic ? "إزالة المستوى" : "Clear level"}
                          </button>
                        )}
                      </div>

                      <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5">
                        <input
                          type="checkbox"
                          checked={Boolean(subjectForm.isPaid)}
                          onChange={(e) => setSubjectForm((prev) => ({ ...prev, isPaid: e.target.checked, price: e.target.checked ? prev.price : "" }))}
                          className="h-4 w-4 rounded accent-slate-900"
                        />
                        <span className="text-sm font-semibold text-slate-700">
                          {isArabic ? "مادة مدفوعة" : "Paid material"}
                        </span>
                      </label>
                      {subjectForm.isPaid ? (
                        <div>
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={subjectForm.price}
                            onChange={(e) => setSubjectForm((prev) => ({ ...prev, price: e.target.value }))}
                            placeholder={isArabic ? "السعر بالدولار (مثال: 19.99)" : "Price in USD (e.g. 19.99)"}
                            className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
                            required
                          />
                          {!subjectForm.price && (
                            <p className="mt-1 text-xs text-rose-600">
                              {isArabic ? "يجب إدخال السعر" : "Price is required for paid subjects"}
                            </p>
                          )}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                <div className="mt-4 flex gap-2">
                  <button type="submit" disabled={actionLoading || !selectedCourseId} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">{t.organization.common.save}</button>
                  <button type="button" onClick={resetSubjectForm} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">{t.organization.common.clear}</button>
                </div>
              </form>
            </Modal>

            {/* ── Lessons read-only modal ── */}
            <LessonsViewModal
              open={lessonsModalOpen}
              subject={lessonsModalSubject}
              lessons={lessonsModalData}
              loading={lessonsModalLoading}
              isArabic={isArabic}
              onClose={() => { setLessonsModalOpen(false); setLessonsModalSubject(null); setLessonsModalData([]); }}
            />

            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
                <div>
                  <h2 className="text-2xl font-black text-slate-900">{sl.managementTitle}</h2>
                  <p className="mt-1 text-sm text-slate-600">{isArabic ? `إدارة ${sl.plural} حسب المسار والمدرس` : `Manage all ${sl.plural.toLowerCase()} across your tracks & grades`}</p>
                </div>
                <button type="button" onClick={() => { resetSubjectForm(); setSubjectModalOpen(true); }} className="rounded-full bg-purple-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-purple-700">
                  {sl.addNewBtn}
                </button>
              </div>

              <div className="mt-6 space-y-4">
                <div className="flex flex-wrap items-end gap-3">
                  <div className="flex-1 min-w-[200px]">
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">{isArabic ? "اختر الصف/المسار" : "Select Track"}</label>
                    <select
                      value={selectedCourseId || ""}
                      onChange={(event) => handleSubjectsCourseChange(Number(event.target.value) || null)}
                      className="h-11 w-full rounded-[14px] border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700"
                    >
                      {sortedSubjectCourses.map((course) => (
                        <option key={course.id} value={course.id}>
                          {formatGradeName(course, isSchool, isArabic) || course.Name || course.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex-1 min-w-[200px]">
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">{isArabic ? "المدرس" : "Filter by Teacher"}</label>
                    <select value={selectedTeacherId} onChange={(e) => setSelectedTeacherId(e.target.value)} className="h-11 w-full rounded-[14px] border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700">
                      <option value="">{isArabic ? "الكل" : "All Teachers"}</option>
                      {teacherOptions.map((opt) => (
                        <option key={opt.id} value={opt.id}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex-1 min-w-[240px]">
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">{isArabic ? "بحث" : "Search Subjects"}</label>
                    <div className="flex items-center gap-2 rounded-[14px] border border-slate-300 bg-white px-4">
                      <Search size={16} className="text-slate-400" />
                      <input
                        value={subjectSearch}
                        onChange={(e) => setSubjectSearch(e.target.value)}
                        placeholder={isArabic ? "ابحث عن مادة أو معلم" : "Name, teacher, course..."}
                        className="w-full bg-transparent py-3 text-sm outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => { setSelectedTeacherId(""); setSubjectSearch(""); }}
                    className="h-11 rounded-[14px] border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    {isArabic ? "مسح" : "Clear"}
                  </button>
                </div>
              </div>

              {subjectsLoading ? (
                <div className="mt-6 space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-16 rounded-[14px] border border-slate-200 bg-slate-50 animate-pulse" />
                  ))}
                </div>
              ) : filteredSubjects.length > 0 ? (
                <div className="mt-6 overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600">#</th>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600">{sl.columnName}</th>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600">{isArabic ? "الصف/المسار" : "Track"}</th>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600">{isArabic ? "المدرس" : "Teacher"}</th>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600">{isArabic ? "الوصف" : "Description"}</th>
                        {isAcademy && <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600">{isArabic ? "المستوى" : "Level"}</th>}
                        <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-slate-600">{isArabic ? "الإجراءات" : "Actions"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSubjects.map((subject, idx) => (
                        <tr key={subject.id} className="border-b border-slate-200 hover:bg-slate-50 transition">
                          <td className="px-4 py-3 text-sm font-semibold text-slate-600">{idx + 1}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-slate-900">{subject.name}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className="inline-block rounded-full bg-purple-100 px-3 py-1 text-purple-700 font-semibold text-xs">
                              {formatGradeName(subject?.course || courses.find((c) => c.id === selectedCourseId), isSchool, isArabic)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700">{subject?.teacher?.user?.name || "-"}</td>
                          <td className="px-4 py-3 text-sm text-slate-600 line-clamp-2">{subject.Description || "-"}</td>
                          {isAcademy && (
                            <td className="px-4 py-3">
                              {subject.level ? (
                                <span className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${
                                  subject.level === 'BEGINNER'     ? 'bg-emerald-100 text-emerald-700' :
                                  subject.level === 'INTERMEDIATE' ? 'bg-blue-100 text-blue-700'       :
                                  subject.level === 'ADVANCED'     ? 'bg-violet-100 text-violet-700'   :
                                  subject.level === 'EXPERT'       ? 'bg-rose-100 text-rose-700'       :
                                  'bg-slate-100 text-slate-600'
                                }`}>
                                  {isArabic
                                    ? (subject.level === 'BEGINNER' ? 'مبتدئ' : subject.level === 'INTERMEDIATE' ? 'متوسط' : subject.level === 'ADVANCED' ? 'متقدم' : 'خبير')
                                    : subject.level.charAt(0) + subject.level.slice(1).toLowerCase()}
                                </span>
                              ) : (
                                <span className="text-xs text-slate-400">—</span>
                              )}
                            </td>
                          )}
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => openLessonsModal(subject)}
                                className="rounded-lg border border-indigo-200 bg-indigo-50 p-2 text-indigo-700 hover:bg-indigo-100 transition"
                                title={isArabic ? "عرض المحتوى" : "View content"}
                              >
                                <Eye size={16} />
                              </button>
                              <button
                                type="button"
                                onClick={() => { setSubjectForm({ id: subject.id, name: subject.name, Description: subject.Description || "", Teacher_id: subject.Teacher_id || "", isPaid: Boolean(subject.isPaid), price: subject.price ? String(subject.price) : "", level: subject.level || "", imageUrl: subject.imageUrl || "" }); setSubjectImageFile(null); setSubjectImagePreview(subject.imageUrl || ""); setSubjectModalOpen(true); }}
                                className="rounded-lg border border-slate-300 bg-white p-2 text-slate-700 hover:bg-slate-50 transition"
                                title={isArabic ? "تعديل" : "Edit"}
                              >
                                <Pencil size={16} />
                              </button>
                              <button
                                type="button"
                                onClick={() => openDeleteConfirm({
                                  title: isArabic ? "حذف المادة؟" : "Delete Subject?",
                                  label: subject.name,
                                  onConfirm: async () => {
                                    await handleAction(async () => {
                                      await deleteCourseSubject(selectedCourseId, subject.id);
                                      const next = await fetchCourseSubjects(selectedCourseId);
                                      setSubjectsByCourse((prev) => ({ ...prev, [selectedCourseId]: next }));
                                      setSubjectSelectionTouched(true);
                                      closeDeleteConfirm();
                                    }, sl.deleted);
                                  },
                                })}
                                className="rounded-lg border border-rose-300 bg-rose-50 p-2 text-rose-700 hover:bg-rose-100 transition"
                                title={isArabic ? "حذف" : "Delete"}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : shouldShowSubjectsEmptyState ? (
                <div className="mt-8 rounded-[20px] border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
                  <p className="text-sm font-semibold text-slate-600">{isArabic ? "لا توجد مواد لهذا التخصص" : "No subjects in this specialization"}</p>
                  <p className="mt-1 text-xs text-slate-500">{isArabic ? "حاول تغيير الفلاتر أو أضف مادة جديدة" : "Try adjusting filters or add a new subject"}</p>
                </div>
              ) : (
                <div className="mt-8 rounded-[20px] border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
                  <p className="text-sm font-semibold text-slate-600">{isArabic ? "اختر تخصصًا لعرض المواد" : "Choose a specialization to view subjects"}</p>
                  <p className="mt-1 text-xs text-slate-500">{isArabic ? "يمكنك التبديل بين الصفوف/التخصصات من الأعلى" : "Use the selector above to switch grades/specializations"}</p>
                </div>
              )}
            </div>
          </section>
        )}

        {!loading && activeTab === TABS.STUDENTS && (
          <section className="space-y-4">
            <Modal open={studentModalOpen} onClose={() => { setStudentModalOpen(false); resetStudentForm(); }} title={studentForm.id ? t.organization.students.formTitle : (isArabic ? "إضافة طالب جديد" : "Add New Student")} maxWidth="max-w-lg">
              <form onSubmit={saveStudent} className="space-y-3">
                <input name="name" value={studentForm.name} onChange={setField(setStudentForm)} placeholder={t.organization.students.name} className="h-11 w-full rounded-xl border border-slate-200 px-3" required />
                {!studentForm.id && (
                  <div className="flex overflow-hidden rounded-xl border border-slate-200">
                    <button type="button" onClick={() => setStudentEmailAuto(false)}
                      className={`flex-1 py-2 text-xs font-semibold transition ${!studentEmailAuto ? "bg-slate-900 text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}>
                      {isArabic ? "إدخال البريد يدوياً" : "Enter email manually"}
                    </button>
                    <button type="button" onClick={() => setStudentEmailAuto(true)}
                      className={`flex-1 py-2 text-xs font-semibold transition ${studentEmailAuto ? "bg-indigo-600 text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}>
                      {isArabic ? "توليد تلقائي بالنطاق" : "Auto-generate by domain"}
                    </button>
                  </div>
                )}
                {(!studentForm.id && !studentEmailAuto) || studentForm.id ? (
                  <input name="email" value={studentForm.email} onChange={setField(setStudentForm)} placeholder={t.organization.students.email} className="h-11 w-full rounded-xl border border-slate-200 px-3" required={!studentForm.id} />
                ) : (
                  <p className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-2.5 text-xs text-indigo-600">
                    {isArabic ? "سيتم توليد البريد تلقائياً بناءً على اسم الطالب ونطاق المنظمة." : "Email will be auto-generated based on the student's name and your organization's domain."}
                  </p>
                )}
                <input name="age" type="number" value={studentForm.age} onChange={setField(setStudentForm)} placeholder={t.organization.students.age} className="h-11 w-full rounded-xl border border-slate-200 px-3" />
                <input name="dob" type="date" value={studentForm.dob} onChange={setField(setStudentForm)} className="h-11 w-full rounded-xl border border-slate-200 px-3" />
                {isSchool && <input name="parentNationalId" value={studentForm.parentNationalId} onChange={setField(setStudentForm)} placeholder={t.organization.students.parentNationalId} className="h-11 w-full rounded-xl border border-slate-200 px-3" />}
                <select name="gender" value={studentForm.gender} onChange={setField(setStudentForm)} className="h-11 w-full rounded-xl border border-slate-200 px-3">
                  <option value="MALE">{t.organization.students.male}</option>
                  <option value="FEMALE">{t.organization.students.female}</option>
                </select>
                <input name="address" value={studentForm.address} onChange={setField(setStudentForm)} placeholder={t.organization.students.address} className="h-11 w-full rounded-xl border border-slate-200 px-3" />
                <div className="flex gap-2 pt-1">
                  <button type="submit" disabled={actionLoading} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">{t.organization.common.save}</button>
                  <button type="button" onClick={resetStudentForm} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">{t.organization.common.clear}</button>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-800">{t.organization.students.importTitle}</p>
                  <p className="mt-1 text-xs text-slate-500">{t.organization.students.importHint}</p>
                  <label className="mt-3 inline-flex cursor-pointer items-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
                    <input type="file" accept=".xlsx,.xls" className="hidden" onChange={uploadStudentExcel} />
                    {t.organization.students.importAction}
                  </label>
                </div>
              </form>
            </Modal>

            <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-5">
                <div>
                  <h2 className="text-2xl font-black text-slate-900">{t.organization.students.listTitle}</h2>
                  <p className="mt-1 text-sm text-slate-600">{isArabic ? "قائمة الطلاب مع الحالة والروابط" : "Students with status, course, and quick actions"}</p>
                </div>
                <button type="button" onClick={() => { resetStudentForm(); setStudentModalOpen(true); }} className="rounded-full bg-purple-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-purple-700">
                  {isArabic ? "+ إضافة طالب" : "+ Add Student"}
                </button>
              </div>

              <div className="mt-5 flex flex-wrap items-end gap-3">
                <label className="flex min-w-[240px] flex-1 items-center gap-2 rounded-[14px] border border-slate-300 bg-white px-4 py-3">
                  <Search size={16} className="text-slate-400" />
                  <input
                    value={studentSearch}
                    onChange={(event) => setStudentSearch(event.target.value)}
                    placeholder={isArabic ? "فلترة الطلاب (الاسم/البريد/العنوان)" : "Filter students (name/email/address)"}
                    className="w-full bg-transparent text-sm outline-none"
                  />
                </label>

                <select
                  value={selectedCourseId || ""}
                  onChange={(event) => setSelectedCourseId(event.target.value ? Number(event.target.value) : null)}
                  className="h-11 rounded-[14px] border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700"
                >
                  <option value="">
                    {isSchool
                      ? (isArabic ? "كل الصفوف" : "All grades")
                      : (isArabic ? "كل الدورات" : "All courses")}
                  </option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>{formatGradeName(c, isSchool, isArabic) || c.Name || c.name}</option>
                  ))}
                </select>

                <select
                  value={studentStatus}
                  onChange={(event) => setStudentStatus(event.target.value)}
                  className="h-11 rounded-[14px] border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700"
                >
                  <option value="ALL">{isArabic ? "كل الحالات" : "All Status"}</option>
                  <option value="ACTIVE">{isArabic ? "نشط" : "Active"}</option>
                  <option value="INACTIVE">{isArabic ? "غير نشط" : "Inactive"}</option>
                  <option value="GRADUATED">{isArabic ? "متخرج" : "Graduated"}</option>
                  <option value="FILED">{isArabic ? "مؤرشف" : "Filed"}</option>
                </select>

                <button
                  type="button"
                  onClick={() => {
                    setStudentSearch("");
                    setSelectedCourseId(null);
                    setStudentGenderFilter("ALL");
                    setStudentStatus("ALL");
                  }}
                  className="h-11 rounded-[14px] border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  {isArabic ? "مسح" : "Clear"}
                </button>

                <button
                  type="button"
                  onClick={downloadStudentsList}
                  className="h-11 rounded-[14px] border border-sky-200 bg-sky-50 px-4 text-sm font-semibold text-sky-700 transition hover:bg-sky-100"
                >
                  {isArabic ? "تنزيل CSV" : "Download CSV"}
                </button>
              </div>

              <div className="mt-6 overflow-hidden rounded-[24px] border border-slate-200">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-4 py-3">#</th>
                        <th className="px-4 py-3">{t.organization.students.name}</th>
                        <th className="px-4 py-3">{t.organization.students.email}</th>
                        <th className="px-4 py-3">{isSchool ? (isArabic ? "الصف" : "Grade") : (isArabic ? "المسار" : "Track")}</th>
                        <th className="px-4 py-3">{t.organization.students.age}</th>
                        <th className="px-4 py-3">{isArabic ? "الحالة" : "Status"}</th>
                        <th className="px-4 py-3">{t.organization.common.actions}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {filteredStudents.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="px-4 py-6 text-center text-slate-500">{t.organization.common.empty}</td>
                        </tr>
                      ) : pagedStudents.map((student, index) => {
                        const statusValue = String(student?.status || student?.Status || "").toUpperCase();
                        const statusLabel = {
                          ACTIVE:    isArabic ? "نشط"     : "Active",
                          INACTIVE:  isArabic ? "غير نشط" : "Inactive",
                          GRADUATED: isArabic ? "متخرج"   : "Graduated",
                          FILED:     isArabic ? "مؤرشف"   : "Filed",
                        }[statusValue] || (statusValue || "-");
                        const statusClass = {
                          ACTIVE:    "bg-emerald-100 text-emerald-700",
                          INACTIVE:  "bg-slate-100 text-slate-600",
                          GRADUATED: "bg-blue-100 text-blue-700",
                          FILED:     "bg-amber-100 text-amber-700",
                        }[statusValue] || "bg-slate-100 text-slate-500";

                        return (
                          <tr key={student.id} className="hover:bg-slate-50/70">
                            <td className="px-4 py-4 font-semibold text-slate-500">{index + 1}</td>
                            <td className="px-4 py-4 font-semibold text-slate-900">{student.name}</td>
                            <td className="px-4 py-4 text-slate-600">{student.email}</td>
                            <td className="px-4 py-4 text-slate-600">{selectedCourseId ? (formatGradeName(courses.find((course) => course.id === selectedCourseId), isSchool, isArabic) || "-") : (isArabic ? "الكل" : "All")}</td>
                            <td className="px-4 py-4 text-slate-600">{student.age ?? "-"}</td>
                            <td className="px-4 py-4">
                              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${statusClass}`}>{statusLabel}</span>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex flex-wrap gap-2">
                                {/* Quick status change */}
                                {isSchool ? (
                                  <select
                                    value={statusValue || "ACTIVE"}
                                    onChange={async (e) => {
                                      const next = e.target.value;
                                      try {
                                        await updateOrganizationUser(student.id, { academicStatus: next });
                                        const next2 = await fetchOrganizationUsers();
                                        setUsers(next2);
                                        notifySuccess(isArabic ? "تم تحديث الحالة" : "Status updated");
                                      } catch (err) {
                                        notifyError(safeError(err));
                                      }
                                    }}
                                    className="rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 focus:border-indigo-400 focus:outline-none"
                                  >
                                    <option value="ACTIVE">{isArabic ? "نشط" : "Active"}</option>
                                    <option value="INACTIVE">{isArabic ? "غير نشط" : "Inactive"}</option>
                                    <option value="GRADUATED">{isArabic ? "متخرج" : "Graduated"}</option>
                                    <option value="FILED">{isArabic ? "مؤرشف" : "Filed"}</option>
                                  </select>
                                ) : null}
                                <button
                                  type="button"
                                  onClick={() => { setStudentForm({ id: student.id, name: student.name || "", email: student.email || "", password: "", age: student.age || "", gender: student.gender || "MALE", address: student.address || "", dob: student.dob ? String(student.dob).slice(0, 10) : "", parentNationalId: "" }); setStudentModalOpen(true); }}
                                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                                  title={t.organization.common.edit}
                                >
                                  <Pencil size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openEnrollmentModal(student)}
                                  className="rounded-xl border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-50"
                                >
                                  {isArabic
                                    ? isSchool
                                      ? "إدارة الصفوف"
                                      : "إدارة الكورسات"
                                    : isSchool
                                      ? "Manage Grades"
                                      : "Manage Courses"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openDeleteConfirm({
                                    title: isArabic ? "حذف الطالب؟" : "Delete Student?",
                                    label: student.name || student.email || `${student.id}`,
                                    onConfirm: async () => {
                                      await handleAction(async () => {
                                        await deleteOrganizationUser(student.id);
                                        const next = await fetchOrganizationUsers();
                                        setUsers(next);
                                        closeDeleteConfirm();
                                      }, t.organization.messages.studentDeleted);
                                    },
                                  })}
                                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-rose-50 hover:text-rose-700"
                                  title={t.organization.common.delete}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="mt-3 px-1">
                  <Pagination page={studentPage} totalPages={Math.ceil(filteredStudents.length / STUDENT_PAGE_SIZE)} totalItems={filteredStudents.length} pageSize={STUDENT_PAGE_SIZE} onPageChange={setStudentPage} isArabic={isArabic} />
                </div>
              </div>
            </article>
          </section>
        )}

        {!loading && isSchool && activeTab === TABS.PARENTS && (
          <section className="space-y-4">
            <Modal open={parentModalOpen} onClose={() => { setParentModalOpen(false); resetParentForm(); }} title={parentForm.id ? t.organization.parents.formTitle : (isArabic ? "إضافة ولي أمر جديد" : "Add New Parent")} maxWidth="max-w-lg">
              <form onSubmit={saveParent} className="space-y-3">
                <p className="text-xs text-slate-500">{parentForm.id ? t.organization.parents.selectHint : t.organization.parents.createHint}</p>
                <input name="name" value={parentForm.name} onChange={setField(setParentForm)} placeholder={t.organization.parents.name} className="h-11 w-full rounded-xl border border-slate-200 px-3" required />
                {!parentForm.id && (
                  <div className="flex overflow-hidden rounded-xl border border-slate-200">
                    <button type="button" onClick={() => setParentEmailAuto(false)}
                      className={`flex-1 py-2 text-xs font-semibold transition ${!parentEmailAuto ? "bg-slate-900 text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}>
                      {isArabic ? "إدخال البريد يدوياً" : "Enter email manually"}
                    </button>
                    <button type="button" onClick={() => setParentEmailAuto(true)}
                      className={`flex-1 py-2 text-xs font-semibold transition ${parentEmailAuto ? "bg-indigo-600 text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}>
                      {isArabic ? "توليد تلقائي بالنطاق" : "Auto-generate by domain"}
                    </button>
                  </div>
                )}
                {(!parentForm.id && !parentEmailAuto) || parentForm.id ? (
                  <input name="email" value={parentForm.email} onChange={setField(setParentForm)} placeholder={t.organization.parents.email} className="h-11 w-full rounded-xl border border-slate-200 px-3" required={!parentForm.id} />
                ) : (
                  <p className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-2.5 text-xs text-indigo-600">
                    {isArabic ? "سيتم توليد البريد تلقائياً بناءً على اسم ولي الأمر ونطاق المنظمة." : "Email will be auto-generated based on the parent's name and your organization's domain."}
                  </p>
                )}
                <input name="address" value={parentForm.address} onChange={setField(setParentForm)} placeholder={t.organization.parents.address} className="h-11 w-full rounded-xl border border-slate-200 px-3" />
                <div className="flex gap-2 pt-1">
                  <button type="submit" disabled={actionLoading} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">{t.organization.common.save}</button>
                  <button type="button" onClick={resetParentForm} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">{t.organization.common.clear}</button>
                </div>
              </form>
            </Modal>

            <article className="rounded-3xl border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-bold text-slate-900">{t.organization.parents.listTitle}</h2>
                <button type="button" onClick={() => { resetParentForm(); setParentModalOpen(true); }} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
                  {isArabic ? "+ إضافة ولي أمر" : "+ Add Parent"}
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <input
                  value={parentSearch}
                  onChange={(event) => setParentSearch(event.target.value)}
                  placeholder={t.organization.parents.searchPlaceholder}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm md:w-80"
                />
                <select
                  value={parentLinkFilter}
                  onChange={(event) => setParentLinkFilter(event.target.value)}
                  className="h-10 rounded-xl border border-slate-200 px-3 text-sm"
                >
                  <option value="ALL">{t.organization.parents.filterAll}</option>
                  <option value="LINKED">{t.organization.parents.filterLinked}</option>
                  <option value="UNLINKED">{t.organization.parents.filterUnlinked}</option>
                </select>
                <button
                  type="button"
                  onClick={() => {
                    setParentSearch("");
                    setParentLinkFilter("ALL");
                  }}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700"
                >
                  {isArabic ? "مسح" : "Clear"}
                </button>
                <button
                  type="button"
                  onClick={downloadParentsList}
                  className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-700 hover:bg-sky-100"
                >
                  {isArabic ? "تنزيل CSV" : "Download CSV"}
                </button>
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-xs uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="py-2 pr-3">{t.organization.parents.name}</th>
                      <th className="py-2 pr-3">{t.organization.parents.email}</th>
                      <th className="py-2 pr-3">{t.organization.parents.childrenLinked}</th>
                      <th className="py-2 pr-3">{t.organization.parents.children}</th>
                      <th className="py-2 pr-3">{t.organization.parents.address}</th>
                      <th className="py-2 pr-3">{t.organization.common.actions}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredParents.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="py-4 text-slate-500">{t.organization.common.empty}</td>
                      </tr>
                    ) : pagedParents.map((parent) => (
                      <tr key={parent.id} className="border-t border-slate-100">
                        <td className="py-2 pr-3">{parent.name || "-"}</td>
                        <td className="py-2 pr-3">{parent.email || "-"}</td>
                        <td className="py-2 pr-3">{linkedParentIds.has(Number(parent.id)) ? t.organization.parents.linkedYes : t.organization.parents.linkedNo}</td>
                        <td className="py-2 pr-3">{(childrenByParentId.get(Number(parent.id)) || []).map((child) => `${child.name} (ID: ${child.id})`).join("، ") || "-"}</td>
                        <td className="py-2 pr-3">{parent.address || "-"}</td>
                        <td className="py-2 pr-3">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => { setParentForm({ id: parent.id, name: parent.name || "", email: parent.email || "", password: "", address: parent.address || "" }); setParentModalOpen(true); }}
                              className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700"
                            >
                              {t.organization.common.edit}
                            </button>
                            <button
                              type="button"
                              onClick={() => openDeleteConfirm({
                                title: isArabic ? "حذف ولي الأمر؟" : "Delete Parent?",
                                label: parent.name || parent.email || `${parent.id}`,
                                onConfirm: async () => {
                                  await handleAction(async () => {
                                    await deleteOrganizationUser(parent.id);
                                    const next = await fetchOrganizationUsers();
                                    setUsers(next);
                                    if (parentForm.id === parent.id) {
                                      resetParentForm();
                                    }
                                    closeDeleteConfirm();
                                  }, t.organization.messages.parentDeleted);
                                },
                              })}
                              className="rounded-lg border border-rose-200 px-2 py-1 text-xs font-semibold text-rose-700"
                            >
                              {t.organization.common.delete}
                            </button>
                            {!linkedParentIds.has(Number(parent.id)) ? (
                              <button
                                type="button"
                                onClick={() => openLinkDrawer(parent)}
                                className="rounded-lg border border-emerald-200 px-2 py-1 text-xs font-semibold text-emerald-700"
                              >
                                {t.organization.parents.linkChildrenAction}
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-3 px-1">
                  <Pagination page={parentPage} totalPages={Math.ceil(filteredParents.length / PARENT_PAGE_SIZE)} totalItems={filteredParents.length} pageSize={PARENT_PAGE_SIZE} onPageChange={setParentPage} isArabic={isArabic} />
                </div>
              </div>
            </article>
          </section>
        )}

        {isLinkDrawerOpen && linkTargetParent ? createPortal(
          <div className="fixed inset-0 z-[90] flex justify-end bg-slate-900/40" onClick={closeLinkDrawer}>
            <aside className="h-full w-full max-w-xl overflow-y-auto border-l border-slate-200 bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{t.organization.parents.linkDrawerTitle}</p>
                  <h3 className="mt-2 text-xl font-black text-slate-900">{linkTargetParent.name || "-"}</h3>
                  <p className="mt-1 text-sm text-slate-600">{linkTargetParent.email || "-"}</p>
                </div>
                <button type="button" onClick={closeLinkDrawer} className="rounded-lg border border-slate-200 px-3 py-1 text-sm font-semibold text-slate-700">
                  {t.organization.parents.linkCancel}
                </button>
              </div>

              <p className="mt-4 text-sm text-slate-600">{t.organization.parents.linkDrawerHint}</p>

              <div className="mt-4 space-y-3">
                <input
                  value={linkSearchTerm}
                  onChange={(event) => setLinkSearchTerm(event.target.value)}
                  placeholder={t.organization.parents.linkSearchPlaceholder}
                  className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
                />

                <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                  <span className="font-semibold text-slate-700">{t.organization.parents.linkSelectedCount}: {selectedStudentIds.length}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedStudentIds([])}
                    className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700"
                  >
                    {t.organization.parents.linkClearSelection}
                  </button>
                </div>

                <div className="max-h-[55vh] space-y-2 overflow-y-auto pr-1">
                  {linkCandidateStudents.length === 0 ? (
                    <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-600">
                      {t.organization.parents.linkNoCandidates}
                    </p>
                  ) : filteredLinkCandidateStudents.length === 0 ? (
                    <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-600">
                      {t.organization.parents.linkNoResults}
                    </p>
                  ) : filteredLinkCandidateStudents.map((student) => {
                    const studentId = Number(student.id);
                    const isSelected = selectedStudentIds.includes(studentId);

                    return (
                      <label key={studentId} className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 px-3 py-2 hover:bg-slate-50">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">{student.name || "-"}</p>
                          <p className="truncate text-xs text-slate-500">{student.email || "-"}</p>
                        </div>
                        <div className="ml-3 flex items-center gap-3">
                          <span className="rounded-full border border-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-700">ID: {studentId}</span>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleStudentSelection(studentId)}
                          />
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeLinkDrawer}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
                >
                  {t.organization.parents.linkCancel}
                </button>
                <button
                  type="button"
                  onClick={submitParentChildrenLink}
                  disabled={actionLoading}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {t.organization.parents.linkSubmit}
                </button>
              </div>
            </aside>
          </div>,
          document.getElementById('modal-root')
        ) : null}

        {/* ─────────────── MARKS TAB ─────────────── */}
        {!loading && isSchool && activeTab === TABS.MARKS && (() => {
          // Collect all subjects from all courses for the filter dropdown
          // Derive subject list directly from loaded marks — no extra API calls needed
          const allSubjects = [...new Map(
            orgMarks.filter((m) => m.subject).map((m) => [m.Subject_id, { id: m.Subject_id, name: m.subject.name }])
          ).values()].sort((a, b) => a.name.localeCompare(b.name));
          // Unique grade levels from courses
          const gradeLevels = [...new Set(courses.filter((c) => c.GradeLevel).map((c) => c.GradeLevel))].sort((a, b) => a - b);
          // Mark types present
          const markTypes = ['EXAM', 'MIDTERM', 'QUIZ'];

          const totalStudents = new Set(visibleOrgMarks.map((m) => m.Student_id)).size;

          return (
            <section className="space-y-5">
              {/* Header */}
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black text-slate-900">{isArabic ? 'درجات الطلاب' : 'Student Marks'}</h2>
                  <p className="mt-0.5 text-sm text-slate-500">{isArabic ? 'استعراض وتصفية درجات جميع طلاب المدرسة' : 'Browse and filter marks across all students'}</p>
                </div>
                {/* Summary pills + refresh */}
                <div className="flex items-center gap-2">
                  <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-2 text-center">
                    <p className="text-lg font-black text-indigo-700">{visibleOrgMarks.length}</p>
                    <p className="text-[10px] font-bold uppercase text-indigo-400">{isArabic ? 'سجل' : 'Records'}</p>
                  </div>
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-2 text-center">
                    <p className="text-lg font-black text-emerald-700">{totalStudents}</p>
                    <p className="text-[10px] font-bold uppercase text-emerald-400">{isArabic ? 'طالب' : 'Students'}</p>
                  </div>
                  <button type="button" onClick={refreshOrgMarks} disabled={marksLoading}
                    title={isArabic ? 'تحديث' : 'Refresh'}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 disabled:opacity-40">
                    <svg className={marksLoading ? 'animate-spin' : ''} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.5"/></svg>
                  </button>
                </div>
              </div>

              {/* Filters card */}
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-slate-400">{isArabic ? 'تصفية النتائج' : 'Filter Results'}</p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">

                  {/* Student name */}
                  <div className="relative">
                    <svg className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    <input
                      value={marksFilters.studentName}
                      onChange={(e) => setMarksFilters((p) => ({ ...p, studentName: e.target.value, termId: p.termId }))}
                      placeholder={isArabic ? 'اسم الطالب...' : 'Student name...'}
                      className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 ps-9 pe-3 text-sm outline-none focus:border-indigo-400 focus:bg-white"
                    />
                  </div>

                  {/* Grade level */}
                  <select value={marksFilters.gradeLevel} onChange={(e) => setMarksFilters((p) => ({ ...p, gradeLevel: e.target.value, subjectId: '' }))}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-indigo-400">
                    <option value="">{isArabic ? 'كل الصفوف' : 'All grades'}</option>
                    {gradeLevels.map((g) => <option key={g} value={g}>{isArabic ? `الصف ${g}` : `Grade ${g}`}</option>)}
                  </select>

                  {/* Subject */}
                  <select value={marksFilters.subjectId} onChange={(e) => setMarksFilters((p) => ({ ...p, subjectId: e.target.value }))}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-indigo-400">
                    <option value="">{isArabic ? 'كل المواد' : 'All subjects'}</option>
                    {allSubjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>

                  {/* Academic year */}
                  <select value={marksFilters.yearId} onChange={(e) => setMarksFilters((p) => ({ ...p, yearId: e.target.value, termId: '' }))}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-indigo-400">
                    <option value="">{isArabic ? 'كل السنوات' : 'All years'}</option>
                    {academicYears.map((y) => <option key={y.id} value={y.id}>{y.name}{y.isActive ? (isArabic ? ' (نشط)' : ' (Active)') : ''}</option>)}
                  </select>

                  {/* Term */}
                  <select value={marksFilters.termId} onChange={(e) => setMarksFilters((p) => ({ ...p, termId: e.target.value }))}
                    disabled={!marksFilters.yearId || marksTerms.length === 0}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-indigo-400 disabled:opacity-50">
                    <option value="">{isArabic ? 'كل الفصول' : 'All terms'}</option>
                    {marksTerms.map((t) => <option key={t.id} value={t.id}>{t.name || `${isArabic ? 'الفصل' : 'Term'} ${t.termNumber}`}</option>)}
                  </select>

                  {/* Mark type */}
                  <select value={marksFilters.markType} onChange={(e) => setMarksFilters((p) => ({ ...p, markType: e.target.value }))}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-indigo-400">
                    <option value="">{isArabic ? 'كل الأنواع' : 'All types'}</option>
                    {markTypes.map((mt) => <option key={mt} value={mt}>{mt}</option>)}
                  </select>
                </div>

                {/* Reset */}
                {Object.values(marksFilters).some(Boolean) && (
                  <button type="button"
                    onClick={() => setMarksFilters({ gradeLevel: '', subjectId: '', studentName: '', yearId: '', termId: '', markType: '' })}
                    className="mt-3 text-xs font-bold text-rose-500 hover:text-rose-700">
                    ✕ {isArabic ? 'مسح الفلاتر' : 'Clear filters'}
                  </button>
                )}
              </div>

              {/* Marks table */}
              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                {marksLoading ? (
                  <div className="flex items-center justify-center gap-3 py-16 text-slate-500">
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-300 border-t-indigo-600" />
                    <span className="text-sm font-semibold">{isArabic ? 'جارٍ التحميل...' : 'Loading...'}</span>
                  </div>
                ) : visibleOrgMarks.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-16 text-center">
                    <span className="text-4xl">📊</span>
                    <p className="text-sm font-bold text-slate-500">{isArabic ? 'لا توجد درجات تطابق الفلاتر المحددة.' : 'No marks match the selected filters.'}</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-50 text-[11px] font-black uppercase tracking-wider text-slate-500">
                        <tr>
                          <th className="px-4 py-3 text-start">{isArabic ? 'الطالب' : 'Student'}</th>
                          <th className="px-4 py-3 text-start">{isArabic ? 'الصف' : 'Grade'}</th>
                          <th className="px-4 py-3 text-start">{isArabic ? 'المادة' : 'Subject'}</th>
                          <th className="px-4 py-3 text-start">{isArabic ? 'المعلم' : 'Teacher'}</th>
                          <th className="px-4 py-3 text-center">{isArabic ? 'الدرجة' : 'Score'}</th>
                          <th className="px-4 py-3 text-center">{isArabic ? 'الوزن' : 'Weight'}</th>
                          <th className="px-4 py-3 text-center">{isArabic ? 'النوع' : 'Type'}</th>
                          <th className="px-4 py-3 text-center">{isArabic ? 'التاريخ' : 'Date'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {visibleOrgMarks.map((mark) => {
                          const gradeLevel = mark.subject?.course?.GradeLevel;
                          return (
                            <tr key={mark.id} className="hover:bg-slate-50/60 transition">
                              <td className="px-4 py-3 font-semibold text-slate-900">{mark.student?.user?.name || `#${mark.Student_id}`}</td>
                              <td className="px-4 py-3 text-slate-600">{gradeLevel ? (isArabic ? `الصف ${gradeLevel}` : `Grade ${gradeLevel}`) : '—'}</td>
                              <td className="px-4 py-3 text-slate-700 font-medium">{mark.subject?.name || '—'}</td>
                              <td className="px-4 py-3 text-slate-500 text-xs">{mark.subject?.teacher?.user?.name || '—'}</td>
                              <td className="px-4 py-3 text-center font-black text-slate-900">{Number(mark.Numbers).toFixed(0)} <span className="text-[10px] font-semibold text-slate-400">/ {Number(mark.OutOf).toFixed(0)}</span></td>
                              <td className="px-4 py-3 text-center text-xs text-slate-500">{mark.ExamPercentage ? `${Number(mark.ExamPercentage).toFixed(0)}%` : '—'}</td>
                              <td className="px-4 py-3 text-center">
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${
                                  mark.MarkType === 'EXAM' ? 'bg-indigo-100 text-indigo-700' :
                                  mark.MarkType === 'MIDTERM' ? 'bg-violet-100 text-violet-700' :
                                  'bg-amber-100 text-amber-700'
                                }`}>{mark.MarkType}</span>
                              </td>
                              <td className="px-4 py-3 text-center text-xs text-slate-500">{mark.time ? String(mark.time).slice(0, 10) : '—'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>
          );
        })()}

        {!loading && isSchool && activeTab === TABS.SCHOOL && (
          <>
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {isArabic ? "الإعدادات العامة" : "General Settings"}
                  </h2>
                  <p className="mt-2 text-sm text-slate-600">
                    {isArabic
                      ? "إعدادات القبول ونِسب النجاح والمواد المطلوبة للنجاح."
                      : "Admission age, pass thresholds, and subject pass rules."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSchoolSettingsModalOpen(true)}
                  className="shrink-0 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                >
                  {isArabic ? "تعديل" : "Edit"}
                </button>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {isArabic ? "سن القبول" : "Entry Age"}
                  </p>
                  <p className="mt-1 text-lg font-bold text-slate-900">{schoolForm.entryGradeMinAge}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {isArabic ? "نسبة النجاح العامة" : "Overall Pass"}
                  </p>
                  <p className="mt-1 text-lg font-bold text-slate-900">{schoolForm.passThresholdPercentage}%</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {isArabic ? "الحد الأدنى لكل مادة" : "Per Subject"}
                  </p>
                  <p className="mt-1 text-lg font-bold text-slate-900">{schoolForm.minSubjectPassPercentage}%</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {isArabic ? "اشتراط النجاح في الجميع" : "All Subjects Pass"}
                  </p>
                  <p className="mt-1 text-lg font-bold text-slate-900">
                    {schoolForm.requireAllSubjectsPass ? (isArabic ? "مفعل" : "Enabled") : (isArabic ? "غير مفعل" : "Disabled")}
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-teal-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {isArabic ? "إعدادات الترفيع السنوي" : "Annual Promotion"}
                  </h2>
                  <p className="mt-2 text-sm text-slate-600">
                    {isArabic
                      ? "إدارة السنوات الدراسية والفصول وتشغيل الترفيع بعد إغلاقها."
                      : "Manage academic years, terms, and run promotion after closure."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setYearWizardStep(1);
                    setYearForm({ name: "", startDate: "", endDate: "", numberOfTerms: 1 });
                    setTermForm({ termNumber: 1, name: "", startDate: "", endDate: "", changeReason: "" });
                    setYearModal(true);
                  }}
                  className="shrink-0 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
                >
                  {isArabic ? "إدارة السنوات" : "Manage Years"}
                </button>
              </div>

              <div className="mt-5 space-y-3">
                {academicYears.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    {isArabic ? "لا توجد سنوات دراسية بعد." : "No academic years yet."}
                  </p>
                ) : academicYears.map((year) => (
                  <button
                    key={year.id}
                    type="button"
                    onClick={() => loadTermsForYear(year)}
                    className={"flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition " + (selectedYear?.id === year.id ? "border-teal-600 bg-teal-50" : "border-slate-200 bg-white hover:border-teal-200 hover:bg-teal-50")}
                  >
                    <span className="font-semibold text-slate-800">{year.name}</span>
                    <span className="text-xs text-slate-500">
                      {year.isActive ? (isArabic ? "نشطة" : "Active") : (isArabic ? "غير نشطة" : "Inactive")}
                    </span>
                  </button>
                ))}
              </div>

              {selectedYear && (
                <div className="mt-5 rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{selectedYear.name}</p>
                      <p className="text-xs text-slate-500">
                        {yearTerms.length}/{selectedYear.numberOfTerms} {isArabic ? "فصل" : "term(s)"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setYearWizardStep(2);
                        setTermForm({ termNumber: yearTerms.length + 1, name: "", startDate: "", endDate: "", changeReason: "" });
                        setYearModal(true);
                      }}
                      disabled={yearTerms.length >= Number(selectedYear.numberOfTerms || 0)}
                      className="rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-sm font-semibold text-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isArabic ? "+ إضافة فصل" : "+ Add Term"}
                    </button>
                  </div>
                  <div className="mt-4">
                    {academicYearLoading ? (
                      <p className="text-sm text-slate-500">{isArabic ? "جارٍ التحميل..." : "Loading..."}</p>
                    ) : yearTerms.length === 0 ? (
                      <p className="text-sm text-slate-500">{isArabic ? "لا توجد فصول لهذه السنة." : "No terms for this year."}</p>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {yearTerms.map((term) => (
                          <div key={term.id} className="rounded-2xl border border-slate-200 p-4">
                            <div className="flex items-start justify-between gap-2">
                              <span className="font-semibold text-slate-800">{term.name}</span>
                              <span className={"rounded-full px-2 py-0.5 text-xs font-bold " + termStatusColor(term.status)}>{term.status}</span>
                            </div>
                            <p className="mt-1.5 text-xs text-slate-500">
                              {String(term.startDate).slice(0, 10)} → {String(term.endDate).slice(0, 10)}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="mt-5 rounded-2xl border border-rose-100 bg-rose-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-rose-800">{isArabic ? "تشغيل الترفيع السنوي" : "Run Annual Promotion"}</p>
                    <p className="text-xs text-rose-700">
                      {isArabic
                        ? "يعمل بعد إغلاق كل الفصول وإدخال الدرجات."
                        : "Available after all terms are closed and marks are entered."}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={confirmRunPromotionAction}
                    disabled={actionLoading}
                    className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                  >
                    {isArabic ? "تشغيل" : "Run"}
                  </button>
                </div>
              </div>
            </section>

          </div>

          <Modal open={schoolSettingsModalOpen} onClose={() => setSchoolSettingsModalOpen(false)} title={isArabic ? "إعدادات المدرسة" : "School Settings"} maxWidth="max-w-lg">
            <form onSubmit={async (e) => { await saveSchoolSettingsAction(e); setSchoolSettingsModalOpen(false); }} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-slate-700">{isArabic ? "الحد الأدنى لسن القبول" : "Min Entry Age (Grade 1)"}</span>
                  <input name="entryGradeMinAge" type="number" min="4" max="10" value={schoolForm.entryGradeMinAge} onChange={setField(setSchoolForm)} className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm focus:border-blue-400 focus:bg-white focus:outline-none" />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-slate-700">{isArabic ? "نسبة النجاح الإجمالية" : "Overall Pass Threshold"}</span>
                  <div className="flex items-center gap-2">
                    <input name="passThresholdPercentage" type="number" min="0" max="100" value={schoolForm.passThresholdPercentage} onChange={setField(setSchoolForm)} className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm focus:border-violet-400 focus:bg-white focus:outline-none" />
                    <span className="shrink-0 text-sm font-semibold text-slate-500">%</span>
                  </div>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-slate-700">{isArabic ? "الحد الأدنى لكل مادة" : "Min Per-Subject Score"}</span>
                  <div className="flex items-center gap-2">
                    <input name="minSubjectPassPercentage" type="number" min="0" max="100" value={schoolForm.minSubjectPassPercentage} onChange={setField(setSchoolForm)} className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm focus:border-violet-400 focus:bg-white focus:outline-none" />
                    <span className="shrink-0 text-sm font-semibold text-slate-500">%</span>
                  </div>
                </label>
                <label className="flex cursor-pointer items-start gap-3">
                  <input name="requireAllSubjectsPass" type="checkbox" checked={schoolForm.requireAllSubjectsPass} onChange={setField(setSchoolForm)} className="mt-0.5 h-4 w-4 accent-violet-600" />
                  <div>
                    <span className="block font-semibold text-slate-800">{isArabic ? "يشترط النجاح في جميع المواد" : "Require all subjects to pass"}</span>
                  </div>
                </label>
              </div>
              <div className="mt-4 flex items-center justify-end gap-2">
                <button type="button" onClick={() => setSchoolSettingsModalOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm">{isArabic ? "إلغاء" : "Cancel"}</button>
                <button type="submit" className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">{isArabic ? "حفظ" : "Save"}</button>
              </div>
            </form>
          </Modal>

                    {/* Academic Year Wizard Modal */}
          <Modal
            open={yearModal}
            onClose={() => {
              setYearModal(false);
              setYearWizardStep(1);
            }}
            title={yearWizardStep === 1
              ? (isArabic ? "الخطوة 1: إنشاء سنة دراسية" : "Step 1: Create Academic Year")
              : (isArabic ? "الخطوة 2: إضافة الفصول" : "Step 2: Add Terms")}
            maxWidth="max-w-lg"
          >
            <div className="flex items-center gap-2">
              {[1, 2].map((step) => (
                <div key={step} className="flex flex-1 items-center gap-2">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${yearWizardStep >= step ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-400"}`}>
                    {step}
                  </div>
                  <div className={`h-1 flex-1 rounded-full ${yearWizardStep > step ? "bg-teal-600" : "bg-slate-100"}`} />
                </div>
              ))}
            </div>

            <p className="mt-4 text-xs text-slate-500">
              {yearWizardStep === 1
                ? (isArabic ? "حدد اسم السنة وتواريخها وعدد الفصول قبل المتابعة." : "Set the year name, dates, and term count before continuing.")
                : (isArabic ? `أضف الفصل ${termForm.termNumber} من ${selectedYear?.numberOfTerms || 1}` : `Add term ${termForm.termNumber} of ${selectedYear?.numberOfTerms || 1}`)}
            </p>

            {yearWizardStep === 1 ? (
              <form onSubmit={handleCreateYear} className="mt-4 grid gap-3">
                <input required placeholder={isArabic ? "الاسم (مثال: 2025-2026)" : "Name (e.g. 2025–2026)"} value={yearForm.name} onChange={(e) => setYearForm((f) => ({ ...f, name: e.target.value }))} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" />
                <label className="text-sm text-slate-600">{isArabic ? "تاريخ البداية" : "Start Date"}
                  <input required type="date" value={yearForm.startDate} onChange={(e) => setYearForm((f) => ({ ...f, startDate: e.target.value }))} className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" />
                </label>
                <label className="text-sm text-slate-600">{isArabic ? "تاريخ النهاية" : "End Date"}
                  <input required type="date" value={yearForm.endDate} onChange={(e) => setYearForm((f) => ({ ...f, endDate: e.target.value }))} className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" />
                </label>
                <label className="text-sm text-slate-600">{isArabic ? "عدد الفصول" : "Number of Terms"}
                  <input type="number" min="1" max="4" value={yearForm.numberOfTerms} onChange={(e) => setYearForm((f) => ({ ...f, numberOfTerms: e.target.value }))} className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" />
                </label>
                <p className="text-xs text-slate-500">
                  {isArabic
                    ? "بعد إنشاء السنة ستنتقل تلقائيًا للخطوة الثانية لإضافة الفصول واحدًا تلو الآخر."
                    : "After saving the year, you will move to the second step to add terms one by one."}
                </p>
                <div className="flex gap-2">
                  <button type="submit" disabled={actionLoading} className="flex-1 rounded-xl bg-slate-900 py-2 text-sm font-semibold text-white">{isArabic ? "إنشاء ومتابعة" : "Create & Continue"}</button>
                  <button type="button" onClick={() => { setYearModal(false); setYearWizardStep(1); }} className="flex-1 rounded-xl border border-slate-200 py-2 text-sm text-slate-600">{isArabic ? "إلغاء" : "Cancel"}</button>
                </div>
              </form>
            ) : (
              selectedYear && (
                <form onSubmit={handleCreateTerm} className="mt-4 grid gap-3">
                  <input required type="number" min="1" max={selectedYear.numberOfTerms || 1} placeholder={isArabic ? "رقم الفصل" : "Term number"} value={termForm.termNumber} onChange={(e) => setTermForm((f) => ({ ...f, termNumber: e.target.value }))} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" />
                  <input required placeholder={isArabic ? "اسم الفصل (مثال: الفصل الأول)" : "Term name (e.g. First Term)"} value={termForm.name} onChange={(e) => setTermForm((f) => ({ ...f, name: e.target.value }))} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" />
                  <label className="text-sm text-slate-600">{isArabic ? "تاريخ البداية" : "Start Date"}
                    <input required type="date" value={termForm.startDate} onChange={(e) => setTermForm((f) => ({ ...f, startDate: e.target.value }))} className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" />
                  </label>
                  <label className="text-sm text-slate-600">{isArabic ? "تاريخ النهاية" : "End Date"}
                    <input required type="date" value={termForm.endDate} onChange={(e) => setTermForm((f) => ({ ...f, endDate: e.target.value }))} className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" />
                  </label>
                  <p className="text-xs text-slate-500">
                    {isArabic
                      ? "يجب أن تكون تواريخ الفصل داخل تواريخ السنة الدراسية ولا تتداخل مع فصل آخر."
                      : "Term dates must stay inside the academic year and must not overlap another term."}
                  </p>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setYearWizardStep(1)} className="flex-1 rounded-xl border border-slate-200 py-2 text-sm text-slate-600">{isArabic ? "رجوع" : "Back"}</button>
                    <button type="submit" disabled={actionLoading} className="flex-1 rounded-xl bg-slate-900 py-2 text-sm font-semibold text-white">{isArabic ? "إضافة" : "Add"}</button>
                  </div>
                </form>
              )
            )}
          </Modal>

          {/* Edit Term Modal */}
          {editTermModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
              <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-5 shadow-xl">
                <h3 className="text-lg font-bold text-slate-900">{isArabic ? "تعديل الفصل" : "Edit Term"}</h3>
                {editTermModal.term.status === "ACTIVE" && (
                  <p className="mt-1 text-xs text-amber-600">{isArabic ? "الفصل نشط — يمكن تمديد تاريخ النهاية فقط" : "Term is ACTIVE — only end date extension allowed"}</p>
                )}
                <form onSubmit={handleUpdateTerm} className="mt-4 grid gap-3">
                  {editTermModal.term.status === "PLANNED" && (
                    <>
                      <input placeholder={isArabic ? "الاسم" : "Name"} value={editTermModal.name} onChange={(e) => setEditTermModal((m) => ({ ...m, name: e.target.value }))} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" />
                      <label className="text-sm text-slate-600">{isArabic ? "تاريخ البداية" : "Start Date"}
                        <input type="date" value={editTermModal.startDate} onChange={(e) => setEditTermModal((m) => ({ ...m, startDate: e.target.value }))} className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" />
                      </label>
                    </>
                  )}
                  <label className="text-sm text-slate-600">{isArabic ? "تاريخ النهاية الجديد" : "New End Date"}
                    <input type="date" value={editTermModal.endDate} onChange={(e) => setEditTermModal((m) => ({ ...m, endDate: e.target.value }))} className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" />
                  </label>
                  <textarea required rows={2} placeholder={isArabic ? "سبب التعديل (مطلوب)" : "Reason for change (required)"} value={editTermModal.changeReason} onChange={(e) => setEditTermModal((m) => ({ ...m, changeReason: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                  <div className="flex gap-2">
                    <button type="submit" disabled={actionLoading} className="flex-1 rounded-xl bg-slate-900 py-2 text-sm font-semibold text-white">{isArabic ? "حفظ" : "Save"}</button>
                    <button type="button" onClick={() => setEditTermModal(null)} className="flex-1 rounded-xl border border-slate-200 py-2 text-sm text-slate-600">{isArabic ? "إلغاء" : "Cancel"}</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Reopen Term Modal */}
          {reopenModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
              <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-5 shadow-xl">
                <h3 className="text-lg font-bold text-slate-900">{isArabic ? "إعادة فتح الفصل" : "Reopen Term"}</h3>
                <p className="mt-1 text-sm text-slate-600">{reopenModal.term.name} — {isArabic ? "سيتحول من مغلق إلى نشط" : "will change from CLOSED to ACTIVE"}</p>
                <form onSubmit={handleReopenTerm} className="mt-4 grid gap-3">
                  <textarea required rows={2} placeholder={isArabic ? "سبب إعادة الفتح (مطلوب)" : "Reason for reopening (required)"} value={reopenModal.changeReason} onChange={(e) => setReopenModal((m) => ({ ...m, changeReason: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                  <div className="flex gap-2">
                    <button type="submit" disabled={actionLoading} className="flex-1 rounded-xl bg-amber-500 py-2 text-sm font-semibold text-slate-900">{isArabic ? "إعادة فتح" : "Reopen"}</button>
                    <button type="button" onClick={() => setReopenModal(null)} className="flex-1 rounded-xl border border-slate-200 py-2 text-sm text-slate-600">{isArabic ? "إلغاء" : "Cancel"}</button>
                  </div>
                </form>
              </div>
            </div>
          )}
          </>
        )}

        {showPromotionConfirm && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 px-4">
            <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-5 shadow-xl">
              <h3 className="text-lg font-bold text-slate-900">{t.organization.school.confirmation.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{t.organization.school.confirmation.description}</p>
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                <p>{t.organization.school.schoolYearStartMonth}: {schoolForm.schoolYearStartMonth}</p>
                <p>{t.organization.school.schoolYearStartDay}: {schoolForm.schoolYearStartDay}</p>
                <p>{t.organization.school.promotionMonth}: {schoolForm.promotionMonth}</p>
                <p>{t.organization.school.promotionDay}: {schoolForm.promotionDay}</p>
                <p>{t.organization.school.passThresholdPercentage}: {schoolForm.passThresholdPercentage}%</p>
                <p>{t.organization.school.minSubjectPassPercentage}: {schoolForm.minSubjectPassPercentage}%</p>
                <p>{t.organization.school.requireAllSubjectsPass}: {schoolForm.requireAllSubjectsPass ? t.organization.school.options.enabled : t.organization.school.options.disabled}</p>
              </div>
              <p className="mt-3 text-xs font-semibold text-rose-700">{t.organization.school.confirmation.warning}</p>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPromotionConfirm(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
                >
                  {t.organization.school.confirmation.cancel}
                </button>
                <button
                  type="button"
                  onClick={confirmRunPromotionAction}
                  disabled={actionLoading}
                  className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-900"
                >
                  {t.organization.school.confirmation.confirm}
                </button>
              </div>
            </div>
          </div>
        )}
        </section>
      </div>

      {/* Enrollment Modal */}
      {isEnrollmentModalOpen && enrollmentTargetStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl">
              <div className="sticky top-0 bg-white border-b border-slate-200 p-6 rounded-t-3xl">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-slate-900">
                    {isArabic
                      ? isSchool
                        ? `إدارة صفوف الطالب: ${enrollmentTargetStudent.name}`
                        : `إدارة كورسات الطالب: ${enrollmentTargetStudent.name}`
                      : isSchool
                        ? `Manage Grades for: ${enrollmentTargetStudent.name}`
                        : `Manage Courses for: ${enrollmentTargetStudent.name}`}
                  </h3>
                <button
                  type="button"
                  onClick={closeEnrollmentModal}
                  className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 text-xl font-bold transition-colors"
                  aria-label="Close modal"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <h4 className="mb-4 text-lg font-semibold text-slate-800 border-b border-slate-200 pb-2">
                  {isArabic
                    ? isSchool
                      ? "الصفوف المسجل بها الطالب"
                      : "الكورسات المسجل بها الطالب"
                    : isSchool
                      ? "Enrolled Grades"
                      : "Enrolled Courses"}
                </h4>
                {studentEnrollments.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-slate-400 text-4xl mb-2">📚</div>
                    <p className="text-slate-500">
                      {isArabic
                        ? isSchool
                          ? "لم يتم التسجيل في أي صف"
                          : "لم يتم التسجيل في أي كورس"
                        : isSchool
                          ? "Not enrolled in any grades"
                          : "Not enrolled in any courses"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {studentEnrollments.map((enrollment) => (
                      <div key={enrollment.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors">
                        <div className="flex-1">
                          <p className="font-semibold text-slate-900">{formatGradeName(enrollment.course, isSchool, isArabic) || enrollment.course?.Name || (isArabic ? "غير معروف" : "Unknown")}</p>
                          <p className="text-sm text-slate-600 mt-1">{enrollment.course?.Description || ""}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleUnenrollStudent(enrollment.course?.id)}
                          disabled={actionLoading}
                          className="ml-4 px-4 py-2 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 hover:border-red-300 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isArabic ? "إزالة" : "Unenroll"}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h4 className="mb-4 text-lg font-semibold text-slate-800 border-b border-slate-200 pb-2">
                  {isArabic
                    ? isSchool
                      ? "إضافة إلى صف"
                      : "إضافة إلى مسار"
                    : isSchool
                      ? "Enroll in Grade"
                      : "Enroll in Course"}
                </h4>
                <div className="space-y-3">
                  {courses
 .filter((course) => !studentEnrollments.some((enrollment) => enrollment.course?.id === course.id))
 .map((course) => (
                    <div key={course.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors">
                      <div className="flex-1">
                        <p className="font-semibold text-slate-900">{formatGradeName(course, isSchool, isArabic) || course.Name}</p>
                        <p className="text-sm text-slate-600 mt-1">{translateCourseDescription(course.Description, isArabic) || ""}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleEnrollStudent(course.id)}
                        disabled={actionLoading}
                        className="ml-4 px-4 py-2 rounded-lg bg-slate-950 text-white hover:bg-slate-800 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isArabic ? "إضافة" : "Enroll"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="border-t border-slate-200 p-6 rounded-b-3xl bg-slate-50">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={closeEnrollmentModal}
                  className="px-6 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-semibold transition-colors"
                >
                  {isArabic ? "إغلاق" : "Close"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};
