# Change Detection

Angular's change detection system determines when component templates need to be re-rendered. By default, Angular checks all components on every browser event. With `ChangeDetectionStrategy.OnPush`, Angular only re-checks a component when its input references change or a Signal/Observable it reads emits a new value — dramatically improving performance in large component trees. Components using Signals with OnPush get automatic fine-grained reactivity with no manual `markForCheck()` calls needed.

## Official Documentation

- [Change Detection Guide](https://angular.dev/guide/change-detection)
- [Skipping component subtrees](https://angular.dev/best-practices/skipping-subtrees)
