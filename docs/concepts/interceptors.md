# HTTP Interceptors

Angular HTTP interceptors are functions that sit in the request/response pipeline and can transform, log, or handle errors for every HTTP call. The functional interceptor pattern (`HttpInterceptorFn`) takes the request and a `next` handler, allowing you to modify requests before they go out and responses/errors before they reach components. A single error interceptor can catch all `HttpErrorResponse` instances, map them to typed application errors, and surface them consistently — avoiding scattered `catchError` blocks throughout services.

## Official Documentation

- [Angular: HTTP Interceptors](https://angular.dev/guide/http/interceptors)
- [HttpInterceptorFn API](https://angular.dev/api/common/http/HttpInterceptorFn)
