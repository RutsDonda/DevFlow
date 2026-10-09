class ApiError extends Error {
  constructor(statusCode, message, errors = []) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    this.errors = errors;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(msg, errors) {
    return new ApiError(400, msg || 'Bad Request', errors);
  }

  static unauthorized(msg) {
    return new ApiError(401, msg || 'Unauthorized');
  }

  static notFound(msg) {
    return new ApiError(404, msg || 'Not Found');
  }

  static internal(msg) {
    return new ApiError(500, msg || 'Internal Server Error');
  }
}

export { ApiError };
export default ApiError;
