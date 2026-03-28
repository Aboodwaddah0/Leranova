import {
	lessonIdParamSchema,
	subjectIdParamSchema,
	createLessonSchema,
	updateLessonSchema,
} from '../validations/lessonValidation.js';
import {
	createLesson,
	getLessons,
	getLessonById,
	updateLesson,
	deleteLesson,
} from '../services/lessonService.js';
import AppError from '../utils/appError.js';

const normalizeLessonPayload = (body = {}) => ({
	title: body.title,
	description: body.description,
});

const parseSubjectId = (req) => {
	const subjectId = Number(req.params.subjectId);
	const { error } = subjectIdParamSchema.validate({ subjectId });

	if (error) {
		throw new AppError(error.details[0].message, 400);
	}

	return subjectId;
};

const parseLessonId = (req) => {
	const lessonId = Number(req.params.lessonId);
	const { error } = lessonIdParamSchema.validate({ lessonId });

	if (error) {
		throw new AppError(error.details[0].message, 400);
	}

	return lessonId;
};

export const createLessonController = async (req, res, next) => {
	try {
		const subjectId = parseSubjectId(req);
		const { error, value } = createLessonSchema.validate(normalizeLessonPayload(req.body));

		if (error) {
			return next(new AppError(error.details[0].message, 400));
		}

		const lesson = await createLesson(req.user.id, subjectId, value);

		return res.status(201).json({
			message: 'Lesson created successfully',
			data: lesson,
		});
	} catch (error) {
		return next(error);
	}
};

export const getLessonsController = async (req, res, next) => {
	try {
		const subjectId = parseSubjectId(req);
		const lessons = await getLessons(req.user.id, subjectId);

		return res.status(200).json({
			message: 'Lessons fetched successfully',
			total: lessons.length,
			data: lessons,
		});
	} catch (error) {
		return next(error);
	}
};

export const getLessonByIdController = async (req, res, next) => {
	try {
		const subjectId = parseSubjectId(req);
		const lessonId = parseLessonId(req);
		const lesson = await getLessonById(req.user.id, subjectId, lessonId);

		return res.status(200).json({
			message: 'Lesson fetched successfully',
			data: lesson,
		});
	} catch (error) {
		return next(error);
	}
};

export const updateLessonController = async (req, res, next) => {
	try {
		const subjectId = parseSubjectId(req);
		const lessonId = parseLessonId(req);
		const { error, value } = updateLessonSchema.validate(normalizeLessonPayload(req.body));

		if (error) {
			return next(new AppError(error.details[0].message, 400));
		}

		const lesson = await updateLesson(req.user.id, subjectId, lessonId, value);

		return res.status(200).json({
			message: 'Lesson updated successfully',
			data: lesson,
		});
	} catch (error) {
		return next(error);
	}
};

export const deleteLessonController = async (req, res, next) => {
	try {
		const subjectId = parseSubjectId(req);
		const lessonId = parseLessonId(req);

		const deleted = await deleteLesson(req.user.id, subjectId, lessonId);

		return res.status(200).json({
			message: 'Lesson deleted successfully',
			data: deleted,
		});
	} catch (error) {
		return next(error);
	}
};
