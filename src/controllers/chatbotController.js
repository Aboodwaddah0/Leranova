import Joi from 'joi';
import AppError from '../utils/appError.js';
import { askChatbot } from '../services/chatbotService.js';
import { dispatch } from '../services/gamificationDispatcher.js';

const askSchema = Joi.object({
  question: Joi.string().trim().min(3).max(4000).required(),
  course_id: Joi.number().integer().positive().required(),
  subject_id: Joi.number().integer().positive().optional(),
  lesson_id: Joi.number().integer().positive().optional(),
  history: Joi.array().items(
    Joi.object({
      role: Joi.string().valid('user', 'assistant').required(),
      content: Joi.string().trim().min(1).max(4000).required(),
    })
  ).max(20).optional(),
});

export const askChatbotController = async (req, res, next) => {
  try {
    const { error, value } = askSchema.validate(req.body, {
      abortEarly: true,
      stripUnknown: true,
    });

    if (error) {
      return next(new AppError(error.details[0].message, 400));
    }

    const response = await askChatbot({
      tokenUser: req.user,
      question: value.question,
      courseId: value.course_id,
      subjectId: value.subject_id,
      lessonId: value.lesson_id,
      history: value.history || [],
    });

    if (req.user.role === 'STUDENT') {
      dispatch({ studentId: req.user.id, event: 'chatbot.used', sourceId: null });
    }

    return res.status(200).json({
      message: 'Chatbot answer generated successfully',
      data: response,
    });
  } catch (error) {
    return next(error);
  }
};
