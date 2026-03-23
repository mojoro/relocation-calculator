import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'reloc-salary-calculator',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="p-6"><h2 class="text-2xl font-semibold" style="color: var(--reloc-ref-color-text-primary)">Salary Calculator</h2><p class="mt-2" style="color: var(--reloc-ref-color-text-secondary)">Step 1: Enter your salary details</p></div>`,
})
export class SalaryCalculatorComponent {}
