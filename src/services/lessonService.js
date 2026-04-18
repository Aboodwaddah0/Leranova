import prisma from '../utils/prisma.js';
import AppError from '../utils/appError.js';
import { deleteUploadedFile } from './cloudinary.service.js';

const toRole = (value) => String(value || '').trim().toUpperCase();

const resolveLessonScope = async (actor) => {
	const role = toRole(actor?.role);

	if (role === 'TEACHER') {
		const teacher = await prisma.teacher.findUnique({
			where: { Teacher_id: actor.id },
			select: { Teacher_id: true, OrgId: true },
		});

		if (!teacher) {
			throw new AppError('Teacher profile not found', 404);
		}

		return {
			role,
			orgId: teacher.OrgId,
			teacherId: teacher.Teacher_id,
		};
	}

	if (role === 'ACADEMY' || role === 'SCHOOL') {
		return {
			role,
			orgId: actor.id,
			teacherId: null,
		};
	}

	if (role === 'STUDENT') {
		const student = await prisma.academy_user.findFirst({
			where: { user_academy_id: actor.id },
			select: { OrgId: true },
		});

		if (!student) {
			throw new AppError('Student profile not found', 404);
		}

		return {
			role,
			orgId: student.OrgId,
			teacherId: null, // Students can view all lessons
		};
	}

	throw new AppError('Access denied. Teacher, student, or organization account required.', 403);
};

const serializeLesson = (lesson) => ({
	id: lesson.id,
	subjectId: lesson.Subject_id,
	title: lesson.name,
	description: lesson.Description,
});

const ensureSubjectBelongsToOrganization = async (scope, subjectId) => {
	const subject = await prisma.subject.findFirst({
		where: {
			id: subjectId,
			...(scope.teacherId ? { Teacher_id: scope.teacherId } : {}),
			course: {
				Org_id: scope.orgId,
			},
		},
		select: {
			id: true,
			Teacher_id: true,
		},
	});

	if (!subject) {
		throw new AppError('Subject not found or does not belong to your organization', 404);
	}
};

const ensureLessonBelongsToSubject = async (scope, subjectId, lessonId) => {
	const lesson = await prisma.lesson.findFirst({
		where: {
			id: lessonId,
			Subject_id: subjectId,
			subject: {
				...(scope.teacherId ? { Teacher_id: scope.teacherId } : {}),
				course: {
					Org_id: scope.orgId,
				},
			},
		},
	});

	if (!lesson) {
		throw new AppError('Lesson not found or does not belong to this subject', 404);
	}

	return lesson;
};

export const createLesson = async (actor, subjectId, data) => {
	const scope = await resolveLessonScope(actor);
	await ensureSubjectBelongsToOrganization(scope, subjectId);

  const lesson = await prisma.lesson.create({
    data: {
      Subject_id: subjectId,
      name: data.title,
      Description: data.description ?? null,
    },
  });

  return serializeLesson(lesson);
};

export const getLessons = async (actor, subjectId) => {
	const scope = await resolveLessonScope(actor);
	await ensureSubjectBelongsToOrganization(scope, subjectId);

	const lessons = await prisma.lesson.findMany({
		where: {
			Subject_id: subjectId,
			subject: {
				...(scope.teacherId ? { Teacher_id: scope.teacherId } : {}),
				course: {
					Org_id: scope.orgId,
				},
			},
		},
		orderBy: {
			id: 'asc',
		},
	});

	return lessons.map(serializeLesson);
};

export const getLessonById = async (actor, subjectId, lessonId) => {
	const scope = await resolveLessonScope(actor);
	const lesson = await ensureLessonBelongsToSubject(scope, subjectId, lessonId);
	return serializeLesson(lesson);
};

export const updateLesson = async (actor, subjectId, lessonId, data) => {
	const scope = await resolveLessonScope(actor);
	await ensureLessonBelongsToSubject(scope, subjectId, lessonId);

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

export const deleteLesson = async (actor, subjectId, lessonId) => {
	const scope = await resolveLessonScope(actor);
	await ensureLessonBelongsToSubject(scope, subjectId, lessonId);

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
