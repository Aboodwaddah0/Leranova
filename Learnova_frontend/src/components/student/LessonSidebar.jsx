import { Badge } from "../ui/badge";

export default function LessonSidebar({
  isArabic,
  courses,
  subjects,
  selectedCourseId,
  selectedSubjectId,
  onCourseChange,
  onSubjectChange,
}) {
  return (
    <aside className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600">{isArabic ? "مسار التعلم" : "Learning path"}</p>
        <h3 className="mt-2 text-xl font-black text-slate-900">{isArabic ? "اختر السياق" : "Choose a context"}</h3>
      </div>

      <label className="block space-y-2 text-sm font-semibold text-slate-700">
        <span>{isArabic ? "الكورس" : "Course"}</span>
        <select
          value={selectedCourseId}
          onChange={(event) => onCourseChange(event.target.value)}
          className="h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm outline-none focus:border-indigo-500"
        >
          <option value="">{isArabic ? "اختر الكورس" : "Select course"}</option>
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.name || course.Name}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-2 text-sm font-semibold text-slate-700">
        <span>{isArabic ? "المادة" : "Subject"}</span>
        <select
          value={selectedSubjectId}
          onChange={(event) => onSubjectChange(event.target.value)}
          className="h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm outline-none focus:border-indigo-500"
        >
          <option value="">{isArabic ? "اختر المادة" : "Select subject"}</option>
          {subjects.map((subject) => (
            <option key={subject.id} value={subject.id}>
              {subject.name}
            </option>
          ))}
        </select>
      </label>

      <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
        <p className="font-semibold text-slate-900">{isArabic ? "ملاحظة" : "Note"}</p>
        <p className="mt-2 leading-6">
          {isArabic
            ? "لا توجد واجهة دروس منفصلة للطالب بعد، لذلك تعرض هذه المساحة أدوات الدراسة والدعم الذكي بدلًا من فيديوهات الدروس المباشرة."
            : "There is no separate student lesson API yet, so this space focuses on study tools and AI support instead of direct lesson videos."}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant="subtle">{isArabic ? "AI" : "AI"}</Badge>
        <Badge variant="neutral">{isArabic ? "تعليقات" : "Comments"}</Badge>
        <Badge variant="neutral">{isArabic ? "درجات" : "Marks"}</Badge>
      </div>
    </aside>
  );
}