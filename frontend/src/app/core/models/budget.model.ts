// Generated from shared/api-contracts/openapi.yaml
// Run `npm run generate:api` to regenerate after spec changes.
import type { components } from '../api/generated-types';

export type BudgetAllocationRequest = components['schemas']['BudgetAllocationRequest'];
export type BudgetCategoryInput = components['schemas']['BudgetCategoryInput'];
export type BudgetAllocation = components['schemas']['BudgetAllocation'];
export type BudgetCategory = components['schemas']['BudgetCategory'];
export type AnalysisContext = components['schemas']['AnalysisContext'];
export type BudgetAnalysis = components['schemas']['BudgetAnalysis'];
export type AnalysisSection = components['schemas']['AnalysisSection'];

// Frontend-only types — not part of the API contract

export interface SanityRule {
  key: string;
  label: string;
  verdict: 'pass' | 'warning' | 'fail';
  message: string;
}

export interface DefaultBudgetCategory {
  key: string;
  label: string;
  percentage: number;
  isCustom: false;
  pieGroup: 'housing' | 'essentials' | 'lifestyle' | 'financial' | 'other';
}

export const DEFAULT_BUDGET_CATEGORIES: DefaultBudgetCategory[] = [
  { key: 'rent', label: 'Rent', percentage: 30, isCustom: false, pieGroup: 'housing' },
  { key: 'utilities', label: 'Utilities', percentage: 5, isCustom: false, pieGroup: 'housing' },
  { key: 'transport', label: 'Transport', percentage: 3, isCustom: false, pieGroup: 'essentials' },
  { key: 'groceries', label: 'Groceries', percentage: 12, isCustom: false, pieGroup: 'essentials' },
  { key: 'dining', label: 'Dining', percentage: 8, isCustom: false, pieGroup: 'lifestyle' },
  { key: 'health', label: 'Health', percentage: 3, isCustom: false, pieGroup: 'essentials' },
  { key: 'savings', label: 'Savings', percentage: 20, isCustom: false, pieGroup: 'financial' },
  { key: 'clothing', label: 'Clothing', percentage: 5, isCustom: false, pieGroup: 'lifestyle' },
  {
    key: 'entertainment',
    label: 'Entertainment',
    percentage: 7,
    isCustom: false,
    pieGroup: 'lifestyle',
  },
  { key: 'misc', label: 'Miscellaneous', percentage: 7, isCustom: false, pieGroup: 'other' },
];

export const PIE_COLORS: Record<string, string> = {
  rent: '#22746b',
  utilities: '#2d9f93',
  transport: '#3b82f6',
  groceries: '#60a5fa',
  dining: '#a855f7',
  health: '#38bdf8',
  savings: '#22c55e',
  clothing: '#c084fc',
  entertainment: '#f59e0b',
  misc: '#94a3b8',
};
