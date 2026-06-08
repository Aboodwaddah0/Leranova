/**
 * OrgReportsPanel.jsx
 * Full Reports tab for both School and Academy org types.
 * Shows a report selector on the left, filters + live data table on the right.
 */

import { useState, useCallback, useRef } from "react";
import { BarChart2, BookOpen, Users, ClipboardList, Calendar, DollarSign, TrendingUp, FileText, CheckSquare, Star, Download, ChevronDown, FileSpreadsheet, FileText as FilePdf } from "lucide-react";
import * as XLSX from "xlsx";
import { fetchReport } from "../../services/organizationService";

// ── helpers ─────────────────────────────────────────────────────────────────

const fmt = (v) => (v === null || v === undefined ? "—" : String(v));
const pct = (v) => (v === null || v === undefined ? "—" : `${v}%`);
const money = (v) => (v === null || v === undefined ? "—" : `$${Number(v).toFixed(2)}`);
const dateStr = (v) => (v ? new Date(v).toLocaleDateString() : "—");

const PassBadge = ({ val }) => {
  if (val === null || val === undefined) return <span className="text-slate-400">—</span>;
  return val
    ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">Pass</span>
    : <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-700">Fail</span>;
};

const StatusBadge = ({ val }) => {
  const map = {
    COMPLETED: "bg-emerald-100 text-emerald-700",
    PENDING:   "bg-amber-100  text-amber-700",
    FAILED:    "bg-rose-100   text-rose-700",
    PRESENT:   "bg-emerald-100 text-emerald-700",
    ABSENT:    "bg-rose-100   text-rose-700",
    LATE:      "bg-amber-100  text-amber-700",
    EXCUSED:   "bg-sky-100    text-sky-700",
    ACTIVE:    "bg-teal-100   text-teal-700",
    PLANNED:   "bg-slate-100  text-slate-600",
    CLOSED:    "bg-slate-200  text-slate-500",
  };
  const cls = map[val] ?? "bg-slate-100 text-slate-600";
  return <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${cls}`}>{val ?? "—"}</span>;
};

// Simple CSV download from array-of-objects
// ── Export helpers ───────────────────────────────────────────────────────────

const triggerDownload = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

/** Export rows-of-objects to CSV */
const exportCSV = (filename, rows) => {
  if (!rows?.length) return;
  const keys = Object.keys(rows[0]);
  const lines = [
    keys.join(","),
    ...rows.map((r) => keys.map((k) => JSON.stringify(r[k] ?? "")).join(",")),
  ];
  triggerDownload(
    new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8;" }),
    filename,
  );
};

/** Export rows-of-objects to .xlsx using SheetJS */
const exportXLSX = (filename, rows, sheetName = "Report") => {
  if (!rows?.length) return;
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, filename);
};

/**
 * Build a clean black-and-white HTML document from flat rows,
 * then export it to PDF via html2pdf.js.
 * No colours, no badges — plain text table only.
 */
const exportPDF = async (reportKey, data, filename, reportLabel) => {
  const rows = flattenForCSV(reportKey, data);
  if (!rows?.length) return;

  const html2pdf = (await import("html2pdf.js")).default;

  const keys = Object.keys(rows[0]);

  const headerRow = keys
    .map((k) => `<th style="border:1px solid #333;padding:6px 10px;background:#f0f0f0;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;">${k}</th>`)
    .join("");

  const bodyRows = rows
    .map(
      (r) =>
        `<tr>${keys
          .map((k) => {
            const v = r[k];
            // Normalize booleans (true → Pass, false → Fail)
            const display =
              v === true ? "Pass" : v === false ? "Fail" : v === null || v === undefined ? "—" : String(v);
            return `<td style="border:1px solid #ccc;padding:5px 10px;font-size:11px;">${display}</td>`;
          })
          .join("")}</tr>`,
    )
    .join("");

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#111;padding:20px;">
      <h2 style="margin:0 0 4px;font-size:18px;">${reportLabel ?? "Report"}</h2>
      <p style="margin:0 0 16px;font-size:11px;color:#555;">Generated: ${new Date().toLocaleString()}</p>
      <table style="width:100%;border-collapse:collapse;">
        <thead><tr>${headerRow}</tr></thead>
        <tbody>${bodyRows}</tbody>
      </table>
    </div>`;

  html2pdf()
    .set({
      margin:      [10, 10, 10, 10],
      filename,
      html2canvas: { scale: 2, useCORS: true },
      jsPDF:       { unit: "mm", format: "a4", orientation: "landscape" },
      pagebreak:   { mode: ["css", "legacy"] },
    })
    .from(html)
    .save();
};

// ── Report catalogue ─────────────────────────────────────────────────────────

const SCHOOL_REPORTS = [
  { key: "school/academic",          icon: BookOpen,     label: "Academic Report",        desc: "Student marks per subject per term" },
  { key: "school/attendance",        icon: CheckSquare,  label: "Attendance Report",      desc: "Daily attendance with summary rates" },
  { key: "school/class-performance", icon: BarChart2,    label: "Class Performance",      desc: "All students × all subjects matrix" },
  { key: "school/subject-analytics", icon: TrendingUp,   label: "Subject Analytics",      desc: "Score distribution and pass rates" },
  { key: "school/parent-notes",      icon: FileText,     label: "Teacher Notes",          desc: "Notes written to parents per student" },
  { key: "school/term-summary",      icon: ClipboardList, label: "Term Summary",          desc: "End-of-term overview with promotions" },
];

const ACADEMY_REPORTS = [
  { key: "academy/enrollment",  icon: Users,      label: "Enrollment Report",     desc: "Who enrolled in which courses" },
  { key: "academy/progress",    icon: TrendingUp, label: "Student Progress",      desc: "Lesson completion rates per course" },
  { key: "academy/quiz",        icon: Star,       label: "Quiz Performance",      desc: "Quiz scores, pass rates, averages" },
  { key: "academy/revenue",     icon: DollarSign, label: "Revenue Report",        desc: "Course payment transactions" },
  { key: "academy/completion",  icon: BarChart2,  label: "Course Completion",     desc: "Full-completion rates per course" },
];

// ── Filter definitions per report key ────────────────────────────────────────

const FilterInput = ({ label, type = "text", value, onChange, options }) => (
  <div className="flex flex-col gap-1">
    <label className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</label>
    {options ? (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700"
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    ) : (
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 rounded-xl border border-slate-200 px-3 text-sm"
      />
    )}
  </div>
);

// ── Result renderers ─────────────────────────────────────────────────────────

function renderSchoolAcademic(data) {
  if (!data?.students?.length) return <p className="text-sm text-slate-400">No data found for the selected filters.</p>;
  return (
    <div className="space-y-6">
      {data.students.map((stu) => (
        <div key={stu.studentId} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="font-bold text-slate-900">{stu.studentName}</p>
              <p className="text-xs text-slate-400">{stu.registrationNumber}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-slate-700">Average: <span className="text-indigo-700">{stu.overallAverage !== null ? `${stu.overallAverage}%` : "—"}</span></p>
              {stu.passedAll !== null && <PassBadge val={stu.passedAll} />}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead><tr className="border-b border-slate-100 text-slate-500">
                <th className="pb-1 pr-3 text-left font-bold uppercase">Subject</th>
                <th className="pb-1 pr-3 text-right font-bold uppercase">Total</th>
                <th className="pb-1 pr-3 text-center font-bold uppercase">Grade</th>
                <th className="pb-1 text-center font-bold uppercase">Pass</th>
              </tr></thead>
              <tbody>
                {stu.subjects.map((s) => (
                  <tr key={s.subjectId} className="border-b border-slate-50">
                    <td className="py-1.5 pr-3 font-medium text-slate-700">{s.subjectName}</td>
                    <td className="py-1.5 pr-3 text-right text-slate-600">{s.totalScore !== null ? `${s.totalScore}%` : "—"}</td>
                    <td className="py-1.5 pr-3 text-center font-bold text-indigo-700">{s.letterGrade ?? "—"}</td>
                    <td className="py-1.5 text-center"><PassBadge val={s.isPassed} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

function renderSchoolAttendance(data) {
  if (!data?.summary?.length) return <p className="text-sm text-slate-400">No attendance records found.</p>;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total Records", val: data.totalRecords },
          { label: "Students",      val: data.summary.length },
        ].map((c) => (
          <div key={c.label} className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
            <p className="text-2xl font-black text-slate-900">{c.val}</p>
            <p className="mt-0.5 text-xs text-slate-500">{c.label}</p>
          </div>
        ))}
      </div>
      <div className="overflow-x-auto rounded-2xl border border-slate-200">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">Student</th>
              <th className="px-4 py-3 text-center">Total Days</th>
              <th className="px-4 py-3 text-center">Present</th>
              <th className="px-4 py-3 text-center">Absent</th>
              <th className="px-4 py-3 text-center">Late</th>
              <th className="px-4 py-3 text-center">Excused</th>
              <th className="px-4 py-3 text-center">Present %</th>
            </tr>
          </thead>
          <tbody>
            {data.summary.map((s) => (
              <tr key={s.studentId} className="border-t border-slate-100">
                <td className="px-4 py-2 font-medium text-slate-800">{s.studentName}</td>
                <td className="px-4 py-2 text-center text-slate-600">{s.total}</td>
                <td className="px-4 py-2 text-center text-emerald-700 font-semibold">{s.present}</td>
                <td className="px-4 py-2 text-center text-rose-700 font-semibold">{s.absent}</td>
                <td className="px-4 py-2 text-center text-amber-700 font-semibold">{s.late}</td>
                <td className="px-4 py-2 text-center text-sky-700 font-semibold">{s.excused}</td>
                <td className="px-4 py-2 text-center">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${s.presentPct >= 80 ? "bg-emerald-100 text-emerald-700" : s.presentPct >= 60 ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"}`}>
                    {pct(s.presentPct)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function renderSchoolClassPerformance(data) {
  if (!data?.students?.length) return <p className="text-sm text-slate-400">No data found.</p>;
  return (
    <div className="space-y-4">
      {data.classAverage !== null && (
        <div className="flex items-center gap-3 rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
          <BarChart2 size={20} className="text-indigo-600" />
          <span className="text-sm font-bold text-indigo-900">Class Average: <span className="text-indigo-600">{data.classAverage}%</span></span>
          {data.topStudents?.length > 0 && (
            <span className="ml-4 text-sm text-indigo-700">Top: {data.topStudents.map((s) => s.name).join(", ")}</span>
          )}
        </div>
      )}
      <div className="overflow-x-auto rounded-2xl border border-slate-200">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">Rank</th>
              <th className="px-4 py-3 text-left">Student</th>
              {data.subjects?.map((s) => <th key={s.id} className="px-3 py-3 text-center">{s.name}</th>)}
              <th className="px-4 py-3 text-center">Average</th>
              <th className="px-4 py-3 text-center">Failed</th>
            </tr>
          </thead>
          <tbody>
            {[...data.students].sort((a, b) => (a.rank ?? 9999) - (b.rank ?? 9999)).map((stu) => (
              <tr key={stu.studentId} className={`border-t border-slate-100 ${stu.rank <= 3 ? "bg-amber-50/40" : ""}`}>
                <td className="px-4 py-2 text-center font-bold text-slate-500">{stu.rank ?? "—"}</td>
                <td className="px-4 py-2 font-medium text-slate-800">{stu.studentName}</td>
                {stu.subjects.map((s) => (
                  <td key={s.subjectId} className="px-3 py-2 text-center text-slate-600">
                    {s.score !== null ? (
                      <span className={s.isPassed === false ? "font-bold text-rose-600" : ""}>{s.score}%</span>
                    ) : "—"}
                  </td>
                ))}
                <td className="px-4 py-2 text-center font-bold text-indigo-700">{stu.average !== null ? `${stu.average}%` : "—"}</td>
                <td className="px-4 py-2 text-center">{stu.failedSubjects > 0 ? <span className="font-bold text-rose-600">{stu.failedSubjects}</span> : <span className="text-emerald-600">0</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function renderSchoolSubjectAnalytics(data) {
  if (!data) return null;
  const bucketColors = { "0-49": "bg-rose-500", "50-64": "bg-amber-400", "65-74": "bg-yellow-400", "75-84": "bg-teal-400", "85-100": "bg-emerald-500" };
  const maxBucket = data.distribution ? Math.max(...Object.values(data.distribution), 1) : 1;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Students",  val: data.totalStudents },
          { label: "Average",   val: data.average !== null ? `${data.average}%` : "—" },
          { label: "Pass Rate", val: pct(data.passRate) },
          { label: "Highest",   val: data.highest !== null ? `${data.highest}%` : "—" },
        ].map((c) => (
          <div key={c.label} className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
            <p className="text-2xl font-black text-slate-900">{c.val}</p>
            <p className="mt-0.5 text-xs text-slate-500">{c.label}</p>
          </div>
        ))}
      </div>

      {data.distribution && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="mb-3 text-sm font-bold text-slate-700">Score Distribution</p>
          <div className="space-y-2">
            {Object.entries(data.distribution).map(([range, count]) => (
              <div key={range} className="flex items-center gap-3">
                <span className="w-16 text-right text-xs font-semibold text-slate-500">{range}</span>
                <div className="flex-1 rounded-full bg-slate-100">
                  <div
                    className={`h-4 rounded-full ${bucketColors[range] || "bg-slate-400"} transition-all`}
                    style={{ width: `${Math.round((count / maxBucket) * 100)}%`, minWidth: count > 0 ? 8 : 0 }}
                  />
                </div>
                <span className="w-6 text-xs font-bold text-slate-700">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-slate-200">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">Student</th>
              <th className="px-4 py-3 text-center">Score</th>
              <th className="px-4 py-3 text-center">Grade</th>
              <th className="px-4 py-3 text-center">Result</th>
            </tr>
          </thead>
          <tbody>
            {data.students?.map((s) => (
              <tr key={s.studentId} className="border-t border-slate-100">
                <td className="px-4 py-2 font-medium text-slate-800">{s.studentName}</td>
                <td className="px-4 py-2 text-center text-slate-600">{s.score !== null ? `${s.score}%` : "—"}</td>
                <td className="px-4 py-2 text-center font-bold text-indigo-700">{s.grade ?? "—"}</td>
                <td className="px-4 py-2 text-center"><PassBadge val={s.isPassed} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function renderSchoolParentNotes(data) {
  if (!data?.notes?.length) return <p className="text-sm text-slate-400">No notes found.</p>;
  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center shadow-sm">
          <p className="text-xl font-black text-slate-900">{data.totalNotes}</p>
          <p className="text-xs text-slate-500">Total Notes</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-center shadow-sm">
          <p className="text-xl font-black text-amber-700">{data.unreadNotes}</p>
          <p className="text-xs text-amber-600">Unread</p>
        </div>
      </div>
      <div className="space-y-3">
        {data.notes.map((n) => (
          <div key={n.id} className={`rounded-2xl border p-4 ${!n.isRead ? "border-amber-200 bg-amber-50/30" : "border-slate-200 bg-white"}`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-slate-900">{n.studentName} <span className="text-xs text-slate-400">({n.registrationNumber})</span></p>
                <p className="text-xs text-slate-500">By {n.teacherName} · {dateStr(n.date)}</p>
              </div>
              {!n.isRead && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">Unread</span>}
            </div>
            {n.title && <p className="mt-2 text-sm font-semibold text-slate-700">{n.title}</p>}
            <p className="mt-1 text-sm text-slate-600">{n.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function renderSchoolTermSummary(data) {
  if (!data) return null;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total Students",     val: data.totalStudents,      cls: "" },
          { label: "Passed All",         val: data.passedAll,          cls: "text-emerald-700" },
          { label: "Failed ≥1 Subject",  val: data.failedAtLeastOne,   cls: "text-rose-700" },
          { label: "No Grades Yet",      val: data.noGradesYet,        cls: "text-slate-500" },
        ].map((c) => (
          <div key={c.label} className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
            <p className={`text-2xl font-black ${c.cls || "text-slate-900"}`}>{c.val}</p>
            <p className="mt-0.5 text-xs text-slate-500">{c.label}</p>
          </div>
        ))}
      </div>
      <div className="overflow-x-auto rounded-2xl border border-slate-200">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">Student</th>
              <th className="px-4 py-3 text-left">ID</th>
              <th className="px-4 py-3 text-center">Grade Level</th>
              <th className="px-4 py-3 text-center">Average</th>
              <th className="px-4 py-3 text-center">Failed Subjects</th>
              <th className="px-4 py-3 text-center">Promotion</th>
            </tr>
          </thead>
          <tbody>
            {data.students?.map((s) => (
              <tr key={s.studentId} className="border-t border-slate-100">
                <td className="px-4 py-2 font-medium text-slate-800">{s.studentName}</td>
                <td className="px-4 py-2 text-xs text-slate-500">{s.registrationNumber ?? "—"}</td>
                <td className="px-4 py-2 text-center text-slate-600">{s.gradeLevel ?? "—"}</td>
                <td className="px-4 py-2 text-center font-bold text-indigo-700">{s.average !== null ? `${s.average}%` : "—"}</td>
                <td className="px-4 py-2 text-center">{s.failedSubjects > 0 ? <span className="font-bold text-rose-600">{s.failedSubjects}</span> : <span className="text-emerald-600">0</span>}</td>
                <td className="px-4 py-2 text-center">{s.promotionDecision ? <StatusBadge val={s.promotionDecision} /> : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function renderAcademyEnrollment(data) {
  if (!data?.enrollments?.length) return <p className="text-sm text-slate-400">No enrollments found.</p>;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
          <p className="text-2xl font-black text-slate-900">{data.totalEnrollments}</p>
          <p className="text-xs text-slate-500">Total Enrollments</p>
        </div>
        {data.byCourse?.slice(0, 1).map((c) => (
          <div key={c.courseId} className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4 text-center shadow-sm">
            <p className="text-2xl font-black text-indigo-700">{c.count}</p>
            <p className="text-xs text-indigo-600 truncate">{c.courseName}</p>
          </div>
        ))}
      </div>
      <div className="overflow-x-auto rounded-2xl border border-slate-200">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">Student</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Course</th>
              <th className="px-4 py-3 text-center">Enrolled</th>
            </tr>
          </thead>
          <tbody>
            {data.enrollments.map((e, i) => (
              <tr key={i} className="border-t border-slate-100">
                <td className="px-4 py-2 font-medium text-slate-800">{e.studentName}</td>
                <td className="px-4 py-2 text-slate-500">{e.email ?? "—"}</td>
                <td className="px-4 py-2 text-slate-600">{e.courseName}</td>
                <td className="px-4 py-2 text-center text-slate-500">{dateStr(e.enrolledAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function renderAcademyProgress(data) {
  if (!data?.students?.length) return <p className="text-sm text-slate-400">No students found for this course.</p>;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Students",  val: data.totalStudents },
          { label: "Lessons",   val: data.totalLessons },
          { label: "Avg Completion", val: pct(data.averageCompletion) },
        ].map((c) => (
          <div key={c.label} className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
            <p className="text-2xl font-black text-slate-900">{c.val}</p>
            <p className="text-xs text-slate-500">{c.label}</p>
          </div>
        ))}
      </div>
      <div className="overflow-x-auto rounded-2xl border border-slate-200">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">Student</th>
              <th className="px-4 py-3 text-center">Completed</th>
              <th className="px-4 py-3 text-center">Completion %</th>
              <th className="px-4 py-3 text-center">Last Active</th>
            </tr>
          </thead>
          <tbody>
            {data.students.map((s) => (
              <tr key={s.studentId} className="border-t border-slate-100">
                <td className="px-4 py-2 font-medium text-slate-800">{s.studentName}</td>
                <td className="px-4 py-2 text-center text-slate-600">{s.completedLessons}/{s.totalLessons}</td>
                <td className="px-4 py-2 text-center">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 rounded-full bg-slate-100 h-2">
                      <div className="h-2 rounded-full bg-indigo-500" style={{ width: `${s.completionPct}%` }} />
                    </div>
                    <span className="text-xs font-bold text-indigo-700">{pct(s.completionPct)}</span>
                  </div>
                </td>
                <td className="px-4 py-2 text-center text-slate-500">{dateStr(s.lastActiveAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function renderAcademyQuiz(data) {
  if (!data?.quizzes?.length) return <p className="text-sm text-slate-400">No quizzes found for this course.</p>;
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            <th className="px-4 py-3 text-left">Subject</th>
            <th className="px-4 py-3 text-left">Lesson</th>
            <th className="px-4 py-3 text-left">Quiz</th>
            <th className="px-4 py-3 text-center">Attempts</th>
            <th className="px-4 py-3 text-center">Avg Score</th>
            <th className="px-4 py-3 text-center">Pass Rate</th>
            <th className="px-4 py-3 text-center">Difficulty</th>
          </tr>
        </thead>
        <tbody>
          {data.quizzes.map((q) => (
            <tr key={q.quizId} className="border-t border-slate-100">
              <td className="px-4 py-2 text-slate-600">{q.subjectName}</td>
              <td className="px-4 py-2 text-slate-600">{q.lessonName}</td>
              <td className="px-4 py-2 font-medium text-slate-800">{q.quizTitle}</td>
              <td className="px-4 py-2 text-center text-slate-600">{q.totalAttempts}</td>
              <td className="px-4 py-2 text-center font-bold text-indigo-700">{q.averageScore !== null ? `${q.averageScore}%` : "—"}</td>
              <td className="px-4 py-2 text-center">
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${q.passRate >= 70 ? "bg-emerald-100 text-emerald-700" : q.passRate >= 50 ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"}`}>
                  {pct(q.passRate)}
                </span>
              </td>
              <td className="px-4 py-2 text-center text-slate-500">{q.difficulty}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function renderAcademyRevenue(data) {
  if (!data) return null;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total Revenue",     val: money(data.totalRevenue), cls: "text-emerald-700" },
          { label: "Transactions",      val: data.totalTransactions },
          { label: "Completed",         val: data.byStatus?.COMPLETED ?? 0, cls: "text-emerald-700" },
          { label: "Pending",           val: data.byStatus?.PENDING ?? 0,  cls: "text-amber-700" },
        ].map((c) => (
          <div key={c.label} className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
            <p className={`text-2xl font-black ${c.cls || "text-slate-900"}`}>{c.val}</p>
            <p className="mt-0.5 text-xs text-slate-500">{c.label}</p>
          </div>
        ))}
      </div>
      <div className="overflow-x-auto rounded-2xl border border-slate-200">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">Student</th>
              <th className="px-4 py-3 text-left">Course</th>
              <th className="px-4 py-3 text-center">Amount</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-center">Paid At</th>
            </tr>
          </thead>
          <tbody>
            {data.payments?.map((p) => (
              <tr key={p.paymentId} className="border-t border-slate-100">
                <td className="px-4 py-2 font-medium text-slate-800">{p.studentName}</td>
                <td className="px-4 py-2 text-slate-600">{p.courseName}</td>
                <td className="px-4 py-2 text-center font-bold text-slate-700">{money(p.amount)}</td>
                <td className="px-4 py-2 text-center"><StatusBadge val={p.status} /></td>
                <td className="px-4 py-2 text-center text-slate-500">{dateStr(p.paidAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function renderAcademyCompletion(data) {
  if (!data?.courses?.length) return <p className="text-sm text-slate-400">No course data found.</p>;
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            <th className="px-4 py-3 text-left">Course</th>
            <th className="px-4 py-3 text-center">Enrolled</th>
            <th className="px-4 py-3 text-center">Lessons</th>
            <th className="px-4 py-3 text-center">Fully Completed</th>
            <th className="px-4 py-3 text-center">Avg Completion</th>
          </tr>
        </thead>
        <tbody>
          {data.courses.map((c) => (
            <tr key={c.courseId} className="border-t border-slate-100">
              <td className="px-4 py-2 font-medium text-slate-800">{c.courseName}</td>
              <td className="px-4 py-2 text-center text-slate-600">{c.totalEnrolled}</td>
              <td className="px-4 py-2 text-center text-slate-600">{c.totalLessons}</td>
              <td className="px-4 py-2 text-center font-bold text-emerald-700">{c.fullyCompleted}</td>
              <td className="px-4 py-2 text-center">
                <div className="flex items-center gap-2">
                  <div className="flex-1 rounded-full bg-slate-100 h-2">
                    <div className="h-2 rounded-full bg-teal-500" style={{ width: `${c.avgCompletionPct}%` }} />
                  </div>
                  <span className="text-xs font-bold text-teal-700">{pct(c.avgCompletionPct)}</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const RENDERERS = {
  "school/academic":          renderSchoolAcademic,
  "school/attendance":        renderSchoolAttendance,
  "school/class-performance": renderSchoolClassPerformance,
  "school/subject-analytics": renderSchoolSubjectAnalytics,
  "school/parent-notes":      renderSchoolParentNotes,
  "school/term-summary":      renderSchoolTermSummary,
  "academy/enrollment":       renderAcademyEnrollment,
  "academy/progress":         renderAcademyProgress,
  "academy/quiz":             renderAcademyQuiz,
  "academy/revenue":          renderAcademyRevenue,
  "academy/completion":       renderAcademyCompletion,
};

// ── CSV flatteners ────────────────────────────────────────────────────────────

const flattenForCSV = (reportKey, data) => {
  if (!data) return [];
  switch (reportKey) {
    case "school/academic":          return data.students?.flatMap((s) => s.subjects.map((sub) => ({ student: s.studentName, id: s.registrationNumber, subject: sub.subjectName, total: sub.totalScore, grade: sub.letterGrade, passed: sub.isPassed }))) ?? [];
    case "school/attendance":        return data.summary ?? [];
    case "school/class-performance": return data.students?.map((s) => ({ rank: s.rank, student: s.studentName, average: s.average, failedSubjects: s.failedSubjects })) ?? [];
    case "school/subject-analytics": return data.students ?? [];
    case "school/parent-notes":      return data.notes ?? [];
    case "school/term-summary":      return data.students ?? [];
    case "academy/enrollment":       return data.enrollments ?? [];
    case "academy/progress":         return data.students?.map((s) => ({ student: s.studentName, email: s.email, completed: s.completedLessons, total: s.totalLessons, pct: s.completionPct })) ?? [];
    case "academy/quiz":             return data.quizzes ?? [];
    case "academy/revenue":          return data.payments ?? [];
    case "academy/completion":       return data.courses ?? [];
    default: return [];
  }
};

// ── Export dropdown menu ─────────────────────────────────────────────────────

function ExportMenu({ activeReport, data, reportLabel }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on outside click
  const handleBlur = (e) => {
    if (!ref.current?.contains(e.relatedTarget)) setOpen(false);
  };

  const slug = activeReport.replace("/", "_");
  const rows = flattenForCSV(activeReport, data);

  const options = [
    {
      label: "Export Excel (.xlsx)",
      icon: FileSpreadsheet,
      color: "text-emerald-700",
      action: () => { exportXLSX(`${slug}_report.xlsx`, rows); setOpen(false); },
    },
    {
      label: "Export CSV",
      icon: Download,
      color: "text-sky-700",
      action: () => { exportCSV(`${slug}_report.csv`, rows); setOpen(false); },
    },
    {
      label: "Export PDF",
      icon: FilePdf,
      color: "text-rose-600",
      action: () => { exportPDF(activeReport, data, `${slug}_report.pdf`, reportLabel); setOpen(false); },
    },
  ];

  return (
    <div className="relative" ref={ref} onBlur={handleBlur}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
      >
        <Download size={13} />
        Export
        <ChevronDown size={12} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-1 w-52 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          {options.map(({ label, icon: Icon, color, action }) => (
            <button
              key={label}
              type="button"
              onClick={action}
              className={`flex w-full items-center gap-2.5 px-4 py-3 text-left text-sm font-semibold transition hover:bg-slate-50 ${color}`}
            >
              <Icon size={15} className="shrink-0" />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Filter panels ─────────────────────────────────────────────────────────────

function FiltersPanel({ reportKey, filters, setFilters, courses, classes, subjects, academicYears, terms }) {
  const set = (key) => (val) => setFilters((f) => ({ ...f, [key]: val }));

  const classOptions  = [{ value: "", label: "All Classes" }, ...(classes ?? []).map((c) => ({ value: String(c.id), label: c.Name || c.name }))];
  const courseOptions = [{ value: "", label: "All Courses" }, ...(courses ?? []).map((c) => ({ value: String(c.id), label: c.Name || c.name }))];
  const yearOptions   = [{ value: "", label: "Select Year" }, ...(academicYears ?? []).map((y) => ({ value: String(y.id), label: y.name }))];
  const termOptions   = [{ value: "", label: "Select Term" }, ...(terms ?? []).map((t) => ({ value: String(t.id), label: t.name }))];
  const subjOptions   = [{ value: "", label: "All Subjects" }, ...(subjects ?? []).map((s) => ({ value: String(s.id), label: s.name }))];

  switch (reportKey) {
    case "school/academic":
    case "school/class-performance":
      return (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <FilterInput label="Class" value={filters.classId ?? ""} onChange={set("classId")} options={classOptions} />
          <FilterInput label="Term"  value={filters.termId  ?? ""} onChange={set("termId")}  options={termOptions}  />
        </div>
      );
    case "school/attendance":
      return (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <FilterInput label="Class"     value={filters.classId  ?? ""} onChange={set("classId")}  options={classOptions} />
          <FilterInput label="From"      value={filters.dateFrom ?? ""} onChange={set("dateFrom")} type="date" />
          <FilterInput label="To"        value={filters.dateTo   ?? ""} onChange={set("dateTo")}   type="date" />
          <FilterInput label="Status"    value={filters.status   ?? ""} onChange={set("status")}
            options={[{ value: "", label: "All" }, { value: "PRESENT", label: "Present" }, { value: "ABSENT", label: "Absent" }, { value: "LATE", label: "Late" }, { value: "EXCUSED", label: "Excused" }]} />
        </div>
      );
    case "school/subject-analytics":
      return (
        <div className="grid grid-cols-2 gap-3">
          <FilterInput label="Subject" value={filters.subjectId ?? ""} onChange={set("subjectId")} options={subjOptions} />
          <FilterInput label="Term"    value={filters.termId   ?? ""} onChange={set("termId")}    options={termOptions} />
        </div>
      );
    case "school/parent-notes":
      return (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <FilterInput label="Class"  value={filters.classId  ?? ""} onChange={set("classId")}  options={classOptions} />
          <FilterInput label="From"   value={filters.dateFrom ?? ""} onChange={set("dateFrom")} type="date" />
          <FilterInput label="To"     value={filters.dateTo   ?? ""} onChange={set("dateTo")}   type="date" />
        </div>
      );
    case "school/term-summary":
      return (
        <div className="grid grid-cols-2 gap-3">
          <FilterInput label="Academic Year" value={filters.yearId ?? ""} onChange={set("yearId")} options={yearOptions} />
          <FilterInput label="Term"          value={filters.termId ?? ""} onChange={set("termId")} options={termOptions} />
        </div>
      );
    case "academy/enrollment":
      return (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <FilterInput label="Course" value={filters.courseId ?? ""} onChange={set("courseId")} options={courseOptions} />
          <FilterInput label="From"   value={filters.dateFrom ?? ""} onChange={set("dateFrom")} type="date" />
          <FilterInput label="To"     value={filters.dateTo   ?? ""} onChange={set("dateTo")}   type="date" />
        </div>
      );
    case "academy/progress":
    case "academy/quiz":
      return (
        <div className="grid grid-cols-2 gap-3">
          <FilterInput label="Course" value={filters.courseId ?? ""} onChange={set("courseId")} options={courseOptions} />
        </div>
      );
    case "academy/revenue":
      return (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <FilterInput label="Course" value={filters.courseId ?? ""} onChange={set("courseId")} options={courseOptions} />
          <FilterInput label="From"   value={filters.dateFrom ?? ""} onChange={set("dateFrom")} type="date" />
          <FilterInput label="To"     value={filters.dateTo   ?? ""} onChange={set("dateTo")}   type="date" />
        </div>
      );
    default:
      return null;
  }
}

// ── Main component ────────────────────────────────────────────────────────────

export default function OrgReportsPanel({
  isArabic,
  isSchool,
  courses = [],
  classes = [],
  subjects = [],
  academicYears = [],
  terms = [],
}) {
  const reports = isSchool ? SCHOOL_REPORTS : ACADEMY_REPORTS;
  const [activeReport, setActiveReport] = useState(reports[0].key);
  const [filters, setFilters] = useState({});
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  // Reset data when switching reports
  const switchReport = (key) => {
    setActiveReport(key);
    setFilters({});
    setData(null);
    setError(null);
  };

  const runReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchReport(activeReport, filters);
      setData(result);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Failed to load report");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [activeReport, filters]);

  const activeReportMeta = reports.find((r) => r.key === activeReport);
  const renderer = RENDERERS[activeReport];

  return (
    <div className="flex min-h-[600px] gap-0">
      {/* ── Left: report list ── */}
      <aside className="w-52 shrink-0 border-r border-slate-200 pr-5 mr-5">
        <p className="mb-3 text-xs font-black uppercase tracking-widest text-slate-400">
          {isArabic ? "أنواع التقارير" : "Report Types"}
        </p>
        <nav className="space-y-1">
          {reports.map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => switchReport(key)}
              className={[
                "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-all",
                activeReport === key
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
              ].join(" ")}
            >
              <Icon size={15} className="shrink-0" />
              <span className="truncate">{label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* ── Right: filters + results ── */}
      <div className="flex-1 min-w-0 overflow-hidden">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-slate-900">{activeReportMeta?.label}</h3>
            <p className="text-sm text-slate-500">{activeReportMeta?.desc}</p>
          </div>
          {data && <ExportMenu activeReport={activeReport} data={data} reportLabel={activeReportMeta?.label} />}
        </div>

        {/* Filters */}
        <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <FiltersPanel
            reportKey={activeReport}
            filters={filters}
            setFilters={setFilters}
            courses={courses}
            classes={classes}
            subjects={subjects}
            academicYears={academicYears}
            terms={terms}
          />
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={runReport}
              disabled={loading}
              className="rounded-xl bg-slate-900 px-5 py-2 text-sm font-bold text-white hover:bg-slate-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "Loading…" : (isArabic ? "تشغيل التقرير" : "Run Report")}
            </button>
            {data && (
              <button
                type="button"
                onClick={() => { setData(null); setError(null); }}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        )}

        {/* Results */}
        {!loading && data && renderer && (
          <div className="pb-8">
            {renderer(data)}
          </div>
        )}

        {/* Empty state */}
        {!loading && !data && !error && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 py-16 text-center">
            <BarChart2 size={36} className="mb-3 text-slate-300" />
            <p className="text-sm font-semibold text-slate-500">
              {isArabic ? "اختر الفلاتر ثم اضغط تشغيل التقرير" : "Select your filters and click Run Report"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
