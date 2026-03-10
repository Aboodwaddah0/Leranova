import * as assetService from '../services/lessonAssetsService.js';
import catchAsync from '../utils/catchAsync.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { createAssetSchema, updateAssetSchema } from '../validations/lessonAssetsValidation.js';
import AppError from '../utils/appError.js';

const getAssetsByLesson = catchAsync(async (req, res) => {
  const data = await assetService.getAssetsByLesson(req.params.lessonId);
  sendSuccess(res, data);
});

const getAssetById = catchAsync(async (req, res) => {
  const data = await assetService.getAssetById(req.params.id);
  sendSuccess(res, data);
});

const createAsset = catchAsync(async (req, res, next) => {
  const { error } = createAssetSchema.validate(req.body);
  if (error) return next(new AppError(error.details[0].message, 400));
  const data = await assetService.createAsset(req.body);
  sendSuccess(res, data, 201);
});

const updateAsset = catchAsync(async (req, res, next) => {
  const { error } = updateAssetSchema.validate(req.body);
  if (error) return next(new AppError(error.details[0].message, 400));
  const data = await assetService.updateAsset(req.params.id, req.body);
  sendSuccess(res, data);
});

const deleteAsset = catchAsync(async (req, res) => {
  await assetService.deleteAsset(req.params.id);
  sendSuccess(res, { message: 'Asset deleted successfully' });
});

export { getAssetsByLesson, getAssetById, createAsset, updateAsset, deleteAsset };
