import {
	createMark,
	getMarks,
	getMarkById,
	updateMark,
	deleteMark,
	getStudentMarks,
} from '../services/marksService.js';
import {
	createMarkSchema,
	updateMarkSchema,
	markQuerySchema,
} from '../validations/marksValidation.js';
import AppError from '../utils/appError.js';

const parseMarkId = (idParam) => {
	const markId = Number(idParam);
	if (Number.isNaN(markId)) {
		throw new AppError('Invalid mark id', 400);
	}
	return markId;
};

const normalizeStudentId = (payload = {}) => ({
	...payload,
	Student_id: payload.Student_id ?? payload.User_id,
});

export const createMarkController = async (req, res, next) => {
	try {
		const { error, value } = createMarkSchema.validate(req.body);
		if (error) {
			return next(new AppError(error.details[0].message, 400));
		}

		const mark = await createMark(req.user.id, normalizeStudentId(value));

		return res.status(201).json({
			message: 'Mark created successfully',
			data: mark,
		});
	} catch (err) {
		next(err);
	}
};

export const getMarksController = async (req, res, next) => {
	try {
		const { error, value } = markQuerySchema.validate(req.query);
		if (error) {
			return next(new AppError(error.details[0].message, 400));
		}

		const marks = await getMarks(req.user.id, normalizeStudentId(value));

		return res.status(200).json({
			message: 'Marks fetched successfully',
			data: marks,
		});
	} catch (err) {
		next(err);
	}
};

export const getMyMarksController = async (req, res, next) => {
	try {
		const { error, value } = markQuerySchema.validate(req.query);
		if (error) {
			return next(new AppError(error.details[0].message, 400));
		}

		const marks = await getStudentMarks(req.user.id, {
			...(value.Subject_id ? { Subject_id: value.Subject_id } : {}),
		});

		return res.status(200).json({
			message: 'Student marks fetched successfully',
			data: marks,
		});
	} catch (err) {
		next(err);
	}
};

export const getMarkByIdController = async (req, res, next) => {
	try {
		const markId = parseMarkId(req.params.id);
		const mark = await getMarkById(req.user.id, markId);

		return res.status(200).json({
			message: 'Mark fetched successfully',
			data: mark,
		});
	} catch (err) {
		next(err);
	}
};

export const updateMarkController = async (req, res, next) => {
	try {
		const markId = parseMarkId(req.params.id);
		const { error, value } = updateMarkSchema.validate(req.body);
		if (error) {
			return next(new AppError(error.details[0].message, 400));
		}

		const mark = await updateMark(req.user.id, markId, value);

		return res.status(200).json({
			message: 'Mark updated successfully',
			data: mark,
		});
	} catch (err) {
		next(err);
	}
};

export const deleteMarkController = async (req, res, next) => {
	try {
		const markId = parseMarkId(req.params.id);
		const result = await deleteMark(req.user.id, markId);

		return res.status(200).json({
			message: 'Mark deleted successfully',
			data: result,
		});
	} catch (err) {
		next(err);
	}
};
