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
berlin-relocation-planner/
├── frontend/                  # Angular 21 application
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/          # Singleton services, guards, interceptors
│   │   │   ├── shared/        # Shared components, pipes, directives
│   │   │   ├── features/
│   │   │   │   ├── salary-calculator/
│   │   │   │   ├── cost-estimator/
│   │   │   │   ├── neighborhood-explorer/
│   │   │   │   └── visa-checklist/
│   │   │   ├── app.component.ts
│   │   │   ├── app.config.ts
│   │   │   └── app.routes.ts
│   │   ├── styles/
│   │   │   └── tokens.css     # Design token system (--reloc-sys-*, --reloc-ref-*)
│   │   └── environments/
│   ├── angular.json
│   ├── tailwind.config.js
│   └── tsconfig.json
├── backend/                   # Kotlin + Spring Boot
│   ├── src/main/kotlin/
│   │   └── com/johnmoorman/relocation/
│   │       ├── RelocationApplication.kt
│   │       ├── controller/
│   │       │   ├── SalaryController.kt
│   │       │   └── CostController.kt
│   │       ├── service/
│   │       │   ├── TaxCalculationService.kt
│   │       │   └── CostEstimationService.kt
│   │       ├── model/
│   │       │   ├── SalaryRequest.kt
│   │       │   ├── SalaryResponse.kt
│   │       │   ├── CostEstimate.kt
│   │       │   └── Neighborhood.kt
│   │       └── config/
│   │           └── CorsConfig.kt
│   ├── build.gradle.kts
│   └── Dockerfile
├── shared/                    # Shared types (source of truth)
│   └── api-contracts/
│       ├── salary.ts          # TypeScript interfaces
│       └── salary.kt          # Kotlin data classes (mirrored)
├── docker-compose.yml
├── CLAUDE.md
└── README.md
```

### Frontend: Angular 21

**Every pattern below was extracted from Europace's Rechner source code. Match them precisely.**

#### Standalone Components (no NgModules)
```typescript
@Component({
  selector: 'reloc-salary-form',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './salary-form.component.html'
})
```

#### Component Naming Convention
Use `reloc-*` prefix for all selectors. This mirrors Europace's `baufi-passt-*` convention.
- `reloc-salary-form`
- `reloc-cost-breakdown`
- `reloc-neighborhood-card`
- `reloc-visa-checklist`
- `reloc-step-indicator`
- `reloc-currency-input` (shared)

#### Reactive Forms with FormGroup + Validators
The Rechner uses 88 Validators and 7 FormGroups. Forms are the core interaction pattern. Every user input must go through reactive forms.
```typescript
this.salaryForm = new FormGroup({
  grossSalary: new FormControl<number | null>(null, [
    Validators.required,
    Validators.min(0),
    Validators.max(500000)
  ]),
  taxClass: new FormControl<TaxClass>('I', Validators.required),
  churchTax: new FormControl<boolean>(false),
  hasChildren: new FormControl<boolean>(false),
  childCount: new FormControl<number>(0)
});
```

#### Signals for State Management
The Rechner uses Angular Signals (20 instances of `signal`, 4 `computed`, 1 `effect`). Use Signals as the primary state management pattern — NOT a separate state library, NOT BehaviorSubjects for UI state.
```typescript
readonly netSalary = signal<number | null>(null);
readonly isCalculating = signal(false);
readonly affordabilityRating = computed(() => {
  const net = this.netSalary();
  const rent = this.estimatedRent();
  if (!net || !rent) return null;
  return rent / net;
});
```

#### OnPush Change Detection
Use `ChangeDetectionStrategy.OnPush` on all feature components. The Rechner does this. It demonstrates performance awareness.

#### RxJS for Async Operations Only
The Rechner uses 133 pipe() calls but also uses Signals. The pattern: RxJS for HTTP calls and async streams, Signals for synchronous derived state. Use `toSignal()` to bridge.
```typescript
readonly salaryResult = toSignal(
  this.salaryForm.valueChanges.pipe(
    debounceTime(300),
    filter(() => this.salaryForm.valid),
    switchMap(val => this.salaryService.calculate(val))
  )
);
```

#### Injectable Services with HttpClient
At least two services that call the Kotlin backend:
- `SalaryCalculationService` — POST gross salary → get net salary breakdown
- `CostEstimationService` — GET neighborhood costs by Bezirk

#### Design Tokens (CSS Custom Properties)
The Rechner uses a three-tier token system: `--xp-sys-*` → `--xp-ref-*` → `--xp-comp-*`. Implement a simplified version:

```css
/* tokens.css */
:root {
  /* System primitives */
  --reloc-sys-color-teal-700: #22746b;
  --reloc-sys-color-neutral-900: #1e293e;
  --reloc-sys-color-neutral-50: #f9f9f9;
  --reloc-sys-font-family-display: 'Inter', sans-serif;
  --reloc-sys-font-family-content: 'Inter', sans-serif;
  --reloc-sys-spacing-4: 16px;
  --reloc-sys-spacing-6: 24px;
  --reloc-sys-radius-1: 0px;

  /* Semantic references */
  --reloc-ref-color-primary: var(--reloc-sys-color-teal-700);
  --reloc-ref-color-text-dark: var(--reloc-sys-color-neutral-900);
  --reloc-ref-color-bg-body: var(--reloc-sys-color-neutral-50);
}
```

This mirrors the Europace system and gives John a concrete talking point about design token architecture.

#### Tailwind CSS
Use Tailwind utilities alongside the token system, exactly as the Rechner does. Configure Tailwind to reference the CSS custom properties where it makes sense.

### Backend: Kotlin + Spring Boot

**Scope this tightly. Two controllers, two services, clean data classes.**

#### Kotlin Data Classes as API Contracts
```kotlin
data class SalaryRequest(
    val grossAnnual: Int,
    val taxClass: TaxClass,
    val churchTax: Boolean = false,
    val hasChildren: Boolean = false,
    val childCount: Int = 0
)

data class SalaryResponse(
    val grossMonthly: Double,
    val netMonthly: Double,
    val incomeTax: Double,
    val solidaritySurcharge: Double,
    val healthInsurance: Double,
    val pensionInsurance: Double,
    val unemploymentInsurance: Double,
    val nursingCareInsurance: Double,
    val churchTax: Double?,
    val totalDeductions: Double
)
```

#### German Tax Calculation
Implement actual (simplified) German income tax brackets for 2025/2026. This is the domain authority play — John knows these numbers from personal experience. The calculation doesn't need to be BMF-certified, but it should be directionally accurate and demonstrate understanding of Steuerklassen, Sozialversicherung, Solidaritätszuschlag, and Kirchensteuer.

#### REST Controllers
```kotlin
@RestController
@RequestMapping("/api/v1")
class SalaryController(private val taxService: TaxCalculationService) {

    @PostMapping("/salary/calculate")
    fun calculateNetSalary(@Valid @RequestBody request: SalaryRequest): SalaryResponse {
        return taxService.calculate(request)
    }
}
```

#### CORS Configuration
Configure for local dev (Angular on 4200, Spring Boot on 8080) and for deployed environment.

### Integration Layer (THE KEY DIFFERENTIATOR)

This is what Martin said they're hiring for. The integration between frontend and backend must be visibly well-engineered:

1. **Typed API contracts** — TypeScript interfaces in `shared/api-contracts/` that mirror Kotlin data classes exactly. Mention this mirroring pattern in the interview.
2. **Error handling** — Angular interceptor that catches HTTP errors and surfaces them as typed error states (not just console.error).
3. **Loading states** — Every API call should have explicit loading/success/error states visible in the UI via Signals.
4. **Validation parity** — Frontend form validators should match backend validation. If the backend rejects `grossAnnual < 0`, the frontend should prevent it from being sent.

### Deployment

- **Frontend**: Static build → Vercel or Cloudflare Pages (what John already uses)
- **Backend**: Docker container → Railway or Render free tier
- Both must be live with working URLs before the interview

---

## Multi-Step Wizard Flow

The app is a 4-step wizard (mirrors the Rechner's multi-step flow):

### Step 1: Salary Input
- Gross annual salary (EUR input with formatting)
- Tax class selection (I–VI radio buttons)
- Church tax toggle
- Children count (conditional on toggle)
- **→ Calls POST /api/v1/salary/calculate**
- Shows net monthly salary breakdown with all deductions itemized

### Step 2: Cost Estimation
- Select Bezirk(e) of interest (multi-select or clickable map)
- Shows estimated rent ranges by apartment size
- Shows monthly cost breakdown: rent, utilities (Nebenkosten), health insurance, transport (BVG), groceries
- Comparison view: net salary vs. total estimated costs
- **→ Calls GET /api/v1/costs/estimate?bezirk=kreuzberg&rooms=2**

### Step 3: Neighborhood Explorer
- Cards for each selected Bezirk with character descriptions
- Commute times, average rent, vibe description
- Data from a static JSON or Sanity CMS (stretch goal)

### Step 4: Visa & Admin Checklist
- Interactive checklist based on visa type (EU Blue Card, Freelance, Job Seeker)
- Anmeldung steps, Ausländerbehörde timeline, bank account, health insurance
- Checkbox completion state (Signals, local — no backend needed)

---

## Non-Negotiable Technical Checklist

Before considering the project shippable, verify ALL of these:

- [ ] Angular 21 with standalone components (zero NgModules)
- [ ] At least 5 components using `reloc-*` selector prefix
- [ ] Reactive forms with FormGroup and Validators on Step 1 and Step 2
- [ ] At least 2 injectable services using HttpClient
- [ ] Signals used for state (not just RxJS BehaviorSubjects)
- [ ] OnPush change detection on feature components
- [ ] CSS custom property token system (`--reloc-sys-*`, `--reloc-ref-*`)
- [ ] Tailwind CSS for utility classes
- [ ] Kotlin Spring Boot backend with at least 1 working POST endpoint
- [ ] Kotlin data classes mirroring TypeScript interfaces
- [ ] Docker setup for backend
- [ ] Loading/error states on all API calls
- [ ] Deployed frontend URL
- [ ] Deployed backend URL
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

## Build Order

Execute in this sequence. Each phase should be a clean stopping point.

### Phase 1: Scaffold + Salary Calculator (MVP)
1. `ng new` with Angular 21, standalone, Tailwind
2. Token CSS file
3. Salary form component with reactive forms
4. Kotlin Spring Boot project with salary endpoint
5. Wire frontend to backend, show net salary breakdown
6. Deploy both

### Phase 2: Cost Estimator + Polish
7. Cost estimation endpoint (can use hardcoded Berlin Bezirk data)
8. Step 2 UI with Bezirk selection and cost breakdown
9. Step indicator component
10. Loading/error states

### Phase 3: Content + Checklist
11. Neighborhood explorer (static data, cards)
12. Visa checklist (interactive, Signals-driven)
13. README
14. Final deploy verification

---

## Tech Versions

- Angular: 21 (current active release — Europace's Rechner runs 20 which just entered LTS)
- TypeScript: 5.x (whatever Angular 21 ships with)
- Tailwind CSS: 4.x
- Kotlin: 2.x
- Spring Boot: 3.x
- JDK: 21
- Node: 22 LTS
