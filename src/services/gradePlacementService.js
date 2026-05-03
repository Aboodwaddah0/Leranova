import AppError from '../utils/appError.js';

export const MAX_GRADE_LEVEL = 12;

export const getGradeCourseName = (gradeLevel) => `Grade ${gradeLevel}`;

const normalizeDateOnly = (date) => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const parseDobInput = (value) => {
  if (!value) {
    return null;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return normalizeDateOnly(value);
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    const excelEpoch = Date.UTC(1899, 11, 30);
    const dob = new Date(excelEpoch + value * 24 * 60 * 60 * 1000);
    if (!Number.isNaN(dob.getTime())) {
      return normalizeDateOnly(dob);
    }
  }

  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) {
    throw new AppError('DOB must be a valid date', 400);
  }

  return normalizeDateOnly(parsed);
};

const buildSchoolReferenceDate = (settings, referenceDate = new Date()) => {
  const year = referenceDate.getUTCFullYear();
  return new Date(Date.UTC(year, Number(settings.schoolYearStartMonth) - 1, Number(settings.schoolYearStartDay)));
};

const toUtcDate = (dobValue) => {
  if (dobValue instanceof Date) {
    if (Number.isNaN(dobValue.getTime())) {
      throw new AppError('DOB must be a valid date', 400);
    }

    return new Date(Date.UTC(dobValue.getUTCFullYear(), dobValue.getUTCMonth(), dobValue.getUTCDate()));
  }

  return new Date(`${dobValue}T00:00:00.000Z`);
};

const calculateAgeAtDate = (dobValue, referenceDate) => {
  const dob = toUtcDate(dobValue);
  let age = referenceDate.getUTCFullYear() - dob.getUTCFullYear();
  const monthDiff = referenceDate.getUTCMonth() - dob.getUTCMonth();
  const dayDiff = referenceDate.getUTCDate() - dob.getUTCDate();

  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age -= 1;
  }

  return age;
};

export const computeAgeFromDob = (dobValue, referenceDate = new Date()) => {
  return calculateAgeAtDate(dobValue, referenceDate);
};

export const computeGradeLevelFromDob = (dobValue, settings, referenceDate = new Date()) => {
  if (!dobValue) {
    throw new AppError('DOB is required to calculate student grade level', 400);
  }

  const reference = buildSchoolReferenceDate(settings, referenceDate);
  const age = calculateAgeAtDate(dobValue, reference);
  const entryAge = Number(settings.entryGradeMinAge || 6);

  const gradeLevel = age - entryAge + 1;
  if (!Number.isInteger(gradeLevel) || gradeLevel < 1) {
    throw new AppError('DOB is outside supported school grade range', 400);
  }

  return Math.min(gradeLevel, MAX_GRADE_LEVEL);
};

export const computeGradeLevelFromBirthYear = (dobValue, settings, referenceDate = new Date()) => {
  if (!dobValue) {
    throw new AppError('DOB is required to calculate student grade level', 400);
  }

  const dob = toUtcDate(dobValue);
  const dobYear = dob.getUTCFullYear();
  const referenceYear = referenceDate.getUTCFullYear();
  
  // Calculate age based on birth year only (ignore month/day to keep cohorts unified)
  const ageByYear = referenceYear - dobYear;
  const entryAge = Number(settings.entryGradeMinAge || 6);

  const gradeLevel = ageByYear - entryAge + 1;
  if (!Number.isInteger(gradeLevel) || gradeLevel < 1) {
    throw new AppError('DOB is outside supported school grade range', 400);
  }

  return Math.min(gradeLevel, MAX_GRADE_LEVEL);
};

export const getPromotionSchoolYear = (settings, now = new Date()) => {
  const reference = buildSchoolReferenceDate(settings, now);
  return now >= reference ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
};

export const getNextGradeLevel = (gradeLevel) => {
  if (gradeLevel >= MAX_GRADE_LEVEL) {
    return null;
  }

  return gradeLevel + 1;
};
