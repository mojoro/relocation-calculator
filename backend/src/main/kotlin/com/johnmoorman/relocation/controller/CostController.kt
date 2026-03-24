package com.johnmoorman.relocation.controller

import com.johnmoorman.relocation.model.CostEstimate
import com.johnmoorman.relocation.model.NeighborhoodProfile
import com.johnmoorman.relocation.service.CostEstimationService
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

/**
 * REST controller for cost estimation and neighborhood data.
 *
 * Endpoints:
 * - GET /api/v1/costs/estimate?bezirk=...&rooms=...
 * - GET /api/v1/neighborhoods
 * - GET /api/v1/neighborhoods/{bezirk}
 */
@RestController
@RequestMapping("/api/v1")
class CostController(private val costService: CostEstimationService) {

    @GetMapping("/costs/estimate")
    fun estimateCosts(
        @RequestParam bezirk: String,
        @RequestParam(defaultValue = "2") rooms: Int
    ): ResponseEntity<CostEstimate> {
        return try {
            val estimate = costService.estimateCosts(bezirk, rooms)
            ResponseEntity.ok(estimate)
        } catch (e: IllegalArgumentException) {
            ResponseEntity.badRequest().build()
        }
    }

    @GetMapping("/neighborhoods")
    fun getAllNeighborhoods(): ResponseEntity<List<NeighborhoodProfile>> {
        return ResponseEntity.ok(costService.getAllProfiles())
    }

    @GetMapping("/neighborhoods/{bezirk}")
    fun getNeighborhood(@PathVariable bezirk: String): ResponseEntity<NeighborhoodProfile> {
        return try {
            val profile = costService.getNeighborhoodProfile(bezirk)
            ResponseEntity.ok(profile)
        } catch (e: IllegalArgumentException) {
            ResponseEntity.notFound().build()
        }
    }
}
