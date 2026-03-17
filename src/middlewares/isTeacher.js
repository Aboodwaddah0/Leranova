export const isTeacher = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      message: 'Unauthorized',
    });
  }

  if (req.user.role !== 'TEACHER') {
    return res.status(403).json({
      message: 'Access denied. Teacher account required.',
    });
  }

  next();
};