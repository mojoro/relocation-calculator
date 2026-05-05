import type { SalaryRequest, SalaryResponse, IncomeTaxBreakdown, TaxBracket, TaxClass } from '../models/salary.model';
import { TAX_2026 as K } from './tax-constants';

interface SocialInsurance {
  healthAnnual: number;
  pensionAnnual: number;
  unemploymentAnnual: number;
  nursingAnnual: number;
  nursingRate: number;
}

export function calculateNetSalary(req: SalaryRequest): SalaryResponse {
  const grossAnnual = req.grossAnnual;
  const taxClass = req.taxClass;
  const grossMonthly = grossAnnual / 12.0;

  const social = calculateSocialInsurance(req, grossAnnual);
  const vsp = calculateVorsorgepauschale(grossAnnual, social, taxClass);
  const zvE = calculateZvE(grossAnnual, vsp, taxClass);
  const annualIncomeTax = calculateIncomeTax(zvE, taxClass);
  const monthlyIncomeTax = annualIncomeTax / 12.0;

  const brackets = calculateBracketBreakdown(zvE, taxClass);
  const allowances: [number, number] =
    taxClass === 'I' || taxClass === 'III' || taxClass === 'IV'
      ? [K.anp, K.sap]
      : taxClass === 'II'
        ? [K.anp, K.sap]
        : [0.0, 0.0];

  const incomeBreakdown: IncomeTaxBreakdown = {
    grossAnnual: grossAnnual,
    zvE: roundToTwoDecimals(zvE),
    brackets,
    einkommensteuerAnnual: roundToTwoDecimals(annualIncomeTax),
    einkommensteuerMonthly: roundToTwoDecimals(monthlyIncomeTax),
    vorsorgepauschale: roundToTwoDecimals(vsp),
    werbungskosten: allowances[0],
    sonderausgaben: allowances[1],
    lohnsteuerMonthly: roundToTwoDecimals(monthlyIncomeTax),
  };

  const annualSoli = calculateSoli(annualIncomeTax);
  const monthlySoli = annualSoli / 12.0;

  const monthlyChurchTax = req.churchTax === true
    ? (annualIncomeTax * K.churchTaxRate) / 12.0
    : null;

  const monthlyHealth = social.healthAnnual / 12.0;
  const monthlyPension = social.pensionAnnual / 12.0;
  const monthlyUnemployment = social.unemploymentAnnual / 12.0;
  const monthlyNursing = social.nursingAnnual / 12.0;

  const totalDeductions =
    monthlyIncomeTax +
    monthlySoli +
    (monthlyChurchTax ?? 0.0) +
    monthlyHealth +
    monthlyPension +
    monthlyUnemployment +
    monthlyNursing;

  const netMonthly = grossMonthly - totalDeductions;

  return {
    grossMonthly: roundToTwoDecimals(grossMonthly),
    netMonthly: roundToTwoDecimals(netMonthly),
    incomeTax: roundToTwoDecimals(monthlyIncomeTax),
    solidaritySurcharge: roundToTwoDecimals(monthlySoli),
    healthInsurance: roundToTwoDecimals(monthlyHealth),
    pensionInsurance: roundToTwoDecimals(monthlyPension),
    unemploymentInsurance: roundToTwoDecimals(monthlyUnemployment),
    nursingCareInsurance: roundToTwoDecimals(monthlyNursing),
    churchTaxAmount: monthlyChurchTax === null ? null : roundToTwoDecimals(monthlyChurchTax),
    totalDeductions: roundToTwoDecimals(totalDeductions),
    incomeBreakdown,
  };
}

function calculateSocialInsurance(req: SalaryRequest, grossAnnual: number): SocialInsurance {
  const healthBase = Math.min(grossAnnual, K.healthCeilingAnnual);
  const pensionBase = Math.min(grossAnnual, K.pensionCeilingAnnual);

  const healthAnnual = healthBase * K.healthRate;
  const pensionAnnual = pensionBase * K.pensionRate;
  const unemploymentAnnual = pensionBase * K.unemploymentRate;

  const childCount = req.childCount ?? 0;
  const respondentAge = req.respondentAge ?? 18;
  const isChildless = req.hasChildren !== true || childCount === 0;

  let nursingRate: number;
  if (isChildless && respondentAge > K.childlessExemptionAge) {
    nursingRate = K.nursingBaseRate + K.nursingChildlessSurcharge;
  } else {
    const childDiscount = Math.min(childCount, 5) * 0.0025;
    nursingRate = Math.max(K.nursingBaseRate - childDiscount, 0.01);
  }
  const nursingAnnual = healthBase * nursingRate;

  return {
    healthAnnual,
    pensionAnnual,
    unemploymentAnnual,
    nursingAnnual,
    nursingRate,
  };
}

function calculateVorsorgepauschale(
  grossAnnual: number,
  social: SocialInsurance,
  taxClass: TaxClass,
): number {
  const vspr = Math.min(grossAnnual, K.pensionCeilingAnnual) * K.pensionRate;

  if (taxClass === 'VI') {
    return Math.ceil(vspr);
  }

  const vspkvpv =
    Math.min(grossAnnual, K.healthCeilingAnnual) *
    (K.healthVorsorgepauschaleRate + social.nursingRate);

  const vsp = Math.ceil(vspr + vspkvpv);

  const vspalv = Math.min(grossAnnual, K.pensionCeilingAnnual) * K.unemploymentRate;
  const vsphb = Math.min(vspalv + vspkvpv, K.vorsorgepauschaleCap);
  const vspn = Math.ceil(vspr + vsphb);

  return Math.max(vsp, vspn);
}

function calculateZvE(grossAnnual: number, vorsorgepauschale: number, taxClass: TaxClass): number {
  const base = grossAnnual - vorsorgepauschale;

  let allowances: number;
  switch (taxClass) {
    case 'I':
    case 'III':
    case 'IV':
      allowances = K.anp + K.sap;
      break;
    case 'II':
      allowances = K.anp + K.sap + K.efa;
      break;
    case 'V':
    case 'VI':
      allowances = 0.0;
      break;
  }

  return Math.max(base - allowances, 0.0);
}

function calculateIncomeTax(zvE: number, taxClass: TaxClass): number {
  const incomeForCalculation = taxClass === 'III' ? zvE / 2.0 : zvE;
  const tax = calculateProgressiveTax(incomeForCalculation);
  return taxClass === 'III' ? tax * 2.0 : tax;
}

function calculateProgressiveTax(zvE: number): number {
  if (zvE <= K.grundfreibetrag) return 0.0;

  if (zvE <= K.zoneBEnd) {
    const y = (zvE - K.grundfreibetrag) / 10_000.0;
    return (914.51 * y + 1_400.0) * y;
  }

  if (zvE <= K.zoneCEnd) {
    const z = (zvE - K.zoneBEnd) / 10_000.0;
    return (173.10 * z + 2_397.0) * z + 1_034.87;
  }

  if (zvE <= K.zoneDEnd) {
    return 0.42 * zvE - 11_135.63;
  }

  return 0.45 * zvE - 19_470.38;
}

function calculateBracketBreakdown(zvE: number, taxClass: TaxClass): TaxBracket[] {
  const income = taxClass === 'III' ? zvE / 2.0 : zvE;
  const mult = taxClass === 'III' ? 2.0 : 1.0;

  const taxAtZone1 = calculateProgressiveTax(Math.min(income, K.zoneBEnd));
  const taxAtZone2 = calculateProgressiveTax(Math.min(income, K.zoneCEnd));
  const taxAtZone3 = calculateProgressiveTax(Math.min(income, K.zoneDEnd));
  const taxTotal = calculateProgressiveTax(income);

  return [
    {
      name: 'Grundfreibetrag',
      lowerBound: 0,
      upperBound: K.grundfreibetrag,
      rate: '0%',
      taxAmount: 0.0,
    },
    {
      name: 'Zone 1',
      lowerBound: K.grundfreibetrag + 1,
      upperBound: K.zoneBEnd,
      rate: '14\u201324%',
      taxAmount: roundToTwoDecimals(taxAtZone1 * mult),
    },
    {
      name: 'Zone 2',
      lowerBound: K.zoneBEnd + 1,
      upperBound: K.zoneCEnd,
      rate: '24\u201342%',
      taxAmount: roundToTwoDecimals((taxAtZone2 - taxAtZone1) * mult),
    },
    {
      name: 'Spitzensteuersatz',
      lowerBound: K.zoneCEnd + 1,
      upperBound: K.zoneDEnd,
      rate: '42%',
      taxAmount: roundToTwoDecimals((taxAtZone3 - taxAtZone2) * mult),
    },
    {
      name: 'Reichensteuer',
      lowerBound: K.zoneDEnd + 1,
      upperBound: null,
      rate: '45%',
      taxAmount: roundToTwoDecimals((taxTotal - taxAtZone3) * mult),
    },
  ];
}

function calculateSoli(annualIncomeTax: number): number {
  if (annualIncomeTax <= K.soliThreshold) return 0.0;
  return annualIncomeTax * K.soliRate;
}

function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}
