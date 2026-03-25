# Best Practices

This document collects the coding standards and architectural conventions enforced throughout this project. They exist for two reasons: correctness (many of these prevent real bugs) and consistency with Europace's Rechner patterns. Following them makes code review faster and the interview story cleaner.

---

## Angular Best Practices

### 1. Always use `ChangeDetectionStrategy.OnPush`

Every component in this project — including `AppComponent` — sets `changeDetection: ChangeDetectionStrategy.OnPush` in its `@Component` decorator. Without it, Angular re-renders the entire component tree on every browser event (mouse moves, keystrokes, timer ticks), regardless of whether anything changed. OnPush restricts re-rendering to three cases: a signal the template reads emits a new value, an `@Input()` reference changes, or an event originates inside the component. This is the standard at Europace and the correct default for any Signal-driven Angular app.

```typescript
@Component({
  selector: 'reloc-salary-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './salary-form.component.html',
})
export class SalaryFormComponent { }
```

See [[change-detection]] and [[onpush]] for the full explanation.

---

### 2. Standalone components — never use NgModules

Every component has `standalone: true`. The `imports` array in `@Component` lists only what that specific component directly uses — not bulk re-exports, and not `CommonModule`. `CommonModule` is a legacy barrel that re-exports `NgIf`, `NgFor`, `NgSwitch`, `AsyncPipe`, and others in one shot. Importing it imports everything, defeating tree-shaking. Instead, import specific pipes (`CurrencyPipe`, `PercentPipe`) when needed and use the built-in control flow syntax (`@if`, `@for`, `@switch`) which requires no imports at all.

```typescript
// Correct — specific, tree-shakeable
@Component({
  standalone: true,
  imports: [ReactiveFormsModule, CurrencyPipe, RouterLink],
})

// Wrong — imports hundreds of unused symbols
@Component({
  standalone: true,
  imports: [CommonModule],
})
```

See [[standalone-components]].

---

### 3. New template control flow syntax

Use `@if`, `@for`, and `@switch` — not `*ngIf`, `*ngFor`, or `*ngSwitch`. The new syntax is built into the Angular compiler and requires no imports. It also has better type narrowing and supports `@empty` blocks for zero-item lists.

The `track` expression in `@for` is required, not optional. Use a unique identifier when the items have one:

```html
<!-- Correct -->
@for (item of deductions; track item.label) {
  <tr>
    <td>{{ item.label }}</td>
    <td>{{ item.amount | currency:'EUR' }}</td>
  </tr>
} @empty {
  <tr><td colspan="2">No deductions calculated yet.</td></tr>
}

@if (isCalculating()) {
  <reloc-loading-spinner />
} @else if (error()) {
  <p class="text-red-600">{{ error()!.message }}</p>
} @else if (result()) {
  <reloc-salary-breakdown [result]="result()!" />
}
```

---

### 4. Signals for state, RxJS for streams

Signals and RxJS are not interchangeable — they solve different problems. Use `signal()` for values that drive templates. Use `computed()` for values derived from other signals. Use RxJS for HTTP requests, debounced form input, cancellation with `switchMap`, and multi-source `combineLatest` patterns.

Bridge the two with `toSignal()`. Do not manually subscribe and call `signal.set()` — that is exactly what `toSignal()` automates, including cleanup on destroy.

```typescript
// Correct — toSignal bridges RxJS into the signal graph
readonly salaryResult = toSignal(
  this.salaryForm.valueChanges.pipe(
    debounceTime(400),
    filter(() => this.salaryForm.valid),
    switchMap(val => this.salaryService.calculate(val))
  )
);

// Wrong — manual subscription creates a cleanup obligation and bypasses toSignal
this.salaryForm.valueChanges.pipe(...).subscribe(result => {
  this.result.set(result);
});
```

State that drives template rendering must be a signal, not a `BehaviorSubject`. `BehaviorSubject` with `async` pipe requires `AsyncPipe` in imports and does not integrate with the OnPush/Signal change detection model cleanly.

See [[signals]] and [[rxjs]].

---

### 5. Signal inputs and outputs

Prefer `input<T>()` and `output<T>()` over `@Input()` and `@Output() new EventEmitter<T>()`. Signal inputs are read-only signals inside the component — the template reads them with `myInput()` just like any other signal. Required inputs use `input.required<T>()`, which produces a TypeScript compile error if the parent does not pass the value.

```typescript
// Correct
readonly result = input.required<SalaryResponse>();
readonly stepChange = output<number>();

// Works but legacy
@Input() result!: SalaryResponse;
@Output() stepChange = new EventEmitter<number>();
```

---

### 6. Reactive forms with typed controls

Every `FormControl` must have an explicit type parameter. Use `FormControl<number | null>` (not `FormControl`), and declare validators in the constructor (not in the template via `required` attributes or `Validators.required` on the `FormGroup` level when control-level is clearer).

The parity rule: if the backend rejects a value, the frontend must prevent it from being sent. If `TaxCalculationService` requires `grossAnnual >= 1`, then the `FormControl` must have `Validators.min(1)`. Never rely solely on server-side validation to catch values the user could have been warned about instantly.

```typescript
this.salaryForm = new FormGroup({
  grossAnnual: new FormControl<number | null>(null, [
    Validators.required,
    Validators.min(1),
    Validators.max(10_000_000),
  ]),
  taxClass: new FormControl<TaxClass>('I', Validators.required),
  churchTax: new FormControl<boolean>(false, { nonNullable: true }),
  hasChildren: new FormControl<boolean>(false, { nonNullable: true }),
  childCount: new FormControl<number>(0, { nonNullable: true }),
});
```

See [[reactive-forms]] and [[form-validation]].

---

### 7. Memory management — `takeUntilDestroyed`

Any `.subscribe()` call inside a component must pipe `takeUntilDestroyed(this.destroyRef)` to auto-unsubscribe when the component is destroyed. Inject `DestroyRef` via `inject()` in the constructor or as a class field.

```typescript
private destroyRef = inject(DestroyRef);

ngOnInit() {
  this.someService.stream$
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe(value => this.localState.set(value));
}
```

Prefer `toSignal()` over manual subscriptions wherever possible — it handles cleanup automatically, requires no `DestroyRef`, and integrates directly with the signal graph.

---

### 8. Interactive elements must be `<button>`, not `<div>`

Any element with a `(click)` handler must be a `<button type="button">` or an `<a href>`. Divs with click handlers are keyboard-inaccessible (not focusable, no Enter/Space handling) and are not announced by screen readers. Buttons and links get focus management, keyboard events, and correct ARIA roles automatically from the browser.

```html
<!-- Correct -->
<button type="button" (click)="onSelectBezirk(bezirk)" class="...">
  {{ bezirk.name }}
</button>

<!-- Wrong — keyboard users and screen reader users cannot activate this -->
<div (click)="onSelectBezirk(bezirk)" class="...">
  {{ bezirk.name }}
</div>
```

---

### 9. Accessibility minimums

These are not optional. They are the baseline required to call a component production-ready:

- Every `<input>` must have an associated `<label>` — via matching `for`/`id` attributes or an `aria-label` on the input itself.
- Loading spinners must have `role="status"` and `aria-label="Loading..."` so screen readers announce the state change.
- `<nav>` elements must have `aria-label` to distinguish multiple navigation regions (e.g., "Main navigation" vs "Step navigation").
- The active step in the wizard step indicator must carry `aria-current="step"`.

```html
<!-- Label via for/id -->
<label for="grossAnnual">Gross Annual Salary (EUR)</label>
<input id="grossAnnual" type="number" formControlName="grossAnnual" />

<!-- Loading spinner -->
<div role="status" aria-label="Calculating..." class="spinner"></div>

<!-- Step indicator active step -->
<li aria-current="step">Step 2: Cost Estimation</li>
```

---

### 10. Lazy-loaded routes

All feature components must be declared with `loadComponent` in `app.routes.ts`. Never import a feature component directly at the top of the routes file — that pulls it into the main bundle and defeats tree-shaking and code splitting.

```typescript
// Correct — each feature is a separate chunk loaded on demand
export const routes: Routes = [
  {
    path: 'salary',
    loadComponent: () =>
      import('./features/salary-calculator/salary-calculator.component')
        .then(m => m.SalaryCalculatorComponent),
  },
];

// Wrong — SalaryCalculatorComponent is now in the main bundle unconditionally
import { SalaryCalculatorComponent } from './features/salary-calculator/salary-calculator.component';
export const routes: Routes = [
  { path: 'salary', component: SalaryCalculatorComponent },
];
```

See [[lazy-loading]].

---

## Kotlin / Spring Boot Best Practices

### 1. Constructor injection only

All Spring beans use primary constructor injection. Never use `@Autowired` field injection. Field injection hides dependencies, makes unit testing harder (you cannot construct the class outside of Spring), and couples the class to the DI container. Kotlin enforces this naturally since constructor parameters are `val` by default.

```kotlin
// Correct
@RestController
class SalaryController(private val taxService: TaxCalculationService) { }

// Wrong — hidden dependency, untestable outside Spring
@RestController
class SalaryController {
    @Autowired
    private lateinit var taxService: TaxCalculationService
}
```

---

### 2. Data classes for API contracts

Request and response types must be `data class`. They get `equals`, `hashCode`, `copy`, and `toString` for free in one line. Nullable fields use `Type?` and pair with `@field:JsonProperty` or Bean Validation annotations when customization is needed.

Note: non-nullable Kotlin primitives (`Int`, `String`) bypass Bean Validation's `@NotNull` because Kotlin already guarantees non-nullability at the language level. Apply `@field:Min`, `@field:Max`, and `@field:NotBlank` to add value constraints beyond nullability.

```kotlin
data class SalaryRequest(
    @field:Min(1, message = "Gross annual salary must be at least 1")
    @field:Max(10_000_000, message = "Value exceeds supported range")
    val grossAnnual: Int,
    val taxClass: TaxClass,
    val churchTax: Boolean = false,
    val hasChildren: Boolean = false,
    @field:Min(0) val childCount: Int = 0
)
```

---

### 3. Always include a `@RestControllerAdvice`

A global exception handler must exist to convert `MethodArgumentNotValidException` into structured JSON. Without it, `@Valid` violations return Spring Boot's default error body — a large HTML page or opaque JSON blob that the Angular `errorInterceptor` cannot parse cleanly.

Also handle `HttpMessageNotReadableException` (malformed JSON or an invalid enum value in the request body — e.g., `"taxClass": "VII"` when only I–VI are valid).

```kotlin
@RestControllerAdvice
class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException::class)
    fun handleValidation(ex: MethodArgumentNotValidException): ResponseEntity<ApiErrorResponse> {
        val errors = ex.bindingResult.fieldErrors.map {
            FieldError(field = it.field, message = it.defaultMessage ?: "Invalid value")
        }
        return ResponseEntity.badRequest().body(
            ApiErrorResponse(status = 400, message = "Validation failed", fieldErrors = errors)
        )
    }

    @ExceptionHandler(HttpMessageNotReadableException::class)
    fun handleMalformedJson(ex: HttpMessageNotReadableException): ResponseEntity<ApiErrorResponse> {
        return ResponseEntity.badRequest().body(
            ApiErrorResponse(status = 400, message = "Malformed request body", fieldErrors = emptyList())
        )
    }
}
```

---

### 4. `@Valid` on all request bodies

Every `@PostMapping` and `@PutMapping` controller method must annotate the request body with `@Valid`. Without it, Bean Validation annotations on the data class (`@Min`, `@Max`, `@NotBlank`) are silently ignored — the service receives whatever the client sent, including negative salaries.

```kotlin
@PostMapping("/salary/calculate")
fun calculateNetSalary(@Valid @RequestBody request: SalaryRequest): SalaryResponse {
    return taxService.calculate(request)
}
```

---

### 5. CORS configuration must include the production domain

`CorsRegistration.allowedOrigins()` must list both `http://localhost:4200` (local dev) and the deployed frontend URL. Omitting the production URL means the app works locally and fails silently in production — a common last-minute deploy bug.

When `allowCredentials = true`, `allowedHeaders("*")` wildcard is rejected by the CORS spec. List headers explicitly.

```kotlin
override fun addCorsMappings(registry: CorsRegistry) {
    registry.addMapping("/api/**")
        .allowedOrigins(
            "http://localhost:4200",
            "https://berlin-relocation-calculator.vercel.app"
        )
        .allowedMethods("GET", "POST", "OPTIONS")
        .allowedHeaders("Content-Type", "Accept")
}
```

---

### 6. Typed error bodies on all error responses

`ResponseEntity.badRequest().build()` and `ResponseEntity.notFound().build()` return empty bodies. The Angular `errorInterceptor` expects a consistent JSON structure — an empty body causes a JSON parse error on top of the original error. Always attach a body.

```kotlin
// Correct
return ResponseEntity.badRequest().body(
    ApiErrorResponse(status = 400, message = "Tax class VI requires employer association")
)

// Wrong — empty body breaks the frontend error interceptor
return ResponseEntity.badRequest().build()
```

---

### 7. Use `kotlin.math.round()` for financial rounding

Casting to `Long` truncates (floors) rather than rounds. For monetary values, truncation produces incorrect results for values like `3141.385` → `3141.38` instead of `3141.39`. Use `kotlin.math.round()` at two decimal places.

```kotlin
// Correct
fun roundToCents(value: Double): Double = kotlin.math.round(value * 100.0) / 100.0

// Wrong — truncates, not rounds
fun truncateToCents(value: Double): Double = (value * 100.0).toLong() / 100.0
```

---

## Integration Layer Best Practices

### 1. Shared contracts are the source of truth

TypeScript interfaces in `shared/api-contracts/` mirror Kotlin data classes field-for-field. When a field name or type changes in Kotlin, the TypeScript mirror must be updated in the same commit. The frontend `core/models/` files re-export from `shared/api-contracts/` — they do not redefine the types.

`ApiError` lives in exactly one place (`core/models/api-error.model.ts`) and is imported wherever it is needed. It is never duplicated or redefined inline.

```typescript
// shared/api-contracts/salary.ts — source of truth
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

// core/models/salary.model.ts — re-export only, no redefinition
export type { SalaryResponse } from '../../../shared/api-contracts/salary';
```

---

### 2. All HTTP calls must be typed

`http.post<SalaryResponse>(url, body)` not `http.post(url, body)`. Untyped calls return `Observable<Object>`, which provides no compile-time safety. The generic type parameter is a compile-time contract with the backend — if the Kotlin response shape changes and the TypeScript interface is not updated, the TypeScript compiler will surface the mismatch.

```typescript
// Correct
return this.http.post<SalaryResponse>(`${this.baseUrl}/salary/calculate`, request);

// Wrong — loses type safety, IDE autocomplete, and compile-time contract
return this.http.post(this.baseUrl + '/salary/calculate', request);
```

---

### 3. Loading/error/success states on every API call

Every component that makes an HTTP call exposes three signals: `isLoading`, `result`, and `error`. The template always renders all three states. There must be no UI state where the user cannot tell what is happening.

```typescript
readonly isLoading = signal(false);
readonly result = signal<SalaryResponse | null>(null);
readonly error = signal<ApiError | null>(null);
```

`switchMap` in the RxJS chain automatically cancels in-flight requests when the user changes the form before a response arrives. This prevents stale results from rendering after a newer request has already been sent.

See [[signals]] for the signal pattern and [[interceptors]] for where `ApiError` is constructed.

---

### 4. Error interceptor is the single error-handling point

Individual services must not `catchError`. The functional `errorInterceptor` (`HttpInterceptorFn`) is the sole place where `HttpErrorResponse` is converted to a typed `ApiError`. Components read the `error` signal set by the RxJS pipeline's `catchError` — they never call `new ApiError(...)` themselves.

Register via `provideHttpClient(withInterceptors([errorInterceptor]))` in `app.config.ts`. Registering the interceptor anywhere else creates duplicate interception.

See [[interceptors]].

---

### 5. Environment URLs, never hardcoded

The backend base URL lives in `environment.ts` (`http://localhost:8080/api/v1`) and `environment.prod.ts` (the deployed URL). Services read from the injected environment, never from a hardcoded string. A hardcoded `localhost` in a service silently breaks every production deploy.

```typescript
// Correct — environment-aware
@Injectable({ providedIn: 'root' })
export class SalaryCalculationService {
  private readonly baseUrl = environment.apiBaseUrl;
}

// Wrong — breaks in production
private readonly baseUrl = 'http://localhost:8080/api/v1';
```

---

## Official Documentation

- [Angular: Change Detection](https://angular.dev/best-practices/skipping-subtrees)
- [Angular: Standalone Components](https://angular.dev/guide/components/importing)
- [Angular: Built-in Control Flow](https://angular.dev/guide/templates/control-flow)
- [Angular: Signal Inputs](https://angular.dev/guide/components/inputs)
- [Angular: takeUntilDestroyed](https://angular.dev/api/core/rxjs-interop/takeUntilDestroyed)
- [Angular: Lazy Loading](https://angular.dev/guide/ngmodules/lazy-loading)
- [Spring Boot: Bean Validation](https://docs.spring.io/spring-boot/reference/io/validation.html)
- [Spring Boot: Exception Handling](https://spring.io/blog/2013/11/01/exception-handling-in-spring-mvc)
- [Kotlin: Data Classes](https://kotlinlang.org/docs/data-classes.html)
