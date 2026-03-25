# Reactive Forms

Angular's reactive forms API models form state as explicit TypeScript objects: `FormGroup` (a group of controls), `FormControl` (a single value with optional generic type), and `FormArray` (a dynamic list). Validation is attached declaratively via `Validators`. The form state is observable via `valueChanges` and `statusChanges` — making it straightforward to debounce user input and pipe it into an API call with `switchMap`. This pattern is central to Europace's Rechner and mirrors how complex financial input forms are typically built in Angular.

## Official Documentation

- [Angular: Reactive Forms](https://angular.dev/guide/forms/reactive-forms)
- [FormGroup API](https://angular.dev/api/forms/FormGroup)
- [Validators API](https://angular.dev/api/forms/Validators)
