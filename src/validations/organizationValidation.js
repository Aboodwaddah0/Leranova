import Joi from 'joi';

const organizationRoleValues = ['ACADEMY', 'SCHOOL'];
const organizationStatusValues = ['PENDING', 'APPROVED', 'REJECTED'];

export const createOrganizationSchema = Joi.object({
	Name: Joi.string().max(255).required(),
	Email: Joi.string().email().max(255).required(),
	password: Joi.string().min(6).required(),
	Phone: Joi.string().max(50).allow('', null),
	Founded: Joi.date().iso().allow(null),
	Address: Joi.string().max(255).allow('', null),
	PhoneNumber: Joi.string().max(50).allow('', null),
	Description: Joi.string().allow('', null),
	Role: Joi.string()
		.valid(...organizationRoleValues)
		.required(),
	status: Joi.string()
		.valid(...organizationStatusValues)
		.optional(),
});

export const updateOrganizationSchema = Joi.object({
	Name: Joi.string().max(255),
	Email: Joi.string().email().max(255),
	password: Joi.string().min(6),
	Phone: Joi.string().max(50).allow('', null),
	Founded: Joi.date().iso().allow(null),
	Address: Joi.string().max(255).allow('', null),
	PhoneNumber: Joi.string().max(50).allow('', null),
	Description: Joi.string().allow('', null),
	Role: Joi.string().valid(...organizationRoleValues),
	status: Joi.string().valid(...organizationStatusValues),
}).min(1);

export const getOrganizationsQuerySchema = Joi.object({
	skip: Joi.number().integer().min(0).default(0),
	limit: Joi.number().integer().min(1).max(100).default(10),
});
