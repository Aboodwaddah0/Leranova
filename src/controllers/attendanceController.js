import * as attendanceService from '../services/attendanceService.js';
import AppError from '../utils/appError.js';

const ts = () => new Date().toISOString();

export const getClassStudentsController = async (req, res, next) => {
  try {
    const classId = Number(req.params.classId);
    if (Number.isNaN(classId)) return next(new AppError('Invalid class id', 400));
    const students = await attendanceService.getClassStudents(req.user, classId);
    return res.status(200).json({ success: true, status: 200, data: students, error: null, timestamp: ts() });
  } catch (err) { next(err); }
};

export const markAttendanceController = async (req, res, next) => {
  try {
    const classId = Number(req.params.classId);
    if (Number.isNaN(classId)) return next(new AppError('Invalid class id', 400));
    const { date, records } = req.body;
    if (!date) return next(new AppError('date is required', 400));
    if (!Array.isArray(records) || records.length === 0) {
      return next(new AppError('records array is required', 400));
    }
    const data = await attendanceService.markAttendance(req.user, classId, { date, records });
    return res.status(200).json({ success: true, status: 200, data, error: null, timestamp: ts() });
  } catch (err) { next(err); }
};

export const getClassAttendanceController = async (req, res, next) => {
  try {
    const classId = Number(req.params.classId);
    if (Number.isNaN(classId)) return next(new AppError('Invalid class id', 400));
    const data = await attendanceService.getClassAttendance(req.user, classId, req.query);
    return res.status(200).json({ success: true, status: 200, data, error: null, timestamp: ts() });
  } catch (err) { next(err); }
};

export const getStudentAttendanceController = async (req, res, next) => {
  try {
    const studentId = Number(req.params.studentId);
    if (Number.isNaN(studentId)) return next(new AppError('Invalid student id', 400));
    const data = await attendanceService.getStudentAttendance(req.user, studentId, req.query);
    return res.status(200).json({ success: true, status: 200, data, error: null, timestamp: ts() });
  } catch (err) { next(err); }
};
