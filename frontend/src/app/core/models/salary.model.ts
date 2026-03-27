// Inlined from shared/api-contracts/salary.ts — source of truth
// Kotlin mirror: shared/api-contracts/salary.kt
// Any field changes must be mirrored in both files.

/** German tax classes (Steuerklassen) */
export type TaxClass = 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI';

/** Request body for POST /api/v1/salary/calculate */
export interface SalaryRequest {
  grossAnnual: number;
  taxClass: TaxClass;
  churchTax: boolean;
  hasChildren: boolean;
  childCount: number;
  respondentAge: number;
}

/** Response from POST /api/v1/salary/calculate */
export interface SalaryResponse {
  grossMonthly: number;
  netMonthly: number;
  incomeTax: number;
  solidaritySurcharge: number;
  healthInsurance: number;
  pensionInsurance: number;
  unemploymentInsurance: number;
  nursingCareInsurance: number;
  churchTaxAmount: number | null;
  totalDeductions: number;
}

export type { ApiError } from './api-error.model';
