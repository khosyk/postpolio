import { ZodError } from 'zod';

export function isZodError(error: unknown): error is ZodError {
  return error instanceof ZodError;
}

export function getErrorMessage(error: unknown): string {
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    const maybeMessage = (error as { message?: unknown }).message;
    if (typeof maybeMessage === 'string') {
      return maybeMessage;
    }
  }
  return 'Unknown error';
}
