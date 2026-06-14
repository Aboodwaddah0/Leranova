import Joi from 'joi';

const validateNumbersWithinOutOf = (value, helpers) => {
	if (typeof value.Numbers === 'number' && typeof value.OutOf === 'number' && value.Numbers > value.OutOf) {
		return helpers.message('Numbers cannot be greater than OutOf');
	}

	return value;
};

export const createMarkSchema = Joi.object({
	Student_id: Joi.number().integer().positive(),
	User_id: Joi.number().integer().positive(),
	Subject_id: Joi.number().integer().positive().required(),
	Numbers: Joi.number().min(0).precision(2).required(),
	OutOf: Joi.number().positive().precision(2).default(100),
	ExamPercentage: Joi.number().min(0).max(100).precision(2).default(100),
	MarkType: Joi.string().trim().max(50).default('EXAM'),
	componentId: Joi.number().integer().positive().allow(null),
	time: Joi.date().iso().optional().allow(null),
})
	.custom(validateNumbersWithinOutOf)
	.xor('Student_id', 'User_id')
	.or('Student_id', 'User_id');

export const updateMarkSchema = Joi.object({
	Numbers: Joi.number().min(0).precision(2),
	OutOf: Joi.number().positive().precision(2),
	ExamPercentage: Joi.number().min(0).max(100).precision(2),
	MarkType: Joi.string().trim().max(50),
	componentId: Joi.number().integer().positive().allow(null),
	time: Joi.date().iso().optional().allow(null),
})
	.custom(validateNumbersWithinOutOf)
	.min(1);

export const markQuerySchema = Joi.object({
	Student_id: Joi.number().integer().positive(),
	User_id: Joi.number().integer().positive(),
	Subject_id: Joi.number().integer().positive(),
	academicYearId: Joi.number().integer().positive(),
});
