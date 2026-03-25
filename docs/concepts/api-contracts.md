# API Contracts

An API contract is the shared type definition between a frontend and backend. In this project, TypeScript interfaces in `shared/api-contracts/` exactly mirror Kotlin data classes. This ensures compile-time safety on both sides and makes the integration layer explicit and auditable. When the backend changes a field name or type, the TypeScript interface is updated in the same commit, surfacing breaking changes immediately rather than at runtime.

## Official Documentation

- [TypeScript Handbook: Interfaces](https://www.typescriptlang.org/docs/handbook/2/objects.html)
- [Kotlin Data Classes](https://kotlinlang.org/docs/data-classes.html)
