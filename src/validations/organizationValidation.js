import Joi from 'joi';

const organizationRoleValues = ['ACADEMY', 'SCHOOL'];
const organizationStatusValues = ['PENDING', 'APPROVED', 'REJECTED'];
const subdomainPattern = /^[a-z0-9-]+$/;
const classRangeSchema = Joi.object({
	startGradeLevel: Joi.number().integer().min(1).max(12).required(),
	endGradeLevel: Joi.number().integer().min(1).max(12).required(),
});

export const createOrganizationSchema = Joi.object({
	Name: Joi.string().max(255).required(),
	subdomain: Joi.string().trim().lowercase().max(63).pattern(subdomainPattern).required(),
	Email: Joi.string().email().max(255).required(),
	password: Joi.string().min(6).required(),
	Phone: Joi.string().max(50).allow('', null),
	Founded: Joi.date().iso().allow(null),
	Address: Joi.string().max(255).allow('', null),
	PhoneNumber: Joi.string().max(50).allow('', null),
	Description: Joi.string().allow('', null),
	Role: Joi.string()
		.valid(...organizationRoleValues, 'Academy', 'School')
		.required(),
	classRanges: Joi.array().items(classRangeSchema).optional().allow(null),
	status: Joi.string()
		.valid(...organizationStatusValues)
		.optional(),
});

export const updateOrganizationSchema = Joi.object({
	Name: Joi.string().max(255),
	subdomain: Joi.string().trim().lowercase().max(63).pattern(subdomainPattern),
	Email: Joi.string().email().max(255),
	password: Joi.string().min(6),
	Phone: Joi.string().max(50).allow('', null),
	Founded: Joi.date().iso().allow(null),
	Address: Joi.string().max(255).allow('', null),
	PhoneNumber: Joi.string().max(50).allow('', null),
	Description: Joi.string().allow('', null),
	Role: Joi.string().valid(...organizationRoleValues, 'Academy', 'School'),
	classRanges: Joi.array().items(classRangeSchema),
	status: Joi.string().valid(...organizationStatusValues),
}).min(1);

export const updateOwnOrganizationSchema = Joi.object({
	Name: Joi.string().max(255),
	subdomain: Joi.string().trim().lowercase().max(63).pattern(subdomainPattern),
	Email: Joi.string().email().max(255),
	password: Joi.string().min(6),
	Phone: Joi.string().max(50).allow('', null),
	Founded: Joi.date().iso().allow(null),
	Address: Joi.string().max(255).allow('', null),
	PhoneNumber: Joi.string().max(50).allow('', null),
	Description: Joi.string().allow('', null),
}).min(1);

export const getOrganizationsQuerySchema = Joi.object({
	skip: Joi.number().integer().min(0).default(0),
	limit: Joi.number().integer().min(1).max(100).default(10),
});
