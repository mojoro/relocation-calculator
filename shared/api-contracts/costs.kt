/**
 * Cost Estimation API Contracts (Kotlin Mirror)
 *
 * Mirror of the TypeScript interfaces in costs.ts.
 * The actual backend data classes live in the backend module.
 *
 * @see costs.ts for the TypeScript source of truth
 */
package contracts

/** Berlin districts (Bezirke) */
enum class Bezirk(val displayName: String) {
    MITTE("Mitte"),
    FRIEDRICHSHAIN_KREUZBERG("Friedrichshain-Kreuzberg"),
    PANKOW("Pankow"),
    CHARLOTTENBURG_WILMERSDORF("Charlottenburg-Wilmersdorf"),
    SPANDAU("Spandau"),
    STEGLITZ_ZEHLENDORF("Steglitz-Zehlendorf"),
    TEMPELHOF_SCHOENEBERG("Tempelhof-Schöneberg"),
    NEUKOELLN("Neukölln"),
    TREPTOW_KOEPENICK("Treptow-Köpenick"),
    MARZAHN_HELLERSDORF("Marzahn-Hellersdorf"),
    LICHTENBERG("Lichtenberg"),
    REINICKENDORF("Reinickendorf")
}

/** Rent range in EUR/month */
data class RentRange(
    val min: Double,
    val max: Double,
    val median: Double
)

/** Monthly cost breakdown for a neighborhood */
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

/** Neighborhood profile for the explorer view */
data class NeighborhoodProfile(
    val bezirk: Bezirk,
    val displayName: String,
    val vibe: String,
    val commuteMinutes: Int,
    val highlights: List<String>
)
