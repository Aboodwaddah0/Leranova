import {
	createOrganization,
	getAllOrganizations,
	getOrganizationById,
	updateOrganization,
	deleteOrganization,
} from '../services/organizationService.js';
import {
	createOrganizationSchema,
	updateOrganizationSchema,
	getOrganizationsQuerySchema,
} from '../validations/organizationValidation.js';
import AppError from '../utils/appError.js';

export const createOrganizationController = async (req, res, next) => {
	try {
		const { error, value } = createOrganizationSchema.validate(req.body);

		if (error) {
			return next(new AppError(error.details[0].message, 400));
		}

		const organization = await createOrganization(value);

		return res.status(201).json({
			message: 'Organization created successfully',
			data: organization,
		});
	} catch (err) {
		next(err);
	}
};

export const getAllOrganizationsController = async (req, res, next) => {
	try {
		const { error, value } = getOrganizationsQuerySchema.validate(req.query);

		if (error) {
			return next(new AppError(error.details[0].message, 400));
		}

		const organizations = await getAllOrganizations(value);

		return res.status(200).json({
			message: 'Organizations fetched successfully',
			data: organizations,
		});
	} catch (err) {
		next(err);
	}
};

export const getOrganizationByIdController = async (req, res, next) => {
	try {
		const organizationId = Number(req.params.id);

		if (Number.isNaN(organizationId)) {
			return next(new AppError('Invalid organization id', 400));
		}

		const organization = await getOrganizationById(organizationId);

		return res.status(200).json({
			message: 'Organization fetched successfully',
			data: organization,
		});
	} catch (err) {
		next(err);
	}
};

export const updateOrganizationController = async (req, res, next) => {
	try {
		const organizationId = Number(req.params.id);

		if (Number.isNaN(organizationId)) {
			return next(new AppError('Invalid organization id', 400));
		}

		const { error, value } = updateOrganizationSchema.validate(req.body);

		if (error) {
			return next(new AppError(error.details[0].message, 400));
		}

		const organization = await updateOrganization(organizationId, value);

		return res.status(200).json({
			message: 'Organization updated successfully',
			data: organization,
		});
	} catch (err) {
		next(err);
	}
};

export const deleteOrganizationController = async (req, res, next) => {
	try {
		const organizationId = Number(req.params.id);

		if (Number.isNaN(organizationId)) {
			return next(new AppError('Invalid organization id', 400));
		}

		const result = await deleteOrganization(organizationId);

		return res.status(200).json({
			message: 'Organization deleted successfully',
			data: result,
		});
	} catch (err) {
		next(err);
	}
};
