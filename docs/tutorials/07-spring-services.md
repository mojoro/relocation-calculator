# Tutorial 07 — Spring Services & German Tax Logic

> **Goal:** Understand the Spring service layer pattern and the German tax domain logic that powers the salary calculator. By the end, you'll be able to trace a salary calculation from HTTP request through the four-zone progressive tax formula and back, explain Steuerklassen and Sozialversicherung clearly, and identify the Kotlin features that make the service code concise.

> **Prerequisites:** You've read [[tutorials/03-kotlin-spring-boot|Tutorial 03: Kotlin + Spring Boot]] (project structure, data classes, controllers). You know what an HTTP POST request is. You do not need prior knowledge of German taxes — this tutorial explains everything from scratch.

---

## What Is a Spring Service?

### The restaurant analogy

A Spring application has a clear division of labor. The **controller** is the waiter — it takes the customer's order (HTTP request), writes it down neatly (validates and deserializes), and hands it to the kitchen. The **service** is the chef — it does the actual work (business logic) and hands back the finished dish (response). The waiter doesn't know how to cook. The chef doesn't know which table the order came from.

This separation matters because:

- **Testability** — you can test the tax calculation without spinning up an HTTP server. Just instantiate `TaxCalculationService` and call `calculate()`.
- **Reusability** — if we later add a batch calculation endpoint or a GraphQL resolver, they call the same service. The business logic exists in one place.
- **Readability** — when you open `SalaryController.kt`, it's 10 lines. When you open `TaxCalculationService.kt`, it's pure domain logic. Neither file is cluttered with the other's concerns.

### The `@Service` annotation

Open `backend/src/main/kotlin/com/johnmoorman/relocation/service/TaxCalculationService.kt`. The class is annotated with `@Service`:

```kotlin
@Service
class TaxCalculationService {
    // ...
}
```

`@Service` tells Spring: "This is a component. Create a single instance (singleton) at startup and make it available for injection." Spring scans the classpath for annotations like `@Service`, `@Controller`, `@Repository`, and `@Component`, creates instances of each, and wires them together.

By default, Spring beans are **singletons** — one instance shared across the entire application. Every request that hits the salary endpoint uses the same `TaxCalculationService` instance. This is fine because our service is stateless — it takes input, computes, and returns output without storing anything between calls.

### Dependency injection in Spring (with Kotlin)

Look at how the controller uses the service:

```kotlin
@RestController
@RequestMapping("/api/v1")
class SalaryController(private val taxService: TaxCalculationService) {

    @PostMapping("/salary/calculate")
    fun calculateNetSalary(@Valid @RequestBody request: SalaryRequest): ResponseEntity<SalaryResponse> {
        val response = taxService.calculate(request)
        return ResponseEntity.ok(response)
    }
}
```

The constructor parameter `private val taxService: TaxCalculationService` is all it takes. Spring sees that `SalaryController` needs a `TaxCalculationService`, finds the singleton instance it already created, and passes it in. No `@Inject` annotation, no `@Autowired`, no factory class. Kotlin's concise constructor syntax makes DI invisible — you just declare what you need as a parameter, and Spring provides it.

**Angular comparison:** This is the same pattern as Angular's `inject()` function. In Angular, you write `private readonly taxService = inject(TaxCalculationService)`. In Spring Kotlin, you write `class SalaryController(private val taxService: TaxCalculationService)`. Different syntax, identical concept: declare a dependency, let the framework wire it. The Angular equivalent of `@Service` is `@Injectable({ providedIn: 'root' })`.

---

## TaxCalculationService Walkthrough

Let's trace a salary calculation end to end. A user enters a gross annual salary of 60,000 EUR, Tax Class I, no church tax, no children. Here's what happens inside the service.

### Step 1: Entry point

```kotlin
fun calculate(request: SalaryRequest): SalaryResponse {
    val grossAnnual = request.grossAnnual.toDouble()  // 60000.0
    val grossMonthly = grossAnnual / 12.0              // 5000.0
    // ...
}
```

The service receives a `SalaryRequest` (already validated by `@Valid` on the controller — see the [[tutorials/04-reactive-forms#Validation parity with the backend|Validation]] section below). It converts to `Double` for math operations and computes the monthly gross.

### Step 2: Taxable income

```kotlin
private fun calculateTaxableIncome(grossAnnual: Double, taxClass: TaxClass): Double {
    val allowance = when (taxClass) {
        TaxClass.I   -> GRUNDFREIBETRAG.toDouble()         // 12,348
        TaxClass.II  -> GRUNDFREIBETRAG + 4_260.0          // 16,608
        TaxClass.III -> GRUNDFREIBETRAG * 2.0              // 24,696
        TaxClass.IV  -> GRUNDFREIBETRAG.toDouble()         // 12,348
        TaxClass.V   -> 0.0                                // 0
        TaxClass.VI  -> 0.0                                // 0
    }
    return max(grossAnnual - allowance, 0.0)
}
```

**Kotlin feature: `when` expression.** Kotlin's `when` is a pattern-matching expression (not a statement). It returns a value, so you can assign the result directly to `val allowance`. The compiler enforces exhaustiveness — if you add a new `TaxClass` entry and forget to handle it in the `when`, the code won't compile. This is far safer than Java's `switch`, which falls through silently.

For our Tax Class I user with 60,000 EUR gross: `60000 - 12348 = 47,652 EUR` taxable income.

### Step 3: The four-zone progressive income tax

This is the heart of the German tax system. Unlike a flat tax (where everyone pays the same percentage), Germany uses a **progressive formula** with four zones. Each zone applies to a slice of your income, and higher slices are taxed at higher rates.

```kotlin
private fun calculateProgressiveTax(taxableIncome: Double): Double {
    // Zone 0: Tax-free (0 - 12,348 EUR) -> 0%
    if (taxableIncome <= GRUNDFREIBETRAG) return 0.0

    // Zone 1: First progression (12,097 - 17,443 EUR) -> 14% to 24%
    if (taxableIncome <= ZONE_1_END) {
        val y = (taxableIncome - GRUNDFREIBETRAG) / 10_000.0
        return (922.98 * y + 1_400.0) * y
    }

    // Zone 2: Second progression (17,444 - 68,480 EUR) -> 24% to 42%
    if (taxableIncome <= ZONE_2_END) {
        val z = (taxableIncome - ZONE_1_END) / 10_000.0
        return (181.19 * z + 2_397.0) * z + 966.53
    }

    // Zone 3: Flat 42% (68,481 - 277,825 EUR)
    if (taxableIncome <= ZONE_3_END) {
        return 0.42 * taxableIncome - 10_636.31
    }

    // Zone 4: Reichensteuer 45% (above 277,826 EUR)
    return 0.45 * taxableIncome - 18_971.06
}
```

For our user with 47,652 EUR taxable income, we fall into **Zone 2** (24%-42% progressive). The formula `(181.19 * z + 2_397.0) * z + 966.53` is a quadratic approximation of the smooth progressive curve. The variable `z` normalizes the income into the zone's range by dividing by 10,000.

The result: approximately 9,562 EUR annual income tax, or about 797 EUR per month.

**Why quadratic formulas, not brackets?** In the US/UK, tax brackets are simple: "the first $10,000 at 10%, the next $30,000 at 22%." Germany's system uses polynomial formulas published annually by the BMF (Federal Ministry of Finance) to create a smooth curve rather than discrete jumps. The constants `922.98`, `1_400.0`, `181.19`, `2_397.0`, and `966.53` come directly from the official 2025 tax formula in the Einkommensteuergesetz (EStG).

### Step 4: Social insurance contributions

```kotlin
val healthBase = min(grossMonthly, HEALTH_CEILING_ANNUAL / 12.0)   // min(5000, 5512.50)
val pensionBase = min(grossMonthly, PENSION_CEILING_ANNUAL / 12.0) // min(5000, 8050.00)

val monthlyHealth       = healthBase * HEALTH_INSURANCE_RATE       // 5000 * 0.0815 = 407.50
val monthlyPension      = pensionBase * PENSION_INSURANCE_RATE     // 5000 * 0.093  = 465.00
val monthlyUnemployment = pensionBase * UNEMPLOYMENT_INSURANCE_RATE // 5000 * 0.013 = 65.00
val monthlyNursing      = healthBase * nursingRate                 // 5000 * 0.023  = 115.00
```

Each insurance type has a **contribution ceiling** (Beitragsbemessungsgrenze). If you earn more than the ceiling, you only pay contributions on the ceiling amount. For 2025:

| Insurance | Employee Rate | Annual Ceiling | Monthly Ceiling |
|---|---|---|---|
| Health (Krankenversicherung) | 8.15% | 66,150 EUR | 5,512.50 EUR |
| Pension (Rentenversicherung) | 9.3% | 96,600 EUR | 8,050.00 EUR |
| Unemployment (Arbeitslosenversicherung) | 1.3% | 96,600 EUR | 8,050.00 EUR |
| Nursing Care (Pflegeversicherung) | 1.7%+ | 66,150 EUR | 5,512.50 EUR |

The nursing care rate varies based on children:

```kotlin
val nursingRate = if (!request.hasChildren || request.childCount == 0) {
    NURSING_CARE_BASE_RATE + NURSING_CARE_CHILDLESS_SURCHARGE  // 1.7% + 0.6% = 2.3%
} else {
    val childDiscount = min(request.childCount, 5) * 0.0025
    max(NURSING_CARE_BASE_RATE - childDiscount, 0.01)           // reduced for parents
}
```

Our childless user pays the surcharge: 2.3% instead of 1.7%.

### Step 5: Solidarity surcharge and church tax

```kotlin
private fun calculateSoli(annualIncomeTax: Double): Double {
    if (annualIncomeTax <= SOLI_THRESHOLD) return 0.0   // 18,130 EUR threshold
    return annualIncomeTax * SOLI_RATE                   // 5.5% of income tax
}
```

The Solidaritaetszuschlag (Soli) is 5.5% of your income tax, but only if your annual income tax exceeds 18,130 EUR. For our user with ~9,562 EUR annual income tax, no Soli is due. Most employees earning under ~75,000 EUR pay zero Soli.

Church tax is optional — 9% of income tax in Berlin, Bavaria, and Baden-Wuerttemberg (8% in some other German states):

```kotlin
val monthlyChurchTax = if (request.churchTax) {
    (annualIncomeTax * CHURCH_TAX_RATE) / 12.0   // 9% of income tax
} else null
```

**Kotlin feature: nullable types.** `churchTaxAmount` in the response is `Double?` — it's `null` when the user isn't a church member, not `0.0`. This distinction matters semantically: `null` means "not applicable," while `0.0` would mean "applicable but zero." On the TypeScript side, this maps to `number | null`.

### Step 6: Assembly

```kotlin
return SalaryResponse(
    grossMonthly = roundToTwoDecimals(grossMonthly),
    netMonthly = roundToTwoDecimals(netMonthly),
    incomeTax = roundToTwoDecimals(monthlyIncomeTax),
    solidaritySurcharge = roundToTwoDecimals(monthlySoli),
    healthInsurance = roundToTwoDecimals(monthlyHealth),
    pensionInsurance = roundToTwoDecimals(monthlyPension),
    unemploymentInsurance = roundToTwoDecimals(monthlyUnemployment),
    nursingCareInsurance = roundToTwoDecimals(monthlyNursing),
    churchTaxAmount = monthlyChurchTax?.let { roundToTwoDecimals(it) },
    totalDeductions = roundToTwoDecimals(totalDeductions)
)
```

**Kotlin feature: named arguments.** Every parameter is explicitly named at the call site. You can read this like a configuration file — no counting positional arguments, no "what's the 7th parameter again?" In Java, you'd need a Builder pattern for this readability. Kotlin gets it for free with data classes and named arguments.

**Kotlin feature: `?.let { }`** The safe call `monthlyChurchTax?.let { roundToTwoDecimals(it) }` means: "If `monthlyChurchTax` is not null, apply `roundToTwoDecimals` to it. If it's null, the whole expression is null." This is Kotlin's equivalent of optional chaining with a transformation — cleaner than `if (x != null) f(x) else null`.

---

## The `companion object` Pattern

All tax constants live in a `companion object`:

```kotlin
@Service
class TaxCalculationService {

    companion object {
        const val GRUNDFREIBETRAG = 12_348
        const val ZONE_1_START = 12_097
        const val HEALTH_INSURANCE_RATE = 0.0815
        // ...
    }

    fun calculate(request: SalaryRequest): SalaryResponse { ... }
}
```

A `companion object` in Kotlin is roughly equivalent to `static` members in Java or a module-level `const` in TypeScript. The constants belong to the class itself, not to any particular instance. You access them as `TaxCalculationService.GRUNDFREIBETRAG` from outside the class or just `GRUNDFREIBETRAG` from inside.

`const val` means the value is a compile-time constant — the compiler inlines it wherever it's used. This is only allowed for primitives (`Int`, `Double`, `String`, etc.), not for objects. The `_` separators in `12_348` are Kotlin's numeric separators — purely cosmetic, like commas in "12,348" — making large numbers readable.

---

## German Tax System Explained

This section is pure domain knowledge. Understanding it makes the code above self-evident.

### Steuerklassen (Tax Classes I-VI)

Every employee in Germany is assigned a tax class based on their personal situation. It determines how much income tax is withheld from each paycheck:

| Class | Who Gets It | Grundfreibetrag | Notes |
|---|---|---|---|
| I | Single, divorced, widowed | 12,348 EUR | The default |
| II | Single parents (Alleinerziehend) | 12,348 + 4,260 EUR | Extra allowance for raising kids alone |
| III | Married, higher earner | 12,348 x 2 EUR | Partner takes Class V |
| IV | Married, similar income | 12,348 EUR | Both partners use IV |
| V | Married, lower earner | 0 EUR | No allowance — partner gets double |
| VI | Secondary employment | 0 EUR | Second job, no allowances |

**Ehegattensplitting (Classes III/V):** Married couples can choose between two strategies. If both earn similar amounts, they each take Class IV (identical to Class I). If one earns significantly more, the higher earner takes Class III and the lower earner takes Class V. Class III doubles the tax-free allowance and applies Ehegattensplitting — the couple's combined income is split in half, taxed, and then doubled. Because the tax formula is progressive (higher income = higher rate), splitting a high income into two lower incomes results in a lower total tax. The code implements this:

```kotlin
val incomeForCalculation = if (taxClass == TaxClass.III) {
    taxableIncome / 2.0   // Split the income
} else {
    taxableIncome
}
val tax = calculateProgressiveTax(incomeForCalculation)
return if (taxClass == TaxClass.III) tax * 2.0 else tax  // Double the result
```

### Sozialversicherung: The Five Pillars

Germany's social insurance system is mandatory for employees. There are five branches, and both employee and employer pay roughly equal shares:

1. **Krankenversicherung** (Health Insurance) — covers doctor visits, hospital, medication. Employee pays ~8.15% (7.3% base + ~0.85% supplementary).
2. **Rentenversicherung** (Pension Insurance) — the state pension. Employee pays 9.3%. You'll need ~35 years of contributions for a decent pension.
3. **Arbeitslosenversicherung** (Unemployment Insurance) — pays ~60% of net salary if you lose your job. Employee pays 1.3%.
4. **Pflegeversicherung** (Nursing Care Insurance) — covers long-term care needs. Base rate 1.7%, with a 0.6% surcharge for childless adults over 23. Parents get a discount per child.
5. **Unfallversicherung** (Accident Insurance) — paid entirely by the employer, so we don't calculate it.

Together, the employee's share is roughly 20-21% of gross salary (up to the ceilings). Add income tax, and a typical German employee takes home 55-65% of their gross salary.

### Why Solidaritaetszuschlag Still Exists

The Soli was introduced in 1991 to fund German reunification — specifically, rebuilding infrastructure in the former East Germany. For 30+ years, every taxpayer paid 5.5% of their income tax as Soli. In 2021, it was effectively abolished for ~90% of taxpayers by raising the threshold to 18,130 EUR of annual income tax. Only high earners still pay it.

It still exists in the code (and in reality) because a small percentage of employees — those earning roughly above 75,000 EUR — still owe it. Removing it entirely would require a legislative change, which is politically complicated.

---

## CostEstimationService

Open `backend/src/main/kotlin/com/johnmoorman/relocation/service/CostEstimationService.kt`. This is a simpler service that demonstrates a different pattern: hardcoded reference data.

### The hardcoded data approach

```kotlin
private val rentPerSqm: Map<Bezirk, RentRange> = mapOf(
    Bezirk.MITTE to RentRange(14.0, 22.0, 17.5),
    Bezirk.FRIEDRICHSHAIN_KREUZBERG to RentRange(13.0, 20.0, 16.0),
    Bezirk.PANKOW to RentRange(11.0, 17.0, 13.5),
    // ... all 12 Berlin Bezirke
)
```

Why hardcoded instead of a database? Three reasons:

1. **Demo scope.** This is a portfolio project. Adding PostgreSQL, JPA entities, Flyway migrations, and a data seed script would triple the infrastructure complexity without teaching Angular/Spring integration — which is the actual point.
2. **The data changes slowly.** Berlin rent data is updated quarterly at most. Hardcoding 12 data points that change four times a year is a reasonable tradeoff.
3. **It's honest.** The README says the data is from 2024/2025 market reports. A database with the same hardcoded seed data would look more complex without being more correct.

### The Bezirk enum

```kotlin
enum class Bezirk(@JsonValue val slug: String, val displayName: String) {
    MITTE("mitte", "Mitte"),
    FRIEDRICHSHAIN_KREUZBERG("friedrichshain-kreuzberg", "Friedrichshain-Kreuzberg"),
    PANKOW("pankow", "Pankow"),
    // ...

    companion object {
        fun fromSlug(slug: String): Bezirk? =
            entries.find { it.slug == slug.lowercase() }
    }
}
```

**`@JsonValue` annotation.** When Jackson serializes a `Bezirk` to JSON, it uses the `slug` property instead of the enum name. So `Bezirk.FRIEDRICHSHAIN_KREUZBERG` serializes as `"friedrichshain-kreuzberg"`, not `"FRIEDRICHSHAIN_KREUZBERG"`. This matches the TypeScript side, where the frontend sends lowercase slugs in query parameters.

**`companion object` with factory method.** `Bezirk.fromSlug("pankow")` looks up a Bezirk by its slug. The return type is `Bezirk?` (nullable) because the slug might not match any district. The service handles this by throwing `IllegalArgumentException`, which the controller catches and returns as a 400 Bad Request.

**`coerceIn` extension function.** In the `estimateCosts` method:

```kotlin
val clampedRooms = rooms.coerceIn(1, 5)
```

Kotlin's `coerceIn` clamps a value to a range. If the user requests 0 rooms, it becomes 1. If they request 10, it becomes 5. This is a stdlib extension function on `Comparable` — no utility class needed. The equivalent in TypeScript would be `Math.min(Math.max(rooms, 1), 5)`.

---

## Validation with `@Valid`

### Jakarta Bean Validation

Look at `SalaryRequest.kt`:

```kotlin
data class SalaryRequest(
    @field:NotNull(message = "Gross annual salary is required")
    @field:Min(value = 0, message = "Salary must be non-negative")
    @field:Max(value = 10_000_000, message = "Salary exceeds maximum")
    val grossAnnual: Int,

    @field:NotNull(message = "Tax class is required")
    val taxClass: TaxClass,

    val churchTax: Boolean = false,
    val hasChildren: Boolean = false,

    @field:Min(value = 0, message = "Child count must be non-negative")
    val childCount: Int = 0
)
```

The `@field:` prefix is a Kotlin-specific syntax that tells the annotation to target the backing field rather than the constructor parameter. Without it, the validation annotations would be ignored because Jakarta Bean Validation inspects fields, not constructor parameters.

The controller triggers validation with `@Valid`:

```kotlin
@PostMapping("/salary/calculate")
fun calculateNetSalary(@Valid @RequestBody request: SalaryRequest): ResponseEntity<SalaryResponse> {
```

When Spring deserializes the JSON body into a `SalaryRequest`, it runs all the validation annotations. If any fail, Spring throws `MethodArgumentNotValidException` *before* the controller method body executes. The service never sees invalid data.

This is the backend safety net described in [[tutorials/04-reactive-forms#Validation parity with the backend|Tutorial 04]]. The frontend validates for instant feedback; the backend validates because you can never trust the client.

---

## Try It Yourself

### 1. Calculate with curl

With the backend running (`cd backend && ./gradlew bootRun`), try:

```bash
curl -s -X POST http://localhost:8080/api/v1/salary/calculate \
  -H "Content-Type: application/json" \
  -d '{"grossAnnual": 60000, "taxClass": "I", "churchTax": false, "hasChildren": false, "childCount": 0}' \
  | python3 -m json.tool
```

Try different tax classes. Compare Class I vs Class III to see how Ehegattensplitting reduces the tax.

### 2. Test validation

Send an invalid request:

```bash
curl -s -X POST http://localhost:8080/api/v1/salary/calculate \
  -H "Content-Type: application/json" \
  -d '{"grossAnnual": -5000, "taxClass": "I"}' -w "\nHTTP %{http_code}\n"
```

You should get a 400 Bad Request because `grossAnnual` is negative, violating `@Min(0)`.

### 3. Add a new tax constant

Add a `WERBUNGSKOSTEN_PAUSCHALE` (employee expense allowance) constant of 1,230 EUR to the companion object. Subtract it from the gross annual before calculating taxable income in `calculateTaxableIncome()`. This makes the calculation more accurate — every German employee gets this automatic deduction.

### 4. Query the cost API

```bash
curl -s "http://localhost:8080/api/v1/costs/estimate?bezirk=pankow&rooms=2" | python3 -m json.tool
curl -s "http://localhost:8080/api/v1/neighborhoods/friedrichshain-kreuzberg" | python3 -m json.tool
```

Compare rent ranges across districts. Notice how the response structure matches the TypeScript interfaces from [[tutorials/06-http-integration#The mirror pattern|Tutorial 06]].

---

## Key Takeaway

What this project demonstrates about backend service design:

- **On Spring services:** Business logic lives in `@Service` classes, never in controllers. Our `TaxCalculationService` is a pure function — it takes a request, computes the result, and returns it. The controller is a thin HTTP adapter. This makes the tax calculation testable without an HTTP server and reusable if we add a batch endpoint or GraphQL.

- **On real domain logic:** The German tax calculation uses the actual 2026 BMF progressive formula — four zones with polynomial coefficients, not simplified flat brackets. It handles Steuerklassen I through VI, Ehegattensplitting for Class III, all four social insurance contributions with their ceilings, and the Solidaritaetszuschlag threshold. This domain was chosen because John actually went through the Berlin relocation process — the Steuerklasse and Sozialversicherung logic is based on real experience.

- **On Kotlin features:** Kotlin's `when` expression with exhaustive enum matching means the compiler catches any unhandled tax class. `companion object` constants with numeric separators keep the tax parameters readable. Named arguments on the response constructor make it self-documenting. Nullable types like `Double?` for church tax distinguish 'not applicable' from 'zero' — which maps cleanly to TypeScript's `number | null`.

- **On validation:** We use Jakarta Bean Validation on Kotlin data classes with `@field:` annotations, triggered by `@Valid` on the controller. Every frontend validator has a backend counterpart — `Validators.min(0)` maps to `@Min(0)`. The frontend validates for UX; the backend validates for security. Neither trusts the other.

---

## See Also

- [[tutorials/03-kotlin-spring-boot]] — Kotlin and Spring Boot fundamentals
- [[tutorials/04-reactive-forms]] — frontend validation parity
- [[tutorials/06-http-integration]] — how the Angular frontend calls these services
- [[tutorials/08-cost-estimation]] — the cost estimation feature end-to-end
- [[dependency-injection]] — DI concepts shared between Angular and Spring
- [[kotlin]] — Kotlin language features used in this project
