import type {
  BudgetAllocation, BudgetAllocationRequest, BudgetCategory,
} from '../models/budget.model';
import { estimateCosts } from './cost-estimator';

const PIE_GROUPS: Record<string, string> = {
  rent: 'housing', utilities: 'housing',
  transport: 'essentials', groceries: 'essentials', health: 'essentials',
  dining: 'lifestyle', clothing: 'lifestyle', entertainment: 'lifestyle',
  savings: 'financial',
  misc: 'other',
};

const COST_BACKED = new Set(['rent', 'utilities', 'transport', 'groceries']);

const roundTwo = (v: number) => Math.round(v * 100) / 100;

export function allocateBudget(req: BudgetAllocationRequest): BudgetAllocation {
  const net = req.netMonthlySalary;
  const estimate = estimateCosts(req.bezirk, req.rooms);

  const categories: BudgetCategory[] = req.categories.map((input) => {
    const total = Math.fround(roundTwo(net * input.percentage / 100));
    const pieGroup = PIE_GROUPS[input.key] ?? 'other';

    let recommendedState: BudgetCategory['recommendedState'] = null;
    if (COST_BACKED.has(input.key)) {
      const minTotal =
        input.key === 'rent'      ? estimate.rentRange.median :
        input.key === 'utilities' ? estimate.utilities :
        input.key === 'transport' ? estimate.transport :
        /* groceries */              estimate.groceries;
      recommendedState = {
        minTotal: roundTwo(minTotal),
        percentage: roundTwo((minTotal / net) * 100),
      };
    }

    return {
      key: input.key, label: input.label, percentage: input.percentage,
      total, isCustom: input.isCustom, pieGroup, recommendedState,
    };
  });

  return {
    netMonthlySalary: req.netMonthlySalary,
    bezirk: req.bezirk, rooms: req.rooms,
    categories,
  };
}
