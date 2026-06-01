import * as timetableService from '../services/timetableService.js';
import AppError from '../utils/appError.js';

const ts = () => new Date().toISOString();
const ok = (res, data, status = 200) =>
  res.status(status).json({ success: true, status, data, error: null, timestamp: ts() });

export const listSlotsController = async (req, res, next) => {
  try {
    const orgId = req.user.id;
    const data = await timetableService.listSlots(orgId, req.query);
    return ok(res, data);
  } catch (err) { next(err); }
};

export const createSlotController = async (req, res, next) => {
  try {
    const orgId = req.user.id;
    const { trackId, courseId, dayOfWeek, startTime, endTime } = req.body;
    if (!trackId || !courseId || !dayOfWeek || !startTime || !endTime) {
      return next(new AppError('trackId, courseId, dayOfWeek, startTime and endTime are required', 400));
    }
    const data = await timetableService.createSlot(orgId, req.body);
    return ok(res, data, 201);
  } catch (err) { next(err); }
};

export const updateSlotController = async (req, res, next) => {
  try {
    const orgId = req.user.id;
    const slotId = Number(req.params.id);
    if (Number.isNaN(slotId)) return next(new AppError('Invalid slot id', 400));
    const data = await timetableService.updateSlot(orgId, slotId, req.body);
    return ok(res, data);
  } catch (err) { next(err); }
};

export const deleteSlotController = async (req, res, next) => {
  try {
    const orgId = req.user.id;
    const slotId = Number(req.params.id);
    if (Number.isNaN(slotId)) return next(new AppError('Invalid slot id', 400));
    await timetableService.deleteSlot(orgId, slotId);
    return res.status(204).send();
  } catch (err) { next(err); }
};

export const getMyTimetableController = async (req, res, next) => {
  try {
    const role = String(req.user?.role || '').trim().toUpperCase();
    let data;
    if (role === 'STUDENT') {
      data = await timetableService.getStudentTimetable(req.user.id);
    } else if (role === 'TEACHER') {
      data = await timetableService.getTeacherTimetable(req.user.id);
    } else if (role === 'PARENT') {
      data = await timetableService.getParentChildTimetable(req.user.id);
    } else if (role === 'SCHOOL' || role === 'ACADEMY') {
      data = await timetableService.listSlots(req.user.id, req.query);
    } else {
      return next(new AppError('Access denied', 403));
    }
    return ok(res, data);
  } catch (err) { next(err); }
};
