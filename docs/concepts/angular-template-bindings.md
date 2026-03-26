# Angular Template Binding Syntax

Angular templates use a consistent set of bracket conventions. Every value inside quotes is evaluated as a TypeScript expression in the component's context — not a static string.

## Binding Types

| Syntax | Purpose | Example |
|---|---|---|
| `[property]="expr"` | Property binding — sets a DOM or component property | `[disabled]="isLoading"` |
| `(event)="handler()"` | Event binding — listens for DOM or component events | `(click)="submit()"` |
| `[(ngModel)]="var"` | Two-way binding — reads and writes a property | `[(ngModel)]="name"` |
| `[class.active]="expr"` | Toggles one CSS class on/off | `[class.selected]="isActive"` |
| `[ngClass]="expr"` | Toggles multiple CSS classes | `[ngClass]="getStepClass(i)"` |
| `[style.color]="expr"` | Sets one inline style property | `[style.color]="brandColor"` |
| `[style]="expr"` | Sets multiple inline styles via a CSS string | `[style]="'color: red; font-weight: bold'"` |
| `[attr.aria-label]="expr"` | Sets an HTML attribute (not a DOM property) | `[attr.role]="role"` |

## Static vs Dynamic Styling

### Static token references — use Tailwind arbitrary values

For styling that doesn't change at runtime, reference CSS custom properties directly in `class` attributes using Tailwind's bracket syntax. The `var()` wrapper is dropped inside brackets:

```html
<!-- Tailwind picks this up at build time — correct approach -->
<h1 class="text-xl text-[--reloc-ref-color-primary] [font-family:var(--reloc-ref-font-display)]">
```

This is the pattern used in the Europace Rechner: `text-[--xp-ref-color-text-defaultDark]`, `bg-[--xp-ref-color-semantic-infoLowEmphasis]`, etc. Tailwind's scanner detects these in static HTML and generates the CSS.

### Dynamic token references — use semantic CSS classes

When a class depends on runtime state, **do not** return Tailwind arbitrary-value strings from TypeScript methods. Tailwind scans source files at build time — class names inside method return strings are invisible to it, so the CSS is never generated.

Instead, define semantic CSS classes in the component's stylesheet that reference the tokens:

```css
/* step-indicator.component.css */
.step-active {
  background-color: var(--reloc-ref-color-primary-light);
  border-color: var(--reloc-ref-color-primary);
  color: var(--reloc-ref-color-primary);
}
.step-completed {
  background-color: var(--reloc-ref-color-primary);
  border-color: var(--reloc-ref-color-primary);
  color: white;
}
.step-upcoming {
  background-color: var(--reloc-ref-color-bg-card);
  border-color: var(--reloc-ref-color-border);
  color: var(--reloc-ref-color-text-muted);
}
```

Then toggle with `[ngClass]` using the semantic names:

```typescript
getStepClass(index: number): string {
  if (index === this.currentIndex()) return 'step-active';
  if (index < this.currentIndex() || index <= this.maxVisitedIndex()) return 'step-completed';
  return 'step-upcoming';
}
```

```html
<div class="flex h-9 w-9 ... transition-colors" [ngClass]="getStepClass(i)">
```

The CSS classes always exist in the stylesheet; the tokens swap their values at runtime for dark mode. This is the correct layering.

### Two-state toggles — object syntax is fine

For simple two-state toggles where both class names are static strings visible to Tailwind, the `[ngClass]` object syntax works cleanly:

```html
<!-- Both class names are static — Tailwind detects them -->
<button
  class="rounded-md border p-3 transition-colors"
  [ngClass]="{
    'border-[--reloc-ref-color-primary] bg-[--reloc-ref-color-primary-light]': isSelected,
    'border-[--reloc-ref-color-border] bg-[--reloc-ref-color-bg-card]': !isSelected
  }"
>
```

Object syntax works because the class name strings are statically present in the template file, where Tailwind's scanner can find them.

## Angular 17+ Control Flow

Angular 17 introduced built-in control flow syntax that replaces structural directives:

```html
<!-- New syntax (Angular 17+) -->
@if (isLoading) { <spinner /> }
@for (item of items; track item.id) { <div>{{ item.name }}</div> }
@switch (status) {
  @case ('active') { <span>Active</span> }
  @default { <span>Inactive</span> }
}

<!-- Old syntax (still valid, avoid in new code) -->
<div *ngIf="isLoading"><spinner /></div>
<div *ngFor="let item of items; trackBy: trackById">{{ item.name }}</div>
```

## NgClass Import

`NgClass` is not available by default in standalone components. Import it explicitly:

```typescript
import { NgClass } from '@angular/common';

@Component({
  standalone: true,
  imports: [NgClass],
  // ...
})
```
