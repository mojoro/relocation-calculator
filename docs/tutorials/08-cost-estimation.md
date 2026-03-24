# Tutorial 08 — Cost Estimation End-to-End

> **Goal:** Trace the cost estimation feature from HTTP verb selection through backend query parameters, Angular component composition, affordability calculation, and cross-step data sharing. By the end, you'll understand GET vs POST semantics, the smart/presentational component pattern, and how `sessionStorage` bridges wizard steps.

> **Prerequisites:** You've read [[tutorials/06-http-integration|Tutorial 06: HTTP Integration]] (services, HttpClient, Observable pipeline) and [[tutorials/07-spring-services|Tutorial 07: Spring Services]] (service layer, CostEstimationService). You understand [[tutorials/05-signals-and-state|signals]] and [[tutorials/04-reactive-forms|reactive forms]].

---

## GET vs POST: Choosing the Right Verb

### Why cost estimation uses GET

The salary calculator uses POST. The cost estimator uses GET. This isn't arbitrary — it reflects the fundamental nature of each operation.

**POST `/api/v1/salary/calculate`** — The request carries a complex body with five fields (gross salary, tax class, church tax, children flag, child count). The response depends entirely on that body. You wouldn't bookmark a salary calculation because the inputs are personal and the URL doesn't capture them.

**GET `/api/v1/costs/estimate?bezirk=pankow&rooms=2`** — The request is two simple parameters. The response is the same for everyone who asks about 2-room apartments in Pankow. This URL is:

| Property | GET Cost Estimate | POST Salary Calculate |
|---|---|---|
| **Idempotent** | Yes — same params, same result | Yes — same body, same result |
| **Cacheable** | Yes — browsers and CDNs can cache GET | No — POST is never cached by default |
| **Bookmarkable** | Yes — the URL captures the full query | No — the body isn't in the URL |
| **Request body** | None (params in URL) | JSON body required |
| **Semantic meaning** | "Give me this resource" | "Process this data" |

The rule of thumb: **GET for retrieval, POST for computation with complex input.** If the parameters fit comfortably in a URL (under ~2000 characters) and the operation is a pure read, use GET.

### How the controller implements it

```kotlin
@GetMapping("/costs/estimate")
fun estimateCosts(
    @RequestParam bezirk: String,
    @RequestParam(defaultValue = "2") rooms: Int
): ResponseEntity<CostEstimate> {
    return try {
        val estimate = costService.estimateCosts(bezirk, rooms)
        ResponseEntity.ok(estimate)
    } catch (e: IllegalArgumentException) {
        ResponseEntity.badRequest().build()
    }
}
```

Compare this to the salary controller:

```kotlin
@PostMapping("/salary/calculate")
fun calculateNetSalary(@Valid @RequestBody request: SalaryRequest): ResponseEntity<SalaryResponse> {
```

The differences are visible in every line:
- `@GetMapping` vs `@PostMapping`
- `@RequestParam` vs `@RequestBody`
- Parameters as method arguments vs a single data class
- Manual error handling vs `@Valid` auto-validation

---

## Query Parameters in Spring

### `@RequestParam` basics

When the frontend calls `GET /api/v1/costs/estimate?bezirk=pankow&rooms=3`, Spring maps the URL parameters to method arguments:

```kotlin
fun estimateCosts(
    @RequestParam bezirk: String,         // "pankow"
    @RequestParam(defaultValue = "2") rooms: Int  // 3
)
```

Spring handles type conversion automatically. The URL parameter `rooms=3` is a string in the raw HTTP request, but Spring converts it to `Int` because the method parameter is typed as `Int`. If someone sends `rooms=abc`, Spring returns a 400 Bad Request with a type mismatch error — no custom code needed.

### Default values

`@RequestParam(defaultValue = "2")` means if the URL has no `rooms` parameter at all (`GET /api/v1/costs/estimate?bezirk=pankow`), Spring uses `2` as the default. This is a convenience for API consumers — they don't need to specify every parameter when the defaults are sensible.

**Angular comparison:** This is like Angular's `input()` with a default value: `readonly rooms = input(2)`. The framework provides a sensible default, but the consumer can override it.

### The neighborhood endpoints

The `CostController` also exposes neighborhood data:

```kotlin
@GetMapping("/neighborhoods")
fun getAllNeighborhoods(): ResponseEntity<List<NeighborhoodProfile>> {
    return ResponseEntity.ok(costService.getAllProfiles())
}

@GetMapping("/neighborhoods/{bezirk}")
fun getNeighborhood(@PathVariable bezirk: String): ResponseEntity<NeighborhoodProfile> {
```

Notice the difference: `@RequestParam` extracts from the query string (`?bezirk=pankow`), while `@PathVariable` extracts from the URL path (`/neighborhoods/pankow`). The convention: use path variables for resource identifiers (which neighborhood?), query parameters for optional filters and modifiers (how many rooms?).

---

## Component Composition in Angular

### Smart vs presentational components

The cost estimation feature uses two components:

1. **`CostEstimatorComponent`** (smart) — manages state, calls the API, handles form inputs, computes derived values
2. **`CostBreakdownComponent`** (presentational) — receives data via inputs, renders it, has no logic of its own

This is the **smart/presentational component pattern** (also called container/presentational). It's the same pattern we use in the salary calculator: `SalaryFormComponent` (smart) owns the form and API call, `SalaryBreakdownComponent` (presentational) renders the results.

**Why separate them?** The same reasons as services vs controllers:

- **Testability** — the presentational component is trivial to test: pass in data, check the rendered output. No HTTP mocking, no form setup.
- **Reusability** — `CostBreakdownComponent` could display cost data from any source: an API, a mock, a different page. It doesn't know or care where the data comes from.
- **Readability** — the smart component handles "what to do." The presentational component handles "how to look."

### Parent-to-child data flow

The smart component passes data to the presentational one using signal inputs:

```typescript
// CostBreakdownComponent (presentational)
export class CostBreakdownComponent {
  readonly estimate = input.required<{
    displayName: string;
    rooms: number;
    rentRange: { min: number; max: number; median: number };
    utilities: number;
    transport: number;
    groceries: number;
    totalEstimated: number;
  }>();
  readonly netMonthlySalary = input<number | null>(null);
  readonly affordabilityRatio = input<number | null>(null);
  readonly affordabilityLabel = input<{ text: string; color: string } | null>(null);
}
```

Four signal inputs. One is required (`estimate`), three are optional with defaults. The parent template binds to them:

```html
<reloc-cost-breakdown
  [estimate]="currentEstimate()"
  [netMonthlySalary]="netMonthlySalary()"
  [affordabilityRatio]="affordabilityRatio()"
  [affordabilityLabel]="affordabilityLabel()"
/>
```

Every `[input]="signal()"` binding reads a signal from the parent and passes its value to the child's input signal. When the parent's signal updates (new API response, new form selection), the child's input updates, and the child's template re-renders. The entire chain is reactive and automatic.

**Inline type declaration.** Notice that `estimate` uses an inline type rather than importing a shared interface. For a presentational component that's tightly coupled to one feature, this is a pragmatic choice — it avoids creating a type file that only one component uses. For cross-feature types (like `SalaryResponse`), a shared interface in `core/models/` is better.

---

## The Affordability Calculation

### Cross-step data with sessionStorage

The cost estimator shows how your estimated monthly costs compare to your net salary from Step 1. But the salary calculator and cost estimator are separate routes with separate components — how does Step 2 know what Step 1 calculated?

The answer is `sessionStorage`. When the salary calculator receives a result, it stores the net monthly salary:

```typescript
// In the salary calculator (Step 1):
sessionStorage.setItem('netMonthlySalary', response.netMonthly.toString());
```

The cost estimator reads it on initialization:

```typescript
// In the cost estimator (Step 2):
const stored = sessionStorage.getItem('netMonthlySalary');
this.netMonthlySalary = stored ? parseFloat(stored) : null;
```

**Why `sessionStorage` and not a shared service?** For a wizard where data flows forward (Step 1 result feeds into Step 2), `sessionStorage` is simpler than a shared signal service. It persists across route navigations (the data survives when the user clicks from `/salary` to `/costs`), it persists across page refreshes (the user can reload Step 2 without losing Step 1's result), and it requires zero additional architecture.

A shared injectable service with signals would be cleaner for complex two-way data sharing, but for one-directional "Step 1 feeds Step 2" data flow, `sessionStorage` is the pragmatic choice.

### Computed signals for derived state

The affordability calculation uses `computed` signals to derive the ratio and label from the raw data:

```typescript
readonly affordabilityRatio = computed(() => {
  const net = this.netMonthlySalary();
  const total = this.currentEstimate()?.totalEstimated;
  if (!net || !total) return null;
  return total / net;
});

readonly affordabilityLabel = computed(() => {
  const ratio = this.affordabilityRatio();
  if (ratio === null) return null;
  if (ratio <= 0.40) return { text: 'Comfortable', color: 'var(--reloc-ref-color-success)' };
  if (ratio <= 0.50) return { text: 'Manageable', color: 'var(--reloc-ref-color-warning)' };
  return { text: 'Tight', color: 'var(--reloc-ref-color-error)' };
});
```

This is a signal chain: `netMonthlySalary` + `currentEstimate` feed into `affordabilityRatio`, which feeds into `affordabilityLabel`. Change either source signal and the entire chain recalculates. The template reads the computed values:

```html
@if (affordabilityRatio(); as ratio) {
  <p class="text-xl font-bold">
    {{ ratio | percent:'1.0-0' }}
  </p>
}
```

The `percent` pipe formats `0.42` as `42%`. The `@if ... as ratio` syntax unwraps the nullable value — inside the block, `ratio` is guaranteed to be a `number`, not `number | null`.

### The visual affordability bar

The cost breakdown template includes a progress bar that visually represents the affordability ratio:

```html
<div class="h-3 w-full rounded-full" style="background-color: var(--reloc-ref-color-border)">
  <div
    class="h-3 rounded-full transition-all"
    [style.width.%]="ratio * 100 > 100 ? 100 : ratio * 100"
    [style.background-color]="affordabilityLabel()?.color || 'var(--reloc-ref-color-primary)'"
  ></div>
</div>
```

The bar's width is the ratio as a percentage, capped at 100%. Its color comes from the `affordabilityLabel` computed signal — green for comfortable, amber for manageable, red for tight. The `transition-all` class adds a smooth animation when the ratio changes (e.g., when the user switches to a different Bezirk).

---

## The Cost Estimation Observable Pipeline

### Comparing to the salary pipeline

The salary calculator uses a single `valueChanges` stream from one `FormGroup`. The cost estimator has two independent form controls — Bezirk selection and room count — that both need to trigger a new estimate.

For the salary calculator:

```typescript
this.salaryForm.valueChanges.pipe(
  debounceTime(400),
  filter(() => this.salaryForm.valid),
  switchMap(() => this.salaryService.calculate(...))
)
```

For the cost estimator, because the controls are separate, you could use `combineLatest` to merge them:

```typescript
combineLatest([
  this.bezirkControl.valueChanges.pipe(startWith(this.bezirkControl.value)),
  this.roomsControl.valueChanges.pipe(startWith(this.roomsControl.value))
]).pipe(
  debounceTime(300),
  filter(([bezirk, rooms]) => bezirk !== null),
  switchMap(([bezirk, rooms]) =>
    this.costService.estimateCosts(bezirk!, rooms!)
  )
)
```

**`combineLatest` explained.** `combineLatest` takes multiple Observables and emits an array of their latest values whenever *any* of them emits. It waits until every source has emitted at least once, then fires on every subsequent emission from any source.

The `startWith` operator is needed because `valueChanges` only emits on *change* — it doesn't emit the initial value. Without `startWith`, `combineLatest` would wait forever if the user only changes one control (because the other never emits).

**Why not a single FormGroup?** You *could* put both controls in one `FormGroup` and use `formGroup.valueChanges` like the salary calculator. Both approaches work. `combineLatest` is more explicit about which inputs matter and is a useful pattern to know for interview discussions — it comes up whenever you need to react to changes from multiple independent sources.

### GET request with query parameters

The Angular service for cost estimation would use `HttpClient.get()` with params:

```typescript
@Injectable({ providedIn: 'root' })
export class CostEstimationService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiBaseUrl}/costs/estimate`;

  estimateCosts(bezirk: string, rooms: number): Observable<CostEstimate> {
    return this.http.get<CostEstimate>(this.apiUrl, {
      params: { bezirk, rooms: rooms.toString() }
    });
  }
}
```

The `params` object is automatically serialized to query string format: `?bezirk=pankow&rooms=2`. Angular handles the URL encoding. On the backend, `@RequestParam` picks up the values.

---

## Try It Yourself

### 1. Query the API directly

```bash
# Estimate costs for a 2-room apartment in Mitte
curl -s "http://localhost:8080/api/v1/costs/estimate?bezirk=mitte&rooms=2" | python3 -m json.tool

# Compare: same rooms, different district
curl -s "http://localhost:8080/api/v1/costs/estimate?bezirk=marzahn-hellersdorf&rooms=2" | python3 -m json.tool

# Test the default: omit rooms (should default to 2)
curl -s "http://localhost:8080/api/v1/costs/estimate?bezirk=pankow" | python3 -m json.tool

# Invalid bezirk — should return 400
curl -s "http://localhost:8080/api/v1/costs/estimate?bezirk=narnia&rooms=2" -w "\nHTTP %{http_code}\n"
```

### 2. Add a new cost item

Add an `internet` field to the cost estimate. Steps:

1. Add `const val INTERNET_MONTHLY = 35.0` to the `CostEstimationService` companion object
2. Add `val internet: Double` to the `CostEstimate` data class
3. Include it in `totalEstimated` calculation
4. Add a row in `cost-breakdown.component.html` to display it
5. Test with curl and verify the total increased by 35 EUR

### 3. Try different rooms

Compare a 1-room apartment in Friedrichshain-Kreuzberg with a 4-room apartment in Spandau. Which is cheaper? Use the `AVG_SQM_BY_ROOMS` map to understand why square meters matter more than per-sqm price.

### 4. Implement the sessionStorage bridge

If you haven't already, add `sessionStorage.setItem()` to the salary calculator's success handler and `sessionStorage.getItem()` to the cost estimator's `ngOnInit`. Navigate from Step 1 to Step 2 and verify the affordability check section appears with your calculated net salary.

---

## Interview Talking Points

- **On GET vs POST:** "Cost estimation is a GET because it's a pure read — same parameters always return the same data. The URL is bookmarkable and cacheable. Salary calculation is POST because it processes a complex request body. Choosing the right HTTP verb isn't just convention — it determines whether browsers and CDNs can cache the response, whether users can bookmark and share the URL, and whether the operation is safe to retry on network failure."

- **On component composition:** "We split cost estimation into a smart component (handles API calls and state) and a presentational component (renders the data). The presentational `CostBreakdownComponent` has four signal inputs and zero injected services. It's trivially testable — just pass in data and assert the output. This is the same container/presentational pattern used throughout Europace's Rechner."

- **On cross-step data flow:** "The wizard uses `sessionStorage` to pass the net salary from Step 1 to Step 2's affordability check. It's simpler than a shared signal service for unidirectional data flow, survives page refreshes, and requires zero additional architecture. For bidirectional or complex cross-feature state, we'd use an injectable service with signals — but that's overkill for 'Step 1 feeds Step 2.'"

- **On affordability calculation:** "The cost ratio is a chain of computed signals — `affordabilityRatio` derives from `netMonthlySalary` and `currentEstimate`, then `affordabilityLabel` derives from `affordabilityRatio`. Change either source signal and the entire chain recalculates lazily. The template reads the final computed values, so the UI always reflects the current state."

---

## See Also

- [[tutorials/07-spring-services]] — the CostEstimationService and Bezirk enum
- [[tutorials/06-http-integration]] — HttpClient, services pattern, Observable pipelines
- [[tutorials/05-signals-and-state]] — computed signals and signal inputs
- [[tutorials/04-reactive-forms]] — form controls and valueChanges
- [[tutorials/09-wizard-navigation]] — how the router connects the wizard steps
- [[signals]] — Angular's reactive primitive
- [[rxjs]] — combineLatest, startWith, and other operators
