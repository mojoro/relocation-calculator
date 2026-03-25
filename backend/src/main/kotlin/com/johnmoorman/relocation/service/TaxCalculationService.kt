package com.johnmoorman.relocation.service

import com.johnmoorman.relocation.model.SalaryRequest
import com.johnmoorman.relocation.model.SalaryResponse
import com.johnmoorman.relocation.model.TaxClass
import org.springframework.stereotype.Service
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt

/**
 * Calculates German net salary from gross salary.
 *
 * Implements simplified 2025/2026 German tax rules:
 * - Progressive income tax (Einkommensteuer) using the four-zone formula
 * - Social insurance contributions (Sozialversicherung) at employee rates
 * - Solidarity surcharge (Solidaritaetszuschlag) -- only above threshold
 * - Church tax (Kirchensteuer) -- 8% or 9% of income tax depending on state
 *
 * IMPORTANT: This is a simplified model for demonstration purposes.
 * It is directionally accurate but NOT suitable for actual tax filing.
 * Real tax calculation requires the official BMF tax algorithm.
 */
@Service
class TaxCalculationService {

    companion object {
        // ==================================================
        // 2025 Income Tax Parameters
        // ==================================================

        /** Tax-free allowance (Grundfreibetrag) */
        const val GRUNDFREIBETRAG = 12_096

        /** Start of the first progression zone */
        const val ZONE_1_START = 12_097

        /** End of the first progression zone */
        const val ZONE_1_END = 17_443

        /** Start of the second progression zone */
        const val ZONE_2_START = 17_444

        /** End of the second progression zone */
        const val ZONE_2_END = 68_480

        /** Start of the third zone (42% flat) */
        const val ZONE_3_START = 68_481

        /** End of the third zone */
        const val ZONE_3_END = 277_825

        /** Start of the fourth zone (45% Reichensteuer) */
        const val ZONE_4_START = 277_826

        // ==================================================
        // 2025 Social Insurance Rates (Employee Share)
        // ==================================================

        /** Health insurance (Krankenversicherung) -- employee share: 7.3% + avg supplementary ~0.85% */
        const val HEALTH_INSURANCE_RATE = 0.0815

        /** Pension insurance (Rentenversicherung) -- employee share: 9.3% */
        const val PENSION_INSURANCE_RATE = 0.093

        /** Unemployment insurance (Arbeitslosenversicherung) -- employee share: 1.3% */
        const val UNEMPLOYMENT_INSURANCE_RATE = 0.013

        /** Nursing care insurance (Pflegeversicherung) -- base employee share: 1.7% */
        const val NURSING_CARE_BASE_RATE = 0.017

        /** 0.3% employee share of 0.6% total childless surcharge (2025 Pflegeversicherung reform - equal employer/employee split) */
        const val NURSING_CARE_CHILDLESS_SURCHARGE = 0.003

        // ==================================================
        // 2025 Social Insurance Contribution Ceilings
        // ==================================================

        /** Annual ceiling for health/nursing (Beitragsbemessungsgrenze Krankenversicherung) */
        const val HEALTH_CEILING_ANNUAL = 66_150

        /** Annual ceiling for pension/unemployment (Beitragsbemessungsgrenze Rentenversicherung West) */
        const val PENSION_CEILING_ANNUAL = 96_600

        // ==================================================
        // Other
        // ==================================================

        /** Solidarity surcharge rate -- 5.5% of income tax (above threshold) */
        const val SOLI_RATE = 0.055

        /** Soli threshold (annual income tax below this -> no Soli) */
        const val SOLI_THRESHOLD = 18_130

        /** Church tax rate in Berlin (8%) -- Bavaria uses 9% */
        const val CHURCH_TAX_RATE = 0.08
    }

    fun calculate(request: SalaryRequest): SalaryResponse {
        val grossAnnualInt = requireNotNull(request.grossAnnual) { "grossAnnual must not be null" }
        val taxClass = requireNotNull(request.taxClass) { "taxClass must not be null" }
        val grossAnnual = grossAnnualInt.toDouble()
        val grossMonthly = grossAnnual / 12.0

        // Calculate taxable income based on tax class
        val taxableIncome = calculateTaxableIncome(grossAnnual, taxClass)

        // Annual income tax
        val annualIncomeTax = calculateIncomeTax(taxableIncome, taxClass)
        val monthlyIncomeTax = annualIncomeTax / 12.0

        // Solidarity surcharge
        val annualSoli = calculateSoli(annualIncomeTax)
        val monthlySoli = annualSoli / 12.0

        // Church tax
        val monthlyChurchTax = if (request.churchTax) {
            (annualIncomeTax * CHURCH_TAX_RATE) / 12.0
        } else null

        // Social insurance (calculated on monthly gross, capped at ceilings)
        val healthBase = min(grossMonthly, HEALTH_CEILING_ANNUAL / 12.0)
        val pensionBase = min(grossMonthly, PENSION_CEILING_ANNUAL / 12.0)

        val monthlyHealth = healthBase * HEALTH_INSURANCE_RATE
        val monthlyPension = pensionBase * PENSION_INSURANCE_RATE
        val monthlyUnemployment = pensionBase * UNEMPLOYMENT_INSURANCE_RATE

        val nursingRate = if (!request.hasChildren || request.childCount == 0) {
            NURSING_CARE_BASE_RATE + NURSING_CARE_CHILDLESS_SURCHARGE
        } else {
            // Reduced rate for parents: base rate minus 0.25% per child (up to 5)
            val childDiscount = min(request.childCount, 5) * 0.0025
            max(NURSING_CARE_BASE_RATE - childDiscount, 0.01)
        }
        val monthlyNursing = healthBase * nursingRate

        // Total deductions
        val totalDeductions = monthlyIncomeTax + monthlySoli +
            (monthlyChurchTax ?: 0.0) +
            monthlyHealth + monthlyPension + monthlyUnemployment + monthlyNursing

        val netMonthly = grossMonthly - totalDeductions

        return SalaryResponse(
            grossMonthly = roundToTwoDecimals(grossMonthly),
            netMonthly = roundToTwoDecimals(netMonthly),
            incomeTax = roundToTwoDecimals(monthlyIncomeTax),
            solidaritySurcharge = roundToTwoDecimals(monthlySoli),
            healthInsurance = roundToTwoDecimals(monthlyHealth),
            pensionInsurance = roundToTwoDecimals(monthlyPension),
            unemploymentInsurance = roundToTwoDecimals(monthlyUnemployment),
            nursingCareInsurance = roundToTwoDecimals(monthlyNursing),
            churchTaxAmount = monthlyChurchTax?.let { roundToTwoDecimals(it) },
            totalDeductions = roundToTwoDecimals(totalDeductions)
        )
    }

    /**
     * Calculates taxable income by applying the Grundfreibetrag and
     * tax-class-specific allowances.
     */
    private fun calculateTaxableIncome(grossAnnual: Double, taxClass: TaxClass): Double {
        // Simplified: apply allowances based on tax class
        val allowance = when (taxClass) {
            TaxClass.I -> GRUNDFREIBETRAG.toDouble()
            TaxClass.II -> GRUNDFREIBETRAG + 4_260.0  // Entlastungsbetrag fuer Alleinerziehende
            TaxClass.III -> GRUNDFREIBETRAG * 2.0      // Double allowance for married
            TaxClass.IV -> GRUNDFREIBETRAG.toDouble()   // Same as Class I
            TaxClass.V -> 0.0                           // No allowance (partner gets double)
            TaxClass.VI -> 0.0                          // No allowance (secondary job)
        }
        return max(grossAnnual - allowance, 0.0)
    }

    /**
     * Calculates annual income tax using the 2025 progressive formula.
     *
     * The German income tax has four zones:
     * 1. 0% on income up to Grundfreibetrag (12,096 EUR)
     * 2. 14%-24% progressive on 12,097-17,443 EUR
     * 3. 24%-42% progressive on 17,444-68,480 EUR
     * 4. 42% flat on 68,481-277,825 EUR
     * 5. 45% flat (Reichensteuer) above 277,826 EUR
     */
    private fun calculateIncomeTax(taxableIncome: Double, taxClass: TaxClass): Double {
        // For tax class III, use splitting method (Ehegattensplitting)
        val incomeForCalculation = if (taxClass == TaxClass.III) {
            taxableIncome / 2.0
        } else {
            taxableIncome
        }

        val tax = calculateProgressiveTax(incomeForCalculation)

        // For tax class III, double the result (splitting)
        return if (taxClass == TaxClass.III) tax * 2.0 else tax
    }

    /**
     * Implements the four-zone progressive income tax formula.
     */
    private fun calculateProgressiveTax(taxableIncome: Double): Double {
        if (taxableIncome <= GRUNDFREIBETRAG) return 0.0

        // Zone 1: 14%-24% progressive (12,097-17,443 EUR)
        if (taxableIncome <= ZONE_1_END) {
            val y = (taxableIncome - GRUNDFREIBETRAG) / 10_000.0
            return (922.98 * y + 1_400.0) * y
        }

        // Zone 2: 24%-42% progressive (17,444-68,480 EUR)
        if (taxableIncome <= ZONE_2_END) {
            val z = (taxableIncome - ZONE_1_END) / 10_000.0
            return (181.19 * z + 2_397.0) * z + 966.53
        }

        // Zone 3: 42% flat (68,481-277,825 EUR)
        if (taxableIncome <= ZONE_3_END) {
            return 0.42 * taxableIncome - 10_636.31
        }

        // Zone 4: 45% Reichensteuer (above 277,826 EUR)
        return 0.45 * taxableIncome - 18_971.06
    }

    /**
     * Calculates the solidarity surcharge.
     * Applied at 5.5% of income tax, but only if income tax exceeds the threshold.
     * Below the threshold: 0. In a transitional zone: gradually phased in.
     */
    private fun calculateSoli(annualIncomeTax: Double): Double {
        if (annualIncomeTax <= SOLI_THRESHOLD) return 0.0

        // Full rate above threshold (simplified -- the actual phase-in is more complex)
        return annualIncomeTax * SOLI_RATE
    }

    private fun roundToTwoDecimals(value: Double): Double {
        return (value * 100.0).roundToInt() / 100.0
    }
}
