import AppError from '../utils/appError.js';
import {
  getSchoolSettingsByOrg,
  toSchoolSettingsDto,
  updateSchoolSettingsByOrg,
} from '../services/schoolSettingsService.js';
import { promoteStudentById, runAnnualPromotionForOrg, runDuePromotions } from '../services/studentPromotionService.js';
import { promoteStudentSchema, runPromotionSchema, updateSchoolSettingsSchema } from '../validations/schoolSettingsValidation.js';

const ensureSchoolOrg = (req) => {
  const role = String(req.user?.role || '').trim().toUpperCase();
  if (role !== 'SCHOOL') {
    throw new AppError('This endpoint is only available for SCHOOL organizations', 403);
  }
};

export const getSchoolSettingsController = async (req, res, next) => {
  try {
    ensureSchoolOrg(req);

    const settings = await getSchoolSettingsByOrg(req.user.id);

    return res.status(200).json({
      message: 'School settings fetched successfully',
      data: toSchoolSettingsDto(settings),
    });
  } catch (error) {
    return next(error);
  }
};

export const updateSchoolSettingsController = async (req, res, next) => {
  try {
    ensureSchoolOrg(req);

    const { error, value } = updateSchoolSettingsSchema.validate(req.body);
    if (error) {
      throw new AppError(error.details[0].message, 400);
    }

    const updated = await updateSchoolSettingsByOrg(req.user.id, value);

    return res.status(200).json({
      message: 'School settings updated successfully',
      data: toSchoolSettingsDto(updated),
    });
  } catch (error) {
    return next(error);
  }
};

export const runAnnualPromotionController = async (req, res, next) => {
  try {
    ensureSchoolOrg(req);

    const { error, value } = runPromotionSchema.validate(req.body || {});
    if (error) {
      throw new AppError(error.details[0].message, 400);
    }

    const result = await runAnnualPromotionForOrg(req.user.id, {
      schoolYear: value.schoolYear,
      force: value.force,
    });

    return res.status(200).json({
      message: result.alreadyRan
        ? 'Promotion already executed for this school year'
        : 'Annual promotion executed successfully',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
};

export const promoteStudentByIdController = async (req, res, next) => {
  try {
    ensureSchoolOrg(req);

    const { error, value } = promoteStudentSchema.validate(req.body || {});
    if (error) {
      throw new AppError(error.details[0].message, 400);
    }

    const result = await promoteStudentById(req.user.id, value.studentId, {
      schoolYear: value.schoolYear,
    });

    return res.status(200).json({
      message: 'Student promotion executed successfully',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
};

export const runDuePromotionsController = async (_req, res, next) => {
  try {
    const results = await runDuePromotions();

    return res.status(200).json({
      message: 'Due promotions executed successfully',
      data: {
        organizationsProcessed: results.length,
        results,
      },
    });
  } catch (error) {
    return next(error);
  }
};
