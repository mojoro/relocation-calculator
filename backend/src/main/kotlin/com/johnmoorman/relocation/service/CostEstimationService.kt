package com.johnmoorman.relocation.service

import com.johnmoorman.relocation.model.*
import org.springframework.stereotype.Service

/**
 * Provides living cost estimates for Berlin neighborhoods.
 *
 * Data is hardcoded but based on real 2024/2025 Berlin rental market data
 * from sources like Immobilienscout24, Wohnungsboerse, and Berlin Senate reports.
 * Rent figures represent Kaltmiete (cold rent, excluding utilities).
 */
@Service
class CostEstimationService {

    companion object {
        /** Monthly BVG AB-zone pass (2025) */
        const val BVG_MONTHLY = 58.0

        /** Estimated monthly groceries for a single person */
        const val GROCERIES_SINGLE = 300.0

        /** Nebenkosten per sqm per month (average) */
        const val NEBENKOSTEN_PER_SQM = 3.50

        /** Average apartment sizes by room count */
        val AVG_SQM_BY_ROOMS = mapOf(
            1 to 35.0,
            2 to 55.0,
            3 to 80.0,
            4 to 105.0,
            5 to 130.0
        )
    }

    /**
     * Base rent data per sqm by Bezirk (Kaltmiete, EUR/sqm/month).
     * Ranges: min = lower quartile, max = upper quartile, median.
     */
    private val rentPerSqm: Map<Bezirk, RentRange> = mapOf(
        Bezirk.MITTE to RentRange(14.0, 22.0, 17.5),
        Bezirk.FRIEDRICHSHAIN_KREUZBERG to RentRange(13.0, 20.0, 16.0),
        Bezirk.PANKOW to RentRange(11.0, 17.0, 13.5),
        Bezirk.CHARLOTTENBURG_WILMERSDORF to RentRange(12.5, 20.0, 15.5),
        Bezirk.SPANDAU to RentRange(8.5, 13.0, 10.5),
        Bezirk.STEGLITZ_ZEHLENDORF to RentRange(10.0, 16.0, 12.5),
        Bezirk.TEMPELHOF_SCHOENEBERG to RentRange(11.0, 17.5, 14.0),
        Bezirk.NEUKOELLN to RentRange(10.5, 16.5, 13.0),
        Bezirk.TREPTOW_KOEPENICK to RentRange(10.0, 15.5, 12.0),
        Bezirk.MARZAHN_HELLERSDORF to RentRange(7.5, 11.5, 9.5),
        Bezirk.LICHTENBERG to RentRange(9.0, 14.0, 11.0),
        Bezirk.REINICKENDORF to RentRange(8.5, 13.5, 10.5)
    )

    /** Neighborhood profiles with character descriptions */
    private val profiles: Map<Bezirk, NeighborhoodProfile> = mapOf(
        Bezirk.MITTE to NeighborhoodProfile(
            bezirk = Bezirk.MITTE,
            displayName = "Mitte",
            vibe = "The historic and governmental heart of Berlin. Tourist-heavy but culturally rich.",
            commuteMinutes = 0,
            highlights = listOf(
                "Museum Island & Brandenburg Gate",
                "Excellent transit connections (U/S-Bahn hub)",
                "International dining scene",
                "High density of coworking spaces",
                "Expensive but central"
            )
        ),
        Bezirk.FRIEDRICHSHAIN_KREUZBERG to NeighborhoodProfile(
            bezirk = Bezirk.FRIEDRICHSHAIN_KREUZBERG,
            displayName = "Friedrichshain-Kreuzberg",
            vibe = "Berlin's creative and nightlife epicenter. Diverse, vibrant, sometimes chaotic.",
            commuteMinutes = 6,
            highlights = listOf(
                "Best nightlife in Berlin (Berghain, RAW area)",
                "Multicultural food scene (Turkish Market, Markthalle Neun)",
                "Strong startup and tech community",
                "Beautiful Landwehrkanal for walks",
                "Highly competitive rental market"
            )
        ),
        Bezirk.PANKOW to NeighborhoodProfile(
            bezirk = Bezirk.PANKOW,
            displayName = "Pankow",
            vibe = "Family-friendly with a village feel. Prenzlauer Berg is the gentrified gem within.",
            commuteMinutes = 11,
            highlights = listOf(
                "Prenzlauer Berg's caf\u00e9 culture and boutiques",
                "Mauerpark Sunday flea market and karaoke",
                "Excellent schools and playgrounds",
                "Green spaces (Volkspark Friedrichshain nearby)",
                "More affordable than Mitte with similar quality"
            )
        ),
        Bezirk.CHARLOTTENBURG_WILMERSDORF to NeighborhoodProfile(
            bezirk = Bezirk.CHARLOTTENBURG_WILMERSDORF,
            displayName = "Charlottenburg-Wilmersdorf",
            vibe = "Old West Berlin elegance. Upscale, quiet, with grand architecture.",
            commuteMinutes = 17,
            highlights = listOf(
                "Kurf\u00fcrstendamm shopping boulevard",
                "Charlottenburg Palace and gardens",
                "Excellent international schools",
                "Quieter, more residential atmosphere",
                "Strong expat community"
            )
        ),
        Bezirk.SPANDAU to NeighborhoodProfile(
            bezirk = Bezirk.SPANDAU,
            displayName = "Spandau",
            vibe = "A city within a city. Affordable, green, and feels separate from Berlin.",
            commuteMinutes = 34,
            highlights = listOf(
                "Most affordable rents in Berlin",
                "Spandau Citadel (medieval fortress)",
                "Surrounded by rivers and forests",
                "Good for families wanting space",
                "Longer commute to central Berlin"
            )
        ),
        Bezirk.STEGLITZ_ZEHLENDORF to NeighborhoodProfile(
            bezirk = Bezirk.STEGLITZ_ZEHLENDORF,
            displayName = "Steglitz-Zehlendorf",
            vibe = "Leafy, suburban, and academic. Home to Freie Universit\u00e4t.",
            commuteMinutes = 33,
            highlights = listOf(
                "Botanical Garden Berlin",
                "Krumme Lanke and Schlachtensee lakes",
                "University district atmosphere",
                "Very safe and family-friendly",
                "Good balance of price and quality"
            )
        ),
        Bezirk.TEMPELHOF_SCHOENEBERG to NeighborhoodProfile(
            bezirk = Bezirk.TEMPELHOF_SCHOENEBERG,
            displayName = "Tempelhof-Sch\u00f6neberg",
            vibe = "Diverse and welcoming. Historic LGBTQ+ neighborhood with great parks.",
            commuteMinutes = 25,
            highlights = listOf(
                "Tempelhofer Feld (former airport, now massive park)",
                "Sch\u00f6neberg's vibrant LGBTQ+ scene",
                "Good mix of cultures and cuisines",
                "Reasonable rents for central location",
                "Excellent U-Bahn connections"
            )
        ),
        Bezirk.NEUKOELLN to NeighborhoodProfile(
            bezirk = Bezirk.NEUKOELLN,
            displayName = "Neuk\u00f6lln",
            vibe = "Rapidly gentrifying but still gritty. Art galleries meet d\u00f6ner shops.",
            commuteMinutes = 11,
            highlights = listOf(
                "Thriving art and music scene",
                "Incredible food diversity",
                "Tempelhofer Feld access",
                "More affordable than Kreuzberg (barely)",
                "48-hour Neuk\u00f6lln arts festival"
            )
        ),
        Bezirk.TREPTOW_KOEPENICK to NeighborhoodProfile(
            bezirk = Bezirk.TREPTOW_KOEPENICK,
            displayName = "Treptow-K\u00f6penick",
            vibe = "Berlin's green lung. Lakes, forests, and a small-town feel.",
            commuteMinutes = 22,
            highlights = listOf(
                "M\u00fcggelsee (Berlin's largest lake)",
                "Treptower Park with Soviet war memorial",
                "Kayaking and outdoor activities",
                "Affordable rents with nature access",
                "Growing tech presence (Adlershof science park)"
            )
        ),
        Bezirk.MARZAHN_HELLERSDORF to NeighborhoodProfile(
            bezirk = Bezirk.MARZAHN_HELLERSDORF,
            displayName = "Marzahn-Hellersdorf",
            vibe = "East Berlin Plattenbau district being reinvented. Surprisingly green.",
            commuteMinutes = 27,
            highlights = listOf(
                "Gardens of the World (G\u00e4rten der Welt)",
                "Lowest rents in Berlin",
                "Large apartments at budget prices",
                "IGA park and green corridors",
                "Improving transit connections"
            )
        ),
        Bezirk.LICHTENBERG to NeighborhoodProfile(
            bezirk = Bezirk.LICHTENBERG,
            displayName = "Lichtenberg",
            vibe = "Up-and-coming East Berlin. Vietnamese community hub with great food.",
            commuteMinutes = 12,
            highlights = listOf(
                "Dong Xuan Center (Vietnamese market)",
                "Tierpark Berlin (Europe's largest zoo by area)",
                "Affordable with improving infrastructure",
                "Growing creative scene",
                "Good S-Bahn and tram connections"
            )
        ),
        Bezirk.REINICKENDORF to NeighborhoodProfile(
            bezirk = Bezirk.REINICKENDORF,
            displayName = "Reinickendorf",
            vibe = "Quiet northern district. Lakes, forests, and old Berlin charm.",
            commuteMinutes = 22,
            highlights = listOf(
                "Tegeler See (Tegel Lake)",
                "Former Tegel Airport area being redeveloped",
                "French Quarter (Alt-Tegel)",
                "Affordable rents with good amenities",
                "Greenwich Promenade waterfront"
            )
        )
    )

    fun estimateCosts(bezirkSlug: String, rooms: Int): CostEstimate {
        val bezirk = bezirkFromSlug(bezirkSlug)
            ?: throw IllegalArgumentException("Unknown Bezirk: $bezirkSlug")

        val clampedRooms = rooms.coerceIn(1, 5)
        val sqm = AVG_SQM_BY_ROOMS[clampedRooms] ?: 55.0
        val perSqm = rentPerSqm[bezirk] ?: throw IllegalStateException("No rent data for $bezirk")

        val rentRange = RentRange(
            min = roundTwo(perSqm.min * sqm),
            max = roundTwo(perSqm.max * sqm),
            median = roundTwo(perSqm.median * sqm)
        )
        val utilities = roundTwo(NEBENKOSTEN_PER_SQM * sqm)
        val totalEstimated = roundTwo(rentRange.median + utilities + BVG_MONTHLY + GROCERIES_SINGLE)

        return CostEstimate(
            bezirk = bezirk,
            displayName = bezirk.displayName,
            rooms = clampedRooms,
            rentRange = rentRange,
            utilities = utilities,
            transport = BVG_MONTHLY,
            groceries = GROCERIES_SINGLE,
            totalEstimated = totalEstimated
        )
    }

    fun getNeighborhoodProfile(bezirkSlug: String): NeighborhoodProfile {
        val bezirk = bezirkFromSlug(bezirkSlug)
            ?: throw IllegalArgumentException("Unknown Bezirk: $bezirkSlug")
        return profiles[bezirk] ?: throw IllegalStateException("No profile for $bezirk")
    }

    fun getAllProfiles(): List<NeighborhoodProfile> = profiles.values.toList()

    private fun roundTwo(value: Double): Double = kotlin.math.round(value * 100.0) / 100.0
}
