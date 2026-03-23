import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'reloc-visa-checklist',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="p-6"><h2 class="text-2xl font-semibold" style="color: var(--reloc-ref-color-text-primary)">Visa Checklist</h2><p class="mt-2" style="color: var(--reloc-ref-color-text-secondary)">Step 4: Track your visa requirements</p></div>`,
})
export class VisaChecklistComponent {}
