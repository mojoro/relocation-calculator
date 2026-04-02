# Tutorial 06 — HTTP Integration

> **Goal:** Understand how the Angular frontend talks to the Kotlin backend over HTTP. By the end, you'll be able to trace a request from a form keystroke through the Observable pipeline, across the network, and back into the UI — and explain every step clearly.

> **Prerequisites:** You know `fetch` or `axios`. You have read [[tutorials/01-angular-scaffold]] (especially [[dependency-injection]] and `provideHttpClient()`). You do not need prior RxJS experience beyond what this tutorial teaches.

---

## Angular's HttpClient

### Why not just use fetch?

You *could* use `fetch` in an Angular app. It works. But Angular ships with `HttpClient`, a purpose-built HTTP layer that solves several problems `fetch` doesn't:

| Feature | `fetch` / `axios` | Angular `HttpClient` |
|---|---|---|
| Return type | `Promise` | `Observable` (cancellable, retryable, pipeable) |
| Response typing | Manual: `await res.json() as T` | Built-in: `http.post<T>(url, body)` returns `Observable<T>` |
| JSON parsing | Manual (`res.json()`) | Automatic — request/response bodies are JSON by default |
| Interceptors | Axios has them; fetch doesn't | First-class: middleware for every request/response |
| Cancellation | `AbortController` (verbose) | Unsubscribe from the Observable (automatic with `switchMap`) |
| Testing | Mock `fetch` globally | `HttpTestingController` — assert exact URLs, methods, bodies |
| Tree-shakable | N/A (browser-native or npm) | Provided via `provideHttpClient()` — not included if unused |

The key insight is the **Observable return type**. A `Promise` fires once and resolves. An `Observable` is a stream that you can transform, combine, debounce, retry, and — critically — *cancel*. When a user types a new salary value while a previous request is still in flight, we want to cancel the old request and fire a new one. With Promises, you'd need to track request IDs and ignore stale responses. With Observables and `switchMap`, cancellation is automatic.

### Providing HttpClient

Before any service can inject `HttpClient`, we register it in the application's provider array. This happens in `app.config.ts`:

```typescript
// frontend/src/app/app.config.ts
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { errorInterceptor } from './core/interceptors/error.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    // ... other providers
    provideHttpClient(withInterceptors([errorInterceptor])),
  ],
};
```

`provideHttpClient()` makes `HttpClient` available throughout the entire application via [[dependency-injection]]. The `withInterceptors([...])` call registers middleware functions that run on every HTTP request (covered in the Interceptors section below).

**Coming from axios:** Think of `provideHttpClient()` as creating a pre-configured axios instance and making it globally available, except instead of importing a module, Angular's DI system injects it where needed. And instead of `axios.interceptors.request.use(...)`, interceptors are registered declaratively at config time.

---

## The Services Pattern

### What a service looks like

Open `frontend/src/app/core/services/salary-calculation.service.ts`. This is the entire file:

```typescript
@Injectable({ providedIn: 'root' })
export class SalaryCalculationService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiBaseUrl}/salary/calculate`;

  calculate(request: SalaryRequest): Observable<SalaryResponse> {
    return this.http.post<SalaryResponse>(this.apiUrl, request);
  }
}
```

Ten lines of meaningful code. Let's break it down:

- **`@Injectable({ providedIn: 'root' })`** — This decorator tells Angular: "This is a service. Create a single instance (singleton) at the application root and share it everywhere." Any component or other service that calls `inject(SalaryCalculationService)` gets the same instance. No need to add it to a providers array — Angular tree-shakes it automatically if nothing injects it.

- **`inject(HttpClient)`** — Pulls `HttpClient` from the DI container. This is the same `HttpClient` that `provideHttpClient()` registered in `app.config.ts`.

- **`environment.apiBaseUrl`** — Resolves to `http://localhost:8080/api/v1` in development. In production, it resolves to `/api/v1` (a relative URL, handled by a reverse proxy or same-origin deployment). This means the service code never contains hardcoded URLs.

- **`http.post<SalaryResponse>(url, request)`** — Sends a POST request with `request` as the JSON body. The generic type parameter `<SalaryResponse>` tells TypeScript what shape the response will have. Angular serializes the request body to JSON and parses the response JSON automatically.

- **Returns `Observable<SalaryResponse>`** — The service does *not* subscribe. It returns a cold Observable — nothing happens until a consumer subscribes to it. This is a deliberate design choice (see "Common Mistakes" below for why).

### Why not call HttpClient from components?

You *could* inject `HttpClient` directly into `SalaryFormComponent` and make the API call right there. It would work. Here's why we don't:

**Testability.** To test the component, you'd need to mock `HttpClient` — which means understanding its internal API, setting up `HttpTestingController`, and verifying URLs inline with component logic. With a service, you mock `SalaryCalculationService` with a simple fake: `{ calculate: () => of(mockResponse) }`. The component test doesn't know or care about HTTP.

**Reusability.** If a second component needs salary data (maybe a summary dashboard), it injects the same service. Without a service, you'd duplicate the HTTP call, the URL construction, and the type annotations.

**Single source of truth.** If the API endpoint changes from `/salary/calculate` to `/v2/salary/calculate`, you change one line in one file. Not every component that calls the API.

**The library analogy.** A service is like a library's front desk. Components are library visitors. Visitors don't go into the back room to search the shelves themselves — they ask the desk, and the desk handles the lookup. If the library reorganizes its shelves (the API changes), visitors don't notice. They still walk up to the same desk.

---

## Interceptors

### What are interceptors?

Interceptors are middleware for HTTP. Every request that goes through `HttpClient` passes through the interceptor chain before hitting the network, and every response passes back through the chain before reaching the calling code. They're the place for cross-cutting concerns: error transformation, logging, auth tokens, retry logic.

If you've used Express middleware or axios interceptors, the mental model is identical. The difference is syntax: Angular uses *functional interceptors* — plain functions with a specific signature.

### Our error interceptor

Open `frontend/src/app/core/interceptors/error.interceptor.ts`:

```typescript
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
      }));
    })
  );
};
```

Let's trace the flow:

1. **`(req, next)`** — The function receives the outgoing `HttpRequest` and a `next` handler. Calling `next(req)` forwards the request to the next interceptor in the chain (or to the actual HTTP transport if this is the last interceptor).

2. **`next(req).pipe(...)`** — We call `next` to proceed, then pipe the response Observable through operators. Since we only use `catchError`, the happy path passes through untouched.

3. **`catchError((error: HttpErrorResponse) => ...)`** — If the HTTP call fails (network error, 4xx, 5xx), this catches it. We inspect `error.status` and produce a human-readable message.

4. **`status === 0`** — A status of 0 means the request never reached the server. The browser couldn't connect. This usually means the backend isn't running.

5. **`throwError(() => ({ status, message, timestamp }))`** — We re-throw, but with a *typed* error object that matches our `ApiError` interface. This means every `catchError` in the application receives a predictable shape, not a raw `HttpErrorResponse` with varying structures.

### The interceptor chain

Interceptors run in the order they're registered. If we had multiple interceptors:

```typescript
provideHttpClient(withInterceptors([authInterceptor, loggingInterceptor, errorInterceptor]))
```

The request would flow: `authInterceptor` -> `loggingInterceptor` -> `errorInterceptor` -> network. The response flows back in reverse: network -> `errorInterceptor` -> `loggingInterceptor` -> `authInterceptor`.

Think of it as a stack of wrappers. Each interceptor wraps the next one. This is why we put `errorInterceptor` last — it catches errors from the network transport, not from other interceptors.

### Registering interceptors

Interceptors are registered in `app.config.ts` via `withInterceptors()`:

```typescript
provideHttpClient(withInterceptors([errorInterceptor]))
```

This is all it takes. Every `HttpClient` call anywhere in the application — in any service, in any lazy-loaded feature — goes through this chain. You don't wire interceptors per-service or per-component. They're global.

---

## The Observable-to-Signal Pipeline

This is the heart of the integration. Open `salary-form.component.ts` and look at `ngOnInit`. We'll walk through every step of the pipeline.

### The complete flow

```typescript
// Inside ngOnInit():
this.salaryForm.valueChanges              // Step 1: Form changes emit
  .pipe(
    debounceTime(400),                     // Step 2: Wait for typing to pause
    filter(() =>                           // Step 3: Only proceed if form is valid
      this.salaryForm.valid &&
      this.salaryForm.controls.grossAnnual.value !== null
    ),
    tap(() => {                            // Step 4: Set loading state
      this.isCalculating.set(true);
      this.error.set(null);
    }),
    switchMap(() => {                      // Step 5: Fire HTTP request
      const formValue = this.salaryForm.getRawValue();
      return this.salaryService
        .calculate({
          grossAnnual: formValue.grossAnnual!,
          taxClass: formValue.taxClass,
          churchTax: formValue.churchTax,
          hasChildren: formValue.hasChildren,
          childCount: formValue.hasChildren ? formValue.childCount : 0,
        })
        .pipe(
          catchError((err: ApiError) => {  // Step 5b: Handle errors
            this.error.set(err);
            this.isCalculating.set(false);
            this.result.set(null);
            return EMPTY;
          })
        );
    }),
    takeUntilDestroyed(this.destroyRef)    // Step 6: Auto-unsubscribe on destroy
  )
  .subscribe((response) => {               // Step 7: Write result to signal
    this.result.set(response);
    this.isCalculating.set(false);
  });
```

### Step by step

**Step 1 — `valueChanges`**

Every Angular `FormGroup` exposes a `valueChanges` Observable. It emits the current form value every time *any* control in the group changes. The user types "6" in the salary field? Emission. They change the tax class to III? Emission. Toggle church tax? Emission.

This is the entry point of our reactive pipeline. Instead of attaching `(change)` handlers to every input, we have a single stream of all form changes.

**Step 2 — `debounceTime(400)`**

If the user types "60000", that's five keystrokes, which means five emissions in rapid succession: "6", "60", "600", "6000", "60000". We don't want to fire five API calls. `debounceTime(400)` waits for a 400ms pause in emissions before forwarding the latest value. The user types "60000" in one go, and we only fire once — with the final value.

**Coming from the Promise world:** This is like `lodash.debounce`, but built into the stream itself. No wrapper function, no cleanup, no stale closure bugs.

**Step 3 — `filter(() => this.salaryForm.valid && ...)`**

Only proceed if the form passes validation and the salary field isn't empty. Invalid form states (negative salary, blank required field) are silently dropped. No API call, no error, no loading spinner.

**Step 4 — `tap(() => { ... })`**

`tap` is a side-effect operator — it runs code without modifying the stream. Here we set two [[signals]]:

- `this.isCalculating.set(true)` — the UI shows a loading spinner
- `this.error.set(null)` — clear any previous error message

This happens *before* the HTTP call fires. The user sees immediate feedback that something is happening.

**Step 5 — `switchMap(() => this.salaryService.calculate(...))`**

This is the most important operator in the entire pipeline. `switchMap` does two things:

1. **Maps** the form value to an inner Observable (the HTTP request)
2. **Switches** — if a new form value arrives while the previous HTTP request is still in flight, it *cancels* the previous request and starts a new one

Why `switchMap` and not `mergeMap`? `mergeMap` would keep all in-flight requests alive. If the user types "50000", then quickly changes to "60000", both requests would complete and the UI would show whichever response arrives last — which might be the stale "50000" result if that server call happened to be slower. `switchMap` guarantees we only ever process the *latest* request.

**Cancellation is real.** When `switchMap` cancels an Observable, Angular's `HttpClient` actually aborts the underlying `XMLHttpRequest`. You can see this in the browser DevTools Network tab — cancelled requests show as "(canceled)". The server may still process the request, but the browser stops waiting for the response and frees up the connection.

**Step 5b — `catchError` (inside the inner Observable)**

If the HTTP call fails, we catch the error *inside* the `switchMap`. This is critical placement. If we put `catchError` *after* `switchMap`, a single error would complete the entire pipeline — the form would stop responding to changes. By catching inside, we handle the error, return `EMPTY` (an Observable that immediately completes without emitting), and the outer pipeline stays alive for the next form change.

**Step 6 — `takeUntilDestroyed(this.destroyRef)`**

When the component is destroyed (the user navigates away), this operator unsubscribes from the entire pipeline. Without it, the subscription would live on as a memory leak, potentially firing API calls for a component that no longer exists in the DOM. See "Common Mistakes" below for more on this.

**Step 7 — `subscribe((response) => { ... })`**

The final step: we receive the `SalaryResponse` and write it to a signal. `this.result.set(response)` updates the signal, which triggers the template to re-render the results section. `this.isCalculating.set(false)` hides the loading spinner.

### Why signals and not just Observable + async pipe?

Angular's `async` pipe (the traditional approach) subscribes to an Observable in the template and renders the latest value. It works, but:

- Signals integrate with Angular's new fine-grained reactivity system
- Signals are synchronous to read — `result()` returns the current value instantly, no subscription needed
- Signals work naturally with `@if` blocks and computed state
- Signals are the direction Angular is heading — the async pipe isn't deprecated, but signals are the modern path

Our component uses signals as the "last mile" — the Observable pipeline handles the async complexity (debouncing, cancellation, error handling), and signals hold the final state for the template to read.

---

## Typed API Contracts

### The mirror pattern

Our TypeScript interfaces and Kotlin data classes are deliberately identical in structure and naming. Compare them side by side:

**TypeScript (frontend):**

```typescript
// frontend/src/app/core/models/salary.model.ts
export interface SalaryRequest {
  grossAnnual: number;
  taxClass: TaxClass;
  churchTax: boolean;
  hasChildren: boolean;
  childCount: number;
}

export interface SalaryResponse {
  grossMonthly: number;
  netMonthly: number;
  incomeTax: number;
  solidaritySurcharge: number;
  healthInsurance: number;
  pensionInsurance: number;
  unemploymentInsurance: number;
  nursingCareInsurance: number;
  churchTaxAmount: number | null;
  totalDeductions: number;
}
```

**Kotlin (backend):**

```kotlin
// backend/src/main/kotlin/com/johnmoorman/relocation/model/SalaryRequest.kt
data class SalaryRequest(
    val grossAnnual: Int,
    val taxClass: TaxClass,
    val churchTax: Boolean = false,
    val hasChildren: Boolean = false,
    val childCount: Int = 0
)

// backend/src/main/kotlin/com/johnmoorman/relocation/model/SalaryResponse.kt
data class SalaryResponse(
    val grossMonthly: Double,
    val netMonthly: Double,
    val incomeTax: Double,
    // ... same fields, same names
    val churchTaxAmount: Double?,
    val totalDeductions: Double
)
```

Same field names. Same structure. Kotlin's `Double?` (nullable) maps to TypeScript's `number | null`. Kotlin's `Boolean` maps to TypeScript's `boolean`. The JSON serialization on both sides uses the field names as-is — no `@JsonProperty` annotations or custom serializers.

### Why this matters

If a backend developer adds a new field `socialSecurityTotal` to `SalaryResponse.kt` but forgets to update the TypeScript interface, the Angular app won't break at runtime — it'll just silently ignore the extra field. But the *inverse* is worse: if the frontend starts reading `socialSecurityTotal` from the response without the backend providing it, TypeScript won't catch this at build time because HTTP responses are trusted (`any` at the boundary).

The discipline is manual but effective: **when you change a Kotlin data class, you change the TypeScript interface in the same PR.** Same names, same types, same commit. This is a convention, not a compiler guarantee — but it's a convention worth maintaining because it shows you think about the full stack, not just your layer.

### Tracing a field end-to-end

Pick any field — say `solidaritySurcharge`. You can trace it through the entire system:

1. **Kotlin model** — `val solidaritySurcharge: Double` in `SalaryResponse.kt`
2. **Kotlin service** — calculated in `TaxCalculationService.kt` and assigned to the response
3. **Spring serialization** — Jackson serializes it as `"solidaritySurcharge": 27.50` in the JSON response
4. **Angular HttpClient** — parses the JSON and creates a JavaScript object
5. **TypeScript interface** — `solidaritySurcharge: number` in `SalaryResponse`
6. **Signal** — `this.result.set(response)` stores the full response
7. **Template** — `{{ result()!.solidaritySurcharge | currency:'EUR' }}` renders "EUR 27.50"

Seven layers, one field name, zero transformations. This is the power of matching contracts.

---

## CORS Explained

### The problem

Open the Angular dev server at `http://localhost:4200`. Open the backend at `http://localhost:8080`. They're different *ports*, which means the browser considers them different **origins**. An origin is the combination of protocol + hostname + port:

- `http://localhost:4200` — Angular dev server
- `http://localhost:8080` — Spring Boot backend

When JavaScript running on one origin makes an HTTP request to a different origin, the browser blocks it by default. This is the **Same-Origin Policy**, a security feature that prevents a malicious website from reading data from your bank's API using your logged-in cookies.

The error you'd see without CORS configuration:

```
Access to XMLHttpRequest at 'http://localhost:8080/api/v1/salary/calculate'
from origin 'http://localhost:4200' has been blocked by CORS policy:
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

### The solution: CORS headers

**Cross-Origin Resource Sharing (CORS)** is a protocol where the server explicitly tells the browser: "I trust requests from these origins." The server adds HTTP headers to its responses, and the browser reads them to decide whether to allow the request.

Our Spring Boot backend configures CORS in `backend/src/main/kotlin/com/johnmoorman/relocation/config/CorsConfig.kt`:

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

Key settings:

- **`allowedOrigins`** — Only `localhost:4200` (Angular dev server) and `localhost:4000` (alternative dev port) are trusted. A random website cannot call our API.
- **`allowedMethods`** — We allow POST (for salary calculations), plus other methods for future endpoints.
- **`allowCredentials`** — Allows cookies to be sent cross-origin. Not strictly needed yet, but required if we ever add session-based auth.
- **`maxAge`** — The browser caches the CORS preflight response for 3600 seconds (1 hour). Without this, the browser sends an extra OPTIONS request before every POST, doubling the latency.

### Preflight requests

For "non-simple" requests (POST with `Content-Type: application/json` qualifies), the browser first sends an **OPTIONS** request — the "preflight." It asks the server: "Would you accept a POST from this origin with these headers?" The server responds with CORS headers, and only then does the browser send the actual POST.

You can see preflight requests in the DevTools Network tab. Filter by method and you'll see an OPTIONS request immediately before each POST. After the first one, the `maxAge` cache kicks in and the browser skips the preflight for the next hour.

### Production setup

In production, CORS often becomes unnecessary. If the frontend and backend are served from the same origin (e.g., a reverse proxy routes `/api/*` to the backend and everything else to the Angular static files), same-origin requests don't trigger CORS at all. Our `environment.prod.ts` uses a relative URL (`/api/v1`) for exactly this reason.

For a deeper reference, see [[cors]].

---

## Loading, Error, and Success States

### The three-state pattern

Every API integration has exactly three possible outcomes: it's loading, it failed, or it succeeded. Our component models these with three [[signals]]:

```typescript
readonly result = signal<SalaryResponse | null>(null);
readonly isCalculating = signal(false);
readonly error = signal<ApiError | null>(null);
```

These signals are mutually exclusive in practice:

| State | `isCalculating()` | `result()` | `error()` |
|---|---|---|---|
| Initial (no request yet) | `false` | `null` | `null` |
| Loading | `true` | `null` or stale | `null` |
| Success | `false` | `SalaryResponse` | `null` |
| Error | `false` | `null` | `ApiError` |

### Template rendering

The template in `salary-form.component.html` uses Angular's `@if` control flow blocks to show the right UI for each state:

```html
<!-- Loading State -->
@if (isCalculating()) {
  <div class="flex items-center justify-center ...">
    <div class="h-5 w-5 animate-spin rounded-full ..."></div>
    <span>Calculating...</span>
  </div>
}

<!-- Error State -->
@if (error(); as err) {
  <div class="rounded-lg border p-4 ...">
    <p>{{ err.message }}</p>
    <p>If the backend isn't running, start it with: cd backend && ./gradlew bootRun</p>
  </div>
}

<!-- Success State -->
@if (hasResult() && !isCalculating()) {
  <reloc-salary-breakdown [result]="result()!" />
}
```

Notice the guard on the success state: `hasResult() && !isCalculating()`. This prevents showing stale results while a new calculation is in flight. Without the `!isCalculating()` check, the user would see the old result *and* the loading spinner simultaneously — confusing and unprofessional.

The `error(); as err` syntax is Angular's `@if` with aliasing. It evaluates `error()` — if it's truthy (non-null), the block renders with `err` bound to the value. This avoids calling `error()` multiple times in the template.

### The state transitions

When the user changes the form, the pipeline drives these transitions:

1. **Initial -> Loading:** `tap()` sets `isCalculating(true)` and `error(null)`
2. **Loading -> Success:** `subscribe()` sets `result(response)` and `isCalculating(false)`
3. **Loading -> Error:** `catchError()` sets `error(err)`, `isCalculating(false)`, and `result(null)`
4. **Success -> Loading:** Next valid form change triggers `tap()` again
5. **Error -> Loading:** Next valid form change triggers `tap()` again (error is cleared)

There's no state where both `isCalculating` and `error` are truthy. There's no state where the user sees a stale result alongside a loading spinner. The signals enforce clean transitions.

---

## Common Mistakes

### 1. Forgetting to subscribe (Observables are lazy!)

```typescript
// BUG: This does nothing!
this.http.post<SalaryResponse>(url, body);

// Fixed: Subscribe to trigger the request
this.http.post<SalaryResponse>(url, body).subscribe(result => { ... });
```

Unlike Promises, Observables are **cold** by default. Creating an Observable doesn't execute anything — it's a blueprint. The HTTP request only fires when something subscribes. This catches everyone coming from the `fetch`/`axios` world, where calling `fetch()` immediately sends the request.

Our service returns the Observable without subscribing — that's correct. The *component* subscribes via the pipeline in `ngOnInit`. But if you forget to subscribe at the end, the entire pipeline is dead code. No request, no error, no nothing.

### 2. Not handling errors

```typescript
// DANGEROUS: Unhandled error kills the Observable stream
this.salaryService.calculate(request).subscribe(result => {
  this.result.set(result);
});
```

If the HTTP call fails and there's no error handler, the Observable errors out. In an `ngOnInit` pipeline, this means the *entire subscription dies* — the form stops responding to changes. The user has no idea what happened.

Always use `catchError` inside `switchMap` for pipeline-based subscriptions, or provide an error callback:

```typescript
this.salaryService.calculate(request).subscribe({
  next: result => this.result.set(result),
  error: err => this.error.set(err),
});
```

Our pipeline handles this correctly by placing `catchError` inside the `switchMap`, which catches the error, updates the error signal, and returns `EMPTY` — keeping the outer pipeline alive.

### 3. Memory leaks (forgetting to unsubscribe)

```typescript
// LEAK: This subscription lives forever, even after navigation
ngOnInit() {
  this.salaryForm.valueChanges.pipe(
    switchMap(() => this.salaryService.calculate(...))
  ).subscribe(result => { ... });
}
```

When the user navigates away, Angular destroys the component, but the subscription remains active. The form no longer exists, but the callback still fires (or tries to). Over time, these leaked subscriptions accumulate and cause memory issues.

The fix is `takeUntilDestroyed`:

```typescript
ngOnInit() {
  this.salaryForm.valueChanges.pipe(
    switchMap(() => this.salaryService.calculate(...)),
    takeUntilDestroyed(this.destroyRef)  // Auto-unsubscribe on destroy
  ).subscribe(result => { ... });
}
```

`takeUntilDestroyed` is from `@angular/core/rxjs-interop`. It listens for the component's `DestroyRef` signal and unsubscribes the entire chain. Place it as the *last* operator before `subscribe` so that it covers all operators in the pipeline.

### 4. Not clearing previous results on new request

```typescript
// CONFUSING: Shows stale results while loading
tap(() => {
  this.isCalculating.set(true);
  // Forgot to clear error!
}),
```

If the previous request errored and the user changes the form, you need to clear the error state before firing the new request. Otherwise the user sees an error message *and* a loading spinner. Our pipeline correctly does `this.error.set(null)` in the `tap` step.

Similarly, if a request errors, we set `this.result.set(null)` in the `catchError` block. This prevents showing a success result from a previous request alongside an error from the current one.

---

## Try It Yourself

### 1. Add a retry button

When an error occurs, the template shows the error message but doesn't offer a way to retry without changing the form. Add a "Retry" button to the error block that re-triggers the calculation with the current form values.

Hint: Create a `retry()` method on the component that manually calls `this.salaryService.calculate(...)` with the current form values and updates the signals. You'll need a separate `subscribe` call (with `takeUntilDestroyed`).

### 2. Add a request/response logging interceptor

Create a new file `frontend/src/app/core/interceptors/logging.interceptor.ts`. Write an `HttpInterceptorFn` that:

- Logs `[HTTP Request] POST http://localhost:8080/api/v1/salary/calculate` before each request
- Logs `[HTTP Response] 200 POST http://localhost:8080/api/v1/salary/calculate (142ms)` after each response, including the elapsed time

Hint: Use `tap` from RxJS inside the interceptor, and capture `Date.now()` before and after. Register it in `app.config.ts` alongside the error interceptor.

### 3. Test with the backend offline

Stop the Spring Boot backend (if it's running) and enter a salary in the form. Watch what happens:

- Does the loading spinner appear?
- Does the error message appear after the request times out?
- Does the error message say "Unable to connect to the server"?
- Does the form still respond to changes after the error?
- If you start the backend again and change the form, does it recover?

All of these should work correctly because of our Observable pipeline design and error interceptor. If any of them don't, trace the issue through the pipeline steps.

---

## Key Takeaway

The integration pattern in this project is the most important architectural decision. Here is what it demonstrates:

- **On the service pattern:** All API logic lives in injectable services — our `SalaryCalculationService` is ten lines of code. Components never touch `HttpClient` directly. This makes the API layer independently testable, reusable across features, and trivial to mock in component tests.

- **On the Observable pipeline:** Form changes flow through a reactive pipeline: `debounceTime` prevents excessive requests, `filter` skips invalid states, and `switchMap` cancels in-flight requests when new input arrives. This gives us automatic request deduplication and cancellation with zero manual bookkeeping.

- **On typed contracts:** Our TypeScript interfaces mirror the Kotlin data classes field-for-field. When someone adds a field to the backend response, they update the TypeScript interface in the same PR. It's a manual convention, not a compiler guarantee, but it means you can trace any field — like `solidaritySurcharge` — from the Kotlin service through Spring serialization, across the network, into the Angular signal, and out to the template.

- **On interceptors:** We use functional HTTP interceptors for cross-cutting concerns. Our error interceptor transforms raw `HttpErrorResponse` objects into typed `ApiError` objects with human-readable messages. Every API call in the app gets consistent error handling without any per-service code.

- **On state management:** The component uses three signals — `isCalculating`, `result`, and `error` — as a simple but complete state machine. The Observable pipeline drives all transitions, and the template uses `@if` blocks to render exactly one state at a time. No stale data, no impossible states.

---

## See Also

- [[cors]] — deeper reference on Cross-Origin Resource Sharing
- [[dependency-injection]] — how Angular's DI container works
- [[signals]] — Angular's reactive primitive for component state
- [[rxjs]] — RxJS operators and patterns
- [[tutorials/01-angular-scaffold]] — Angular project structure and `provideHttpClient()`
- [[tutorials/03-kotlin-spring-boot]] — the backend that receives these requests
- [[angular]] — Angular framework overview
- [[change-detection]] — how signals trigger re-renders with OnPush
