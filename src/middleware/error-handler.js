import { StatusCodes } from 'http-status-codes';

/**
 * Central error handler. Express recognizes it as error middleware because it
 * has 4 args (err, req, res, next). Any error passed to next(err) or thrown in
 * an async handler lands here, so responses stay consistent.
 */
export const errorHandler = (err, req, res, next) => {
  // Fall back to 500 + a generic message when the error has no specifics
  const customError = {
    statusCode: err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR,
    message: err.message || 'Something went wrong. Please try again later.',
  };

  return res.status(customError.statusCode).json({
    success: false,
    message: customError.message,
  });
};
