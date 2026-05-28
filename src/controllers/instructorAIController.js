import Joi from 'joi';
import AppError from '../utils/appError.js';
import { askInstructorAI } from '../services/instructorAIService.js';

const askSchema = Joi.object({
  question: Joi.string().trim().min(2).max(1000).required(),
  history: Joi.array().items(
    Joi.object({
      role:    Joi.string().valid('user', 'assistant').required(),
      content: Joi.string().trim().min(1).max(2000).required(),
    })
  ).max(12).optional(),
});

export const askInstructorAIController = async (req, res, next) => {
  try {
    const { error, value } = askSchema.validate(req.body, { abortEarly: true, stripUnknown: true });
    if (error) return next(new AppError(error.details[0].message, 400));

    const result = await askInstructorAI({
      tokenUser: req.user,
      question:  value.question,
      history:   value.history || [],
    });

    return res.status(200).json({
      success:   true,
      status:    200,
      data:      result,
      error:     null,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return next(err);
  }
};
