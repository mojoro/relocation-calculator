package com.johnmoorman.relocation.model

/**
 * German tax classes (Steuerklassen I-VI).
 *
 * Each class has different tax-free allowances (Grundfreibetrag) and
 * deduction rules. The tax class depends on marital status, employment
 * situation, and family structure.
 *
 * - I:   Single, divorced, widowed (default)
 * - II:  Single parent (Alleinerziehend) -- higher allowance
 * - III: Married, one high earner (partner takes V)
 * - IV:  Married, both similar income (default for married)
 * - V:   Married, lower earner (partner takes III)
 * - VI:  Secondary employment (Zweitjob) -- no allowances
 */
enum class TaxClass {
    I, II, III, IV, V, VI
}
