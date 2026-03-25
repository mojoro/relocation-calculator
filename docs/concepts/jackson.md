# Jackson

Jackson is the de-facto JSON serialization/deserialization library for the JVM, used by Spring Boot by default. It automatically converts Kotlin data classes to/from JSON based on property names. Jackson uses annotations like `@JsonProperty` for custom field naming and `@JsonIgnore` to exclude fields. With Kotlin, Jackson requires either the `jackson-module-kotlin` dependency (which Spring Boot auto-configures when on the classpath) or the `kotlin-reflect` module to handle default parameter values and non-nullable types correctly.

## Official Documentation

- [Jackson GitHub](https://github.com/FasterXML/jackson)
- [Spring Boot: JSON](https://docs.spring.io/spring-boot/reference/features/json.html)
