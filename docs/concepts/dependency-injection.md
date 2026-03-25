# Dependency Injection

Dependency Injection (DI) is a design pattern where a class receives its dependencies from an external source rather than creating them itself. In Angular, `inject(SomeService)` or constructor injection provides service instances managed by Angular's injector — services decorated with `@Injectable({ providedIn: 'root' })` are singletons. In Spring, `@Service` classes are injected into `@RestController` constructors automatically by Spring's application context.

## Official Documentation

- [Angular: Dependency Injection](https://angular.dev/guide/di)
- [Spring Boot: Dependency Injection](https://docs.spring.io/spring-framework/reference/core/beans/dependencies/factory-collaborators.html)
