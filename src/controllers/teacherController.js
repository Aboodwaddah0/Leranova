import * as teacherService from '../services/teacherService.js';
import catchAsync from '../utils/catchAsync.js';
import { sendSuccess } from '../utils/apiResponse.js';

const getAllTeachers = catchAsync(async (req, res) => {
  const data = await teacherService.getAllTeachers();
  sendSuccess(res, data);
});

const getTeacherById = catchAsync(async (req, res) => {
  const data = await teacherService.getTeacherById(req.params.id);
  sendSuccess(res, data);
});

export { getAllTeachers, getTeacherById };
