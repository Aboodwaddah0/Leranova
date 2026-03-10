import * as academyUserService from '../services/academyUserService.js';
import catchAsync from '../utils/catchAsync.js';
import { sendSuccess } from '../utils/apiResponse.js';

const getAcademyUsersByOrg = catchAsync(async (req, res) => {
  const data = await academyUserService.getAcademyUsersByOrg(req.params.orgId);
  sendSuccess(res, data);
});

const getAcademyUserById = catchAsync(async (req, res) => {
  const data = await academyUserService.getAcademyUserById(req.params.id);
  sendSuccess(res, data);
});

export { getAcademyUsersByOrg, getAcademyUserById };
