package com.johnmoorman.relocation.model

/**
 * Response from POST /api/v1/salary/calculate.
 * All values are monthly amounts in EUR.
 * Mirrors the TypeScript interface in shared/api-contracts/salary.ts.
 */
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
