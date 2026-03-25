# Berlin Relocation Calculator — Learning Guide

> This guide is your home base for understanding every technology and pattern
> used in this project. Start here, follow the links, and build a mental model
> of how Angular, Kotlin, Spring Boot, and the web platform work together.
>
> Every `[[bracketed term]]` links to a deeper explanation. Think of this as
> your personal Wikipedia for this tech stack.

---

## Table of Contents

1. [Why This Project Exists](#1-why-this-project-exists)
2. [Architecture Overview](#2-architecture-overview)
3. [Request Lifecycle (End-to-End Walkthrough)](#3-request-lifecycle-end-to-end-walkthrough)
4. [Technology Rationale](#4-technology-rationale)
5. [Best Practices](#5-best-practices)
6. [Jargon Glossary](#6-jargon-glossary)
7. [Tutorial Index (Learning Path)](#7-tutorial-index-learning-path)
8. [Interview Preparation](#8-interview-preparation)

---

## 1. Why This Project Exists

This is a **portfolio piece for a Europace AG interview**. Europace builds Germany's largest platform for mortgage and building finance — processing over EUR 100 billion in transactions annually. Their product teams build white-label mortgage calculators ("Rechner") using **Angular** on the frontend and **Java/Kotlin** microservices on the backend.

The role John is interviewing for sits on the **#passt product team**, which builds a mortgage affordability calculator. Martin (the PM) specifically said they want someone who *understands the backend well and can potentially own the frontend-backend integration*.

This project demonstrates exactly that:

- **Angular proficiency** using the same patterns found in Europace's Rechner source code — [[standalone-components]], [[reactive-forms]] with Validators, [[signals]], [[onpush|OnPush change detection]], and the [[design-tokens]] architecture
- **Kotlin/Spring Boot backend competence** — a real tax calculation API, not a mock
- **Clean integration layer** — typed contracts mirrored between TypeScript and Kotlin, error interceptors, explicit loading/error/success states
- **Authentic domain knowledge** — John actually relocated to Berlin. The Steuerklassen, Sozialversicherung deductions, and Anmeldung procedures in this app come from lived experience, not a textbook

See [[europace-patterns]] for a detailed analysis of how each pattern in this project maps to Europace's production code.

---

## 2. Architecture Overview

### Monorepo Structure

The project lives in a single repository with three directories:

| Directory | Purpose | Language | Runtime |
|---|---|---|---|
| `frontend/` | User interface — forms, display, interaction | TypeScript | Browser (Angular 21) |
| `backend/` | Business logic — tax calculation, cost estimation | Kotlin | JVM (Spring Boot 3.4) |
| `shared/` | [[api-contracts]] — the data contract between front and back | TypeScript + Kotlin | Both (source of truth) |

### How the Pieces Connect

```
Browser ──→ Angular (localhost:4200) ──HTTP──→ Spring Boot (localhost:8080)
                │                                       │
                ├── Reactive Forms                      ├── SalaryController
                │   └── FormGroup + Validators          │   └── @PostMapping /api/v1/salary/calculate
                │                                       │
                ├── Signals (state management)          ├── TaxCalculationService
                │   ├── result: signal<SalaryResponse>  │   ├── Progressive income tax (4-zone formula)
                │   ├── isCalculating: signal<boolean>   │   ├── Social insurance contributions
                │   └── error: signal<ApiError>          │   └── Soli, church tax, nursing care
                │                                       │
                ├── HttpClient + Interceptors            ├── CostEstimationService
                │   ├── SalaryCalculationService         │   └── Berlin Bezirk cost data
                │   └── CostEstimationService            │
                │   └── errorInterceptor (global)       │
                │                                       ├── Jackson (JSON serialization)
                ├── Design Tokens (CSS)                 │   └── Kotlin data classes ↔ JSON
                │   ├── --reloc-sys-*  (primitives)     │
                │   ├── --reloc-ref-*  (semantic)        └── CORS Config
                │   └── --reloc-comp-* (component)          └── Allows localhost:4200
                │
                └── Tailwind CSS (utility classes)
```

### Frontend in More Detail

The Angular app uses a **feature-based folder structure**:

```
frontend/src/app/
├── core/                           # Singletons — services, interceptors, models
│   ├── services/
│   │   ├── salary-calculation.service.ts
│   │   └── cost-estimation.service.ts
│   ├── interceptors/
│   │   └── error.interceptor.ts
│   └── models/
│       ├── salary.model.ts
│       ├── cost.model.ts
│       └── api-error.model.ts
├── shared/                         # Shared components
│   └── components/
│       ├── step-indicator/         # Wizard navigation with visited-step tracking
│       └── currency-input/         # Formatted EUR currency input
├── features/                       # Each feature is a lazy-loaded route
│   ├── salary-calculator/          # Step 1: Salary input + net breakdown
│   │   ├── salary-calculator.component.ts    (container)
│   │   ├── salary-form.component.ts          (smart component — form + API)
│   │   ├── salary-form.component.html
│   │   ├── salary-breakdown.component.ts     (presentational — displays result)
│   │   └── salary-breakdown.component.html
│   ├── cost-estimator/             # Step 2: Cost of living by Bezirk
│   │   ├── cost-estimator.component.ts       (container + form)
│   │   └── cost-breakdown.component.ts       (presentational)
│   ├── neighborhood-explorer/      # Step 3: Neighborhood profiles
│   │   └── neighborhood-explorer.component.ts
│   └── visa-checklist/             # Step 4: Relocation admin checklist
│       ├── visa-checklist.component.ts
│       └── visa-checklist.component.html
├── app.config.ts                   # Providers: router, HTTP, interceptors, German locale
├── app.routes.ts                   # Lazy-loaded routes for each step
└── app.ts                          # Root component (shell + navigation)
```

Key architectural decisions:

- **No NgModules.** Every component is [[standalone-components|standalone]] — it declares its own imports and can be lazy-loaded individually. This is Angular's modern best practice (NgModules are legacy).
- **All routes are lazy-loaded.** The `loadComponent` syntax in `app.routes.ts` means each feature only downloads when the user navigates to it. See [[lazy-loading]].
- **Smart vs presentational components.** `SalaryFormComponent` handles logic (form, API calls, state). `SalaryBreakdownComponent` is pure display — it takes a `result` input and renders it. See [[component-architecture]].

### Backend in More Detail

```
backend/src/main/kotlin/com/johnmoorman/relocation/
├── RelocationApplication.kt        # @SpringBootApplication — the entry point
├── controller/
│   ├── SalaryController.kt         # REST endpoint: POST /api/v1/salary/calculate
│   └── CostController.kt           # REST endpoint: GET /api/v1/costs/estimate
├── service/
│   ├── TaxCalculationService.kt    # German tax calculation business logic
│   └── CostEstimationService.kt    # Berlin living cost estimation
├── model/
│   ├── SalaryRequest.kt            # Kotlin data class (mirrors TypeScript interface)
│   ├── SalaryResponse.kt           # Kotlin data class (mirrors TypeScript interface)
│   ├── CostEstimate.kt             # Kotlin data class for cost breakdown
│   ├── Neighborhood.kt             # Kotlin data class for Bezirk profiles
│   └── TaxClass.kt                 # Enum: I, II, III, IV, V, VI
└── config/
    ├── CorsConfig.kt               # Allows Angular dev server to call the API
    └── GlobalExceptionHandler.kt   # @RestControllerAdvice for structured error responses
```

Key architectural decisions:

- **Layered architecture.** Controller receives HTTP, delegates to service, service returns data. The controller never contains business logic. See [[spring-boot]].
- **Kotlin data classes as DTOs.** `SalaryRequest` and `SalaryResponse` are [[data-classes]] — they define the API shape in a few lines, with automatic `equals()`, `hashCode()`, `toString()`, and `copy()`.
- **Validation at the boundary.** The controller uses `@Valid` on the request body — [[jackson]] deserializes the JSON, then Bean Validation checks constraints before the service ever sees the data.

---

## 3. Request Lifecycle (End-to-End Walkthrough)

Here is exactly what happens when a user enters a salary in the calculator. Every step links to the concept that powers it.

### Step-by-step: User types "60000" in the gross salary field

**1. FormControl captures the input**

The `<input>` element is bound to `salaryForm.controls.grossAnnual` via the `formControlName` directive. When the user types "60000", the [[reactive-forms|FormControl]] updates its internal value. Unlike template-driven forms (which use `ngModel` and two-way binding), reactive forms flow in one direction: from the control object to the template and back.

**2. `valueChanges` emits the new form state**

Every `FormGroup` has a `valueChanges` property — an [[rxjs|Observable]] that emits the full form value whenever any control changes. Our form group emits:

```json
{ "grossAnnual": 60000, "taxClass": "I", "churchTax": false, "hasChildren": false, "childCount": 0 }
```

**3. The emission is debounced by 400ms**

We don't want to fire an HTTP request on every keystroke (typing "60000" would fire 5 requests). The `debounceTime(400)` operator from [[rxjs]] waits until the user stops typing for 400 milliseconds before passing the value downstream. If the user types another character within that window, the timer resets.

**4. The form is validated**

The `filter()` operator checks `this.salaryForm.valid`. Our form has three validators on `grossAnnual`: `Validators.required`, `Validators.min(0)`, and `Validators.max(10_000_000)`. If any fails, the emission is dropped and no HTTP request fires. See [[form-validation]].

**5. `isCalculating` signal is set to `true`**

The `tap()` operator sets `this.isCalculating.set(true)` and clears any previous error. This is a [[signals|Signal]] — a fine-grained reactive primitive. The template reads `isCalculating()` and shows a spinner. Because the component uses [[onpush|OnPush change detection]], the signal change is the only thing that triggers a re-render.

**6. `switchMap` fires the HTTP request**

The `switchMap` operator is the key RxJS pattern here. It does two things:
1. Subscribes to the inner Observable (the HTTP call)
2. **Cancels any previous in-flight request**

If the user edits the salary while a previous request is still pending, `switchMap` aborts the old request and starts a new one. No stale data races. See [[rxjs]].

**7. `SalaryCalculationService.calculate()` sends a POST**

The service uses Angular's [[http-client|HttpClient]] to send a POST request:

```
POST http://localhost:8080/api/v1/salary/calculate
Content-Type: application/json

{"grossAnnual": 60000, "taxClass": "I", "churchTax": false, "hasChildren": false, "childCount": 0}
```

The `HttpClient` returns an `Observable<SalaryResponse>` — the response is automatically parsed as JSON and typed to our interface.

**8. The request crosses the network — CORS allows it**

The browser sends a preflight `OPTIONS` request first because the Angular dev server (`localhost:4200`) and the Spring Boot server (`localhost:8080`) are different origins. The backend's `CorsConfig` responds with headers that allow the cross-origin request. Without this, the browser would block the request entirely. See [[cors]].

**9. Spring Boot receives and deserializes the JSON**

[[jackson|Jackson]] (Spring Boot's default JSON library) reads the request body and maps it to a Kotlin `SalaryRequest` [[data-classes|data class]]. The field names match exactly — `grossAnnual` in JSON becomes `grossAnnual` in Kotlin. Jackson handles this automatically; no manual parsing needed.

**10. `@Valid` checks server-side validation**

The `@Valid` annotation on the controller parameter triggers Bean Validation. If the request violates constraints (e.g., `grossAnnual` is negative), Spring returns a `400 Bad Request` with error details *before* the service is ever called. This is the server-side counterpart to Angular's form validators — see [[form-validation]].

**11. `TaxCalculationService.calculate()` runs the tax logic**

This is where the [[german-tax-system]] domain knowledge lives. The service:

1. Calculates taxable income by applying the **Grundfreibetrag** (EUR 12,096 tax-free allowance) and tax-class-specific allowances
2. Applies the **four-zone progressive income tax formula** — 0% up to EUR 12,096, then 14%-24%, then 24%-42%, then 42% flat, then 45% ("Reichensteuer") above EUR 277,826
3. Calculates **Solidaritaetszuschlag** (5.5% of income tax, only above EUR 18,130 threshold)
4. Calculates **social insurance**: health (8.15%), pension (9.3%), unemployment (1.3%), nursing care (1.7% + 0.6% surcharge if childless), each capped at their respective contribution ceilings
5. Optionally calculates **Kirchensteuer** (church tax — 8% of income tax in Berlin)

**12. Response serialized to JSON and sent back**

The service returns a `SalaryResponse` data class. Spring Boot + Jackson serializes it to JSON:

```json
{
  "grossMonthly": 5000.0,
  "netMonthly": 3141.38,
  "incomeTax": 841.69,
  "solidaritySurcharge": 46.29,
  "healthInsurance": 407.5,
  "pensionInsurance": 465.0,
  "unemploymentInsurance": 65.0,
  "nursingCareInsurance": 115.0,
  "churchTaxAmount": null,
  "totalDeductions": 1858.62
}
```

**13. Angular receives the response — Signal updates**

Back in the browser, the `subscribe()` callback fires:

```typescript
.subscribe((response) => {
    this.result.set(response);      // Signal update
    sessionStorage.setItem(…);      // Persist for back-navigation
    this.isCalculating.set(false);  // Signal update
});
```

Two [[signals]] change: `result` now holds the `SalaryResponse`, and `isCalculating` returns to `false`.

**14. OnPush change detection re-renders the component**

Angular's [[change-detection]] system notices the signal changes. Because `SalaryFormComponent` uses `ChangeDetectionStrategy.OnPush`, it only re-renders when inputs change, events fire, or signals update — not on every browser event in the entire application. This is a performance optimization that matters in large apps with many components.

**15. `SalaryBreakdownComponent` displays the result**

The breakdown component receives the `result` as a signal input via `input.required<SalaryResponse>()`. It has two `computed()` signals:
- `deductionPercentage` — calculates what fraction of gross goes to deductions (e.g., "37.2%")
- `socialInsuranceTotal` — sums the four social insurance contributions

The template renders the formatted deductions table, and the user sees their net salary breakdown.

---

## 4. Technology Rationale

Every technology in this project was chosen deliberately. This table explains why — and what we considered instead.

| Technology | Why We Use It | Alternative Considered | Why Not the Alternative |
|---|---|---|---|
| [[angular]] 21 | Europace builds their Rechner products in Angular. Full framework with routing, forms, DI, HTTP built in. Demonstrates competence in their exact stack. | React | Library, not framework — you choose your own router (React Router? TanStack Router?), state manager (Redux? Zustand? Jotai?), form library (React Hook Form? Formik?). More flexibility, but more decisions and less consistency across a large team. |
| [[kotlin]] 2.x | Europace is migrating from Java to Kotlin. Modern JVM language with null safety, data classes, extension functions, coroutines. Less boilerplate than Java. | Java | Verbose — a simple data class requires 40+ lines with getters, setters, equals, hashCode. No built-in null safety. Kotlin compiles to the same bytecode and interops perfectly. |
| [[spring-boot]] 3.4 | Industry standard for JVM backends. Auto-configuration eliminates boilerplate. Massive ecosystem (security, data, cloud). Every Europace backend engineer knows Spring. | Ktor | Kotlin-native and lighter, but much smaller ecosystem, less tooling, less community support. Interviewers at a Spring shop won't be impressed by Ktor. |
| [[reactive-forms]] | Europace's Rechner uses 88 validators and 7 FormGroups. Complex wizard forms need programmatic control — conditional validation, cross-field rules, dynamic form structure. | Template-driven forms | Fine for a login form. Can't handle "show field B only if field A > 50000" or "validate field C against the value of field D." No programmatic access to form state. |
| [[signals]] | Angular's future direction. Fine-grained reactivity without RxJS complexity for synchronous state. Europace's Rechner already uses 20 `signal()` and 4 `computed()` instances. | NgRx (Redux for Angular) | Overkill for an app this size. NgRx adds actions, reducers, selectors, effects — a full Redux architecture. Signals handle our state needs with zero boilerplate. |
| [[rxjs]] | The right tool for async operations: HTTP requests, debouncing, cancellation via `switchMap`, retry logic. Angular's `HttpClient` returns Observables natively. | Promises / async-await | Can't cancel an in-flight request. Can't debounce. Can't automatically switch to the latest request when a new one arrives. RxJS operators solve these in one line. |
| [[design-tokens]] | Three-tier token system (`--reloc-sys-*` / `--reloc-ref-*` / `--reloc-comp-*`) mirrors Europace's `--xp-sys-*` / `--xp-ref-*` / `--xp-comp-*` architecture. Concrete talking point about design systems. | Tailwind classes only | No semantic layer. `bg-teal-700` scattered across 50 components means 50 places to update if the brand color changes. The "47 shades of blue" problem. Tokens give you `--reloc-ref-color-primary` and you change it once. |
| [[tailwind]] CSS 4.x | Utility-first CSS for rapid styling. Used alongside the token system for layout, spacing, responsive design. Europace's Rechner uses this same dual approach. | CSS Modules / SCSS only | Slower development. You write `.salary-form-header { display: flex; gap: 1rem; }` instead of `class="flex gap-4"`. Tailwind is more opinionated but faster for prototyping and consistent spacing. |
| [[docker]] | Reproducible dev environment. Backend runs on JVM 21 — Docker ensures every developer has the same JDK, same Gradle, same Spring Boot version regardless of their host OS. | Direct install (JDK + Gradle on host) | "Works on my machine" problem. Different JDK versions, different Gradle caches, different OS-level dependencies. Docker eliminates all of this. |
| [[onpush|OnPush]] change detection | Europace uses it on all feature components. Prevents Angular from re-checking the entire component tree on every browser event. Critical for apps with many components and frequent user input. | Default change detection | Checks every component on every event — mouse move, keystroke, timer tick. Wasteful in a form-heavy app where most components haven't changed. OnPush + Signals is the performance sweet spot. |
| [[lazy-loading]] | Each wizard step loads only when navigated to. The salary calculator bundle doesn't include neighborhood explorer code. Faster initial load. | Eager loading (all routes in main bundle) | One large bundle. User downloads the visa checklist JavaScript even if they only came for the salary calculator. Lazy loading splits the app into smaller chunks. |

---

## 5. Best Practices

The [[best-practices]] document collects the coding standards enforced throughout this project: which Angular APIs to use (and which to avoid), Spring Boot patterns that keep the backend testable and correct, and integration rules that keep the TypeScript/Kotlin contract in sync.

Key rules at a glance:

- **Angular**: `ChangeDetectionStrategy.OnPush` on every component; `@if`/`@for` over `*ngIf`/`*ngFor`; `signal()` for state, `toSignal()` to bridge RxJS; `input.required<T>()` over `@Input()`; `takeUntilDestroyed` on every manual subscription; `<button>` for every click handler
- **Kotlin**: constructor injection only; `data class` for all API models; `@RestControllerAdvice` for structured error bodies; `@Valid` on every `@RequestBody`; `kotlin.math.round()` for monetary values
- **Integration**: shared contracts updated in lockstep; all `HttpClient` calls typed; three signals (`isLoading`, `result`, `error`) on every API call; backend URL from `environment.ts`, never hardcoded

See [[best-practices]] for the full reference with code examples.

---

## 6. Jargon Glossary

Every technical term used in this project, from A to Z. Each entry either explains the term directly or links to a deeper concept page.

### German Domain Terms

| Term | German | Meaning |
|---|---|---|
| **Anmeldung** | Anmeldung | Address registration with the local Buergeramt — required within 14 days of moving to Berlin |
| **Auslaenderbehorde** | Auslaenderbehorde | Immigration office — handles residence permits and visa extensions |
| **Beitragsbemessungsgrenze** | Beitragsbemessungsgrenze | Contribution assessment ceiling — the income cap above which social insurance contributions stop increasing |
| **Bezirk** | Bezirk | Berlin district/borough (e.g., Kreuzberg, Mitte, Neukoelln) — the city has 12 Bezirke |
| **Einkommensteuer** | Einkommensteuer | Income tax — Germany's progressive income tax with four rate zones |
| **Grundfreibetrag** | Grundfreibetrag | Tax-free allowance — EUR 12,096 in 2025. Income below this amount is not taxed. |
| **Kirchensteuer** | Kirchensteuer | Church tax — 8% of income tax in Berlin (9% in Bavaria). Opt-out requires formal Kirchenaustritt. |
| **Krankenversicherung** | Krankenversicherung | Health insurance — mandatory in Germany. Employee share is ~8.15% of gross (up to the ceiling). |
| **Lohnsteuer** | Lohnsteuer | Wage tax — the income tax withheld by the employer each month |
| **Nebenkosten** | Nebenkosten | Additional rental costs (heating, water, trash, building maintenance) — typically EUR 2-4/sqm/month |
| **Pflegeversicherung** | Pflegeversicherung | Nursing care insurance — 1.7% base rate + 0.6% surcharge if childless over 23 |
| **Rechner** | Rechner | Calculator — the German word Europace uses for their product (Baufinanzierungsrechner = mortgage calculator) |
| **Reichensteuer** | Reichensteuer | "Rich tax" — the 45% top marginal rate on income above EUR 277,826 |
| **Rentenversicherung** | Rentenversicherung | Pension insurance — employee share is 9.3% of gross (up to the ceiling) |
| **Solidaritaetszuschlag** | Solidaritaetszuschlag | Solidarity surcharge — 5.5% of income tax, originally for German reunification. Only applies above EUR 18,130 income tax threshold since 2021. |
| **Sozialversicherung** | Sozialversicherung | Social insurance — the collective term for health, pension, unemployment, and nursing care insurance |
| **Steuerklasse** | Steuerklasse | Tax class (I-VI) — determines allowances and withholding rates. See [[steuerklassen]]. |

### Technical Terms

| Term | What It Means | Deeper Link |
|---|---|---|
| **Angular** | Google's TypeScript-based web framework. Full-featured: routing, forms, HTTP, DI, CLI all included. | [[angular]] |
| **API Contract** | The agreed-upon shape of data between frontend and backend. In this project, TypeScript interfaces and Kotlin data classes that must match exactly. | [[api-contracts]] |
| **Bean Validation** | Java/Kotlin standard for declarative validation (`@NotNull`, `@Min`, `@Valid`). Spring Boot uses it automatically on `@RequestBody` parameters. | [[form-validation]] |
| **Change Detection** | How Angular decides when to re-render a component. Default checks everything; OnPush only checks when inputs/signals change. | [[change-detection]] |
| **Computed Signal** | A signal whose value is derived from other signals. Recalculates lazily when dependencies change. `computed(() => a() + b())`. | [[signals]] |
| **CORS** | Cross-Origin Resource Sharing. Browser security mechanism that blocks requests between different origins unless the server explicitly allows it. | [[cors]] |
| **CSS Custom Property** | A variable in CSS: `--my-color: #0f766e;` used as `color: var(--my-color)`. The foundation of the design token system. | [[css-custom-properties]] |
| **Data Class** | Kotlin's concise way to define a class that holds data. One line replaces 40+ lines of Java (getters, setters, equals, hashCode, toString, copy). | [[data-classes]] |
| **debounceTime** | RxJS operator that waits N milliseconds after the last emission before passing it through. Prevents rapid-fire HTTP requests on keystrokes. | [[rxjs]] |
| **Dependency Injection** | A pattern where components declare what they need, and a framework provides it. Angular and Spring Boot both use DI extensively. | [[dependency-injection]] |
| **Design Tokens** | Named, reusable design values (colors, spacing, radii, shadows) organized in tiers. Our system uses `--reloc-sys-*` / `--reloc-ref-*` / `--reloc-comp-*`. | [[design-tokens]] |
| **DestroyRef** | Angular utility for managing subscription cleanup. `takeUntilDestroyed(this.destroyRef)` automatically unsubscribes Observables when the component is destroyed. | [[rxjs]] |
| **Docker** | Platform for running applications in isolated containers. Ensures the backend runs identically everywhere regardless of host OS. | [[docker]] |
| **Effect** | A signal-based side effect that runs when its dependency signals change. `effect(() => console.log(count()))` — runs every time `count` changes. | [[signals]] |
| **FormControl** | Angular reactive forms primitive — represents a single input field with a value, validation state, and change events. | [[reactive-forms]] |
| **FormGroup** | Angular reactive forms container — groups multiple FormControls together. Has its own `valueChanges` Observable and aggregate validation state. | [[reactive-forms]] |
| **HttpClient** | Angular's built-in HTTP library. Returns Observables (not Promises), supports interceptors, automatic JSON parsing, and typed responses. | [[http-client]] |
| **Interceptor** | Middleware that runs on every HTTP request/response. Our `errorInterceptor` catches HTTP errors and transforms them into typed `ApiError` objects. | [[interceptors]] |
| **Jackson** | Java/Kotlin JSON library (Spring Boot's default). Automatically serializes data classes to JSON and deserializes JSON to data classes. | [[jackson]] |
| **Kotlin** | JetBrains' modern JVM language. Null-safe, concise, fully interoperable with Java. Compiles to the same bytecode. | [[kotlin]] |
| **Lazy Loading** | Loading JavaScript chunks on demand rather than in the initial bundle. Our routes use `loadComponent` so each feature is a separate chunk. | [[lazy-loading]] |
| **NgModule** | Angular's legacy organizational unit. Replaced by standalone components in Angular 14+. We use zero NgModules. | [[standalone-components]] |
| **Observable** | An RxJS primitive representing a stream of values over time. Unlike a Promise (one value), an Observable can emit zero, one, or many values. | [[rxjs]] |
| **OnPush** | Angular change detection strategy that skips re-rendering unless inputs change, events fire, or signals update. Performance optimization. | [[onpush]] |
| **Pipe (RxJS)** | The `.pipe()` method chains operators on an Observable. `obs.pipe(debounceTime(400), filter(...), switchMap(...))` transforms the stream step by step. | [[rxjs]] |
| **Reactive Forms** | Angular's programmatic form system. Forms are defined in TypeScript (not the template) via FormGroup and FormControl, with explicit validators. | [[reactive-forms]] |
| **Signal** | Angular's fine-grained reactivity primitive. A wrapper around a value that notifies consumers (templates, computed signals, effects) when it changes. | [[signals]] |
| **Spring Boot** | Framework that simplifies building JVM backends. Auto-configures everything: embedded server, JSON serialization, dependency injection, CORS. | [[spring-boot]] |
| **Standalone Component** | An Angular component that declares its own imports (no NgModule required). All components in this project are standalone. | [[standalone-components]] |
| **switchMap** | RxJS operator that subscribes to a new inner Observable and cancels the previous one. Perfect for "latest request wins" patterns like search-as-you-type. | [[rxjs]] |
| **Tailwind CSS** | Utility-first CSS framework. Instead of writing custom CSS classes, you compose styles from utilities like `flex`, `gap-4`, `text-teal-700`. | [[tailwind]] |
| **toSignal** | Angular bridge function that converts an Observable into a Signal. Allows RxJS streams to participate in signal-based change detection. | [[signals]] |
| **Validators** | Angular's built-in and custom validation functions. `Validators.required`, `Validators.min(0)`, `Validators.max(10_000_000)`, etc. | [[form-validation]] |

---

## 7. Tutorial Index (Learning Path)

Tutorials are ordered for progressive learning. Each one builds on earlier concepts — check the prerequisites column before jumping ahead.

### Core Tutorials

| # | Tutorial | What You'll Learn | Prerequisites |
|---|---------|-------------------|---------------|
| 01 | [[tutorials/01-angular-scaffold]] | Angular fundamentals: standalone components, project structure, `app.config.ts` providers, the `reloc-*` selector convention, feature-based folder structure, [[dependency-injection]] | None — start here if you're new to Angular |
| 02 | [[tutorials/02-design-tokens]] | CSS custom properties, the three-tier token architecture (`--reloc-sys-*` / `--reloc-ref-*` / `--reloc-comp-*`), how Europace's `--xp-*` system works, [[tailwind]] integration | 01 (need to understand where styles live in Angular) |
| 03 | [[tutorials/03-kotlin-spring-boot]] | Kotlin for TypeScript developers, Spring Boot project structure, `@RestController`, `@Service`, [[data-classes]], Gradle build system, JVM basics | None — can start here independently of the Angular tutorials |
| 04 | [[tutorials/04-reactive-forms]] | `FormGroup`, `FormControl`, `Validators`, `valueChanges` Observable, template-driven vs reactive forms, the Rechner's 88-validator pattern, auto-calculating forms | 01 |
| 05 | [[tutorials/05-signals-and-state]] | `signal()`, `computed()`, `effect()`, `input.required()`, signals vs BehaviorSubject vs NgRx, `toSignal()` bridge, the spreadsheet mental model | 01, 04 |
| 06 | [[tutorials/06-http-integration]] | `HttpClient` vs fetch, `Observable` vs `Promise`, services pattern, `switchMap` for cancellation, `errorInterceptor`, typed [[api-contracts]], end-to-end request flow | 03, 04, 05 |
| 07 | [[tutorials/07-spring-services]] | Tax calculation domain logic in depth, [[dependency-injection]] in Spring, `@Service` lifecycle, testing services, the four-zone progressive tax formula | 03 |
| 08 | [[tutorials/08-cost-estimation]] | GET endpoints, query parameters, component composition, reading data from multiple signals, comparing net salary vs costs | 06, 07 |
| 09 | [[tutorials/09-wizard-navigation]] | Angular Router deep dive, `loadComponent` lazy loading, route guards, step indicator component, wizard state management | 01 |
| 10 | [[tutorials/10-sanity-cms]] | Headless CMS integration, GROQ queries, fetching content at build time vs runtime, structured content modeling | Any (standalone topic) |
| 11 | [[tutorials/11-docker-deployment]] | Containers, multi-stage Docker builds, `docker-compose.yml`, environment variables, deploying frontend to Vercel and backend to Railway | 01, 03 |
| 12 | [[tutorials/12-onpush-and-performance]] | How Angular's change detection actually works, Zone.js, OnPush strategy, signal-based change detection, performance profiling | 05 |

### Suggested Learning Paths

**"I know React, teach me Angular":** 01 → 04 → 05 → 02 → 06

**"I know TypeScript, teach me the backend":** 03 → 07 → 06

**"I want to understand the full stack":** 01 → 03 → 02 → 04 → 05 → 06 → 07 → 08

**"I just need to prep for the interview":** Read section 7 below, then skim 01, 03, 06 for the patterns that map to Europace.

---

## 8. Interview Preparation

This section organizes the project's technical decisions into interview-ready talking points. Each topic includes what you should emphasize, questions to expect, and how to frame answers using concrete examples from this project.

### Angular Talking Points

**Standalone Components**
> "Every component in the project is standalone — zero NgModules. Each component declares its own imports, which makes the dependency graph explicit and enables lazy loading at the component level, not just the module level. This matches the pattern in Europace's Rechner, which also uses standalone components."

*Expect:* "Why standalone over NgModules?" — NgModules were Angular's organizational unit since v2, but they added indirection. A component's dependencies were declared in a separate file (the module), not in the component itself. Standalone components make the dependency graph local and explicit. Angular 19+ made standalone the default.

**Reactive Forms**
> "The salary calculator uses a typed FormGroup with five controls and three validators on the gross salary field. The form's `valueChanges` Observable feeds into a debounced, switchMapped HTTP pipeline — so the calculation auto-updates as the user types, with stale request cancellation built in. Europace's Rechner uses 88 validators and 7 FormGroups following the same pattern."

*Expect:* "Why reactive forms over template-driven?" — Template-driven forms define structure in HTML and infer the form model. This breaks down when you need conditional validation ("validate field B only if field A > X"), cross-field validation, or programmatic form manipulation. Reactive forms define everything in TypeScript, giving full programmatic control.

**Signals**
> "UI state is managed with signals — `result`, `isCalculating`, and `error` are all signals that drive the template. Derived state uses `computed()` — the deduction percentage recalculates automatically when the result changes. This is Angular's recommended approach going forward, and it pairs naturally with OnPush change detection."

*Expect:* "When would you use RxJS instead of signals?" — Signals are for synchronous, stateful values that drive templates. RxJS is for asynchronous operations: HTTP requests, WebSocket streams, debouncing, cancellation, retry logic. In this project, the HTTP pipeline uses RxJS (`debounceTime`, `switchMap`, `catchError`), and the result is stored in a signal. Best of both worlds.

**Design Tokens**
> "The CSS uses a three-tier token system: `--reloc-sys-*` for raw primitives, `--reloc-ref-*` for semantic references, and `--reloc-comp-*` for component-specific overrides. This directly mirrors Europace's `--xp-sys-*` / `--xp-ref-*` / `--xp-comp-*` architecture. The semantic layer means 'primary color' is defined once and referenced everywhere — no hunting through 50 files to change the brand color."

*Expect:* "How do tokens work with Tailwind?" — Tailwind handles layout utilities (`flex`, `gap-4`, `p-6`), while tokens handle brand-level decisions (colors, radii, shadows, typography). Tailwind can reference custom properties via `var()`, so the two systems complement rather than compete.

### Kotlin / Spring Boot Talking Points

**Kotlin Data Classes**
> "The API contracts use Kotlin data classes that mirror TypeScript interfaces field-for-field. `SalaryRequest` in TypeScript and `SalaryRequest.kt` in Kotlin have identical fields and types. Jackson handles the serialization automatically. If either side changes, the contract mismatch surfaces immediately."

*Expect:* "How do you keep the contracts in sync?" — Today it's manual mirroring with a `shared/api-contracts/` directory that has both `.ts` and `.kt` files. The shared directory makes it visible that both must be updated together. At scale, you'd generate one from the other (OpenAPI spec, protobuf, etc.).

**German Tax Domain Knowledge**
> "The `TaxCalculationService` implements Germany's actual 2025 progressive tax formula — four zones from 0% to 45%, social insurance with contribution ceilings, solidarity surcharge with phase-in threshold, and Kirchensteuer at Berlin's 8% rate. I went through this myself when I relocated to Berlin, so the numbers are from real experience, not a textbook."

*Expect:* "Walk me through the tax calculation." — Start with Grundfreibetrag (EUR 12,096 tax-free), explain the four progressive zones, mention Steuerklassen (e.g., Class III gets double Grundfreibetrag for married higher earner), social insurance capped at Beitragsbemessungsgrenze (EUR 66,150 for health, EUR 96,600 for pension), then Soli at 5.5% above threshold.

**Spring Boot Architecture**
> "The backend follows standard layered architecture: controller receives HTTP and validates, service contains business logic, model defines data shapes. The controller never calculates anything — it delegates to `TaxCalculationService`. This separation means we could swap the HTTP layer for a CLI or message queue without touching the business logic."

*Expect:* "How does dependency injection work in Spring?" — Spring creates singleton beans for `@Service` and `@RestController` classes. When `SalaryController` declares `private val taxService: TaxCalculationService` in its constructor, Spring automatically injects the service instance. No manual wiring. Same concept as Angular's `inject()` but at the JVM level.

### Integration Talking Points

**This is the differentiator. Martin said they're hiring for frontend-backend integration.**

**Typed Contracts**
> "The `shared/api-contracts/` directory is the single source of truth. Both TypeScript interfaces and Kotlin data classes live there side by side. When I add a field to the response, I update both files in the same commit. The Angular service's generic type parameter `http.post<SalaryResponse>(...)` ensures the compiler catches type mismatches at build time, not at runtime."

**Error Handling Pipeline**
> "Errors flow through three layers. The global `errorInterceptor` catches all HTTP errors and transforms them into typed `ApiError` objects with status, message, and timestamp. The component's `catchError` in the RxJS pipeline sets the error signal. The template reads the error signal and displays a user-friendly message. A 0 status means the backend is unreachable. A 400 means bad input. A 500 means something broke server-side. Each gets a different message."

**Loading States**
> "Every API call has explicit loading, success, and error states — all as signals. `isCalculating()` drives the spinner, `result()` drives the breakdown display, `error()` drives the error message. There is no ambiguous state where the user doesn't know what's happening. The template shows exactly one of: empty state, loading spinner, result, or error."

### Questions You Should Ask the Interviewer

These demonstrate technical depth and genuine interest:

1. "The Rechner uses `--xp-sys-*` tokens that look like they bridge into Material Design 3. Are you moving toward MD3 system tokens, or is the three-tier system staying custom?"
2. "I noticed the Rechner uses both Signals (20 instances) and RxJS (133 pipe calls). Is there a team convention for when to use which, or is it still evolving?"
3. "How do you handle API contract evolution between the Angular frontend and the Java/Kotlin backends? OpenAPI generation, shared schemas, or manual mirroring?"
4. "The #passt team's calculator — is it a single Angular app or a micro-frontend architecture with multiple teams contributing?"

---

## Appendix: File Map

Quick reference for finding anything in the codebase.

| What You're Looking For | File Path |
|---|---|
| Angular entry point | `frontend/src/app/app.ts` |
| Application providers (router, HTTP, interceptors) | `frontend/src/app/app.config.ts` |
| Route definitions (lazy loading) | `frontend/src/app/app.routes.ts` |
| Salary form (FormGroup, signals, RxJS pipeline) | `frontend/src/app/features/salary-calculator/salary-form.component.ts` |
| Salary breakdown display | `frontend/src/app/features/salary-calculator/salary-breakdown.component.ts` |
| HTTP service (Angular → Spring Boot) | `frontend/src/app/core/services/salary-calculation.service.ts` |
| Error interceptor | `frontend/src/app/core/interceptors/error.interceptor.ts` |
| TypeScript model types | `frontend/src/app/core/models/salary.model.ts` |
| Design tokens (CSS custom properties) | `frontend/src/styles/tokens.css` |
| Spring Boot entry point | `backend/src/main/kotlin/.../RelocationApplication.kt` |
| REST controller | `backend/src/main/kotlin/.../controller/SalaryController.kt` |
| Tax calculation business logic | `backend/src/main/kotlin/.../service/TaxCalculationService.kt` |
| Kotlin data classes (request/response) | `backend/src/main/kotlin/.../model/SalaryRequest.kt`, `SalaryResponse.kt` |
| CORS configuration | `backend/src/main/kotlin/.../config/CorsConfig.kt` |
| Global exception handler | `backend/src/main/kotlin/.../config/GlobalExceptionHandler.kt` |
| REST cost controller | `backend/src/main/kotlin/.../controller/CostController.kt` |
| Cost estimation service | `backend/src/main/kotlin/.../service/CostEstimationService.kt` |
| Cost estimator form component | `frontend/src/app/features/cost-estimator/cost-estimator.component.ts` |
| Cost breakdown display | `frontend/src/app/features/cost-estimator/cost-breakdown.component.ts` |
| Neighborhood explorer | `frontend/src/app/features/neighborhood-explorer/neighborhood-explorer.component.ts` |
| Visa checklist | `frontend/src/app/features/visa-checklist/visa-checklist.component.ts` |
| Cost estimation HTTP service | `frontend/src/app/core/services/cost-estimation.service.ts` |
| Cost model types | `frontend/src/app/core/models/cost.model.ts` |
| API error model | `frontend/src/app/core/models/api-error.model.ts` |
| Step indicator component | `frontend/src/app/shared/components/step-indicator/step-indicator.component.ts` |
| Currency input component | `frontend/src/app/shared/components/currency-input/currency-input.component.ts` |
| API contracts (source of truth) | `shared/api-contracts/salary.ts`, `salary.kt` |
| Cost estimation contracts | `shared/api-contracts/costs.ts`, `costs.kt` |
| Docker orchestration | `docker-compose.yml` |

---

*This guide is a living document. As tutorials are added and features are built, update the links and descriptions here to keep it current.*
