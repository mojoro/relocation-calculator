# Angular HttpClient

`HttpClient` is Angular's built-in HTTP client, provided via `provideHttpClient()` in `app.config.ts`. It returns `Observable<T>` typed responses and supports interceptors for cross-cutting concerns like auth headers and error handling. Modern Angular uses functional interceptors with `withInterceptors([...])` rather than class-based `HttpInterceptor`. Generic typing (`http.post<SalaryResponse>(...)`) ensures the response is cast to the correct TypeScript type without manual casting.

## Official Documentation

- [Angular: HTTP Client](https://angular.dev/guide/http)
- [provideHttpClient API](https://angular.dev/api/common/http/provideHttpClient)
