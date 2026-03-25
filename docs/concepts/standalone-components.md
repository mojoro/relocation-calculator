# Standalone Components

Angular standalone components declare their own dependencies (other components, directives, pipes) directly in their `@Component` decorator via `imports: []`, without belonging to an NgModule. This is the default in Angular 17+ and the architecture used at Europace. It makes components self-contained and easier to test in isolation (no TestBed module setup), enables better tree-shaking (unused imports are not bundled), and simplifies lazy loading since each component carries its own dependency graph.

## Official Documentation

- [Angular: Standalone Components](https://angular.dev/guide/components/importing)
- [Migration Guide](https://angular.dev/reference/migrations/standalone)
