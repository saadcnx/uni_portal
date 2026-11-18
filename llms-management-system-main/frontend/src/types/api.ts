export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface ApiFieldError {
  field: string;
  message: string;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: PaginationMeta;
}

export interface ApiErrorBody {
  success: false;
  message: string;
  requestId?: string;
  errors?: ApiFieldError[];
}

export type ApiResponse<T> = ApiSuccess<T> | ApiErrorBody;

export class ApiError extends Error {
  statusCode: number;
  errors?: ApiFieldError[];
  requestId?: string;

  constructor(
    message: string,
    statusCode: number = 500,
    errors?: ApiFieldError[],
    requestId?: string
  ) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.errors = errors;
    this.requestId = requestId;
  }
}
