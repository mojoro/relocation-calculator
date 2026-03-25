# Component Architecture

Angular components are the building blocks of an application — each encapsulates a template (HTML), logic (TypeScript class), and styles. Standalone components declare their own dependencies via `imports: []` instead of NgModules, making them self-contained and tree-shakable. Components use a selector prefix (e.g., `reloc-*`) to namespace them within a project and avoid collisions with HTML elements or third-party components.

## Official Documentation

- [Components Guide](https://angular.dev/guide/components)
- [Standalone Components](https://angular.dev/guide/components/importing)
