package com.johnmoorman.relocation.model

/**
 * Neighborhood profile for the explorer view.
 * Mirrors shared/api-contracts/costs.ts NeighborhoodProfile interface.
 */
data class NeighborhoodProfile(
    val bezirk: Bezirk,
    val displayName: String,
    val vibe: String,
    val commuteMinutes: Int,
    val highlights: List<String>
)
