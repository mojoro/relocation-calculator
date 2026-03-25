# Form Validation

Angular reactive forms use `Validators` (built-in or custom functions) attached to `FormControl` instances. Validators run synchronously or asynchronously and set error states that templates can read via `control.errors`. Validation parity with the backend is important: if the backend rejects `grossAnnual < 0`, the frontend form should prevent that value from being submitted. Built-in validators include `Validators.required`, `Validators.min()`, `Validators.max()`, `Validators.pattern()`, and `Validators.email()`.

## Official Documentation

- [Angular: Form Validation](https://angular.dev/guide/forms/form-validation)
- [Validators API](https://angular.dev/api/forms/Validators)
