import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { ApiError } from '../models/api-error.model';

/**
 * Global HTTP error interceptor.
 * Catches HTTP errors and transforms them into typed ApiError objects.
 * Logs errors for debugging and re-throws for component-level handling.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let message = 'An unexpected error occurred';

      if (error.status === 0) {
        message = 'Unable to connect to the server. Is the backend running?';
      } else if (error.status === 400) {
        message = error.error?.message || 'Invalid request data';
      } else if (error.status === 404) {
        message = 'The requested resource was not found';
      } else if (error.status >= 500) {
        message = 'Server error. Please try again later.';
      }

      console.error(`[HTTP Error] ${error.status} ${req.method} ${req.url}: ${message}`);

      return throwError(() => ({
        status: error.status,
        message,
        timestamp: new Date().toISOString(),
      } as ApiError));
    })
  );
};
