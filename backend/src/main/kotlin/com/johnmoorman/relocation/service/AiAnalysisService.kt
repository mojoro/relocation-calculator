package com.johnmoorman.relocation.service

import com.fasterxml.jackson.databind.ObjectMapper
import com.johnmoorman.relocation.model.*
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import org.springframework.web.client.RestClient
import java.time.OffsetDateTime

/**
 * Generates AI-powered budget analysis narratives via OpenRouter.
 *
 * Falls back gracefully: returns null when the API key is missing,
 * the upstream call fails, or the response can't be parsed. The caller
 * is expected to use template-based generation as a fallback.
 */
@Service
class AiAnalysisService(
    private val objectMapper: ObjectMapper,
    @Value("\${openrouter.api-key:}") private val apiKey: String,
    @Value("\${openrouter.model:anthropic/claude-sonnet-4}") private val model: String
) {

    companion object {
        private const val BASE_URL = "https://openrouter.ai/api/v1"
        private const val COMPLETIONS_PATH = "/chat/completions"

        private val SECTION_KEY_MAP = mapOf(
            "daily-life" to AnalysisSection.Key.dailyMinusLife,
            "housing" to AnalysisSection.Key.housing,
            "food-and-dining" to AnalysisSection.Key.foodMinusAndMinusDining,
            "transport-and-mobility" to AnalysisSection.Key.transportMinusAndMinusMobility,
            "leisure-and-culture" to AnalysisSection.Key.leisureMinusAndMinusCulture,
            "financial-health" to AnalysisSection.Key.financialMinusHealth,
            "tips" to AnalysisSection.Key.tips
        )

        private val SENTIMENT_MAP = mapOf(
            "positive" to AnalysisSection.Sentiment.positive,
            "neutral" to AnalysisSection.Sentiment.neutral,
            "caution" to AnalysisSection.Sentiment.caution
        )
    }

    private val logger = LoggerFactory.getLogger(AiAnalysisService::class.java)

    private val restClient = RestClient.builder()
        .baseUrl(BASE_URL)
        .defaultHeader("HTTP-Referer", "https://relocation-calculator.vercel.app")
        .defaultHeader("X-Title", "Berlin Relocation Calculator")
        .build()

    /** True when an API key has been provided. */
    val isConfigured: Boolean
        get() = apiKey.isNotBlank()

    /**
     * Generates a full [BudgetAnalysis] using an AI model via OpenRouter.
     *
     * @return the AI-generated analysis, or null if the service is not configured
     *         or the upstream call fails for any reason.
     */
    fun analyze(context: AnalysisContext, profile: NeighborhoodProfile): BudgetAnalysis? {
        if (!isConfigured) {
            logger.warn("OpenRouter API key not configured — skipping AI analysis")
            return null
        }

        return try {
            logger.info("Starting AI budget analysis for {} (model: {})", context.bezirk.value, model)

            val systemPrompt = buildSystemPrompt()
            val userPrompt = buildUserPrompt(context, profile)
            val requestBody = buildRequestBody(systemPrompt, userPrompt)

            val responseBody = restClient.post()
                .uri(COMPLETIONS_PATH)
                .header("Authorization", "Bearer $apiKey")
                .header("Content-Type", "application/json")
                .body(requestBody)
                .retrieve()
                .body(String::class.java)

            val analysis = parseResponse(responseBody)
            logger.info("AI budget analysis completed successfully for {}", context.bezirk.value)
            analysis
        } catch (ex: Exception) {
            logger.error("AI analysis failed: {}", ex.message, ex)
            null
        }
    }

    // -- Prompt construction ------------------------------------------------

    private fun buildSystemPrompt(): String = """
        |You are an experienced Berlin relocation financial advisor who has helped
        |hundreds of expats settle in the city. You give practical, specific advice
        |grounded in real Berlin costs, neighborhoods, and bureaucracy.
        |
        |Return a JSON object with this exact structure — no markdown fences, no
        |commentary outside the JSON:
        |
        |{
        |  "sections": [
        |    {
        |      "key": "daily-life",
        |      "heading": "Your Day in {bezirk}",
        |      "body": "markdown content...",
        |      "sentiment": "positive"
        |    }
        |  ]
        |}
        |
        |You MUST include exactly 7 sections with these keys in this order:
        |  1. "daily-life"   — paint a picture of their daily routine in the Bezirk
        |  2. "housing"      — analyze their rent budget against local market reality
        |  3. "food-and-dining" — grocery and restaurant budget in Berlin context
        |  4. "transport-and-mobility" — BVG pass, biking, commute from their Bezirk
        |  5. "leisure-and-culture" — what their entertainment budget unlocks in Berlin
        |  6. "financial-health" — savings rate, emergency fund, overall sustainability
        |  7. "tips"         — 5-7 actionable Berlin survival tips as a bullet list
        |
        |Each section's "sentiment" must be exactly one of: "positive", "neutral", "caution".
        |
        |For the body field, use markdown: **bold** for emphasis, bullet points with
        |"- " prefix, and specific EUR amounts. Reference real Berlin places, markets,
        |transit lines, and neighborhoods. The tone should be warm but honest — like
        |advice from a friend who actually lives there.
        |
        |The "tips" section body should be a markdown bullet list where each item
        |starts with a bold label, e.g. "- **Anmeldung first:** Register your address..."
    """.trimMargin()

    private fun buildUserPrompt(context: AnalysisContext, profile: NeighborhoodProfile): String {
        val bezirkName = context.bezirkDisplayName ?: profile.displayName
        val totalAllocated = context.totalAllocated
            ?: context.categories.sumOf { it.total.toDouble() }
        val remaining = context.remainingMonthly
            ?: (context.netMonthlySalary - totalAllocated)

        val categorySummary = context.categories.joinToString("\n") { cat ->
            val pct = "%.1f".format(cat.percentage)
            val eur = "%.0f".format(cat.total)
            "  - ${cat.label} (${cat.key}): $pct% = EUR $eur/month"
        }

        val highlights = if (!profile.highlights.isNullOrEmpty()) {
            profile.highlights.joinToString(", ")
        } else {
            "no highlights available"
        }

        val childInfo = if (context.hasChildren == true && (context.childCount ?: 0) > 0) {
            "Has children: yes (${context.childCount} child/children)"
        } else {
            "Has children: no"
        }

        return """
            |Analyze this budget for someone relocating to Berlin:
            |
            |**Income:**
            |- Gross annual salary: EUR ${context.grossAnnualSalary}
            |- Net monthly salary: EUR ${"%.0f".format(context.netMonthlySalary)}
            |- Tax class: ${context.taxClass.value}
            |
            |**Location:**
            |- Bezirk: $bezirkName
            |- Vibe: ${profile.vibe}
            |- Apartment: ${context.rooms} rooms
            |- Commute to Mitte: ${profile.commuteMinutes} minutes
            |- Highlights: $highlights
            |
            |**Budget allocation:**
            |$categorySummary
            |- Total allocated: EUR ${"%.0f".format(totalAllocated)}/month
            |- Remaining unallocated: EUR ${"%.0f".format(remaining)}/month
            |
            |**Rent market (${context.rooms}-room in $bezirkName):**
            |- Min: EUR ${"%.0f".format(context.rentRange.min)}/month
            |- Median: EUR ${"%.0f".format(context.rentRange.median)}/month
            |- Max: EUR ${"%.0f".format(context.rentRange.max)}/month
            |
            |**Personal:**
            |- $childInfo
        """.trimMargin()
    }

    // -- Request/response handling ------------------------------------------

    private fun buildRequestBody(systemPrompt: String, userPrompt: String): Map<String, Any> =
        mapOf(
            "model" to model,
            "messages" to listOf(
                mapOf("role" to "system", "content" to systemPrompt),
                mapOf("role" to "user", "content" to userPrompt)
            ),
            "temperature" to 0.7,
            "max_tokens" to 3000
        )

    private fun parseResponse(responseBody: String?): BudgetAnalysis? {
        if (responseBody.isNullOrBlank()) {
            logger.error("OpenRouter returned empty response body")
            return null
        }

        val root = objectMapper.readTree(responseBody)
        val content = root.path("choices").path(0).path("message").path("content").asText()

        if (content.isNullOrBlank()) {
            logger.error("OpenRouter response missing content field. Response: {}",
                responseBody.take(500))
            return null
        }

        // The model may wrap JSON in ```json ... ``` fences — strip them
        val cleanedContent = content
            .replace(Regex("^```(?:json)?\\s*", RegexOption.MULTILINE), "")
            .replace(Regex("```\\s*$", RegexOption.MULTILINE), "")
            .trim()

        val sectionsNode = objectMapper.readTree(cleanedContent).path("sections")
        if (!sectionsNode.isArray) {
            logger.error("AI response missing 'sections' array. Content: {}", cleanedContent.take(500))
            return null
        }

        val sections = sectionsNode.mapNotNull { node ->
            val keyStr = node.path("key").asText()
            val heading = node.path("heading").asText()
            val body = node.path("body").asText()
            val sentimentStr = node.path("sentiment").asText()

            val key = SECTION_KEY_MAP[keyStr]
            val sentiment = SENTIMENT_MAP[sentimentStr]

            if (key == null || heading.isBlank() || body.isBlank()) {
                logger.warn("Skipping malformed AI section: key={}, heading={}", keyStr, heading)
                null
            } else {
                AnalysisSection(
                    key = key,
                    heading = heading,
                    body = body,
                    sentiment = sentiment ?: AnalysisSection.Sentiment.neutral
                )
            }
        }

        if (sections.size < 7) {
            logger.warn("AI returned {} sections instead of 7 — falling back", sections.size)
            return null
        }

        return BudgetAnalysis(
            sections = sections,
            generatedAt = OffsetDateTime.now()
        )
    }
}
