# Lazy Loading

Lazy loading defers loading a JavaScript chunk until it's actually needed — typically when the user navigates to a route. In Angular, lazy routes use `loadComponent: () => import('./feature/component').then(m => m.Component)`. This splits the bundle so the initial page load downloads only the shell, and feature code is fetched on demand. For a multi-step wizard, each step can be a separate lazy chunk, keeping the Time to Interactive fast even as the app grows.

## Official Documentation

- [Angular: Lazy Loading](https://angular.dev/guide/routing/lazy-loading-ngmodules)
- [Route-level Code Splitting](https://angular.dev/guide/performance)
