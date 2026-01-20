export class AppError extends Error {
  readonly code: string;
  readonly details?: string;

  constructor(code: string, message: string, details?: string) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    if (details !== undefined) {
      this.details = details;
    }
  }
}

