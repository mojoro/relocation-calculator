export type TaxClass = 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI';

export interface SalaryRequest {
  grossAnnual: number;
  taxClass: TaxClass;
  churchTax: boolean;
  hasChildren: boolean;
  childCount: number;
}

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

export interface ApiError {
  status: number;
  message: string;
  timestamp: string;
}
