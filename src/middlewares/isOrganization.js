export const isOrganization = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      message: 'Unauthorized',
    });
  }

  const role = String(req.user.role || '').trim().toUpperCase();

  if (!['ACADEMY', 'SCHOOL'].includes(role)) {
    return res.status(403).json({
      message: 'Access denied. Organization account required.',
    });
  }

  next();
};