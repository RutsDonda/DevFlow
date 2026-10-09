import ApiError from '../utils/ApiError.js';
import logger from '../utils/logger.js';

const errorHandler = (err, req, res, next) => {
  logger.error(`[Error] ${err.message}\n${err.stack}`);

  let error = err;

  if (!(error instanceof ApiError)) {
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(val => val.message);
      error = ApiError.badRequest('Validation Error', errors);
    } else if (error.name === 'CastError') {
      error = ApiError.badRequest('Invalid resource ID');
    } else if (error.code === 11000) {
      error = new ApiError(409, 'Duplicate field value entered');
    } else {
      const statusCode = error.statusCode || 500;
      const message = process.env.NODE_ENV === 'production' 
        ? 'Internal Server Error' 
        : error.message;
      error = new ApiError(statusCode, message);
      if (process.env.NODE_ENV !== 'production') {
        error.stack = err.stack;
      }
    }
  }

  const response = {
    success: false,
    error: {
      message: error.message,
      ...(error.errors && error.errors.length > 0 && { errors: error.errors })
    }
  };

  res.status(error.statusCode).json(response);
};

export default errorHandler;
