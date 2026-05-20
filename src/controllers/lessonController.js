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
import { gatherLessonContent } from '../services/aiContentService.js';
import AppError from '../utils/appError.js';
import { groqFetchWithRetry } from '../utils/groqClient.js';
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
		const { filename = '', lang = 'ar', hint = '' } = req.body;

		const subject = await prisma.course.findUnique({
			where: { id: subjectId },
			select: { name: true, track: { select: { Name: true } } },
		});
		const subjectName = subject?.name || subject?.Name || '';
		const courseName  = subject?.track?.Name || '';

		const cleanName = filename.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ').trim();

		const apiKey = process.env.GROQ_API_KEY;
		if (!apiKey) throw new AppError('GROQ_API_KEY is not configured', 500);

		// Fetch existing lesson titles in this subject so Groq can avoid duplicating them
		const existingLessons = await prisma.lesson.findMany({
			where:  { Subject_id: subjectId },
			select: { name: true },
			take:   20,
		});
		const existingTitles = existingLessons.map((l) => l.name).filter(Boolean);

		const avoidAr = existingTitles.length
			? `\nعناوين دروس موجودة مسبقاً في هذه المادة (يجب أن يكون العنوان الجديد مختلفًا تمامًا عنها):\n${existingTitles.map((t) => `- ${t}`).join('\n')}`
			: '';
		const avoidEn = existingTitles.length
			? `\nExisting lesson titles in this subject (the new title MUST be completely different from all of these):\n${existingTitles.map((t) => `- ${t}`).join('\n')}`
			: '';

		const hintLineAr = hint.trim() ? `\nموضوع هذا الدرس تحديداً: "${hint.trim()}"` : '';
		const hintLineEn = hint.trim() ? `\nThis lesson is specifically about: "${hint.trim()}"` : '';

		const prompt = lang === 'ar'
			? `أنت مساعد تعليمي. اقترح عنوانًا فريدًا وواضحًا ووصفًا مختصرًا لدرس تعليمي جديد.
المادة: "${subjectName}"
الكورس: "${courseName}"
اسم ملف الفيديو: "${cleanName}"${hintLineAr}${avoidAr}
أعد JSON فقط بهذا الشكل: {"title": "عنوان الدرس", "description": "وصف مختصر في جملة أو جملتين"}`
			: `You are an educational assistant. Suggest a unique title and brief description for a new lesson.
Subject: "${subjectName}"
Course: "${courseName}"
Video filename: "${cleanName}"${hintLineEn}${avoidEn}
Return JSON only: {"title": "Lesson title", "description": "Brief 1-2 sentence description"}`;

		const response = await groqFetchWithRetry(GROQ_API_URL, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
			body: JSON.stringify({
				model: GROQ_MODEL,
				temperature: 0.8,
				max_tokens: 200,
				messages: [{ role: 'user', content: prompt }],
			}),
		}, { retries: 3, baseDelay: 500 });

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

export const suggestFromContentController = async (req, res, next) => {
	try {
		const lessonId = Number(req.params.lessonId);
		const lang     = req.body?.lang || 'ar';

		if (!lessonId) throw new AppError('Invalid lesson ID', 400);

		const apiKey = process.env.GROQ_API_KEY;
		if (!apiKey) throw new AppError('GROQ_API_KEY is not configured', 500);

		// gatherLessonContent pulls Qdrant chunks (actual video transcript) + lesson metadata.
		// Throws 422 with a user-friendly message if content is not indexed yet.
		const { content } = await gatherLessonContent(lessonId);

		const prompt = lang === 'ar'
			? `أنت مساعد تعليمي. بناءً على محتوى هذا الدرس فقط، اقترح عنوانًا واضحًا ودقيقًا ووصفًا مختصرًا يعكس الموضوع الفعلي للدرس.\nأعد JSON فقط بهذا الشكل: {"title": "عنوان الدرس", "description": "وصف في جملة أو جملتين"}\n\nمحتوى الدرس:\n${content}`
			: `You are an educational assistant. Based ONLY on this lesson content, suggest a clear, accurate title and brief description that reflects what the lesson is actually about.\nReturn JSON only: {"title": "Lesson title", "description": "1-2 sentence description"}\n\nLesson content:\n${content}`;

		const response = await groqFetchWithRetry(GROQ_API_URL, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
			body: JSON.stringify({
				model: GROQ_MODEL,
				temperature: 0.5,
				max_tokens: 200,
				messages: [{ role: 'user', content: prompt }],
			}),
		}, { retries: 3, baseDelay: 500 });

		const body2   = await response.json();
		const raw2    = body2?.choices?.[0]?.message?.content?.trim() || '{}';
		const cleaned2 = raw2.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
		const match2  = cleaned2.match(/\{[\s\S]*\}/);
		let parsed2   = {};
		try { parsed2 = match2 ? JSON.parse(match2[0]) : {}; } catch { /**/ }

		return res.status(200).json({
			success: true,
			status:  200,
			data:    { title: String(parsed2.title || ''), description: String(parsed2.description || '') },
			error:   null,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		return next(error);
	}
};
