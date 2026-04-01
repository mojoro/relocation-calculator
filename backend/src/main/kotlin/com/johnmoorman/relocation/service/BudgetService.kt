package com.johnmoorman.relocation.service

import com.johnmoorman.relocation.model.*
import org.springframework.stereotype.Service
import java.time.OffsetDateTime

/**
 * Handles budget allocation enrichment and template-based narrative analysis.
 *
 * The allocation endpoint computes EUR totals from percentages and attaches
 * recommended spending states based on real Berlin cost data. The analysis
 * endpoint generates structured, Bezirk-aware narrative sections that give
 * the user a contextual picture of what their budget means for daily life.
 */
@Service
class BudgetService(
    private val costEstimationService: CostEstimationService,
    private val aiAnalysisService: AiAnalysisService
) {

    companion object {
        /** Maps category keys to pie-chart groups for frontend visualization. */
        val PIE_GROUPS: Map<String, String> = mapOf(
            "rent" to "housing",
            "utilities" to "housing",
            "transport" to "essentials",
            "groceries" to "essentials",
            "dining" to "lifestyle",
            "health" to "essentials",
            "savings" to "financial",
            "clothing" to "lifestyle",
            "entertainment" to "lifestyle",
            "misc" to "other"
        )

        /** Categories whose recommended state can be derived from the cost estimate. */
        val COST_BACKED_CATEGORIES = setOf("rent", "utilities", "transport", "groceries")

        /** Monthly Rundfunkbeitrag (public broadcasting fee). */
        const val RUNDFUNKBEITRAG = 18.36

        /** BVG AB-zone monthly pass (2025). */
        const val BVG_AB_PASS = 58.0

        /** BVG ABC-zone monthly pass (2025). */
        const val BVG_ABC_PASS = 107.0
    }

    /**
     * Enriches raw percentage-based categories with EUR totals,
     * pie-chart groupings, and cost-estimate-backed recommended states.
     */
    fun allocateBudget(request: BudgetAllocationRequest): BudgetAllocation {
        val net = request.netMonthlySalary.toDouble()
        val estimate = costEstimationService.estimateCosts(request.bezirk.value, request.rooms)

        val enrichedCategories = request.categories.map { input ->
            val total = roundTwo(net * input.percentage / 100.0).toFloat()
            val pieGroup = PIE_GROUPS[input.key] ?: "other"

            val recommendedState = if (input.key in COST_BACKED_CATEGORIES) {
                buildRecommendedState(input.key, estimate, net)
            } else {
                null
            }

            BudgetCategory(
                key = input.key,
                label = input.label,
                percentage = input.percentage,
                total = total,
                isCustom = input.isCustom,
                pieGroup = pieGroup,
                recommendedState = recommendedState
            )
        }

        return BudgetAllocation(
            netMonthlySalary = request.netMonthlySalary,
            bezirk = request.bezirk,
            rooms = request.rooms,
            categories = enrichedCategories
        )
    }

    /**
     * Generates a structured narrative analysis of the user's full budget
     * in the context of their chosen Bezirk, salary, and life situation.
     *
     * Returns seven sections covering daily life, housing, food, transport,
     * leisure, financial health, and actionable tips — all grounded in real
     * Berlin cost data and neighborhood character.
     */
    fun analyzeBudget(context: AnalysisContext): BudgetAnalysis {
        val profile = costEstimationService.getNeighborhoodProfile(context.bezirk.value)

        // Try AI analysis first, fall back to template-based generation
        val aiResult = aiAnalysisService.analyze(context, profile)
        if (aiResult != null) return aiResult

        return generateTemplateAnalysis(context, profile)
    }

    /**
     * Generates a structured narrative analysis using handcrafted templates
     * grounded in real Berlin cost data and neighborhood character.
     *
     * Used as a fallback when AI analysis is unavailable or fails.
     */
    private fun generateTemplateAnalysis(
        context: AnalysisContext,
        profile: NeighborhoodProfile
    ): BudgetAnalysis {
        val categoryMap = context.categories.associateBy { it.key }
        val totalAllocated = context.totalAllocated ?: context.categories.sumOf { it.total.toDouble() }
        val remaining = context.remainingMonthly ?: (context.netMonthlySalary - totalAllocated)

        val sections = listOf(
            buildDailyLifeSection(context, profile, remaining),
            buildHousingSection(context, categoryMap, profile),
            buildFoodAndDiningSection(context, categoryMap, profile),
            buildTransportSection(context, categoryMap, profile),
            buildLeisureSection(context, categoryMap, profile),
            buildFinancialHealthSection(context, categoryMap, remaining),
            buildTipsSection(context, categoryMap, profile, remaining)
        )

        return BudgetAnalysis(
            sections = sections,
            generatedAt = OffsetDateTime.now()
        )
    }

    // ── Private helpers ──────────────────────────────────────────────────

    private fun buildRecommendedState(
        key: String,
        estimate: CostEstimate,
        netSalary: Double
    ): BudgetCategoryRecommendedState {
        val minTotal = when (key) {
            "rent" -> estimate.rentRange.median
            "utilities" -> estimate.utilities
            "transport" -> estimate.transport
            "groceries" -> estimate.groceries
            else -> 0.0
        }
        return BudgetCategoryRecommendedState(
            minTotal = roundTwo(minTotal),
            percentage = roundTwo(minTotal / netSalary * 100.0).toFloat()
        )
    }

    // ── Section builders ─────────────────────────────────────────────────

    private fun buildDailyLifeSection(
        context: AnalysisContext,
        profile: NeighborhoodProfile,
        remaining: Double
    ): AnalysisSection {
        val bezirkName = context.bezirkDisplayName ?: context.bezirk.displayName
        val vibe = context.neighborhoodVibe
        val commuteNote = when {
            profile.commuteMinutes == 0 -> "You're in the center — most of Berlin is your commute destination, not the other way around."
            profile.commuteMinutes <= 15 -> "With a ${profile.commuteMinutes}-minute commute to Mitte, you're close enough to bike on good days."
            profile.commuteMinutes <= 25 -> "The ${profile.commuteMinutes}-minute commute is typical for Berlin — a podcast episode on the U-Bahn and you're there."
            else -> "The ${profile.commuteMinutes}-minute commute is on the longer side, but you gain space and quiet in return."
        }

        val budgetTone = when {
            remaining > 200 -> "Your budget has comfortable breathing room — enough for spontaneous weekend trips or saving for bigger goals."
            remaining > 0 -> "Your budget is tight but balanced. You'll need to be intentional, but that's Berlin — the city rewards the resourceful."
            else -> "Your budget is stretched beyond your income. Some categories will need trimming before this plan is sustainable."
        }

        val sentiment = when {
            remaining > 200 -> AnalysisSection.Sentiment.positive
            remaining > 0 -> AnalysisSection.Sentiment.neutral
            else -> AnalysisSection.Sentiment.caution
        }

        val body = """
            |**$bezirkName** — $vibe
            |
            |$commuteNote
            |
            |$budgetTone
            |
            |With a net monthly income of **${formatEur(context.netMonthlySalary)}**, here's how your budget plays out in one of Berlin's most distinctive neighborhoods.
        """.trimMargin()

        return AnalysisSection(
            key = AnalysisSection.Key.dailyMinusLife,
            heading = "Your Day in $bezirkName",
            body = body,
            sentiment = sentiment
        )
    }

    private fun buildHousingSection(
        context: AnalysisContext,
        categoryMap: Map<String, BudgetCategory>,
        profile: NeighborhoodProfile
    ): AnalysisSection {
        val rent = categoryMap["rent"]
        val utilities = categoryMap["utilities"]
        val rentTotal = rent?.total?.toDouble() ?: 0.0
        val utilitiesTotal = utilities?.total?.toDouble() ?: 0.0
        val warmmiete = rentTotal + utilitiesTotal
        val rentRange = context.rentRange
        val rentRatio = if (context.netMonthlySalary > 0) rentTotal / context.netMonthlySalary * 100 else 0.0
        val bezirkName = context.bezirkDisplayName ?: context.bezirk.displayName

        val marketPosition = when {
            rentTotal < rentRange.min -> "below the lower quartile — an excellent deal if you can find it, though competition will be fierce."
            rentTotal <= rentRange.median -> "at or below the median — realistic, especially if you start your search early and have your documents ready (Schufa, proof of income, Mietschuldenfreiheitsbescheinigung)."
            rentTotal <= rentRange.max -> "above the median but within the upper quartile. You'll have more options, but consider whether the extra cost is worth it."
            else -> "above the upper quartile for $bezirkName. At this level, you might find better value in a neighboring Bezirk."
        }

        val ratioWarning = when {
            rentRatio > 40 -> "\n\n> **Warning:** Your rent-to-income ratio is **${formatPct(rentRatio)}** — well above the 30% threshold German landlords typically look for. This may also make it harder to get approved."
            rentRatio > 30 -> "\n\n> **Note:** At **${formatPct(rentRatio)}**, your rent-to-income ratio exceeds the commonly recommended 30% ceiling. It's manageable, but leaves less room for other expenses."
            else -> ""
        }

        val sentiment = when {
            rentRatio > 40 || rentTotal > rentRange.max -> AnalysisSection.Sentiment.caution
            rentRatio > 30 || rentTotal > rentRange.median -> AnalysisSection.Sentiment.neutral
            else -> AnalysisSection.Sentiment.positive
        }

        val body = """
            |You've allocated **${formatEur(rentTotal)}** for Kaltmiete (cold rent) in **$bezirkName** for a **${context.rooms}-room** apartment.
            |
            |The current market range is **${formatEur(rentRange.min)}** – **${formatEur(rentRange.max)}** (median **${formatEur(rentRange.median)}**). Your budget lands $marketPosition
            |
            |With Nebenkosten (utilities) at **${formatEur(utilitiesTotal)}**, your total Warmmiete comes to **${formatEur(warmmiete)}** per month.$ratioWarning
        """.trimMargin()

        return AnalysisSection(
            key = AnalysisSection.Key.housing,
            heading = "Housing in $bezirkName",
            body = body,
            sentiment = sentiment
        )
    }

    private fun buildFoodAndDiningSection(
        context: AnalysisContext,
        categoryMap: Map<String, BudgetCategory>,
        profile: NeighborhoodProfile
    ): AnalysisSection {
        val groceries = categoryMap["groceries"]?.total?.toDouble() ?: 0.0
        val dining = categoryMap["dining"]?.total?.toDouble() ?: 0.0
        val combinedFood = groceries + dining
        val bezirkName = context.bezirkDisplayName ?: context.bezirk.displayName

        val groceryContext = when {
            groceries >= 350 -> "At **${formatEur(groceries)}** for groceries, you can comfortably shop at Bio Company or the weekly farmers' markets without constantly checking prices. Mixing in Aldi or Lidl runs will stretch it even further."
            groceries >= 250 -> "**${formatEur(groceries)}** for groceries is workable if you lean on Aldi, Lidl, and the Turkish supermarkets. Supplement with seasonal produce from the weekly markets — the quality-to-price ratio is unbeatable."
            else -> "**${formatEur(groceries)}** is tight for groceries. You'll want to plan meals around Aldi/Lidl specials and visit the Turkish Market on Maybachufer (Tuesdays and Fridays) for cheap, fresh produce."
        }

        val diningContext = when {
            dining >= 150 -> "With **${formatEur(dining)}** for dining out, you can enjoy Berlin's restaurant scene regularly — from a quick Döner (€5–7) to sit-down meals. $bezirkName has no shortage of options."
            dining >= 80 -> "**${formatEur(dining)}** for dining allows for occasional restaurant meals and plenty of street food. A tip: many Berlin restaurants have great lunch specials (Mittagstisch) for €8–12."
            dining > 0 -> "At **${formatEur(dining)}**, dining out will be occasional. Focus on Berlin's incredible street food scene — falafel wraps, currywurst, and Vietnamese bánh mì are all under €6."
            else -> "No dining budget allocated. Berlin's street food is famously cheap — even €30–40/month opens up occasional treats."
        }

        val sentiment = when {
            combinedFood >= 400 -> AnalysisSection.Sentiment.positive
            combinedFood >= 300 -> AnalysisSection.Sentiment.neutral
            else -> AnalysisSection.Sentiment.caution
        }

        val body = """
            |$groceryContext
            |
            |$diningContext
            |
            |**Berlin food tip:** The combination of discount supermarkets, ethnic grocery stores, and weekly markets makes Berlin one of the most affordable cities in Western Europe for food — if you know where to look.
        """.trimMargin()

        return AnalysisSection(
            key = AnalysisSection.Key.foodMinusAndMinusDining,
            heading = "Food & Dining",
            body = body,
            sentiment = sentiment
        )
    }

    private fun buildTransportSection(
        context: AnalysisContext,
        categoryMap: Map<String, BudgetCategory>,
        profile: NeighborhoodProfile
    ): AnalysisSection {
        val transport = categoryMap["transport"]?.total?.toDouble() ?: 0.0
        val bezirkName = context.bezirkDisplayName ?: context.bezirk.displayName

        val passAnalysis = when {
            transport >= BVG_ABC_PASS -> "Your **${formatEur(transport)}** transport budget covers the **ABC-zone pass (€${BVG_ABC_PASS.toInt()}/month)** with room for occasional taxi rides or a bike-sharing subscription. The ABC zone extends to Potsdam and the Brandenburg countryside."
            transport >= BVG_AB_PASS -> {
                val surplus = transport - BVG_AB_PASS
                if (surplus >= 20) {
                    "Your **${formatEur(transport)}** covers the **AB-zone pass (€${BVG_AB_PASS.toInt()}/month)** with **${formatEur(surplus)}** left for occasional Einzelfahrscheine to zone C or a Swapfiets bike subscription (~€20/month)."
                } else {
                    "Your **${formatEur(transport)}** covers the **BVG AB-zone monthly pass (€${BVG_AB_PASS.toInt()}/month)** — U-Bahn, S-Bahn, bus, tram, and ferry, unlimited."
                }
            }
            transport >= 30 -> "At **${formatEur(transport)}**, a monthly pass (€${BVG_AB_PASS.toInt()}) doesn't quite fit. Consider a bicycle as your primary transport and buying 4-trip tickets (4-Fahrten-Karte) for bad weather days."
            else -> "**${formatEur(transport)}** is quite low for Berlin transport. A used bike from eBay Kleinanzeigen (€50–100 one-time) could be your best investment — Berlin is flat and bike-friendly."
        }

        val commuteContext = if (profile.commuteMinutes > 20) {
            "\n\nFrom **$bezirkName**, the ${profile.commuteMinutes}-minute commute to central Berlin makes reliable transit important. The BVG pass pays for itself quickly at this distance."
        } else if (profile.commuteMinutes > 0) {
            "\n\n**$bezirkName** is well-connected — at ${profile.commuteMinutes} minutes to Mitte, you might find yourself biking as often as taking the train."
        } else {
            ""
        }

        val sentiment = when {
            transport >= BVG_AB_PASS -> AnalysisSection.Sentiment.positive
            transport >= 30 -> AnalysisSection.Sentiment.neutral
            else -> AnalysisSection.Sentiment.caution
        }

        val body = """
            |$passAnalysis$commuteContext
        """.trimMargin()

        return AnalysisSection(
            key = AnalysisSection.Key.transportMinusAndMinusMobility,
            heading = "Transport & Mobility",
            body = body,
            sentiment = sentiment
        )
    }

    private fun buildLeisureSection(
        context: AnalysisContext,
        categoryMap: Map<String, BudgetCategory>,
        profile: NeighborhoodProfile
    ): AnalysisSection {
        val entertainment = categoryMap["entertainment"]?.total?.toDouble() ?: 0.0
        val dining = categoryMap["dining"]?.total?.toDouble() ?: 0.0
        val combined = entertainment + dining
        val bezirkName = context.bezirkDisplayName ?: context.bezirk.displayName

        val cultureContext = when {
            entertainment >= 150 -> "With **${formatEur(entertainment)}** for entertainment, Berlin is your playground. Cinema (~€12), concerts (€15–40), museum days, and spontaneous bar nights are all comfortably in reach."
            entertainment >= 80 -> "**${formatEur(entertainment)}** gives you a solid cultural budget. Catch free open-air events in summer, visit museums on their free/reduced days, and still have room for a few concerts or cinema trips."
            entertainment >= 30 -> "At **${formatEur(entertainment)}**, you'll be selective — but Berlin rewards that. Free gallery openings, Mauerpark karaoke, park barbecues, and the city's legendary free open-air scene mean you'll never be bored."
            else -> "Berlin's secret: you can have an incredible cultural life for almost nothing. Free gallery openings on weekends, Mauerpark Sundays, Tempelhofer Feld sunsets, and community events fill the calendar year-round."
        }

        val bezirkHighlights = context.neighborhoodHighlights
        val localColor = if (!bezirkHighlights.isNullOrEmpty()) {
            val highlights = bezirkHighlights.take(3).joinToString(", ")
            "\n\n**In $bezirkName specifically:** $highlights — all part of the local character you'll get to know."
        } else {
            ""
        }

        val sentiment = when {
            combined >= 200 -> AnalysisSection.Sentiment.positive
            combined >= 100 -> AnalysisSection.Sentiment.neutral
            else -> AnalysisSection.Sentiment.caution
        }

        val body = """
            |$cultureContext$localColor
        """.trimMargin()

        return AnalysisSection(
            key = AnalysisSection.Key.leisureMinusAndMinusCulture,
            heading = "Leisure & Culture",
            body = body,
            sentiment = sentiment
        )
    }

    private fun buildFinancialHealthSection(
        context: AnalysisContext,
        categoryMap: Map<String, BudgetCategory>,
        remaining: Double
    ): AnalysisSection {
        val savings = categoryMap["savings"]?.total?.toDouble() ?: 0.0
        val savingsRate = if (context.netMonthlySalary > 0) savings / context.netMonthlySalary * 100 else 0.0
        val totalExpenses = context.netMonthlySalary - savings
        val emergencyMonths = if (savings > 0) (totalExpenses * 3) / savings else Double.MAX_VALUE

        val savingsAnalysis = when {
            savingsRate >= 20 -> "Your savings rate of **${formatPct(savingsRate)}** (${formatEur(savings)}/month) exceeds the commonly recommended 20%. At this pace, you'll build a 3-month emergency fund in **${formatMonths(emergencyMonths)}**."
            savingsRate >= 10 -> "A **${formatPct(savingsRate)}** savings rate (${formatEur(savings)}/month) is a reasonable start. The standard recommendation is 20%, but in an expensive city like Berlin, 10–15% is pragmatic while you settle in. A 3-month emergency fund would take **${formatMonths(emergencyMonths)}**."
            savingsRate > 0 -> "At **${formatPct(savingsRate)}** (${formatEur(savings)}/month), your savings rate is below the 10% minimum most financial advisors recommend. Building an emergency fund will take **${formatMonths(emergencyMonths)}** — consider whether any other categories can be trimmed."
            else -> "You haven't allocated anything to savings. Even €50–100/month creates a safety net over time. In Germany, unexpected costs (Nachzahlung for utilities, appliance repairs) can hit without warning."
        }

        val remainingNote = when {
            remaining > 100 -> "\n\nYou have **${formatEur(remaining)}** unallocated — consider directing some of this to savings or an investment account (many German banks offer free ETF Sparpläne)."
            remaining > 0 -> "\n\nYour budget leaves **${formatEur(remaining)}** unallocated — a thin but useful buffer for unexpected expenses."
            remaining < -50 -> "\n\n> **Your budget is ${formatEur(-remaining)} over your net income.** This plan isn't sustainable as-is. Review your largest categories for possible reductions."
            remaining < 0 -> "\n\nYour budget slightly exceeds your income by **${formatEur(-remaining)}**. Small adjustments to one or two categories should bring it into balance."
            else -> ""
        }

        val sentiment = when {
            savingsRate >= 20 -> AnalysisSection.Sentiment.positive
            savingsRate >= 10 -> AnalysisSection.Sentiment.neutral
            else -> AnalysisSection.Sentiment.caution
        }

        val body = """
            |$savingsAnalysis$remainingNote
        """.trimMargin()

        return AnalysisSection(
            key = AnalysisSection.Key.financialMinusHealth,
            heading = "Financial Health",
            body = body,
            sentiment = sentiment
        )
    }

    private fun buildTipsSection(
        context: AnalysisContext,
        categoryMap: Map<String, BudgetCategory>,
        profile: NeighborhoodProfile,
        remaining: Double
    ): AnalysisSection {
        val bezirkName = context.bezirkDisplayName ?: context.bezirk.displayName
        val tips = mutableListOf<String>()

        // Universal Berlin tips
        tips.add("**Anmeldung first:** Register your address at the Bürgeramt within 14 days of moving in. Book the appointment *before* you arrive — slots fill up weeks in advance.")
        tips.add("**Rundfunkbeitrag:** Budget €${"%.2f".format(RUNDFUNKBEITRAG)}/month for the mandatory public broadcasting fee. It's per household, not per person.")
        tips.add("**Haftpflichtversicherung:** Personal liability insurance (~€5–8/month) is practically mandatory in Germany. It covers accidental damage to rental property, other people's belongings, etc.")

        // Budget-specific tips
        val savings = categoryMap["savings"]?.total?.toDouble() ?: 0.0
        val groceries = categoryMap["groceries"]?.total?.toDouble() ?: 0.0
        val rent = categoryMap["rent"]?.total?.toDouble() ?: 0.0

        if (savings < context.netMonthlySalary * 0.1) {
            tips.add("**Savings boost:** Open a Tagesgeldkonto (instant-access savings) at a German online bank. Set up an automatic Dauerauftrag (standing order) on payday — even €50/month adds up.")
        }

        if (groceries < 300) {
            tips.add("**Grocery savings:** The Tuesday and Friday Turkish Market at Maybachufer (Neukölln) has the best prices for fresh produce in the city. Also check Too Good To Go app for restaurant surplus bags (€3–5).")
        }

        if (rent > context.rentRange.max) {
            tips.add("**Rent negotiation:** Your budget exceeds the upper quartile for $bezirkName. Consider looking at neighboring Bezirke or WG (shared apartment) options to bring this down.")
        }

        // Bezirk-specific tips
        val bezirkTips = getBezirkTips(context.bezirk, bezirkName)
        tips.addAll(bezirkTips)

        // Children-specific tips
        if (context.hasChildren == true && (context.childCount ?: 0) > 0) {
            tips.add("**Kindergeld:** Don't forget to apply for Kindergeld (child benefit) — currently €250/month per child. Apply through the Familienkasse as soon as you have your Anmeldung.")
            tips.add("**Kita:** Start looking for daycare (Kita) immediately. Waiting lists can be 6–12 months. The Kita-Gutschein system means childcare is heavily subsidized in Berlin.")
        }

        if (remaining < 0) {
            tips.add("**Budget gap:** Your allocations exceed your income by ${formatEur(-remaining)}. Before committing to an apartment, revisit your largest expense categories.")
        }

        val body = tips.joinToString("\n\n") { "- $it" }

        return AnalysisSection(
            key = AnalysisSection.Key.tips,
            heading = "Berlin Survival Tips",
            body = body,
            sentiment = AnalysisSection.Sentiment.neutral
        )
    }

    // ── Bezirk-specific tip data ─────────────────────────────────────────

    private fun getBezirkTips(bezirk: Bezirk, displayName: String): List<String> = when (bezirk) {
        Bezirk.FRIEDRICHSHAIN_KREUZBERG -> listOf(
            "**$displayName tip:** Join the Kreuzberg community groups on nebenan.de for furniture swaps, neighborhood events, and local recommendations.",
            "**Rent competition:** This is one of Berlin's most competitive rental markets. Prepare a complete Bewerbungsmappe (application folder) with Schufa, pay slips, and a personal cover letter."
        )
        Bezirk.MITTE -> listOf(
            "**$displayName tip:** Avoid tourist-trap restaurants near Alexanderplatz. Walk 10 minutes in any direction for better food at half the price.",
            "**Coworking:** If you work remotely, $displayName has Berlin's highest density of coworking spaces — many offer free trial days."
        )
        Bezirk.PANKOW -> listOf(
            "**$displayName tip:** Sunday mornings at Mauerpark (flea market + karaoke) are a Prenzlauer Berg institution. Get there before 11 for the best finds.",
            "**Family-friendly:** If you have kids, Pankow's playgrounds and Kindercafés are among Berlin's best."
        )
        Bezirk.NEUKOELLN -> listOf(
            "**$displayName tip:** The 48 Stunden Neukölln art festival (June) is free and showcases the neighborhood's incredible creative scene.",
            "**Food scene:** Sonnenallee (\"Arab Street\") has some of Berlin's best Middle Eastern food at unbeatable prices."
        )
        Bezirk.TEMPELHOF_SCHOENEBERG -> listOf(
            "**$displayName tip:** Tempelhofer Feld is one of the world's most unique parks — a former airport with 2 km runways for skating, cycling, and kiteboarding.",
            "**Winterfeldtplatz market:** The Saturday market in Schöneberg is one of Berlin's best for fresh produce, cheese, and street food."
        )
        Bezirk.CHARLOTTENBURG_WILMERSDORF -> listOf(
            "**$displayName tip:** Explore beyond Ku'damm — the side streets of Charlottenburg have excellent independent restaurants and hidden courtyards (Hinterhöfe).",
            "**Expat hub:** Large English-speaking community and many international services, making the transition easier."
        )
        Bezirk.SPANDAU -> listOf(
            "**$displayName tip:** Spandau's old town (Altstadt) has charm that most Berliners never discover. The Christmas market is also one of Berlin's best.",
            "**Commute planning:** Factor in the longer commute. The RE1 regional train can be faster than the S-Bahn for reaching central Berlin."
        )
        Bezirk.STEGLITZ_ZEHLENDORF -> listOf(
            "**$displayName tip:** Schlachtensee and Krumme Lanke are perfect for summer swimming — a major quality-of-life perk.",
            "**University area:** If you're in academia or tech, the Freie Universität ecosystem includes meetups, lectures, and networking events open to the public."
        )
        Bezirk.TREPTOW_KOEPENICK -> listOf(
            "**$displayName tip:** Rent a kayak or paddleboard on the Dahme or Spree — water sports access is a unique Köpenick advantage.",
            "**Adlershof:** If you work in tech or science, the Adlershof science and technology park is a growing employment hub right in the Bezirk."
        )
        Bezirk.MARZAHN_HELLERSDORF -> listOf(
            "**$displayName tip:** Gärten der Welt (Gardens of the World) is a hidden gem — beautifully landscaped themed gardens and a cable car with city views.",
            "**Space for less:** The Plattenbau apartments here offer significantly more square meters per euro than anywhere else in Berlin."
        )
        Bezirk.LICHTENBERG -> listOf(
            "**$displayName tip:** Dong Xuan Center is Berlin's Vietnamese market — incredible Phở, fresh ingredients, and unique finds you won't get anywhere else.",
            "**Tierpark:** Europe's largest zoo by area is in Lichtenberg and offers annual passes — great value for families or regular visitors."
        )
        Bezirk.REINICKENDORF -> listOf(
            "**$displayName tip:** The Greenwich Promenade along Tegeler See is one of Berlin's most underrated waterfront walks.",
            "**Tegel redevelopment:** The former airport area is being transformed into a tech and research hub — property values and amenities are expected to improve significantly."
        )
    }

    // ── Formatting utilities ─────────────────────────────────────────────

    private fun roundTwo(value: Double): Double = kotlin.math.round(value * 100.0) / 100.0

    private fun formatEur(value: Double): String = "€${"%.0f".format(value)}"

    private fun formatPct(value: Double): String = "${"%.1f".format(value)}%"

    private fun formatMonths(months: Double): String = when {
        months >= 120 -> "over 10 years"
        months >= 24 -> "about ${"%.0f".format(months / 12)} years"
        months >= 12 -> "about a year"
        else -> "${"%.0f".format(months)} months"
    }
}
