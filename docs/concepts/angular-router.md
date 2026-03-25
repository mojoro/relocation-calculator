# Angular Router

The Angular Router enables client-side navigation by mapping URL paths to components. It supports lazy-loaded routes (code-splitting), route guards (auth checks), nested routes, and programmatic navigation. Routes are defined in `app.routes.ts` and provided via `provideRouter()`. With standalone components, each route can point directly to a component and use `loadComponent` for lazy loading without any NgModule wrappers.

## Official Documentation

- [Angular Router Guide](https://angular.dev/guide/routing)
- [provideRouter API](https://angular.dev/api/router/provideRouter)
