# Tutorial 03 — Kotlin + Spring Boot

> **Goal:** Understand the Kotlin backend of this project — the language, the framework, the build tool, and how all the pieces connect. By the end, you'll be able to read and explain every file in `backend/`, trace a request from HTTP to JSON response, and talk confidently about Spring Boot in an interview at a Java/Kotlin shop like Europace.

> **Prerequisites:** You know TypeScript and JavaScript well. You have basic HTTP/REST knowledge. You do not need prior experience with Kotlin, Java, Spring, or the JVM.

---

## Why Kotlin?

### The language in 30 seconds

Kotlin is a programming language made by JetBrains — the company behind IntelliJ IDEA, WebStorm, and the rest of the JetBrains IDE family. It compiles to JVM bytecode, which means it runs anywhere Java runs: servers, Android devices, desktop apps. It was designed as a modern replacement for Java — fixing the verbosity, the null pointer exceptions, and the ceremony that have frustrated Java developers for decades.

Google made Kotlin the preferred language for Android development in 2019. On the server side, Spring (the dominant Java framework) added first-class Kotlin support in 2017, and it's been gaining ground ever since. Europace, a Java shop for over a decade, is one of many companies migrating their microservices from Java to Kotlin.

### Kotlin vs Java: the highlight reel

If you've ever seen Java code, you've probably noticed it's... verbose. Here's a comparison that captures the difference.

A simple data class in Java:

```java
// Java — 40+ lines for a simple data holder
public class SalaryRequest {
    private final int grossAnnual;
    private final TaxClass taxClass;
    private final boolean churchTax;
    private final boolean hasChildren;
    private final int childCount;

    public SalaryRequest(int grossAnnual, TaxClass taxClass,
                         boolean churchTax, boolean hasChildren,
                         int childCount) {
        this.grossAnnual = grossAnnual;
        this.taxClass = taxClass;
        this.churchTax = churchTax;
        this.hasChildren = hasChildren;
        this.childCount = childCount;
    }

    public int getGrossAnnual() { return grossAnnual; }
    public TaxClass getTaxClass() { return taxClass; }
    public boolean isChurchTax() { return churchTax; }
    public boolean isHasChildren() { return hasChildren; }
    public int getChildCount() { return childCount; }

    @Override
    public boolean equals(Object o) { /* 15 lines of boilerplate */ }

    @Override
    public int hashCode() { /* 5 lines of boilerplate */ }

    @Override
    public String toString() { /* another 5 lines */ }
}
```

The same thing in Kotlin — from our actual codebase at `backend/src/.../model/SalaryRequest.kt`:

```kotlin
data class SalaryRequest(
    val grossAnnual: Int,
    val taxClass: TaxClass,
    val churchTax: Boolean = false,
    val hasChildren: Boolean = false,
    val childCount: Int = 0
)
```

Six lines. That `data` keyword generates `equals()`, `hashCode()`, `toString()`, `copy()`, and component functions (for destructuring) — all at compile time. The `val` keyword means each property is read-only. The `= false` and `= 0` are default parameter values, so you can construct a `SalaryRequest` without specifying every field.

Beyond data classes, Kotlin's killer features include:

- **Null safety in the type system.** `String` cannot be null. `String?` (with the question mark) can be null. The compiler enforces this — you cannot assign `null` to a `String` variable, and you cannot call methods on a `String?` without first handling the null case. This eliminates the `NullPointerException`, which is the single most common runtime error in Java.
- **Extension functions.** You can add methods to existing classes without inheriting from them. Kotlin's standard library uses this heavily — `"hello".reversed()` works because `reversed()` is an extension function on `String`.
- **Coroutines for async.** Kotlin has first-class coroutine support for asynchronous programming — conceptually similar to `async`/`await` in TypeScript, but built on a different model (suspension rather than promises).
- **Smart casts.** After a type check, the compiler automatically casts the variable — no explicit cast needed.
- **Concise lambdas.** `list.filter { it > 5 }` — if a lambda has one parameter, you can refer to it as `it`.
- **`when` expressions.** Like `switch` but far more powerful — pattern matching, no fall-through, and it's an expression (returns a value).

### Kotlin for a TypeScript developer

If you know TypeScript, Kotlin will feel surprisingly familiar. Many concepts map directly:

| TypeScript | Kotlin | Notes |
|---|---|---|
| `const x = 5` | `val x = 5` | Immutable binding |
| `let x = 5` | `var x = 5` | Mutable binding |
| `interface SalaryRequest { ... }` | `data class SalaryRequest(...)` | But data classes auto-generate `equals`, `hashCode`, `copy`, `toString` |
| `switch (x) { case ... }` | `when (x) { ... }` | `when` is an expression, supports pattern matching, no fall-through |
| `x?.method()` | `x?.method()` | Optional chaining — identical syntax |
| `x ?? fallback` | `x ?: fallback` | Nullish coalescing vs Elvis operator — same concept, different symbol |
| `\`Hello ${name}\`` | `"Hello $name"` or `"Hello ${expr}"` | String templates — Kotlin uses `$` instead of `${}` for simple references |
| `(x: number) => x * 2` | `{ x: Int -> x * 2 }` | Lambda syntax differs, but same idea |
| `export type TaxClass = 'I' \| 'II'` | `enum class TaxClass { I, II }` | Union types vs enum classes |
| No direct equivalent | Extension functions | Like adding methods to existing types without inheritance |

Here's a concrete example. Look at this `when` expression from our `TaxCalculationService.kt`:

```kotlin
val allowance = when (taxClass) {
    TaxClass.I -> GRUNDFREIBETRAG.toDouble()
    TaxClass.II -> GRUNDFREIBETRAG + 4_260.0
    TaxClass.III -> GRUNDFREIBETRAG * 2.0
    TaxClass.IV -> GRUNDFREIBETRAG.toDouble()
    TaxClass.V -> 0.0
    TaxClass.VI -> 0.0
}
```

In TypeScript, you'd write this as a `switch` statement or an object lookup. But notice two things that are better in Kotlin: (1) `when` is an expression that returns a value, so you can assign the result directly to `val allowance`, and (2) the compiler checks exhaustiveness — if you add a new `TaxClass.VII` to the enum and forget to handle it here, the code won't compile. TypeScript's `switch` doesn't do this automatically (you need the `never` trick).

Also note `4_260.0` — Kotlin allows underscores in numeric literals for readability, just like TypeScript. And `.toDouble()` is needed because `GRUNDFREIBETRAG` is an `Int` constant and Kotlin won't silently coerce `Int` to `Double`.

No semicolons, type inference, string templates, null safety — Kotlin feels modern in the same way TypeScript feels modern compared to raw JavaScript.

### The big-picture analogy

**Kotlin is to Java what TypeScript is to JavaScript — a modern layer that fixes the worst pain points while maintaining full compatibility.**

Just as TypeScript compiles to JavaScript and can import any JavaScript library, Kotlin compiles to JVM bytecode and can call any Java library (and vice versa). This means companies don't have to rewrite their entire codebase to adopt Kotlin. They can convert one file at a time, and old Java code and new Kotlin code coexist in the same project.

This is exactly what Europace is doing. They have years of Java microservices. They're not throwing that away — they're writing new services in Kotlin and gradually converting existing ones. The 100% interoperability means the transition is low-risk.

---

## Spring Boot Explained

### Spring: the framework

Spring is the dominant framework for building backend applications in the JVM ecosystem. It's been around since 2003, and today it powers a huge percentage of enterprise Java/Kotlin backends — banks, insurance companies, e-commerce platforms, government systems.

Think of Spring as the JVM world's equivalent of Express.js, but at a much larger scale. Where Express gives you routing and middleware and lets you bring everything else yourself, Spring gives you routing, middleware, [[dependency-injection|dependency injection]], database access, security, caching, messaging, scheduling, health checks, metrics, and more — all designed to work together.

### Spring Boot: the "just works" layer

Here's the catch with Spring: in its raw form, it required enormous amounts of XML configuration. Dozens of XML files specifying how beans (objects managed by Spring) should be created, wired together, and configured. It was powerful but tedious.

**Spring Boot** (launched in 2014) is an opinionated layer on top of Spring that eliminates that configuration hell. It does this through a concept called **auto-configuration**: Spring Boot looks at what libraries are on your classpath (your dependencies) and configures itself accordingly.

For example: when you add `spring-boot-starter-web` to your dependencies (as we have), Spring Boot automatically:

1. Starts an embedded Tomcat web server on port 8080
2. Configures Jackson for JSON serialization/deserialization
3. Sets up HTTP request routing
4. Configures error handling with sensible defaults
5. Enables content negotiation

You didn't ask for any of this explicitly. You added one dependency, and Spring Boot inferred that you want a web application and configured everything needed. This is the **Convention over Configuration** philosophy — Spring Boot makes sensible assumptions about what you want, and you only override what's different.

**The analogy:** If Kotlin is the language and Spring is the framework library, Spring Boot is the "just works" mode. Think of how Express has `express-generator` to scaffold a project with sensible defaults — except Spring Boot took that idea and made it the default way everyone uses Spring. You almost never use raw Spring anymore; Spring Boot *is* how you use Spring.

### The entry point

Our application's entry point is `backend/src/.../RelocationApplication.kt`:

```kotlin
@SpringBootApplication
class RelocationApplication

fun main(args: Array<String>) {
    runApplication<RelocationApplication>(*args)
}
```

That's it. The entire application bootstrap is four lines. The `@SpringBootApplication` annotation is actually three annotations combined:

1. **`@Configuration`** — marks the class as a source of bean definitions (more on beans below)
2. **`@EnableAutoConfiguration`** — activates Spring Boot's auto-configuration magic
3. **`@ComponentScan`** — tells Spring to scan the current package and sub-packages for annotated classes (controllers, services, etc.)

When `runApplication<RelocationApplication>(*args)` executes, Spring Boot:
1. Scans `com.johnmoorman.relocation` and all sub-packages for annotated classes
2. Finds `SalaryController` (annotated with `@RestController`) and `TaxCalculationService` (annotated with `@Service`)
3. Creates instances of each, wiring dependencies together automatically
4. Starts an embedded Tomcat server on port 8080 (configured in `application.yml`)
5. Registers the HTTP route from `SalaryController`

The `*args` syntax is Kotlin's spread operator — it unpacks the array into individual arguments, similar to `...args` in JavaScript/TypeScript.

---

## The Layered Architecture

### Controller, Service, Model

Spring applications follow a standard layered architecture: **Controller -> Service -> Model**. This is the pattern you'll find in every Spring codebase at Europace and beyond.

```
HTTP Request
    |
    v
+-------------------+
|    Controller      |   Thin layer — receives HTTP, delegates to service, returns HTTP
|  SalaryController  |
+-------------------+
    |
    v
+-------------------+
|     Service        |   Business logic — calculations, rules, orchestration
| TaxCalculation-    |
| Service            |
+-------------------+
    |
    v
+-------------------+
|      Model         |   Data classes — request/response shapes, enums
|  SalaryRequest     |
|  SalaryResponse    |
|  TaxClass          |
+-------------------+
```

Let's look at each layer in our project.

### Model layer (`model/`)

The model layer contains data classes that represent your domain — requests, responses, enums. No business logic, no HTTP awareness. Just data shapes.

Our project has three model files:

**`TaxClass.kt`** — the German tax class enum:

```kotlin
enum class TaxClass {
    I, II, III, IV, V, VI
}
```

This is a Kotlin `enum class` — similar to a TypeScript union type (`type TaxClass = 'I' | 'II' | ...`), but with full type safety and the ability to attach properties and methods to each variant.

**`SalaryRequest.kt`** — the incoming request shape:

```kotlin
data class SalaryRequest(
    @field:NotNull(message = "Gross annual salary is required")
    @field:Min(value = 0, message = "Salary must be non-negative")
    @field:Max(value = 10_000_000, message = "Salary exceeds maximum")
    val grossAnnual: Int,

    @field:NotNull(message = "Tax class is required")
    val taxClass: TaxClass,

    val churchTax: Boolean = false,
    val hasChildren: Boolean = false,

    @field:Min(value = 0, message = "Child count must be non-negative")
    val childCount: Int = 0
)
```

This mirrors the TypeScript interface in `shared/api-contracts/salary.ts` exactly. The `@field:Min`, `@field:Max`, and `@field:NotNull` annotations are Jakarta Bean Validation constraints — they tell Spring to reject requests with invalid values before the request even reaches the service layer. The `@field:` prefix is a Kotlin-specific detail: it tells the compiler to put the annotation on the backing field rather than the constructor parameter, which is what validation frameworks expect.

**`SalaryResponse.kt`** — the outgoing response shape:

```kotlin
data class SalaryResponse(
    val grossMonthly: Double,
    val netMonthly: Double,
    val incomeTax: Double,
    val solidaritySurcharge: Double,
    val healthInsurance: Double,
    val pensionInsurance: Double,
    val unemploymentInsurance: Double,
    val nursingCareInsurance: Double,
    val churchTaxAmount: Double?,
    val totalDeductions: Double
)
```

Notice `churchTaxAmount: Double?` — the question mark means this field is nullable. When a user doesn't pay church tax, this comes back as `null` in the JSON, which maps to `number | null` on the TypeScript side. Kotlin's type system makes the nullability explicit at the type level — you can't accidentally forget to handle the null case.

### Service layer (`service/`)

The service layer is where the real work happens. Business logic, calculations, rules, orchestration — it all lives here. Services are annotated with `@Service` and are injected into controllers.

Our `TaxCalculationService.kt` implements simplified German tax rules. Here's the public interface:

```kotlin
@Service
class TaxCalculationService {

    companion object {
        const val GRUNDFREIBETRAG = 12_096
        const val HEALTH_INSURANCE_RATE = 0.0815
        const val PENSION_INSURANCE_RATE = 0.093
        // ... more constants
    }

    fun calculate(request: SalaryRequest): SalaryResponse {
        val grossAnnual = request.grossAnnual.toDouble()
        val grossMonthly = grossAnnual / 12.0

        val taxableIncome = calculateTaxableIncome(grossAnnual, request.taxClass)
        val annualIncomeTax = calculateIncomeTax(taxableIncome, request.taxClass)
        // ... social insurance, church tax, soli ...

        return SalaryResponse(
            grossMonthly = roundToTwoDecimals(grossMonthly),
            netMonthly = roundToTwoDecimals(netMonthly),
            // ... all the breakdown fields
        )
    }

    private fun calculateTaxableIncome(...): Double { ... }
    private fun calculateIncomeTax(...): Double { ... }
    private fun calculateProgressiveTax(...): Double { ... }
    private fun calculateSoli(...): Double { ... }
}
```

A few Kotlin features to notice:

- **`companion object`** — Kotlin's replacement for Java's `static`. Constants and shared utility methods go inside a `companion object` block. In TypeScript terms, it's like `static` members on a class, or constants exported alongside a class.
- **`const val`** — a compile-time constant. Unlike `val` (which is a runtime immutable), `const val` is inlined by the compiler. Think of it as a true constant, like `#define` in C or a `const enum` value in TypeScript.
- **Named arguments** — `SalaryResponse(grossMonthly = ..., netMonthly = ...)`. Kotlin lets you name arguments at the call site, making the code self-documenting. This is especially valuable for data classes with many fields — you never have to worry about argument order.
- **`private fun`** — private methods are genuinely private (not the TypeScript `private` which is only a compile-time check). The internal calculation methods are implementation details hidden from the rest of the application.

The key design insight: the service is **pure Kotlin**. There's no Spring code, no HTTP code, no framework dependency in the calculation logic. The only Spring-specific thing is the `@Service` annotation on the class. This means you can test the tax calculation in isolation — give it a `SalaryRequest`, check the `SalaryResponse`, no HTTP server needed.

### Controller layer (`controller/`)

The controller is the HTTP interface — it receives requests, delegates to the service, and returns responses. Controllers should be thin. Here's our entire `SalaryController.kt`:

```kotlin
@RestController
@RequestMapping("/api/v1")
class SalaryController(private val taxService: TaxCalculationService) {

    @PostMapping("/salary/calculate")
    fun calculateNetSalary(
        @Valid @RequestBody request: SalaryRequest
    ): ResponseEntity<SalaryResponse> {
        val response = taxService.calculate(request)
        return ResponseEntity.ok(response)
    }
}
```

This is 10 lines of actual code. Let's trace what happens when a POST request hits `/api/v1/salary/calculate`:

1. Spring's router matches the URL to `calculateNetSalary` (via `@PostMapping("/salary/calculate")` under `@RequestMapping("/api/v1")`)
2. `@RequestBody` tells Spring to read the JSON body and deserialize it into a `SalaryRequest` data class using Jackson
3. `@Valid` tells Spring to run the validation annotations on `SalaryRequest` (`@Min`, `@Max`, `@NotNull`) — if validation fails, Spring returns a 400 Bad Request automatically
4. The controller delegates to `taxService.calculate(request)` — one line
5. `ResponseEntity.ok(response)` wraps the result in an HTTP 200 response, and Spring serializes the `SalaryResponse` back to JSON

The constructor parameter `private val taxService: TaxCalculationService` is how [[dependency-injection|dependency injection]] works in Spring with Kotlin — more on this in a dedicated section below.

### Why this layering matters

Three practical benefits:

1. **Testability.** You can test `TaxCalculationService` by calling `calculate()` directly — no HTTP server, no request parsing, no serialization. Unit tests are fast and focused. You can test `SalaryController` separately with a mocked service to verify HTTP behavior.

2. **Reusability.** The same service can be used by multiple controllers, a scheduled job, a message queue consumer, or a CLI tool. The business logic isn't trapped inside an HTTP handler.

3. **Separation of concerns.** HTTP concerns (routing, serialization, validation) live in the controller. Business rules (tax brackets, insurance rates) live in the service. Data shapes (requests, responses) live in the model. Each layer has one job.

**The Angular parallel:** If you've read [[tutorials/01-angular-scaffold|Tutorial 01]], this maps directly to Angular's structure. Angular components are like Spring controllers — they handle the UI layer but delegate logic to services. Angular services are like Spring services — reusable, injectable, where the real work happens. The pattern is the same; the transport layer is different (DOM events vs HTTP requests).

**The Europace pattern:** At Europace, each microservice follows this exact structure. The mortgage calculation logic lives in services, not controllers. Controllers are just the HTTP interface. When Europace needs to expose the same calculation via a REST API and a message queue, the service works for both — only the "controller" layer differs.

---

## Gradle Kotlin DSL

### What Gradle is

Gradle is the build tool for JVM projects — the equivalent of npm/package.json for the JavaScript world. It handles dependency management, compilation, testing, packaging, and running your application.

The JVM ecosystem has two main build tools: Maven (XML-based, older, very rigid) and Gradle (code-based, newer, more flexible). Spring Boot projects overwhelmingly use Gradle these days.

### `build.gradle.kts` walkthrough

Our build file lives at `backend/build.gradle.kts`. The `.kts` extension means it's written in Kotlin (Kotlin Script), not Groovy (which uses the `.gradle` extension). This means you get full IDE support — autocompletion, type checking, refactoring — in your build file. Let's walk through it section by section.

**Plugins:**

```kotlin
plugins {
    kotlin("jvm") version "2.1.10"
    kotlin("plugin.spring") version "2.1.10"
    id("org.springframework.boot") version "3.4.4"
    id("io.spring.dependency-management") version "1.1.7"
}
```

This is like the `scripts` and build tool configuration in `package.json`. Each plugin adds capabilities:

- `kotlin("jvm")` — the Kotlin compiler plugin. Compiles `.kt` files to JVM bytecode.
- `kotlin("plugin.spring")` — makes Kotlin classes `open` by default for Spring (Kotlin classes are `final` by default, but Spring needs to subclass them for proxying). Without this plugin, you'd have to manually add `open` to every Spring-managed class.
- `org.springframework.boot` — adds the `bootRun` task (starts the app), `bootJar` task (packages it), and auto-configuration support.
- `io.spring.dependency-management` — manages dependency versions so you don't have to specify them individually. When you say `implementation("org.springframework.boot:spring-boot-starter-web")`, this plugin knows which version of Tomcat, Jackson, and other transitive dependencies are compatible with Spring Boot 3.4.4.

**Project metadata:**

```kotlin
group = "com.johnmoorman"
version = "0.0.1-SNAPSHOT"
```

Like `name` and `version` in `package.json`. The `group` is the Maven coordinate namespace — typically a reversed domain name. `SNAPSHOT` means this is a development version, not a release.

**Java toolchain:**

```kotlin
java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(21)
    }
}
```

This specifies that the project requires JDK 21. Gradle will use the locally installed JDK 21, or it can auto-download one. This ensures everyone on the team builds with the same JDK version — similar to an `.nvmrc` file for Node.js, but enforced by the build tool.

**Repositories:**

```kotlin
repositories {
    mavenCentral()
}
```

This tells Gradle where to download dependencies from. Maven Central is the npm registry of the JVM world — the default public repository where most libraries are published.

**Dependencies:**

```kotlin
dependencies {
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("com.fasterxml.jackson.module:jackson-module-kotlin")
    implementation("org.jetbrains.kotlin:kotlin-reflect")
    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation("org.jetbrains.kotlin:kotlin-test-junit5")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}
```

This maps directly to `package.json`:

| Gradle | npm equivalent | Purpose |
|---|---|---|
| `implementation(...)` | `dependencies` | Runtime dependency |
| `testImplementation(...)` | `devDependencies` | Test-only dependency |
| `testRuntimeOnly(...)` | `devDependencies` (but only needed at test runtime) | Needed to run tests, not to compile them |

Our dependencies:

- `spring-boot-starter-web` — the "I want a web server" starter. Pulls in Tomcat, Spring MVC, Jackson, and everything needed for a REST API.
- `jackson-module-kotlin` — teaches Jackson (the JSON library) about Kotlin features: data classes, nullable types, default parameter values. Without this, Jackson wouldn't know how to construct Kotlin data classes from JSON.
- `kotlin-reflect` — Kotlin reflection library, needed by Spring for inspecting Kotlin classes at runtime.
- `spring-boot-starter-test` — test utilities including JUnit 5, MockMvc, assertion libraries.
- `kotlin-test-junit5` — Kotlin-friendly test assertions for JUnit 5.

**Kotlin compiler options:**

```kotlin
kotlin {
    compilerOptions {
        freeCompilerArgs.addAll("-Xjsr305=strict")
    }
}
```

The `-Xjsr305=strict` flag makes the Kotlin compiler treat Java's `@Nullable` and `@NonNull` annotations strictly. This means when Kotlin code calls Java code annotated with `@NonNull`, the Kotlin compiler treats the return type as non-nullable (`String`, not `String?`). This is important for Spring interop — Spring's Java APIs are annotated with nullability information, and this flag makes Kotlin trust those annotations.

**Test configuration:**

```kotlin
tasks.withType<Test> {
    useJUnitPlatform()
}
```

Tells Gradle to use JUnit 5's platform runner for tests (as opposed to the older JUnit 4 runner).

### The Gradle Wrapper

You may have noticed `gradlew` (and `gradlew.bat` for Windows) in the `backend/` directory. This is the **Gradle Wrapper** — a shell script that downloads and runs the exact version of Gradle specified in `gradle/wrapper/gradle-wrapper.properties`:

```properties
distributionUrl=https\://services.gradle.org/distributions/gradle-8.13-bin.zip
```

This means you never need Gradle installed globally. Running `./gradlew bootRun` will:

1. Check if Gradle 8.13 is cached locally
2. If not, download it
3. Run the `bootRun` task with the correct version

This is conceptually similar to `npx` — it ensures everyone uses the same tool version regardless of what's installed on their machine. In practice, you should always use `./gradlew` instead of a globally installed `gradle` command.

---

## Annotations Deep Dive

Kotlin annotations look like `@AnnotationName` — syntactically identical to TypeScript/JavaScript decorators (`@Component` in Angular, for example). In Spring, annotations are the primary way you configure the framework. Let's walk through every annotation used in our project.

### `@SpringBootApplication`

```kotlin
@SpringBootApplication
class RelocationApplication
```

The entry point annotation. It combines three annotations into one:
- `@Configuration` — "this class can define beans"
- `@EnableAutoConfiguration` — "scan my dependencies and configure Spring automatically"
- `@ComponentScan` — "scan this package and sub-packages for annotated classes"

You put this on one class, and Spring Boot discovers everything else.

### `@RestController`

```kotlin
@RestController
@RequestMapping("/api/v1")
class SalaryController(...)
```

Marks a class as an HTTP controller that returns data (JSON) rather than HTML views. This is itself a combination of two annotations:
- `@Controller` — registers the class as a Spring-managed bean that handles HTTP requests
- `@ResponseBody` — tells Spring to serialize return values to JSON (via Jackson) rather than looking for an HTML template to render

### `@RequestMapping("/api/v1")`

Sets a base URL prefix for all endpoints in the controller. Every method-level mapping (`@PostMapping`, `@GetMapping`, etc.) is relative to this prefix. So `@PostMapping("/salary/calculate")` inside a class annotated with `@RequestMapping("/api/v1")` creates the endpoint `POST /api/v1/salary/calculate`.

### `@PostMapping("/salary/calculate")`

Maps HTTP POST requests to this specific method. Spring also provides `@GetMapping`, `@PutMapping`, `@DeleteMapping`, and `@PatchMapping`. Each is a shortcut for `@RequestMapping(method = RequestMethod.POST, path = "/salary/calculate")`.

### `@RequestBody`

```kotlin
fun calculateNetSalary(@Valid @RequestBody request: SalaryRequest)
```

Tells Spring: "Read the HTTP request body, parse it as JSON, and deserialize it into this Kotlin type." Without `@RequestBody`, Spring would try to bind URL query parameters to the object instead. Jackson handles the JSON-to-Kotlin conversion automatically (more on that in the Jackson section below).

### `@Valid`

Triggers Jakarta Bean Validation on the request object. Spring will inspect `SalaryRequest` for validation annotations (`@Min`, `@Max`, `@NotNull`) and return a 400 Bad Request with error details if any constraints are violated. This means the controller method is only called with valid data — you don't need defensive validation code in your business logic.

### `@Service`

```kotlin
@Service
class TaxCalculationService { ... }
```

Marks a class as a Spring-managed bean — specifically, a service-layer bean. Spring creates one instance of this class (a singleton by default) and makes it available for [[dependency-injection|dependency injection]]. When another class asks for a `TaxCalculationService`, Spring provides this single shared instance.

Technically, `@Service` is just a specialization of `@Component` — they do the same thing. But using `@Service` communicates intent: this class contains business logic, not HTTP handling (that's `@Controller`) or data access (that's `@Repository`).

### `@Configuration` + `@Bean`

```kotlin
@Configuration
class CorsConfig {
    @Bean
    fun corsFilter(): CorsFilter {
        // ...
    }
}
```

`@Configuration` marks a class as a source of bean definitions. `@Bean` marks a method whose return value should be registered as a Spring-managed bean. This is how you create beans when you can't annotate the class itself (because it comes from a third-party library, for example).

In our CORS config, we're creating a `CorsFilter` bean — Spring didn't auto-configure one because CORS settings are application-specific. The `@Bean` method tells Spring: "Create a `CorsFilter` with these settings and make it available for injection."

### Validation annotations: `@NotNull`, `@Min`, `@Max`

```kotlin
@field:NotNull(message = "Gross annual salary is required")
@field:Min(value = 0, message = "Salary must be non-negative")
@field:Max(value = 10_000_000, message = "Salary exceeds maximum")
val grossAnnual: Int
```

These come from Jakarta Bean Validation (formerly Java Bean Validation). They declare constraints on fields. The `@field:` prefix is Kotlin-specific — it directs the annotation to the backing Java field rather than the Kotlin constructor parameter, which is where validation frameworks look for annotations.

### The TypeScript parallel

If you've used Angular, annotations will feel natural — they're conceptually identical to Angular decorators:

| Spring annotation | Angular decorator | Purpose |
|---|---|---|
| `@RestController` | `@Component` | "This class is framework-managed" |
| `@Service` | `@Injectable` | "This class can be injected" |
| `@RequestMapping` | `@Component({ selector: '...' })` | "How to find/route to this" |
| `@PostMapping` | `@HostListener('click')` | "Which event/request triggers this method" |
| `@Bean` | `{ provide: ..., useFactory: ... }` | "Create and register this thing" |

The mental model is the same: annotations/decorators are metadata that the framework reads to decide what to do with your classes and methods.

---

## Dependency Injection in Spring

### How it works

[[dependency-injection|Dependency injection]] is a core concept in both Angular and Spring. The idea is the same: instead of a class creating its own dependencies, the framework provides them.

Look at our controller's constructor:

```kotlin
class SalaryController(private val taxService: TaxCalculationService)
```

When Spring starts up and sees that `SalaryController` needs to be created (because it's annotated with `@RestController`), it inspects the constructor and sees it needs a `TaxCalculationService`. Spring then looks in its registry, finds the `TaxCalculationService` bean (because it's annotated with `@Service`), and passes it in.

No `@Inject` annotation needed. No `@Autowired`. In Kotlin with Spring, if a class has a single constructor, all parameters are automatically resolved via DI. This is called **constructor injection**, and it's the recommended approach in modern Spring.

### Compare to Angular

This is remarkably similar to Angular's DI system:

```typescript
// Angular — same pattern
@Component({ ... })
export class SalaryCalculatorComponent {
  private salaryService = inject(SalaryService);
}
```

Or with the older constructor injection style:

```typescript
// Angular — constructor injection style
@Component({ ... })
export class SalaryCalculatorComponent {
  constructor(private salaryService: SalaryService) {}
}
```

Both frameworks:
1. Scan for annotated/decorated classes at startup
2. Build a dependency graph
3. Create instances in the right order
4. Inject dependencies into constructors

The main difference: Angular uses a hierarchical injector (components can override services at different levels of the tree), while Spring uses a flat container by default (one singleton per type, application-wide). Spring does support scoped beans (request scope, session scope), but singleton is the default and is what you'll see in most code.

**Interview talking point:** "Constructor injection in Spring works just like Angular's DI — both frameworks autowire dependencies based on types. I've used DI in Angular with `inject()` and TypeScript constructor parameters, so Spring's approach feels natural. The concept is the same: declare what you need, let the framework provide it."

See [[dependency-injection]] for a detailed comparison of DI across Angular and Spring, including scope, testing, and advanced patterns.

---

## CORS Configuration

### What CORS is

CORS (Cross-Origin Resource Sharing) is a browser security mechanism. When your frontend JavaScript makes an HTTP request to a different **origin** (different protocol, domain, or port), the browser blocks it by default. This prevents malicious websites from making API calls to your bank using your cookies.

In our setup:
- Angular dev server: `http://localhost:4200`
- Spring Boot server: `http://localhost:8080`

Same hostname (`localhost`), but different ports — and different ports mean different origins. Without CORS configuration, the browser would block every API call from the Angular app to the Spring Boot backend.

### Our CORS configuration

Here's `backend/src/.../config/CorsConfig.kt` in full:

```kotlin
@Configuration
class CorsConfig {

    @Bean
    fun corsFilter(): CorsFilter {
        val config = CorsConfiguration().apply {
            allowedOrigins = listOf(
                "http://localhost:4200",
                "http://localhost:4000"
            )
            allowedMethods = listOf("GET", "POST", "PUT", "DELETE", "OPTIONS")
            allowedHeaders = listOf("*")
            allowCredentials = true
            maxAge = 3600
        }

        val source = UrlBasedCorsConfigurationSource().apply {
            registerCorsConfiguration("/api/**", config)
        }

        return CorsFilter(source)
    }
}
```

Let's break this down:

- **`@Configuration`** — tells Spring this class provides bean definitions
- **`@Bean`** — the `corsFilter()` method returns an object that Spring should manage
- **`CorsConfiguration().apply { ... }`** — Kotlin's `apply` function. It's a scope function that lets you configure an object inside a block. Inside `apply`, `this` refers to the `CorsConfiguration` instance. This is cleaner than chaining setters: `config.setAllowedOrigins(...)`, `config.setAllowedMethods(...)`, etc. The `apply` pattern is idiomatic Kotlin.
- **`allowedOrigins`** — which origins (frontends) are allowed to make requests. We allow both `localhost:4200` (Angular's default dev server port) and `localhost:4000` (an alternative).
- **`allowedMethods`** — which HTTP methods are permitted
- **`allowedHeaders = listOf("*")`** — allow any request headers
- **`allowCredentials = true`** — allow cookies and authorization headers
- **`maxAge = 3600`** — the browser can cache the CORS preflight response for one hour (3600 seconds) before checking again
- **`registerCorsConfiguration("/api/**", config)`** — apply this CORS config to all URLs matching `/api/**`

In production, you'd replace `localhost` origins with your actual domain(s). The wildcard `"*"` for allowed headers is convenient in development but should be restricted in production.

See [[cors]] for a deeper explanation of CORS mechanics, preflight requests, and production configuration.

---

## Jackson and JSON Serialization

### What Jackson does

Jackson is the JSON library that Spring Boot uses — it's the JVM equivalent of `JSON.parse()` and `JSON.stringify()`, but far more sophisticated. When a request comes in with `Content-Type: application/json`, Spring uses Jackson to deserialize the JSON string into a Kotlin object. When a controller returns an object, Spring uses Jackson to serialize it back to JSON.

You never call Jackson directly. Spring Boot auto-configures it the moment you add `spring-boot-starter-web` to your dependencies.

### The Kotlin module

There's one critical dependency in our `build.gradle.kts`:

```kotlin
implementation("com.fasterxml.jackson.module:jackson-module-kotlin")
```

Without this module, Jackson doesn't understand Kotlin's language features. Here's what `jackson-module-kotlin` does:

1. **Data class deserialization.** Kotlin data classes don't have a no-argument constructor (required by default Jackson). The module teaches Jackson to use the primary constructor and match JSON fields to constructor parameters by name.

2. **Nullable types.** Jackson doesn't know that `Double?` means "this can be null." The module maps Kotlin's nullability information so that Jackson correctly serializes `null` fields and rejects non-null fields that receive `null`.

3. **Default parameter values.** When our `SalaryRequest` has `val churchTax: Boolean = false`, and the incoming JSON omits `churchTax`, Jackson (with the Kotlin module) uses the default value `false` instead of throwing an error.

### How it maps to TypeScript

The serialization is seamless because Kotlin's `camelCase` property names map directly to `camelCase` JSON keys — which is exactly what our TypeScript interfaces expect:

```kotlin
// Kotlin data class (backend)
data class SalaryResponse(
    val grossMonthly: Double,      // -> "grossMonthly": 5000.0
    val netMonthly: Double,        // -> "netMonthly": 3245.67
    val churchTaxAmount: Double?,  // -> "churchTaxAmount": null
    // ...
)
```

```typescript
// TypeScript interface (frontend)
interface SalaryResponse {
  grossMonthly: number;       // <- "grossMonthly": 5000.0
  netMonthly: number;         // <- "netMonthly": 3245.67
  churchTaxAmount: number | null; // <- "churchTaxAmount": null
}
```

The field names match. The types are compatible (`Double` -> `number`, `Double?` -> `number | null`, `Int` -> `number`, `Boolean` -> `boolean`). The JSON is the bridge between the two type systems, and Jackson handles the Kotlin side automatically.

This means there's no manual mapping, no transformation layer, no adapter code. You define a data class in Kotlin, define a matching interface in TypeScript, and the serialization just works. See `shared/api-contracts/salary.ts` and `shared/api-contracts/salary.kt` for our explicit type contracts between the two sides.

**Interview talking point:** "The typed contract between TypeScript interfaces and Kotlin data classes ensures frontend-backend type safety. Jackson handles the serialization automatically, and because both Kotlin and TypeScript use camelCase by default, the JSON field names match without any configuration."

---

## Tracing a Request End to End

Let's put it all together. Here's exactly what happens when the Angular frontend sends a salary calculation request:

**1. Angular sends the request**
```typescript
this.http.post<SalaryResponse>('/api/v1/salary/calculate', {
  grossAnnual: 60000,
  taxClass: 'I',
  churchTax: false,
  hasChildren: false,
  childCount: 0
});
```

**2. The browser sends an HTTP POST**
```
POST /api/v1/salary/calculate HTTP/1.1
Host: localhost:8080
Content-Type: application/json

{"grossAnnual":60000,"taxClass":"I","churchTax":false,"hasChildren":false,"childCount":0}
```

**3. Spring's CORS filter checks the origin.** The request came from `http://localhost:4200`, which is in our `allowedOrigins` list. The request passes.

**4. Spring's router matches the URL.** `POST /api/v1/salary/calculate` matches `@RequestMapping("/api/v1")` + `@PostMapping("/salary/calculate")` on `SalaryController.calculateNetSalary()`.

**5. Jackson deserializes the body.** The `@RequestBody` annotation tells Spring to read the JSON body and deserialize it into a `SalaryRequest` data class. Jackson maps `"grossAnnual": 60000` to `val grossAnnual: Int = 60000`, `"taxClass": "I"` to `val taxClass: TaxClass = TaxClass.I`, and so on.

**6. Validation runs.** The `@Valid` annotation triggers Bean Validation. `grossAnnual = 60000` passes `@Min(0)` and `@Max(10_000_000)`. All constraints pass, so the request proceeds.

**7. The controller delegates to the service.**
```kotlin
val response = taxService.calculate(request)
```
One line. The controller doesn't know or care how tax calculation works.

**8. The service calculates.**
- Taxable income: 60,000 - 12,096 (Grundfreibetrag) = 47,904
- Annual income tax: computed via the four-zone progressive formula
- Social insurance: health, pension, unemployment, nursing care (each capped at their respective ceilings)
- Solidarity surcharge: 5.5% of income tax (if above threshold)
- Church tax: null (not requested)
- All values divided by 12 for monthly amounts

**9. The service returns a `SalaryResponse`.**
```kotlin
return SalaryResponse(
    grossMonthly = 5000.0,
    netMonthly = 3245.67,
    incomeTax = 756.42,
    // ...
)
```

**10. The controller wraps it in `ResponseEntity.ok()`**, which sets the HTTP status to 200.

**11. Jackson serializes the response** back to JSON.

**12. Spring sends the HTTP response.**
```
HTTP/1.1 200 OK
Content-Type: application/json

{"grossMonthly":5000.0,"netMonthly":3245.67,"incomeTax":756.42,...}
```

**13. Angular receives the JSON**, and `HttpClient` automatically deserializes it into a TypeScript `SalaryResponse` object. The component updates the UI.

The entire round trip — from Angular form submission to rendered salary breakdown — involves zero manual JSON parsing, zero type casting, and zero hand-written serialization code. The framework handles all of it.

---

## Try It Yourself

### 1. Start the backend

If you have JDK 21 installed:

```bash
cd backend && ./gradlew bootRun
```

The first run will download Gradle 8.13 and all dependencies (this can take a few minutes). Subsequent runs start in seconds. You'll see output ending with something like:

```
Started RelocationApplication in 2.3 seconds
```

### 2. Hit the endpoint

In another terminal, send a request with curl:

```bash
curl -X POST http://localhost:8080/api/v1/salary/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "grossAnnual": 60000,
    "taxClass": "I",
    "churchTax": false,
    "hasChildren": false,
    "childCount": 0
  }'
```

You should get a JSON response with the monthly breakdown — gross, net, and every individual deduction.

### 3. Try different scenarios

Change the request to see how results vary:

- **Tax Class III** (married, sole earner): change `"taxClass": "III"` — notice the significantly lower income tax due to the double allowance and splitting method
- **With church tax**: set `"churchTax": true` — a new `churchTaxAmount` field appears (it was `null` before)
- **With children**: set `"hasChildren": true, "childCount": 2` — nursing care insurance decreases
- **High earner**: set `"grossAnnual": 300000` — the 45% "Reichensteuer" bracket kicks in, and social insurance contributions are capped at their ceilings

### 4. Trigger a validation error

Send invalid input:

```bash
curl -X POST http://localhost:8080/api/v1/salary/calculate \
  -H "Content-Type: application/json" \
  -d '{"grossAnnual": -5000, "taxClass": "I"}'
```

Spring returns a 400 Bad Request because `-5000` violates `@Min(value = 0)`. The validation caught it before it reached the service layer.

### 5. Read the service code

Open `backend/src/main/kotlin/com/johnmoorman/relocation/service/TaxCalculationService.kt` and trace the `calculate()` method step by step. Follow `calculateTaxableIncome()`, then `calculateIncomeTax()`, then `calculateProgressiveTax()`. Notice how the four-zone progressive tax formula in `calculateProgressiveTax()` matches the comment block that explains the German tax brackets. The math is the domain logic — this is the kind of code you'd discuss in a technical interview about microservice design.

---

## The Project Directory Structure

Here's the complete backend layout:

```
backend/
  build.gradle.kts            # Build config — dependencies, plugins, JDK version
  settings.gradle.kts          # Project name
  gradlew                      # Gradle Wrapper script (Linux/Mac)
  gradlew.bat                  # Gradle Wrapper script (Windows)
  gradle/
    wrapper/
      gradle-wrapper.properties # Which Gradle version to use (8.13)
  src/
    main/
      kotlin/
        com/johnmoorman/relocation/
          RelocationApplication.kt         # Entry point — @SpringBootApplication
          config/
            CorsConfig.kt                  # CORS setup for frontend access
          controller/
            SalaryController.kt            # HTTP endpoint — thin, delegates to service
          model/
            SalaryRequest.kt               # Request data class with validation
            SalaryResponse.kt              # Response data class
            TaxClass.kt                    # German tax class enum (I–VI)
          service/
            TaxCalculationService.kt       # Business logic — tax/insurance calculation
      resources/
        application.yml                    # Server config (port 8080)
```

The package structure follows Java/Kotlin conventions: `com.johnmoorman.relocation` is the base package, with sub-packages for each architectural layer. This isn't just convention — `@ComponentScan` uses this package structure to discover annotated classes. If you put a `@Service` class in a package that isn't under `com.johnmoorman.relocation`, Spring won't find it.

---

## Interview Talking Points

Keep these in your back pocket for Europace interviews:

- **On Kotlin:** "Kotlin and TypeScript share a lot of DNA — null safety, type inference, data classes vs interfaces, expression-based control flow. Coming from TypeScript, the transition was natural. The `when` expression is like a switch that returns values and checks exhaustiveness. The null safety is like strict mode for null — the compiler catches it, not the runtime."

- **On Spring Boot:** "Spring Boot's auto-configuration means I can focus on domain logic. The tax calculation service is pure Kotlin — no framework code in the business logic. Spring Boot handles the HTTP server, JSON serialization, validation, and dependency injection so that my service only deals with tax math."

- **On the layered architecture:** "Controller-Service-Model is the standard Spring pattern. Controllers are thin — they handle HTTP concerns and delegate to services. Services contain business logic and are framework-agnostic. This means I can test the tax calculation by calling the service directly, without starting an HTTP server."

- **On DI:** "Constructor injection in Spring works just like Angular's DI — both frameworks autowire dependencies based on types. In Kotlin, you don't even need an `@Autowired` annotation. Spring sees the constructor parameter type, finds a matching bean, and injects it. I used the same pattern in Angular with `inject()` and constructor parameters."

- **On type safety across the stack:** "The typed contract between TypeScript interfaces and Kotlin data classes ensures frontend-backend type safety. Jackson handles the serialization automatically, and because both languages use camelCase, the JSON fields match without configuration. Our shared API contracts in `shared/api-contracts/` make this explicit."

- **On Gradle:** "Gradle with the Kotlin DSL gives you a type-safe build file with IDE autocompletion. The Gradle Wrapper ensures everyone uses the same version — like having an `.nvmrc` but for the build tool itself. Spring Boot's dependency management plugin handles version compatibility, so I only specify the starter dependency and it pulls in the right versions of everything."

---

## See Also

- [[kotlin]] -- Kotlin language overview
- [[spring-boot]] -- Spring Boot framework
- [[dependency-injection]] -- DI compared across Angular and Spring
- [[gradle-kotlin-dsl]] -- build configuration
- [[jackson]] -- JSON serialization
- [[data-classes]] -- Kotlin data classes vs Java POJOs
- [[cors]] -- Cross-Origin Resource Sharing
- [[tutorials/01-angular-scaffold]] -- Angular scaffold (for DI comparison)
- [[tutorials/07-spring-services]] -- deep dive on the tax calculation service (coming later)
- [[tutorials/04-reactive-forms]] -- next: the Angular frontend that calls this backend
