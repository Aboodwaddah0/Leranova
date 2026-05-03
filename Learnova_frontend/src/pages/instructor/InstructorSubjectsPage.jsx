import { useEffect, useState } from "react";
import InstructorLayout from "../../components/instructor/InstructorLayout";
import {
  createInstructorSubject,
  deleteInstructorSubject,
  fetchInstructorCourses,
  fetchInstructorSubjects,
} from "../../services/instructorService";
import EducationLoading from "../../components/ui/EducationLoading";
import { useLanguage } from "../../utils/i18n";
import { notifyError } from "../../lib/notify";
import SubjectForm from "../../components/forms/SubjectForm";
import { useSelector } from "react-redux";
import { ORG_TYPES } from "../../utils/constants";
import { formatGradeName } from "../../utils/gradeHelpers";
import Modal from "../../components/ui/Modal";

const safeError = (error) => error?.response?.data?.message || error?.message || "Request failed";

export default function InstructorSubjectsPage() {
  const { isArabic } = useLanguage();
  const authUser = useSelector((state) => state.auth.user);
  const orgType = String(
    authUser?.organizationType || authUser?.organization?.Role || ""
  ).toUpperCase();
  const isSchool = orgType === ORG_TYPES.SCHOOL;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [subjects, setSubjects] = useState([]);
  const [courses, setCourses] = useState([]);
  const [subjectModalOpen, setSubjectModalOpen] = useState(false);
  const [form, setForm] = useState({ courseId: "", name: "", Description: "" });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const [subjectsData, coursesData] = await Promise.all([
          fetchInstructorSubjects(),
          fetchInstructorCourses(),
        ]);

        if (!cancelled) {
          setSubjects(subjectsData);
          setCourses(coursesData);
          setForm((current) => ({
            ...current,
            courseId: current.courseId || String(coursesData[0]?.id || ""),
          }));
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

  const refreshSubjects = async () => {
    const [subjectsData] = await Promise.all([fetchInstructorSubjects()]);
    setSubjects(subjectsData);
  };

  const onCreateSubject = async (nextForm) => {
    setSaving(true);
    setError("");

    try {
      await createInstructorSubject(nextForm.courseId, {
        name: nextForm.name,
        Description: nextForm.Description,
      });

      setForm((current) => ({ courseId: current.courseId || nextForm.courseId, name: "", Description: "" }));
      setSubjectModalOpen(false);
      await refreshSubjects();
    } catch (err) {
      setError(safeError(err));
    } finally {
      setSaving(false);
    }
  };

  const onDeleteSubject = async (subject) => {
    const confirmed = window.confirm(
      isArabic ? `هل تريد حذف المادة \"${subject.name}\"؟` : `Delete subject \"${subject.name}\"?`,
    );
    if (!confirmed) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      await deleteInstructorSubject(subject.course?.id || subject.Course_id, subject.id);
      await refreshSubjects();
    } catch (err) {
      setError(safeError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <InstructorLayout
      title={isArabic ? "المواد" : "Subjects"}
      subtitle={isArabic ? "عرض المواد المرتبطة بحسابك كمعلم" : "View and manage your assigned subjects."}
    >
      {loading ? (
        <EducationLoading
          isArabic={isArabic}
          title={isArabic ? "جاري تحميل المواد" : "Loading subjects"}
          subtitle={isArabic ? "نسترجع المواد والكورسات المرتبطة" : "Fetching linked subjects and courses"}
          fullscreen
        />
      ) : null}

      <div className="mb-6">
        <button
          type="button"
          onClick={() => setSubjectModalOpen(true)}
          className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white"
        >
          {isArabic ? "+ إضافة مادة" : "+ Add Subject"}
        </button>
      </div>

      <Modal
        open={subjectModalOpen}
        onClose={() => setSubjectModalOpen(false)}
        title={isArabic ? "إضافة مادة" : "Add Subject"}
        maxWidth="max-w-lg"
      >
        <SubjectForm courses={courses} initialValues={form} onSubmit={onCreateSubject} saving={saving} />
      </Modal>

      <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">{isArabic ? "المادة" : "Subject"}</th>
              <th className="px-4 py-3">
                {isSchool
                  ? isArabic ? "الصف" : "Grade"
                  : isArabic ? "الكورس" : "Course"}
              </th>
              <th className="px-4 py-3">{isArabic ? "الوصف" : "Description"}</th>
              <th className="px-4 py-3">{isArabic ? "الإجراءات" : "Actions"}</th>
            </tr>
          </thead>
          <tbody>
            {subjects.length === 0 ? (
              <tr>
                <td colSpan="4" className="px-4 py-6 text-slate-500">{isArabic ? "لا توجد مواد." : "No subjects found."}</td>
              </tr>
            ) : subjects.map((subject) => (
              <tr key={subject.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-semibold text-slate-900">{subject.name}</td>
                <td className="px-4 py-3 text-slate-700">{formatGradeName(subject.course, isSchool, isArabic) || "-"}</td>
                <td className="px-4 py-3 text-slate-700">{subject.Description || "-"}</td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => onDeleteSubject(subject)}
                    disabled={saving}
                    className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700 disabled:opacity-50"
                  >
                    {isArabic ? "حذف" : "Delete"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </InstructorLayout>
  );
}
