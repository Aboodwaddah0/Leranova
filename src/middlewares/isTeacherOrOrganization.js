export const isTeacherOrOrganization = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      message: 'Unauthorized',
    });
  }

  if (!['TEACHER', 'ACADEMY', 'SCHOOL', 'STUDENT'].includes(req.user.role)) {
    return res.status(403).json({
      message: 'Access denied. Teacher, student, or organization account required.',
    });
  }

  next();
};