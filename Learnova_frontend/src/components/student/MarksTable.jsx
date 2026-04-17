import { Badge } from "../ui/badge";

const formatScore = (value) => {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number.toFixed(2).replace(/\.00$/, "") : "0";
};

export default function MarksTable({ marks, isArabic, emptyLabel }) {
  if (!marks.length) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-sm text-slate-500 shadow-sm">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
          <tr>
            <th className="px-4 py-3">{isArabic ? "المادة" : "Subject"}</th>
            <th className="px-4 py-3">{isArabic ? "الكورس" : "Course"}</th>
            <th className="px-4 py-3">{isArabic ? "النوع" : "Type"}</th>
            <th className="px-4 py-3">{isArabic ? "الدرجة" : "Score"}</th>
            <th className="px-4 py-3">{isArabic ? "النسبة" : "Percent"}</th>
            <th className="px-4 py-3">{isArabic ? "التاريخ" : "Date"}</th>
          </tr>
        </thead>
        <tbody>
          {marks.map((mark) => {
            const percent = Number(mark.OutOf) ? (Number(mark.Numbers) / Number(mark.OutOf)) * 100 : 0;
            const statusVariant = percent >= 70 ? "inverse" : percent >= 50 ? "subtle" : "neutral";

            return (
              <tr key={mark.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-semibold text-slate-900">{mark.subject?.name || mark.subject?.Name || "-"}</td>
                <td className="px-4 py-3 text-slate-700">{mark.subject?.course?.Name || mark.subject?.course?.name || mark.subject?.Course_id || "-"}</td>
                <td className="px-4 py-3">
                  <Badge variant={statusVariant}>{mark.MarkType || (isArabic ? "درجة" : "Mark")}</Badge>
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {formatScore(mark.Numbers)} / {formatScore(mark.OutOf)}
                </td>
                <td className="px-4 py-3 font-semibold text-slate-900">{formatScore(percent)}%</td>
                <td className="px-4 py-3 text-slate-600">
                  {mark.time ? new Date(mark.time).toLocaleDateString() : "-"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}