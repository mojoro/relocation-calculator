# Angular Signals

Signals are Angular's built-in fine-grained reactivity primitive (introduced in Angular 16, stable in 17+). A `signal(value)` holds a mutable value; `computed(() => ...)` derives a read-only value that automatically updates when its dependencies change; `effect(() => ...)` runs side effects when dependencies change. Reading a Signal inside a template or `computed` automatically establishes a dependency — Angular re-renders only the affected part. `toSignal()` bridges RxJS Observables into Signals for use with OnPush components.

## Official Documentation

- [Angular: Signals](https://angular.dev/guide/signals)
- [Signal Inputs](https://angular.dev/guide/components/inputs)
- [toSignal API](https://angular.dev/api/core/rxjs-interop/toSignal)
