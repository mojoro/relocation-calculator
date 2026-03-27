import { Component, ChangeDetectionStrategy, HostListener, input, computed, signal } from '@angular/core';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { SalaryResponse } from '../../core/models/salary.model';
import { InfoBubbleComponent } from '../../shared/components/reloc-info-bubble.component';

@Component({
  selector: 'reloc-salary-breakdown',
  standalone: true,
  imports: [CurrencyPipe, DecimalPipe, InfoBubbleComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './salary-breakdown.component.html',
})
export class SalaryBreakdownComponent {
  /** The salary calculation result (required input) */
  readonly result = input.required<SalaryResponse>();
  readonly taxDetailOpen = signal(false);
  readonly openBubble = signal<string | null>(null);

  @HostListener('document:click')
  closeBubble(): void {
    this.openBubble.set(null);
  }

  toggleBubble(key: string): void {
    this.openBubble.update(current => current === key ? null : key);
  }

  /** Computed: percentage of gross taken by deductions */
  readonly deductionPercentage = computed(() => {
    const r = this.result();
    return ((r.totalDeductions / r.grossMonthly) * 100).toFixed(1);
  });

  /** Computed: social insurance subtotal */
  readonly socialInsuranceTotal = computed(() => {
    const r = this.result();
    return (
      r.healthInsurance + r.pensionInsurance + r.unemploymentInsurance + r.nursingCareInsurance
    );
  });
}
