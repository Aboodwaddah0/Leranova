import AppError from '../utils/appError.js';
import {
  createFeatureSchema,
  updateFeatureSchema,
  assignPlanFeatureSchema,
  updatePlanFeatureSchema,
} from '../validations/featureValidation.js';
import {
  listFeatures,
  getFeatureById,
  createFeature,
  updateFeature,
  deleteFeature,
  listPlanFeatures,
  assignFeatureToPlan,
  updatePlanFeature,
  removePlanFeature,
} from '../services/adminFeatureService.js';

const parsePositiveInt = (value, fieldName) => {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new AppError(`Invalid ${fieldName}`, 400);
  }

  return parsed;
};

export const listFeaturesController = async (_req, res, next) => {
  try {
    const features = await listFeatures();

    return res.status(200).json({
      message: 'Features fetched successfully',
      data: features,
    });
  } catch (error) {
    return next(error);
  }
};

export const getFeatureController = async (req, res, next) => {
  try {
    const featureId = parsePositiveInt(req.params.id, 'feature id');
    const feature = await getFeatureById(featureId);

    return res.status(200).json({
      message: 'Feature fetched successfully',
      data: feature,
    });
  } catch (error) {
    return next(error);
  }
};

export const createFeatureController = async (req, res, next) => {
  try {
    const { error, value } = createFeatureSchema.validate(req.body);

    if (error) {
      return next(new AppError(error.details[0].message, 400));
    }

    const feature = await createFeature(value);

    return res.status(201).json({
      message: 'Feature created successfully',
      data: feature,
    });
  } catch (error) {
    return next(error);
  }
};

export const updateFeatureController = async (req, res, next) => {
  try {
    const featureId = parsePositiveInt(req.params.id, 'feature id');
    const { error, value } = updateFeatureSchema.validate(req.body);

    if (error) {
      return next(new AppError(error.details[0].message, 400));
    }

    const feature = await updateFeature(featureId, value);

    return res.status(200).json({
      message: 'Feature updated successfully',
      data: feature,
    });
  } catch (error) {
    return next(error);
  }
};

export const deleteFeatureController = async (req, res, next) => {
  try {
    const featureId = parsePositiveInt(req.params.id, 'feature id');
    const result = await deleteFeature(featureId);

    return res.status(200).json({
      message: 'Feature deleted successfully',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
};

export const listPlanFeaturesController = async (req, res, next) => {
  try {
    const planId = parsePositiveInt(req.params.planId, 'plan id');
    const result = await listPlanFeatures(planId);

    return res.status(200).json({
      message: 'Plan features fetched successfully',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
};

export const assignPlanFeatureController = async (req, res, next) => {
  try {
    const planId = parsePositiveInt(req.params.planId, 'plan id');
    const { error, value } = assignPlanFeatureSchema.validate(req.body);

    if (error) {
      return next(new AppError(error.details[0].message, 400));
    }

    const result = await assignFeatureToPlan(planId, value);

    return res.status(201).json({
      message: 'Feature assigned to plan successfully',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
};

export const updatePlanFeatureController = async (req, res, next) => {
  try {
    const planId = parsePositiveInt(req.params.planId, 'plan id');
    const featureId = parsePositiveInt(req.params.featureId, 'feature id');
    const { error, value } = updatePlanFeatureSchema.validate(req.body);

    if (error) {
      return next(new AppError(error.details[0].message, 400));
    }

    const result = await updatePlanFeature(planId, featureId, value);

    return res.status(200).json({
      message: 'Plan feature updated successfully',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
};

export const removePlanFeatureController = async (req, res, next) => {
  try {
    const planId = parsePositiveInt(req.params.planId, 'plan id');
    const featureId = parsePositiveInt(req.params.featureId, 'feature id');
    const result = await removePlanFeature(planId, featureId);

    return res.status(200).json({
      message: 'Feature removed from plan successfully',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
};
