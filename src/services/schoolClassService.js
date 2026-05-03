import prisma from '../utils/prisma.js';
import AppError from '../utils/appError.js';
import { MAX_GRADE_LEVEL } from './gradePlacementService.js';
import { ensureCourseForGradeLevel } from './courseService.js';

const normalizeGradeLevel = (value, fieldName) => {
  const gradeLevel = Number(value);

  if (!Number.isInteger(gradeLevel) || gradeLevel < 1 || gradeLevel > MAX_GRADE_LEVEL) {
    throw new AppError(`${fieldName} must be an integer between 1 and ${MAX_GRADE_LEVEL}`, 400);
  }

  return gradeLevel;
};

const parseRangeText = (value) => {
  const text = String(value || '').trim();

  if (!text) {
    return null;
  }

  const match = text.match(/^\s*(\d+)\s*[-–—]\s*(\d+)\s*$/);
  if (!match) {
    throw new AppError(`Invalid class range: ${text}`, 400);
  }

  return {
    startGradeLevel: Number(match[1]),
    endGradeLevel: Number(match[2]),
  };
};

export const normalizeClassRanges = (value) => {
  if (value === undefined || value === null || value === '') {
    return [];
  }

  const rawRanges = Array.isArray(value) ? value : String(value).split(/[,;\n]+/);
  const normalizedRanges = [];
  const seen = new Set();

  for (const rawRange of rawRanges) {
    const parsedRange = typeof rawRange === 'string'
      ? parseRangeText(rawRange)
      : rawRange && typeof rawRange === 'object'
        ? {
            startGradeLevel: rawRange.startGradeLevel ?? rawRange.start ?? rawRange.from,
            endGradeLevel: rawRange.endGradeLevel ?? rawRange.end ?? rawRange.to,
          }
        : null;

    if (!parsedRange) {
      continue;
    }

    const startGradeLevel = normalizeGradeLevel(parsedRange.startGradeLevel, 'startGradeLevel');
    const endGradeLevel = normalizeGradeLevel(parsedRange.endGradeLevel, 'endGradeLevel');

    if (startGradeLevel > endGradeLevel) {
      throw new AppError('Each class range must have startGradeLevel less than or equal to endGradeLevel', 400);
    }

    const key = `${startGradeLevel}-${endGradeLevel}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    normalizedRanges.push({ startGradeLevel, endGradeLevel });
  }

  return normalizedRanges;
};

export const expandGradeLevelsFromRanges = (classRanges) => {
  const normalizedRanges = normalizeClassRanges(classRanges);
  const gradeLevels = new Set();

  for (const classRange of normalizedRanges) {
    for (let gradeLevel = classRange.startGradeLevel; gradeLevel <= classRange.endGradeLevel; gradeLevel += 1) {
      gradeLevels.add(gradeLevel);
    }
  }

  return Array.from(gradeLevels).sort((left, right) => left - right);
};

export const ensureSchoolClassesForOrg = async (orgId, classRanges, tx = prisma) => {
  const gradeLevels = expandGradeLevelsFromRanges(classRanges);
  const courses = [];

  for (const gradeLevel of gradeLevels) {
    const course = await ensureCourseForGradeLevel(orgId, gradeLevel, tx);
    courses.push(course);
  }

  return courses;
};