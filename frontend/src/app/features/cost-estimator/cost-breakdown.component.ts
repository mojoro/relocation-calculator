import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { CurrencyPipe, PercentPipe } from '@angular/common';

@Component({
  selector: 'reloc-cost-breakdown',
  standalone: true,
  imports: [CurrencyPipe, PercentPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cost-breakdown.component.html',
})
export class CostBreakdownComponent {
  readonly estimate = input.required<{
    displayName: string;
    rooms: number;
    rentRange: { min: number; max: number; median: number };
    utilities: number;
    transport: number;
    groceries: number;
    totalEstimated: number;
  }>();
  readonly netMonthlySalary = input<number | null>(null);
  readonly affordabilityRatio = input<number | null>(null);
  readonly affordabilityLabel = input<{ text: string; color: string } | null>(null);
}
