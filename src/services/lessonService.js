import prisma from '../utils/prisma.js';
import AppError from '../utils/appError.js';
import { uploadVideo, deleteVideo } from './cloudinary.service.js';
import { triggerLessonRagProcessing } from './rag.service.js';

const serializeLesson = (lesson) => ({
	id: lesson.id,
	subjectId: lesson.Subject_id,
	title: lesson.name,
	description: lesson.Description,
	videoUrl: lesson.videoUrl,
	videoPublicId: lesson.videoPublicId,
	videoResourceType: lesson.videoResourceType,
});

const ensureSubjectBelongsToOrganization = async (orgId, subjectId) => {
	const subject = await prisma.subject.findFirst({
		where: {
			id: subjectId,
			course: {
				Org_id: orgId,
			},
		},
		select: {
			id: true,
		},
	});

	if (!subject) {
		throw new AppError('Subject not found or does not belong to your organization', 404);
	}
};

const ensureLessonBelongsToSubject = async (orgId, subjectId, lessonId) => {
	const lesson = await prisma.lesson.findFirst({
		where: {
			id: lessonId,
			Subject_id: subjectId,
			subject: {
				course: {
					Org_id: orgId,
				},
			},
		},
	});

	if (!lesson) {
		throw new AppError('Lesson not found or does not belong to this subject', 404);
	}

	return lesson;
};

export const createLesson = async (orgId, subjectId, data, videoBuffer) => {
	await ensureSubjectBelongsToOrganization(orgId, subjectId);

	let videoMeta = null;
	if (videoBuffer) {
		videoMeta = await uploadVideo(videoBuffer, {
			folder: 'learnova/lessons/videos',
		});
	}

	const lesson = await prisma.lesson.create({
		data: {
			Subject_id: subjectId,
			name: data.title,
			Description: data.description ?? null,
			videoUrl: videoMeta?.videoUrl ?? null,
			videoPublicId: videoMeta?.videoPublicId ?? null,
			videoResourceType: videoMeta?.videoResourceType ?? null,
		},
	});

	if (lesson.videoUrl) {
		try {
			await triggerLessonRagProcessing({
				lessonId: lesson.id,
				fileUrl: lesson.videoUrl,
				fileType: 'video',
				sourceName: lesson.videoPublicId ?? `lesson-${lesson.id}-video`,
				videoUrl: lesson.videoUrl,
				organizationId: orgId,
			});
		} catch (error) {
			console.error(`RAG trigger failed for lesson ${lesson.id}:`, error.message);
		}
	}

	return serializeLesson(lesson);
};

export const getLessons = async (orgId, subjectId) => {
	await ensureSubjectBelongsToOrganization(orgId, subjectId);

	const lessons = await prisma.lesson.findMany({
		where: {
			Subject_id: subjectId,
			subject: {
				course: {
					Org_id: orgId,
				},
			},
		},
		orderBy: {
			id: 'asc',
		},
	});

	return lessons.map(serializeLesson);
};

export const getLessonById = async (orgId, subjectId, lessonId) => {
	const lesson = await ensureLessonBelongsToSubject(orgId, subjectId, lessonId);
	return serializeLesson(lesson);
};

export const updateLesson = async (orgId, subjectId, lessonId, data, videoBuffer) => {
	const existing = await ensureLessonBelongsToSubject(orgId, subjectId, lessonId);

	let nextVideo = null;

	if (videoBuffer) {
		if (existing.videoPublicId) {
			await deleteVideo(existing.videoPublicId, existing.videoResourceType ?? 'video');
		}

		nextVideo = await uploadVideo(videoBuffer, {
			folder: 'learnova/lessons/videos',
		});
	}

	const updated = await prisma.lesson.update({
		where: {
			id: lessonId,
		},
		data: {
			name: data.title ?? undefined,
			Description: data.description ?? undefined,
			videoUrl: nextVideo?.videoUrl ?? undefined,
			videoPublicId: nextVideo?.videoPublicId ?? undefined,
			videoResourceType: nextVideo?.videoResourceType ?? undefined,
		},
	});

	return serializeLesson(updated);
};

export const deleteLesson = async (orgId, subjectId, lessonId) => {
	const existing = await ensureLessonBelongsToSubject(orgId, subjectId, lessonId);

	if (existing.videoPublicId) {
		await deleteVideo(existing.videoPublicId, existing.videoResourceType ?? 'video');
	}

	await prisma.lesson.delete({
		where: {
			id: lessonId,
		},
	});

	return { id: lessonId };
};
