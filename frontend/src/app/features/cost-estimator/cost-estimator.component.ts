import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'reloc-cost-estimator',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="p-6"><h2 class="text-2xl font-semibold" style="color: var(--reloc-ref-color-text-primary)">Cost Estimator</h2><p class="mt-2" style="color: var(--reloc-ref-color-text-secondary)">Step 2: Estimate your living costs</p></div>`,
})
export class CostEstimatorComponent {}
