package com.johnmoorman.relocation.controller

import com.johnmoorman.relocation.model.AnalysisContext
import com.johnmoorman.relocation.model.BudgetAllocation
import com.johnmoorman.relocation.model.BudgetAllocationRequest
import com.johnmoorman.relocation.model.BudgetAnalysis
import com.johnmoorman.relocation.service.BudgetService
import jakarta.validation.Valid
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

/**
 * REST controller for budget allocation and analysis.
 *
 * Endpoints:
 * - POST /api/v1/costs/allocate — enrich category percentages with EUR totals and recommended states
 * - POST /api/v1/costs/analyze — generate a structured narrative analysis of the full budget
 */
@RestController
@RequestMapping("/api/v1")
class BudgetController(private val budgetService: BudgetService) {

    @PostMapping("/costs/allocate")
    fun allocateBudget(
        @Valid @RequestBody request: BudgetAllocationRequest
    ): ResponseEntity<*> {
        return try {
            val allocation = budgetService.allocateBudget(request)
            ResponseEntity.ok(allocation)
        } catch (e: IllegalArgumentException) {
            ResponseEntity.badRequest().body(mapOf("error" to "Invalid allocation request: ${e.message}"))
        }
    }

    @PostMapping("/costs/analyze")
    fun analyzeBudget(
        @Valid @RequestBody context: AnalysisContext
    ): ResponseEntity<*> {
        return try {
            val analysis = budgetService.analyzeBudget(context)
            ResponseEntity.ok(analysis)
        } catch (e: IllegalArgumentException) {
            ResponseEntity.badRequest().body(mapOf("error" to "Invalid analysis context: ${e.message}"))
        }
    }
}
