import * as orgService from '../services/organizationService.js';
import catchAsync from '../utils/catchAsync.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { createOrgSchema, updateOrgSchema } from '../validations/organizationValidation.js';
import AppError from '../utils/appError.js';

const getAllOrganizations = catchAsync(async (req, res) => {
  const data = await orgService.getAllOrganizations();
  sendSuccess(res, data);
});

const getOrganizationById = catchAsync(async (req, res) => {
  const data = await orgService.getOrganizationById(req.params.id);
  sendSuccess(res, data);
});

const createOrganization = catchAsync(async (req, res, next) => {
  const { error } = createOrgSchema.validate(req.body);
  if (error) return next(new AppError(error.details[0].message, 400));

  const data = await orgService.createOrganization(req.body);
  sendSuccess(res, data, 201);
});

const updateOrganization = catchAsync(async (req, res, next) => {
  const { error } = updateOrgSchema.validate(req.body);
  if (error) return next(new AppError(error.details[0].message, 400));

  const data = await orgService.updateOrganization(req.params.id, req.body);
  sendSuccess(res, data);
});

const deleteOrganization = catchAsync(async (req, res) => {
  await orgService.deleteOrganization(req.params.id);
  sendSuccess(res, { message: 'Organization deleted successfully' });
});

export { getAllOrganizations, getOrganizationById, createOrganization, updateOrganization, deleteOrganization };
