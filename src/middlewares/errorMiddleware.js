export const errorMiddleware = (error, req, res, next) => {
  console.error(error);

  const statusCode = error.statusCode || 500;
  const message =
    error.statusCode && error.message
      ? error.message
      : 'Something went wrong';

  return res.status(statusCode).json({
    message,
  });
};
