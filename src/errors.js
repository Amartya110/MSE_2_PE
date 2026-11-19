export class AppError extends Error {
  constructor(message, { statusCode = 500, code = 'INTERNAL_ERROR' } = {}) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
  }
}

export class ValidationError extends AppError {
  constructor(message) {
    super(message, { statusCode: 400, code: 'VALIDATION_ERROR' });
  }
}

export class NotFoundError extends AppError {
  constructor(message) {
    super(message, { statusCode: 404, code: 'NOT_FOUND' });
  }
}

export class UpstreamError extends AppError {
  constructor(message, { cause } = {}) {
    super(message, { statusCode: 502, code: 'UPSTREAM_ERROR' });
    if (cause) this.cause = cause;
  }
}
