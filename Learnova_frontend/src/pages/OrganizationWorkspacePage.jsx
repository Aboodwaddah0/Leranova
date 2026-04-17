import { useEffect, useMemo, useState } from "react";
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
  downloadOrganizationCredentialsCsv,
  fetchCourseSubjects,
  fetchOrganizationCourses,
  fetchOrganizationRevenue,
  fetchOrganizationTeachers,
  fetchOrganizationUsers,
  fetchMyOrganizationProfile,
  fetchSchoolSettings,
  importUsersFromExcel,
  runAnnualPromotion,
  updateMyOrganizationProfile,
  updateCourseSubject,
  updateOrganizationCourse,
  updateOrganizationTeacher,
  updateOrganizationUser,
  updateSchoolSettings,
} from "../services/organizationService";
import QuantumMeshBackground from "../components/ui/QuantumMeshBackground";
import { useLanguage } from "../utils/i18n";
import { notifyError, notifySuccess } from "../lib/notify";

const TABS = {
  OVERVIEW: "overview",
  TEACHERS: "teachers",
  COURSES: "courses",
  STUDENTS: "students",
  PARENTS: "parents",
  SCHOOL: "school",
};

const safeError = (error) => {
  const apiErrors = error?.response?.data?.errors;
  if (Array.isArray(apiErrors) && apiErrors.length > 0) {
    return apiErrors.slice(0, 5).join(" | ");
  }

  return error?.response?.data?.message || error?.message || "Request failed";
};

const formatSkippedRows = (skippedRows, max = 3) => {
  if (!Array.isArray(skippedRows) || skippedRows.length === 0) {
    return "";
  }

  return skippedRows
    .slice(0, max)
    .map((row, index) => {
      const name = row?.name ? `${row.name}: ` : "";
      const reason = row?.reason || "Unknown validation issue";
      return `${index + 1}) ${name}${reason}`;
    })
    .join(" | ");
};

const normalizeText = (value) => String(value || "").trim().toLowerCase();

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

const copyCredentialsToClipboard = async (email, password) => {
  const value = `${email || "-"} / ${password || "-"}`;
  if (!navigator?.clipboard?.writeText) {
    return;
  }

  try {
    await navigator.clipboard.writeText(value);
  } catch (_error) {
    // Ignore clipboard failures and keep UI flow successful.
  }
};

export default function OrganizationWorkspacePage() {
  const dispatch = useDispatch();
  const { lang, isArabic, t, toggleLang } = useLanguage();
  const auth = useSelector((state) => state.auth);
  const organization = auth.user || {};
  const organizationType = String(organization?.Role || "").toUpperCase();
  const isSchool = organizationType === "SCHOOL";
  const isAcademy = organizationType === "ACADEMY";

  const [activeTab, setActiveTab] = useState(TABS.OVERVIEW);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [teachers, setTeachers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [subjectsByCourse, setSubjectsByCourse] = useState({});
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [users, setUsers] = useState([]);
  const [schoolSettings, setSchoolSettings] = useState(null);
  const [organizationProfile, setOrganizationProfile] = useState(organization);
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
    Start: "",
    End: "",
    price: "",
    isPaid: false,
  });

  const [subjectForm, setSubjectForm] = useState({
    id: null,
    name: "",
    Description: "",
    Teacher_id: "",
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

  const [teacherSearch, setTeacherSearch] = useState("");
  const [courseSearch, setCourseSearch] = useState("");
  const [subjectSearch, setSubjectSearch] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
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
  });
  const [showPromotionConfirm, setShowPromotionConfirm] = useState(false);

  const studentUsers = useMemo(
    () => users.filter((user) => String(user.role || "").toUpperCase() === "STUDENT"),
    [users],
  );

  const parentUsers = useMemo(
    () => users.filter((user) => String(user.role || "").toUpperCase() === "PARENT"),
    [users],
  );

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
      list.push(student?.name || "-");
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

  const teacherOptions = useMemo(() => {
    return teachers.map((teacher) => {
      const label = teacher?.user?.name || teacher?.name || `#${teacher.id}`;
      const id = teacher.id || teacher.Teacher_id;
      return { id, label };
    }).filter((option) => option.id);
  }, [teachers]);

  const filteredTeachers = useMemo(() => {
    return teachers.filter((teacher) => includesQuery([
      teacher?.user?.name,
      teacher?.user?.email,
      teacher?.specialization,
      teacher?.bio,
    ], teacherSearch));
  }, [teachers, teacherSearch]);

  const filteredCourses = useMemo(() => {
    return courses.filter((course) => includesQuery([
      course?.Name,
      course?.Description,
    ], courseSearch));
  }, [courses, courseSearch]);

  const currentSubjects = selectedCourseId ? subjectsByCourse[selectedCourseId] || [] : [];

  const filteredSubjects = useMemo(() => {
    return currentSubjects.filter((subject) => includesQuery([
      subject?.name,
      subject?.Description,
      subject?.teacher?.user?.name,
    ], subjectSearch));
  }, [currentSubjects, subjectSearch]);

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

      return matchesSearch && matchesGender;
    });
  }, [studentUsers, studentSearch, studentGenderFilter]);

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

      const firstCourseId = coursesData?.[0]?.id || null;
      setSelectedCourseId(firstCourseId);

      if (firstCourseId) {
        const subjects = await fetchCourseSubjects(firstCourseId);
        setSubjectsByCourse((prev) => ({ ...prev, [firstCourseId]: subjects }));
      }

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
    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSchool, isAcademy]);

  const loadSubjectsForCourse = async (courseId) => {
    if (!courseId) {
      return;
    }

    if (subjectsByCourse[courseId]) {
      return;
    }

    try {
      const subjects = await fetchCourseSubjects(courseId);
      setSubjectsByCourse((prev) => ({ ...prev, [courseId]: subjects }));
    } catch (err) {
      setError(safeError(err));
    }
  };

  useEffect(() => {
    loadSubjectsForCourse(selectedCourseId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCourseId]);

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
      Start: "",
      End: "",
      price: "",
      isPaid: false,
    });
  };

  const handleCoursePaidToggle = (event) => {
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

          const generatedEmail = generated?.credentials?.email || "-";
          const generatedPassword = generated?.credentials?.password || "-";
          await copyCredentialsToClipboard(generatedEmail, generatedPassword);
          return `${isArabic ? "تم إنشاء الحساب تلقائيًا" : "Account created with generated credentials"}: ${generatedEmail} / ${generatedPassword}`;
        }

        await createOrganizationTeacher(payload);

        const next = await fetchOrganizationTeachers();
        setTeachers(next);
        resetTeacherForm();

        await copyCredentialsToClipboard(payload.email, payload.password);
        return `${isArabic ? "تم إنشاء الحساب" : "Account created"}: ${payload.email || "-"} / ${payload.password || "-"}`;
      }

      const next = await fetchOrganizationTeachers();
      setTeachers(next);
      resetTeacherForm();
    }, t.organization.messages.teacherSaved);
  };

  const saveProfile = async (event) => {
    event.preventDefault();

    const payload = {
      Name: profileForm.Name,
      Email: profileForm.Email,
      subdomain: profileForm.subdomain,
      Phone: profileForm.Phone || null,
      Address: profileForm.Address || null,
      Description: profileForm.Description || null,
      Founded: profileForm.Founded || null,
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
    }, t.organization.messages.profileSaved);
  };

  const saveCourse = async (event) => {
    event.preventDefault();

    const canUsePaidCourses = isAcademy;

    const payload = {
      Name: courseForm.Name,
      Description: courseForm.Description || undefined,
      Thumbnail: courseForm.Thumbnail || undefined,
      Start: courseForm.Start || undefined,
      End: courseForm.End || undefined,
      isPaid: canUsePaidCourses && Boolean(courseForm.isPaid),
      price: canUsePaidCourses && courseForm.isPaid ? Number(courseForm.price || 0) : 0,
    };

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
    }, t.organization.messages.courseSaved);
  };

  const saveSubject = async (event) => {
    event.preventDefault();
    if (!selectedCourseId) {
      return;
    }

    const payload = {
      name: subjectForm.name,
      Description: subjectForm.Description || undefined,
      Teacher_id: subjectForm.Teacher_id ? Number(subjectForm.Teacher_id) : undefined,
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
          });

          const nextUsersGenerated = await fetchOrganizationUsers();
          setUsers(nextUsersGenerated);
          resetStudentForm();

          const generatedEmail = generated?.credentials?.email || "-";
          const generatedPassword = generated?.credentials?.password || "-";
          await copyCredentialsToClipboard(generatedEmail, generatedPassword);
          return `${isArabic ? "تم إنشاء الحساب تلقائيًا" : "Account created with generated credentials"}: ${generatedEmail} / ${generatedPassword}`;
        }

        await createOrganizationUser(payload);

        const nextUsersManual = await fetchOrganizationUsers();
        setUsers(nextUsersManual);
        resetStudentForm();

        await copyCredentialsToClipboard(payload.email, payload.password);
        return `${isArabic ? "تم إنشاء الحساب" : "Account created"}: ${payload.email || "-"} / ${payload.password || "-"}`;
      }

      const nextUsers = await fetchOrganizationUsers();
      setUsers(nextUsers);
      resetStudentForm();
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

        const generatedEmail = generated?.credentials?.email || "-";
        const generatedPassword = generated?.credentials?.password || "-";
        await copyCredentialsToClipboard(generatedEmail, generatedPassword);
        return `${isArabic ? "تم إنشاء حساب ولي الأمر تلقائيًا" : "Parent account created with generated credentials"}: ${generatedEmail} / ${generatedPassword}`;
      } else {
        await createOrganizationUser(payload);

        const nextUsersManual = await fetchOrganizationUsers();
        setUsers(nextUsersManual);
        resetParentForm();

        await copyCredentialsToClipboard(payload.email, payload.password);
        return `${isArabic ? "تم إنشاء حساب ولي الأمر" : "Parent account created"}: ${payload.email || "-"} / ${payload.password || "-"}`;
      }

      const nextUsers = await fetchOrganizationUsers();
      setUsers(nextUsers);
      resetParentForm();
    }, t.organization.messages.parentSaved);
  };

  const downloadCredentials = async () => {
    await handleAction(async () => {
      const blob = await downloadOrganizationCredentialsCsv();
      const dateLabel = new Date().toISOString().slice(0, 10);
      triggerBlobDownload(blob, `organization-users-credentials-${dateLabel}.csv`);
      return isArabic ? "تم تنزيل ملف بيانات الدخول" : "Credentials CSV downloaded";
    }, isArabic ? "تم تنزيل ملف بيانات الدخول" : "Credentials CSV downloaded");
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
      };

      const next = await updateSchoolSettings(payload);
      setSchoolSettings(next);
    }, t.organization.messages.schoolSaved);
  };

  const runPromotionAction = () => {
    setShowPromotionConfirm(true);
  };

  const confirmRunPromotionAction = async () => {
    await handleAction(async () => {
      await runAnnualPromotion({});
    }, t.organization.messages.promotionDone);
    setShowPromotionConfirm(false);
  };

  const tabs = useMemo(() => {
    const baseTabs = [
      { id: TABS.OVERVIEW, label: t.organization.tabs.overview },
      { id: TABS.TEACHERS, label: t.organization.tabs.teachers },
      { id: TABS.COURSES, label: t.organization.tabs.courses },
      { id: TABS.STUDENTS, label: t.organization.tabs.students },
    ];

    if (isSchool) {
      baseTabs.push({ id: TABS.PARENTS, label: t.organization.tabs.parents });
      baseTabs.push({ id: TABS.SCHOOL, label: t.organization.tabs.schoolSettings });
    }

    return baseTabs;
  }, [isSchool, t.organization.tabs]);

  const organizationTitle =
    organizationProfile?.Name ||
    organization?.Name ||
    organizationProfile?.SchoolName ||
    organizationProfile?.schoolName ||
    t.organization.title;

  return (
    <main className={`admin-management-theme relative min-h-screen overflow-hidden bg-[#eff6fd] px-4 py-8 ${isArabic ? "lang-ar" : "lang-en"}`}>
      <QuantumMeshBackground />

      <button
        type="button"
        onClick={toggleLang}
        className="absolute right-6 top-6 z-20 rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-[#1f69ab]"
      >
        {lang === "en" ? t.common.switchToArabic : t.common.switchToEnglish}
      </button>

      <div className="relative z-10 mx-auto grid min-h-[92vh] w-full max-w-7xl gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="flex h-full flex-col justify-between rounded-[28px] border border-slate-200 bg-gradient-to-b from-[#2379c3] to-[#1f69ab] p-6 text-white shadow-[0_18px_56px_-26px_rgba(31,105,171,0.45)]">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-100">Learnova</p>
            <h1 className="mt-2 text-2xl font-black text-white">{organizationTitle}</h1>
            <p className="mt-2 text-sm text-blue-50/90">{t.organization.badge}</p>

            <nav className="mt-8 space-y-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${
                    activeTab === tab.id
                      ? "bg-white text-[#1a5d96]"
                      : "text-blue-50/85 hover:bg-white/20 hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <button
            type="button"
            onClick={() => dispatch(logout())}
            className="mt-8 rounded-2xl border border-white/30 bg-white/15 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/25"
          >
            {t.dashboard.logout}
          </button>
        </aside>

        <section className="space-y-5 rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_56px_-26px_rgba(16,20,26,0.35)] md:p-8">
          <header className="rounded-3xl bg-gradient-to-r from-[#2379c3] to-[#1f69ab] p-6 text-white shadow-xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-100">{t.organization.badge}</p>
            <h2 className="mt-2 text-3xl font-black">{organizationTitle}</h2>
            <p className="mt-2 text-sm text-blue-100">{t.organization.subtitle}</p>
            <button
              type="button"
              onClick={downloadCredentials}
              className="mt-4 rounded-xl border border-white/30 bg-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/25"
            >
              {isArabic ? "تنزيل بيانات الدخول (CSV)" : "Download Credentials (CSV)"}
            </button>
          </header>

          {loading && <p className="text-sm text-slate-500">{t.common.loading}</p>}
        {!loading && activeTab === TABS.OVERVIEW && (
          <section className="grid gap-4 md:grid-cols-2">
            <article className="rounded-3xl border border-slate-200 bg-white p-5">
              <h2 className="text-lg font-bold text-slate-900">{t.organization.organizationInfo.title}</h2>
              <form onSubmit={saveProfile} className="mt-4 space-y-3 text-sm text-slate-700">
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
            </article>

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
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t.organization.overview.coursesCount}</p>
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
          <section className="grid gap-4 lg:grid-cols-3">
            <form onSubmit={saveTeacher} className="rounded-3xl border border-slate-200 bg-white p-5 lg:col-span-1">
              <h2 className="text-lg font-bold text-slate-900">{t.organization.teachers.formTitle}</h2>
              <div className="mt-4 space-y-3">
                <input name="name" value={teacherForm.name} onChange={setField(setTeacherForm)} placeholder={t.organization.teachers.name} className="h-11 w-full rounded-xl border border-slate-200 px-3" required />
                {!teacherForm.id && (
                  <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={teacherAutoCredentials}
                      onChange={(event) => setTeacherAutoCredentials(event.target.checked)}
                    />
                    {isArabic ? "توليد البريد وكلمة المرور تلقائيًا" : "Generate email/password automatically"}
                  </label>
                )}
                <input name="email" value={teacherForm.email} onChange={setField(setTeacherForm)} placeholder={t.organization.teachers.email} className="h-11 w-full rounded-xl border border-slate-200 px-3" required={!teacherForm.id && !teacherAutoCredentials} disabled={!teacherForm.id && teacherAutoCredentials} />
                <input name="password" value={teacherForm.password} onChange={setField(setTeacherForm)} placeholder={teacherForm.id ? t.organization.common.optionalPassword : t.organization.teachers.password} className="h-11 w-full rounded-xl border border-slate-200 px-3" required={!teacherForm.id && !teacherAutoCredentials} disabled={!teacherForm.id && teacherAutoCredentials} />
                <input name="specialization" value={teacherForm.specialization} onChange={setField(setTeacherForm)} placeholder={t.organization.teachers.specialization} className="h-11 w-full rounded-xl border border-slate-200 px-3" />
                <textarea name="bio" value={teacherForm.bio} onChange={setField(setTeacherForm)} placeholder={t.organization.teachers.bio} className="min-h-24 w-full rounded-xl border border-slate-200 px-3 py-2" />
              </div>
              <div className="mt-4 flex gap-2">
                <button type="submit" disabled={actionLoading} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">{t.organization.common.save}</button>
                <button type="button" onClick={resetTeacherForm} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">{t.organization.common.clear}</button>
              </div>

              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-800">{t.organization.teachers.importTitle}</p>
                <p className="mt-1 text-xs text-slate-500">{t.organization.teachers.importHint}</p>
                <label className="mt-3 inline-flex cursor-pointer items-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
                  <input type="file" accept=".xlsx,.xls" className="hidden" onChange={uploadTeacherExcel} />
                  {t.organization.teachers.importAction}
                </label>
              </div>
            </form>

            <article className="rounded-3xl border border-slate-200 bg-white p-5 lg:col-span-2">
              <h2 className="text-lg font-bold text-slate-900">{t.organization.teachers.listTitle}</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                <input
                  value={teacherSearch}
                  onChange={(event) => setTeacherSearch(event.target.value)}
                  placeholder={isArabic ? "فلترة المعلمين (اسم/بريد/تخصص)" : "Filter teachers (name/email/specialization)"}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm md:w-80"
                />
                <button
                  type="button"
                  onClick={() => setTeacherSearch("")}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700"
                >
                  {isArabic ? "مسح" : "Clear"}
                </button>
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-xs uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="py-2 pr-3">{t.organization.teachers.name}</th>
                      <th className="py-2 pr-3">{t.organization.teachers.email}</th>
                      <th className="py-2 pr-3">{t.organization.teachers.password}</th>
                      <th className="py-2 pr-3">{t.organization.teachers.specialization}</th>
                      <th className="py-2 pr-3">{t.organization.common.actions}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTeachers.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="py-4 text-slate-500">{t.organization.common.empty}</td>
                      </tr>
                    ) : filteredTeachers.map((teacher) => (
                      <tr key={teacher.id} className="border-t border-slate-100">
                        <td className="py-2 pr-3">{teacher?.user?.name || "-"}</td>
                        <td className="py-2 pr-3">{teacher?.user?.email || "-"}</td>
                        <td className="py-2 pr-3">{teacher?.user?.password || "-"}</td>
                        <td className="py-2 pr-3">{teacher?.specialization || "-"}</td>
                        <td className="py-2 pr-3">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setTeacherForm({
                                id: teacher.id,
                                name: teacher?.user?.name || "",
                                email: teacher?.user?.email || "",
                                password: "",
                                specialization: teacher?.specialization || "",
                                bio: teacher?.bio || "",
                              })}
                              className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700"
                            >
                              {t.organization.common.edit}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAction(async () => {
                                await deleteOrganizationTeacher(teacher.id);
                                const next = await fetchOrganizationTeachers();
                                setTeachers(next);
                              }, t.organization.messages.teacherDeleted)}
                              className="rounded-lg border border-rose-200 px-2 py-1 text-xs font-semibold text-rose-700"
                            >
                              {t.organization.common.delete}
                            </button>
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

        {!loading && activeTab === TABS.COURSES && (
          <section className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-3">
              <form onSubmit={saveCourse} className="rounded-3xl border border-slate-200 bg-white p-5">
                <h2 className="text-lg font-bold text-slate-900">{t.organization.courses.formTitle}</h2>
                <div className="mt-4 space-y-3">
                  <input name="Name" value={courseForm.Name} onChange={setField(setCourseForm)} placeholder={t.organization.courses.name} className="h-11 w-full rounded-xl border border-slate-200 px-3" required />
                  <textarea name="Description" value={courseForm.Description} onChange={setField(setCourseForm)} placeholder={t.organization.courses.description} className="min-h-24 w-full rounded-xl border border-slate-200 px-3 py-2" />
                  <input name="Thumbnail" value={courseForm.Thumbnail} onChange={setField(setCourseForm)} placeholder={t.organization.courses.thumbnail} className="h-11 w-full rounded-xl border border-slate-200 px-3" />
                  {isAcademy ? (
                    <>
                      <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
                        <input type="checkbox" checked={courseForm.isPaid} onChange={handleCoursePaidToggle} />
                        {isArabic ? "الكورس مدفوع" : "Paid course"}
                      </label>
                      <input
                        name="price"
                        type="number"
                        min="0"
                        step="0.01"
                        value={courseForm.price}
                        onChange={setField(setCourseForm)}
                        placeholder={isArabic ? "السعر (0 = مجاني)" : "Price (0 = free)"}
                        className="h-11 w-full rounded-xl border border-slate-200 px-3"
                        disabled={!courseForm.isPaid}
                      />
                    </>
                  ) : null}
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="space-y-1 text-xs font-semibold text-slate-600">
                      <span>{t.organization.courses.startDate}</span>
                      <input name="Start" type="date" value={courseForm.Start} onChange={setField(setCourseForm)} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" />
                    </label>
                    <label className="space-y-1 text-xs font-semibold text-slate-600">
                      <span>{t.organization.courses.endDate}</span>
                      <input name="End" type="date" value={courseForm.End} onChange={setField(setCourseForm)} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" />
                    </label>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <button type="submit" disabled={actionLoading} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">{t.organization.common.save}</button>
                  <button type="button" onClick={resetCourseForm} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">{t.organization.common.clear}</button>
                </div>
              </form>

              <article className="rounded-3xl border border-slate-200 bg-white p-5 lg:col-span-2">
                <h2 className="text-lg font-bold text-slate-900">{t.organization.courses.listTitle}</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  <input
                    value={courseSearch}
                    onChange={(event) => setCourseSearch(event.target.value)}
                    placeholder={isArabic ? "فلترة الكورسات (الاسم/الوصف)" : "Filter courses (name/description)"}
                    className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm md:w-80"
                  />
                  <button
                    type="button"
                    onClick={() => setCourseSearch("")}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700"
                  >
                    {isArabic ? "مسح" : "Clear"}
                  </button>
                </div>
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="text-xs uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="py-2 pr-3">{t.organization.courses.name}</th>
                        <th className="py-2 pr-3">{t.organization.courses.description}</th>
                        <th className="py-2 pr-3">{isArabic ? "السعر" : "Price"}</th>
                        <th className="py-2 pr-3">{t.organization.courses.dates}</th>
                        <th className="py-2 pr-3">{t.organization.common.actions}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCourses.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="py-4 text-slate-500">{t.organization.common.empty}</td>
                        </tr>
                      ) : filteredCourses.map((course) => (
                        <tr key={course.id} className="border-t border-slate-100">
                          <td className="py-2 pr-3">
                            <button
                              type="button"
                              onClick={() => setSelectedCourseId(course.id)}
                              className={`rounded-lg px-2 py-1 text-left font-semibold ${selectedCourseId === course.id ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}
                            >
                              {course.Name}
                            </button>
                          </td>
                          <td className="py-2 pr-3">{course.Description || "-"}</td>
                          <td className="py-2 pr-3 text-xs font-semibold text-slate-700">
                            {Boolean(course.isPaid) ? `${Number(course.price || 0).toFixed(2)} USD` : (isArabic ? "مجاني" : "Free")}
                          </td>
                          <td className="py-2 pr-3 text-xs text-slate-600">
                            {course.Start ? String(course.Start).slice(0, 10) : "-"}
                            {" -> "}
                            {course.End ? String(course.End).slice(0, 10) : "-"}
                          </td>
                          <td className="py-2 pr-3">
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => setCourseForm({
                                  id: course.id,
                                  Name: course.Name,
                                  Description: course.Description || "",
                                  Thumbnail: course.Thumbnail || "",
                                  Start: course.Start ? String(course.Start).slice(0, 10) : "",
                                  End: course.End ? String(course.End).slice(0, 10) : "",
                                  price: isAcademy && course.price != null ? String(course.price) : "",
                                  isPaid: isAcademy ? Boolean(course.isPaid) : false,
                                })}
                                className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700"
                              >
                                {t.organization.common.edit}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAction(async () => {
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
                                }, t.organization.messages.courseDeleted)}
                                className="rounded-lg border border-rose-200 px-2 py-1 text-xs font-semibold text-rose-700"
                              >
                                {t.organization.common.delete}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <form onSubmit={saveSubject} className="rounded-3xl border border-slate-200 bg-white p-5">
                <h2 className="text-lg font-bold text-slate-900">{t.organization.subjects.formTitle}</h2>
                <p className="mt-1 text-xs text-slate-500">{t.organization.subjects.courseHint}</p>
                <div className="mt-4 space-y-3">
                  <input name="name" value={subjectForm.name} onChange={setField(setSubjectForm)} placeholder={t.organization.subjects.name} className="h-11 w-full rounded-xl border border-slate-200 px-3" required />
                  <textarea name="Description" value={subjectForm.Description} onChange={setField(setSubjectForm)} placeholder={t.organization.subjects.description} className="min-h-24 w-full rounded-xl border border-slate-200 px-3 py-2" />
                  <select name="Teacher_id" value={subjectForm.Teacher_id} onChange={setField(setSubjectForm)} className="h-11 w-full rounded-xl border border-slate-200 px-3">
                    <option value="">{t.organization.subjects.teacherOptional}</option>
                    {teacherOptions.map((option) => (
                      <option key={option.id} value={option.id}>{option.label}</option>
                    ))}
                  </select>
                </div>
                <div className="mt-4 flex gap-2">
                  <button type="submit" disabled={actionLoading || !selectedCourseId} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">{t.organization.common.save}</button>
                  <button type="button" onClick={resetSubjectForm} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">{t.organization.common.clear}</button>
                </div>
              </form>

              <article className="rounded-3xl border border-slate-200 bg-white p-5 lg:col-span-2">
                <h2 className="text-lg font-bold text-slate-900">{t.organization.subjects.listTitle}</h2>
                <p className="mt-1 text-xs text-slate-500">{selectedCourseId ? `${t.organization.subjects.selectedCourse}: ${courses.find((course) => course.id === selectedCourseId)?.Name || "-"}` : t.organization.subjects.selectCourseFirst}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <input
                    value={subjectSearch}
                    onChange={(event) => setSubjectSearch(event.target.value)}
                    placeholder={isArabic ? "فلترة المواد (الاسم/المعلم)" : "Filter subjects (name/teacher)"}
                    className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm md:w-80"
                  />
                  <button
                    type="button"
                    onClick={() => setSubjectSearch("")}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700"
                  >
                    {isArabic ? "مسح" : "Clear"}
                  </button>
                </div>
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="text-xs uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="py-2 pr-3">{t.organization.subjects.name}</th>
                        <th className="py-2 pr-3">{t.organization.subjects.teacher}</th>
                        <th className="py-2 pr-3">{t.organization.common.actions}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSubjects.length === 0 ? (
                        <tr>
                          <td colSpan="3" className="py-4 text-slate-500">{t.organization.common.empty}</td>
                        </tr>
                      ) : filteredSubjects.map((subject) => (
                        <tr key={subject.id} className="border-t border-slate-100">
                          <td className="py-2 pr-3">{subject.name}</td>
                          <td className="py-2 pr-3">{subject?.teacher?.user?.name || "-"}</td>
                          <td className="py-2 pr-3">
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => setSubjectForm({
                                  id: subject.id,
                                  name: subject.name,
                                  Description: subject.Description || "",
                                  Teacher_id: subject.Teacher_id || "",
                                })}
                                className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700"
                              >
                                {t.organization.common.edit}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAction(async () => {
                                  await deleteCourseSubject(selectedCourseId, subject.id);
                                  const next = await fetchCourseSubjects(selectedCourseId);
                                  setSubjectsByCourse((prev) => ({
                                    ...prev,
                                    [selectedCourseId]: next,
                                  }));
                                }, t.organization.messages.subjectDeleted)}
                                className="rounded-lg border border-rose-200 px-2 py-1 text-xs font-semibold text-rose-700"
                              >
                                {t.organization.common.delete}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            </div>
          </section>
        )}

        {!loading && activeTab === TABS.STUDENTS && (
          <section className="grid gap-4 lg:grid-cols-3">
            <form onSubmit={saveStudent} className="rounded-3xl border border-slate-200 bg-white p-5">
              <h2 className="text-lg font-bold text-slate-900">{t.organization.students.formTitle}</h2>
              <div className="mt-4 space-y-3">
                <input name="name" value={studentForm.name} onChange={setField(setStudentForm)} placeholder={t.organization.students.name} className="h-11 w-full rounded-xl border border-slate-200 px-3" required />
                {!studentForm.id && (
                  <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={studentAutoCredentials}
                      onChange={(event) => setStudentAutoCredentials(event.target.checked)}
                    />
                    {isArabic ? "توليد البريد وكلمة المرور تلقائيًا" : "Generate email/password automatically"}
                  </label>
                )}
                <input name="email" value={studentForm.email} onChange={setField(setStudentForm)} placeholder={t.organization.students.email} className="h-11 w-full rounded-xl border border-slate-200 px-3" required={!studentForm.id && !studentAutoCredentials} disabled={!studentForm.id && studentAutoCredentials} />
                <input name="password" type="password" value={studentForm.password} onChange={setField(setStudentForm)} placeholder={studentForm.id ? t.organization.common.optionalPassword : t.organization.students.password} className="h-11 w-full rounded-xl border border-slate-200 px-3" required={!studentForm.id && !studentAutoCredentials} disabled={!studentForm.id && studentAutoCredentials} />
                <input name="age" type="number" value={studentForm.age} onChange={setField(setStudentForm)} placeholder={t.organization.students.age} className="h-11 w-full rounded-xl border border-slate-200 px-3" />
                <input name="dob" type="date" value={studentForm.dob} onChange={setField(setStudentForm)} className="h-11 w-full rounded-xl border border-slate-200 px-3" />
                <select name="gender" value={studentForm.gender} onChange={setField(setStudentForm)} className="h-11 w-full rounded-xl border border-slate-200 px-3">
                  <option value="MALE">{t.organization.students.male}</option>
                  <option value="FEMALE">{t.organization.students.female}</option>
                </select>
                <input name="address" value={studentForm.address} onChange={setField(setStudentForm)} placeholder={t.organization.students.address} className="h-11 w-full rounded-xl border border-slate-200 px-3" />
              </div>
              <div className="mt-4 flex gap-2">
                <button type="submit" disabled={actionLoading} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">{t.organization.common.save}</button>
                <button type="button" onClick={resetStudentForm} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">{t.organization.common.clear}</button>
              </div>

              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-800">{t.organization.students.importTitle}</p>
                <p className="mt-1 text-xs text-slate-500">{t.organization.students.importHint}</p>
                <label className="mt-3 inline-flex cursor-pointer items-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
                  <input type="file" accept=".xlsx,.xls" className="hidden" onChange={uploadStudentExcel} />
                  {t.organization.students.importAction}
                </label>
              </div>
            </form>

            <article className="rounded-3xl border border-slate-200 bg-white p-5 lg:col-span-2">
              <h2 className="text-lg font-bold text-slate-900">{t.organization.students.listTitle}</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                <input
                  value={studentSearch}
                  onChange={(event) => setStudentSearch(event.target.value)}
                  placeholder={isArabic ? "فلترة الطلاب (الاسم/البريد/العنوان)" : "Filter students (name/email/address)"}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm md:w-72"
                />
                <select
                  value={studentGenderFilter}
                  onChange={(event) => setStudentGenderFilter(event.target.value)}
                  className="h-10 rounded-xl border border-slate-200 px-3 text-sm"
                >
                  <option value="ALL">{isArabic ? "كل الأجناس" : "All genders"}</option>
                  <option value="MALE">{t.organization.students.male}</option>
                  <option value="FEMALE">{t.organization.students.female}</option>
                </select>
                <button
                  type="button"
                  onClick={() => {
                    setStudentSearch("");
                    setStudentGenderFilter("ALL");
                  }}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700"
                >
                  {isArabic ? "مسح" : "Clear"}
                </button>
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-xs uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="py-2 pr-3">{t.organization.students.name}</th>
                      <th className="py-2 pr-3">{t.organization.students.email}</th>
                      <th className="py-2 pr-3">{t.organization.students.password}</th>
                      <th className="py-2 pr-3">{t.organization.students.parent}</th>
                      <th className="py-2 pr-3">{t.organization.students.age}</th>
                      <th className="py-2 pr-3">{t.organization.common.actions}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="py-4 text-slate-500">{t.organization.common.empty}</td>
                      </tr>
                    ) : filteredStudents.map((student) => (
                      <tr key={student.id} className="border-t border-slate-100">
                        <td className="py-2 pr-3">{student.name}</td>
                        <td className="py-2 pr-3">{student.email}</td>
                        <td className="py-2 pr-3">{student.password || "-"}</td>
                        <td className="py-2 pr-3">{parentNameById.get(Number(student?.student?.Parent_id)) || "-"}</td>
                        <td className="py-2 pr-3">{student.age ?? "-"}</td>
                        <td className="py-2 pr-3">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setStudentForm({
                                id: student.id,
                                name: student.name || "",
                                email: student.email || "",
                                password: "",
                                age: student.age || "",
                                gender: student.gender || "MALE",
                                address: student.address || "",
                                dob: student.dob ? String(student.dob).slice(0, 10) : "",
                              })}
                              className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700"
                            >
                              {t.organization.common.edit}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAction(async () => {
                                await deleteOrganizationUser(student.id);
                                const next = await fetchOrganizationUsers();
                                setUsers(next);
                              }, t.organization.messages.studentDeleted)}
                              className="rounded-lg border border-rose-200 px-2 py-1 text-xs font-semibold text-rose-700"
                            >
                              {t.organization.common.delete}
                            </button>
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

        {!loading && isSchool && activeTab === TABS.PARENTS && (
          <section className="grid gap-4 lg:grid-cols-3">
            <form onSubmit={saveParent} className="rounded-3xl border border-slate-200 bg-white p-5">
              <h2 className="text-lg font-bold text-slate-900">{t.organization.parents.formTitle}</h2>
              <p className="mt-1 text-xs text-slate-500">{parentForm.id ? t.organization.parents.selectHint : t.organization.parents.createHint}</p>
              <div className="mt-4 space-y-3">
                <input name="name" value={parentForm.name} onChange={setField(setParentForm)} placeholder={t.organization.parents.name} className="h-11 w-full rounded-xl border border-slate-200 px-3" required />
                {!parentForm.id && (
                  <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={parentAutoCredentials}
                      onChange={(event) => setParentAutoCredentials(event.target.checked)}
                    />
                    {t.organization.parents.autoCredentials}
                  </label>
                )}
                <input name="email" value={parentForm.email} onChange={setField(setParentForm)} placeholder={t.organization.parents.email} className="h-11 w-full rounded-xl border border-slate-200 px-3" required={!parentForm.id && !parentAutoCredentials} disabled={!parentForm.id && parentAutoCredentials} />
                <input name="password" type="password" value={parentForm.password} onChange={setField(setParentForm)} placeholder={t.organization.parents.passwordHint} className="h-11 w-full rounded-xl border border-slate-200 px-3" required={!parentForm.id && !parentAutoCredentials} disabled={!parentForm.id && parentAutoCredentials} />
                <input name="address" value={parentForm.address} onChange={setField(setParentForm)} placeholder={t.organization.parents.address} className="h-11 w-full rounded-xl border border-slate-200 px-3" />
              </div>
              <div className="mt-4 flex gap-2">
                <button type="submit" disabled={actionLoading} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">{t.organization.common.save}</button>
                <button type="button" onClick={resetParentForm} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">{t.organization.common.clear}</button>
              </div>
            </form>

            <article className="rounded-3xl border border-slate-200 bg-white p-5 lg:col-span-2">
              <h2 className="text-lg font-bold text-slate-900">{t.organization.parents.listTitle}</h2>
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
                        <td className="py-2 pr-3">{(childrenByParentId.get(Number(parent.id)) || []).join("، ") || "-"}</td>
                        <td className="py-2 pr-3">{parent.address || "-"}</td>
                        <td className="py-2 pr-3">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setParentForm({
                                id: parent.id,
                                name: parent.name || "",
                                email: parent.email || "",
                                password: "",
                                address: parent.address || "",
                              })}
                              className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700"
                            >
                              {t.organization.common.edit}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAction(async () => {
                                await deleteOrganizationUser(parent.id);
                                const next = await fetchOrganizationUsers();
                                setUsers(next);
                                if (parentForm.id === parent.id) {
                                  resetParentForm();
                                }
                              }, t.organization.messages.parentDeleted)}
                              className="rounded-lg border border-rose-200 px-2 py-1 text-xs font-semibold text-rose-700"
                            >
                              {t.organization.common.delete}
                            </button>
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

        {!loading && isSchool && activeTab === TABS.SCHOOL && (
          <section className="grid gap-4 md:grid-cols-2">
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
              </div>

              <button type="submit" disabled={actionLoading} className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">{t.organization.common.save}</button>
            </form>

            <article className="rounded-3xl border border-slate-200 bg-white p-5">
              <h2 className="text-lg font-bold text-slate-900">{t.organization.school.promotionTitle}</h2>
              <p className="mt-2 text-sm text-slate-600">{t.organization.school.promotionHint}</p>
              <p className="mt-1 text-xs text-amber-700">{t.organization.school.promotionWarning}</p>
              <button type="button" onClick={runPromotionAction} disabled={actionLoading} className="mt-4 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-900">
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
    </main>
  );
}
