package com.johnmoorman.relocation.service

import com.johnmoorman.relocation.model.SalaryRequest
import com.johnmoorman.relocation.model.SalaryResponse
import com.johnmoorman.relocation.model.TaxClass
import kotlin.math.ceil
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt
import org.springframework.stereotype.Service

/**
 * Calculates German net salary from gross salary using the 2026 Lohnsteuer algorithm.
 *
 * Implements:
 * - Vorsorgepauschale (provision allowance) to reduce taxable income
 * - Progressive income tax (Einkommensteuer) using the five-zone BMF formula
 * - Social insurance contributions (Sozialversicherung) at employee rates
 * - Solidarity surcharge (Solidaritaetszuschlag) with 2026 threshold
 * - Church tax (Kirchensteuer) at Berlin's 9% rate
 *
 * The Grundfreibetrag (12,348 EUR) is handled entirely within the progressive formula — zone (a)
 * applies 0% tax up to that amount. It is NOT subtracted from gross income beforehand.
 *
 * IMPORTANT: This is a simplified model for demonstration purposes. It is directionally accurate
 * but NOT suitable for actual tax filing. Real tax calculation requires the official BMF
 * Programmablaufplan.
 */
@Service
class TaxCalculationService {

    companion object {
        // ==================================================
        // 2026 Progressive Tax Formula Boundaries
        // ==================================================

        /** Zone (a) ceiling — Grundfreibetrag. Income up to here is tax-free. */
        const val GRUNDFREIBETRAG = 12_348

        /** Zone (b): first progression zone, 14%–24% marginal rate */
        const val ZONE_B_END = 17_799

        /** Zone (c): second progression zone, 24%–42% marginal rate */
        const val ZONE_C_END = 69_878

        /** Zone (d): flat 42% (Spitzensteuersatz) */
        const val ZONE_D_END = 277_825

        /** Zone (e) starts above 277,825 — flat 45% (Reichensteuer) */

        // ==================================================
        // 2026 Social Insurance Rates (Employee Share)
        // ==================================================

        /**
         * Health insurance (Krankenversicherung) — employee share: 7.3% base + Zusatzbeitrag/2 (avg
         * ~0.85% for 2026). Used for actual payroll deductions.
         */
        const val HEALTH_INSURANCE_RATE = 0.0815

        /**
         * Health insurance rate for Vorsorgepauschale calculation (KVSATZAN in PAP). Uses a reduced
         * base of 7.0% (not 7.3%) + Zusatzbeitrag/2. With average Zusatzbeitrag of ~1.7%, KVSATZAN
         * = 0.07 + 0.017/2 = 0.0785.
         */
        const val HEALTH_VORSORGEPAUSCHALE_RATE = 0.0785

        /** Pension insurance (Rentenversicherung) — employee share: 9.3% */
        const val PENSION_INSURANCE_RATE = 0.093

        /** Unemployment insurance (Arbeitslosenversicherung) — employee share: 1.3% */
        const val UNEMPLOYMENT_INSURANCE_RATE = 0.013

        /** Nursing care insurance (Pflegeversicherung) — base employee share: 1.8% (2026) */
        const val NURSING_CARE_BASE_RATE = 0.018

        /**
         * Childless surcharge on nursing care: employee's share of the 0.6% total surcharge (equal
         * employer/employee split = 0.3% each).
         */
        const val NURSING_CARE_CHILDLESS_SURCHARGE = 0.003
        const val CHILDLESS_EXEMPTION_AGE = 23

        // ==================================================
        // 2026 Social Insurance Contribution Ceilings (Annual)
        // ==================================================

        /** Beitragsbemessungsgrenze Krankenversicherung */
        const val HEALTH_CEILING_ANNUAL = 69_750

        /** Beitragsbemessungsgrenze Rentenversicherung (West) */
        const val PENSION_CEILING_ANNUAL = 101_400

        // ==================================================
        // Vorsorgepauschale & Allowances
        // ==================================================

        /** Cap for the health+unemployment portion of the Vorsorgepauschale */
        const val VORSORGEPAUSCHALE_CAP = 1_900

        /** Werbungskosten-Pauschbetrag (employee expense lump sum, §9a EStG) */
        const val ANP = 1_230

        /** Sonderausgabenpauschale (flat deduction for special expenses) */
        const val SAP = 36

        /** Entlastungsbetrag fuer Alleinerziehende (single-parent relief, class II) */
        const val EFA = 4_260

        // ==================================================
        // Solidarity Surcharge
        // ==================================================

        /** Soli rate: 5.5% of income tax (when above threshold) */
        const val SOLI_RATE = 0.055

        /** Annual income tax threshold below which no Soli is owed (2026) */
        const val SOLI_THRESHOLD = 20_350

        // ==================================================
        // Church Tax
        // ==================================================

        /** Church tax rate in Berlin: 9% of income tax */
        const val CHURCH_TAX_RATE = 0.09
    }

    /**
     * Holds pre-calculated annual social insurance amounts. Used both as actual payroll deductions
     * AND as inputs to the Vorsorgepauschale.
     */
    private data class SocialInsurance(
            val healthAnnual: Double,
            val pensionAnnual: Double,
            val unemploymentAnnual: Double,
            val nursingAnnual: Double,
            val nursingRate: Double
    )

    fun calculate(request: SalaryRequest): SalaryResponse {
        val grossAnnual = request.grossAnnual.toDouble()
        val taxClass = request.taxClass
        val grossMonthly = grossAnnual / 12.0

        // Step 1: Social insurance contributions (annual)
        val social = calculateSocialInsurance(request, grossAnnual)

        // Step 2: Vorsorgepauschale — reduces taxable income for Lohnsteuer
        val vsp = calculateVorsorgepauschale(grossAnnual, social, taxClass)

        // Step 3: zu versteuerndes Einkommen (zvE)
        val zvE = calculateZvE(grossAnnual, vsp, taxClass)

        // Step 4: Annual income tax via progressive formula
        val annualIncomeTax = calculateIncomeTax(zvE, taxClass)
        val monthlyIncomeTax = annualIncomeTax / 12.0

        // Step 5: Solidarity surcharge
        val annualSoli = calculateSoli(annualIncomeTax)
        val monthlySoli = annualSoli / 12.0

        // Step 6: Church tax (Berlin: 9% of income tax)
        val monthlyChurchTax =
                if (request.churchTax == true) {
                    (annualIncomeTax * CHURCH_TAX_RATE) / 12.0
                } else null

        // Monthly social insurance deductions
        val monthlyHealth = social.healthAnnual / 12.0
        val monthlyPension = social.pensionAnnual / 12.0
        val monthlyUnemployment = social.unemploymentAnnual / 12.0
        val monthlyNursing = social.nursingAnnual / 12.0

        // Total monthly deductions
        val totalDeductions =
                monthlyIncomeTax +
                        monthlySoli +
                        (monthlyChurchTax ?: 0.0) +
                        monthlyHealth +
                        monthlyPension +
                        monthlyUnemployment +
                        monthlyNursing

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
     * Calculates annual social insurance contributions.
     *
     * Each branch of social insurance has its own contribution ceiling (Beitragsbemessungsgrenze).
     * Health and nursing share one ceiling; pension and unemployment share another.
     */
    private fun calculateSocialInsurance(
            request: SalaryRequest,
            grossAnnual: Double
    ): SocialInsurance {
        val healthBase = min(grossAnnual, HEALTH_CEILING_ANNUAL.toDouble())
        val pensionBase = min(grossAnnual, PENSION_CEILING_ANNUAL.toDouble())

        val healthAnnual = healthBase * HEALTH_INSURANCE_RATE
        val pensionAnnual = pensionBase * PENSION_INSURANCE_RATE
        val unemploymentAnnual = pensionBase * UNEMPLOYMENT_INSURANCE_RATE

        // Nursing care rate depends on parental status and age
        val nursingRate =
                if ((request.hasChildren != true || (request.childCount ?: 0) == 0) &&
                                (request.respondentAge ?: 18) > CHILDLESS_EXEMPTION_AGE
                ) {
                    // Childless surcharge applies
                    NURSING_CARE_BASE_RATE + NURSING_CARE_CHILDLESS_SURCHARGE
                } else {
                    // Parents get a 0.25% discount per child (up to 5 children)
                    val childDiscount = min(request.childCount ?: 0, 5) * 0.0025
                    max(NURSING_CARE_BASE_RATE - childDiscount, 0.01)
                }
        val nursingAnnual = healthBase * nursingRate

        return SocialInsurance(
                healthAnnual = healthAnnual,
                pensionAnnual = pensionAnnual,
                unemploymentAnnual = unemploymentAnnual,
                nursingAnnual = nursingAnnual,
                nursingRate = nursingRate
        )
    }

    /**
     * Calculates the Vorsorgepauschale (provision allowance).
     *
     * This is the key deduction that makes Lohnsteuer (payroll tax) lower than raw Einkommensteuer.
     * It accounts for the employee's social insurance contributions when determining taxable income
     * for payroll purposes.
     *
     * The BMF algorithm computes two variants and takes the larger: VSP = VSPR + VSPKVPV (pension +
     * health/nursing) VSPN = VSPR + min(VSPALV + VSPKVPV, 1900) (pension + capped
     * health/nursing/unemployment) Final = max(VSP, VSPN)
     *
     * For tax class VI (secondary employment), only the pension portion applies.
     */
    private fun calculateVorsorgepauschale(
            grossAnnual: Double,
            social: SocialInsurance,
            taxClass: TaxClass
    ): Double {
        // Pension portion (VSPR): employee's 9.3% of gross up to pension ceiling
        val vspr = min(grossAnnual, PENSION_CEILING_ANNUAL.toDouble()) * PENSION_INSURANCE_RATE

        // Tax class VI: no health/unemployment component
        if (taxClass == TaxClass.VI) {
            return ceil(vspr)
        }

        // Health + nursing portion (VSPKVPV) — uses reduced KVSATZAN rate, not full employee rate
        val vspkvpv =
                min(grossAnnual, HEALTH_CEILING_ANNUAL.toDouble()) *
                        (HEALTH_VORSORGEPAUSCHALE_RATE + social.nursingRate)

        // Full variant: pension + health/nursing (rounded up)
        val vsp = ceil(vspr + vspkvpv)

        // Unemployment portion (VSPALV)
        val vspalv =
                min(grossAnnual, PENSION_CEILING_ANNUAL.toDouble()) * UNEMPLOYMENT_INSURANCE_RATE

        // Capped health + unemployment (VSPHB)
        val vsphb = min(vspalv + vspkvpv, VORSORGEPAUSCHALE_CAP.toDouble())

        // Alternative variant: pension + capped amount (rounded up)
        val vspn = ceil(vspr + vsphb)

        // Take the more favorable (larger) deduction
        return max(vsp, vspn)
    }

    /**
     * Calculates zu versteuerndes Einkommen (zvE) — the taxable income that gets fed into the
     * progressive formula.
     *
     * zvE = grossAnnual - VSP - ANP - SAP - (EFA for class II)
     *
     * Where: VSP = Vorsorgepauschale (social insurance provision allowance) ANP =
     * Werbungskosten-Pauschbetrag (1,230 EUR employee expense lump sum) SAP =
     * Sonderausgaben-Pauschbetrag (36 EUR special expenses) EFA = Entlastungsbetrag (4,260 EUR
     * single-parent relief, class II only)
     *
     * The Grundfreibetrag is NOT subtracted here — it is handled inside the progressive tax formula
     * (zone a = 0% up to 12,348).
     *
     * Tax classes V and VI receive no ANP, SAP, or EFA deductions. Tax class III uses the normal
     * zvE but applies Ehegattensplitting in the tax formula (halve zvE, compute tax, double the
     * result).
     */
    private fun calculateZvE(
            grossAnnual: Double,
            vorsorgepauschale: Double,
            taxClass: TaxClass
    ): Double {
        val base = grossAnnual - vorsorgepauschale

        val allowances =
                when (taxClass) {
                    TaxClass.I, TaxClass.III, TaxClass.IV -> ANP + SAP.toDouble()
                    TaxClass.II -> ANP + SAP + EFA.toDouble()
                    TaxClass.V, TaxClass.VI -> 0.0
                }

        return max(base - allowances, 0.0)
    }

    /**
     * Calculates annual income tax from zvE, handling Ehegattensplitting for tax class III.
     *
     * Class III (married, one earner): divide zvE by 2, calculate tax on that half, then double the
     * result. This is the Splitting-Verfahren.
     */
    private fun calculateIncomeTax(zvE: Double, taxClass: TaxClass): Double {
        val incomeForCalculation =
                if (taxClass == TaxClass.III) {
                    zvE / 2.0
                } else {
                    zvE
                }

        val tax = calculateProgressiveTax(incomeForCalculation)

        return if (taxClass == TaxClass.III) tax * 2.0 else tax
    }

    /**
     * Implements the 2026 five-zone progressive income tax formula.
     *
     * The zvE is passed directly — the Grundfreibetrag is built into the formula as zone (a).
     *
     * Zone (a): zvE <= 12,348 → tax = 0 Zone (b): 12,349 – 17,799 → y = (zvE - 12,348) / 10,000
     * ```
     *                                   tax = (914.51 * y + 1,400) * y
     * ```
     * Zone (c): 17,800 – 69,878 → z = (zvE - 17,799) / 10,000
     * ```
     *                                   tax = (173.10 * z + 2,397) * z + 1,034.87
     * ```
     * Zone (d): 69,879 – 277,825 → tax = 0.42 * zvE - 11,135.63 Zone (e): above 277,825 → tax =
     * 0.45 * zvE - 19,470.38
     */
    private fun calculateProgressiveTax(zvE: Double): Double {
        if (zvE <= GRUNDFREIBETRAG) return 0.0

        if (zvE <= ZONE_B_END) {
            val y = (zvE - GRUNDFREIBETRAG) / 10_000.0
            return (914.51 * y + 1_400.0) * y
        }

        if (zvE <= ZONE_C_END) {
            val z = (zvE - ZONE_B_END) / 10_000.0
            return (173.10 * z + 2_397.0) * z + 1_034.87
        }

        if (zvE <= ZONE_D_END) {
            return 0.42 * zvE - 11_135.63
        }

        return 0.45 * zvE - 19_470.38
    }

    /**
     * Calculates the solidarity surcharge (Solidaritaetszuschlag).
     *
     * 5.5% of income tax, but only if annual income tax exceeds the threshold of 20,350 EUR (2026).
     * Below the threshold: 0.
     *
     * Note: The actual Soli has a phase-in zone just above the threshold (capped at 11.9% of the
     * excess). This simplified version applies the full 5.5% rate once the threshold is exceeded.
     */
    private fun calculateSoli(annualIncomeTax: Double): Double {
        if (annualIncomeTax <= SOLI_THRESHOLD) return 0.0
        return annualIncomeTax * SOLI_RATE
    }

    private fun roundToTwoDecimals(value: Double): Double {
        return (value * 100.0).roundToInt() / 100.0
    }
}
