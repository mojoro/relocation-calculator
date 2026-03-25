# OnPush Change Detection

`ChangeDetectionStrategy.OnPush` tells Angular to skip re-rendering a component unless: one of its `@Input()` references changes, an event originates inside the component, or a Signal/Observable it's subscribed to emits a new value. It's the primary performance optimization for Angular components and the standard at Europace. Components using Signals with OnPush get automatic fine-grained reactivity — Angular tracks exactly which Signals a template reads and re-renders only when those Signals change.

## Official Documentation

- [Angular: Skipping Component Subtrees](https://angular.dev/best-practices/skipping-subtrees)
- [ChangeDetectionStrategy API](https://angular.dev/api/core/ChangeDetectionStrategy)
