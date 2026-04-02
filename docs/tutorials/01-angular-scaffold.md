# Tutorial 01 — Angular Scaffold

> **Goal:** Understand the Angular project structure we've built, why each piece exists, and how they fit together. By the end, you'll be able to explain standalone components, lazy loading, and Angular's dependency injection system with confidence.

---

## What is Angular?

If you're coming from the React world, the first thing to understand is that Angular and React solve different problems at different scales. React is a *library* for building UIs — it handles the view layer and leaves everything else (routing, state management, HTTP calls, form validation) up to you to choose and wire together. Angular is a *framework* — it ships with all of those things built in, designed to work together, and maintained by a single team at Google.

Concretely, Angular gives you out of the box:

- **Router** — client-side navigation with lazy loading, guards, and resolvers
- **Forms** — both template-driven and reactive forms with built-in validation
- **HttpClient** — a typed HTTP client with interceptors for auth tokens, error handling, etc.
- **[[dependency-injection|Dependency Injection]]** — a hierarchical DI container (more on this below)
- **Testing** — TestBed for unit tests, built-in support for component harnesses
- **CLI** — code generation, build optimization, dev server, all configured

Angular is TypeScript-first. This isn't an afterthought or a community-maintained type definition file — the framework itself is written in TypeScript, the CLI generates TypeScript, and the compiler does type checking on your templates. If you typo a property name in your HTML template, the compiler catches it at build time, not at runtime.

Angular is also *opinionated*. There's generally "one Angular way" to do things. This might feel constraining if you're used to the React ecosystem's mix-and-match philosophy, but it's a massive advantage for large teams. When a new developer joins a project, they already know the patterns. There's no debate about which state management library to use or which routing solution is best.

**The LEGO analogy:** If React is a box of individual LEGO bricks where you design your own creation from scratch, Angular is a LEGO Technic kit — more structure, clearer instructions, less guesswork, and parts that are specifically designed to fit together. Both approaches build amazing things, but the Technic kit is faster when you're building with a team of ten.

**Why this matters in enterprise settings:** Companies like Deutsche Bank, Google, and many fintech platforms across Germany use Angular specifically because of this consistency. When you have dozens of developers working across multiple product teams, the opinionated structure pays for itself. Financial calculator products — the same kind of domain our project lives in — are commonly built with [[angular|Angular]].

---

## Standalone Components vs NgModules

### The historical context

When Angular 2 launched in 2016, every component had to belong to an **NgModule**. Modules were the organizational unit of an Angular app. They served three purposes:

1. **Declaration** — telling Angular which components, directives, and pipes exist
2. **Imports/Exports** — controlling visibility (a component in Module A couldn't use a component from Module B unless Module B exported it and Module A imported Module B)
3. **Providers** — scoping [[dependency-injection|dependency injection]] (services provided in a module were available to everything in that module)

A typical module-based app had a structure like this:

```typescript
// The old way — NgModules (you do NOT need to write this)
@NgModule({
  declarations: [SalaryCalculatorComponent, TaxBreakdownComponent],
  imports: [CommonModule, ReactiveFormsModule, SharedModule],
  exports: [SalaryCalculatorComponent],
})
export class SalaryModule {}
```

Every feature needed a module. You'd also create a `SharedModule` that re-exported all the commonly used things (pipes, directives, UI components), a `CoreModule` for singleton services, and then wire it all together in the root `AppModule`. For a large app, you'd have dozens of module files that were mostly ceremony — boilerplate that existed to satisfy Angular's compilation model rather than to express meaningful architectural intent.

### The standalone revolution

Starting in Angular 14, the team introduced **[[standalone-components|standalone components]]**. A standalone component declares its own dependencies directly in the `@Component` decorator. No module needed. Each component is fully self-contained — you can look at a single file and know exactly what it depends on.

Here's what that looks like in our project. This is the actual root component from `src/app/app.ts`:

```typescript
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <div class="min-h-screen" style="background-color: var(--reloc-ref-color-bg-body)">
      <header class="border-b px-6 py-4"
              style="background-color: var(--reloc-ref-color-bg-card);
                     border-color: var(--reloc-ref-color-border)">
        <h1 class="text-xl font-semibold"
            style="color: var(--reloc-ref-color-primary);
                   font-family: var(--reloc-ref-font-display)">
          Berlin Relocation Planner
        </h1>
      </header>
      <main class="mx-auto max-w-4xl px-4 py-8">
        <router-outlet />
      </main>
    </div>
  `,
})
export class AppComponent {}
```

Notice: `standalone: true` and `imports: [RouterOutlet]`. This component needs the `<router-outlet>` directive (which renders the current route's component), so it imports `RouterOutlet` directly. No module file. No indirection. The dependency graph is explicit right there in the decorator.

As of Angular 17+, standalone is the default — the CLI generates standalone components, and `standalone: true` is assumed if you don't specify it. In Angular 21 (what we're using), you could even omit the `standalone: true` line since it's the default, but we keep it explicit for clarity.

### Why production codebases use standalone

Many production Angular codebases were originally module-based, but newer projects and modernization efforts use [[standalone-components|standalone components]]. This is the direction the entire Angular ecosystem is moving — modules aren't deprecated, but they're no longer the recommended starting point.

**What this demonstrates:** Standalone components reduce boilerplate and make dependency graphs explicit at the component level rather than hidden inside modules. You can look at a single component file and immediately understand everything it depends on, which makes code review faster and refactoring safer.

---

## Project Structure

Let's walk through every significant file in the scaffold. Understanding *why* each file exists is just as important as understanding *what* it does.

### `angular.json` — The workspace configuration

```json
{
  "projects": {
    "frontend": {
      "projectType": "application",
      "architect": {
        "build": {
          "builder": "@angular/build:application",
          "options": {
            "browser": "src/main.ts",
            "styles": ["src/styles.css"]
          },
          "configurations": {
            "production": {
              "budgets": [
                { "type": "initial", "maximumWarning": "500kB", "maximumError": "1MB" }
              ],
              "outputHashing": "all"
            },
            "development": {
              "optimization": false,
              "sourceMap": true
            }
          }
        }
      }
    }
  }
}
```

This is the nerve center for the Angular CLI. Key things to understand:

- **`browser: "src/main.ts"`** — the entry point for the browser build. This is where the application starts.
- **`styles: ["src/styles.css"]`** — global stylesheets loaded before any component styles. Our `styles.css` imports Tailwind and our [[design-tokens|design token]] system.
- **`budgets`** — the CLI will warn if your initial bundle exceeds 500kB or error if it exceeds 1MB. This keeps us honest about bundle size. Lazy loading (discussed below) is how we stay under budget.
- **`configurations`** — production enables optimization and output hashing (for cache busting); development enables source maps and disables optimization for fast rebuilds.

### `tsconfig.json` / `tsconfig.app.json` — TypeScript configuration

The root `tsconfig.json` sets project-wide compiler options:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitOverride": true,
    "noImplicitReturns": true,
    "target": "ES2022",
    "module": "preserve"
  },
  "angularCompilerOptions": {
    "strictTemplates": true,
    "strictInjectionParameters": true,
    "strictInputAccessModifiers": true
  }
}
```

The `strict: true` flag enables all of TypeScript's strict checks. The `angularCompilerOptions` section goes further — `strictTemplates: true` means Angular's template compiler will type-check your HTML bindings against your component's TypeScript types. If your component has `name: string` and your template tries `{{ name.toFixed(2) }}`, you'll get a compile error because `toFixed` isn't a method on `string`. This catches bugs that would otherwise only appear at runtime.

`tsconfig.app.json` extends the base config and scopes it to application source files (excluding test files).

### `src/main.ts` — The bootstrap entry point

```typescript
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app';

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
```

This is where the Angular application starts. `bootstrapApplication` is the standalone-era bootstrap function — it takes a root component and a configuration object, creates the Angular platform, and renders the component into the DOM. In the old NgModule world, you'd call `platformBrowserDynamic().bootstrapModule(AppModule)` instead. The standalone version is simpler because there's no module to bootstrap — just a component and its configuration.

### `src/app/app.config.ts` — Application providers

```typescript
import { ApplicationConfig, provideBrowserGlobalErrorListeners,
         provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(),
  ],
};
```

This is the most important configuration file in the app and it deserves a deep dive (see the next section). For now, notice the pattern: a plain object with a `providers` array. Each `provide*` function registers something in Angular's [[dependency-injection|dependency injection]] container.

### `src/app/app.routes.ts` — Route definitions

```typescript
export const routes: Routes = [
  { path: '',          redirectTo: 'salary',  pathMatch: 'full' },
  { path: 'salary',       loadComponent: () => import('./features/salary-calculator/salary-calculator.component').then(m => m.SalaryCalculatorComponent) },
  { path: 'costs',        loadComponent: () => import('./features/cost-estimator/cost-estimator.component').then(m => m.CostEstimatorComponent) },
  { path: 'neighborhoods', loadComponent: () => import('./features/neighborhood-explorer/neighborhood-explorer.component').then(m => m.NeighborhoodExplorerComponent) },
  { path: 'checklist',    loadComponent: () => import('./features/visa-checklist/visa-checklist.component').then(m => m.VisaChecklistComponent) },
];
```

Each route uses `loadComponent` with a dynamic `import()` — that's [[lazy-loading|lazy loading]], covered in detail below.

### `src/app/app.ts` — The root component

The root component is the application shell. It renders a header with the app title and a `<router-outlet />` that acts as a placeholder — Angular swaps in whichever component matches the current route. Think of it as a picture frame: the frame (header + layout) stays constant, and the picture (feature component) changes as the user navigates.

### `src/app/features/` — Feature components

Each wizard step lives in its own directory under `features/`:

```
src/app/features/
  salary-calculator/
    salary-calculator.component.ts
  cost-estimator/
    cost-estimator.component.ts
  neighborhood-explorer/
    neighborhood-explorer.component.ts
  visa-checklist/
    visa-checklist.component.ts
```

This is a flat, domain-driven structure. Each feature is self-contained and independently lazy-loaded. As features grow, their directories will expand to include services, models, and child components, but the boundary is always clear: everything related to salary calculation lives under `salary-calculator/`.

---

## app.config.ts Deep Dive

The `appConfig` object is where we wire up the core infrastructure of the application. Let's break down each provider.

### `provideRouter(routes)`

This sets up the [[angular|Angular]] Router — the service that watches the browser URL, matches it against the route definitions in `app.routes.ts`, and renders the appropriate component. Behind the scenes, it provides several injectables: `Router` (for programmatic navigation), `ActivatedRoute` (for reading route parameters), and the internal machinery that makes `<router-outlet>` work.

### `provideHttpClient()`

This makes `HttpClient` available anywhere in the application via [[dependency-injection|DI]]. When we build the salary calculator, we'll inject `HttpClient` into a service and use it to call our Kotlin backend:

```typescript
// Preview of what's coming in a later tutorial
@Injectable({ providedIn: 'root' })
export class SalaryService {
  private http = inject(HttpClient);

  calculate(request: SalaryRequest): Observable<SalaryResponse> {
    return this.http.post<SalaryResponse>('/api/salary/calculate', request);
  }
}
```

Notice the `withInterceptors` import in our config file — we import it but don't use it yet. Interceptors are middleware for HTTP requests. In a later tutorial, we'll add an interceptor to set the API base URL and handle errors globally.

### `provideZoneChangeDetection({ eventCoalescing: true })`

This one requires some background. Angular uses a library called **Zone.js** to automatically detect when your application state might have changed. Zone.js patches every asynchronous browser API — `setTimeout`, `Promise.then`, `addEventListener`, XHR — so that Angular gets notified after each async operation completes and can run [[change-detection|change detection]] to update the DOM.

The `eventCoalescing: true` option is a performance optimization. Without it, if a single user action (like a click) triggers multiple event handlers, Angular would run change detection once per handler. With coalescing, Angular batches them and runs change detection once for the whole group. For a form-heavy wizard app like ours, this reduces unnecessary re-renders.

### `provideBrowserGlobalErrorListeners()`

This registers global error and unhandled promise rejection listeners, routing them through Angular's `ErrorHandler`. It means unhandled errors in async code won't silently disappear — they'll be caught and logged through Angular's error handling infrastructure.

### What are "providers" anyway?

Providers are how you register things in Angular's [[dependency-injection|dependency injection]] container. Think of DI as a service registry — a central place where tools (services, configurations, values) are stored so that any part of the application can request them by type without knowing how or where they were created.

**The workshop analogy:** Providers are like registering tools in a workshop. When you call `provideHttpClient()`, you're putting an HTTP client on the tool wall with a label. Later, when a component or service needs to make an HTTP request, it just asks the workshop for the tool labeled "HttpClient" — it doesn't need to know who manufactured it, how it's configured, or where it's physically stored. The workshop (DI container) handles all of that.

This is fundamentally different from how most React apps work, where you'd typically import and instantiate an Axios client directly, or pass it down through context. Angular's approach means you can swap implementations (e.g., a mock HTTP client for testing) without changing any component code.

---

## Lazy Loading

### What it is

[[lazy-loading|Lazy loading]] is route-level code splitting. When your Angular app builds, the compiler creates separate JavaScript bundles ("chunks") for each lazily-loaded route. The browser only downloads a chunk when the user navigates to that route for the first time.

Without lazy loading, the browser would download all the JavaScript for the entire app upfront — the salary calculator, cost estimator, neighborhood explorer, and visa checklist — even if the user only ever visits the first step. For a 4-step wizard, that means 75% of the initial download is wasted.

### How it works in our routes

Look at one route definition:

```typescript
{
  path: 'salary',
  loadComponent: () =>
    import('./features/salary-calculator/salary-calculator.component').then(
      (m) => m.SalaryCalculatorComponent
    ),
}
```

The key is `loadComponent` with a function that calls `import()`. This is a *dynamic import* — a JavaScript language feature (not Angular-specific) that tells the bundler "don't include this in the main bundle; create a separate file for it." The `import()` call returns a Promise that resolves to the module's exports, and `.then(m => m.SalaryCalculatorComponent)` pulls out the specific component class.

At build time, the Angular CLI creates:
- `main.js` — the core framework, router, app shell, and config
- `chunk-SALARY.js` — the salary calculator component and its dependencies
- `chunk-COSTS.js` — the cost estimator component and its dependencies
- `chunk-NEIGHBORHOODS.js` — the neighborhood explorer and its dependencies
- `chunk-CHECKLIST.js` — the visa checklist and its dependencies

(The actual filenames will have content hashes for cache busting, like `chunk-R4K2F3.js`.)

When a user hits `http://localhost:4200`, the router redirects to `/salary` and downloads `chunk-SALARY.js`. If the user never navigates to `/checklist`, that chunk is never downloaded at all.

### Why it matters

**The Netflix analogy:** Netflix doesn't load every show's details, subtitles, and behind-the-scenes content when you open the app. It loads the browse UI, and only fetches a show's data when you click on it. Similarly, lazy loading means the Visa Checklist code isn't downloaded until the user actually navigates to Step 4.

This is especially important for:
- **Mobile users** with slower connections — less initial JavaScript means faster time-to-interactive
- **Wizard-style apps** like ours — users start on Step 1 and may not complete all four steps in one session
- **Bundle budget compliance** — remember the 500kB warning threshold in `angular.json`? Lazy loading is how we stay under it as the app grows

**What this demonstrates:** Lazy loading is critical for wizard-style apps — users shouldn't pay the cost of steps they haven't reached yet. Each step in our wizard is a separate chunk, so the initial load only includes the framework, router, and the first step.

---

## OnPush Change Detection (Preview)

Look at any of our feature components. Here's the salary calculator from `src/app/features/salary-calculator/salary-calculator.component.ts`:

```typescript
@Component({
  selector: 'reloc-salary-calculator',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `...`,
})
export class SalaryCalculatorComponent {}
```

That `changeDetection: ChangeDetectionStrategy.OnPush` line is a performance optimization. By default, Angular runs [[change-detection|change detection]] on every component in the tree whenever *any* asynchronous event happens anywhere in the app. That's simple but wasteful — if a timer fires in the header component, why should Angular re-check the salary calculator?

**OnPush** tells Angular: "Only check this component when one of these things happens:"

1. One of the component's `@Input()` properties receives a new value (by reference)
2. An event (click, keypress, etc.) fires from within the component's template
3. An `Observable` subscribed to with the `async` pipe emits a new value
4. [[signals|Signals]] that the component reads change their value
5. Change detection is explicitly triggered via `ChangeDetectorRef.markForCheck()`

Every feature component in our project uses OnPush. This is a best practice enforced in production Angular codebases.

We'll cover this in depth in [[tutorials/12-onpush-and-performance|Tutorial 12: OnPush and Performance]], including how it interacts with [[signals|Angular Signals]] (the new reactive primitive that's gradually replacing RxJS for component state). For now, just know that it's there and understand the basic idea: opt out of automatic checking, opt in to explicit change tracking.

---

## Try It Yourself

### 1. Start the dev server

```bash
cd frontend && npx ng serve
```

Visit [http://localhost:4200](http://localhost:4200). You should see the "Berlin Relocation Planner" header and the Salary Calculator content below it.

### 2. Watch lazy loading in action

Open your browser's DevTools (F12), go to the **Network** tab, and filter by **JS**. Now navigate between routes by manually changing the URL:

- `http://localhost:4200/salary` — note the chunks that load
- `http://localhost:4200/costs` — watch a *new* chunk appear in the network tab
- `http://localhost:4200/neighborhoods` — another new chunk
- `http://localhost:4200/checklist` — and another

Each navigation loads a separate JavaScript chunk on demand. Refresh the page on `/salary` and notice that only the main bundle and the salary chunk load — the others aren't downloaded until you navigate to them.

### 3. Experiment with design tokens

Open `frontend/src/styles/tokens.css` and find this line:

```css
--reloc-ref-color-primary: var(--reloc-sys-color-teal-700);
```

Change it to point at a different color, like the 500 shade:

```css
--reloc-ref-color-primary: var(--reloc-sys-color-teal-500);
```

Save the file and watch the header color change immediately (the dev server supports hot reload). Notice that the header text color updated without changing any component code — that's the power of the [[design-tokens|semantic token system]]. The component uses `var(--reloc-ref-color-primary)` and doesn't care what the actual hex value is. We'll explore this fully in [[tutorials/02-design-tokens|Tutorial 02: Design Tokens]].

---

## Key Takeaways

- **On Angular's philosophy:** Angular's opinionated structure is a feature for large teams — everyone knows where to find things. There's no debate about routing libraries or state management approaches because the framework provides a single, well-documented answer for each concern.

- **On standalone components:** Standalone components eliminate NgModule ceremony while keeping explicit dependency graphs. Every component declares its own imports, so you can look at a single file and know exactly what it depends on. This makes code review faster and refactoring safer.

- **On lazy loading:** Lazy loading is critical for wizard-style apps — users shouldn't pay the cost of steps they haven't reached yet. In our project, each wizard step is a separate chunk, and the initial load only includes the framework shell and whichever step the user lands on.

- **On OnPush:** We use OnPush change detection on every component. This opts out of Angular's default "check everything" strategy and instead tells the framework to only re-check a component when its inputs change or an event fires within it. Combined with signals, this gives us fine-grained reactivity with minimal overhead.

- **On TypeScript strictness:** We run with `strict: true` and `strictTemplates: true`, which means the Angular compiler type-checks our HTML templates at build time. A typo in a template binding is a compile error, not a runtime surprise.

---

## See Also

- [[angular]] — overview concept page
- [[standalone-components]] — deep dive on standalone vs modules
- [[dependency-injection]] — how Angular's DI system works
- [[change-detection]] — Angular's rendering model
- [[signals]] — the modern reactive primitive replacing RxJS for component state
- [[onpush]] — OnPush change detection strategy in depth
- [[design-tokens]] — the CSS custom property system
- [[lazy-loading]] — code splitting patterns
- [[tutorials/02-design-tokens]] — next tutorial: the CSS token system
