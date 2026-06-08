import { useEffect, useState, useMemo } from "react";
import Pagination from "../../components/ui/Pagination";
import InstructorLayout from "../../components/instructor/InstructorLayout";
import {
  createInstructorMark,
  deleteInstructorMark,
  fetchInstructorMarks,
  fetchInstructorStudents,
  fetchInstructorSubjects,
  updateInstructorMark,
  fetchInstructorCourses,
} from "../../services/instructorService";
import { fetchAcademicYears, fetchTerms } from "../../services/organizationService";
import EducationLoading from "../../components/ui/EducationLoading";
import { useLanguage } from "../../utils/i18n";
import { notifyError } from "../../lib/notify";
import Modal from "../../components/ui/Modal";

const safeError = (error) => error?.response?.data?.message || error?.message || "Request failed";

const formatScore = (value) => {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n.toFixed(2).replace(/\.00$/, "") : "0";
};

export default function InstructorMarksPage() {
  const { isArabic } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [error, setError] = useState("");
  const [marks, setMarks] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [filterSubjectId, setFilterSubjectId] = useState('');
  const [filterStudentName, setFilterStudentName] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [yearTerms, setYearTerms] = useState([]);
  const [selectedTerm, setSelectedTerm] = useState('all');
  const [markModalOpen, setMarkModalOpen] = useState(false);
  const [formYear, setFormYear] = useState('');
  const [formTerms, setFormTerms] = useState([]);
  const [formTerm, setFormTerm] = useState('');
  const [form, setForm] = useState({
    id: null,
    Student_id: "",
    Subject_id: "",
    Numbers: "",
    OutOf: "100",
    ExamPercentage: "100",
    MarkType: "EXAM",
    time: "",
  });

  const loadStudentsBySubject = async (subjectId, preferredStudentId = "") => {
    if (!subjectId) {
      setStudents([]);
      setForm((current) => ({ ...current, Student_id: "" }));
      return;
    }

    setStudentsLoading(true);

    try {
      const studentsData = await fetchInstructorStudents({ Subject_id: Number(subjectId) });
      setStudents(studentsData);

      const preferred = String(preferredStudentId || "");
      const fallback = String(studentsData[0]?.id || "");

      setForm((current) => {
        const currentIsValid = studentsData.some((student) => String(student.id) === String(current.Student_id));
        const preferredIsValid = preferred
          ? studentsData.some((student) => String(student.id) === preferred)
          : false;

        return {
          ...current,
          Student_id: currentIsValid ? current.Student_id : (preferredIsValid ? preferred : fallback),
        };
      });
    } catch (err) {
      setStudents([]);
      setForm((current) => ({ ...current, Student_id: "" }));
      setError(safeError(err));
    } finally {
      setStudentsLoading(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    setError("");

    try {
      const [marksData, subjectsData] = await Promise.all([
        fetchInstructorMarks(),
        fetchInstructorSubjects(),
      ]);

      const [coursesData, years] = await Promise.all([
        fetchInstructorCourses().catch(() => []),
        fetchAcademicYears().catch(() => []),
      ]);

      const initialSubjectId = String(form.Subject_id || subjectsData[0]?.id || "");
      const studentsData = initialSubjectId
        ? await fetchInstructorStudents({ Subject_id: Number(initialSubjectId) })
        : [];

      setMarks(marksData);
      setSubjects(subjectsData);
      setStudents(studentsData);
      setCourses(coursesData || []);
      setAcademicYears(years || []);
      const active = (years || []).find((y) => y.isActive) || years?.[0] || null;
      setSelectedYear(active);
      if (active) {
        const terms = await fetchTerms(active.id).catch(() => []);
        setYearTerms(terms || []);
        // Pre-select year/term in the add-mark form
        setFormYear(String(active.id));
        setFormTerms(terms || []);
        const activeTerm = (terms || []).find((t) => t.status === 'ACTIVE');
        if (activeTerm) {
          setFormTerm(String(activeTerm.id));
          const today = new Date().toISOString().slice(0, 10);
          const start = activeTerm.startDate ? String(activeTerm.startDate).slice(0, 10) : null;
          const end   = activeTerm.endDate   ? String(activeTerm.endDate).slice(0, 10)   : null;
          let date = today;
          if (start && today < start) date = start;
          if (end   && today > end)   date = end;
          setForm((prev) => ({ ...prev, time: date }));
        }
      }

      setForm((current) => ({
        ...current,
        Subject_id: current.Subject_id || initialSubjectId,
        Student_id: current.Student_id || String(studentsData[0]?.id || ""),
      }));
      setFilterSubjectId(initialSubjectId);
    } catch (err) {
      setError(safeError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        if (!cancelled) {
          await loadData();
        }
      } catch (err) {
        if (!cancelled) {
          setError(safeError(err));
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

  const visibleMarks = useMemo(() => {
    return (marks || []).filter((m) => {
      if (filterSubjectId && String(m.Subject_id) !== String(filterSubjectId)) return false;
      if (selectedCourse && m.subject?.Course_id && String(m.subject.Course_id) !== String(selectedCourse)) return false;
      if (filterStudentName.trim()) {
        const name = (m.student?.user?.name || m.student?.name || '').toLowerCase();
        if (!name.includes(filterStudentName.trim().toLowerCase())) return false;
      }
      if (selectedTerm && selectedTerm !== 'all') {
        const termNumber = Number(selectedTerm);
        const term = yearTerms.find((t) => Number(t.termNumber) === termNumber);
        if (term) {
          if (!m.time) return false;
          const d = new Date(m.time);
          const start = term.startDate ? new Date(term.startDate) : null;
          const end = term.endDate ? new Date(term.endDate) : null;
          if (start && d < start) return false;
          if (end && d > end) return false;
        }
      }
      return true;
    });
  }, [marks, filterSubjectId, filterStudentName, selectedCourse, selectedTerm, yearTerms]);

  const MARKS_PAGE_SIZE = 15;
  const [marksPage, setMarksPage] = useState(1);
  useEffect(() => { setMarksPage(1); }, [filterSubjectId, filterStudentName, selectedCourse, selectedTerm]);
  const pagedMarks = useMemo(
    () => visibleMarks.slice((marksPage - 1) * MARKS_PAGE_SIZE, marksPage * MARKS_PAGE_SIZE),
    [visibleMarks, marksPage],
  );

  const refreshMarks = async () => {
    const data = await fetchInstructorMarks();
    setMarks(data);
  };

  const onEdit = async (mark) => {
    const subjectId = String(mark.Subject_id || mark.subject?.id || "");
    const studentId = String(mark.Student_id || mark.student?.id || "");

    setForm({
      id: mark.id,
      Student_id: studentId,
      Subject_id: subjectId,
      Numbers: String(mark.Numbers ?? ""),
      OutOf: String(mark.OutOf ?? "100"),
      ExamPercentage: String(mark.ExamPercentage ?? "100"),
      MarkType: mark.MarkType || "EXAM",
      time: mark.time ? String(mark.time).slice(0, 10) : "",
    });

    await loadStudentsBySubject(subjectId, studentId);
    setMarkModalOpen(true);
  };

  const clearForm = () => {
    // Pre-select active academic year and its active term
    const activeYear = academicYears.find((y) => y.isActive) || academicYears[0] || null;
    if (activeYear && String(activeYear.id) !== formYear) {
      onFormYearChange(String(activeYear.id));
    }
    setForm((current) => ({
      id: null,
      Student_id: String(students[0]?.id || ""),
      Subject_id: current.Subject_id || String(subjects[0]?.id || ""),
      Numbers: "",
      OutOf: "100",
      ExamPercentage: "100",
      MarkType: "EXAM",
      time: "",
    }));
  };

  const onFormYearChange = async (yearId) => {
    setFormYear(yearId);
    setFormTerm('');
    if (!yearId) { setFormTerms([]); return; }
    const terms = await fetchTerms(Number(yearId)).catch(() => []);
    setFormTerms(terms || []);
    // auto-select the ACTIVE term if any
    const active = (terms || []).find((t) => t.status === 'ACTIVE');
    if (active) onFormTermChange(active, terms || []);
  };

  const onFormTermChange = (termOrId, termList) => {
    const list = termList || formTerms;
    const term = typeof termOrId === 'object' ? termOrId : list.find((t) => String(t.id) === String(termOrId));
    if (!term) { setFormTerm(''); return; }
    setFormTerm(String(term.id));
    // auto-set mark date to today clamped within term boundaries
    const today = new Date().toISOString().slice(0, 10);
    const start = term.startDate ? String(term.startDate).slice(0, 10) : null;
    const end   = term.endDate   ? String(term.endDate).slice(0, 10)   : null;
    let date = today;
    if (start && today < start) date = start;
    if (end   && today > end)   date = end;
    setForm((prev) => ({ ...prev, time: date }));
  };

  const onSubjectChange = async (subjectId) => {
    setForm((current) => ({
      ...current,
      Subject_id: subjectId,
      Student_id: "",
    }));

    await loadStudentsBySubject(subjectId);
  };

  const onSubmit = async (event) => {
    event.preventDefault();

    if (!form.Subject_id || !form.Student_id) {
      setError(isArabic
        ? "اختر المادة والطالب أولًا"
        : "Select subject and eligible student first");
      return;
    }

    setSaving(true);
    setError("");

    const payload = {
      Student_id: Number(form.Student_id),
      Subject_id: Number(form.Subject_id),
      Numbers: Number(form.Numbers),
      OutOf: Number(form.OutOf),
      ExamPercentage: Number(form.ExamPercentage),
      MarkType: form.MarkType || "EXAM",
      ...(form.time ? { time: form.time } : {}),
    };

    try {
      if (form.id) {
        await updateInstructorMark(form.id, payload);
      } else {
        await createInstructorMark(payload);
      }

      clearForm();
      setMarkModalOpen(false);
      await refreshMarks();
    } catch (err) {
      setError(safeError(err));
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (mark) => {
    const confirmed = window.confirm(
      isArabic
        ? `هل تريد حذف علامة الطالب ${mark.student?.user?.name || ""}؟`
        : `Delete mark for ${mark.student?.user?.name || "student"}?`,
    );
    if (!confirmed) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      await deleteInstructorMark(mark.id);
      await refreshMarks();
    } catch (err) {
      setError(safeError(err));
    } finally {
      setSaving(false);
    }
  };

  const hasEligibleStudents = students.length > 0;

  // Total weight already used for the selected student + subject (excluding the mark being edited)
  const usedWeight = useMemo(() => {
    if (!form.Student_id || !form.Subject_id) return 0;
    return (marks || []).reduce((sum, m) => {
      if (String(m.Student_id) !== String(form.Student_id)) return sum;
      if (String(m.Subject_id) !== String(form.Subject_id)) return sum;
      if (form.id && m.id === form.id) return sum; // exclude the mark being edited
      return sum + Number(m.ExamPercentage || 0);
    }, 0);
  }, [marks, form.Student_id, form.Subject_id, form.id]);

  const remainingWeight = Math.max(0, 100 - usedWeight);
  const newTotal = usedWeight + Number(form.ExamPercentage || 0);
  const weightOverLimit = newTotal > 100;

  return (
    <InstructorLayout
      title={isArabic ? "العلامات" : "Marks"}
      subtitle={isArabic ? "استعراض العلامات المسجلة للطلاب" : "View and manage students' marks."}
    >
      {loading ? (
        <EducationLoading
          isArabic={isArabic}
          title={isArabic ? "جاري تحميل العلامات" : "Loading marks"}
          subtitle={isArabic ? "نسترجع بيانات الطلاب والمواد والنتائج" : "Fetching students, subjects, and grading data"}
          fullscreen
        />
      ) : null}

      <div className="mb-6">
        <button
          type="button"
          onClick={() => { clearForm(); setMarkModalOpen(true); }}
          className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white"
        >
          {isArabic ? "+ إضافة علامة" : "+ Add Mark"}
        </button>
      </div>

      <Modal
        open={markModalOpen}
        onClose={() => setMarkModalOpen(false)}
        title={isArabic ? "إضافة علامة" : "Add Mark"}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={onSubmit}>
          <p className="mb-4 text-xs text-slate-500">{isArabic ? "الحقول بعلامة * مطلوبة" : "Fields marked with * are required."}</p>
          <div className="grid gap-3 md:grid-cols-3">

            {/* Academic Year */}
            <label className="space-y-1 text-xs font-semibold text-slate-700">
              <span>{isArabic ? "العام الدراسي" : "Academic Year"}</span>
              <select
                value={formYear}
                onChange={(e) => onFormYearChange(e.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
              >
                <option value="">{isArabic ? "— اختر العام —" : "— Select year —"}</option>
                {academicYears.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name}{y.isActive ? (isArabic ? ' (نشط)' : ' (Active)') : ''}
                  </option>
                ))}
              </select>
              {academicYears.length === 0 && (
                <p className="text-[11px] text-amber-600">
                  {isArabic ? "لا توجد سنوات دراسية — أضفها من لوحة المؤسسة." : "No academic years — add them from the org dashboard."}
                </p>
              )}
            </label>

            {/* Term */}
            <label className="space-y-1 text-xs font-semibold text-slate-700">
              <span>{isArabic ? "الفصل الدراسي" : "Term"}</span>
              <select
                value={formTerm}
                onChange={(e) => onFormTermChange(e.target.value)}
                disabled={!formYear || formTerms.length === 0}
                className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm disabled:opacity-50"
              >
                <option value="">{isArabic ? "— اختر الفصل —" : "— Select term —"}</option>
                {formTerms.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name || `${isArabic ? 'الفصل' : 'Term'} ${t.termNumber}`}
                    {t.status === 'ACTIVE' ? (isArabic ? ' (نشط)' : ' (Active)') : ''}
                  </option>
                ))}
              </select>
            </label>

            {/* Spacer on large screens */}
            <div className="hidden md:block" />

            <label className="space-y-1 text-xs font-semibold text-slate-700">
              <span>{isArabic ? "الطالب" : "Student"} *</span>
              <select
                value={form.Student_id}
                onChange={(event) => setForm((current) => ({ ...current, Student_id: event.target.value }))}
                className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
                disabled={studentsLoading || !form.Subject_id || !hasEligibleStudents}
                required
              >
                <option value="">
                  {studentsLoading
                    ? (isArabic ? "جاري تحميل الطلاب" : "Loading students")
                    : (isArabic ? "اختر الطالب" : "Select student")}
                </option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>{student.user?.name || student.name || `#${student.id}`}</option>
                ))}
              </select>
              {!studentsLoading && form.Subject_id && !hasEligibleStudents ? (
                <p className="text-[11px] text-rose-600">
                  {isArabic
                    ? "لا يوجد طلاب متاحون لهذه المادة."
                    : "No eligible students found for this subject."}
                </p>
              ) : null}
            </label>

            <label className="space-y-1 text-xs font-semibold text-slate-700">
              <span>{isArabic ? "المادة" : "Subject"} *</span>
              <select
                value={form.Subject_id}
                onChange={(event) => onSubjectChange(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
                required
              >
                <option value="">{isArabic ? "اختر المادة" : "Select subject"}</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>{subject.name}</option>
                ))}
              </select>
            </label>

            <label className="space-y-1 text-xs font-semibold text-slate-700">
              <span>{isArabic ? "نوع التقييم" : "Assessment type"}</span>
              <input
                value={form.MarkType}
                onChange={(event) => setForm((current) => ({ ...current, MarkType: event.target.value }))}
                className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
                placeholder={isArabic ? "مثال: EXAM" : "Example: EXAM"}
              />
            </label>

            <label className="space-y-1 text-xs font-semibold text-slate-700">
              <span>{isArabic ? "العلامة" : "Score"} *</span>
              <input
                value={form.Numbers}
                onChange={(event) => setForm((current) => ({ ...current, Numbers: event.target.value }))}
                type="number"
                step="0.01"
                className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
                placeholder={isArabic ? "مثال: 85" : "Example: 85"}
                required
              />
            </label>

            <label className="space-y-1 text-xs font-semibold text-slate-700">
              <span>{isArabic ? "من" : "Out of"} *</span>
              <input
                value={form.OutOf}
                onChange={(event) => setForm((current) => ({ ...current, OutOf: event.target.value }))}
                type="number"
                step="0.01"
                className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
                placeholder={isArabic ? "مثال: 100" : "Example: 100"}
                required
              />
            </label>

            {/* Weight of this assessment towards the final average — teacher sets manually */}
            <label className="space-y-1 text-xs font-semibold text-slate-700">
              <span>{isArabic ? "وزن التقييم من الدرجة النهائية" : "Weight in final grade"}</span>
              <div className="relative">
                <input
                  value={form.ExamPercentage}
                  onChange={(event) => setForm((current) => ({ ...current, ExamPercentage: event.target.value }))}
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  className={`h-11 w-full rounded-xl border px-3 pe-10 text-sm ${weightOverLimit ? 'border-rose-400 bg-rose-50' : 'border-slate-200'}`}
                  placeholder={isArabic ? "مثال: 20" : "e.g. 20"}
                />
                <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">%</span>
              </div>
              {/* Budget bar */}
              {form.Student_id && form.Subject_id && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-semibold">
                    <span className={weightOverLimit ? 'text-rose-600' : 'text-slate-500'}>
                      {isArabic
                        ? `مستخدم: ${usedWeight}% — متبقٍّ: ${remainingWeight}%`
                        : `Used: ${usedWeight}% — Remaining: ${remainingWeight}%`}
                    </span>
                    <span className={`font-bold ${weightOverLimit ? 'text-rose-600' : newTotal === 100 ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {newTotal}% / 100%
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${weightOverLimit ? 'bg-rose-500' : newTotal === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                      style={{ width: `${Math.min(100, newTotal)}%` }}
                    />
                  </div>
                  {weightOverLimit && (
                    <p className="text-[10px] font-semibold text-rose-600">
                      {isArabic
                        ? `مجموع الأوزان يتجاوز 100%. قلّل القيمة بمقدار ${(newTotal - 100).toFixed(1)}%.`
                        : `Total exceeds 100%. Reduce by ${(newTotal - 100).toFixed(1)}%.`}
                    </p>
                  )}
                </div>
              )}
            </label>

            <label className="space-y-1 text-xs font-semibold text-slate-700">
              <span>{isArabic ? "تاريخ العلامة" : "Mark date"}</span>
              <input
                value={form.time}
                onChange={(event) => setForm((current) => ({ ...current, time: event.target.value }))}
                type="date"
                className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
              />
            </label>

            <div className="md:col-span-3 flex gap-2">
              <button
                type="submit"
                disabled={saving || studentsLoading || !hasEligibleStudents || weightOverLimit}
                className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
              >
                {form.id ? (isArabic ? "تحديث" : "Update") : (isArabic ? "إضافة" : "Add")}
              </button>
              <button type="button" onClick={clearForm} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700">
                {isArabic ? "تفريغ" : "Clear"}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      <div className="mb-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">

          {/* Student name search */}
          <label className="space-y-1 text-xs font-semibold">
            <div className="text-xs text-slate-500">{isArabic ? 'اسم الطالب' : 'Student name'}</div>
            <div className="relative">
              <input
                value={filterStudentName}
                onChange={(e) => setFilterStudentName(e.target.value)}
                placeholder={isArabic ? 'ابحث باسم الطالب...' : 'Search student...'}
                className="h-10 w-56 rounded-xl border border-slate-200 py-0 ps-9 pe-3 text-sm outline-none focus:border-indigo-400"
              />
              <svg className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              {filterStudentName && (
                <button type="button" onClick={() => setFilterStudentName('')}
                  className="absolute end-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              )}
            </div>
          </label>

          <label className="space-y-1 text-xs font-semibold">
            <div className="text-xs text-slate-500">{isArabic ? 'المادة' : 'Subject'}</div>
            <select
              value={filterSubjectId}
              onChange={(e) => { setFilterSubjectId(e.target.value); onSubjectChange(e.target.value); }}
              className="h-10 rounded-xl border border-slate-200 px-3 text-sm"
            >
              <option value="">{isArabic ? 'كل المواد' : 'All subjects'}</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-xs font-semibold">
            <div className="text-xs text-slate-500">{isArabic ? 'الصف' : 'Class'}</div>
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 px-3 text-sm"
            >
              <option value="">{isArabic ? 'كل الصفوف' : 'All classes'}</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.Name || c.name || `#${c.id}`}</option>
              ))}
            </select>
          </label>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedTerm('all')}
              className={`rounded-xl px-3 py-1 text-xs font-semibold ${selectedTerm === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}
            >
              {isArabic ? 'الكل' : 'All'}
            </button>
            {yearTerms.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedTerm(String(t.termNumber))}
                className={`rounded-xl px-3 py-1 text-xs font-semibold ${String(selectedTerm) === String(t.termNumber) ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}
              >
                {t.name || `${isArabic ? 'الفصل' : 'Term'} ${t.termNumber}`}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">{isArabic ? "الطالب" : "Student"}</th>
              <th className="px-4 py-3">{isArabic ? "المادة" : "Subject"}</th>
              <th className="px-4 py-3">{isArabic ? "العلامة" : "Score"}</th>
              <th className="px-4 py-3">{isArabic ? "وزن التقييم" : "Weight"}</th>
              <th className="px-4 py-3">{isArabic ? "النوع" : "Type"}</th>
              <th className="px-4 py-3">{isArabic ? "التاريخ" : "Date"}</th>
              <th className="px-4 py-3">{isArabic ? "الإجراءات" : "Actions"}</th>
            </tr>
          </thead>
          <tbody>
            {marks.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-4 py-6 text-slate-500">{isArabic ? "لا توجد علامات." : "No marks found."}</td>
              </tr>
            ) : pagedMarks.map((mark) => (
              <tr key={mark.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-semibold text-slate-900">{mark.student?.user?.name || "-"}</td>
                <td className="px-4 py-3 text-slate-700">{mark.subject?.name || "-"}</td>
                <td className="px-4 py-3 text-slate-700">{formatScore(mark.Numbers)} / {formatScore(mark.OutOf)}</td>
                <td className="px-4 py-3">
                  {mark.ExamPercentage != null && mark.ExamPercentage !== ''
                    ? <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-700">{formatScore(mark.ExamPercentage)}%</span>
                    : <span className="text-slate-400">—</span>}
                </td>
                <td className="px-4 py-3 text-slate-700">{mark.MarkType || "EXAM"}</td>
                <td className="px-4 py-3 text-slate-700">{mark.time ? String(mark.time).slice(0, 10) : "-"}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onEdit(mark)}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700"
                    >
                      {isArabic ? "تعديل" : "Edit"}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(mark)}
                      disabled={saving}
                      className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700 disabled:opacity-50"
                    >
                      {isArabic ? "حذف" : "Delete"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-3 px-1">
          <Pagination page={marksPage} totalPages={Math.ceil(visibleMarks.length / MARKS_PAGE_SIZE)} totalItems={visibleMarks.length} pageSize={MARKS_PAGE_SIZE} onPageChange={setMarksPage} isArabic={isArabic} />
        </div>
      </div>

    </InstructorLayout>
  );
}
