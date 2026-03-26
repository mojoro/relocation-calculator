import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { NeighborhoodProfile } from '../../core/models/cost.model';

@Component({
  selector: 'reloc-neighborhood-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="rounded-lg border p-5 transition-shadow hover:shadow-md bg-[--reloc-ref-color-bg-card] border-[--reloc-ref-color-border]"
    >
      <!-- Header -->
      <div class="mb-3 flex items-start justify-between">
        <h3
          class="text-base font-semibold text-[--reloc-ref-color-text-primary] [font-family:var(--reloc-ref-font-display)]"
        >
          {{ profile().displayName }}
        </h3>
        <span
          class="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium bg-[--reloc-ref-color-primary-light] text-[--reloc-ref-color-primary]"
        >
          {{
            profile().commuteMinutes === 0
              ? 'City center'
              : profile().commuteMinutes + ' min commute'
          }}
        </span>
      </div>

      <!-- Vibe -->
      <p class="mb-3 text-sm leading-relaxed text-[--reloc-ref-color-text-secondary]">
        {{ profile().vibe }}
      </p>

      <!-- Highlights -->
      <ul class="space-y-1">
        @for (highlight of profile().highlights; track highlight) {
          <li
            class="flex items-start gap-2 text-xs text-[--reloc-ref-color-text-primary]"
          >
            <span
              class="mt-0.5 block h-1.5 w-1.5 shrink-0 rounded-full bg-[--reloc-ref-color-primary]"
            ></span>
            {{ highlight }}
          </li>
        }
      </ul>
    </div>
  `,
})
export class NeighborhoodCardComponent {
  readonly profile = input.required<NeighborhoodProfile>();
}
