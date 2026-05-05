# Berlin Relocation Planner

A four-step wizard for people considering a move to Berlin. Enter your salary, explore neighborhoods, plan your monthly budget with AI-powered analysis, and track the visa and admin process with an interactive checklist.

I built this as part of my [10-in-10 challenge](https://johnmoorman.com) (10 projects in 10 weeks). The motivation was twofold: I wanted real experience with Angular and Kotlin, and having gone through the Berlin relocation process myself, I wanted to build something genuinely useful for the people who keep asking me how it all works.

**[Live App](https://relocation-calculator.vercel.app)** · **[Blog Post](https://johnmoorman.com/blog/relocation-calculator)**

## What It Does

**Salary Calculator.** Enter your gross annual salary, tax class, age, church tax preference, and number of children. The frontend runs the 2026 German Lohnsteuer algorithm in-process and returns a complete breakdown with every deduction explained. For a EUR 60,000 gross salary, the calculator is accurate to within EUR 0.04/month compared to the [official BMF calculator](https://bmf-steuerrechner.de/). The source was the BMF's own XML specification of the algorithm.

**Neighborhood Explorer.** All twelve Berlin Bezirke in a grid with culture descriptions, commute time ranges to Mitte (min/max based on actual BVG transit data), and key highlights. Select one to carry it into the budget step.

**Cost Estimator & Budget Planner.** Ten budget category sliders, an SVG donut chart, five sanity checks (rent ratio, savings rate, emergency fund, total allocation, grocery budget), and an AI-generated seven-section narrative about your financial life in that district. The AI analysis runs through a Vercel serverless function (`api/analyze.ts`) which proxies to OpenRouter. When the API key isn't configured or the call fails, an in-frontend template engine generates all seven sections using real Bezirk-specific data. The app works fully without any AI key.

**Visa & Admin Checklist.** 19 items across four phases (pre-arrival through settling in), filtered by visa type (EU Blue Card, Freelance, Job Seeker). Each item links to the relevant government page and expands to show practical guidance. Progress persists to localStorage.

## Architecture

```
relocation-calculator/
├── frontend/          Angular 21 · TypeScript 5.9 · Tailwind 4
│   └── src/app/core/calculators/   ← tax, cost, budget logic (ported from Kotlin)
├── api/
│   └── analyze.ts     Vercel serverless function — OpenRouter proxy for AI analysis
├── shared/
│   └── api-contracts/
│       └── openapi.yaml   ← still authoritative for response shapes via openapi-typescript
└── attic/              archived Kotlin/Spring backend (see attic/README.md)
```

Originally a two-tier app (Angular frontend + Kotlin/Spring backend on Railway), it was consolidated into a single Vercel deployment in May 2026. All calculation logic — the 2026 Lohnsteuer algorithm, Bezirk cost estimation, budget allocation, and the template-based budget analyzer — now lives in `frontend/src/app/core/calculators/` and runs in the browser. The only server-side code that remains is `api/analyze.ts`, a thin Vercel serverless function that proxies to OpenRouter for AI-generated budget narratives.

The OpenAPI spec is still the single source of truth for response shapes. `openapi-typescript` generates TypeScript types at build time, so the in-frontend calculators conform to the same contracts the original API exposed.

State flows through a central `WizardService` backed by Angular Signals. A single `effect()` persists all wizard state to one `localStorage` key, so the entire wizard survives page reloads without a database.

## In-Frontend Calculators

What used to be REST endpoints are now in-process function calls. The OpenAPI spec at [`shared/api-contracts/openapi.yaml`](shared/api-contracts/openapi.yaml) still defines the response shapes — only the transport changed.

| Module | What it does |
|--------|--------------|
| `tax-calculator.ts` | Gross-to-net with full tax bracket breakdown |
| `cost-estimator.ts` | Rent, utilities, transport, groceries by Bezirk |
| `bezirk-data.ts` | All 12 Bezirk profiles + commute time ranges |
| `budget-allocator.ts` | Enrich budget percentages with EUR totals |
| `budget-analyzer.ts` | Template-based 7-section narrative |
| `api/analyze.ts` (Vercel function) | OpenRouter-powered AI narrative; falls back to the template above |

The archived Kotlin originals live under `attic/backend/` for portfolio reference.

## Running Locally

```bash
cd frontend
npm install
npm run generate:api
ng serve
```

Starts on port 4200. All calculation runs in the browser — no backend process is required. To exercise the AI analysis path locally, run `vercel dev` from the repo root after setting `OPENROUTER_API_KEY` in `.env.local`; otherwise the app falls through to the template engine.

### AI Analysis (optional)

Set `OPENROUTER_API_KEY` as a Vercel environment variable to enable AI-powered budget analysis. Without it, the template engine handles everything. The model defaults to `anthropic/claude-sonnet-4` and is configurable via `OPENROUTER_MODEL`.

## Deployment

Single-platform: Vercel deploys the Angular frontend as a static SPA and the `api/analyze.ts` serverless function in one project on every push to `main`. The original Railway backend is archived under `attic/` and is no longer deployed. (Historical URL `https://relocation-calculator-production.up.railway.app` is deprecated.)

## Notable Technical Choices

- **Contract-first types.** The OpenAPI spec generates the TypeScript types the frontend consumes. The same spec drove the original Kotlin backend (now archived under `attic/`); it is preserved so response shapes remain documented and codegen still runs at build time.
- **Signals over NgRx.** `WizardService` uses 10+ signals with a single `effect()` for persistence. RxJS is reserved for HTTP streams and form `valueChanges`.
- **SVG donut chart with zero dependencies.** Pure `<circle>` elements with `stroke-dasharray` math. OnPush-compatible, per-segment hover with CSS transitions.
- **Three-tier design token system.** System primitives (`--reloc-sys-*`) are raw values. Semantic references (`--reloc-ref-*`) remap between light/dark mode. Components only reference the semantic layer.
- **Template fallback for AI analysis.** The app is fully functional without an API key. The template engine uses Bezirk-specific tips, rent quartile positioning, BVG pass cost comparisons, and emergency fund calculations.
- **Commute time ranges, not single values.** Berlin districts are large. A single number was misleading, so the API exposes min/max based on actual transit data.

## Tech Stack

| | Technology | Version |
|---|---|---|
| Frontend | Angular | 21.2 |
| | TypeScript | 5.9 |
| | Tailwind CSS | 4.2 |
| Serverless | Vercel Function (`api/analyze.ts`) | Node 22 |
| Contracts | OpenAPI | 3.1 |
| AI | OpenRouter | Claude Haiku 3.5 (production) |
| Infra | Vercel | Static SPA + serverless function |
| Archived | Kotlin / Spring Boot 3.4 / JDK 21 | see [`attic/README.md`](attic/README.md) |
