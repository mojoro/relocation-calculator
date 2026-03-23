# Tutorial 05 — Signals and State

> **Goal:** Understand Angular Signals — the framework's fine-grained reactivity primitive — and how we use them to manage state in the salary calculator. By the end, you'll be able to explain signals vs BehaviorSubject vs NgRx, read and write signal-based components, and talk confidently about reactive state in Angular interviews.

> **Prerequisites:** You understand React's `useState` or Vue's `ref()`. You've read [[tutorials/01-angular-scaffold|Tutorial 01: Angular Scaffold]] and are comfortable with standalone components and [[dependency-injection|DI]]. Familiarity with [[tutorials/03-kotlin-spring-boot|Tutorial 03: Kotlin + Spring Boot]] helps for the HTTP examples but isn't required.

---

## What Are Signals?

A **signal** is Angular's fine-grained reactivity primitive. It's a wrapper around a value that notifies consumers when that value changes. If you know React's `useState` or Vue's `ref()`, you already understand the basic idea — but signals are different in important ways.

The key mental model: **a signal always has a current value**. There is no "pending" state, no "hasn't emitted yet." When you create `signal(false)`, the value is `false` immediately. When you read it with `isCalculating()`, you always get a value back. This is fundamentally different from RxJS Observables, where a stream might never emit, or might emit after an indeterminate delay.

**The spreadsheet analogy:** Think of signals like cells in a spreadsheet. Cell A1 contains `50000` (your gross salary). Cell B1 contains a formula `=A1/12` (your monthly gross). Cell C1 contains `=B1 * 0.42` (your estimated tax). When you change A1, B1 and C1 automatically recalculate — but only the cells that actually depend on A1. Cells D1 through Z99 don't recalculate because they don't reference A1. That's exactly how Angular signals work: fine-grained, dependency-tracked, lazy recalculation.

### A brief history

Signals were introduced as a developer preview in **Angular 16** (May 2023) and became production-ready in **Angular 17** (November 2023). Since then, each Angular release has expanded signal support — signal inputs in v17.1, signal queries in v17.2, and model signals in v17.2. Our project runs Angular 21, where signals are the recommended approach for component state.

This isn't just a new API for its own sake. Signals are the foundation of Angular's future rendering model. The Angular team is building a new change detection system (called "signal-based change detection") that will eventually replace Zone.js entirely. Components that use signals today are already positioned for that future — they'll get faster rendering for free when the new system ships.

### Why not just use RxJS?

Angular has had RxJS since the beginning. Observables are powerful — they handle async streams, backpressure, complex event composition, and cancellation. But for *component state* (a value that changes over time and drives the template), Observables are overkill. You need to subscribe, unsubscribe, handle the async pipe, deal with `BehaviorSubject` vs `ReplaySubject` vs `Subject`, and manage the subscription lifecycle. Signals give you the reactive updates without the ceremony.

That doesn't mean RxJS is going away. RxJS is still the right tool for HTTP requests, WebSocket streams, complex event composition (debounce, switchMap, retry), and anything inherently asynchronous. The sweet spot is using both: RxJS for async data flow, signals for component state. Angular provides `toSignal()` to bridge the two, which we'll cover below.

---

## The Three Primitives

Angular's signal system has exactly three building blocks. Everything else is built on top of these.

### 1. `signal(value)` — Writable signals

A writable signal holds a value and provides methods to change it.

```typescript
import { signal } from '@angular/core';

// Create a signal with an initial value
const count = signal(0);

// Read the current value by calling it as a function
console.log(count());  // 0

// Set a new value
count.set(5);
console.log(count());  // 5

// Update based on the current value
count.update(current => current + 1);
console.log(count());  // 6
```

The API is intentionally small:
- **`signal(initialValue)`** — creates the signal
- **`signal()`** — reads the current value (call the signal as a function)
- **`.set(newValue)`** — replaces the value
- **`.update(fn)`** — transforms the value using a function that receives the current value

Here's how we use writable signals in our salary form component at `frontend/src/app/features/salary-calculator/salary-form.component.ts`:

```typescript
/** State signals */
readonly result = signal<SalaryResponse | null>(null);
readonly isCalculating = signal(false);
readonly error = signal<ApiError | null>(null);
```

Three signals, three pieces of state. `result` holds the API response (or `null` before the first calculation). `isCalculating` is a boolean loading flag. `error` holds any API error. Each starts with a sensible default, and each can be updated independently.

**React comparison:** This is conceptually similar to three separate `useState` calls:

```tsx
// React equivalent (for comparison only)
const [result, setResult] = useState<SalaryResponse | null>(null);
const [isCalculating, setIsCalculating] = useState(false);
const [error, setError] = useState<ApiError | null>(null);
```

The key difference: Angular signals are not hooks. They don't depend on call order, they can be created outside components, and they can be shared across the application. They're just values with change notification built in.

### 2. `computed(() => ...)` — Derived signals

A computed signal derives its value from other signals. It's read-only — you can't `.set()` or `.update()` it because its value is entirely determined by its dependencies.

```typescript
import { signal, computed } from '@angular/core';

const price = signal(100);
const quantity = signal(3);
const taxRate = signal(0.19);  // 19% German VAT

// Derived values — automatically recalculate when dependencies change
const subtotal = computed(() => price() * quantity());
const tax = computed(() => subtotal() * taxRate());
const total = computed(() => subtotal() + tax());

console.log(total());  // 357

price.set(200);
console.log(total());  // 714 — all three computed signals updated
```

Computed signals have two critical properties:

1. **Auto-tracked dependencies.** Angular doesn't need you to declare dependencies (no equivalent of React's `useMemo` dependency array). When the computed function runs, Angular records which signals it reads. If any of those signals change, the computed value is marked as stale.

2. **Lazy evaluation.** A stale computed signal doesn't immediately recalculate. It waits until something actually reads it. If you change `price` but never read `total`, the computation never runs. This is a performance feature — in a large app, many computed signals might be stale at any moment, but only the ones actually displayed in the current view need to recalculate.

From our `SalaryBreakdownComponent` at `frontend/src/app/features/salary-calculator/salary-breakdown.component.ts`:

```typescript
readonly deductionPercentage = computed(() => {
  const r = this.result();
  return ((r.totalDeductions / r.grossMonthly) * 100).toFixed(1);
});

readonly socialInsuranceTotal = computed(() => {
  const r = this.result();
  return r.healthInsurance + r.pensionInsurance
       + r.unemploymentInsurance + r.nursingCareInsurance;
});
```

`deductionPercentage` derives a human-readable percentage from the result signal. `socialInsuranceTotal` sums four insurance fields into one number. Neither recalculates until the underlying `result` signal changes.

And from the form component:

```typescript
readonly hasResult = computed(() => this.result() !== null);
readonly showChildCount = computed(() => this.salaryForm.controls.hasChildren.value);
```

`hasResult` is a boolean gate that the template uses to conditionally render the breakdown component. It's a computed signal derived from `result` — when `result` changes from `null` to a response object, `hasResult` flips to `true`, and the template reacts.

**Vue comparison:** `computed()` in Angular is almost identical to Vue's `computed()`. Both auto-track dependencies and both are lazy. The only syntax difference is that Angular computed signals are read by calling them as functions (`hasResult()`), while Vue uses `.value` (`hasResult.value`).

### 3. `effect(() => ...)` — Side effects

An effect runs a function whenever any signal it reads changes. Unlike computed signals, effects are for *side effects* — logging, analytics, localStorage persistence, DOM manipulation outside Angular's template system.

```typescript
import { signal, effect } from '@angular/core';

const theme = signal<'light' | 'dark'>('light');

effect(() => {
  // This runs immediately, then re-runs whenever theme() changes
  document.documentElement.setAttribute('data-theme', theme());
  console.log(`Theme switched to: ${theme()}`);
});

theme.set('dark');
// Console: "Theme switched to: dark"
// DOM: <html data-theme="dark">
```

**Use effects sparingly.** This is the most important rule about effects. If you find yourself using an effect to update another signal, you almost certainly want `computed()` instead. Effects are for reaching outside the signal graph — into the DOM, into localStorage, into analytics services. The Angular team's guidance is explicit: if a computed signal can do the job, use a computed signal.

Effects have these behaviors:
- They run at least once (immediately after creation)
- They auto-track dependencies, just like computed signals
- They are tied to a component's lifecycle — when the component is destroyed, the effect is cleaned up
- They run during change detection, not synchronously when a signal changes

Our project currently doesn't use `effect()` — and that's intentional. Our state flows through signals and computed signals into the template. There's no need for side-effect bridges. In the exercises below, you'll add one for learning purposes, but in production code, treat `effect()` as a code smell until you've confirmed that `computed()` can't do the job.

---

## Signals vs BehaviorSubject vs NgRx

If you've read Angular tutorials from before 2023, you've seen `BehaviorSubject` used for component state. If you've worked on large Angular apps, you've seen NgRx. Here's how signals compare.

| Aspect | `signal()` | `BehaviorSubject` | NgRx Store |
|---|---|---|---|
| **Import** | `@angular/core` | `rxjs` | `@ngrx/store` (third-party) |
| **Initial value** | Required | Required | Required (via reducer) |
| **Read value** | `sig()` | `subject.getValue()` or `subject\| async` | `store.select()` or `store.selectSignal()` |
| **Set value** | `sig.set(v)` | `subject.next(v)` | `store.dispatch(action)` |
| **Derived state** | `computed(() => ...)` | `combineLatest().pipe(map(...))` | Selectors with `createSelector()` |
| **Template binding** | Direct: `{{ sig() }}` | Needs `async` pipe: `{{ obs$ \| async }}` | Needs `async` pipe or `selectSignal()` |
| **Subscription mgmt** | None needed | Must unsubscribe | Must unsubscribe (unless using `async` pipe) |
| **Boilerplate** | Minimal | Moderate | Heavy (actions, reducers, effects, selectors) |
| **Best for** | Component/service state | Async streams, event composition | Large apps with complex shared state |

### When to still use RxJS

Signals don't replace RxJS — they complement it. Continue using RxJS when you need:

- **HTTP requests** — `HttpClient` returns Observables, and operators like `switchMap`, `catchError`, and `retry` are purpose-built for request management
- **Debouncing and throttling** — `debounceTime(400)` on form value changes, as we do in our salary form
- **Complex event composition** — merging multiple streams, racing responses, buffering events
- **WebSockets or Server-Sent Events** — inherently stream-based
- **Existing service contracts** — if a shared service exposes an Observable, don't fight it

Our salary form is a good example of using both. The *async data flow* (form changes -> debounce -> HTTP request -> response) uses RxJS because that's what RxJS is great at. The *component state* (result, isCalculating, error) uses signals because that's what signals are great at. The bridge point is in the `.subscribe()` callback, where RxJS hands off to signals:

```typescript
// RxJS pipeline delivers the response...
.subscribe((response) => {
  // ...and signals take over for state management
  this.result.set(response);
  this.isCalculating.set(false);
});
```

### When NgRx is worth it

NgRx is a Redux-inspired state management library for Angular. It introduces actions, reducers, effects (different from signal effects), and selectors. It's powerful for apps with complex shared state that multiple features read and write — think a banking dashboard where the account balance affects the transaction list, the budget chart, the notification badge, and the transfer form simultaneously.

For our relocation calculator, NgRx is overkill. Each wizard step has its own self-contained state. The salary calculator doesn't need to share its state with the cost estimator in real time. Signals (plus a service with signals, if needed for cross-component sharing) are the sweet spot for this level of complexity.

**Interview talking point:** "We chose signals over NgRx because our state is mostly local to each feature. NgRx adds significant boilerplate — actions, reducers, selectors — that only pays off when you have complex cross-feature state interactions. Signals give us fine-grained reactivity with minimal ceremony."

---

## toSignal() — Bridging RxJS

Angular provides `toSignal()` in `@angular/core/rxjs-interop` to convert an Observable into a Signal. This is the bridge between RxJS-based services and signal-based templates.

```typescript
import { toSignal } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';

// Convert an Observable to a Signal
const counter = toSignal(interval(1000), { initialValue: 0 });
// counter() returns 0, then 1, then 2, ... as the interval emits
```

`toSignal()` handles subscription and unsubscription automatically — it subscribes when created and unsubscribes when the component (or injection context) is destroyed. No `takeUntilDestroyed`, no `unsubscribe()` in `ngOnDestroy`.

### Practical example: auto-calculation with toSignal

Our current salary form uses a manual `.subscribe()` to bridge from RxJS to signals. Here's how you could rewrite it using `toSignal()`:

```typescript
import { toSignal } from '@angular/core/rxjs-interop';

// Instead of manual subscribe + signal.set(), you could do:
readonly calculationResult = toSignal(
  this.salaryForm.valueChanges.pipe(
    debounceTime(400),
    filter(() => this.salaryForm.valid),
    switchMap(formValue =>
      this.salaryService.calculate({
        grossAnnual: formValue.grossAnnual!,
        taxClass: formValue.taxClass!,
        churchTax: formValue.churchTax!,
        hasChildren: formValue.hasChildren!,
        childCount: formValue.hasChildren ? formValue.childCount! : 0,
      })
    )
  ),
  { initialValue: null }
);
```

This creates a signal that starts as `null` and updates every time the HTTP response arrives. The template can read it with `calculationResult()` — no async pipe, no manual subscription.

We chose *not* to use this pattern in our actual code because we need separate control over the `isCalculating` and `error` states. The manual approach gives us three independent signals that we update at different points in the RxJS pipeline (`tap` for loading start, `catchError` for errors, `subscribe` for success). The `toSignal` approach would collapse all of that into a single signal, losing the granularity we need for good UX (showing a spinner during loading, showing error messages, etc.).

**Rule of thumb:** Use `toSignal()` when you want a simple "Observable value as signal" conversion. Use manual `.subscribe()` + `.set()` when you need to update multiple signals at different stages of the pipeline.

### The reverse: toObservable()

Angular also provides `toObservable()` to convert a signal back to an Observable:

```typescript
import { toObservable } from '@angular/core/rxjs-interop';

const searchTerm = signal('');
const searchTerm$ = toObservable(searchTerm);

// Now you can use RxJS operators on signal changes
searchTerm$.pipe(
  debounceTime(300),
  distinctUntilChanged(),
  switchMap(term => this.searchService.search(term))
).subscribe(results => { /* ... */ });
```

This is useful when you have a signal (perhaps from a signal input) and need to feed it into an RxJS pipeline for operators like `debounceTime` or `switchMap`.

---

## Our Signal Architecture

Let's walk through the complete signal architecture of the salary calculator to see how everything fits together.

### The state layer (SalaryFormComponent)

In `frontend/src/app/features/salary-calculator/salary-form.component.ts`, three writable signals and two computed signals define the component's entire state:

```typescript
// Writable signals — the sources of truth
readonly result = signal<SalaryResponse | null>(null);
readonly isCalculating = signal(false);
readonly error = signal<ApiError | null>(null);

// Computed signals — derived from the writables
readonly hasResult = computed(() => this.result() !== null);
readonly showChildCount = computed(() => this.salaryForm.controls.hasChildren.value);
```

The data flow is:

1. User types in the form
2. `salaryForm.valueChanges` (RxJS Observable) emits
3. The RxJS pipeline debounces, validates, and sends the HTTP request
4. `isCalculating.set(true)` fires during the `tap` operator
5. On success: `result.set(response)` and `isCalculating.set(false)`
6. On error: `error.set(err)`, `isCalculating.set(false)`, `result.set(null)`
7. `hasResult` recomputes automatically based on `result`

### The template layer

The template reads signals by calling them as functions. Here are the key sections from `salary-form.component.html`:

```html
<!-- Loading state — reads isCalculating() -->
@if (isCalculating()) {
  <div class="flex items-center justify-center ...">
    <div class="h-5 w-5 animate-spin ..."></div>
    <span class="ml-3 text-sm ...">Calculating...</span>
  </div>
}

<!-- Error state — reads error() with alias -->
@if (error(); as err) {
  <div class="rounded-lg border p-4 ...">
    <p class="text-sm font-medium ...">{{ err.message }}</p>
  </div>
}

<!-- Results — reads hasResult() and result() -->
@if (hasResult() && !isCalculating()) {
  <reloc-salary-breakdown [result]="result()!" />
}
```

Notice the `@if` control flow syntax (new in Angular 17). Each condition reads a signal, and Angular's change detection knows exactly which template sections to re-evaluate when each signal changes. When `isCalculating` goes from `false` to `true`, Angular only touches the loading spinner block — it doesn't re-evaluate the error block or the results block because those depend on different signals.

The `result()!` uses TypeScript's non-null assertion because we've already guarded with `hasResult()`, which confirms `result()` is not null.

### The child component layer (SalaryBreakdownComponent)

The breakdown component receives data through a **signal input** (covered in the next section) and creates its own computed signals:

```typescript
// Input — receives the SalaryResponse from the parent
readonly result = input.required<SalaryResponse>();

// Computed — derived from the input signal
readonly deductionPercentage = computed(() => {
  const r = this.result();
  return ((r.totalDeductions / r.grossMonthly) * 100).toFixed(1);
});

readonly socialInsuranceTotal = computed(() => {
  const r = this.result();
  return r.healthInsurance + r.pensionInsurance
       + r.unemploymentInsurance + r.nursingCareInsurance;
});
```

The template uses these computed signals directly:

```html
<h4>Deductions ({{ deductionPercentage() }}% of gross)</h4>
<span>({{ socialInsuranceTotal() | currency:'EUR':'symbol':'1.2-2':'de' }})</span>
```

The full chain: `result` signal in parent -> signal input in child -> computed signals in child -> template bindings. Every link is reactive. Change the API response, and the deduction percentage and social insurance total update automatically without any imperative code.

---

## Signal Inputs

Angular 17.1 introduced **signal inputs** — a signal-based replacement for the `@Input()` decorator.

### The old way: `@Input()` decorator

```typescript
// The old way — still works, but not recommended for new code
@Input() result!: SalaryResponse;
```

Problems with `@Input()`:
- No signal integration — you can't use it in `computed()` or `effect()`
- Requires `!` (non-null assertion) because TypeScript doesn't know Angular will set it
- No way to mark an input as required at the type level (Angular 16 added `@Input({ required: true })`, but it's still decorator-based)
- Not reactive — if you need to react to input changes, you have to implement `ngOnChanges` or use a setter

### The new way: `input()` and `input.required<T>()`

```typescript
import { input } from '@angular/core';

// Optional input with a default value
readonly label = input('Default Label');

// Required input — TypeScript enforces that the parent must provide it
readonly result = input.required<SalaryResponse>();
```

Signal inputs are signals. You read them by calling them as functions (`this.result()`), and you can use them in `computed()` and `effect()` just like any other signal. This is what makes the computed chain in `SalaryBreakdownComponent` work — `this.result()` inside a `computed()` automatically registers `result` as a dependency.

From our `SalaryBreakdownComponent`:

```typescript
export class SalaryBreakdownComponent {
  readonly result = input.required<SalaryResponse>();

  readonly deductionPercentage = computed(() => {
    const r = this.result();  // reads the signal input
    return ((r.totalDeductions / r.grossMonthly) * 100).toFixed(1);
  });
}
```

And the parent passes data to it in the template:

```html
<reloc-salary-breakdown [result]="result()!" />
```

The `[result]` binding connects the parent's `result()` signal value to the child's `result` input signal. When the parent's signal updates, Angular propagates the new value to the child's input signal, which triggers the child's computed signals to recalculate, which updates the child's template. The entire chain is automatic.

**Interview talking point:** "Signal inputs unify Angular's input system with its reactivity system. Instead of using `ngOnChanges` to react to input changes, you use `computed()` to derive values from signal inputs — the same pattern you use for any other signal. This makes the reactivity model consistent and composable."

---

## Europace Context

Understanding where the Angular ecosystem is headed matters for Europace interviews. Here's the big picture.

Our relocation calculator uses:
- **3 writable signals** — `result`, `isCalculating`, `error`
- **4 computed signals** — `hasResult`, `showChildCount`, `deductionPercentage`, `socialInsuranceTotal`
- **1 signal input** — `result` in `SalaryBreakdownComponent`
- **0 effects** — we don't need them (and that's a good sign)

A production Europace Rechner (calculator) with more features would scale this linearly — perhaps 20 writable signals across all components, 15-20 computed signals, a handful of signal inputs, and maybe 1-2 effects for analytics or localStorage persistence. The architecture stays flat and readable. There's no action/reducer/selector ceremony, no subscription management, no memory leak risk from forgotten unsubscriptions.

This is the direction Angular is going. The Angular team has been explicit:

1. **Signals are the future of state management** for component-level and feature-level state
2. **Zone.js will become optional** — signal-based change detection will replace zone-based detection, making apps faster and smaller (Zone.js is ~30kB gzipped)
3. **RxJS remains important** for async operations — HttpClient, WebSockets, complex event composition
4. **NgRx is adopting signals** — NgRx 17+ added `selectSignal()` and signal-based stores, recognizing that signals are the primitive going forward

When an interviewer asks about state management in Angular, the modern answer is: "Signals for component state, RxJS for async data flow, and NgRx only if the application's shared state complexity justifies the overhead."

---

## Common Mistakes

These are the errors you'll make (or see others make) when starting with signals. Know them so you can avoid them and spot them in code review.

### 1. Mutating signal values instead of calling `.set()`

```typescript
// WRONG — mutating the object doesn't trigger change detection
const user = signal({ name: 'Ada', age: 30 });
user().age = 31;  // The signal doesn't know the value changed!

// RIGHT — create a new object and .set() it
user.set({ ...user(), age: 31 });

// ALSO RIGHT — use .update() for clarity
user.update(current => ({ ...current, age: 31 }));
```

Signals use reference equality by default. Mutating a property on an existing object doesn't change the object reference, so the signal doesn't detect the change. This is the same gotcha as React's `useState` with objects — you must create a new reference.

### 2. Using `effect()` when `computed()` would do

```typescript
// WRONG — using effect to derive state
const firstName = signal('Ada');
const lastName = signal('Lovelace');
const fullName = signal('');

effect(() => {
  fullName.set(`${firstName()} ${lastName()}`);  // Don't do this!
});

// RIGHT — use computed for derived values
const fullName = computed(() => `${firstName()} ${lastName()}`);
```

The `effect` version creates a circular-feeling pattern (signals updating signals), is harder to reason about, and can cause unnecessary re-renders. `computed()` is declarative — it says "this value is always derived from these other values" rather than "when these values change, do this imperative thing."

### 3. Forgetting to call the signal as a function

```typescript
const count = signal(0);

// WRONG — this is the Signal object, not the value
console.log(count);       // WritableSignal { ... }
if (count) { ... }        // Always truthy — it's an object!

// RIGHT — call it to get the value
console.log(count());     // 0
if (count()) { ... }      // Evaluates the actual number
```

This is the most common beginner mistake. In templates, Angular's compiler will warn you, but in TypeScript code (services, computed functions, effects), you'll get silent bugs. The signal object itself is always truthy, so `if (count)` will always be true even when the value is `0`, `false`, `null`, or `undefined`.

### 4. Creating signals outside an injection context without cleanup

```typescript
// CAUTION — effect() needs an injection context for cleanup
effect(() => {
  console.log(this.result());
});
```

`effect()` must be created in a constructor, a field initializer, or a function called with `runInInjectionContext`. If created elsewhere (like in `ngOnInit`), you need to pass a `DestroyRef` or an `Injector` explicitly for proper cleanup. Our project avoids this issue by declaring everything as class fields, which are initialized in the constructor context.

### 5. Using signals for everything

Not everything needs to be a signal. Local variables in methods, function parameters, one-shot computations — these are just regular TypeScript values. Signals add overhead (small, but nonzero) and should be reserved for values that change over time and drive template updates.

```typescript
// WRONG — overkill for a one-shot value
calculate() {
  const monthlyGross = signal(this.grossAnnual() / 12);  // Why?
  // ...
}

// RIGHT — just use a regular variable
calculate() {
  const monthlyGross = this.grossAnnual() / 12;
  // ...
}
```

---

## Try It Yourself

These exercises use the existing salary calculator code. Start the dev server with `cd frontend && npx ng serve` and open `http://localhost:4200`.

### Exercise 1: Add a computed signal

Open `frontend/src/app/features/salary-calculator/salary-breakdown.component.ts`. Add a computed signal that calculates the effective tax rate (income tax as a percentage of gross monthly):

```typescript
readonly effectiveTaxRate = computed(() => {
  const r = this.result();
  return ((r.incomeTax / r.grossMonthly) * 100).toFixed(1);
});
```

Then display it in `salary-breakdown.component.html` somewhere in the deductions section:

```html
<p class="text-xs" style="color: var(--reloc-ref-color-text-muted)">
  Effective tax rate: {{ effectiveTaxRate() }}%
</p>
```

Enter a salary and verify the percentage appears and updates when you change the gross salary.

### Exercise 2: Add an effect that logs state changes

In `salary-form.component.ts`, add an `effect` that logs every calculation result to the console. Add it as a class field:

```typescript
private readonly logEffect = effect(() => {
  const r = this.result();
  if (r) {
    console.log(`Calculation complete: gross=${r.grossMonthly}, net=${r.netMonthly}`);
  }
});
```

Open DevTools console, change the salary input, and verify the log appears after each calculation. Then ask yourself: could this be a `computed` instead? No — logging is a side effect, so `effect()` is correct here. But notice that this is the *only* legitimate use case we've found for `effect()` in this component.

### Exercise 3: Refactor a BehaviorSubject to a Signal

Create a temporary `BehaviorSubject`-based counter to understand the difference. In any component, try:

```typescript
// BehaviorSubject version (the old way)
private countSubject = new BehaviorSubject<number>(0);
count$ = this.countSubject.asObservable();

increment() {
  this.countSubject.next(this.countSubject.getValue() + 1);
}

// In template: {{ count$ | async }}
```

Now refactor it to signals:

```typescript
// Signal version (the modern way)
readonly count = signal(0);

increment() {
  this.count.update(n => n + 1);
}

// In template: {{ count() }}
```

Notice what disappeared: no `BehaviorSubject`, no `.asObservable()`, no `.getValue()`, no `.next()`, no `async` pipe, no subscription to manage. The signal version is half the code with zero subscription-related bug potential.

---

## Interview Talking Points

Keep these in your back pocket for Angular-focused interviews:

- **On what signals are:** "Signals are Angular's fine-grained reactivity primitive. A signal always holds a current value, tracks its consumers automatically, and notifies them when it changes. Think of it as a reactive variable — like React's `useState` but without the hook rules and call-order constraints."

- **On the three primitives:** "Angular's signal system has three building blocks: `signal()` for writable state, `computed()` for derived state, and `effect()` for side effects. In practice, you'll use `signal` and `computed` constantly and `effect` rarely — if you find yourself reaching for `effect`, check whether `computed` can do the job first."

- **On signals vs RxJS:** "Signals and RxJS solve different problems. Signals are for synchronous reactive state — the current value of a form field, a loading flag, a derived computation. RxJS is for asynchronous event streams — HTTP responses, WebSocket messages, debounced user input. In our project, the data pipeline uses RxJS operators, and the component state uses signals. `toSignal()` bridges the two when needed."

- **On comparison to React/Vue:** "Angular signals are closest to Vue's `ref()` and `computed()`. Unlike React's `useState`, signals don't depend on hook call order, can be created anywhere (not just in components), and track dependencies automatically without a manual dependency array. Compared to Vue, the main API difference is reading values with `signal()` instead of `.value`."

- **On the future of Angular:** "Signals are the foundation for Angular's next-generation rendering model. The Angular team is building signal-based change detection that will make Zone.js optional, reducing bundle size and improving performance. Components that use signals today are already positioned for that future."

---

## See Also

- [[signals]] — concept reference page
- [[change-detection]] — how Angular decides what to re-render
- [[onpush]] — OnPush strategy and how it interacts with signals
- [[rxjs]] — RxJS in Angular: Observables, operators, and patterns
- [[standalone-components]] — standalone component architecture
- [[dependency-injection]] — Angular's DI system
- [[tutorials/01-angular-scaffold]] — project structure and Angular fundamentals
- [[tutorials/03-kotlin-spring-boot]] — the backend that our signals-based form calls
