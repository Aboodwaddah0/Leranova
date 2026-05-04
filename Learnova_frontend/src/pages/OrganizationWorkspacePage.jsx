import { useEffect, useMemo, useState } from "react";
import { Bell, ChevronDown, Search, UserCircle2, Trash2, Pencil } from "lucide-react";
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
} from "../services/organizationService";
import { useLanguage } from "../utils/i18n";
import { notifyError, notifySuccess } from "../lib/notify";
import { formatGradeName } from "../utils/gradeHelpers";
import QuantumMeshBackground from "../components/ui/QuantumMeshBackground";
import Modal from "../components/ui/Modal";

const DEFAULT_COURSE_THUMBNAIL =
  "https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=600&auto=format&fit=crop&ixlib=rb-4.0.3";

const TABS = {
  OVERVIEW: "overview",
  TEACHERS: "teachers",
  COURSES: "courses",
  STUDENTS: "students",
  PARENTS: "parents",
  SCHOOL: "school",
};

const safeError = (error) =>
  error?.response?.data?.message || error?.message || "Request failed";

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
  const { isArabic, t } = useLanguage();
  const auth = useSelector((state) => state.auth);
  const organization = auth.user || {};
  const [organizationProfile, setOrganizationProfile] = useState(organization);
  const organizationType = String((organizationProfile?.type || organization?.type || organizationProfile?.Role || organization?.Role) || "").toUpperCase();
  const isSchool = organizationType === "SCHOOL";
  const isAcademy = organizationType === "ACADEMY";
  const canManageCourses = isSchool || isAcademy;

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
  const [schoolSettings, setSchoolSettings] = useState(null);
  
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
  const [teacherAutoCredentials, setTeacherAutoCredentials] = useState(false);

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
  });

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
  const [studentAutoCredentials, setStudentAutoCredentials] = useState(false);

  const [parentForm, setParentForm] = useState({
    id: null,
    name: "",
    email: "",
    password: "",
    address: "",
  });
  const [parentAutoCredentials, setParentAutoCredentials] = useState(false);
  const [isLinkDrawerOpen, setIsLinkDrawerOpen] = useState(false);
  const [linkTargetParent, setLinkTargetParent] = useState(null);
  const [linkSearchTerm, setLinkSearchTerm] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);

  const [isEnrollmentModalOpen, setIsEnrollmentModalOpen] = useState(false);
  const [enrollmentTargetStudent, setEnrollmentTargetStudent] = useState(null);
  const [studentEnrollments, setStudentEnrollments] = useState([]);

  const [teacherSearch, setTeacherSearch] = useState("");
  const [teacherTrack, setTeacherTrack] = useState("ALL");
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
  const [showPromotionConfirm, setShowPromotionConfirm] = useState(false);

  const [teacherModalOpen, setTeacherModalOpen] = useState(false);
  const [courseModalOpen, setCourseModalOpen] = useState(false);
  const [subjectModalOpen, setSubjectModalOpen] = useState(false);
  const [studentModalOpen, setStudentModalOpen] = useState(false);
  const [parentModalOpen, setParentModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  const studentUsers = useMemo(
    () => users.filter((user) => String(user.role || "").toUpperCase() === "STUDENT"),
    [users],
  );

  const parentUsers = useMemo(
    () => users.filter((user) => String(user.role || "").toUpperCase() === "PARENT"),
    [users],
  );

  const teacherPasswordsById = useMemo(() => {
    const map = new Map();
    for (const user of users) {
      if (String(user.role || "").toUpperCase() !== "TEACHER") {
        continue;
      }

      if (user?.id) {
        map.set(Number(user.id), user.password || "-");
      }
    }
    return map;
  }, [users]);

  const teachersWithPasswords = useMemo(() => {
    return teachers.map((teacher) => {
      const userId = Number(teacher?.user?.id || teacher?.id || 0);
      if (!userId || !teacher?.user) {
        return teacher;
      }

      const password = teacherPasswordsById.get(userId);
      return {
        ...teacher,
        user: {
          ...teacher.user,
          password: password || teacher?.user?.password,
        },
      };
    });
  }, [teachers, teacherPasswordsById]);

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
        setSchoolSettings(settings);
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
    setTeacherForm({
      id: null,
      name: "",
      email: "",
      password: "",
      specialization: "",
      bio: "",
    });
    setTeacherAutoCredentials(false);
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

  const resetSubjectForm = () => {
    setSubjectForm({
      id: null,
      name: "",
      Description: "",
      Teacher_id: "",
      isPaid: false,
      price: "",
    });
  };

  const resetStudentForm = () => {
    setStudentForm({
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
    setStudentAutoCredentials(false);
  };

  const resetParentForm = () => {
    setParentForm({
      id: null,
      name: "",
      email: "",
      password: "",
      address: "",
    });
    setParentAutoCredentials(false);
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

    const payload = {
      name: teacherForm.name,
      email: teacherForm.email,
      specialization: teacherForm.specialization || undefined,
      bio: teacherForm.bio || undefined,
    };

    if (!teacherForm.id || teacherForm.password) {
      payload.password = teacherForm.password;
    }

    await handleAction(async () => {
      if (teacherForm.id) {
        await updateOrganizationTeacher(teacherForm.id, payload);
      } else {
        if (teacherAutoCredentials) {
          const generated = await createOrganizationUserWithGeneratedCredentials({
            name: teacherForm.name,
            specialization: teacherForm.specialization || undefined,
            bio: teacherForm.bio || undefined,
            role: "TEACHER",
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

          const generatedEmail = generated?.credentials?.email || "-";
          const generatedPassword = generated?.credentials?.password || "-";
          await copyCredentialsToClipboard(generatedEmail, generatedPassword);
          return `${isArabic ? "تم إنشاء الحساب" : "Account created"}: ${generatedEmail} / ${generatedPassword}`;
        }

        await createOrganizationTeacher(payload);
      }

      const next = await fetchOrganizationTeachers();
      setTeachers(next);
      resetTeacherForm();
      setTeacherModalOpen(false);
      await copyCredentialsToClipboard(payload.email, payload.password);
      return `${isArabic ? "تم حفظ المدرس" : "Teacher saved"}`;
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

    payload.append("Thumbnail", courseForm.Thumbnail || "");

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

    const payload = {
      name: subjectForm.name,
      Description: subjectForm.Description || undefined,
      // Both school and academy: teacher is assigned per subject
      ...(subjectForm.Teacher_id ? { Teacher_id: Number(subjectForm.Teacher_id) } : {}),
      // ACADEMY: send payment info
      ...(isAcademy ? {
        isPaid: Boolean(subjectForm.isPaid),
        price: subjectForm.isPaid ? Number(subjectForm.price) || 0 : 0,
      } : {}),
    };

    await handleAction(async () => {
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
    }, t.organization.messages.subjectSaved);
  };


  const saveStudent = async (event) => {
    event.preventDefault();

    const payload = {
      name: studentForm.name,
      email: studentForm.email,
      password: studentForm.password,
      role: "STUDENT",
      age: studentForm.age ? Number(studentForm.age) : undefined,
      gender: studentForm.gender || undefined,
      address: studentForm.address || undefined,
      dob: studentForm.dob || undefined,
      parentNationalId: studentForm.parentNationalId || undefined,
    };

    const buildParentLinkMessage = (parentLinkStatus) => {
      if (!studentForm.parentNationalId) {
        return "";
      }

      if (parentLinkStatus === "existing") {
        return isArabic
          ? " | تم الربط مع حساب ولي أمر موجود مسبقًا"
          : " | Linked to existing parent account";
      }

      if (parentLinkStatus === "created") {
        return isArabic
          ? " | تم إنشاء حساب ولي أمر جديد تلقائيًا وربطه"
          : " | New parent account was auto-created and linked";
      }

      return "";
    };

    await handleAction(async () => {
      if (studentForm.id) {
        await updateOrganizationUser(studentForm.id, payload);
      } else {
        if (studentAutoCredentials) {
          const generated = await createOrganizationUserWithGeneratedCredentials({
            name: studentForm.name,
            role: "STUDENT",
            age: studentForm.age ? Number(studentForm.age) : undefined,
            gender: studentForm.gender || undefined,
            address: studentForm.address || undefined,
            dob: studentForm.dob || undefined,
            parentNationalId: studentForm.parentNationalId || undefined,
          });

          const nextUsersGenerated = await fetchOrganizationUsers();
          setUsers(nextUsersGenerated);
          resetStudentForm();
          setStudentModalOpen(false);

          const generatedEmail = generated?.credentials?.email || "-";
          const generatedPassword = generated?.credentials?.password || "-";
          const parentLinkMessage = buildParentLinkMessage(generated?.parentLinkStatus);
          await copyCredentialsToClipboard(generatedEmail, generatedPassword);
          return `${isArabic ? "تم إنشاء الحساب تلقائيًا" : "Account created with generated credentials"}: ${generatedEmail} / ${generatedPassword}${parentLinkMessage}`;
        }

        const created = await createOrganizationUser(payload);

        const nextUsersManual = await fetchOrganizationUsers();
        setUsers(nextUsersManual);
        resetStudentForm();
        setStudentModalOpen(false);

        const parentLinkMessage = buildParentLinkMessage(created?.parentLinkStatus);
        await copyCredentialsToClipboard(payload.email, payload.password);
        return `${isArabic ? "تم إنشاء الحساب" : "Account created"}: ${payload.email || "-"} / ${payload.password || "-"}${parentLinkMessage}`;
      }

      const nextUsers = await fetchOrganizationUsers();
      setUsers(nextUsers);
      resetStudentForm();
      setStudentModalOpen(false);
    }, t.organization.messages.studentSaved);
  };

  const saveParent = async (event) => {
    event.preventDefault();

    const payload = {
      name: parentForm.name,
      email: parentForm.email,
      password: parentForm.password || undefined,
      role: "PARENT",
      address: parentForm.address || undefined,
    };

    await handleAction(async () => {
      if (parentForm.id) {
        await updateOrganizationUser(parentForm.id, payload);
      } else if (parentAutoCredentials) {
        const generated = await createOrganizationUserWithGeneratedCredentials({
          name: parentForm.name,
          role: "PARENT",
          address: parentForm.address || undefined,
        });

        const nextUsersGenerated = await fetchOrganizationUsers();
        setUsers(nextUsersGenerated);
        resetParentForm();
        setParentModalOpen(false);

        const generatedEmail = generated?.credentials?.email || "-";
        const generatedPassword = generated?.credentials?.password || "-";
        await copyCredentialsToClipboard(generatedEmail, generatedPassword);
        return `${isArabic ? "تم إنشاء حساب ولي الأمر تلقائيًا" : "Parent account created with generated credentials"}: ${generatedEmail} / ${generatedPassword}`;
      } else {
        await createOrganizationUser(payload);

        const nextUsersManual = await fetchOrganizationUsers();
        setUsers(nextUsersManual);
        resetParentForm();
        setParentModalOpen(false);

        await copyCredentialsToClipboard(payload.email, payload.password);
        return `${isArabic ? "تم إنشاء حساب ولي الأمر" : "Parent account created"}: ${payload.email || "-"} / ${payload.password || "-"}`;
      }

      const nextUsers = await fetchOrganizationUsers();
      setUsers(nextUsers);
      resetParentForm();
      setParentModalOpen(false);
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
      await addStudentToCourse(enrollmentTargetStudent.id, courseId);
      const enrollments = await fetchStudentCourses(enrollmentTargetStudent.id);
      setStudentEnrollments(enrollments);
      return isArabic ? "تم إضافة الطالب إلى الكورس" : "Student enrolled in course";
    }, isArabic ? "تم إضافة الطالب إلى الكورس" : "Student enrolled in course");
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
      teacher?.user?.password || "",
      teacher?.specialization || "",
      teacher?.bio || "",
    ]);

    downloadCsvFromRows(`teachers-list-${dateLabel}.csv`, ["id", "name", "email", "password", "specialization", "bio"], rows);
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
    setSuccess(isArabic ? "تم تنزيل قائمة الكورسات" : "Courses list downloaded");
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
    setSuccess(isArabic ? "تم تنزيل قائمة المواد" : "Subjects list downloaded");
  };

  const downloadStudentsList = () => {
    const dateLabel = new Date().toISOString().slice(0, 10);
    const rows = filteredStudents.map((student) => [
      student?.id || "",
      student?.name || "",
      student?.email || "",
      student?.password || "",
      parentNameById.get(Number(student?.student?.Parent_id)) || "",
      student?.age ?? "",
      student?.gender || "",
      student?.address || "",
    ]);

    downloadCsvFromRows(`students-list-${dateLabel}.csv`, ["id", "name", "email", "password", "parent", "age", "gender", "address"], rows);
    setSuccess(isArabic ? "تم تنزيل قائمة الطلاب" : "Students list downloaded");
  };

  const downloadParentsList = () => {
    const dateLabel = new Date().toISOString().slice(0, 10);
    const rows = filteredParents.map((parent) => [
      parent?.id || "",
      parent?.name || "",
      parent?.email || "",
      parent?.password || "",
      linkedParentIds.has(Number(parent?.id)) ? "YES" : "NO",
      (childrenByParentId.get(Number(parent?.id)) || []).map((child) => `${child.name} (ID: ${child.id})`).join(" | "),
      parent?.address || "",
    ]);

    downloadCsvFromRows(`parents-list-${dateLabel}.csv`, ["id", "name", "email", "password", "linked", "children", "address"], rows);
    setSuccess(isArabic ? "تم تنزيل قائمة أولياء الأمور" : "Parents list downloaded");
  };

  const uploadStudentExcel = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    await handleAction(async () => {
      const result = await importUsersFromExcel(file);
      const summary = result?.summary;
      const skippedRows = Array.isArray(result?.skipped) ? result.skipped : [];
      const nextUsers = await fetchOrganizationUsers();
      setUsers(nextUsers);

      if (skippedRows.length > 0) {
        setError(`Some rows were skipped (${skippedRows.length}): ${formatSkippedRows(skippedRows)}`);
      }

      if (summary) {
        return `${t.organization.messages.importDone} (${summary.created}/${summary.totalRows})`;
      }

      return t.organization.messages.importDone;
    }, t.organization.messages.importDone);

    event.target.value = "";
  };

  const uploadTeacherExcel = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    await handleAction(async () => {
      const result = await importUsersFromExcel(file);
      const summary = result?.summary;
      const skippedRows = Array.isArray(result?.skipped) ? result.skipped : [];
      const [nextTeachers, nextUsers] = await Promise.all([
        fetchOrganizationTeachers(),
        fetchOrganizationUsers(),
      ]);

      setTeachers(nextTeachers);
      setUsers(nextUsers);

      if (skippedRows.length > 0) {
        setError(`Some rows were skipped (${skippedRows.length}): ${formatSkippedRows(skippedRows)}`);
      }

      if (summary) {
        return `${t.organization.messages.teacherImportDone} (${summary.created}/${summary.totalRows})`;
      }

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

      const next = await updateSchoolSettings(payload);
      setSchoolSettings(next);
      setSettingsModalOpen(false);
    }, t.organization.messages.schoolSaved);
  };

  const handleSchoolClassRangeChange = (index, field, value) => {
    setSchoolForm((prev) => {
      const updatedRanges = [...prev.classRanges];
      updatedRanges[index] = {
        ...updatedRanges[index],
        [field]: Number(value),
      };
      return { ...prev, classRanges: updatedRanges };
    });
  };

  const addSchoolClassRange = () => {
    setSchoolForm((prev) => ({
      ...prev,
      classRanges: [
        ...prev.classRanges,
        {
          startGradeLevel: 1,
          endGradeLevel: 5,
        },
      ],
    }));
  };

  const removeSchoolClassRange = (index) => {
    setSchoolForm((prev) => ({
      ...prev,
      classRanges: prev.classRanges.filter((_, i) => i !== index),
    }));
  };

  const confirmRunPromotionAction = async () => {
    await handleAction(async () => {
      await runAnnualPromotion({});
    }, t.organization.messages.promotionDone);
    setShowPromotionConfirm(false);
  };

  const tabs = useMemo(() => {
    const courseTabLabel = isSchool
      ? (isArabic ? "الصفوف" : "Grades")
      : t.organization.tabs.courses;

    const baseTabs = [
      { id: TABS.OVERVIEW, label: t.organization.tabs.overview },
      { id: TABS.TEACHERS, label: t.organization.tabs.teachers },
      { id: TABS.COURSES, label: courseTabLabel },
      { id: "subjects", label: t.organization.tabs.subjects },
      { id: TABS.STUDENTS, label: t.organization.tabs.students },
    ];

    if (isSchool) {
      baseTabs.push({ id: TABS.PARENTS, label: t.organization.tabs.parents });
      baseTabs.push({ id: TABS.SCHOOL, label: t.organization.tabs.schoolSettings });
    }

    return baseTabs;
  }, [isSchool, isArabic, t.organization.tabs]);

  const organizationTitle =
    organizationProfile?.Name ||
    organization?.Name ||
    organizationProfile?.SchoolName ||
    organizationProfile?.schoolName ||
    t.organization.title;

  return (
    <main className={`admin-management-theme dashboard-page organization-workspace-shell relative min-h-screen overflow-hidden ${isArabic ? "lang-ar" : "lang-en"}`}>
      <QuantumMeshBackground />

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

      <div className="organization-workspace-shell__content relative z-10">
        <aside className="dashboard-sidebar organization-workspace-shell__sidebar flex h-full flex-col gap-5 rounded-none border p-4">
          <div className="rounded-[1.75rem] bg-gradient-to-br from-indigo-600 via-violet-600 to-cyan-500 p-5 text-white shadow-lg shadow-indigo-500/20">
            <p className="text-xs font-black uppercase tracking-[0.22em]">Learnova</p>
            <h1 className="mt-2 text-2xl font-black">{organizationTitle}</h1>
            <p className="mt-2 text-sm text-indigo-50/90">{t.organization.badge}</p>
          </div>

          <nav className="space-y-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`w-full rounded-2xl px-4 py-3 text-left text-sm font-semibold transition-all duration-200 ${
                  activeTab === tab.id
                    ? "dashboard-sidebar-item-active"
                    : "dashboard-sidebar-item"
                }`}
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

        <section className="dashboard-panel organization-workspace-shell__main space-y-5 rounded-[2rem] border p-5 md:p-8">
          <header className="dashboard-hero rounded-[2rem] p-6 shadow-xl">
            <p className="dashboard-hero-kicker text-xs font-bold uppercase tracking-[0.2em]">{t.organization.badge}</p>
            <h2 className="mt-2 text-3xl font-black">{organizationTitle}</h2>
            <p className="mt-2 text-sm">{t.organization.subtitle}</p>
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
                {organizationProfile?.Founded && <p><span className="font-semibold">Founded:</span> {String(organizationProfile.Founded).slice(0, 10)}</p>}
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
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t.organization.overview.subjectsCount}</p>
                  <p className="mt-1 text-2xl font-black text-slate-900">{overviewStats.totalSubjects}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t.organization.overview.totalUsers}</p>
                  <p className="mt-1 text-2xl font-black text-slate-900">{overviewStats.totalUsers}</p>
                </div>
              </div>

              {isAcademy && organizationRevenue && (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 to-slate-700 p-4 text-white">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">{isArabic ? "إيرادات الأكاديمية" : "Academy Revenue"}</p>
                      <p className="mt-2 text-3xl font-black">{formatMoney(organizationRevenue.totalRevenue)}</p>
                      <p className="mt-1 text-sm text-slate-200">{isArabic ? "إجمالي المدفوعات من الكورسات المدفوعة" : "Total payments from paid courses"}</p>
                    </div>
                    <div className="grid gap-2 text-sm sm:grid-cols-3">
                      <div className="rounded-xl bg-white/10 px-3 py-2">
                        <p className="text-slate-300">{isArabic ? "دفعات" : "Payments"}</p>
                        <p className="mt-1 text-xl font-black">{organizationRevenue.totalPayments}</p>
                      </div>
                      <div className="rounded-xl bg-white/10 px-3 py-2">
                        <p className="text-slate-300">{isArabic ? "مدفوعة" : "Paid"}</p>
                        <p className="mt-1 text-xl font-black">{organizationRevenue.paidCoursesCount}</p>
                      </div>
                      <div className="rounded-xl bg-white/10 px-3 py-2">
                        <p className="text-slate-300">{isArabic ? "مجانية" : "Free"}</p>
                        <p className="mt-1 text-xl font-black">{organizationRevenue.freeCoursesCount}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

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

        {!loading && activeTab === TABS.TEACHERS && (
          <section className="space-y-4">
            <Modal open={teacherModalOpen} onClose={() => { setTeacherModalOpen(false); resetTeacherForm(); }} title={teacherForm.id ? t.organization.teachers.formTitle : (isArabic ? "إضافة مدرس جديد" : "Add New Teacher")} maxWidth="max-w-lg">
              <form onSubmit={saveTeacher} className="space-y-3">
                <input name="name" value={teacherForm.name} onChange={setField(setTeacherForm)} placeholder={t.organization.teachers.name} className="h-11 w-full rounded-xl border border-slate-200 px-3" required />
                {!teacherForm.id && (
                  <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
                    <input type="checkbox" checked={teacherAutoCredentials} onChange={(event) => setTeacherAutoCredentials(event.target.checked)} />
                    {isArabic ? "توليد البريد وكلمة المرور تلقائيًا" : "Generate email/password automatically"}
                  </label>
                )}
                <input name="email" value={teacherForm.email} onChange={setField(setTeacherForm)} placeholder={t.organization.teachers.email} className="h-11 w-full rounded-xl border border-slate-200 px-3" required={!teacherForm.id && !teacherAutoCredentials} disabled={!teacherForm.id && teacherAutoCredentials} />
                <input name="password" type="password" value={teacherForm.password} onChange={setField(setTeacherForm)} placeholder={teacherForm.id ? t.organization.common.optionalPassword : t.organization.teachers.password} className="h-11 w-full rounded-xl border border-slate-200 px-3" required={!teacherForm.id && !teacherAutoCredentials} disabled={!teacherForm.id && teacherAutoCredentials} />
                <input name="specialization" value={teacherForm.specialization} onChange={setField(setTeacherForm)} placeholder={t.organization.teachers.specialization} className="h-11 w-full rounded-xl border border-slate-200 px-3" />
                <textarea name="bio" value={teacherForm.bio} onChange={setField(setTeacherForm)} placeholder={t.organization.teachers.bio} className="min-h-24 w-full rounded-xl border border-slate-200 px-3 py-2" />
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
                  <option value="ALL">{isArabic ? "كل المسارات" : "All Tracks"}</option>
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

              <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filteredTeachers.length === 0 ? (
                  <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center text-sm text-slate-500 md:col-span-2 xl:col-span-3">
                    {t.organization.common.empty}
                  </div>
                ) : filteredTeachers.map((teacher) => {
                  const initials = String(teacher?.user?.name || teacher?.name || "T")
                    .trim()
                    .split(/\s+/)
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((part) => part[0]?.toUpperCase())
                    .join("") || "T";
                  const specialization = teacher?.specialization || (isArabic ? "غير محدد" : "Unspecified");
                  const courseCount = Number(teacher?.coursesCount || teacher?.courseCount || 0);
                  const studentCount = Number(teacher?.studentsCount || teacher?.studentCount || 0);

                  return (
                    <article key={teacher.id} className="relative overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                      <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-500" />
                      <div className="p-6 text-center">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-xl font-black text-white shadow-lg shadow-indigo-500/25">
                          {initials}
                        </div>
                        <h3 className="mt-4 text-lg font-black text-slate-900">{teacher?.user?.name || "-"}</h3>
                        <p className="mt-1 text-sm text-slate-500">{teacher?.user?.email || "-"}</p>
                        <span className="mt-3 inline-flex rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700">
                          {specialization}
                        </span>

                        <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-200 pt-4 text-center">
                          <div>
                            <p className="text-lg font-black text-purple-600">{courseCount}</p>
                            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">{isArabic ? "كورسات" : "Courses"}</p>
                          </div>
                          <div>
                            <p className="text-lg font-black text-purple-600">{studentCount}</p>
                            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">{isArabic ? "طلاب" : "Students"}</p>
                          </div>
                        </div>

                        <div className="mt-5 flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => { setTeacherForm({ id: teacher.id, name: teacher?.user?.name || "", email: teacher?.user?.email || "", password: "", specialization: teacher?.specialization || "", bio: teacher?.bio || "" }); setTeacherModalOpen(true); }}
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                            title={t.organization.common.edit}
                          >
                            <Pencil size={14} />
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
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-rose-50 hover:text-rose-700"
                            title={t.organization.common.delete}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </article>
          </section>
        )}

        {!loading && activeTab === TABS.COURSES && (
          <section className="space-y-4">
            {canManageCourses && (
              <Modal open={courseModalOpen} onClose={() => { setCourseModalOpen(false); resetCourseForm(); }} title={courseForm.id ? t.organization.courses.formTitle : (isSchool ? (isArabic ? "إضافة صف جديد" : "Add New Grade") : (isArabic ? "إضافة كورس جديد" : "Add New Course"))} maxWidth="max-w-lg">
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
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-5">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-700">{isSchool ? (isArabic ? "قسم الصفوف" : "Grades section") : (isArabic ? "قسم الكورسات" : "Courses section")}</p>
                  <h2 className="mt-2 text-2xl font-black text-slate-900">{isSchool ? (isArabic ? "الصفوف" : "Grades") : t.organization.courses.listTitle}</h2>
                  <p className="mt-2 text-sm text-slate-600">{isSchool ? (isArabic ? "هنا تضيف الصفوف وتعدّلها" : "Add and edit grades in their own section") : (isArabic ? "هنا تضيف الكورسات وتعدّلها وتدير تفاصيلها بشكل مستقل" : "Add, edit, and manage courses in their own section")}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-sm font-bold text-sky-700">
                    {filteredCourses.length} {isSchool ? (isArabic ? "صف" : "grades") : (isArabic ? "كورس" : "courses")}
                  </span>
                  {canManageCourses && (
                    <button type="button" onClick={() => { resetCourseForm(); setCourseModalOpen(true); }} className="rounded-full bg-purple-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-purple-700">
                      {isSchool ? (isArabic ? "+ إضافة صف" : "+ Add Grade") : (isArabic ? "+ إضافة كورس" : "+ Add Course")}
                    </button>
                  )}
                </div>
              </div>

              {!canManageCourses && (
                <div className="mt-5 rounded-[24px] border border-amber-200 bg-amber-50 p-5">
                  <p className="text-sm font-bold text-amber-900">{isArabic ? "إنشاء الكورس متاح فقط لحسابات المنظمة." : "Course creation is available only for organization accounts."}</p>
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
                  <option value="ALL">{isArabic ? "كل المسارات" : "All Tracks"}</option>
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
                            <p className="mt-1 text-sm text-slate-500">{course?.Teacher_name || course?.teacherName || course?.teacher?.name || course?.teacher?.user?.name || (isArabic ? "غير محدد" : "Unassigned")}</p>
                          </div>
                          <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{priceLabel}</div>
                        </div>

                        <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">{course.Description || (isArabic ? "لا يوجد وصف" : "No description")}</p>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">{trackLabel}</span>
                          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">{priceLabel}</span>
                        </div>

                        <div className="mt-5 flex items-center justify-between border-t border-slate-200 pt-4">
                          <div>
                            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{isArabic ? "السعر" : "Price"}</p>
                            <p className="mt-1 text-base font-black text-slate-900">{course?.Price != null && course?.Price !== "" ? `${course.Price} $` : (isArabic ? "مجاني" : "Free")}</p>
                          </div>
                          <div className="flex items-center gap-2">
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

            <Modal open={subjectModalOpen} onClose={() => { setSubjectModalOpen(false); resetSubjectForm(); }} title={subjectForm.id ? t.organization.subjects.formTitle : (isArabic ? "إضافة مادة جديدة" : "Add New Subject")} maxWidth="max-w-lg">
              <form onSubmit={saveSubject} className="space-y-3">
                <p className="text-xs text-slate-500">{isSchool ? t.organization.subjects.gradeHint : t.organization.subjects.courseHint}</p>
                <div className="mt-4 space-y-3">
                  <select value={selectedCourseId || ""} onChange={(event) => handleSubjectsCourseChange(Number(event.target.value) || null)} className="h-11 w-full rounded-xl border border-slate-200 px-3">
                     <option value="">
                       {isSchool
                         ? (isArabic ? t.organization.subjects.selectGradeFirst : t.organization.subjects.selectGradeFirst)
                         : (isArabic ? t.organization.subjects.selectCourseFirst : t.organization.subjects.selectCourseFirst)}
                     </option>
                     {sortedSubjectCourses.map((course) => (
                       <option key={course.id} value={course.id}>{formatGradeName(course, isSchool, isArabic) || course.Name}</option>
                     ))}
                  </select>
                  <input name="name" value={subjectForm.name} onChange={setField(setSubjectForm)} placeholder={t.organization.subjects.name} className="h-11 w-full rounded-xl border border-slate-200 px-3" required />
                  <textarea name="Description" value={subjectForm.Description} onChange={setField(setSubjectForm)} placeholder={t.organization.subjects.description} className="min-h-24 w-full rounded-xl border border-slate-200 px-3 py-2" />
                  <select name="Teacher_id" value={subjectForm.Teacher_id} onChange={setField(setSubjectForm)} required className="h-11 w-full rounded-xl border border-slate-200 px-3">
                    <option value="">{isArabic ? "اختر المدرس المسؤول عن المادة" : "Select the teacher responsible for this subject"}</option>
                    {teacherOptions.map((option) => (
                      <option key={option.id} value={option.id}>{option.label}</option>
                    ))}
                  </select>
                  {isAcademy ? (
                    <div className="space-y-2">
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

            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
                <div>
                  <h2 className="text-2xl font-black text-slate-900">{isArabic ? "إدارة المواد" : "Subjects Management"}</h2>
                  <p className="mt-1 text-sm text-slate-600">{isArabic ? "إدارة المواد حسب المسار والمدرس" : "Manage all subjects across your tracks & grades"}</p>
                </div>
                <button type="button" onClick={() => { resetSubjectForm(); setSubjectModalOpen(true); }} className="rounded-full bg-purple-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-purple-700">
                  {isArabic ? "+ إضافة مادة" : "+ Add Subject"}
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
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600">{isArabic ? "المادة" : "Subject Name"}</th>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600">{isArabic ? "الصف/المسار" : "Track"}</th>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600">{isArabic ? "المدرس" : "Teacher"}</th>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600">{isArabic ? "الوصف" : "Description"}</th>
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
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => { setSubjectForm({ id: subject.id, name: subject.name, Description: subject.Description || "", Teacher_id: subject.Teacher_id || "", isPaid: Boolean(subject.isPaid), price: subject.price ? String(subject.price) : "" }); setSubjectModalOpen(true); }}
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
                                    }, t.organization.messages.subjectDeleted);
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
                  <p className="text-sm font-semibold text-slate-600">{isArabic ? "لا توجد مواد لهذا المسار" : "No subjects in this track"}</p>
                  <p className="mt-1 text-xs text-slate-500">{isArabic ? "حاول تغيير الفلاتر أو أضف مادة جديدة" : "Try adjusting filters or add a new subject"}</p>
                </div>
              ) : (
                <div className="mt-8 rounded-[20px] border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
                  <p className="text-sm font-semibold text-slate-600">{isArabic ? "اختر مسارًا لعرض المواد" : "Choose a track to view subjects"}</p>
                  <p className="mt-1 text-xs text-slate-500">{isArabic ? "يمكنك التبديل بين الصفوف/المسارات من الأعلى" : "Use the selector above to switch grades/tracks"}</p>
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
                  <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
                    <input type="checkbox" checked={studentAutoCredentials} onChange={(event) => setStudentAutoCredentials(event.target.checked)} />
                    {isArabic ? "توليد البريد وكلمة المرور تلقائيًا" : "Generate email/password automatically"}
                  </label>
                )}
                <input name="email" value={studentForm.email} onChange={setField(setStudentForm)} placeholder={t.organization.students.email} className="h-11 w-full rounded-xl border border-slate-200 px-3" required={!studentForm.id && !studentAutoCredentials} disabled={!studentForm.id && studentAutoCredentials} />
                <input name="password" type="password" value={studentForm.password} onChange={setField(setStudentForm)} placeholder={studentForm.id ? t.organization.common.optionalPassword : t.organization.students.password} className="h-11 w-full rounded-xl border border-slate-200 px-3" required={!studentForm.id && !studentAutoCredentials} disabled={!studentForm.id && studentAutoCredentials} />
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
                        <th className="px-4 py-3">{isSchool ? (isArabic ? "الصف" : "Grade") : (isArabic ? "الدورة" : "Course")}</th>
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
                      ) : filteredStudents.map((student, index) => {
                        const statusValue = String(student?.status || student?.Status || "").toUpperCase();
                        const statusLabel = statusValue || "-";
                        const statusClass = statusValue === "ACTIVE"
                          ? "bg-emerald-100 text-emerald-700"
                          : statusValue === "INACTIVE"
                            ? "bg-slate-100 text-slate-600"
                            : "bg-sky-100 text-sky-700";

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
                  <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
                    <input type="checkbox" checked={parentAutoCredentials} onChange={(event) => setParentAutoCredentials(event.target.checked)} />
                    {t.organization.parents.autoCredentials}
                  </label>
                )}
                <input name="email" value={parentForm.email} onChange={setField(setParentForm)} placeholder={t.organization.parents.email} className="h-11 w-full rounded-xl border border-slate-200 px-3" required={!parentForm.id && !parentAutoCredentials} disabled={!parentForm.id && parentAutoCredentials} />
                <input name="password" type="password" value={parentForm.password} onChange={setField(setParentForm)} placeholder={t.organization.parents.passwordHint} className="h-11 w-full rounded-xl border border-slate-200 px-3" required={!parentForm.id && !parentAutoCredentials} disabled={!parentForm.id && parentAutoCredentials} />
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
                      <th className="py-2 pr-3">{t.organization.parents.passwordHint}</th>
                      <th className="py-2 pr-3">{t.organization.parents.childrenLinked}</th>
                      <th className="py-2 pr-3">{t.organization.parents.children}</th>
                      <th className="py-2 pr-3">{t.organization.parents.address}</th>
                      <th className="py-2 pr-3">{t.organization.common.actions}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredParents.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="py-4 text-slate-500">{t.organization.common.empty}</td>
                      </tr>
                    ) : filteredParents.map((parent) => (
                      <tr key={parent.id} className="border-t border-slate-100">
                        <td className="py-2 pr-3">{parent.name || "-"}</td>
                        <td className="py-2 pr-3">{parent.email || "-"}</td>
                        <td className="py-2 pr-3">{parent.password || "-"}</td>
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
              </div>
            </article>
          </section>
        )}

        {isLinkDrawerOpen && linkTargetParent ? (
          <div className="fixed inset-0 z-40 flex justify-end bg-slate-900/40" onClick={closeLinkDrawer}>
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
          </div>
        ) : null}

        {!loading && isSchool && activeTab === TABS.SCHOOL && (
          <section className="grid gap-4 md:grid-cols-2">
            <Modal open={settingsModalOpen} onClose={() => setSettingsModalOpen(false)} title={isArabic ? "إعدادات المدرسة" : "School Settings"} maxWidth="max-w-2xl">
            <form onSubmit={saveSchoolSettingsAction} className="rounded-3xl border border-slate-200 bg-white p-5">
              <h2 className="text-lg font-bold text-slate-900">{t.organization.school.title}</h2>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="rounded-xl border border-slate-200 p-3 text-sm text-slate-700">
                  <span className="mb-1 flex items-center gap-2 font-semibold">
                    {t.organization.school.schoolYearStartMonth}
                    <span className="cursor-help text-xs text-slate-500" title={t.organization.school.hints.schoolYearStartMonth}>?</span>
                  </span>
                  <input name="schoolYearStartMonth" type="number" min="1" max="12" value={schoolForm.schoolYearStartMonth} onChange={setField(setSchoolForm)} className="h-11 w-full rounded-xl border border-slate-200 px-3" />
                  <p className="mt-1 text-xs text-slate-500">{t.organization.school.examples.schoolYearStartMonth}</p>
                </label>

                <label className="rounded-xl border border-slate-200 p-3 text-sm text-slate-700">
                  <span className="mb-1 flex items-center gap-2 font-semibold">
                    {t.organization.school.schoolYearStartDay}
                    <span className="cursor-help text-xs text-slate-500" title={t.organization.school.hints.schoolYearStartDay}>?</span>
                  </span>
                  <input name="schoolYearStartDay" type="number" min="1" max="31" value={schoolForm.schoolYearStartDay} onChange={setField(setSchoolForm)} className="h-11 w-full rounded-xl border border-slate-200 px-3" />
                  <p className="mt-1 text-xs text-slate-500">{t.organization.school.examples.schoolYearStartDay}</p>
                </label>

                <label className="rounded-xl border border-slate-200 p-3 text-sm text-slate-700">
                  <span className="mb-1 flex items-center gap-2 font-semibold">
                    {t.organization.school.promotionMonth}
                    <span className="cursor-help text-xs text-slate-500" title={t.organization.school.hints.promotionMonth}>?</span>
                  </span>
                  <input name="promotionMonth" type="number" min="1" max="12" value={schoolForm.promotionMonth} onChange={setField(setSchoolForm)} className="h-11 w-full rounded-xl border border-slate-200 px-3" />
                  <p className="mt-1 text-xs text-slate-500">{t.organization.school.examples.promotionMonth}</p>
                </label>

                <label className="rounded-xl border border-slate-200 p-3 text-sm text-slate-700">
                  <span className="mb-1 flex items-center gap-2 font-semibold">
                    {t.organization.school.promotionDay}
                    <span className="cursor-help text-xs text-slate-500" title={t.organization.school.hints.promotionDay}>?</span>
                  </span>
                  <input name="promotionDay" type="number" min="1" max="31" value={schoolForm.promotionDay} onChange={setField(setSchoolForm)} className="h-11 w-full rounded-xl border border-slate-200 px-3" />
                  <p className="mt-1 text-xs text-slate-500">{t.organization.school.examples.promotionDay}</p>
                </label>

                <label className="rounded-xl border border-slate-200 p-3 text-sm text-slate-700">
                  <span className="mb-1 flex items-center gap-2 font-semibold">
                    {t.organization.school.entryGradeMinAge}
                    <span className="cursor-help text-xs text-slate-500" title={t.organization.school.hints.entryGradeMinAge}>?</span>
                  </span>
                  <input name="entryGradeMinAge" type="number" min="4" max="10" value={schoolForm.entryGradeMinAge} onChange={setField(setSchoolForm)} className="h-11 w-full rounded-xl border border-slate-200 px-3" />
                  <p className="mt-1 text-xs text-slate-500">{t.organization.school.examples.entryGradeMinAge}</p>
                </label>

                <label className="rounded-xl border border-slate-200 p-3 text-sm text-slate-700">
                  <span className="mb-1 flex items-center gap-2 font-semibold">
                    {t.organization.school.passThresholdPercentage}
                    <span className="cursor-help text-xs text-slate-500" title={t.organization.school.hints.passThresholdPercentage}>?</span>
                  </span>
                  <input name="passThresholdPercentage" type="number" min="0" max="100" value={schoolForm.passThresholdPercentage} onChange={setField(setSchoolForm)} className="h-11 w-full rounded-xl border border-slate-200 px-3" />
                  <p className="mt-1 text-xs text-slate-500">{t.organization.school.examples.passThresholdPercentage}</p>
                </label>

                <label className="rounded-xl border border-slate-200 p-3 text-sm text-slate-700">
                  <span className="mb-1 flex items-center gap-2 font-semibold">
                    {t.organization.school.minSubjectPassPercentage}
                    <span className="cursor-help text-xs text-slate-500" title={t.organization.school.hints.minSubjectPassPercentage}>?</span>
                  </span>
                  <input name="minSubjectPassPercentage" type="number" min="0" max="100" value={schoolForm.minSubjectPassPercentage} onChange={setField(setSchoolForm)} className="h-11 w-full rounded-xl border border-slate-200 px-3" />
                  <p className="mt-1 text-xs text-slate-500">{t.organization.school.examples.minSubjectPassPercentage}</p>
                </label>

                <label className="rounded-xl border border-slate-200 p-3 text-sm text-slate-700 sm:col-span-2">
                  <span className="mb-2 flex items-center gap-2 font-semibold">
                    {t.organization.school.requireAllSubjectsPass}
                    <span className="cursor-help text-xs text-slate-500" title={t.organization.school.hints.requireAllSubjectsPass}>?</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <input name="requireAllSubjectsPass" type="checkbox" checked={schoolForm.requireAllSubjectsPass} onChange={setField(setSchoolForm)} />
                    <span>{schoolForm.requireAllSubjectsPass ? t.organization.school.options.enabled : t.organization.school.options.disabled}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{t.organization.school.examples.requireAllSubjectsPass}</p>
                </label>

                <label className="rounded-xl border border-slate-200 p-3 text-sm text-slate-700 sm:col-span-2">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="font-semibold">Class ranges / نطاقات الصفوف</span>
                    <button
                      type="button"
                      onClick={addSchoolClassRange}
                      className="rounded-lg bg-slate-900 px-3 py-1 text-xs font-semibold text-white hover:bg-slate-800"
                    >
                      + Add Range
                    </button>
                  </div>
                  <div className="space-y-3">
                    {schoolForm.classRanges.map((range, index) => (
                      <div key={index} className="flex items-end gap-2">
                        <div className="flex-1">
                          <label className="block text-xs font-medium text-slate-600 mb-1">From / من</label>
                          <select
                            className="h-9 w-full rounded-lg border border-slate-300 px-2 text-sm"
                            value={range.startGradeLevel || 1}
                            onChange={(e) => handleSchoolClassRangeChange(index, "startGradeLevel", e.target.value)}
                          >
                            {[...Array(12)].map((_, i) => (
                              <option key={i + 1} value={i + 1}>
                                Grade {i + 1}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex-1">
                          <label className="block text-xs font-medium text-slate-600 mb-1">To / إلى</label>
                          <select
                            className="h-9 w-full rounded-lg border border-slate-300 px-2 text-sm"
                            value={range.endGradeLevel || 5}
                            onChange={(e) => handleSchoolClassRangeChange(index, "endGradeLevel", e.target.value)}
                          >
                            {[...Array(12)].map((_, i) => (
                              <option key={i + 1} value={i + 1}>
                                Grade {i + 1}
                              </option>
                            ))}
                          </select>
                        </div>
                        {schoolForm.classRanges.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeSchoolClassRange(index)}
                            className="mb-1 rounded-lg bg-rose-100 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-200"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-slate-500">Define grade ranges for your school organization.</p>
                </label>
              </div>

              <button type="submit" disabled={actionLoading} className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">{t.organization.common.save}</button>
            </form>
            </Modal>

            <article className="rounded-3xl border border-slate-200 bg-white p-5">
              <h2 className="text-lg font-bold text-slate-900">{isArabic ? "إعدادات المدرسة" : "School Settings"}</h2>
              <p className="mt-2 text-sm text-slate-600">{isArabic ? "إدارة إعدادات السنة الدراسية والترقية" : "Manage school year and promotion settings"}</p>
              <button type="button" onClick={() => setSettingsModalOpen(true)} className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
                {isArabic ? "تعديل الإعدادات" : "Edit Settings"}
              </button>
            </article>

            <article className="rounded-3xl border border-slate-200 bg-white p-5">
              <h2 className="text-lg font-bold text-slate-900">{t.organization.school.promotionTitle}</h2>
              <p className="mt-2 text-sm text-slate-600">{t.organization.school.promotionHint}</p>
              <p className="mt-1 text-xs text-amber-700">{t.organization.school.promotionWarning}</p>
              <button type="button" onClick={confirmRunPromotionAction} disabled={actionLoading} className="mt-4 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-900">
                {t.organization.school.runPromotion}
              </button>
              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                <p className="font-semibold">{t.organization.school.currentSettings}</p>
                <pre className="mt-2 overflow-auto text-xs">{JSON.stringify(schoolSettings, null, 2)}</pre>
              </div>
            </article>
          </section>
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
                <p>Class ranges: {schoolForm.classRanges?.map(r => `${r.startGradeLevel}-${r.endGradeLevel}`).join(", ") || '-'}</p>
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
                          onClick={() => handleUnenrollStudent(enrollment.Course_id)}
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
                      : "إضافة إلى كورس"
                    : isSchool
                      ? "Enroll in Grade"
                      : "Enroll in Course"}
                </h4>
                <div className="space-y-3">
                  {courses
                    .filter((course) => !studentEnrollments.some((enrollment) => enrollment.Course_id === course.id))
                    .map((course) => (
                      <div key={course.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors">
                        <div className="flex-1">
                          <p className="font-semibold text-slate-900">{formatGradeName(course, isSchool, isArabic) || course.Name}</p>
                          <p className="text-sm text-slate-600 mt-1">{course.Description}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleEnrollStudent(course.id)}
                          disabled={actionLoading}
                          className="ml-4 px-4 py-2 rounded-lg border border-green-200 text-green-700 hover:bg-green-50 hover:border-green-300 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isArabic ? "إضافة" : "Enroll"}
                        </button>
                      </div>
                    ))}
                </div>
                {courses.filter((course) => !studentEnrollments.some((enrollment) => enrollment.Course_id === course.id)).length === 0 && (
                  <div className="text-center py-8">
                    <div className="text-slate-400 text-4xl mb-2">✅</div>
                    <p className="text-slate-500">
                      {isArabic
                        ? isSchool
                          ? "الطالب مسجل في جميع الصفوف"
                          : "الطالب مسجل في جميع الكورسات"
                        : isSchool
                          ? "Student is enrolled in all available grades"
                          : "Student is enrolled in all available courses"}
                    </p>
                  </div>
                )}
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
