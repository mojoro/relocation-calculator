# Tutorial 12 — OnPush Change Detection & Performance

> **Goal:** Understand Angular's change detection system — what it does, why Zone.js exists, how `OnPush` reduces unnecessary work, and why `OnPush` + Signals is Angular's recommended performance strategy. By the end, you'll be able to explain change detection clearly and identify performance bottlenecks.

> **Prerequisites:** You've read [[tutorials/05-signals-and-state|Tutorial 05: Signals and State]] (signals, computed, effect) and [[tutorials/01-angular-scaffold|Tutorial 01: Angular Scaffold]] (standalone components, Zone.js polyfill).

---

## What Is Change Detection?

When a user clicks a button, types in an input, or receives an HTTP response, the application's state changes. But the DOM doesn't update itself. Angular's **change detection** system walks the component tree, checks template bindings against current values, and patches the DOM wherever something changed.

### Default strategy: check everything

With the default strategy, Angular checks *every* component after *every* event. A click in `SalaryFormComponent` triggers checks on `AppComponent`, `StepIndicatorComponent`, `SalaryBreakdownComponent` — even though nothing changed in those components. In a small app, this is imperceptible. In a large production application with complex forms and dozens of validators, it becomes the performance bottleneck.

Each check evaluates every template expression — `{{ result().netMonthly }}`, `[style]="getStepStyle(i)"`, `@if (isCalculating())` — compares the result to the previously rendered value, and updates the DOM if it changed. Functions called in templates re-execute on *every* check cycle, even when inputs haven't changed.

---

## Zone.js — Angular's Event Detective

### What it does

Angular needs to know *when* events happen to trigger change detection. Zone.js provides this by **monkey-patching** browser APIs — replacing `addEventListener`, `setTimeout`, `XMLHttpRequest`, `Promise.then`, and ~200 other APIs with wrapped versions that notify Angular.

The analogy: **Zone.js is a security camera watching every door.** It doesn't know what's inside the packages, but it sees activity and tells Angular: "Something happened. Check if anything changed."

### The overhead

Because Zone.js triggers change detection for *every* event — including `mousemove` events that change nothing — it causes unnecessary work. The library itself is ~30KB gzipped. This is why Angular is moving toward a **zoneless** future: with [[tutorials/05-signals-and-state|signals]], Angular knows exactly which values changed without intercepting browser events.

Our project includes Zone.js in `polyfills.ts` because it's still required for Angular 21. In a future version, signals-only apps will be able to drop it entirely.

---

## The OnPush Strategy

### How to enable it

Every feature component in our project declares:

```typescript
@Component({
  selector: 'reloc-salary-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  // ...
})
```

### What OnPush means

With **OnPush**, Angular only checks a component when one of these triggers fires:

1. **An `@Input()` reference changes** — `oldRef !== newRef` (not deep equality)
2. **A DOM event fires from within the component** — click, keypress, etc.
3. **An Observable bound with `async` pipe emits** — the pipe calls `markForCheck()` internally
4. **A Signal the component reads changes** — automatic notification
5. **`markForCheck()` is called explicitly** — manual escape hatch

If none fire, Angular **skips the component and all its children entirely**.

### Visualizing the difference

Navigation event that only changes `StepIndicatorComponent`:

```
Default (check everything):         OnPush (check only what matters):
AppComponent        ✓ checked       AppComponent        ✓ checked
├── StepIndicator   ✓ checked       ├── StepIndicator   ✓ checked (input changed)
├── SalaryForm      ✓ wasted        ├── SalaryForm      ✗ skipped
│   └── Breakdown   ✓ wasted        │   └── Breakdown   ✗ skipped
```

In a tree of 100 components, skipping the 95 unaffected ones is dramatic.

---

## OnPush + Signals = Best of Both Worlds

[[tutorials/05-signals-and-state|Signals]] and OnPush are complementary:

- **Signals** provide fine-grained notification — Angular knows *which* value changed
- **OnPush** provides component-level skipping — Angular avoids checking unaffected components

Together: a signal updates, Angular identifies which components read it, marks those for checking, and skips everything else. During the check, only bindings that read the changed signal re-evaluate.

### The future: signals replace Zone.js

Angular's roadmap leads to **signal-based change detection** where Zone.js is optional. Components using signals + OnPush today are already structured for that future — they'll get faster rendering for free when zoneless mode ships. Our project is positioned for this: every component uses OnPush, every state value is a signal, all display values derive from [[tutorials/05-signals-and-state#2. `computed(() => ...)` — Derived signals|computed signals]].

---

## Our Components in Practice

### SalaryFormComponent: form events + signals

Trace what happens when the user types a salary:

1. **Keystroke** — DOM event inside the component → OnPush allows checking
2. **Form `valueChanges`** — RxJS pipeline debounces, validates, sends HTTP request
3. **Response arrives** — `this.result.set(response); this.isCalculating.set(false);`
4. **Signals notify** — Angular marks `SalaryFormComponent` for checking (reads `isCalculating` and `result`)
5. **`SalaryBreakdownComponent` marked** — its signal input `result` received a new reference
6. **Computed signals recalculate** — `deductionPercentage` and `socialInsuranceTotal` update
7. **DOM patches** — only changed bindings

Throughout, `StepIndicatorComponent` is never checked. Components displaying unrelated data do zero work.

### NeighborhoodCardComponent: pure display

```typescript
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NeighborhoodCardComponent {
  readonly profile = input.required<NeighborhoodProfile>();
}
```

One signal input, no writable signals, no services. It re-renders only when the parent passes a new profile reference. With 12 cards on screen, skipping 11 when only one changes matters. The parent's `@for` with `track profile.bezirk` ensures Angular doesn't recreate DOM elements unnecessarily.

### StepIndicatorComponent: router-driven

Reads `currentPath` as a signal input, derives `currentIndex` via `computed()`. Navigation from `/salary` to `/costs` changes the input, `currentIndex` recomputes from 0 to 1, and `getStepStyle(i)` re-evaluates for each step. Only the indicator does work — the route content component handles itself.

---

## Why Production Angular Apps Use OnPush

OnPush is the standard strategy in production Angular codebases. With dozens of validators across complex forms, default change detection would cause visible performance issues — every keystroke would re-evaluate every binding in every component. OnPush constrains the blast radius.

This is especially important for applications that run as embedded widgets or in micro-frontend architectures. The widget must coexist with host page JavaScript without causing janky rendering. OnPush ensures the component's change detection doesn't slow down the host page.

---

## Profiling Change Detection

### Angular DevTools

The Angular DevTools extension (Chrome/Firefox) has a **Profiler** tab:

1. Open DevTools → Angular → Profiler
2. Start recording
3. Interact (type a salary, navigate steps)
4. Stop recording

It shows: how many change detection cycles ran, which components were checked/skipped, and how long each took. Look for components checked when they shouldn't be — that indicates a missing OnPush or unnecessary trigger.

### Chrome Performance Tab

For lower-level profiling: record in the Performance tab, look for long frames (yellow bars past the 16ms budget for 60fps). Zoom into `ApplicationRef.tick` or `detectChanges` in the flame chart. If these calls are consistently long, too many components are checking or template expressions are too expensive.

### What good looks like

In a well-optimized Angular app with OnPush:

- Most components show "skipped" in the profiler for most cycles
- Change detection cycles complete in under 5ms
- Only the components that display changed data are checked
- No function calls in templates — all derived values use `computed()`

| Symptom | Likely Cause | Fix |
|---|---|---|
| Unnecessary component checks | Default change detection | Add `OnPush` |
| Expensive template functions | Functions re-evaluated every cycle | Move to `computed()` signals |
| Long frames on every keystroke | Broad change detection | `OnPush` + `debounceTime` |
| Memory leaks | Unsubscribed Observables | `takeUntilDestroyed`, `toSignal`, `async` pipe |

---

## Try It Yourself

### 1. Observe OnPush with Angular DevTools

Install Angular DevTools, start the dev server, and record a profiler session while typing in the salary input. Count which components are checked. Then temporarily remove `OnPush` from `SalaryBreakdownComponent`, reload, and record again — the breakdown now checks on every cycle.

### 2. Create an expensive template function

```typescript
getExpensiveValue(): string {
  console.log('Expensive calculation running');
  let sum = 0;
  for (let i = 0; i < 1000000; i++) sum += Math.random();
  return sum.toFixed(2);
}
```

Use in template: `{{ getExpensiveValue() }}`. Count log entries per interaction. Now refactor to `computed()` — it runs once and never again (no signal dependencies = never stale).

### 3. Test immutability with OnPush

Create a parent with:
```typescript
profile = { name: 'Test', score: 0 };
mutate() { this.profile.score++; }          // OnPush child won't update
replace() { this.profile = { ...this.profile, score: this.profile.score + 1 }; }  // Will update
```

Pass `profile` to an OnPush child. `mutate()` changes the property but not the reference — child skips. `replace()` creates a new reference — child checks.

---

## Common Mistakes

### 1. Mutating objects instead of creating new references
OnPush uses `===` for `@Input()` changes. Mutating a property is invisible. Signal inputs fix this — they always trigger regardless of reference identity.

### 2. Calling functions in templates without caching
```html
<!-- WRONG — runs every cycle -->
<span>{{ getTotal() }}</span>
<!-- RIGHT — cached, recalculates only when dependencies change -->
<span>{{ total() }}</span>
```
Our `SalaryBreakdownComponent` uses `computed()` for `deductionPercentage` — it runs once per result change, not per cycle.

### 3. Using `setTimeout` without signals
With OnPush, a timer callback that sets a plain property won't trigger a check. Use `signal.set()` — it always notifies Angular. This is better than the old pattern of injecting `ChangeDetectorRef` and calling `markForCheck()`.

### 4. Forgetting that OnPush skips children too
If a parent is skipped, all its children are skipped. Signal changes propagate correctly, but if debugging "why isn't my child updating?", check the parent first.

### 5. Adding OnPush without auditing data flow
Don't add OnPush to an existing component that mutates objects. Migrate to signals or immutable patterns first, then add OnPush.

---

## What This Demonstrates

Key takeaways from the OnPush + Signals architecture:

- **On the strategy:** Every component uses `OnPush`. Angular only checks a component when a signal it reads changes, an input reference changes, or a DOM event fires within it. In a large tree, this skips the vast majority of components on each cycle.

- **On OnPush + Signals:** Signals provide fine-grained notification — Angular knows which value changed. OnPush provides component-level skipping. Together, Angular gets reactivity comparable to Vue or Solid, within its component architecture.

- **On Zone.js:** Zone.js monkey-patches browser APIs to detect events — a blunt instrument where every event triggers a full check. Angular is moving toward signal-based change detection where Zone.js becomes optional. Our components are already structured for that future.

- **On production patterns:** Production Angular applications use OnPush on all feature components. With complex forms and many validators, default detection would re-evaluate every binding on every keystroke. OnPush constrains the blast radius to affected components only.

- **On pitfalls:** The main OnPush trap is object mutation — reference equality means changed properties are invisible. Signal inputs solve this. For templates, computed signals replace function calls that re-execute every cycle.

---

## See Also

- [[tutorials/05-signals-and-state]] — signals, computed, and the reactive state model
- [[tutorials/04-reactive-forms]] — forms and validators driving change detection
- [[tutorials/09-wizard-navigation]] — router navigation triggering component updates
- [[tutorials/01-angular-scaffold]] — Zone.js polyfill and standalone components
- [[change-detection]] — change detection reference
- [[onpush]] — OnPush strategy reference
- [[signals]] — signals reference
