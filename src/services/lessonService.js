import prisma from '../utils/prisma.js';
import AppError from '../utils/appError.js';
import { deleteUploadedFile } from './cloudinary.service.js';
import { resolveStudentContext } from './studentExperienceService.js';
import { normalizeUploadedFilename } from '../utils/filenameEncoding.js';
import { notifyTrackMembers } from './notificationService.js';

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
	originalName: normalizeUploadedFilename(attachment.originalName),
	name: normalizeUploadedFilename(attachment.originalName),
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

const PREVIEW_LESSON_COUNT = 3; // First N lessons are free preview

const checkAcademySubscription = async (userId, subjectId) => {
	const sub = await prisma.student_subject_subscription.findFirst({
		where: { user_Academy_id: userId, Subject_id: subjectId, OR: PAID_SUBSCRIPTION_FILTER.OR },
		select: { id: true },
	});
	return !!sub;
};

const isAcademyPreviewContext = async (scope, subjectId) => {
	if (scope.role !== 'STUDENT' || scope.studentMode !== 'ACADEMY') return false;
	const subject = await prisma.course.findFirst({
		where: { id: subjectId, track: { Org_id: scope.orgId } },
		select: { isPaid: true },
	});
	if (!subject?.isPaid) return false;
	const subscribed = await checkAcademySubscription(scope.userId, subjectId);
	return !subscribed; // preview mode only when paid + NOT subscribed
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
	const subject = await prisma.course.findFirst({
		where: {
			id: subjectId,
			...(scope.teacherId ? { Teacher_id: scope.teacherId } : {}),
			...buildStudentSubjectAccessFilter(scope),
			track: {
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
			course: {
				...(scope.teacherId ? { Teacher_id: scope.teacherId } : {}),
				...buildStudentSubjectAccessFilter(scope),
				track: {
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

  prisma.course.findUnique({
    where: { id: subjectId },
    select: { name: true, Course_id: true },
  }).then((subject) => {
    if (!subject) return;
    return notifyTrackMembers(subject.Course_id, {
      content: `New lesson "${lesson.name}" was added to "${subject.name}"`,
      type: 'LESSON',
      url: `/lessons/${lesson.id}`,
    });
  }).catch(() => {});

  return serializeLesson(lesson);
};

export const getLessons = async (actor, subjectId) => {
	const scope = await resolveLessonScope(actor);
	const previewMode = await isAcademyPreviewContext(scope, subjectId);

	if (!previewMode) {
		await ensureSubjectBelongsToOrganization(scope, subjectId);
	}

	const lessons = await prisma.lesson.findMany({
		where: {
			Subject_id: subjectId,
			course: {
				...(scope.teacherId ? { Teacher_id: scope.teacherId } : {}),
				...(previewMode ? {} : buildStudentSubjectAccessFilter(scope)),
				track: { Org_id: scope.orgId },
			},
		},
		orderBy: { id: 'asc' },
		include: {
			attachments: { orderBy: { id: 'asc' } },
			quiz: { select: { isPublished: true } },
			...(scope.role === 'STUDENT'
				? { lesson_progress: { where: { studentId: scope.userId }, select: { isCompleted: true }, take: 1 } }
				: {}),
		},
	});

	return lessons.map((lesson, index) => {
		const serialized = serializeLesson(lesson);
		if (previewMode) {
			const isFreePreview = index < PREVIEW_LESSON_COUNT;
			serialized.isPreview  = isFreePreview;
			serialized.isLocked   = !isFreePreview;
			if (!isFreePreview) {
				serialized.videoUrl    = null;
				serialized.attachments = (serialized.attachments || []).map(a => ({ ...a, fileUrl: null, url: null }));
			}
		}
		return serialized;
	});
};

export const getLessonById = async (actor, subjectId, lessonId) => {
	const scope = await resolveLessonScope(actor);
	const previewMode = await isAcademyPreviewContext(scope, subjectId);

	if (previewMode) {
		// Allow only the first PREVIEW_LESSON_COUNT lessons
		const previewIds = (await prisma.lesson.findMany({
			where: { Subject_id: subjectId, course: { track: { Org_id: scope.orgId } } },
			orderBy: { id: 'asc' },
			select: { id: true },
			take: PREVIEW_LESSON_COUNT,
		})).map(l => l.id);
		if (!previewIds.includes(lessonId)) {
			throw new AppError('This lesson requires a subscription. Purchase this subject to access all lessons.', 402);
		}
	} else {
		await ensureLessonBelongsToSubject(scope, subjectId, lessonId);
	}

	const lesson = await prisma.lesson.findFirst({
		where: {
			id: lessonId,
			Subject_id: subjectId,
			course: { track: { Org_id: scope.orgId } },
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
