import AppError from '../utils/appError.js';
import {
  checkFeatureAccess,
  checkFeatureLimit,
  resolveOrganizationIdFromUser,
} from '../services/featureService.js';

const resolveOrganizationIdFromRequest = async (req, options = {}) => {
  if (typeof options.resolveOrganizationId === 'function') {
    return options.resolveOrganizationId(req);
  }

  const paramOrgId = Number(req.params?.orgId);

  if (Number.isInteger(paramOrgId) && paramOrgId > 0) {
    return paramOrgId;
  }

  const bodyOrgId = Number(req.body?.organizationId ?? req.body?.orgId);

  if (Number.isInteger(bodyOrgId) && bodyOrgId > 0) {
    return bodyOrgId;
  }

  return resolveOrganizationIdFromUser(req.user);
};

export const checkFeature = (featureKey, options = {}) => {
  return async (req, res, next) => {
    try {
      const organizationId = await resolveOrganizationIdFromRequest(req, options);

      if (!organizationId) {
        return next(new AppError('Unable to resolve organization for feature check', 400));
      }

      const access = await checkFeatureAccess(organizationId, featureKey);

      if (!access.allowed) {
        return res.status(403).json({
          message: 'Feature not available for your current plan',
          data: access,
        });
      }

      if (typeof options.usageResolver === 'function') {
        const currentCount = await options.usageResolver(req, access);
        const limitCheck = await checkFeatureLimit(organizationId, featureKey, currentCount);

        if (!limitCheck.allowed) {
          return res.status(403).json({
            message: 'Feature limit reached for your current plan',
            data: limitCheck,
          });
        }

        req.featureAccess = limitCheck;
      } else {
        req.featureAccess = access;
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };
};