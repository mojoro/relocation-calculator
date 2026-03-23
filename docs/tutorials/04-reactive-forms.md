# Tutorial 04 — Reactive Forms

> **Goal:** Understand Angular's reactive forms system — `FormGroup`, `FormControl`, `Validators`, and the RxJS pipeline that turns form changes into HTTP requests. By the end, you'll be able to build type-safe, auto-calculating forms and explain the exact pattern Europace uses across their 7 FormGroups and 88 validators in the Rechner app.

> **Prerequisites:** You've read [[01-angular-scaffold|Tutorial 01]] (standalone components, dependency injection, signals) and [[03-kotlin-spring-boot|Tutorial 03]] (backend validation with `@Valid`). You know HTML forms. You don't need prior experience with Angular forms or RxJS.

---

## Template-Driven vs Reactive Forms

Angular ships two form systems. You need to pick one per form — they don't mix.

### Template-driven forms

Template-driven forms use `ngModel` to bind inputs directly to component properties. The form structure lives in the HTML template:

```html
<!-- Template-driven: the template IS the source of truth -->
<input [(ngModel)]="grossAnnual" required />
<input [(ngModel)]="taxClass" />
```

This works well for simple forms — a login page, a search bar, a settings toggle. The template is the single source of truth, and Angular infers the form structure from your HTML.

### Reactive forms

Reactive forms define the form structure in TypeScript. The template just wires up to it:

```typescript
// Reactive: TypeScript IS the source of truth
this.salaryForm = new FormGroup({
  grossAnnual: new FormControl<number | null>(null, [Validators.required]),
  taxClass: new FormControl<TaxClass>('I', { nonNullable: true }),
});
```

The form model is an object you create, inspect, and manipulate in code. Validators are functions, not HTML attributes. The form's value is always accessible as a typed object. You can subscribe to changes as an RxJS Observable.

### The analogy

Think of it this way: **template-driven forms are like a WYSIWYG editor** — you see what you get, it's quick to set up, but when you need precision, you're fighting the tool. **Reactive forms are like writing code in a text editor** — more setup, but you have total control, and complex behavior is straightforward rather than hacky.

### Why Europace uses reactive forms

Europace's Rechner is a multi-step mortgage calculator — a wizard with 7 `FormGroups`, 88 validators, conditional fields that appear based on prior answers, cross-field validation (loan amount can't exceed property value), and auto-calculation on every change. Template-driven forms would be a nightmare for this. Reactive forms give you:

- **Programmatic control** — add/remove validators, enable/disable fields, reset subsets of the form
- **Type safety** — `FormControl<TaxClass>` prevents assigning a number to a tax class field
- **Testability** — unit test form logic without rendering a template
- **RxJS integration** — `valueChanges` is an Observable, so you can debounce, filter, and switchMap directly

Our salary form is one FormGroup with five controls. It demonstrates every pattern you'd see in the Rechner, just at smaller scale.

---

## FormGroup and FormControl

A `FormGroup` is a container — think of it as a JavaScript object where each key maps to a `FormControl`. A `FormControl` is a single input: it tracks the current value, validation status, and user interaction state (touched, dirty, pristine).

### Our salary form

Here's the form definition from `salary-form.component.ts`:

```typescript
readonly salaryForm = new FormGroup({
  grossAnnual: new FormControl<number | null>(null, [
    Validators.required,
    Validators.min(0),
    Validators.max(10_000_000),
  ]),
  taxClass: new FormControl<TaxClass>('I', { nonNullable: true }),
  churchTax: new FormControl<boolean>(false, { nonNullable: true }),
  hasChildren: new FormControl<boolean>(false, { nonNullable: true }),
  childCount: new FormControl<number>(0, {
    nonNullable: true,
    validators: [Validators.min(0), Validators.max(10)],
  }),
});
```

Let's unpack each control:

### `grossAnnual: FormControl<number | null>`

The type is `number | null` because the field starts empty. When the user hasn't typed anything, the value is `null`, not `0` — that distinction matters. A salary of `0` is valid input (someone could be checking the math); `null` means "not yet entered." The three validators enforce that it's present, non-negative, and under 10 million.

### `taxClass: FormControl<TaxClass>` with `nonNullable: true`

The `nonNullable: true` option is critical. Without it, calling `salaryForm.reset()` would set `taxClass` to `null` — but our type says it should be a `TaxClass` string literal, never null. With `nonNullable: true`, resetting returns it to the initial value (`'I'`), and the type system knows the value is always `TaxClass`, never `TaxClass | null`.

If you forget `nonNullable`, you'll get silent type mismatches. The control's value type widens to `TaxClass | null`, and you'll need null checks everywhere you access it. This is one of the most common Angular forms mistakes.

### `churchTax` and `hasChildren: FormControl<boolean>`

Boolean toggles. Both use `nonNullable: true` because a checkbox is always either on or off — there's no "unanswered" state. They default to `false`.

### `childCount: FormControl<number>`

Also `nonNullable` — it defaults to `0`. Note the slightly different syntax: when passing both `nonNullable` and `validators`, you use the options object form `{ nonNullable: true, validators: [...] }` instead of passing validators as a second positional argument. Both syntaxes work, but the options object is clearer when you have multiple settings.

### Connecting the form to the template

In the template (`salary-form.component.html`), you bind the form group to a `<form>` element and each control to its input:

```html
<form [formGroup]="salaryForm">
  <input type="number" formControlName="grossAnnual" />
  <input type="radio"  formControlName="taxClass" [value]="tc.value" />
  <input type="checkbox" formControlName="churchTax" />
  <!-- ... -->
</form>
```

`[formGroup]="salaryForm"` tells Angular "this `<form>` is managed by the `salaryForm` FormGroup." `formControlName="grossAnnual"` tells Angular "this `<input>` is bound to the `grossAnnual` FormControl inside that group." The string must match the key in the FormGroup exactly.

### The mental model

```
FormGroup (salaryForm)          ←→  <form [formGroup]="salaryForm">
├── FormControl (grossAnnual)   ←→    <input formControlName="grossAnnual">
├── FormControl (taxClass)      ←→    <input formControlName="taxClass">
├── FormControl (churchTax)     ←→    <input formControlName="churchTax">
├── FormControl (hasChildren)   ←→    <input formControlName="hasChildren">
└── FormControl (childCount)    ←→    <input formControlName="childCount">
```

The left side lives in TypeScript. The right side lives in HTML. They're synchronized automatically. When the user types, the FormControl updates. When you call `setValue()` in code, the input updates.

---

## Validators

Validators are pure functions. They take a `FormControl` and return either `null` (valid) or an error object (invalid). That's the entire API.

### Built-in validators

Angular provides the common ones:

| Validator | What it checks | Error key |
|---|---|---|
| `Validators.required` | Value is not empty/null | `'required'` |
| `Validators.min(n)` | Number >= n | `'min'` |
| `Validators.max(n)` | Number <= n | `'max'` |
| `Validators.minLength(n)` | String length >= n | `'minlength'` |
| `Validators.pattern(regex)` | String matches regex | `'pattern'` |
| `Validators.email` | Valid email format | `'email'` |

Our form uses `required`, `min`, and `max`. That's enough for a salary calculator. Europace's Rechner, with its 88 validators, uses all of these plus dozens of custom validators for domain rules like "loan term must be between 5 and 30 years" or "repayment rate plus interest rate must not exceed 100%."

### How validators return errors

When a validator fails, it returns an object whose keys describe the error:

```typescript
// Validators.required returns this when the control is empty:
{ required: true }

// Validators.min(0) returns this when the value is -5:
{ min: { min: 0, actual: -5 } }

// Validators.max(10_000_000) returns this when the value is 20_000_000:
{ max: { max: 10000000, actual: 20000000 } }
```

When the control is valid, `errors` is `null`. When it's invalid, `errors` is the merged object of all failing validators.

### Displaying errors in templates

Here's how our template shows validation messages for `grossAnnual`:

```html
@if (salaryForm.controls.grossAnnual.errors?.['required']
     && salaryForm.controls.grossAnnual.touched) {
  <p class="mt-1 text-xs" style="color: var(--reloc-ref-color-error)">
    Salary is required
  </p>
}
@if (salaryForm.controls.grossAnnual.errors?.['min']) {
  <p class="mt-1 text-xs" style="color: var(--reloc-ref-color-error)">
    Salary must be positive
  </p>
}
@if (salaryForm.controls.grossAnnual.errors?.['max']) {
  <p class="mt-1 text-xs" style="color: var(--reloc-ref-color-error)">
    Salary exceeds maximum
  </p>
}
```

Notice the `.touched` check on the `required` error: we only show "Salary is required" after the user has interacted with the field and moved away. Without that check, the error would show immediately on page load before the user has done anything — a poor experience. The `min` and `max` errors don't need the `touched` check because the user can only trigger them by actively typing a value.

The optional chaining (`errors?.['required']`) is necessary because `errors` is `null` when the control is valid. Without the `?.`, you'd get a runtime error.

### Validation parity with the backend

Look at our Kotlin `SalaryRequest` model:

```kotlin
data class SalaryRequest(
    @field:NotNull(message = "Gross annual salary is required")
    @field:Min(value = 0, message = "Salary must be non-negative")
    @field:Max(value = 10_000_000, message = "Salary exceeds maximum")
    val grossAnnual: Int,

    @field:NotNull(message = "Tax class is required")
    val taxClass: TaxClass,
    // ...
)
```

The frontend validators and backend `@Valid` annotations enforce the same rules:

| Rule | Frontend (Angular) | Backend (Jakarta) |
|---|---|---|
| Salary required | `Validators.required` | `@NotNull` |
| Salary >= 0 | `Validators.min(0)` | `@Min(0)` |
| Salary <= 10M | `Validators.max(10_000_000)` | `@Max(10_000_000)` |
| Child count >= 0 | `Validators.min(0)` | `@Min(0)` |

This isn't accidental — it's a pattern called **validation parity**. The frontend validation gives instant feedback. The backend validation is the safety net — it catches anything that bypasses the UI (API calls from curl, browser devtools, or bugs). Neither is optional. The backend controller uses `@Valid` on the request body to trigger Jakarta Bean Validation:

```kotlin
@PostMapping("/salary/calculate")
fun calculateNetSalary(@Valid @RequestBody request: SalaryRequest): ResponseEntity<SalaryResponse>
```

In an interview, being able to explain both sides and *why both exist* is a strong signal that you understand production systems.

---

## Reactive Forms + RxJS: The Auto-Calculating Pattern

This is where reactive forms earn their name. Every `FormGroup` and `FormControl` has a `valueChanges` property — an RxJS Observable that emits every time the value changes. This is the bridge between forms and the reactive programming model.

### The pipeline in our salary form

Here's the complete auto-calculation pipeline from `salary-form.component.ts`:

```typescript
ngOnInit(): void {
  this.salaryForm.valueChanges
    .pipe(
      debounceTime(400),
      filter(() => this.salaryForm.valid
                && this.salaryForm.controls.grossAnnual.value !== null),
      tap(() => {
        this.isCalculating.set(true);
        this.error.set(null);
      }),
      switchMap(() => {
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
            catchError((err: ApiError) => {
              this.error.set(err);
              this.isCalculating.set(false);
              this.result.set(null);
              return EMPTY;
            })
          );
      }),
      takeUntilDestroyed(this.destroyRef)
    )
    .subscribe((response) => {
      this.result.set(response);
      this.isCalculating.set(false);
    });
}
```

Let's walk through each operator:

### `debounceTime(400)`

Wait 400ms after the last change before proceeding. Without this, typing "60000" would fire 5 HTTP requests — one for "6", one for "60", one for "600", and so on. The debounce waits until the user stops typing, then fires once. This is the same pattern you'd use for a search-as-you-type feature.

### `filter(() => this.salaryForm.valid && ...)`

Only proceed if the form is valid. If the user has cleared the salary field (making it `null` and thus failing `required`), don't send an HTTP request. This prevents sending invalid payloads to the backend and getting back 400 errors.

### `tap(() => { ... })`

Side effects that don't change the data: set the loading spinner, clear any previous error. `tap` is for "do something, but pass the value through unchanged."

### `switchMap(() => { ... })`

This is the key operator. `switchMap` starts an HTTP request and — critically — **cancels any in-flight request** when a new value arrives. If the user changes the tax class while a previous calculation is still pending, `switchMap` aborts the old request and starts a new one. Without it, you'd get race conditions: the first request might return after the second one, overwriting the correct result with a stale one.

### `getRawValue()` vs `.value`

Inside the `switchMap`, we call `this.salaryForm.getRawValue()` instead of `.value`. The difference: `.value` excludes disabled controls. `getRawValue()` includes everything. If we ever disable a field (e.g., greying out `childCount` when `hasChildren` is false), `.value` would silently omit it. `getRawValue()` always returns the complete form state.

### `catchError((err) => EMPTY)`

If the HTTP request fails (backend is down, validation error, network issue), catch the error, update the error signal, and return `EMPTY` — an Observable that completes immediately without emitting. This prevents the error from killing the entire subscription. Without `catchError`, a single failed request would unsubscribe from `valueChanges` permanently, and the form would stop auto-calculating.

### `takeUntilDestroyed(this.destroyRef)`

Automatically unsubscribe when the component is destroyed. This prevents memory leaks — without it, the subscription would live on even after the user navigates away. `takeUntilDestroyed` is Angular's modern replacement for the older `ngOnDestroy` + manual unsubscription pattern.

### Why this pattern matters

This entire pipeline — debounce, validate, switch, catch — is a production pattern. Europace's Rechner does this exact thing: every form change triggers a recalculation of the mortgage offer. The debounce prevents API abuse, the filter prevents invalid requests, the switchMap prevents race conditions, and the catchError prevents cascading failures. If you can explain this pipeline step by step in an interview, you demonstrate real understanding of reactive programming, not just "I've used RxJS."

---

## Conditional Fields

Our form has a conditional field: `childCount` only appears when `hasChildren` is checked. This is a common pattern in wizard-style forms.

### Showing/hiding with `@if`

In the template, Angular's built-in `@if` control flow syntax handles the visibility:

```html
@if (salaryForm.controls.hasChildren.value) {
  <div class="ml-12">
    <label for="childCount">Number of Children</label>
    <input type="number" formControlName="childCount" min="0" max="10" />
  </div>
}
```

When `hasChildren` is `false`, the entire `<div>` is removed from the DOM — it's not just hidden with CSS. This means screen readers won't find it, tab navigation skips it, and Angular doesn't waste cycles change-detecting it.

### Resetting dependent fields

When the user unchecks `hasChildren`, we need to reset `childCount` back to `0`. Otherwise, the hidden field would retain its previous value, and the backend would receive a child count for someone who said they have no children:

```typescript
this.salaryForm.controls.hasChildren.valueChanges
  .pipe(takeUntilDestroyed(this.destroyRef))
  .subscribe((hasChildren) => {
    if (!hasChildren) {
      this.salaryForm.controls.childCount.setValue(0);
    }
  });
```

This is a separate subscription from the main auto-calculation pipeline. Each `valueChanges` subscription is independent — the `hasChildren` toggle resets the child count, and then the main pipeline picks up the resulting change (because `setValue(0)` triggers `valueChanges` on the form group).

### A subtlety in the HTTP request

Even with the reset logic, we belt-and-suspenders it in the `switchMap`:

```typescript
childCount: formValue.hasChildren ? formValue.childCount : 0,
```

This ensures the backend never receives a non-zero child count when `hasChildren` is false, even if there's a race condition between the reset subscription and the HTTP subscription. Defensive programming.

### Europace's version at scale

In the Rechner, conditional fields are everywhere. Selecting "existing property" vs "new construction" shows completely different form sections. Choosing a fixed interest rate period reveals a dropdown for the term length. The pattern is the same as ours — listen to the controlling field's `valueChanges`, reset or disable dependent fields — but multiplied across 7 form groups.

---

## Common Mistakes

These are the errors you'll hit (or that come up in code reviews) when working with reactive forms.

### 1. Forgetting `ReactiveFormsModule`

```
ERROR: Can't bind to 'formGroup' since it isn't a known property of 'form'.
```

Every component that uses `[formGroup]` or `formControlName` must import `ReactiveFormsModule` in its `imports` array. Since we use standalone components, this goes in the component decorator:

```typescript
@Component({
  standalone: true,
  imports: [ReactiveFormsModule], // <-- Don't forget this
})
```

This is the single most common Angular forms error. The error message is clear, but it trips up everyone at least once.

### 2. Not using `nonNullable`

```typescript
// Bad: reset() sets taxClass to null, violating the TaxClass type
taxClass: new FormControl<TaxClass>('I'),

// Good: reset() sets taxClass back to 'I'
taxClass: new FormControl<TaxClass>('I', { nonNullable: true }),
```

Without `nonNullable`, the control's value type is actually `TaxClass | null`, even though the generic says `TaxClass`. TypeScript trusts you here — it doesn't widen the type automatically. You'll only discover the problem when `reset()` sets the value to `null` and downstream code breaks.

Rule of thumb: if a field has a meaningful default value, use `nonNullable: true`. The only time you want a nullable control is when "no value" is a distinct valid state (like our `grossAnnual` field, where `null` means "not yet entered").

### 3. Checking `valid` without `touched`

```html
<!-- Bad: shows error before user has interacted -->
@if (salaryForm.controls.grossAnnual.errors?.['required']) {
  <p>Salary is required</p>
}

<!-- Good: shows error only after user has interacted and left the field -->
@if (salaryForm.controls.grossAnnual.errors?.['required']
     && salaryForm.controls.grossAnnual.touched) {
  <p>Salary is required</p>
}
```

A form that screams "REQUIRED!" before the user has typed a single character is hostile. Check `touched` (user focused and blurred the field) or `dirty` (user changed the value) before showing `required` errors.

### 4. Subscribing without unsubscribing

```typescript
// Bad: memory leak if component is destroyed
this.salaryForm.valueChanges.subscribe(value => { ... });

// Good: automatic cleanup
this.salaryForm.valueChanges
  .pipe(takeUntilDestroyed(this.destroyRef))
  .subscribe(value => { ... });
```

`takeUntilDestroyed` is the modern Angular way (v16+). It requires injecting `DestroyRef` and passing it to the operator. The older patterns — `Subject` + `takeUntil` in `ngOnDestroy`, or implementing `OnDestroy` to call `unsubscribe()` — still work but are more boilerplate.

For Europace's codebase with dozens of form subscriptions per wizard step, forgetting to unsubscribe would cause real performance degradation over time.

### 5. Using `.value` when you need `.getRawValue()`

```typescript
// .value: excludes disabled controls
const partial = this.salaryForm.value;
// If childCount is disabled, partial.childCount is undefined

// .getRawValue(): includes everything
const full = this.salaryForm.getRawValue();
// full.childCount is always present
```

When sending data to a backend, prefer `getRawValue()` so you never accidentally omit fields.

---

## Try It Yourself

These exercises reinforce the patterns from this tutorial. Each one touches a different concept.

### Exercise 1: Add a new form field

Add a `privateHealthInsurance` boolean toggle to the form. Steps:
1. Add a `FormControl<boolean>` to the `salaryForm` FormGroup with `nonNullable: true` and a default of `false`
2. Add a checkbox to the template with `formControlName="privateHealthInsurance"`
3. Include the new field in the `switchMap` payload sent to the backend
4. Verify it appears in `salaryForm.getRawValue()` by logging to the console

### Exercise 2: Write a custom validator

Write a validator that rejects salary values that aren't round thousands (e.g., 60000 is valid, 60500 is not). A custom validator is just a function:

```typescript
function roundThousands(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (value === null || value === undefined) return null; // let required handle it
  return value % 1000 === 0 ? null : { roundThousands: { actual: value } };
}
```

Add it to the `grossAnnual` validators array and add an `@if` block in the template for the `'roundThousands'` error key.

### Exercise 3: Inspect `form.value` vs `form.getRawValue()`

Open browser devtools and run:

```typescript
// In the component, add a temporary button:
// <button (click)="debugForm()">Debug</button>
debugForm(): void {
  console.log('value:', this.salaryForm.value);
  console.log('getRawValue:', this.salaryForm.getRawValue());
  console.log('valid:', this.salaryForm.valid);
  console.log('errors:', this.salaryForm.controls.grossAnnual.errors);
}
```

Try it with different form states: empty, partially filled, invalid values. Notice when `valid` flips and what `errors` contains.

---

## Interview Talking Points

Use these as ready-to-go responses when asked about forms, validation, or frontend architecture.

### On reactive forms vs template-driven

> "We used reactive forms because the salary calculator auto-recalculates on every change — we pipe `valueChanges` through `debounceTime`, `filter` for validity, and `switchMap` into the HTTP call. That pattern would be awkward with template-driven forms because you'd need to manually wire up `ngModelChange` handlers and manage the async logic yourself. Reactive forms give you the Observable out of the box."

### On validation parity

> "Every validator on the frontend has a corresponding Jakarta Bean Validation annotation on the backend. The frontend validates for instant feedback — the user sees 'Salary is required' without a round trip. The backend validates as the safety net — it catches anything sent directly to the API. Neither side trusts the other, which is the right approach for production."

### On `switchMap` and race conditions

> "We use `switchMap` specifically because it cancels in-flight requests. If the user changes the tax class while a calculation is pending, `switchMap` aborts the stale request and starts a fresh one. Without it, a slower first request could resolve after a faster second request and overwrite the correct result. Europace's Rechner has the same pattern — every form change triggers a mortgage recalculation, and `switchMap` guarantees the displayed result always matches the current form state."

### On `takeUntilDestroyed` and memory management

> "Every subscription to `valueChanges` uses `takeUntilDestroyed` so it auto-cleans when the component is destroyed. In a wizard like Europace's Rechner, where the user navigates through multiple form steps, orphaned subscriptions would accumulate and cause memory leaks. `takeUntilDestroyed` is the Angular v16+ pattern — cleaner than the old `Subject` + `takeUntil` in `ngOnDestroy` approach."

### On typed forms

> "Angular v14+ supports strictly typed reactive forms. Our `FormControl<TaxClass>` with `nonNullable: true` means the compiler knows the value is always a `TaxClass` literal, never null. This catches a whole class of bugs at compile time — if you accidentally pass the tax class to a function expecting a number, TypeScript stops you. The 88 validators in Europace's Rechner benefit enormously from this — refactoring a form field's type propagates type errors to every place that reads it."

---

## See Also

- [[reactive-forms]] — reference page for Angular's reactive forms API
- [[angular]] — Angular framework overview and key concepts
- [[rxjs]] — RxJS operators reference (`debounceTime`, `switchMap`, `filter`, `takeUntilDestroyed`)
- [[form-validation]] — validation patterns, custom validators, cross-field validation
- [[01-angular-scaffold|Tutorial 01 — Angular Scaffold]] — standalone components, dependency injection, signals
- [[02-design-tokens|Tutorial 02 — Design Tokens]] — the design system tokens used in form styling
- [[03-kotlin-spring-boot|Tutorial 03 — Kotlin + Spring Boot]] — backend validation with `@Valid` and Jakarta Bean Validation
