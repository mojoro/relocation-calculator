import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'reloc-neighborhood-explorer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="p-6"><h2 class="text-2xl font-semibold" style="color: var(--reloc-ref-color-text-primary)">Neighborhood Explorer</h2><p class="mt-2" style="color: var(--reloc-ref-color-text-secondary)">Step 3: Explore Berlin neighborhoods</p></div>`,
})
export class NeighborhoodExplorerComponent {}
