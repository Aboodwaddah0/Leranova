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
import { createLessonAttachment } from '../services/lessonAttachmentService.js';
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
		const { title, description } = req.body;
		const video = req.file;

		// Temporary debug log for multipart troubleshooting.
		console.log(req.body, req.file);

		const { error, value } = createLessonSchema.validate(
			normalizeLessonPayload({ title, description })
		);

		if (error) {
			return next(new AppError(error.details[0].message, 400));
		}

		const lesson = await createLesson(req.user.id, subjectId, value);
		let videoAttachment = null;

		if (video) {
			videoAttachment = await createLessonAttachment({
				orgId: req.user.id,
				lessonId: lesson.id,
				file: video,
			});
		}

		return res.status(201).json({
			message: 'Lesson created successfully',
			data: videoAttachment
				? {
					...lesson,
					videoAttachment,
				}
				: lesson,
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
		const { title, description } = req.body;
		const video = req.file;

		// Temporary debug log for multipart troubleshooting.
		console.log(req.body, req.file);

		const hasTextPayload = title !== undefined || description !== undefined;
		let value = {};

		if (hasTextPayload) {
			const validation = updateLessonSchema.validate(
				normalizeLessonPayload({ title, description })
			);
			if (validation.error) {
				return next(new AppError(validation.error.details[0].message, 400));
			}
			value = validation.value;
		} else if (!video) {
			return next(new AppError('At least one of title, description, or video is required', 400));
		}

		const lesson = hasTextPayload
			? await updateLesson(req.user.id, subjectId, lessonId, value)
			: await getLessonById(req.user.id, subjectId, lessonId);
		let videoAttachment = null;

		if (video) {
			videoAttachment = await createLessonAttachment({
				orgId: req.user.id,
				lessonId,
				file: video,
			});
		}

		return res.status(200).json({
			message: 'Lesson updated successfully',
			data: videoAttachment
				? {
					...lesson,
					videoAttachment,
				}
				: lesson,
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
