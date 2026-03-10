import jwt from 'jsonwebtoken';
import AppError from '../utils/appError.js';

const authenticate = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return next(new AppError('Access token required', 401));

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    next(new AppError('Invalid or expired token', 403));
  }
};

const authorizeRoles = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    return next(new AppError('Access denied: insufficient permissions', 403));
  }
  next();
};

export { authenticate, authorizeRoles };
