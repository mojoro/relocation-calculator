import { describe, it, expect } from 'vitest';
import { calculateNetSalary } from '../tax-calculator';
import { SALARY_SINGLE, SALARY_MARRIED, SALARY_LOW } from './fixtures';

describe('calculateNetSalary parity vs Kotlin', () => {
  it('matches single filer at €75k', () => {
    expect(
      calculateNetSalary({
        grossAnnual: 75_000, taxClass: 'I', churchTax: false,
        hasChildren: false, childCount: 0, respondentAge: 32,
      }),
    ).toEqual(SALARY_SINGLE);
  });

  it('matches married filer III at €120k with church tax + 2 kids', () => {
    expect(
      calculateNetSalary({
        grossAnnual: 120_000, taxClass: 'III', churchTax: true,
        hasChildren: true, childCount: 2, respondentAge: 40,
      }),
    ).toEqual(SALARY_MARRIED);
  });

  it('matches low-income filer at €12k', () => {
    expect(
      calculateNetSalary({
        grossAnnual: 12_000, taxClass: 'I', churchTax: false,
        hasChildren: false, childCount: 0, respondentAge: 24,
      }),
    ).toEqual(SALARY_LOW);
  });
});
