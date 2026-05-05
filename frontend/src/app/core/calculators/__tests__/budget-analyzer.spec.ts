import { describe, it, expect } from 'vitest';
import { analyzeFromTemplate } from '../budget-analyzer';

describe('analyzeFromTemplate', () => {
  it('returns 7 sections with required fields', () => {
    const result = analyzeFromTemplate({
      netMonthlySalary: 3500, grossAnnualSalary: 60_000, taxClass: 'I',
      bezirk: 'friedrichshain-kreuzberg', rooms: 2,
      categories: [
        { key: 'rent',     label: 'Rent',     percentage: 35, total: 1225, isCustom: false, pieGroup: 'housing' },
        { key: 'savings',  label: 'Savings',  percentage: 20, total:  700, isCustom: false, pieGroup: 'financial' },
      ],
      rentRange: { min: 715, max: 1100, median: 880 },
      neighborhoodVibe: "Berlin's creative and nightlife epicenter.",
    });
    expect(result.sections).toHaveLength(7);
    expect(result.sections.every(s => s.key && s.heading && s.body)).toBe(true);
    expect(typeof result.generatedAt).toBe('string');
  });
});
