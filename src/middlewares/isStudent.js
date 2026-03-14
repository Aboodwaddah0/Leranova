export const isOrganization = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      message: 'Unauthorized',
    });
  }

  if (req.user.role !== ' STUDENT') {
    return res.status(403).json({
      message: 'Access denied. Organization account required.',
    });
  }

  next();
};