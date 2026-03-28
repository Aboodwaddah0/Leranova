import prisma from '../utils/prisma.js';
import AppError from '../utils/appError.js';
import { deleteUploadedFile } from './cloudinary.service.js';

const serializeLesson = (lesson) => ({
	id: lesson.id,
	subjectId: lesson.Subject_id,
	title: lesson.name,
	description: lesson.Description,
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

export const createLesson = async (orgId, subjectId, data) => {
  await ensureSubjectBelongsToOrganization(orgId, subjectId);

  const lesson = await prisma.lesson.create({
    data: {
      Subject_id: subjectId,
      name: data.title,
      Description: data.description ?? null,
    },
  });

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

export const updateLesson = async (orgId, subjectId, lessonId, data) => {
	await ensureLessonBelongsToSubject(orgId, subjectId, lessonId);

	const updated = await prisma.lesson.update({
		where: {
			id: lessonId,
		},
		data: {
			name: data.title ?? undefined,
			Description: data.description ?? undefined,
		},
	});

	return serializeLesson(updated);
};

export const deleteLesson = async (orgId, subjectId, lessonId) => {
	await ensureLessonBelongsToSubject(orgId, subjectId, lessonId);

	const attachments = await prisma.lesson_attachment.findMany({
		where: { lessonId },
		select: {
			id: true,
			filePublicId: true,
			fileResourceType: true,
		},
	});

	for (const attachment of attachments) {
		if (!attachment.filePublicId) {
			continue;
		}

		try {
			await deleteUploadedFile(
				attachment.filePublicId,
				attachment.fileResourceType || 'raw'
			);
		} catch (error) {
			console.error(
				`Cloudinary cleanup failed for lesson attachment ${attachment.id}:`,
				error.message
			);
		}
	}

	await prisma.lesson.delete({
		where: {
			id: lessonId,
		},
	});

	return { id: lessonId };
};
