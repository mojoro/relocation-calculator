/**
 * Salary API Contracts (Kotlin Mirror)
 *
 * These Kotlin data classes mirror the TypeScript interfaces in salary.ts.
 * They serve as a reference for maintaining type parity between frontend
 * and backend. The actual backend data classes live in the backend module —
 * this file exists for documentation and contract visibility.
 *
 * @see salary.ts for the TypeScript source of truth
 */
package contracts

/** German tax classes (Steuerklassen) */
enum class TaxClass {
    I, II, III, IV, V, VI
}

/** Request body for POST /api/v1/salary/calculate */
data class SalaryRequest(
    val grossAnnual: Int,
    val taxClass: TaxClass,
    val churchTax: Boolean = false,
    val hasChildren: Boolean = false,
    val childCount: Int = 0,
    val respondentAge: Int = 18
)

/** Response from POST /api/v1/salary/calculate */
data class SalaryResponse(
    val grossMonthly: Double,
    val netMonthly: Double,
    val incomeTax: Double,
    val solidaritySurcharge: Double,
    val healthInsurance: Double,
    val pensionInsurance: Double,
    val unemploymentInsurance: Double,
    val nursingCareInsurance: Double,
    val churchTaxAmount: Double?,
    val totalDeductions: Double
)

/** Error response from the API */
data class ApiError(
    val status: Int,
    val message: String,
    val timestamp: String
)
