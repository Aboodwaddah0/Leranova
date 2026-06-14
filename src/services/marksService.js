import prisma from '../utils/prisma.js';
import AppError from '../utils/appError.js';
import { createNotification } from './notificationService.js';

const markInclude = {
	student: {
		include: {
			user: {
				select: {
					id: true,
					name: true,
					email: true,
					role: true,
				},
			},
		},
		// Parent_id is a direct column on student — needed for parent notification
	},
	course: {
		select: {
			id: true,
			name: true,
			Course_id: true,
			Teacher_id: true,
			track: {
				select: {
					id: true,
					Name: true,
					GradeLevel: true,
					isPaid: true,
					price: true,
					Org_id: true,
				},
			},
		},
	},
	component: {
		select: {
			id: true,
			name: true,
			weight: true,
			maxScore: true,
		},
	},
};

const ensureTeacherOwnsSubject = async (teacherId, subjectId) => {
	const subject = await prisma.course.findFirst({
		where: {
			id: subjectId,
			Teacher_id: teacherId,
		},
		select: {
			id: true,
			Teacher_id: true,
			Course_id: true,
			track: {
				select: {
					Org_id: true,
				},
			},
		},
	});

	if (!subject) {
		throw new AppError('Subject not found or does not belong to this teacher', 404);
	}

	return subject;
};

const serializeMark = (mark) => {
	if (!mark) return mark;
	const { course, ...rest } = mark;
	return {
		...rest,
		subject: course ? { ...course, course: course.track ?? null } : null,
	};
};

const ensureStudentEligibleForSubject = async (studentId, subject) => {
	const student = await prisma.student.findFirst({
		where: {
			Student_id: studentId,
			OrgId: subject.track.Org_id,
			OR: [
				{
					Course_id: subject.Course_id,
				},
				{
					user: {
						academy_user: {
							is: {
								enrollment: {
									some: {
										Course_id: subject.Course_id,
									},
								},
							},
						},
					},
				},
			],
		},
		select: {
			Student_id: true,
		},
	});

	if (!student) {
		throw new AppError('Student is not eligible for this subject', 403);
	}

	return student;
};

const ensureStudentExists = async (studentId) => {
	const student = await prisma.student.findUnique({
		where: { Student_id: studentId },
		select: { Student_id: true },
	});

	if (!student) {
		throw new AppError('Student not found', 404);
	}

	return student;
};

const getTeacherMarkOrThrow = async (teacherId, markId) => {
	const mark = await prisma.marks.findFirst({
		where: {
			id: markId,
			course: {
				Teacher_id: teacherId,
			},
		},
		include: markInclude,
	});

	if (!mark) {
		throw new AppError('Mark not found or does not belong to this teacher', 404);
	}

	return mark;
};

const ensureComponentValid = async (componentId, orgId, subjectId) => {
	if (componentId === undefined || componentId === null) return null;

	const component = await prisma.assessment_component.findFirst({
		where: {
			id: Number(componentId),
			OrgId: orgId,
			OR: [{ subjectId: null }, { subjectId: Number(subjectId) }],
		},
	});

	if (!component) {
		throw new AppError('Assessment component not found or does not apply to this subject', 404);
	}

	return component;
};

const assertWeightBudget = async (studentId, subjectId, addingPct, excludeMarkId = null) => {
	if (!addingPct && addingPct !== 0) return; // no weight provided — skip
	const agg = await prisma.marks.aggregate({
		where: {
			Student_id: studentId,
			Subject_id: subjectId,
			...(excludeMarkId ? { id: { not: excludeMarkId } } : {}),
		},
		_sum: { ExamPercentage: true },
	});
	const used = Number(agg._sum.ExamPercentage || 0);
	const total = used + Number(addingPct);
	if (total > 100) {
		throw new AppError(
			`Total assessment weight would reach ${total.toFixed(1)}% (current: ${used.toFixed(1)}%, adding: ${Number(addingPct).toFixed(1)}%). Maximum allowed is 100%.`,
			400,
		);
	}
};

export const createMark = async (teacherId, data) => {
	const subject = await ensureTeacherOwnsSubject(teacherId, data.Subject_id);
	await ensureStudentExists(data.Student_id);
	await ensureStudentEligibleForSubject(data.Student_id, subject);

	if (Number(data.Numbers) > Number(data.OutOf)) {
		throw new AppError('Numbers cannot be greater than OutOf', 400);
	}

	await assertWeightBudget(data.Student_id, data.Subject_id, data.ExamPercentage);
	await ensureComponentValid(data.componentId, subject.track.Org_id, data.Subject_id);

	const mark = await prisma.marks.create({
		data: {
			Student_id: data.Student_id,
			Subject_id: data.Subject_id,
			Numbers: data.Numbers,
			OutOf: data.OutOf,
			ExamPercentage: data.ExamPercentage,
			MarkType: data.MarkType,
			componentId: data.componentId ? Number(data.componentId) : null,
			time: data.time ? new Date(data.time) : null,
		},
		include: markInclude,
	});

	// Notify student
	createNotification({
		userId: mark.student.user.id,
		content: `Your mark for "${mark.course.name}" has been recorded: ${mark.Numbers}/${mark.OutOf}`,
		type: 'MARK',
		url: '/student/marks',
	}).catch(() => {});

	// Notify parent (Parent_id is the parent's user.id directly)
	if (mark.student.Parent_id) {
		createNotification({
			userId: mark.student.Parent_id,
			content: `${mark.student.user.name}'s mark for "${mark.course.name}": ${mark.Numbers}/${mark.OutOf}`,
			type: 'MARK',
			url: '/dashboard/parent',
		}).catch(() => {});
	}

	return serializeMark(mark);
};

export const getMarks = async (teacherId, filters = {}) => {
	const marks = await prisma.marks.findMany({
		where: {
			...(filters.Student_id ? { Student_id: filters.Student_id } : {}),
			...(filters.Subject_id ? { Subject_id: filters.Subject_id } : {}),
			course: {
				Teacher_id: teacherId,
			},
		},
		include: markInclude,
		orderBy: {
			id: 'desc',
		},
	});
	return marks.map(serializeMark);
};

export const getMarkById = async (teacherId, markId) => {
	return serializeMark(await getTeacherMarkOrThrow(teacherId, markId));
};

export const updateMark = async (teacherId, markId, data) => {
	const existingMark = await getTeacherMarkOrThrow(teacherId, markId);
	const mergedNumbers = data.Numbers ?? Number(existingMark.Numbers);
	const mergedOutOf = data.OutOf ?? Number(existingMark.OutOf);

	if (Number(mergedNumbers) > Number(mergedOutOf)) {
		throw new AppError('Numbers cannot be greater than OutOf', 400);
	}

	const newPct = data.ExamPercentage ?? existingMark.ExamPercentage;
	await assertWeightBudget(existingMark.Student_id, existingMark.Subject_id, newPct, markId);

	if (Object.prototype.hasOwnProperty.call(data, 'componentId')) {
		await ensureComponentValid(data.componentId, existingMark.course.track.Org_id, existingMark.Subject_id);
	}

	const updated = await prisma.marks.update({
		where: { id: markId },
		data: {
			Numbers: data.Numbers ?? undefined,
			OutOf: data.OutOf ?? undefined,
			ExamPercentage: data.ExamPercentage ?? undefined,
			MarkType: data.MarkType ?? undefined,
			componentId: Object.prototype.hasOwnProperty.call(data, 'componentId')
				? (data.componentId ? Number(data.componentId) : null)
				: undefined,
			time: Object.prototype.hasOwnProperty.call(data, 'time')
				? (data.time ? new Date(data.time) : null)
				: undefined,
		},
		include: markInclude,
	});
	return serializeMark(updated);
};

export const deleteMark = async (teacherId, markId) => {
	await getTeacherMarkOrThrow(teacherId, markId);

	await prisma.marks.delete({
		where: { id: markId },
	});

	return { id: markId };
};

export const getStudentMarks = async (studentId, filters = {}) => {
	const marks = await prisma.marks.findMany({
		where: {
			Student_id: studentId,
			...(filters.Subject_id ? { Subject_id: filters.Subject_id } : {}),
			...(filters.academicYearId ? { term: { academicYearId: Number(filters.academicYearId) } } : {}),
		},
		include: markInclude,
		orderBy: {
			id: 'desc',
		},
	});
	return marks.map(serializeMark);
};

export const getParentChildrenMarks = async (parentUserId) => {
	const students = await prisma.student.findMany({
		where: { Parent_id: parentUserId },
		select: { Student_id: true, user: { select: { name: true } } },
	});

	return Promise.all(
		students.map(async (s) => {
			const rawMarks = await prisma.marks.findMany({
				where: { Student_id: s.Student_id },
				include: markInclude,
				orderBy: { id: 'desc' },
			});
			return {
				studentId: s.Student_id,
				studentName: s.user?.name || '',
				marks: rawMarks.map(serializeMark),
			};
		})
	);
};

// ── Organisation-level marks (school/academy admin view) ──────────────────────

const orgMarkInclude = {
	student: { include: { user: { select: { id: true, name: true, email: true } } } },
	course: {
		select: {
			id: true, name: true, Course_id: true, Teacher_id: true,
			teacher: { include: { user: { select: { id: true, name: true } } } },
			track: { select: { id: true, Name: true, GradeLevel: true } },
		},
	},
};

export const getOrgMarks = async (orgId, filters = {}) => {
	const { subjectId, gradeLevel, studentName, dateFrom, dateTo, markType, academicYearId } = filters;

	// Build the where clause scoped to this org via the subject → track relation
	const where = {
		course: {
			track: { Org_id: Number(orgId) },
			...(subjectId ? { id: Number(subjectId) } : {}),
			...(gradeLevel ? { track: { Org_id: Number(orgId), GradeLevel: Number(gradeLevel) } } : {}),
		},
		...(academicYearId ? { term: { academicYearId: Number(academicYearId) } } : {}),
		...(markType ? { MarkType: markType } : {}),
		...((dateFrom || dateTo) ? {
			time: {
				...(dateFrom ? { gte: new Date(dateFrom) } : {}),
				...(dateTo   ? { lte: new Date(dateTo)   } : {}),
			},
		} : {}),
		...(studentName ? {
			student: {
				user: { name: { contains: studentName } },
			},
		} : {}),
	};

	const marks = await prisma.marks.findMany({
		where,
		include: orgMarkInclude,
		orderBy: [{ time: 'desc' }, { id: 'desc' }],
		take: 500,
	});

	return marks.map((m) => {
		const { course, ...rest } = m;
		return {
			...rest,
			subject: course ? {
				...course,
				teacher: course.teacher ?? null,
				course: course.track ?? null,
			} : null,
		};
	});
};
