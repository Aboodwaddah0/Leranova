/**
 * Middleware to allow both STUDENT and ORGANIZATION (ACADEMY/SCHOOL) roles
 * Used for comment creation and deletion operations
 * Blocks TEACHER role
 */
export const isStudentOrOrganization = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      message: 'Unauthorized',
    });
  }

  const role = String(req.user.role || '').trim().toUpperCase();

  // Allow STUDENT role or organization roles (ACADEMY, SCHOOL)
  if (!['STUDENT', 'ACADEMY', 'SCHOOL'].includes(role)) {
    return res.status(403).json({
      message: 'Access denied. Student or Organization account required.',
    });
  }

  next();
};
