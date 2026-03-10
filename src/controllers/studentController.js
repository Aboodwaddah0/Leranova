import * as studentService from '../services/studentService.js';
import catchAsync from '../utils/catchAsync.js';
import { sendSuccess } from '../utils/apiResponse.js';

const getAllStudents = catchAsync(async (req, res) => {
  const data = await studentService.getAllStudents();
  sendSuccess(res, data);
});

const getStudentById = catchAsync(async (req, res) => {
  const data = await studentService.getStudentById(req.params.id);
  sendSuccess(res, data);
});

export { getAllStudents, getStudentById };
