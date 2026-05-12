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
import prisma from '../utils/prisma.js';

const GROQ_API_URL = process.env.GROQ_API_URL || 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL   = process.env.GROQ_MODEL   || 'llama-3.3-70b-versatile';

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

		const lesson = await createLesson(req.user, subjectId, value);
		let videoAttachment = null;
		let ingestion = null;
		let warning = null;

		if (video) {
			const uploadResult = await createLessonAttachment({
				actor: req.user,
				lessonId: lesson.id,
				file: video,
			});
			videoAttachment = uploadResult.attachment;
			ingestion = uploadResult.ingestion;
			warning = uploadResult.warning;
		}

		return res.status(201).json({
			message: 'Lesson created successfully',
			ingestion,
			warning,
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
		const lessons = await getLessons(req.user, subjectId);
		const completedLessons = lessons.filter((lesson) => Boolean(lesson.isCompleted)).length;
		const progressPercent = lessons.length ? Math.round((completedLessons / lessons.length) * 100) : 0;

		console.log('[LESSONS][GET] Subject lessons fetched', {
			subjectId,
			userId: req.user?.id || null,
			role: req.user?.role || null,
			count: lessons.length,
		});

		return res.status(200).json({
			success: true,
			message: 'Lessons fetched successfully',
			total: lessons.length,
			progress: {
				totalLessons: lessons.length,
				completedLessons,
				progressPercent,
			},
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
		const lesson = await getLessonById(req.user, subjectId, lessonId);

		return res.status(200).json({
			success: true,
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
			? await updateLesson(req.user, subjectId, lessonId, value)
			: await getLessonById(req.user, subjectId, lessonId);
		let videoAttachment = null;
		let ingestion = null;
		let warning = null;

		if (video) {
			const uploadResult = await createLessonAttachment({
				actor: req.user,
				lessonId,
				file: video,
			});
			videoAttachment = uploadResult.attachment;
			ingestion = uploadResult.ingestion;
			warning = uploadResult.warning;
		}

		return res.status(200).json({
			message: 'Lesson updated successfully',
			ingestion,
			warning,
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

		const deleted = await deleteLesson(req.user, subjectId, lessonId);

		return res.status(200).json({
			message: 'Lesson deleted successfully',
			data: deleted,
		});
	} catch (error) {
		return next(error);
	}
};

export const suggestLessonMetadataController = async (req, res, next) => {
	try {
		const subjectId = parseSubjectId(req);
		const { filename = '', lang = 'ar' } = req.body;

		const subject = await prisma.subject.findUnique({
			where: { id: subjectId },
			select: { name: true, course: { select: { Name: true } } },
		});
		const subjectName = subject?.name || subject?.Name || '';
		const courseName  = subject?.course?.Name || '';

		const cleanName = filename.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ').trim();

		const apiKey = process.env.GROQ_API_KEY;
		if (!apiKey) throw new AppError('GROQ_API_KEY is not configured', 500);

		const prompt = lang === 'ar'
			? `أنت مساعد تعليمي. اقترح عنوانًا واضحًا ووصفًا مختصرًا لدرس تعليمي.\nالمادة: "${subjectName}"\nالكورس: "${courseName}"\nاسم الملف: "${cleanName}"\nأعد JSON فقط بهذا الشكل: {"title": "عنوان الدرس", "description": "وصف مختصر في جملة أو جملتين"}`
			: `You are an educational assistant. Suggest a clear title and brief description for a lesson.\nSubject: "${subjectName}"\nCourse: "${courseName}"\nFilename: "${cleanName}"\nReturn JSON only: {"title": "Lesson title", "description": "Brief 1-2 sentence description"}`;

		const response = await fetch(GROQ_API_URL, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
			body: JSON.stringify({
				model: GROQ_MODEL,
				temperature: 0.4,
				max_tokens: 200,
				messages: [{ role: 'user', content: prompt }],
			}),
		});

		const body = await response.json();
		const raw = body?.choices?.[0]?.message?.content?.trim() || '{}';
		const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
		const match = cleaned.match(/\{[\s\S]*\}/);
		let parsed = {};
		try { parsed = match ? JSON.parse(match[0]) : {}; } catch { /* ignore */ }

		return res.status(200).json({
			success: true,
			status: 200,
			data: { title: String(parsed.title || ''), description: String(parsed.description || '') },
			error: null,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		return next(error);
	}
};
