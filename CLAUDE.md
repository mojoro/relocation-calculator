# CLAUDE.md — Berlin Relocation Cost Planner

## Operating Mode

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

**Portfolio piece for Europace AG interview.** John Moorman is interviewing for a frontend engineer role on the #passt product team. The product is a white-label mortgage financing calculator (Rechner) built in Angular with a Java/Kotlin microservices backend. Martin (PM) specifically said they want someone who **understands the backend well and can potentially own the frontend-backend integration.**

This project must demonstrate:
1. Angular proficiency using the same patterns Europace uses (verified via source code analysis)
2. Kotlin/Spring Boot backend competence — at least one real API service
3. Clean integration layer between frontend and backend (typed contracts, error handling, loading states)
4. Domain authority — John actually relocated to Berlin, so this topic is authentic

**Ship deadline: Before engineering team interview (date TBD, likely this week or next).**

---

## Architecture

### Monorepo Structure

```
relocation-calculator/
├── frontend/                  # Angular 21.2 application
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/          # Services, models, interceptors, generated API types
│   │   │   ├── shared/        # Reusable components (currency-input, step-indicator) and pipes
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
│   │       ├── environment.ts            # Dev: localhost:8080
│   │       └── environment.prod.ts       # Prod: Railway URL
│   ├── angular.json
│   ├── .postcssrc.json        # Tailwind 4.2 via PostCSS
│   ├── Dockerfile             # Node 22 -> Nginx multi-stage
│   ├── nginx.conf             # SPA routing + API proxy
│   └── tsconfig.json
├── backend/                   # Kotlin 2.1.10 + Spring Boot 3.4.4
│   ├── src/main/kotlin/com/johnmoorman/relocation/
│   │   ├── RelocationApplication.kt
│   │   ├── controller/
│   │   │   ├── SalaryController.kt       # POST /salary/calculate
│   │   │   ├── CostController.kt         # GET /costs/estimate, /neighborhoods
│   │   │   └── BudgetController.kt       # POST /costs/allocate, /costs/analyze
│   │   ├── service/
│   │   │   ├── TaxCalculationService.kt  # 2026 German Lohnsteuer algorithm
│   │   │   ├── CostEstimationService.kt  # Berlin Bezirk rent data + profiles
│   │   │   ├── BudgetService.kt          # Allocation enrichment + template analysis
│   │   │   └── AiAnalysisService.kt      # OpenRouter-powered narrative (optional)
│   │   ├── model/
│   │   │   └── BezirkExtensions.kt       # Enum helpers (generated models in build/)
│   │   └── config/
│   │       ├── CorsConfig.kt
│   │       └── GlobalExceptionHandler.kt
│   ├── build.gradle.kts       # OpenAPI code generation + Spring Boot
│   └── Dockerfile             # Gradle 8.13 JDK 21 -> Alpine JRE multi-stage
├── shared/
│   └── api-contracts/
│       └── openapi.yaml       # Single source of truth for all API contracts
├── docker-compose.yml         # Local dev: backend:8080 + frontend:4200
├── vercel.json                # Frontend deployment config
├── railway.toml               # Backend deployment config
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
| MarkdownPipe | `markdown` | `shared/pipes/` — lightweight md->HTML for AI analysis body text |

### Backend API

**Endpoints:**
- `POST /api/v1/salary/calculate` — SalaryRequest -> SalaryResponse (full tax breakdown)
- `GET /api/v1/costs/estimate?bezirk=...&rooms=...` -> CostEstimate
- `GET /api/v1/neighborhoods` -> NeighborhoodProfile[]
- `GET /api/v1/neighborhoods/{bezirk}` -> NeighborhoodProfile
- `POST /api/v1/costs/allocate` -> BudgetAllocation (enriched percentages with EUR totals)
- `POST /api/v1/costs/analyze` -> BudgetAnalysis (7-section narrative, AI or template)

**Tax Calculation (TaxCalculationService):**
- 5-zone progressive income tax (Grundfreibetrag 12,348 EUR -> 45% Reichensteuer)
- Vorsorgepauschale deduction
- Social insurance: health, pension, unemployment, nursing care
- Solidarity surcharge (5.5% above 20,350 EUR threshold)
- Church tax (Berlin: 9% of income tax)
- Ehegattensplitting for tax class III
- Childless nursing care surcharge

**AI Analysis (AiAnalysisService):**
- Optional — requires `OPENROUTER_API_KEY` env var
- Model configurable via `OPENROUTER_MODEL` (default: `anthropic/claude-sonnet-4`)
- Graceful fallback to template-based analysis when key is absent or API fails
- Config in `application.yml` under `openrouter.*`

### API Contract System

Contract-first development via OpenAPI:
- Single source of truth: `shared/api-contracts/openapi.yaml`
- Backend: Gradle `openApiGenerate` task -> generates Kotlin models to `build/generated/openapi/`
- Frontend: `npm run generate:api` -> generates TypeScript types to `core/api/generated-types.ts`
- Both consume the same spec — type mismatches are caught at generation time

### Integration Layer (THE KEY DIFFERENTIATOR)

The integration between frontend and backend is the primary interview talking point:

1. **Typed API contracts** — OpenAPI spec in `shared/api-contracts/` generates both TypeScript types and Kotlin models. No manual mirroring.
2. **Error handling** — Angular interceptor (`error.interceptor.ts`) catches HTTP errors and surfaces them as typed error states, not console.error.
3. **Loading states** — Every API call has explicit loading/success/error states visible in the UI via Signals.
4. **Validation parity** — Frontend form validators match backend validation. If the backend rejects `grossAnnual < 0`, the frontend prevents it from being sent.

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
- Dark mode support via `[data-theme='dark']` overrides
- Mirrors Europace's `--xp-sys-*` -> `--xp-ref-*` -> `--xp-comp-*` architecture

---

## Wizard Flow

The app is a 4-step wizard (mirrors the Rechner's multi-step flow):

1. **Salary Calculator** — Gross salary, tax class, age, children, church tax -> `POST /api/v1/salary/calculate` -> net monthly breakdown with all deductions itemized
2. **Neighborhood Explorer** — Grid of 12 Berlin Bezirke with profiles, commute times, rent ranges, vibe -> `GET /api/v1/neighborhoods` (+ static fallback)
3. **Cost Estimator** — Bezirk/room selection, rent estimates, budget sliders, lifestyle spending, sanity check with AI analysis -> `GET /api/v1/costs/estimate`, `POST /costs/allocate`, `POST /costs/analyze`
4. **Visa Checklist** — Visa type selector (EU Blue Card, Freelance, Job Seeker) + interactive admin checklist (Anmeldung, Auslanderbehorde, bank, insurance) -> pure frontend, Signals-driven

---

## Deployment

- **Frontend:** Vercel — auto-deploys on push to main, SPA routing via `vercel.json`
- **Backend:** Railway — Docker-based, watches `backend/**` and `shared/**`
- **Local dev:** `docker-compose up` or individual `ng serve` + `gradle bootRun`
- Dev: `http://localhost:4200` (frontend), `http://localhost:8080` (backend)
- Prod: Railway URL configured in `frontend/src/environments/environment.prod.ts`

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
- [ ] README with architecture explanation

---

## What NOT to Build

- No auth system
- No database (all calculation is stateless)
- No SSR (static deploy is fine, mirrors Rechner's S3+CloudFront)
- No complex CI/CD (GitHub Actions is fine but not required for v1)
- No testing framework setup beyond maybe one example test
- No CMS integration in v1 (Sanity is a stretch goal only)
- No i18n (German-only content is fine, English UI is fine)

---

## Interview Talking Points This Project Enables

When discussing this project with Europace's engineering team, John should be able to say:

1. "I studied the Rechner's source — standalone components, reactive forms with Validators, Signals, OnPush, and the `--xp-*` token system bridging into MD3. I matched those patterns in my project."
2. "The Kotlin backend is simple but the integration is deliberate — typed contracts mirrored between TypeScript and Kotlin, an error interceptor, and explicit loading states on every API call."
3. "I chose German tax calculation as the domain because I actually went through this process when I relocated to Berlin. The Steuerklasse and Sozialversicherung logic is real."
4. "The multi-step wizard structure parallels the Rechner's flow — progressive data collection with real-time calculation at each step."

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

- Root `README.md` with architecture explanation (currently missing)
- Sanity CMS integration for neighborhood data
- Example unit tests for tax calculation service and salary form
- i18n support (German UI option)
