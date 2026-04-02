# Tutorial 02 — Design Tokens

> **Prerequisites:** You know CSS well enough to style a page from scratch. You have seen CSS custom properties (`--my-var: value`) but maybe never used them in a structured system. You do not need prior experience with design tokens, Tailwind, or Angular.

---

## What Are Design Tokens?

Design tokens are the smallest, most atomic pieces of a design system. A single color value, a spacing increment, a border radius, a font stack, a shadow definition — each of these is a token. They are named, stored in one place, and referenced everywhere else.

The idea is simple: instead of scattering raw values like `#0f766e` and `16px` across hundreds of CSS rules and component templates, you give each value a name and put the definition in a single file. Every part of the UI that needs "the primary brand color" references the same token. Change it once, and the entire application updates.

The term "design token" was coined by Salesforce when they built the Lightning Design System in 2014. Since then, the concept has been adopted by Google (Material Design), IBM (Carbon), Adobe (Spectrum), GitHub (Primer), and many enterprise platforms across the industry.

**The restaurant analogy.** Tokens are like a restaurant's recipe card system. Instead of every chef mixing their own shade of "red sauce," there is one recipe card that says exactly how much tomato, garlic, and basil to use. Every dish that calls for red sauce follows the same recipe. If the head chef decides to add a pinch of chili, they update one card and every dish changes. Without the recipe card system, you get 47 slightly different red sauces and no way to fix them all at once.

---

## CSS Custom Properties (CSS Variables)

Before we get to the token architecture, you need to understand the underlying mechanism: CSS custom properties. If you already know these well, skim this section and move on to [[#The Three-Tier Architecture]].

See also: [[css-custom-properties]] for a deeper reference.

### Defining and Using

You define a custom property with a double-hyphen prefix and use it with the `var()` function:

```css
/* Define */
:root {
  --brand-color: #0f766e;
}

/* Use */
.button {
  background-color: var(--brand-color);
}
```

The `:root` selector makes the property globally available to every element on the page. You can also scope properties to specific selectors — a custom property defined on `.sidebar` is only available to `.sidebar` and its descendants.

### Variables Can Reference Other Variables

This is the key feature that makes the entire token architecture work. A custom property's value can itself be a `var()` reference:

```css
:root {
  --reloc-sys-color-teal-700: #0f766e;
  --reloc-ref-color-primary: var(--reloc-sys-color-teal-700);
}
```

Now `--reloc-ref-color-primary` resolves to `#0f766e` at runtime. If you later change `--reloc-sys-color-teal-700` to a different hex value, `--reloc-ref-color-primary` automatically picks up the new value. This chaining is what enables the three-tier system.

### Runtime-Changeable

Unlike Sass variables (`$brand-color: #0f766e`) which are resolved at compile time and disappear from the output CSS, custom properties exist at runtime in the browser. You can change them with JavaScript:

```javascript
document.documentElement.style.setProperty('--reloc-sys-color-teal-700', '#7c3aed');
```

This means you can implement dark mode, user-selected themes, or white-label branding by swapping token values at runtime — without rebuilding or redeploying the CSS.

### Browser Support

CSS custom properties are supported in every modern browser. There is no polyfill needed unless you are targeting Internet Explorer, which this project does not.

---

## The Three-Tier Architecture

Our token system uses three tiers, defined in `frontend/src/styles/tokens.css`. Each tier has a distinct role and naming convention:

| Tier | Prefix | Role | Example |
|------|--------|------|---------|
| 1 — System Primitives | `--reloc-sys-*` | Raw values with no opinion on usage | `--reloc-sys-color-teal-700: #0f766e` |
| 2 — Semantic References | `--reloc-ref-*` | Purpose-based aliases pointing to primitives | `--reloc-ref-color-primary: var(--reloc-sys-color-teal-700)` |
| 3 — Component Tokens | `--reloc-comp-*` | Component-specific overrides (used sparingly) | `--reloc-comp-button-bg: var(--reloc-ref-color-primary)` |

The flow is always top-down: components consume reference tokens, reference tokens point to system primitives, and system primitives hold the raw values. You should never skip a tier — a component should not reference a system primitive directly.

Let's walk through each tier using the actual contents of our `tokens.css` file.

---

### Tier 1 — System Primitives (`--reloc-sys-*`)

System primitives are the raw material of the design system. They have descriptive, value-based names — `teal-700`, `neutral-200`, `spacing-4` — that tell you *what* the value is but say nothing about *where* or *why* to use it.

**Analogy.** These are the paint cans in the hardware store. The label says "Teal 700" and tells you the shade, but it has no opinion about whether you should put it on your front door, your kitchen cabinets, or your mailbox.

Here are the system primitives from our `tokens.css`:

#### Colors — Teal Palette (Primary)

```css
--reloc-sys-color-teal-50: #f0fdfa;
--reloc-sys-color-teal-100: #ccfbf1;
--reloc-sys-color-teal-200: #99f6e4;
--reloc-sys-color-teal-300: #5eead4;
--reloc-sys-color-teal-400: #2dd4bf;
--reloc-sys-color-teal-500: #14b8a6;
--reloc-sys-color-teal-600: #0d9488;
--reloc-sys-color-teal-700: #0f766e;
--reloc-sys-color-teal-800: #115e59;
--reloc-sys-color-teal-900: #134e4a;
```

This is a full 10-step teal scale from lightest (`50`) to darkest (`900`). The numbering convention comes from Tailwind's color system, which itself follows Material Design's shade numbering. Each step is a fixed hex value — nothing semantic, just a color.

#### Colors — Neutral Palette

```css
--reloc-sys-color-neutral-50: #f9fafb;
--reloc-sys-color-neutral-100: #f3f4f6;
--reloc-sys-color-neutral-200: #e5e7eb;
--reloc-sys-color-neutral-300: #d1d5db;
--reloc-sys-color-neutral-400: #9ca3af;
--reloc-sys-color-neutral-500: #6b7280;
--reloc-sys-color-neutral-600: #4b5563;
--reloc-sys-color-neutral-700: #374151;
--reloc-sys-color-neutral-800: #1f2937;
--reloc-sys-color-neutral-900: #111827;
```

Neutrals handle text, backgrounds, borders, and all the "non-color" parts of the UI. Most of the visual surface area of any application is neutral tones.

#### Colors — Semantic

```css
--reloc-sys-color-error-500: #ef4444;
--reloc-sys-color-error-600: #dc2626;
--reloc-sys-color-success-500: #22c55e;
--reloc-sys-color-success-600: #16a34a;
--reloc-sys-color-warning-500: #f59e0b;
```

Even at the system level, these names hint at semantics (error, success, warning), but they are still "just colors" — they define the shade, not the usage. The reference tier will decide that `error-500` means "this is the color you paint on validation messages."

#### Typography

```css
--reloc-sys-font-family-display: 'Inter', system-ui, sans-serif;
--reloc-sys-font-family-content: 'Inter', system-ui, sans-serif;
--reloc-sys-font-family-mono: 'JetBrains Mono', ui-monospace, monospace;

--reloc-sys-font-size-xs: 0.75rem;    /* 12px */
--reloc-sys-font-size-sm: 0.875rem;   /* 14px */
--reloc-sys-font-size-base: 1rem;     /* 16px */
--reloc-sys-font-size-lg: 1.125rem;   /* 18px */
--reloc-sys-font-size-xl: 1.25rem;    /* 20px */
--reloc-sys-font-size-2xl: 1.5rem;    /* 24px */
--reloc-sys-font-size-3xl: 1.875rem;  /* 30px */
```

Right now `display` and `content` both resolve to Inter. That's fine — having separate tokens means you can swap the display font to something bolder (like a serif for headings) later without touching any component code.

#### Spacing

```css
--reloc-sys-spacing-1: 4px;
--reloc-sys-spacing-2: 8px;
--reloc-sys-spacing-3: 12px;
--reloc-sys-spacing-4: 16px;
--reloc-sys-spacing-5: 20px;
--reloc-sys-spacing-6: 24px;
--reloc-sys-spacing-8: 32px;
--reloc-sys-spacing-10: 40px;
--reloc-sys-spacing-12: 48px;
```

These follow a 4px base grid. The number in the name is a scale step, not the pixel value (though `spacing-4` happens to be 16px because 4 x 4 = 16). A consistent spacing scale prevents the "why is this 13px?" problem that plagues projects without a system.

#### Radii and Shadows

```css
--reloc-sys-radius-none: 0px;
--reloc-sys-radius-sm: 4px;
--reloc-sys-radius-md: 8px;
--reloc-sys-radius-lg: 12px;
--reloc-sys-radius-full: 9999px;

--reloc-sys-shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
--reloc-sys-shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
--reloc-sys-shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
```

Radii and shadows are easy to overlook, but they are critical for visual consistency. Without tokens, you end up with `border-radius: 6px` in one place, `8px` in another, and `10px` in a third — all intended to look the same but subtly off.

---

### Tier 2 — Semantic References (`--reloc-ref-*`)

Semantic reference tokens are where the design system gains its power. Each reference token answers the question: **"What is this value for?"**

**Analogy.** You have taken those hardware-store paint cans and labeled them: "front door color," "trim color," "accent wall." Different name, same paint underneath. If you decide to repaint the front door from teal to navy, you swap the can behind the "front door color" label. Every instruction that says "use front door color" automatically gets the new shade.

#### Brand Colors

```css
--reloc-ref-color-primary: var(--reloc-sys-color-teal-700);
--reloc-ref-color-primary-hover: var(--reloc-sys-color-teal-800);
--reloc-ref-color-primary-light: var(--reloc-sys-color-teal-50);
--reloc-ref-color-primary-surface: var(--reloc-sys-color-teal-100);
```

`--reloc-ref-color-primary` means "our brand color." Right now it points to teal-700 (`#0f766e`). If the brand changes, you update this one line and every button, link, header accent, and active state in the entire application shifts to the new color.

Notice the family of related tokens: `primary-hover` for interactive hover states, `primary-light` for subtle tinted backgrounds, and `primary-surface` for highlighted card or section backgrounds. This keeps the primary color ecosystem consistent.

#### Text Colors

```css
--reloc-ref-color-text-primary: var(--reloc-sys-color-neutral-900);
--reloc-ref-color-text-secondary: var(--reloc-sys-color-neutral-600);
--reloc-ref-color-text-muted: var(--reloc-sys-color-neutral-400);
--reloc-ref-color-text-inverse: var(--reloc-sys-color-neutral-50);
```

Four levels of text emphasis. `text-primary` is for headings and body text — the most prominent. `text-secondary` is for supporting text like descriptions or captions. `text-muted` is for placeholder text and disabled labels. `text-inverse` is for text on dark backgrounds (like white text on a teal button).

When you write a component template, you never think about specific neutral shades. You think about *intent*: "Is this the main text or the supporting text?" and reach for the appropriate reference token.

#### Surface and Border Colors

```css
--reloc-ref-color-bg-body: var(--reloc-sys-color-neutral-50);
--reloc-ref-color-bg-card: #ffffff;
--reloc-ref-color-bg-elevated: #ffffff;
--reloc-ref-color-border: var(--reloc-sys-color-neutral-200);
--reloc-ref-color-border-strong: var(--reloc-sys-color-neutral-300);
```

These define the background layers of the application. `bg-body` is the page itself. `bg-card` is for content cards that sit on top of the body. `bg-elevated` is for elements that float above cards (modals, dropdowns). Currently `bg-card` and `bg-elevated` are both `#ffffff`, but separating them means you can add depth later — for example, a subtle gray for cards with pure white for modals.

The two border tokens (`border` and `border-strong`) handle the common need for "regular divider line" vs. "emphasized boundary."

#### Feedback Colors

```css
--reloc-ref-color-error: var(--reloc-sys-color-error-500);
--reloc-ref-color-success: var(--reloc-sys-color-success-500);
--reloc-ref-color-warning: var(--reloc-sys-color-warning-500);
```

These map directly from the system-level semantic colors. Validation errors use `--reloc-ref-color-error`. Success confirmations use `--reloc-ref-color-success`. Warnings use `--reloc-ref-color-warning`. A developer working on a form never needs to know the actual hex value of "error red" — they just use the token.

#### Typography and Layout

```css
--reloc-ref-font-display: var(--reloc-sys-font-family-display);
--reloc-ref-font-content: var(--reloc-sys-font-family-content);

--reloc-ref-radius-card: var(--reloc-sys-radius-lg);
--reloc-ref-radius-input: var(--reloc-sys-radius-md);
--reloc-ref-radius-button: var(--reloc-sys-radius-md);
--reloc-ref-shadow-card: var(--reloc-sys-shadow-md);
```

These reference tokens assign semantic roles to the primitive spacing, radius, and shadow values. Cards get `radius-lg` (12px) and `shadow-md`. Inputs and buttons get `radius-md` (8px). If a design review decides buttons should be more rounded, you change `--reloc-ref-radius-button` from `var(--reloc-sys-radius-md)` to `var(--reloc-sys-radius-full)` and every button in the app gets pill-shaped — one line, one change.

---

### Tier 3 — Component Tokens (`--reloc-comp-*`)

Component tokens are the most specific tier. They apply to a single component or component variant and override the reference-tier defaults when a component needs to deviate.

**Use these sparingly.** Most components should consume `--reloc-ref-*` tokens directly. Component tokens are for cases where a specific component needs a value that differs from the semantic default but should still be centrally manageable.

Example — a destructive button variant that uses error red instead of the primary brand color:

```css
.button--destructive {
  --reloc-comp-button-bg: var(--reloc-ref-color-error);
  --reloc-comp-button-bg-hover: var(--reloc-sys-color-error-600);

  background-color: var(--reloc-comp-button-bg);
}

.button--destructive:hover {
  background-color: var(--reloc-comp-button-bg-hover);
}
```

The default `.button` class uses `var(--reloc-ref-color-primary)` directly. The destructive variant introduces component-level tokens to override just the background behavior, keeping the rest (padding, radius, font) inherited from the shared button styles.

If your application does not have many variant-heavy components, you may never need Tier 3. That is fine. Having the naming convention ready means you can adopt it later without renaming anything.

---

## Inspiration from Enterprise Token Systems

This three-tier architecture is not something we invented. It follows the same pattern used by enterprise Angular applications and is aligned with **Material Design 3's token architecture**, which Google published as part of their design system specification. MD3 formalizes the idea that tokens should flow from source (system) through reference to component level.

For example, enterprise platforms often use a project-specific prefix (like `--xp-*`) with the same three tiers:

| Our Token | Enterprise Equivalent |
|-----------|-------------------|
| `--reloc-sys-color-teal-700` | `--xp-sys-color-*` |
| `--reloc-ref-color-primary` | `--xp-ref-color-*` |
| `--reloc-comp-button-bg` | `--xp-comp-*` |

The `--xp-sys-*` to `--xp-ref-*` to `--xp-comp-*` progression follows the same three-tier pattern we use. Our `reloc` prefix stands for "Relocation." The convention of using a short project-specific prefix prevents token collisions when multiple design systems coexist on the same page — which happens more often than you might think in micro-frontend architectures.

**What this demonstrates:** The three-tier token architecture (system primitives, semantic references, component overrides) is an industry-standard pattern used by Google, Salesforce, IBM, and enterprise Angular teams. Building it from scratch proves understanding of scalable design systems, not just utility-class CSS.

---

## Tailwind CSS Integration

Our project uses both CSS design tokens and Tailwind CSS. These are not competing approaches — they serve different purposes and complement each other.

See also: [[tailwind]] for Tailwind-specific configuration details.

### What Each Tool Does Best

**Tailwind** excels at layout and utility-level styling: padding, margin, flexbox, grid, responsive breakpoints, and common patterns like `rounded-lg` or `text-center`. It keeps your templates expressive and avoids writing one-off CSS classes for layout concerns.

**Design tokens** excel at encoding the design language: which colors mean what, how much spacing is "standard card padding," what radius do buttons get. They provide the semantic layer that Tailwind's generic utility classes lack.

### Using Them Together

In practice, you combine Tailwind utilities for structural styling and `var()` references for semantic values. Here is what that looks like in an Angular component template:

```html
<!-- Tailwind handles layout: padding, flex, rounded corners, max-width -->
<!-- Tokens handle semantics: colors, shadows -->
<div class="flex flex-col gap-6 p-6 rounded-lg max-w-md"
     style="background-color: var(--reloc-ref-color-bg-card);
            box-shadow: var(--reloc-ref-shadow-card);
            border: 1px solid var(--reloc-ref-color-border)">

  <h2 class="text-2xl font-semibold"
      style="color: var(--reloc-ref-color-text-primary)">
    Salary Breakdown
  </h2>

  <p class="text-sm"
     style="color: var(--reloc-ref-color-text-secondary)">
    Your estimated monthly net income after taxes and deductions.
  </p>
</div>
```

Tailwind's `p-6`, `rounded-lg`, `flex`, `gap-6`, `text-2xl`, and `font-semibold` handle spacing, layout, and typographic sizing. The token `var()` references handle the *meaning* of each color — primary text vs. secondary text, card background vs. page background.

### Can Tailwind Consume Token Values?

Yes. You can configure `tailwind.config.js` to map token values into Tailwind's utility system:

```javascript
// tailwind.config.js (conceptual example)
module.exports = {
  theme: {
    extend: {
      colors: {
        'reloc-primary': 'var(--reloc-ref-color-primary)',
        'reloc-error': 'var(--reloc-ref-color-error)',
      }
    }
  }
}
```

This would let you write `bg-reloc-primary` instead of `style="background-color: var(--reloc-ref-color-primary)"`. For our project scope, inline `var()` references are simpler and more explicit. In a larger production codebase, wiring tokens into the Tailwind config is a cleaner approach.

---

## Why Not Just Use Tailwind's Colors?

This is a fair question. Tailwind ships with a comprehensive color palette — you could write `bg-teal-700` and get the same hex value as our `--reloc-sys-color-teal-700`. So why bother with tokens?

### The Problem with Direct Utility Colors

Imagine you build the entire application using `bg-teal-700` for the brand color. Six months later, the brand color changes from teal to indigo. You now need to:

1. Find every instance of `bg-teal-700`, `text-teal-700`, `border-teal-700`, `ring-teal-700` across every template
2. Find the hover variants: `hover:bg-teal-800`, `focus:ring-teal-600`
3. Find the light variants used for backgrounds: `bg-teal-50`, `bg-teal-100`
4. Replace them all, hoping you do not miss any or accidentally change a teal that was decorative and should have stayed teal

### The Token Solution

With tokens, you change one line:

```css
/* Before */
--reloc-ref-color-primary: var(--reloc-sys-color-teal-700);

/* After */
--reloc-ref-color-primary: var(--reloc-sys-color-indigo-700);
```

Done. Every component that references `--reloc-ref-color-primary` now uses indigo. No find-and-replace. No missed instances. No accidental changes to unrelated teal elements.

### This Is an Enterprise Requirement

This is not over-engineering for the sake of it. Enterprise design systems need this level of indirection because:

- **Multiple products** share the same design system but may need different brand colors (white-labeling). Enterprise financial calculators are often white-label products — different banks embed them with their own brand colors.
- **Theming** (dark mode, high contrast, seasonal themes) becomes a matter of swapping token values rather than maintaining parallel stylesheets.
- **Design-engineering collaboration** improves when designers can say "update primary to this new hex" and engineers know exactly which token to change.

This is why Google, Salesforce, IBM, and enterprise Angular teams all use token architectures. It scales in ways that raw utility classes cannot.

---

## Try It Yourself

The best way to understand tokens is to break them and watch what happens.

### Exercise 1: Change the Brand Color

1. Open `frontend/src/styles/tokens.css`
2. Find this line:
   ```css
   --reloc-sys-color-teal-700: #0f766e;
   ```
3. Change it to purple:
   ```css
   --reloc-sys-color-teal-700: #7c3aed;
   ```
4. Save the file and look at the running application (start it with `ng serve` if it is not running)
5. Every element that uses the primary brand color — buttons, links, active states, accents — should now be purple. You changed one line and the entire brand shifted.
6. Change it back to `#0f766e` when you are done.

### Exercise 2: Add a New Semantic Token

1. In `tokens.css`, find the `/* Brand */` section under Semantic References
2. Add a new token after `--reloc-ref-color-primary-surface`:
   ```css
   --reloc-ref-color-accent: var(--reloc-sys-color-teal-400);
   ```
3. This creates a lighter accent color mapped to teal-400 (`#2dd4bf`)
4. Use it in any component template:
   ```html
   <div style="border-left: 3px solid var(--reloc-ref-color-accent); padding-left: 12px;">
     This callout box uses the accent color.
   </div>
   ```
5. Now try changing `--reloc-ref-color-accent` to point to `--reloc-sys-color-teal-300` instead. The border updates without touching the template.

### Exercise 3: Trace the Chain

Pick any reference token — say `--reloc-ref-color-text-secondary`. Trace its resolution:

1. `--reloc-ref-color-text-secondary` is defined as `var(--reloc-sys-color-neutral-600)`
2. `--reloc-sys-color-neutral-600` is defined as `#4b5563`
3. So any element using `var(--reloc-ref-color-text-secondary)` ultimately renders as `#4b5563`

Open browser DevTools, inspect an element using that token, and you will see the computed value in the Styles panel. The browser resolves the entire chain for you.

---

## Common Mistakes

### 1. Using System Tokens Directly in Components

```css
/* Bad — skips the semantic layer */
.card-title {
  color: var(--reloc-sys-color-neutral-900);
}

/* Good — uses the semantic reference */
.card-title {
  color: var(--reloc-ref-color-text-primary);
}
```

The first version works today, but if you later decide that `text-primary` should be `neutral-800` instead of `neutral-900`, you have to find every instance of `--reloc-sys-color-neutral-900` and figure out which ones are "text" and which ones are something else. The reference token gives you a single point of control.

### 2. Creating Too Many Component Tokens

If you find yourself defining `--reloc-comp-*` tokens for every component, something is wrong. Component tokens exist for *exceptions*, not the rule. Most components should use `--reloc-ref-*` tokens directly.

Ask yourself: "Is this component genuinely different from the semantic default, or am I just being overly specific?" If a button's background is the primary brand color, just use `var(--reloc-ref-color-primary)`. You do not need `--reloc-comp-button-bg` unless you have button *variants* that need different backgrounds.

### 3. Not Documenting Token Intent

Token names should be self-documenting, but they are not always enough. Future developers (or future you) will not know that `--reloc-ref-color-primary-surface` is intended for "highlighted card backgrounds where you want a subtle brand tint." A comment in `tokens.css` goes a long way:

```css
/* For highlighted/active card backgrounds — subtle brand tint */
--reloc-ref-color-primary-surface: var(--reloc-sys-color-teal-100);
```

### 4. Hardcoding Values That Should Be Tokens

If you catch yourself writing a raw hex code or pixel value in a component's CSS, pause and check whether a token already exists for that value. If it does, use the token. If it does not and you think it should, add one to the system rather than hardcoding.

---

## Key Takeaways

These are the core principles to take away from the design token architecture:

- **Design tokens create a contract between design and engineering.** Designers update token values in the design tool (Figma, Sketch), those values flow into the CSS token file, and the UI updates everywhere. The token names are the shared vocabulary between the two disciplines.

- **The three-tier system prevents the "47 shades of blue" problem** — where slightly different colors creep into the codebase over time because developers eyedrop colors from mockups or guess at hex values. With tokens, there is exactly one definition for each semantic color, and everyone references it.

- **This pattern scales to theming and white-labeling.** Dark mode is implemented by swapping the reference tier — `--reloc-ref-color-bg-body` changes from `neutral-50` to `neutral-900`, `--reloc-ref-color-text-primary` changes from `neutral-900` to `neutral-50`. The system primitives stay the same. White-label products work the same way — swap the brand tokens, keep everything else.

- **Material Design 3 formalized this architecture.** Google's MD3 spec defines system tokens, reference tokens, and component tokens as distinct layers. Enterprise Angular token systems follow this, and so does our `--reloc-*` system. It is an industry-standard pattern, not something custom.

---

## See Also

- [[css-custom-properties]] — deep dive on CSS custom properties
- [[design-tokens]] — the concept page
- [[tailwind]] — Tailwind CSS integration
- [[europace-patterns]] — enterprise Angular patterns that inspired this project
- [[tutorials/01-angular-scaffold]] — previous tutorial
- [[tutorials/03-kotlin-spring-boot]] — next tutorial
