import prisma from '../utils/prisma.js';
import AppError from '../utils/appError.js';
import { ensureSchoolClassesForOrg, normalizeClassRanges } from './schoolClassService.js';

const DEFAULT_SETTINGS = {
  schoolYearStartMonth: 9,
  schoolYearStartDay: 1,
  promotionMonth: 9,
  promotionDay: 1,
  entryGradeMinAge: 6,
  passThresholdPercentage: 50,
  minSubjectPassPercentage: 50,
  requireAllSubjectsPass: true,
  classRanges: [],
};

const ensureValidMonthDay = (month, day, fieldPrefix) => {
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new AppError(`${fieldPrefix} month must be between 1 and 12`, 400);
  }

  if (!Number.isInteger(day) || day < 1 || day > 31) {
    throw new AppError(`${fieldPrefix} day must be between 1 and 31`, 400);
  }
};

const normalizeSettingsPayload = (payload = {}) => {
  const normalized = {
    schoolYearStartMonth: payload.schoolYearStartMonth === undefined ? undefined : Number(payload.schoolYearStartMonth),
    schoolYearStartDay: payload.schoolYearStartDay === undefined ? undefined : Number(payload.schoolYearStartDay),
    promotionMonth: payload.promotionMonth === undefined ? undefined : Number(payload.promotionMonth),
    promotionDay: payload.promotionDay === undefined ? undefined : Number(payload.promotionDay),
    entryGradeMinAge: payload.entryGradeMinAge === undefined ? undefined : Number(payload.entryGradeMinAge),
    passThresholdPercentage:
      payload.passThresholdPercentage === undefined ? undefined : Number(payload.passThresholdPercentage),
    minSubjectPassPercentage:
      payload.minSubjectPassPercentage === undefined ? undefined : Number(payload.minSubjectPassPercentage),
    requireAllSubjectsPass:
      payload.requireAllSubjectsPass === undefined ? undefined : Boolean(payload.requireAllSubjectsPass),
    classRanges: payload.classRanges === undefined ? undefined : normalizeClassRanges(payload.classRanges),
  };

  if (normalized.schoolYearStartMonth !== undefined || normalized.schoolYearStartDay !== undefined) {
    ensureValidMonthDay(
      normalized.schoolYearStartMonth ?? DEFAULT_SETTINGS.schoolYearStartMonth,
      normalized.schoolYearStartDay ?? DEFAULT_SETTINGS.schoolYearStartDay,
      'School year start',
    );
  }

  if (normalized.promotionMonth !== undefined || normalized.promotionDay !== undefined) {
    ensureValidMonthDay(
      normalized.promotionMonth ?? DEFAULT_SETTINGS.promotionMonth,
      normalized.promotionDay ?? DEFAULT_SETTINGS.promotionDay,
      'Promotion date',
    );
  }

  if (normalized.entryGradeMinAge !== undefined) {
    if (!Number.isInteger(normalized.entryGradeMinAge) || normalized.entryGradeMinAge < 4 || normalized.entryGradeMinAge > 10) {
      throw new AppError('entryGradeMinAge must be an integer between 4 and 10', 400);
    }
  }

  if (normalized.passThresholdPercentage !== undefined) {
    if (Number.isNaN(normalized.passThresholdPercentage) || normalized.passThresholdPercentage < 0 || normalized.passThresholdPercentage > 100) {
      throw new AppError('passThresholdPercentage must be between 0 and 100', 400);
    }
  }

  if (normalized.minSubjectPassPercentage !== undefined) {
    if (
      Number.isNaN(normalized.minSubjectPassPercentage) ||
      normalized.minSubjectPassPercentage < 0 ||
      normalized.minSubjectPassPercentage > 100
    ) {
      throw new AppError('minSubjectPassPercentage must be between 0 and 100', 400);
    }
  }

  return normalized;
};

export const getOrCreateSchoolSettings = async (orgId, tx = prisma) => {
  const existing = await tx.organization_school_settings.findUnique({
    where: { OrgId: orgId },
  });

  if (existing) {
    return existing;
  }

  return tx.organization_school_settings.create({
    data: {
      OrgId: orgId,
      ...DEFAULT_SETTINGS,
    },
  });
};

export const getSchoolSettingsByOrg = async (orgId) => {
  return getOrCreateSchoolSettings(orgId);
};

export const updateSchoolSettingsByOrg = async (orgId, payload, tx = prisma) => {
  const normalized = normalizeSettingsPayload(payload);

  await getOrCreateSchoolSettings(orgId, tx);

  const updated = await tx.organization_school_settings.update({
    where: { OrgId: orgId },
    data: normalized,
  });

  await ensureSchoolClassesForOrg(orgId, updated.classRanges ?? [], tx);

  return updated;
};

export const isPromotionDueToday = (settings, now = new Date()) => {
  const month = now.getUTCMonth() + 1;
  const day = now.getUTCDate();
  return month === Number(settings.promotionMonth) && day === Number(settings.promotionDay);
};

export const toSchoolSettingsDto = (settings) => ({
  orgId: settings.OrgId,
  schoolYearStartMonth: settings.schoolYearStartMonth,
  schoolYearStartDay: settings.schoolYearStartDay,
  promotionMonth: settings.promotionMonth,
  promotionDay: settings.promotionDay,
  entryGradeMinAge: settings.entryGradeMinAge,
  passThresholdPercentage: Number(settings.passThresholdPercentage),
  minSubjectPassPercentage: Number(settings.minSubjectPassPercentage),
  requireAllSubjectsPass: settings.requireAllSubjectsPass,
  classRanges: Array.isArray(settings.classRanges) ? settings.classRanges : [],
  createdAt: settings.createdAt,
  updatedAt: settings.updatedAt,
});
