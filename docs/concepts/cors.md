# CORS (Cross-Origin Resource Sharing)

CORS is a browser security mechanism that blocks web pages from making HTTP requests to a different domain than the one that served the page. When Angular (localhost:4200) calls a Spring Boot backend (localhost:8080), the browser enforces CORS by sending a preflight `OPTIONS` request. The backend must respond with `Access-Control-Allow-Origin` headers to permit the request. In Spring Boot, CORS is configured with `@CrossOrigin` on a controller or globally via a `WebMvcConfigurer` bean.

## Official Documentation

- [MDN: CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [Spring Boot CORS Configuration](https://spring.io/guides/gs/rest-service-cors/)
