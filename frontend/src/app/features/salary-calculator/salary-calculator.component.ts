import { Component, ChangeDetectionStrategy } from '@angular/core';
import { SalaryFormComponent } from './salary-form.component';

@Component({
  selector: 'reloc-salary-calculator',
  standalone: true,
  imports: [SalaryFormComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<reloc-salary-form />`,
})
export class SalaryCalculatorComponent {}
