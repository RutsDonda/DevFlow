import { validationResult } from 'express-validator';
import ApiError from '../utils/ApiError.js';

export const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const extractedErrors = errors.array().map(err => ({ [err.path]: err.msg }));
    return next(ApiError.badRequest('Validation failed', extractedErrors));
  }
  next();
};

export default validateRequest;
