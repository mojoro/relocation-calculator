# Tutorial 09 — Wizard Navigation & Router Architecture

> **Goal:** Understand how the Angular Router powers the multi-step wizard, how `toSignal` bridges router events into the reactive signal world, how the step indicator component tracks progress, and how shared components like `CurrencyInputComponent` integrate with the forms system. By the end, you'll be able to explain the wizard architecture and Angular routing patterns confidently.

> **Prerequisites:** You've read [[tutorials/01-angular-scaffold|Tutorial 01: Angular Scaffold]] (standalone components, lazy loading) and [[tutorials/05-signals-and-state|Tutorial 05: Signals]] (signals, computed, toSignal). Basic familiarity with URL-based routing from any framework (React Router, Vue Router, etc.) is helpful.

---

## The Angular Router

### What it does

The Angular Router maps URLs to components. When the user navigates to `/salary`, the router renders `SalaryCalculatorComponent`. When they navigate to `/costs`, it destroys the salary component and renders `CostEstimatorComponent` in its place. The URL is the source of truth for what the user sees.

This is the same model as React Router, Vue Router, or any server-side framework's routing. The difference is configuration syntax and integration with Angular's dependency injection and lazy loading systems.

### Our route configuration

Open `frontend/src/app/app.routes.ts`:

```typescript
export const routes: Routes = [
  {
    path: '',
    redirectTo: 'salary',
    pathMatch: 'full',
  },
  {
    path: 'salary',
    loadComponent: () =>
      import('./features/salary-calculator/salary-calculator.component').then(
        (m) => m.SalaryCalculatorComponent
      ),
  },
  {
    path: 'costs',
    loadComponent: () =>
      import('./features/cost-estimator/cost-estimator.component').then(
        (m) => m.CostEstimatorComponent
      ),
  },
  {
    path: 'neighborhoods',
    loadComponent: () =>
      import('./features/neighborhood-explorer/neighborhood-explorer.component').then(
        (m) => m.NeighborhoodExplorerComponent
      ),
  },
  {
    path: 'checklist',
    loadComponent: () =>
      import('./features/visa-checklist/visa-checklist.component').then(
        (m) => m.VisaChecklistComponent
      ),
  },
];
```

Each route maps a URL path to a component. The `loadComponent` function uses a dynamic `import()` to load the component lazily — the browser doesn't download the salary calculator code until the user actually navigates to `/salary`.

**Lazy loading recap.** Without `loadComponent`, you'd write `component: SalaryCalculatorComponent` and import it at the top of the file. That works, but it means the entire application — all four features — is bundled into one JavaScript file. With `loadComponent`, each feature becomes a separate chunk that's loaded on demand. For a four-step wizard, this means the initial page load only downloads the first step's code. The other three steps are fetched in the background or when the user navigates.

**The redirect.** `{ path: '', redirectTo: 'salary', pathMatch: 'full' }` means navigating to the root URL (`/`) redirects to `/salary`. `pathMatch: 'full'` ensures this only matches an empty path — without it, *every* URL would match the empty prefix and redirect.

### Where routes render

Open `frontend/src/app/app.ts` (the root component):

```typescript
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, StepIndicatorComponent],
  template: `
    <div class="min-h-screen" style="background-color: var(--reloc-ref-color-bg-body)">
      <header class="border-b px-6 py-4" ...>
        <h1 ...>Berlin Relocation Planner</h1>
      </header>
      <main class="mx-auto max-w-4xl px-4 py-8">
        <reloc-step-indicator
          [steps]="wizardSteps"
          [currentPath]="currentPath()"
        />
        <router-outlet />
      </main>
    </div>
  `,
})
```

`<router-outlet />` is the placeholder where routed components render. The header and step indicator live *outside* the outlet — they persist across all routes. When the user navigates from `/salary` to `/costs`, only the content inside `<router-outlet>` changes. The header and step indicator stay in the DOM, updating their state via signals.

This is the **shell pattern** — a persistent layout (header, navigation, footer) with a dynamic content area. This is a common pattern in production Angular applications: the wizard header with step indicators stays fixed while the form content changes at each step.

---

## `toSignal` with Router Events

### The problem

The step indicator needs to know which route is currently active so it can highlight the right step. The Angular Router exposes navigation events as an RxJS Observable via `router.events`. But our step indicator uses [[tutorials/05-signals-and-state|signal inputs]], not Observables. We need to convert.

### The solution

```typescript
export class AppComponent {
  private readonly router = inject(Router);

  readonly currentPath = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => {
        const segments = event.urlAfterRedirects.split('/').filter(Boolean);
        return segments[0] || 'salary';
      })
    ),
    { initialValue: 'salary' }
  );
}
```

Let's break this down step by step:

**`this.router.events`** — An Observable that emits every router event: navigation start, route recognition, guards checking, navigation end, navigation cancel, etc. It's a firehose of events.

**`filter((event): event is NavigationEnd => ...)`** — We only care about `NavigationEnd` events — the moment a navigation completes successfully. The type predicate `event is NavigationEnd` tells TypeScript that after the filter, the event is narrowed to `NavigationEnd`, giving us access to `.urlAfterRedirects`.

**`event.urlAfterRedirects`** — The final URL after all redirects. For example, navigating to `/` redirects to `/salary`, so `urlAfterRedirects` is `/salary`. We use this instead of `event.url` to handle the root redirect correctly.

**`.split('/').filter(Boolean)`** — Splits `/salary` into `['', 'salary']`, then `filter(Boolean)` removes the empty string, giving `['salary']`. We take `segments[0]` to get the first path segment.

**`toSignal(..., { initialValue: 'salary' })`** — Converts the Observable into a signal. The `initialValue` provides a synchronous value before the first navigation event fires. Without it, the signal's type would be `string | undefined` and the step indicator would need to handle the undefined case.

**Why `toSignal` and not `subscribe`?** We *could* create a writable signal and manually subscribe + set. But `toSignal` is more concise and handles unsubscription automatically (it ties to the component's injection context). It's the idiomatic approach when you don't need separate loading/error states. See [[tutorials/05-signals-and-state#toSignal() — Bridging RxJS|Tutorial 05's toSignal section]] for the full comparison.

---

## The Step Indicator Pattern

### How StepIndicatorComponent works

Open `frontend/src/app/shared/components/step-indicator/step-indicator.component.ts`. This is a shared presentational component that renders the wizard progress bar.

### The WizardStep interface

```typescript
export interface WizardStep {
  path: string;
  label: string;
  shortLabel: string;
  icon: string;
}
```

Each step has a URL path (for routing), a full label (for desktop), a short label (for mobile), and an icon. The parent component defines the steps:

```typescript
readonly wizardSteps: WizardStep[] = [
  { path: 'salary', label: 'Salary Calculator', shortLabel: 'Salary', icon: '...' },
  { path: 'costs', label: 'Cost Estimator', shortLabel: 'Costs', icon: '...' },
  { path: 'neighborhoods', label: 'Neighborhoods', shortLabel: 'Areas', icon: '...' },
  { path: 'checklist', label: 'Visa Checklist', shortLabel: 'Visa', icon: '...' },
];
```

This data lives in the parent (`AppComponent`), not in the step indicator. The indicator is generic — it can render any set of steps. If we added a fifth step or reordered them, we'd only change the `wizardSteps` array. The component itself wouldn't change.

### Signal inputs and computed state

```typescript
export class StepIndicatorComponent {
  readonly steps = input.required<WizardStep[]>();
  readonly currentPath = input.required<string>();

  readonly currentIndex = computed(() => {
    const path = this.currentPath();
    return this.steps().findIndex((s) => s.path === path);
  });
}
```

Two required signal inputs, one computed signal. The `currentIndex` is derived from `currentPath` and `steps` — it's the position of the current path in the steps array. When the user navigates from `/salary` to `/costs`, the `currentPath` input updates to `'costs'`, `currentIndex` recalculates from 0 to 1, and the template re-renders the visual state.

### The three visual states

Each step circle has one of three visual states, determined by comparing the step's index to `currentIndex`:

```typescript
getStepStyle(index: number): string {
  const current = this.currentIndex();
  if (index < current) {
    // Completed — filled circle with checkmark
    return 'background-color: var(--reloc-ref-color-primary); border-color: var(--reloc-ref-color-primary); color: white';
  } else if (index === current) {
    // Active — highlighted circle with step number
    return 'background-color: var(--reloc-ref-color-primary-light); border-color: var(--reloc-ref-color-primary); color: var(--reloc-ref-color-primary)';
  } else {
    // Upcoming — muted circle with step number
    return 'background-color: var(--reloc-ref-color-bg-card); border-color: var(--reloc-ref-color-border); color: var(--reloc-ref-color-text-muted)';
  }
}
```

The template renders these states using Angular's `@for` control flow and conditional content:

```html
@for (step of steps(); track step.path; let i = $index) {
  <li class="flex flex-1 items-center">
    <a [routerLink]="['/', step.path]" class="group flex w-full flex-col items-center gap-1.5 text-center">
      <!-- Step circle -->
      <div class="flex h-9 w-9 items-center justify-center rounded-full border-2 ..."
           [style]="getStepStyle(i)">
        @if (i < currentIndex()) {
          <!-- Checkmark SVG for completed steps -->
          <svg ...><path d="M5 13l4 4L19 7" /></svg>
        } @else {
          {{ i + 1 }}
        }
      </div>
    </a>
  </li>
}
```

Completed steps show a checkmark icon. The active step and upcoming steps show their number. The `[routerLink]` directive makes each step clickable — users can navigate freely between steps, not just forward.

### Connector lines and responsive labels

Between steps, horizontal lines indicate progress — colored lines for completed segments, muted lines for upcoming. The `hidden sm:block` classes hide connectors on mobile where horizontal space is limited.

Labels adapt to screen size: full labels ("Salary Calculator") on desktop via `hidden sm:block`, short labels ("Salary") on mobile via `block sm:hidden`. This uses Tailwind's responsive utilities where `sm` is the 640px breakpoint.

---

## Shared Components

### The `shared/` directory convention

Our project follows a standard Angular directory structure:

```
frontend/src/app/
├── core/           # Singletons: services, interceptors, guards
├── shared/         # Reusable: components, pipes, directives
│   └── components/
│       ├── step-indicator/
│       └── currency-input/
├── features/       # Feature modules: salary-calculator, cost-estimator, ...
├── app.routes.ts
└── app.ts
```

**`core/`** contains things instantiated once: `SalaryCalculationService`, `errorInterceptor`. They're application-wide singletons.

**`shared/`** contains things used by multiple features: `StepIndicatorComponent`, `CurrencyInputComponent`. They have no feature-specific logic — they're generic building blocks.

**`features/`** contains feature-specific components grouped by route. `salary-calculator/` has `SalaryFormComponent`, `SalaryBreakdownComponent`, and `SalaryCalculatorComponent`. Each feature is self-contained — you could delete an entire feature directory and the rest of the app would still compile (minus the route).

### CurrencyInputComponent and ControlValueAccessor

Open `frontend/src/app/shared/components/currency-input/currency-input.component.ts`. This component wraps a plain `<input>` to provide EUR formatting — as the user types `60000`, the display shows `60.000` (German locale formatting).

The key is **ControlValueAccessor** — Angular's interface for creating custom form controls that integrate with reactive forms. It has three core methods:

- **`writeValue(value)`** — Form pushes a value *into* the component (e.g., programmatic `setValue(60000)`)
- **`registerOnChange(fn)`** — Component calls this callback when the user changes the value
- **`registerOnTouched(fn)`** — Component calls this on blur, triggering the `touched` flag for validation

The component registers itself as a value accessor via the `NG_VALUE_ACCESSOR` provider:

```typescript
@Component({
  selector: 'reloc-currency-input',
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => CurrencyInputComponent),
    multi: true,
  }],
})
export class CurrencyInputComponent implements ControlValueAccessor { ... }
```

The `forwardRef` is needed because the class is referenced in its own decorator before the class body is evaluated. `multi: true` tells Angular this is one of potentially many value accessors.

With ControlValueAccessor implemented, the component works seamlessly with reactive forms — no special binding syntax:

```html
<reloc-currency-input formControlName="grossAnnual" inputId="grossAnnual" placeholder="e.g. 60,000" />
```

`formControlName` just works. Validators, `valueChanges`, `touched`, `dirty` — the entire reactive forms system works transparently with custom components that implement this interface.

---

## Route Guards (Preview)

### What guards are

Angular route guards are functions that run before or after a navigation. They can allow, redirect, or block the navigation. The two most common types:

- **`canActivate`** — Runs before navigating *to* a route. "Can the user enter this page?" Use for auth checks, feature flags, or prerequisite validation.
- **`canDeactivate`** — Runs before navigating *away from* a route. "Can the user leave this page?" Use for unsaved changes warnings.

### Why we don't use them (yet)

Our wizard lets users navigate freely between steps. This is deliberate for a portfolio demo. In production, guards would enforce step completion:

```typescript
// Hypothetical guard — not implemented in our project
export const costStepGuard: CanActivateFn = () => {
  const stored = sessionStorage.getItem('netMonthlySalary');
  if (stored) return true;
  return inject(Router).createUrlTree(['/salary']);
};

// Registered on the route:
{ path: 'costs', loadComponent: () => ..., canActivate: [costStepGuard] }
```

**Note:** Knowing what guards *are* and when to use them is valuable even without implementing them. If the question comes up "How would you prevent users from skipping steps?", the answer is functional guards with `CanActivateFn` — check prerequisite data and redirect to the appropriate step.

---

## The `reloc-*` Naming Convention

### Why prefix component selectors

Every component in our project uses the `reloc-` prefix:

- `reloc-salary-form`
- `reloc-salary-breakdown`
- `reloc-cost-estimator`
- `reloc-cost-breakdown`
- `reloc-step-indicator`
- `reloc-currency-input`

This follows a common Angular convention where each application uses a unique prefix. The reasons:

1. **Avoid conflicts.** In a large application or micro-frontend architecture, multiple teams might create a "currency input" or "step indicator." Prefixes prevent collisions. `reloc-currency-input` can coexist with `acme-currency-input` or `material-input`.

2. **Instant identification.** When you see `<reloc-step-indicator>` in a template, you immediately know it's a project component, not a third-party library element, an HTML native element, or a browser custom element.

3. **Angular CLI enforcement.** Angular's `angular.json` has a `prefix` setting. `ng generate component` uses it automatically, and `@angular-eslint` can warn if any component uses a different prefix.

4. **Web Components compatibility.** Custom HTML elements require a hyphen in their name (spec requirement to avoid conflicts with future HTML elements). The prefix guarantees the hyphen.

### How this works in practice

Production Angular codebases use application-specific prefixes for the same reasons. In a micro-frontend setup where multiple products coexist on the same page, this namespacing prevents one team's `<step-indicator>` from colliding with another's. Each product gets its own prefix, and the Angular CLI enforces it via `angular.json` and `@angular-eslint`.

---

## Try It Yourself

### 1. Add a new wizard step

Create a new route for a "Summary" step. Steps:

1. Create `frontend/src/app/features/summary/summary.component.ts` with a placeholder template
2. Add a route in `app.routes.ts` with `path: 'summary'` and `loadComponent`
3. Add a fifth entry to `wizardSteps` in `app.ts`
4. Navigate to `/summary` and verify the step indicator shows five steps with the fifth highlighted

### 2. Track route changes

Open the browser console and add a temporary effect in `AppComponent`:

```typescript
private readonly routeLogger = effect(() => {
  console.log('Current path:', this.currentPath());
});
```

Click through each step and watch the console. Notice how `toSignal` emits a new value for each `NavigationEnd` event.

### 3. Implement a simple canActivate guard

Write a guard that prevents access to `/costs` if no salary has been calculated:

```typescript
export const requireSalaryGuard: CanActivateFn = () => {
  const hasSalary = sessionStorage.getItem('netMonthlySalary') !== null;
  if (hasSalary) return true;
  return inject(Router).createUrlTree(['/salary']);
};
```

Add it to the `costs` route's `canActivate` array. Test: navigate directly to `/costs` — you should be redirected to `/salary`. Calculate a salary, then navigate to `/costs` — it should work.

---

## What This Demonstrates

Key takeaways from the wizard navigation architecture:

- **On the router architecture:** Our wizard uses Angular's router with lazy-loaded components — each step is a separate bundle loaded on demand. The root component provides the persistent shell: header, step indicator, and `<router-outlet>`. Navigation events are converted to a signal with `toSignal`, which feeds into the step indicator's computed state. The URL is the single source of truth for which step the user is on.

- **On `toSignal`:** We use `toSignal` to bridge the router's Observable-based event stream into the signal world. The step indicator receives the current path as a signal input, computes the current index, and derives the visual state for each step — completed, active, or upcoming. The entire chain from `router.events` to template rendering is reactive and declarative.

- **On shared components:** Reusable components like `CurrencyInputComponent` live in `shared/` and implement `ControlValueAccessor` so they integrate transparently with reactive forms. You use them with `formControlName` just like a native `<input>` — validators, `valueChanges`, touched state all work. The `StepIndicatorComponent` is also shared, receiving its configuration as signal inputs so it's generic and feature-agnostic.

- **On the `reloc-*` convention:** Every component selector uses the `reloc-` prefix. This prevents naming collisions in large apps or micro-frontend architectures, provides instant identification of project components in templates, and satisfies the web components spec requirement for hyphenated custom element names.

- **On route guards:** While our project allows free navigation between steps, a production wizard would use `CanActivateFn` guards to enforce step completion — checking `sessionStorage` for prerequisite data and redirecting if missing. The pattern is simple: a functional guard that returns `true` or a `UrlTree` redirect.

---

## See Also

- [[tutorials/01-angular-scaffold]] — standalone components and lazy loading
- [[tutorials/05-signals-and-state]] — signals, computed, toSignal
- [[tutorials/08-cost-estimation]] — the cost estimator that lives at the `/costs` route
- [[tutorials/04-reactive-forms]] — ControlValueAccessor usage context
- [[angular-router]] — Angular Router reference
- [[signals]] — signal primitives
- [[standalone-components]] — standalone component architecture
- [[design-tokens]] — the `--reloc-ref-*` CSS custom properties used in step indicator styling
