import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { SalaryResponse } from '../../core/models/salary.model';

@Component({
  selector: 'reloc-salary-breakdown',
  standalone: true,
  imports: [CurrencyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './salary-breakdown.component.html',
})
export class SalaryBreakdownComponent {
  /** The salary calculation result (required input) */
  readonly result = input.required<SalaryResponse>();

  /** Computed: percentage of gross taken by deductions */
  readonly deductionPercentage = computed(() => {
    const r = this.result();
    return ((r.totalDeductions / r.grossMonthly) * 100).toFixed(1);
  });

  /** Computed: social insurance subtotal */
  readonly socialInsuranceTotal = computed(() => {
    const r = this.result();
    return r.healthInsurance + r.pensionInsurance + r.unemploymentInsurance + r.nursingCareInsurance;
  });
}
