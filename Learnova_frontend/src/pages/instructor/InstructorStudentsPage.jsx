import { useEffect, useState, useMemo } from "react";
import Pagination from "../../components/ui/Pagination";
import { useSelector } from "react-redux";
import { FileText, Trash2, Send, X, ChevronDown, ChevronUp, Info } from "lucide-react";
import InstructorLayout from "../../components/instructor/InstructorLayout";
import EducationLoading from "../../components/ui/EducationLoading";
import {
  fetchInstructorStudents,
  fetchInstructorSubjects,
  fetchStudentNotes,
  createStudentNote,
  deleteStudentNote,
} from "../../services/instructorService";
import { useLanguage } from "../../utils/i18n";
import { notifyError, notifySuccess } from "../../lib/notify";

const safeError = (error) => error?.response?.data?.message || error?.message || "Request failed";

const formatDate = (dateStr, isArabic) => {
  try {
    return new Date(dateStr).toLocaleDateString(isArabic ? 'ar-EG' : 'en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  } catch { return dateStr; }
};

function NotePanel({ student, isArabic, onClose }) {
  const [notes, setNotes] = useState([]);
  const [notesLoading, setNotesLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [expandedNoteId, setExpandedNoteId] = useState(null);

  const studentId = student.student?.Student_id || student.student?.id || student.id;
  const studentName = student.user?.name || "-";

  useEffect(() => {
    let cancelled = false;
    fetchStudentNotes(studentId)
      .then((data) => { if (!cancelled) setNotes(data || []); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setNotesLoading(false); });
    return () => { cancelled = true; };
  }, [studentId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      const note = await createStudentNote({ studentId, title: title.trim() || null, content: content.trim() });
      setNotes((prev) => [note, ...prev]);
      setTitle("");
      setContent("");
      notifySuccess(isArabic ? "تم إرسال الملاحظة" : "Note sent");
    } catch (err) {
      notifyError(safeError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (noteId) => {
    try {
      await deleteStudentNote(noteId);
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    } catch (err) {
      notifyError(safeError(err));
    }
  };

  return (
    <div className="mt-4 rounded-[20px] border border-indigo-200 bg-indigo-50/40 shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-indigo-100 px-5 py-4">
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-indigo-600" />
          <span className="font-bold text-slate-900">
            {isArabic ? `ملاحظات لـ ${studentName}` : `Notes for ${studentName}`}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition"
        >
          <X size={15} />
        </button>
      </div>

      {/* Create note form */}
      <form onSubmit={handleSubmit} className="space-y-3 px-5 py-4 border-b border-indigo-100">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={isArabic ? "العنوان (اختياري)" : "Title (optional)"}
          className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:border-indigo-400 focus:outline-none"
        />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={isArabic ? "اكتب ملاحظتك هنا..." : "Write your note here..."}
          rows={3}
          required
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none resize-none"
        />
        <button
          type="submit"
          disabled={submitting || !content.trim()}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:opacity-50"
        >
          <Send size={14} />
          {submitting
            ? (isArabic ? "جاري الإرسال..." : "Sending...")
            : (isArabic ? "إرسال الملاحظة" : "Send Note")}
        </button>
      </form>

      {/* Notes list */}
      <div className="px-5 py-4 space-y-2">
        {notesLoading ? (
          <div className="h-10 animate-pulse rounded-xl bg-slate-200" />
        ) : notes.length === 0 ? (
          <p className="text-center text-sm text-slate-400 py-4">
            {isArabic ? "لا توجد ملاحظات سابقة" : "No previous notes"}
          </p>
        ) : notes.map((note) => (
          <div key={note.id} className="rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between gap-2 px-4 py-2.5">
              <button
                type="button"
                onClick={() => setExpandedNoteId(expandedNoteId === note.id ? null : note.id)}
                className="flex-1 text-start"
              >
                <p className="text-sm font-semibold text-slate-900 truncate">
                  {note.title || (isArabic ? "ملاحظة" : "Note")}
                </p>
                <p className="text-xs text-slate-400">{formatDate(note.createdAt, isArabic)}</p>
              </button>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setExpandedNoteId(expandedNoteId === note.id ? null : note.id)}
                  className="rounded p-1 text-slate-400 hover:text-slate-600"
                >
                  {expandedNoteId === note.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(note.id)}
                  className="rounded p-1 text-rose-400 hover:text-rose-600 transition"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            {expandedNoteId === note.id && (
              <div className="border-t border-slate-100 px-4 py-3">
                <p className="whitespace-pre-wrap text-sm text-slate-700">{note.content}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Age calculator ── */
const calcAge = (dob) => {
  if (!dob) return null;
  const birth = new Date(dob);
  if (isNaN(birth)) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age--;
  return age;
};

/* ── Student detail modal ── */
function StudentDetailModal({ entry, isArabic, onClose }) {
  const name    = entry.user?.name    || "-";
  const email   = entry.user?.email   || "-";
  const address = entry.user?.address || "-";
  // dob is stored lowercase inside the nested student object
  const dob     = entry.student?.dob  ?? null;
  const dobAge  = calcAge(dob);
  // fall back to the stored integer age for academy students who have no DOB
  const age     = dobAge !== null ? dobAge : (entry.user?.age ?? null);
  const gender  = entry.user?.gender  || "-";

  const row = (label, value) => (
    <div className="flex justify-between gap-4 border-b border-slate-100 py-2.5 last:border-0">
      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</span>
      <span className="text-sm font-semibold text-slate-800 text-right">{value}</span>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
         onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl"
           onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="font-black text-slate-900">{isArabic ? "تفاصيل الطالب" : "Student Details"}</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"><X size={16} /></button>
        </div>
        <div className="px-5 py-4 space-y-0">
          {row(isArabic ? "الاسم"         : "Name",         name)}
          {row(isArabic ? "البريد"        : "Email",        email)}
          {row(isArabic ? "العنوان"       : "Address",      address)}
          {row(isArabic ? "تاريخ الميلاد" : "Date of Birth", dob ? String(dob).slice(0, 10) : "-")}
          {row(isArabic ? "العمر"         : "Age",          age !== null ? `${age} ${isArabic ? "سنة" : "yrs"}` : "-")}
          {row(isArabic ? "الجنس"         : "Gender",       gender === "MALE" ? (isArabic ? "ذكر" : "Male") : gender === "FEMALE" ? (isArabic ? "أنثى" : "Female") : gender)}
        </div>
      </div>
    </div>
  );
}

export default function InstructorStudentsPage() {
  const { isArabic } = useLanguage();
  const user = useSelector((s) => s.auth?.user);
  const orgType = String(user?.organizationType || user?.organization?.Role || '').toUpperCase();
  const isSchool = orgType === 'SCHOOL';

  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState("");
  const [students, setStudents]           = useState([]);
  const [subjects, setSubjects]           = useState([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState(null);

  // Reset filter to "All" every time the page is entered
  useEffect(() => { setSelectedSubjectId(null); }, []);
  const [noteStudent, setNoteStudent]     = useState(null);
  const [detailStudent, setDetailStudent] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchInstructorSubjects()
      .then((list) => { if (!cancelled) setSubjects(list || []); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const params = {};
        if (selectedSubjectId) params.Subject_id = selectedSubjectId;
        const data = await fetchInstructorStudents(params);
        if (!cancelled) setStudents(data);
      } catch (err) {
        if (!cancelled) setError(safeError(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [selectedSubjectId]);

  useEffect(() => {
    if (error) notifyError(error);
  }, [error]);

  const statusMap = {
    ACTIVE:    { label: isArabic ? "نشط" : "Active",       cls: "bg-emerald-100 text-emerald-700" },
    INACTIVE:  { label: isArabic ? "غير نشط" : "Inactive", cls: "bg-slate-100 text-slate-600"    },
    GRADUATED: { label: isArabic ? "متخرج" : "Graduated",  cls: "bg-blue-100 text-blue-700"      },
    FILED:     { label: isArabic ? "مؤرشف" : "Filed",      cls: "bg-amber-100 text-amber-700"    },
  };

  const STUDENTS_PAGE_SIZE = 15;
  const [studentsPage, setStudentsPage] = useState(1);
  useEffect(() => { setStudentsPage(1); }, [selectedSubjectId, students]);
  const pagedStudents = useMemo(
    () => students.slice((studentsPage - 1) * STUDENTS_PAGE_SIZE, studentsPage * STUDENTS_PAGE_SIZE),
    [students, studentsPage],
  );

  return (
    <InstructorLayout
      title={isArabic ? "الطلاب" : "Students"}
      subtitle={isArabic ? "عرض الطلاب المرتبطين بموادك" : "View students associated with your subjects."}
    >
      {loading ? (
        <EducationLoading
          isArabic={isArabic}
          title={isArabic ? "جاري تحميل قائمة الطلاب" : "Loading students"}
          subtitle={isArabic ? "نرتب بيانات الطلاب الخاصة بموادك" : "Preparing students linked to your subjects"}
          fullscreen
        />
      ) : null}

      <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
        {/* Filter bar */}
        <div className="px-6 py-4 flex items-center gap-4 border-b border-slate-100">
          <label className="text-sm font-semibold text-slate-600">
            {isArabic ? "فلتر حسب الكورس:" : "Filter by course:"}
          </label>
          <select
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-indigo-400"
            value={selectedSubjectId ?? ""}
            onChange={(e) => { setSelectedSubjectId(e.target.value ? Number(e.target.value) : null); setNoteStudent(null); }}
          >
            <option value="">{isArabic ? "كل الكورسات" : "All courses"}</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.name || s.Name}</option>
            ))}
          </select>
          <span className="ml-auto rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
            {students.length} {isArabic ? "طالب" : "students"}
          </span>
        </div>

        {/* Table */}
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">{isArabic ? "الاسم" : "Name"}</th>
              <th className="px-4 py-3">{isArabic ? "البريد" : "Email"}</th>
              <th className="px-4 py-3">{isArabic ? "العمر" : "Age"}</th>
              <th className="px-4 py-3">{isArabic ? "العنوان" : "Address"}</th>
              <th className="px-4 py-3 text-center">{isArabic ? "الإجراءات" : "Actions"}</th>
            </tr>
          </thead>
          <tbody>
            {students.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  {isArabic ? "لا يوجد طلاب لهذه المادة." : "No students found for this subject."}
                </td>
              </tr>
            ) : pagedStudents.map((entry) => {
              const dob      = entry.student?.dob ?? null;
              const dobAge   = calcAge(dob);
              const age      = dobAge !== null ? dobAge : (entry.user?.age ?? null);
              const address  = entry.user?.address || "-";
              const isSelected = noteStudent?.id === entry.id || noteStudent?.user?.email === entry.user?.email;
              return (
                <tr key={entry.id} className={`border-t border-slate-100 transition ${isSelected ? 'bg-indigo-50/30' : 'hover:bg-slate-50'}`}>
                  <td className="px-4 py-3 font-semibold text-slate-900">{entry.user?.name || "-"}</td>
                  <td className="px-4 py-3 text-slate-700">{entry.user?.email || "-"}</td>
                  <td className="px-4 py-3 text-slate-700">{age !== null ? age : "-"}</td>
                  <td className="px-4 py-3 text-slate-700 max-w-[160px]"><p className="truncate">{address}</p></td>
                  <td className="px-4 py-3 text-center">
                    <div className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setDetailStudent(entry)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100"
                      >
                        <Info size={13} />
                        {isArabic ? "تفاصيل" : "Details"}
                      </button>
                      {isSchool && (
                        <button
                          type="button"
                          onClick={() => setNoteStudent(isSelected ? null : entry)}
                          className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                            isSelected ? 'bg-indigo-600 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <FileText size={13} />
                          {isArabic ? "ملاحظة" : "Note"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="mt-3 px-1 pb-2">
          <Pagination page={studentsPage} totalPages={Math.ceil(students.length / STUDENTS_PAGE_SIZE)} totalItems={students.length} pageSize={STUDENTS_PAGE_SIZE} onPageChange={setStudentsPage} isArabic={isArabic} />
        </div>
      </div>

      {/* Note panel */}
      {isSchool && noteStudent && (
        <NotePanel
          student={noteStudent}
          isArabic={isArabic}
          onClose={() => setNoteStudent(null)}
        />
      )}

      {/* Student detail modal */}
      {detailStudent && (
        <StudentDetailModal
          entry={detailStudent}
          isArabic={isArabic}
          onClose={() => setDetailStudent(null)}
        />
      )}
    </InstructorLayout>
  );
}
