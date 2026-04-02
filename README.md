# Berlin Relocation Planner

A four-step wizard for people considering a move to Berlin. Enter your salary, explore neighborhoods, plan your monthly budget with AI-powered analysis, and track the visa and admin process with an interactive checklist.

I built this as part of my [10-in-10 challenge](https://johnmoorman.com) (10 projects in 10 weeks). The motivation was twofold: I wanted real experience with Angular and Kotlin, and having gone through the Berlin relocation process myself, I wanted to build something genuinely useful for the people who keep asking me how it all works.

**[Live App](https://relocation-calculator.vercel.app)** · **[Blog Post](https://johnmoorman.com/blog/relocation-calculator)**

## What It Does

**Salary Calculator.** Enter your gross annual salary, tax class, age, church tax preference, and number of children. The backend runs the 2026 German Lohnsteuer algorithm and returns a complete breakdown with every deduction explained. For a EUR 60,000 gross salary, the calculator is accurate to within EUR 0.04/month compared to the [official BMF calculator](https://bmf-steuerrechner.de/). The source was the BMF's own XML specification of the algorithm.

**Neighborhood Explorer.** All twelve Berlin Bezirke in a grid with culture descriptions, commute time ranges to Mitte (min/max based on actual BVG transit data), and key highlights. Select one to carry it into the budget step.

**Cost Estimator & Budget Planner.** Ten budget category sliders, an SVG donut chart, five sanity checks (rent ratio, savings rate, emergency fund, total allocation, grocery budget), and an AI-generated seven-section narrative about your financial life in that district. The AI analysis runs through OpenRouter. When the API key isn't configured or the call fails, a 555-line template engine generates all seven sections using real Bezirk-specific data. The app works fully without any AI key.

**Visa & Admin Checklist.** 19 items across four phases (pre-arrival through settling in), filtered by visa type (EU Blue Card, Freelance, Job Seeker). Each item links to the relevant government page and expands to show practical guidance. Progress persists to localStorage.

## Architecture

```
relocation-calculator/
├── frontend/          Angular 21 · TypeScript 5.9 · Tailwind 4
├── backend/           Kotlin 2.1 · Spring Boot 3.4 · JDK 21
└── shared/
    └── api-contracts/
        └── openapi.yaml   ← single source of truth for all API types
```

The OpenAPI spec drives both sides. Gradle generates Kotlin data classes at compile time. `openapi-typescript` generates TypeScript types at build time. If the spec changes and either side doesn't account for it, compilation fails. Type mismatches are caught at build time, never at runtime.

State flows through a central `WizardService` backed by Angular Signals. A single `effect()` persists all wizard state to one `localStorage` key, so the entire wizard survives page reloads without a database.

## API Endpoints

All prefixed with `/api/v1`. Full schemas in [`shared/api-contracts/openapi.yaml`](shared/api-contracts/openapi.yaml).

| Method | Endpoint | What it does |
|--------|----------|--------------|
| `POST` | `/salary/calculate` | Gross-to-net with full tax bracket breakdown |
| `GET` | `/costs/estimate` | Rent, utilities, transport, groceries by Bezirk |
| `POST` | `/costs/allocate` | Enrich budget percentages with EUR totals |
| `POST` | `/costs/analyze` | 7-section budget narrative (AI or template) |
| `GET` | `/neighborhoods` | All 12 Bezirk profiles |
| `GET` | `/neighborhoods/{bezirk}` | Single Bezirk profile |

## Running Locally

### Docker Compose (simplest)

```bash
docker-compose up
```

Frontend at `localhost:4200`, backend at `localhost:8080`.

### Manual

**Backend:**

```bash
cd backend
./gradlew bootRun
```

Starts on port 8080. OpenAPI models generate automatically during compilation.

**Frontend:**

```bash
cd frontend
npm install
npm run generate:api
ng serve
```

Starts on port 4200. API calls go to `localhost:8080`.

### AI Analysis (optional)

Set `OPENROUTER_API_KEY` as an environment variable to enable AI-powered budget analysis. Without it, the template engine handles everything. The model defaults to `anthropic/claude-sonnet-4` and is configurable via `OPENROUTER_MODEL`.

## Deployment

| Layer | Platform | Trigger |
|-------|----------|---------|
| Frontend | Vercel | Push to `main` |
| Backend | Railway | Push to `main` (Docker build, watches `backend/**` and `shared/**`) |

CORS on the backend allows `*.vercel.app` origins. The frontend reads the backend URL from `frontend/src/environments/environment.prod.ts`.

## Notable Technical Choices

- **Contract-first API development.** Both sides generate types from one OpenAPI spec. No manual type mirroring.
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
| Backend | Kotlin | 2.1 |
| | Spring Boot | 3.4 |
| | JDK | 21 |
| Contracts | OpenAPI | 3.1 |
| AI | OpenRouter | Claude Haiku 3.5 (production) |
| Infra | Vercel + Railway | Frontend + Backend |
