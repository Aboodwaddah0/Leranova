import { Badge } from "../ui/badge";
import { Button } from "../ui/button";

const formatMoney = (value) => {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) {
    return "0";
  }

  return amount.toFixed(2).replace(/\.00$/, "");
};

export default function CourseCard({
  course,
  isArabic,
  onOpen,
  onStudy,
  selected,
  ctaLabel,
  ctaDisabled = false,
}) {
  const status = course.status || course.paymentStatus || course.source || "";

  return (
    <article
      className={`group overflow-hidden rounded-3xl border bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl ${
        selected ? "border-[#2379c3] ring-2 ring-[#2379c3]/10" : "border-slate-200"
      }`}
    >
      <div className="mb-4 overflow-hidden rounded-2xl bg-slate-100">
        <img
          src={course.thumbnail || "https://images.unsplash.com/photo-1484417894907-623942c8ee29?auto=format&fit=crop&w=1200&q=80"}
          alt={course.name || "Course thumbnail"}
          className="h-40 w-full object-cover transition duration-300 group-hover:scale-105"
        />
      </div>

      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#2379c3]">
            {course.gradeLevel ? `${isArabic ? "الصف" : "Grade"} ${course.gradeLevel}` : isArabic ? "مقرر" : "Course"}
          </p>
          <h3 className="mt-2 text-xl font-black text-slate-900">{course.name || course.title || course.Name}</h3>
        </div>
        <Badge variant={status === "SUCCESS" || status === "PAID" || status === true ? "inverse" : "subtle"}>
          {status === "SUCCESS" || status === "PAID" || status === true
            ? isArabic
              ? "مدفوع"
              : "Paid"
            : status === "PENDING"
              ? isArabic
                ? "معلق"
                : "Pending"
              : isArabic
                ? "نشط"
                : "Active"}
        </Badge>
      </div>

      <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
        {course.description || course.Description || (isArabic ? "لا يوجد وصف لهذا المسار بعد." : "No description is available for this track yet.")}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-600">
        <div className="rounded-2xl bg-slate-50 px-3 py-2">
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
            {isArabic ? "السعر" : "Price"}
          </div>
          <div className="mt-1 font-semibold text-slate-900">
            {formatMoney(course.price || 0)}
          </div>
        </div>
        <div className="rounded-2xl bg-slate-50 px-3 py-2">
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
            {isArabic ? "المواد" : "Subjects"}
          </div>
          <div className="mt-1 font-semibold text-slate-900">{course.subjectCount ?? 0}</div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="secondary" onClick={onOpen}>
          {isArabic ? "عرض التفاصيل" : "View details"}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onStudy} disabled={ctaDisabled}>
          {ctaLabel || (isArabic ? "مساحة الدراسة" : "Study space")}
        </Button>
      </div>
    </article>
  );
}