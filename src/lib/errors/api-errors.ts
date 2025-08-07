export class APIError extends Error {
  constructor(
    public type: string,
    public message: string,
    public statusCode: number,
    public details?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export class ValidationError extends APIError {
  constructor(message: string, details?: any) {
    super('VALIDATION_ERROR', message, 400 ,details);
  }
}

export class NotFoundError extends APIError {
    constructor(message: string, details?: any) {
        super("NOT_FOUND", message, 404, details);
    }
}

export class DatabaseError extends APIError {
  constructor(message: string, statusCode = 500) {
    super('DATABASE_ERROR', message, statusCode);
  }
}

export class ConnectionError extends APIError {
  constructor(message: string) {
    super('CONNECTION_ERROR', message, 503);
  }
}