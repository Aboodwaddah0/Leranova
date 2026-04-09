import {
  getPlans,
  getPlanById,
  createPlan,
  updatePlan,
  deletePlan,
} from '../services/planService.js';
import { createPlanSchema, updatePlanSchema } from '../validations/planValidation.js';
import AppError from '../utils/appError.js';

export const listPlansController = async (_req, res, next) => {
  try {
    const plans = await getPlans();

    return res.status(200).json({
      message: 'Plans fetched successfully',
      data: plans,
    });
  } catch (error) {
    return next(error);
  }
};

export const getPlanController = async (req, res, next) => {
  try {
    const planId = Number(req.params.id);

    if (Number.isNaN(planId)) {
      return next(new AppError('Invalid plan id', 400));
    }

    const plan = await getPlanById(planId);

    return res.status(200).json({
      message: 'Plan fetched successfully',
      data: plan,
    });
  } catch (error) {
    return next(error);
  }
};

export const createPlanController = async (req, res, next) => {
  try {
    const { error, value } = createPlanSchema.validate(req.body);

    if (error) {
      return next(new AppError(error.details[0].message, 400));
    }

    const plan = await createPlan(value);

    return res.status(201).json({
      message: 'Plan created successfully',
      data: plan,
    });
  } catch (error) {
    return next(error);
  }
};

export const updatePlanController = async (req, res, next) => {
  try {
    const planId = Number(req.params.id);

    if (Number.isNaN(planId)) {
      return next(new AppError('Invalid plan id', 400));
    }

    const { error, value } = updatePlanSchema.validate(req.body);

    if (error) {
      return next(new AppError(error.details[0].message, 400));
    }

    const plan = await updatePlan(planId, value);

    return res.status(200).json({
      message: 'Plan updated successfully',
      data: plan,
    });
  } catch (error) {
    return next(error);
  }
};

export const deletePlanController = async (req, res, next) => {
  try {
    const planId = Number(req.params.id);

    if (Number.isNaN(planId)) {
      return next(new AppError('Invalid plan id', 400));
    }

    const result = await deletePlan(planId);

    return res.status(200).json({
      message: 'Plan deleted successfully',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
};
