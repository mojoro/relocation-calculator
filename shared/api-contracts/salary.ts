/**
 * Salary API Contracts
 *
 * These TypeScript interfaces are the source of truth for the salary
 * calculation API. The Kotlin data classes in salary.kt mirror these
 * exactly — any change here must be reflected there and vice versa.
 *
 * @see salary.kt for the Kotlin mirror
 * @see backend/src/.../controller/SalaryController.kt for the endpoint
 */

/** German tax classes (Steuerklassen) */
export type TaxClass = 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI';

/** Request body for POST /api/v1/salary/calculate */
export interface SalaryRequest {
  /** Gross annual salary in EUR */
  grossAnnual: number;
  /** German tax class (Steuerklasse) I–VI */
  taxClass: TaxClass;
  /** Whether the employee pays church tax (Kirchensteuer) */
  churchTax: boolean;
  /** Whether the employee has children (affects Kinderfreibetrag) */
  hasChildren: boolean;
  /** Number of children (relevant for nursing care insurance) */
  childCount: number;
  respondentAge: number | null;
}

/** Response from POST /api/v1/salary/calculate */
export interface SalaryResponse {
  /** Gross monthly salary (grossAnnual / 12) */
  grossMonthly: number;
  /** Net monthly salary after all deductions */
  netMonthly: number;
  /** Monthly income tax (Lohnsteuer) */
  incomeTax: number;
  /** Monthly solidarity surcharge (Solidaritätszuschlag) */
  solidaritySurcharge: number;
  /** Monthly health insurance (Krankenversicherung) — employee share */
  healthInsurance: number;
  /** Monthly pension insurance (Rentenversicherung) — employee share */
  pensionInsurance: number;
  /** Monthly unemployment insurance (Arbeitslosenversicherung) — employee share */
  unemploymentInsurance: number;
  /** Monthly nursing care insurance (Pflegeversicherung) — employee share */
  nursingCareInsurance: number;
  /** Monthly church tax, or null if not applicable */
  churchTaxAmount: number | null;
  /** Total monthly deductions */
  totalDeductions: number;
}

/** Error response from the API */
export interface ApiError {
  /** HTTP status code */
  status: number;
  /** Error message */
  message: string;
  /** Timestamp of the error */
  timestamp: string;
}
