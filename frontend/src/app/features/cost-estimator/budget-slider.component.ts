import { Component, ChangeDetectionStrategy, computed, input, output } from '@angular/core';
import { CurrencyPipe } from '@angular/common';

@Component({
  selector: 'reloc-budget-slider',
  standalone: true,
  imports: [CurrencyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './budget-slider.component.html',
})
export class BudgetSliderComponent {
  readonly label = input.required<string>();
  readonly percentage = input.required<number>();
  readonly amount = input.required<number>();
  readonly color = input<string>('#22746b');
  readonly recommended = input<{ minTotal?: number; percentage?: number } | null>(null);
  readonly isLocked = input<boolean>(false);

  readonly percentageChange = output<number>();

  /** Slider fill width as a CSS percentage (0–50 range mapped to 0–100%). */
  readonly fillPercent = computed(() => (this.percentage() / 50) * 100);

  /** Whether the recommended hint should be visible (differs from current by > 5%) */
  readonly showRecommendedHint = computed(() => {
    const rec = this.recommended();
    if (!rec || rec.percentage == null) return false;
    const diff = rec.percentage - this.percentage();
    return diff > 5 || diff < -5;
  });

  /** Safe accessor for the recommended percentage (only used when showRecommendedHint is true) */
  readonly recommendedPercentage = computed(() => this.recommended()?.percentage ?? 0);

  onSliderChange(event: Event): void {
    const value = +(event.target as HTMLInputElement).value;
    this.percentageChange.emit(value);
  }
}
