# CLAUDE.md — Berlin Relocation Planner

## Operating Mode

**Important — backend is archived.** As of 2026-05-05 the Kotlin/Spring backend has been ported into the Angular frontend and moved under `attic/backend/`. Do not spin it up, build it, or run `./gradlew`. All calculation logic now lives in `frontend/src/app/core/calculators/` (tax, cost, budget allocator, budget analyzer). The only server-side code is `api/analyze.ts`, a Vercel serverless function for OpenRouter-powered AI analysis. See `attic/README.md` for context.

**You are a senior engineering manager, not a line developer.** Your context window is your most precious resource. Protect it ruthlessly.

### Agent Orchestration Rules

1. **Default to spawning sub-agents** for any task that involves writing or editing more than ~40 lines of code. Use `claude --print` or Task agents for implementation. Reserve your own context for architecture decisions, code review, and orchestration.
2. **Never auto-compact.** If you feel context pressure, stop and tell the user rather than silently losing conversation history. The user has explicitly requested zero auto-compacts.
3. **Batch file creation.** When scaffolding, write a shell script that creates all files in one agent call rather than creating them one by one in your context.
4. **Review, don't write.** After a sub-agent completes work, read the output files and verify correctness rather than rewriting them yourself.
5. **Keep implementation out of your context.** When you need to write code, describe the specification clearly and delegate. Your context should contain decisions, not implementations.

### Context Window Hygiene

- Do NOT cat large files into your context. Use `head`, `tail`, `grep`, or `sed` to inspect specific sections.
- Do NOT read node_modules, build output, or generated files.
- Summarize agent output rather than echoing it.
- If a task requires touching more than 3 files, spawn an agent.

---

## Project Purpose

**Part of John Moorman's 10-in-10 challenge** (10 projects in 10 weeks, blogged at johnmoorman.com). Originally built as an Angular + Kotlin/Spring Boot portfolio piece; the Kotlin backend was ported into the frontend on 2026-05-05 to consolidate hosting on Vercel. The Kotlin source is preserved under `attic/backend/` for portfolio reference. The architecture still mirrors enterprise patterns: contract-first response shapes via OpenAPI codegen, signal-based state, and a three-tier design token system.

This project demonstrates:
1. Angular proficiency (standalone components, Signals, reactive forms, OnPush, lazy routes)
2. Real domain logic in TypeScript (2026 German tax algorithm), with parity tests against the original Kotlin implementation in `attic/`
3. Contract-first development via OpenAPI -> `openapi-typescript` codegen, error handling, loading states
4. Domain authority — John actually relocated to Berlin, so the tax, neighborhood, and visa content is authentic

---

## Architecture

### Monorepo Structure

```
relocation-calculator/
├── frontend/                  # Angular 21.2 application (the entire app)
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/
│   │   │   │   ├── calculators/          # Ported Kotlin logic — tax, cost, budget allocator, budget analyzer, Bezirk data
│   │   │   │   ├── api/generated-types.ts # openapi-typescript output
│   │   │   │   └── ...                   # Services, models, interceptors
│   │   │   ├── shared/                   # Reusable components (currency-input, step-indicator) and pipes
│   │   │   ├── features/
│   │   │   │   ├── salary-calculator/    # Step 1: Gross->net salary with tax breakdown
│   │   │   │   ├── neighborhood-explorer/ # Step 2: 12 Berlin Bezirke profiles
│   │   │   │   ├── cost-estimator/       # Step 3: Rent, budget sliders, AI analysis
│   │   │   │   └── visa-checklist/       # Step 4: Interactive visa/admin checklist
│   │   │   ├── app.ts                    # Root component with theme toggle
│   │   │   ├── app.config.ts
│   │   │   └── app.routes.ts             # Lazy-loaded feature routes
│   │   ├── styles/
│   │   │   └── tokens.css     # 3-tier design token system (--reloc-sys-*, --reloc-ref-*)
│   │   └── environments/
│   │       ├── environment.ts
│   │       └── environment.prod.ts
│   ├── angular.json
│   ├── .postcssrc.json        # Tailwind 4.2 via PostCSS
│   └── tsconfig.json
├── api/
│   └── analyze.ts             # Vercel serverless function — OpenRouter proxy
├── shared/
│   └── api-contracts/
│       └── openapi.yaml       # Still authoritative for response shapes via openapi-typescript
├── attic/                     # Archived Kotlin/Spring backend, docker-compose, railway.toml
│   ├── README.md
│   ├── backend/
│   ├── docker-compose.yml
│   └── railway.toml
├── vercel.json
└── CLAUDE.md
```

### Frontend Components

| Component | Selector | Location |
|-----------|----------|----------|
| AppComponent | `app-root` | `app.ts` — root wrapper, header with theme toggle, step indicator, router outlet |
| SalaryCalculatorComponent | `reloc-salary-calculator` | `features/salary-calculator/` — container for salary form + breakdown |
| SalaryFormComponent | `reloc-salary-form` | `features/salary-calculator/` — reactive form: gross salary, tax class, age, children, church tax |
| SalaryBreakdownComponent | `reloc-salary-breakdown` | `features/salary-calculator/` — tax bracket breakdown display |
| CostEstimatorComponent | `reloc-cost-estimator` | `features/cost-estimator/` — orchestrator: bezirk/room selection, cost fetch, budget sliders |
| CostBreakdownComponent | `reloc-cost-breakdown` | `features/cost-estimator/` — pie chart + category breakdown |
| BudgetSliderComponent | `reloc-budget-slider` | `features/cost-estimator/` — per-category budget slider |
| LifestyleSpendingComponent | `reloc-lifestyle-spending` | `features/cost-estimator/` — editable category percentages |
| SanityCheckComponent | `reloc-sanity-check` | `features/cost-estimator/` — validation rules + AI analysis display |
| NeighborhoodExplorerComponent | `reloc-neighborhood-explorer` | `features/neighborhood-explorer/` — grid of 12 Berlin neighborhoods |
| NeighborhoodCardComponent | `reloc-neighborhood-card` | `features/neighborhood-explorer/` — single neighborhood card |
| VisaChecklistComponent | `reloc-visa-checklist` | `features/visa-checklist/` — visa type selector + interactive checklist |
| StepIndicatorComponent | `reloc-step-indicator` | `shared/components/` — wizard progress bar |
| CurrencyInputComponent | `reloc-currency-input` | `shared/components/` — reusable EUR input |
| RelocInfoBubbleComponent | `reloc-info-bubble` | `shared/components/` — info tooltip |
| MarkdownPipe | `markdown` | `shared/pipes/` — lightweight md->HTML for bold and list items (- and * markers) |

### In-Frontend Calculators (formerly Backend API)

The Kotlin backend was archived under `attic/backend/` on 2026-05-05. The endpoints below used to be live HTTP routes; they are now in-process function calls in `frontend/src/app/core/calculators/`. Response shapes are still defined by `shared/api-contracts/openapi.yaml` and are consumed via `openapi-typescript` codegen.

**Former endpoints, now in-process:**
- `POST /api/v1/salary/calculate` -> `tax-calculator.ts` (SalaryRequest -> SalaryResponse with full tax breakdown)
- `GET /api/v1/costs/estimate?bezirk=...&rooms=...` -> `cost-estimator.ts` (CostEstimate)
- `GET /api/v1/neighborhoods[/{bezirk}]` -> `bezirk-data.ts` (NeighborhoodProfile[])
- `POST /api/v1/costs/allocate` -> `budget-allocator.ts` (BudgetAllocation)
- `POST /api/v1/costs/analyze` -> `budget-analyzer.ts` for the template path; the AI path now goes to the Vercel function `api/analyze.ts`

**Tax Calculation (`tax-calculator.ts`):**
- 5-zone progressive income tax (Grundfreibetrag 12,348 EUR -> 45% Reichensteuer)
- Vorsorgepauschale deduction
- Social insurance: health, pension, unemployment, nursing care
- Solidarity surcharge (5.5% above 20,350 EUR threshold)
- Church tax (Berlin: 9% of income tax)
- Ehegattensplitting for tax class III
- Childless nursing care surcharge
- Parity-tested against the archived Kotlin `TaxCalculationService` (`__tests__/fixtures.ts`)

**AI Analysis (`api/analyze.ts` Vercel function):**
- Optional — requires `OPENROUTER_API_KEY` env var on Vercel
- Model configurable via `OPENROUTER_MODEL` (default: `anthropic/claude-sonnet-4`, production uses `anthropic/claude-3.5-haiku`)
- Function-level timeout falls through to the in-frontend template engine
- Frontend shows the template fallback with a retry button when AI is unreachable

**Neighborhood Data (`bezirk-data.ts`):**
- 12 Berlin Bezirke with commute time ranges (min/max) based on actual BVG/S-Bahn transit data
- Deutschlandticket (EUR 63/month) referenced in transport analysis

### API Contract System

Contract-first via OpenAPI is preserved even though there's no longer a separate backend:
- Single source of truth: `shared/api-contracts/openapi.yaml`
- Frontend: `npm run prebuild` -> `openapi-typescript` -> `core/api/generated-types.ts`
- The in-frontend calculators conform to these generated types, so the response shapes the original Kotlin API exposed are still documented and enforced at compile time.
- The archived Gradle `openApiGenerate` task lives under `attic/backend/build.gradle.kts` for reference.

### Integration Layer

1. **Typed contracts** — OpenAPI spec in `shared/api-contracts/` generates TypeScript types that the in-frontend calculators conform to.
2. **Error handling** — Angular interceptor (`error.interceptor.ts`) catches HTTP errors from the AI analyze function and surfaces them as typed error states, not console.error.
3. **Loading states** — Calculator calls and the `api/analyze.ts` fetch each have explicit loading/success/error states visible in the UI via Signals.
4. **Validation parity** — Form validators match the constraints the original Kotlin API enforced (e.g. `grossAnnual >= 0`).

### State Persistence

All cross-step state is managed by `WizardService` and persisted to `localStorage`:
- Step 1: net/gross salary, tax class
- Step 2/3: bezirk selection, room count, budget percentages
- AI analysis result and percentage snapshot for reanalyze detection
- Step 4: visa type, completed checklist item IDs

The service uses a single `effect()` that serializes all signals to one `localStorage` key (`reloc_wizard_state`). Components read directly from wizard service signals — no intermediate caching.

---

## Design Patterns

### Angular (all implemented)

- All components standalone (zero NgModules), all feature components OnPush
- `reloc-*` selector prefix on all components
- Reactive forms with FormGroup + Validators on salary and cost forms
- Angular Signals for UI state, RxJS for HTTP/async only
- `WizardService` shares state across steps (net salary, bezirk, etc.)
- Lazy-loaded routes for all 4 features
- Error interceptor catches HTTP errors -> typed error states
- Light/dark theme via `data-theme` attribute + CSS custom properties

### Design Token System (tokens.css)

- 3-tier: `--reloc-sys-*` (primitives) -> `--reloc-ref-*` (semantic) -> component usage
- Full teal palette (50-900), neutral scale, error/success/warning
- Feedback tint tokens (`--reloc-ref-color-{success,warning,error}-light`) with dark mode overrides via `color-mix()`
- Dark mode support via `[data-theme='dark']` overrides
- Tailwind 4 arbitrary property syntax bridges tokens into utilities: `bg-(--reloc-ref-color-primary-surface)`

---

## Wizard Flow

The app is a 4-step wizard. All calculation runs in-frontend; only AI analysis touches the network (Vercel serverless function).

1. **Salary Calculator** — Gross salary, tax class, age, children, church tax -> `tax-calculator.ts` -> net monthly breakdown with all deductions itemized
2. **Neighborhood Explorer** — Grid of 12 Berlin Bezirke with profiles, commute times, rent ranges, vibe -> `bezirk-data.ts`
3. **Cost Estimator** — Bezirk/room selection, rent estimates, budget sliders, lifestyle spending, sanity check with AI analysis -> `cost-estimator.ts`, `budget-allocator.ts`, `budget-analyzer.ts` (template) + `api/analyze.ts` (AI)
4. **Visa Checklist** — Visa type selector (EU Blue Card, Freelance, Job Seeker) + 19-item interactive admin checklist with links to official Auslanderbehorde pages, checked state persisted to localStorage -> pure frontend, Signals-driven

---

## Deployment

- **Vercel only** (`https://relocation-calculator.vercel.app`) — auto-deploys on push to main. Vercel builds the Angular SPA and the `api/analyze.ts` serverless function in one project. SPA routing via `vercel.json`.
- **Railway is gone.** The backend is archived under `attic/backend/`; the deprecated Railway URL `https://relocation-calculator-production.up.railway.app` is no longer live.
- **Local dev:** `cd frontend && ng serve`. Use `vercel dev` from the repo root if you need to exercise the AI analyze function locally (set `OPENROUTER_API_KEY` in `.env.local`).
- Dev: `http://localhost:4200` (frontend)
- **Blog post:** `https://johnmoorman.com/blog/relocation-calculator`

---

## Technical Checklist

- [x] Angular 21 with standalone components (zero NgModules)
- [x] At least 5 components using `reloc-*` selector prefix
- [x] Reactive forms with FormGroup and Validators on Step 1 and Step 3
- [x] At least 2 injectable services using HttpClient
- [x] Signals used for state (not just RxJS BehaviorSubjects)
- [x] OnPush change detection on feature components
- [x] CSS custom property token system (`--reloc-sys-*`, `--reloc-ref-*`)
- [x] Tailwind CSS for utility classes
- [x] Kotlin Spring Boot backend with at least 1 working POST endpoint
- [x] Kotlin data classes mirroring TypeScript interfaces (via OpenAPI codegen)
- [x] Docker setup for backend
- [x] Loading/error states on all API calls
- [x] Deployed frontend URL
- [x] Deployed backend URL
- [x] README with architecture explanation

---

## What NOT to Build

- No auth system
- No database (all calculation is stateless)
- No SSR (static SPA deploy is fine)
- No complex CI/CD (GitHub Actions is fine but not required for v1)
- No testing framework setup beyond maybe one example test
- No CMS integration in v1 (Sanity is a stretch goal only)
- No i18n (German-only content is fine, English UI is fine)

---

## Tech Versions

- Angular: 21.2
- TypeScript: 5.9.2
- Tailwind CSS: 4.2.2
- Kotlin: 2.1.10
- Spring Boot: 3.4.4
- JDK: 21
- Node: 22 LTS
- Vitest: 4.x (test runner)
- OpenAPI Generator: 7.12.0

---

## Potential Enhancements

- Sanity CMS integration for neighborhood data
- Example unit tests for tax calculation service and salary form
- i18n support (German UI option)
- Screenshot images for README (`/images/` directory referenced but not yet added)
