export const errorMiddleware = (error, req, res, next) => {
  console.error(error);

  return res.status(400).json({
    message: error.message || 'Something went wrong',
  });
};