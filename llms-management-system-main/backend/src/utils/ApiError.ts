export interface ApiFieldError {
  field?: string;
  message: string;
}

export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly errors?: ApiFieldError[];
  public readonly isOperational: boolean;

  constructor(statusCode: number, message: string, errors?: ApiFieldError[]) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true;

    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = "Bad request", errors?: ApiFieldError[]): ApiError {
    return new ApiError(400, message, errors);
  }

  static unauthorized(message = "Unauthorized"): ApiError {
    return new ApiError(401, message);
  }

  static forbidden(message = "Forbidden"): ApiError {
    return new ApiError(403, message);
  }

  static notFound(message = "Resource not found"): ApiError {
    return new ApiError(404, message);
  }

  static conflict(message = "Conflict", errors?: ApiFieldError[]): ApiError {
    return new ApiError(409, message, errors);
  }

  static tooMany(message = "Too many requests"): ApiError {
    return new ApiError(429, message);
  }

  static internal(message = "Internal server error"): ApiError {
    return new ApiError(500, message);
  }
}
