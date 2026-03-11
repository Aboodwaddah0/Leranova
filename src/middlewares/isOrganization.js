export const orgAuthMiddleware = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      message: 'Unauthorized',
    });
  }

  if (req.user.accountType !== 'organization') {
    return res.status(403).json({
      message: 'Access denied. Organization account required.',
    });
  }

  next();
};