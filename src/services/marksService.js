import prisma from '../utils/prisma.js';
import AppError from '../utils/appError.js';

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
	},
	subject: {
		select: {
			id: true,
			name: true,
			Course_id: true,
			Teacher_id: true,
			course: {
				select: {
					id: true,
					Name: true,
					GradeLevel: true,
					isPaid: true,
					price: true,
				},
			},
		},
	},
};

const ensureTeacherOwnsSubject = async (teacherId, subjectId) => {
	const subject = await prisma.subject.findFirst({
		where: {
			id: subjectId,
			Teacher_id: teacherId,
		},
		select: {
			id: true,
			Teacher_id: true,
			Course_id: true,
			course: {
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

const ensureStudentEligibleForSubject = async (studentId, subject) => {
	const student = await prisma.student.findFirst({
		where: {
			Student_id: studentId,
			OrgId: subject.course.Org_id,
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
			subject: {
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

export const createMark = async (teacherId, data) => {
	const subject = await ensureTeacherOwnsSubject(teacherId, data.Subject_id);
	await ensureStudentExists(data.Student_id);
	await ensureStudentEligibleForSubject(data.Student_id, subject);

	if (Number(data.Numbers) > Number(data.OutOf)) {
		throw new AppError('Numbers cannot be greater than OutOf', 400);
	}

	return prisma.marks.create({
		data: {
			Student_id: data.Student_id,
			Subject_id: data.Subject_id,
			Numbers: data.Numbers,
			OutOf: data.OutOf,
			ExamPercentage: data.ExamPercentage,
			MarkType: data.MarkType,
			time: data.time ? new Date(data.time) : null,
		},
		include: markInclude,
	});
};

export const getMarks = async (teacherId, filters = {}) => {
	return prisma.marks.findMany({
		where: {
			...(filters.Student_id ? { Student_id: filters.Student_id } : {}),
			...(filters.Subject_id ? { Subject_id: filters.Subject_id } : {}),
			subject: {
				Teacher_id: teacherId,
			},
		},
		include: markInclude,
		orderBy: {
			id: 'desc',
		},
	});
};

export const getMarkById = async (teacherId, markId) => {
	return getTeacherMarkOrThrow(teacherId, markId);
};

export const updateMark = async (teacherId, markId, data) => {
	const existingMark = await getTeacherMarkOrThrow(teacherId, markId);
	const mergedNumbers = data.Numbers ?? Number(existingMark.Numbers);
	const mergedOutOf = data.OutOf ?? Number(existingMark.OutOf);

	if (Number(mergedNumbers) > Number(mergedOutOf)) {
		throw new AppError('Numbers cannot be greater than OutOf', 400);
	}

	return prisma.marks.update({
		where: { id: markId },
		data: {
			Numbers: data.Numbers ?? undefined,
			OutOf: data.OutOf ?? undefined,
			ExamPercentage: data.ExamPercentage ?? undefined,
			MarkType: data.MarkType ?? undefined,
			time: Object.prototype.hasOwnProperty.call(data, 'time')
				? (data.time ? new Date(data.time) : null)
				: undefined,
		},
		include: markInclude,
	});
};

export const deleteMark = async (teacherId, markId) => {
	await getTeacherMarkOrThrow(teacherId, markId);

	await prisma.marks.delete({
		where: { id: markId },
	});

	return { id: markId };
};

export const getStudentMarks = async (studentId, filters = {}) => {
	await ensureStudentExists(studentId);

	return prisma.marks.findMany({
		where: {
			Student_id: studentId,
			...(filters.Subject_id ? { Subject_id: filters.Subject_id } : {}),
		},
		include: markInclude,
		orderBy: {
			id: 'desc',
		},
	});
};
