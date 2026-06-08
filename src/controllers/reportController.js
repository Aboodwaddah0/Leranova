/**
 * reportController.js
 * HTTP handlers for all org reports — School and Academy.
 * All routes require isOrganization middleware.
 */

import {
  getSchoolAcademicReport,
  getSchoolAttendanceReport,
  getSchoolClassPerformanceReport,
  getSchoolSubjectAnalyticsReport,
  getSchoolParentNotesReport,
  getSchoolTermSummaryReport,
  getAcademyEnrollmentReport,
  getAcademyProgressReport,
  getAcademyQuizReport,
  getAcademyRevenueReport,
  getAcademyCourseCompletionReport,
} from '../services/reportService.js';

/** Map: route segment → { service fn, orgType restriction } */
const REPORT_MAP = {
  // ── School ──
  'school/academic':          { fn: getSchoolAcademicReport,          orgType: 'SCHOOL'  },
  'school/attendance':        { fn: getSchoolAttendanceReport,        orgType: 'SCHOOL'  },
  'school/class-performance': { fn: getSchoolClassPerformanceReport,  orgType: 'SCHOOL'  },
  'school/subject-analytics': { fn: getSchoolSubjectAnalyticsReport,  orgType: 'SCHOOL'  },
  'school/parent-notes':      { fn: getSchoolParentNotesReport,       orgType: 'SCHOOL'  },
  'school/term-summary':      { fn: getSchoolTermSummaryReport,       orgType: 'SCHOOL'  },
  // ── Academy ──
  'academy/enrollment':       { fn: getAcademyEnrollmentReport,       orgType: 'ACADEMY' },
  'academy/progress':         { fn: getAcademyProgressReport,         orgType: 'ACADEMY' },
  'academy/quiz':             { fn: getAcademyQuizReport,             orgType: 'ACADEMY' },
  'academy/revenue':          { fn: getAcademyRevenueReport,          orgType: 'ACADEMY' },
  'academy/completion':       { fn: getAcademyCourseCompletionReport, orgType: 'ACADEMY' },
};

const handle = (reportKey) => async (req, res, next) => {
  try {
    const orgId   = req.user.id;
    const orgRole = String(req.user.role || '').toUpperCase();
    const entry   = REPORT_MAP[reportKey];

    if (!entry) {
      return res.status(404).json({ success: false, status: 404, data: null, error: 'Unknown report type', timestamp: new Date().toISOString() });
    }

    if (entry.orgType && orgRole !== entry.orgType) {
      return res.status(403).json({ success: false, status: 403, data: null, error: `This report is only available for ${entry.orgType} organizations`, timestamp: new Date().toISOString() });
    }

    const data = await entry.fn(orgId, req.query);

    return res.status(200).json({
      success: true,
      status: 200,
      data,
      error: null,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
};

// ── School ──────────────────────────────────────────────────────────────────
export const schoolAcademicReportController         = handle('school/academic');
export const schoolAttendanceReportController       = handle('school/attendance');
export const schoolClassPerformanceReportController = handle('school/class-performance');
export const schoolSubjectAnalyticsReportController = handle('school/subject-analytics');
export const schoolParentNotesReportController      = handle('school/parent-notes');
export const schoolTermSummaryReportController      = handle('school/term-summary');

// ── Academy ─────────────────────────────────────────────────────────────────
export const academyEnrollmentReportController  = handle('academy/enrollment');
export const academyProgressReportController    = handle('academy/progress');
export const academyQuizReportController        = handle('academy/quiz');
export const academyRevenueReportController     = handle('academy/revenue');
export const academyCompletionReportController  = handle('academy/completion');
