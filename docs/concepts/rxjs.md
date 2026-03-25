# RxJS

RxJS (Reactive Extensions for JavaScript) is a library for composing asynchronous and event-based programs using Observables. Angular's `HttpClient`, `Router.events`, and `FormControl.valueChanges` are all Observables. Key operators: `debounceTime` (delay until user stops typing), `switchMap` (flatten inner Observable and cancel previous), `catchError` (handle errors in the stream), `filter`, and `map`. Angular Signals largely replace RxJS for synchronous UI state, but RxJS remains essential for async streams, and `toSignal()` bridges the two worlds.

## Official Documentation

- [RxJS Documentation](https://rxjs.dev)
- [Angular: RxJS in Angular](https://angular.dev/ecosystem/rxjs)
- [RxJS Operator Decision Tree](https://rxjs.dev/operator-decision-tree)
