import { validationResult } from 'express-validator';
import { StatusCodes } from 'http-status-codes';

/**
 * Runs after express-validator rules. Collects any validation failures and,
 * if present, throws a single 400 error combining their messages.
 */
export const validationErrorHandler = (req, res, next) => {
  // Gather the results of the validation chain attached to this route
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Join all messages into one readable string (e.g. "A. B.")
    const errorMessages = errors.array().map(err => err.msg);
    const error = new Error(errorMessages.join('. '));
    error.statusCode = StatusCodes.BAD_REQUEST;
    throw error;
  }
  next();
};
