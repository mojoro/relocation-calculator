import { describe, it, expect } from 'vitest';
import { allocateBudget } from '../budget-allocator';
import { ALLOCATION } from './fixtures';

describe('allocateBudget parity vs Kotlin', () => {
  it('matches Friedrichshain-Kreuzberg 2-room allocation at €3500 net', () => {
    const result = allocateBudget({
      netMonthlySalary: 3500,
      bezirk: 'friedrichshain-kreuzberg',
      rooms: 2,
      categories: [
        { key: 'rent',          label: 'Rent',          percentage: 35, isCustom: false },
        { key: 'utilities',     label: 'Utilities',     percentage:  5, isCustom: false },
        { key: 'transport',     label: 'Transport',     percentage:  3, isCustom: false },
        { key: 'groceries',     label: 'Groceries',     percentage: 12, isCustom: false },
        { key: 'dining',        label: 'Dining',        percentage:  8, isCustom: false },
        { key: 'savings',       label: 'Savings',       percentage: 20, isCustom: false },
        { key: 'entertainment', label: 'Entertainment', percentage:  7, isCustom: false },
        { key: 'misc',          label: 'Miscellaneous', percentage: 10, isCustom: false },
      ],
    });
    expect(result).toEqual(ALLOCATION);
  });
});
