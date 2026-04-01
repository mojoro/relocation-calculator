import { Component, ChangeDetectionStrategy, input, output, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { BudgetSliderComponent } from './budget-slider.component';
import { BudgetCategory } from '../../core/models/budget.model';
import { PIE_COLORS } from '../../core/models/budget.model';

@Component({
  selector: 'reloc-lifestyle-spending',
  standalone: true,
  imports: [BudgetSliderComponent, CurrencyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './lifestyle-spending.component.html',
})
export class LifestyleSpendingComponent {
  readonly categories = input.required<BudgetCategory[]>();
  readonly netMonthlySalary = input.required<number>();
  readonly totalAllocatedPercent = input.required<number>();
  readonly isOverBudget = input.required<boolean>();

  readonly categoryChange = output<{ key: string; percentage: number }>();

  readonly isExpanded = signal(true);
  readonly hoveredSegment = signal<string | null>(null);

  toggleExpanded(): void {
    this.isExpanded.update((v) => !v);
  }

  onCategoryPercentageChange(key: string, percentage: number): void {
    this.categoryChange.emit({ key, percentage });
  }

  getCategoryColor(key: string): string {
    return PIE_COLORS[key] ?? '#94a3b8';
  }
}
