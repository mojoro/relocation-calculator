import { Component, ChangeDetectionStrategy, input, signal, computed } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import type { CostEstimate } from '../../core/models/cost.model';
import type { BudgetCategory } from '../../core/models/budget.model';
import { PIE_COLORS } from '../../core/models/budget.model';

@Component({
  selector: 'reloc-cost-breakdown',
  standalone: true,
  imports: [CurrencyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cost-breakdown.component.html',
})
export class CostBreakdownComponent {
  /** Cost estimate from the backend (rent, utilities, transport, groceries). */
  readonly estimate = input.required<CostEstimate>();

  /** Resolved budget categories with EUR totals from the allocation engine. */
  readonly categories = input.required<BudgetCategory[]>();

  /** Net monthly salary from Step 1. */
  readonly netMonthlySalary = input<number | null>(null);

  /** Sum of all category percentages (passed from parent). */
  readonly totalAllocatedPercent = input<number>(0);

  /** Which category row is expanded to show detail info. */
  readonly expandedCategory = signal<string | null>(null);

  /** Categories that have expandable detail content. */
  private readonly expandableKeys = new Set([
    'rent',
    'utilities',
    'transport',
    'groceries',
  ]);

  /** Which category is currently hovered in the pie chart. */
  readonly hoveredCategory = signal<string | null>(null);

  /** SVG donut segments: each category becomes a circle with dash offset. */
  readonly pieSegments = computed(() => {
    const cats = this.categories();
    const total = cats.reduce((s, c) => s + c.percentage, 0);
    if (!cats.length || total === 0) return [];

    const circumference = 2 * Math.PI * 90; // radius = 90
    let cumulative = 0;
    const segments: Array<{
      key: string;
      label: string;
      percentage: number;
      color: string;
      dashArray: string;
      dashOffset: number;
    }> = [];

    for (const cat of cats) {
      const segmentLength = (cat.percentage / 100) * circumference;
      const gap = circumference - segmentLength;
      segments.push({
        key: cat.key,
        label: cat.label,
        percentage: cat.percentage,
        color: PIE_COLORS[cat.key] ?? '#94a3b8',
        dashArray: `${segmentLength} ${gap}`,
        dashOffset: -cumulative * (circumference / 100),
      });
      cumulative += cat.percentage;
    }

    return segments;
  });

  /** Total EUR across all categories. */
  readonly totalSpent = computed(() =>
    this.categories().reduce((sum, c) => sum + c.total, 0),
  );

  /** Monthly surplus (positive) or deficit (negative) vs. net salary. */
  readonly surplus = computed(() => {
    const net = this.netMonthlySalary();
    if (!net) return null;
    return net - this.totalSpent();
  });

  /** Toggle the expanded detail panel for a category row. */
  toggleCategory(key: string): void {
    if (!this.expandableKeys.has(key)) return;
    this.expandedCategory.update((current) => (current === key ? null : key));
  }

  /** Look up the pie chart color for a category key. */
  getCategoryColor(key: string): string {
    return PIE_COLORS[key] ?? '#94a3b8';
  }

  /** Whether a category key has expandable detail content. */
  isExpandable(key: string): boolean {
    return this.expandableKeys.has(key);
  }

  getHoveredLabel(key: string): string {
    return this.categories().find(c => c.key === key)?.label ?? key;
  }

  getHoveredPercentage(key: string): number {
    return this.categories().find(c => c.key === key)?.percentage ?? 0;
  }

  getHoveredTotal(key: string): number {
    return this.categories().find(c => c.key === key)?.total ?? 0;
  }
}
