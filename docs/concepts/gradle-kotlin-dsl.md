# Gradle Kotlin DSL

Gradle is the build tool for the Spring Boot backend. The Kotlin DSL (`build.gradle.kts` instead of `build.gradle`) lets you write build scripts in Kotlin rather than Groovy, providing IDE autocomplete, type safety, and refactoring support. The `plugins {}` block applies the Spring Boot plugin, Spring Dependency Management plugin, and Kotlin-specific plugins (`kotlin("jvm")`, `kotlin("plugin.spring")`). `kotlin("plugin.spring")` is critical — it makes Spring's `@Component` classes `open` automatically, since Kotlin classes are `final` by default.

## Official Documentation

- [Gradle Kotlin DSL Primer](https://docs.gradle.org/current/userguide/kotlin_dsl.html)
- [Spring Boot Gradle Plugin](https://docs.spring.io/spring-boot/gradle-plugin/)
