package com.johnmoorman.relocation.model

import jakarta.validation.constraints.Max
import jakarta.validation.constraints.Min
import jakarta.validation.constraints.NotNull

/**
 * Request body for POST /api/v1/salary/calculate.
 * Mirrors the TypeScript interface in shared/api-contracts/salary.ts.
 */
data class SalaryRequest(
    @field:NotNull(message = "Gross annual salary is required")
    @field:Min(value = 1, message = "Salary must be at least 1")
    @field:Max(value = 10_000_000, message = "Salary seems unrealistically high")
    val grossAnnual: Int?,

    @field:NotNull(message = "Tax class is required")
    val taxClass: TaxClass?,

    val churchTax: Boolean = false,
    val hasChildren: Boolean = false,

    @field:Min(value = 0, message = "Child count must be non-negative")
    val childCount: Int = 0
)
