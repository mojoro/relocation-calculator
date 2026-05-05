package com.johnmoorman.relocation.controller

import com.johnmoorman.relocation.model.SalaryRequest
import com.johnmoorman.relocation.model.SalaryResponse
import com.johnmoorman.relocation.service.TaxCalculationService
import jakarta.validation.Valid
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

/**
 * REST controller for salary calculations.
 *
 * Endpoint: POST /api/v1/salary/calculate
 * Accepts a SalaryRequest and returns a detailed SalaryResponse
 * with monthly net salary and all deduction breakdowns.
 */
@RestController
@RequestMapping("/api/v1")
class SalaryController(private val taxService: TaxCalculationService) {

    @PostMapping("/salary/calculate")
    fun calculateNetSalary(
        @Valid @RequestBody request: SalaryRequest
    ): ResponseEntity<SalaryResponse> {
        val response = taxService.calculate(request)
        return ResponseEntity.ok(response)
    }
}
