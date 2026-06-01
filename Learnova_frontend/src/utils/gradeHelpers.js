/**
 * Convert grade level number to Arabic ordinal text
 * Examples: 1 → "الأول", 2 → "الثاني", 3 → "الثالث"
 */
export function getArabicOrdinal(num) {
  const ordinals = {
    1: "الأول",
    2: "الثاني",
    3: "الثالث",
    4: "الرابع",
    5: "الخامس",
    6: "السادس",
    7: "السابع",
    8: "الثامن",
    9: "التاسع",
    10: "العاشر",
    11: "الحادي عشر",
    12: "الثاني عشر",
  };
  return ordinals[num] || `${num}`;
}

/**
 * Format grade display based on organization type and language
 * For schools: "Grade 1" (EN) / "الصف الأول" (AR)
 * For academies: "Course Name" (no change)
 */
export function formatGradeName(course, isSchool, isArabic) {
  if (!isSchool) {
    return course?.Name || course?.name || "";
  }

  const gradeLevel = course?.GradeLevel ?? course?.gradeLevel;

  if (isArabic) {
    if (gradeLevel) {
      return `الصف ${getArabicOrdinal(gradeLevel)}`;
    }
    return `الصف ${course?.Name || course?.name || ""}`;
  }

  if (gradeLevel) {
    return `Class ${gradeLevel}`;
  }
  return course?.Name || course?.name || "";
}

/**
 * Get the appropriate label for "Course/Grade" based on org type and language
 */
export function getCourseLabel(isSchool, isArabic) {
  if (isSchool) {
    return isArabic ? "الصفوف" : "Classes";
  }
  return isArabic ? "الكورسات" : "Courses";
}

/**
 * Get the label for a single "Course/Grade" based on org type and language
 */
export function getCourseSingleLabel(isSchool, isArabic) {
  if (isSchool) {
    return isArabic ? "الصف" : "Class";
  }
  return isArabic ? "الكورس" : "Course";
}
