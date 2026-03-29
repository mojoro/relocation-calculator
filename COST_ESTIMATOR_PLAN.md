# Cost Estimator Expansion — Implementation Checklist

> Expanding the cost estimator into a full budgeting tool with AI analysis.
> Work through these items to flesh out implementation details, then build.

---

## Section 1: Lifestyle Spending (NEW)

Collapsible section below the existing Bezirk/rooms form. Collapsed by default. Contains category sliders that allocate percentages of net monthly income across spending areas.

### Data Model

- [ ] Define budget category type (label, key, percentage, estimated EUR amount, isCustom flag)
- [ ] Decide on default categories and their recommended allocations:
  - Rent (pre-filled from cost estimate median)
  - Utilities (pre-filled from cost estimate)
  - Transport (pre-filled from cost estimate)
  - Groceries (pre-filled from cost estimate)
  - Dining & Nightlife
  - Health & Fitness
  - Savings & Investments
  - Clothing & Personal
  - Entertainment & Culture
  - Miscellaneous
- [ ] Decide: should defaults be driven by financial advisor benchmarks (e.g., 50/30/20 rule mapped to categories) or derived from the Bezirk-specific estimates? Ideally, bezirk-specific estimates.
- [ ] Decide: are some categories Bezirk-sensitive? Yes(e.g., dining costs differ Kreuzberg vs. Charlottenburg)
- [ ] Where do percentages live — frontend-only signals, or does the backend need to know about allocations? I would say backend because, truly, everything can just be handled on the frontend with serverless functions. For this app, the only reason to even have a backend is to demonstrate kotlin proficiency.

### Percentage Allocation UX

- [ ] **Decide validation behavior** — pick one:
  - **(A) Hard cap**: sliders can't push total above 100%. Moving one slider auto-reduces others proportionally.
  - **(B) Soft warning**: sliders move freely, persistent notification banner when total != 100%.
  - **(C) Hybrid**: sliders free up to 100%, locked beyond. Notification if under 100% ("X% unallocated").
- [ ] How do fixed-EUR items (rent, utilities, transport) translate to percentages? They depend on net salary being available. What happens when it's not?
  - Show EUR amounts only, no percentages?
  - Prompt user to complete Step 1 first? Step 1 first, yep.
  - Use a placeholder/assumed salary?
- [ ] Slider component: build custom `<input type="range">` styled with design tokens.
- [ ] Decide granularity — Free-form with mirrored number input.

### Custom Field (stretch)

- [ ] "Add category" button below the list
- [ ] Text input for label + slider for percentage
- [ ] Delete button on custom categories
- [ ] How many custom categories allowed? Cap at 3–5?
- [ ] Are custom categories persisted to sessionStorage, or lost on refresh?

### Signals & State

- [ ] `budgetCategories` signal: array of category objects with percentage + EUR amount
- [ ] `totalAllocated` computed signal: sum of all percentages
- [ ] `isOverBudget` computed signal
- [ ] `unallocatedPercent` computed signal
- [ ] Effect to recalculate EUR amounts when net salary or percentages change
- [ ] Effect to recalculate rent/utility/transport percentages when Bezirk or rooms change

### Component Structure

- [ ] `reloc-lifestyle-spending` — the collapsible container
- [ ] `reloc-budget-slider` — individual category row (label, slider, percentage, EUR display)
- [ ] Collapse/expand animation (reuse the grid-rows pattern from salary breakdown accordion?)

---

## Section 2: Budget Overview (REFACTOR of current Cost Breakdown)

Current section shows a flat list of 4 cost items + total. Refactoring into a richer overview with per-category breakdowns and a pie chart.

### Pie Chart

- [ ] Choose charting approach:
  - **(A) Pure CSS/SVG**: conic-gradient or hand-drawn SVG arcs. Zero dependencies. Donut style fits the card aesthetic.
  - **(B) Lightweight library**: Chart.js, lightweight alternatives? Adds a dependency.
  - Recommendation: try pure CSS `conic-gradient` first — it updates reactively with signals and needs no library.
- [ ] Chart must update in real-time as sliders in Section 1 change
- [ ] Color assignments per category — use design tokens or a generated palette?
- [ ] Legend: inline below chart, or integrated into the category breakdown rows?
- [ ] What does the chart show when salary is unknown? Only fixed EUR amounts? Skip percentages?

### Per-Category Breakdown

- [ ] Which categories get sub-breakdowns?
  - Rent: median, range (min–max), price per sqm
  - Utilities: Nebenkosten breakdown (heating, water, waste, building maintenance)?
  - Transport: BVG options (AB vs. ABC, monthly vs. annual savings)?
  - Groceries: could break into supermarket tiers (Aldi/Lidl vs. Edeka/Rewe vs. Bio)?
  - Other categories: probably just the single amount, no sub-breakdown needed
- [ ] Expandable rows (accordion) for categories that have detail, flat rows for simple ones
- [ ] Each row shows: category name, percentage, EUR/month, optional expand arrow
- [ ] Total row at bottom with the full monthly sum
- [ ] Surplus/deficit row: net salary − total allocated (green if positive, red if negative)

### Data Flow

- [ ] Does the backend need to return more granular data (utility sub-items, grocery tiers)?
- [ ] Or are sub-breakdowns frontend-only presentation of the existing data?
- [ ] Does the budget overview consume the same `CostEstimate` response, or does it need a new/expanded endpoint?

---

## Section 3: Sanity Check (RENAME + EXPAND of current Affordability Comparison)

Currently shows net salary vs. estimated costs with a simple ratio and verdict. Expanding with more rules-based validations and AI analysis.

### Rules-Based Validations

- [ ] Expand beyond the single affordability ratio. Possible rules:
  - Rent-to-income ratio (30% rule — Mietbelastungsquote)
  - Savings rate check (is anything left for savings?)
  - Emergency fund feasibility (can they build 3-month buffer?)
  - Transport allocation vs. Bezirk distance from city center
  - Grocery budget vs. Berlin average for household size
  - Bezirk-specific warnings (e.g., "Mitte rent is above Berlin median by X%")
- [ ] Each rule produces a verdict: pass / warning / fail with explanation text
- [ ] Visual display: checklist with icons (checkmark, warning triangle, X)?
- [ ] Do rules need the full budget allocation from Section 1, or just the existing cost estimate?

### AI "Picture of Life" Feature

- [ ] **Button**: "See what your life could look like" or similar CTA
- [ ] **What gets sent to the AI**:
  - Net monthly salary
  - Bezirk selection
  - Apartment size (rooms)
  - All budget category allocations (percentages + EUR amounts)
  - Rent range for the Bezirk
  - Rules-based verdicts
- [ ] **What the AI returns**: a narrative description — "Here's what daily life looks like in Kreuzberg on a €X budget..."
- [ ] **AI provider**: which service? OpenAI API? Anthropic? Decide on provider and model.
- [ ] **Backend or frontend call?** Prefer backend (keeps API key server-side). New endpoint: `POST /api/v1/budget/ai-analysis` ?
- [ ] **Prompt engineering**: write the system prompt. Financial advisor + local lifestyle planner persona. Should reference specific Bezirk character, local shops, transport options, cultural offerings.
- [ ] **Streaming vs. batch**: stream the response for better UX? Or return complete?
- [ ] **Loading state**: what does the UI show while AI is generating? Skeleton? Typing animation?
- [ ] **Display**: rendered markdown in a card? Plain text? Structured sections?
- [ ] **Rate limiting / cost**: any guards against repeated clicks? Debounce? Cache responses for same inputs?
- [ ] **Error handling**: what if AI call fails? Graceful fallback message.
- [ ] **Privacy note**: mention that budget data is sent to an AI service for analysis?

---

## Cross-Cutting Concerns

### Schema Changes

- [ ] `CostEstimate` (backend model) — does it need new fields, or do new sections use existing data differently?
- [ ] New request/response types for AI analysis endpoint
- [ ] Frontend model updates — new interfaces for budget categories, AI response
- [ ] OpenAPI spec regeneration if backend models change

### State Management

- [ ] Budget allocations need to flow: Section 1 sliders → Section 2 chart + breakdown → Section 3 rules
- [ ] All connected through signals — define the signal graph before building
- [ ] Session persistence: save budget allocations to sessionStorage so they survive refresh?
- [ ] What resets when Bezirk or rooms change? All allocations? Only the fixed-cost ones?

### Styling

- [ ] Collapsible section animation — consistent with existing accordion patterns
- [ ] Slider styling — needs to match design token system (`--reloc-ref-*`)
- [ ] Pie chart colors — define a palette that works in the existing teal/neutral scheme
- [ ] AI response card — distinct visual treatment? Quote-style? Different background?

### Component Tree (rough)

```
reloc-cost-estimator (existing, expanded)
├── Selection Card (existing — Bezirk + rooms form)
├── reloc-lifestyle-spending (NEW — collapsible)
│   ├── reloc-budget-slider (repeated per category)
│   └── "Add category" button (stretch)
├── reloc-budget-overview (REFACTORED from cost-breakdown)
│   ├── Pie chart (SVG/CSS)
│   └── Category rows with expandable detail
└── reloc-sanity-check (RENAMED from affordability)
    ├── Rules-based verdict list
    └── AI analysis card + trigger button
```

---

## Build Sequence (suggested)

1. **Schema & signals first** — define the budget category model, set up the signal graph
2. **Section 1 (Lifestyle Spending)** — sliders + allocation logic, collapsed container
3. **Section 2 (Budget Overview)** — pie chart + refactored breakdown consuming slider state
4. **Section 3 (Sanity Check)** — rules engine, then AI integration last
5. **Polish** — animations, edge cases (no salary), sessionStorage persistence

---

## Open Questions

- [ ] Should the AI feature be a stretch goal, or is it core to the demo?
- [ ] Is the budget allocation purely frontend state, or should the backend validate/store it?
- [ ] How tightly should Bezirk-specific data drive the default allocations? (e.g., dining costs vary by district — is that worth modeling?)
- [ ] Should the pie chart support dark mode from the start?
