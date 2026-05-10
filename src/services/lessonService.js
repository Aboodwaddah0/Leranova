import prisma from '../utils/prisma.js';
import AppError from '../utils/appError.js';
import { deleteUploadedFile } from './cloudinary.service.js';
import { resolveStudentContext } from './studentExperienceService.js';

const toRole = (value) => String(value || '').trim().toUpperCase();
const PAID_SUBSCRIPTION_FILTER = {
	OR: [
		{ paymentStatus: 'PAID' },
		{ status: 'PAID' },
		{ status: 'SUCCESS' },
	],
};

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
		const context = await resolveStudentContext(actor.id);

		return {
			role,
			orgId: context.orgId,
			teacherId: null,
			userId: actor.id,
			studentMode: context.mode,
			classCourseId: context.mode === 'SCHOOL' ? context.classCourseId : null,
		};
	}

	throw new AppError('Access denied. Teacher, student, or organization account required.', 403);
};

const toJsonSafeSize = (value) => {
	if (value === null || value === undefined) {
		return null;
	}

	if (typeof value === 'bigint') {
		const maxSafe = BigInt(Number.MAX_SAFE_INTEGER);
		return value <= maxSafe ? Number(value) : value.toString();
	}

	return value;
};

const serializeAttachment = (attachment) => ({
	id: attachment.id,
	lessonId: attachment.lessonId,
	fileUrl: attachment.fileUrl,
	url: attachment.fileUrl,
	filePublicId: attachment.filePublicId,
	public_id: attachment.filePublicId,
	fileResourceType: attachment.fileResourceType,
	resource_type: attachment.fileResourceType,
	mimeType: attachment.mimeType,
	originalName: attachment.originalName,
	name: attachment.originalName,
	fileType: attachment.fileType,
	type: String(attachment.fileType || '').toLowerCase(),
	sizeBytes: toJsonSafeSize(attachment.sizeBytes),
	createdAt: attachment.createdAt,
});

const serializeLesson = (lesson) => {
	const attachments = Array.isArray(lesson.attachments)
		? lesson.attachments.map(serializeAttachment)
		: [];
	const videoAttachment = attachments.find((attachment) => String(attachment.fileType || '').toUpperCase() === 'VIDEO') || null;
	const progress = Array.isArray(lesson.lesson_progress) ? lesson.lesson_progress[0] : null;

	return {
		id: lesson.id,
		subjectId: lesson.Subject_id,
		title: lesson.name,
		name: lesson.name,
		description: lesson.Description,
		videoUrl: lesson.videoUrl || videoAttachment?.url || '',
		isCompleted: Boolean(progress?.isCompleted),
		attachments,
		quiz: lesson.quiz ? { isPublished: lesson.quiz.isPublished } : null,
	};
};

const buildStudentSubjectAccessFilter = (scope) => {
	if (scope.role !== 'STUDENT') {
		return {};
	}

	if (scope.studentMode === 'SCHOOL') {
		return {
			Course_id: scope.classCourseId,
		};
	}

	if (scope.studentMode === 'ACADEMY') {
		return {
			OR: [
				{ isPaid: false },
				{
					subscriptions: {
						some: {
							user_Academy_id: scope.userId,
							...PAID_SUBSCRIPTION_FILTER,
						},
					},
				},
			],
		};
	}

	return {};
};

const ensureSubjectBelongsToOrganization = async (scope, subjectId) => {
	const subject = await prisma.subject.findFirst({
		where: {
			id: subjectId,
			...(scope.teacherId ? { Teacher_id: scope.teacherId } : {}),
			...buildStudentSubjectAccessFilter(scope),
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
		throw new AppError(
			`Subject (ID: ${subjectId}) not found or does not belong to your organization. Make sure the subject exists and is part of your organization's course. | المادة (معرف: ${subjectId}) غير موجودة أو لا تنتمي إلى مؤسستك. تأكد من وجود المادة وأنها جزء من مساقات مؤسستك.`,
			404
		);
	}
};

const ensureLessonBelongsToSubject = async (scope, subjectId, lessonId) => {
	const lesson = await prisma.lesson.findFirst({
		where: {
			id: lessonId,
			Subject_id: subjectId,
			subject: {
				...(scope.teacherId ? { Teacher_id: scope.teacherId } : {}),
				...buildStudentSubjectAccessFilter(scope),
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
	if (scope.role === 'STUDENT') {
		throw new AppError('Students cannot create lessons', 403);
	}
	if (scope.role !== 'TEACHER') {
		throw new AppError('Only teachers can create lessons. Organizations can only create courses and monitor subjects and materials.', 403);
	}
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
				...buildStudentSubjectAccessFilter(scope),
				course: {
					Org_id: scope.orgId,
				},
			},
		},
		orderBy: {
			id: 'asc',
		},
		include: {
			attachments: {
				orderBy: {
					id: 'asc',
				},
			},
			quiz: {
				select: { isPublished: true },
			},
			...(scope.role === 'STUDENT'
				? {
					lesson_progress: {
						where: {
							studentId: scope.userId,
						},
						select: {
							isCompleted: true,
						},
						take: 1,
					},
				}
				: {}),
		},
	});

	return lessons.map(serializeLesson);
};

export const getLessonById = async (actor, subjectId, lessonId) => {
	const scope = await resolveLessonScope(actor);
	const lesson = await prisma.lesson.findFirst({
		where: {
			id: lessonId,
			Subject_id: subjectId,
			subject: {
				...(scope.teacherId ? { Teacher_id: scope.teacherId } : {}),
				...buildStudentSubjectAccessFilter(scope),
				course: {
					Org_id: scope.orgId,
				},
			},
		},
		include: {
			attachments: {
				orderBy: {
					id: 'asc',
				},
			},
			...(scope.role === 'STUDENT'
				? {
					lesson_progress: {
						where: {
							studentId: scope.userId,
						},
						select: {
							isCompleted: true,
						},
						take: 1,
					},
				}
				: {}),
		},
	});

	if (!lesson) {
		throw new AppError('Lesson not found or does not belong to this subject', 404);
	}
	return serializeLesson(lesson);
};

export const updateLesson = async (actor, subjectId, lessonId, data) => {
	const scope = await resolveLessonScope(actor);
	if (scope.role === 'STUDENT') {
		throw new AppError('Students cannot update lessons', 403);
	}
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
	if (scope.role === 'STUDENT') {
		throw new AppError('Students cannot delete lessons', 403);
	}
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
