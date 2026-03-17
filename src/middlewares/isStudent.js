export const isStudent = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      message: 'Unauthorized',
    });
  }

  if (req.user.role !== 'STUDENT') {
    return res.status(403).json({
      message: 'Access denied. Student account required.',
    });
  }

  next();
};