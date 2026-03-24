package com.johnmoorman.relocation.model

/**
 * Monthly cost breakdown for a neighborhood.
 * Mirrors shared/api-contracts/costs.ts CostEstimate interface.
 */
data class RentRange(
    val min: Double,
    val max: Double,
    val median: Double
)

data class CostEstimate(
    val bezirk: Bezirk,
    val displayName: String,
    val rooms: Int,
    val rentRange: RentRange,
    val utilities: Double,
    val transport: Double,
    val groceries: Double,
    val totalEstimated: Double
)
