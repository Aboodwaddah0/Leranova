import * as enrollmentService from '../services/enrollmentService.js';
import catchAsync from '../utils/catchAsync.js';
import { sendSuccess } from '../utils/apiResponse.js';

const getEnrollmentsByOrg = catchAsync(async (req, res) => {
  const data = await enrollmentService.getEnrollmentsByOrg(req.params.orgId);
  sendSuccess(res, data);
});

const createEnrollment = catchAsync(async (req, res) => {
  const data = await enrollmentService.createEnrollment(req.body);
  sendSuccess(res, data, 201);
});

const deleteEnrollment = catchAsync(async (req, res) => {
  await enrollmentService.deleteEnrollment(req.body);
  sendSuccess(res, { message: 'Enrollment removed' });
});

export { getEnrollmentsByOrg, createEnrollment, deleteEnrollment };
