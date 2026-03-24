import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import { RouterLink } from '@angular/router';

export interface WizardStep {
  path: string;
  label: string;
  shortLabel: string;
  icon: string;
}

@Component({
  selector: 'reloc-step-indicator',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="mb-8">
      <ol class="flex items-center justify-between gap-2">
        @for (step of steps(); track step.path; let i = $index) {
          <li class="flex flex-1 items-center">
            <a
              [routerLink]="['/', step.path]"
              class="group flex w-full flex-col items-center gap-1.5 text-center"
            >
              <!-- Step circle -->
              <div
                class="flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors"
                [style]="getStepStyle(i)"
              >
                @if (i < currentIndex()) {
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                } @else {
                  {{ i + 1 }}
                }
              </div>

              <!-- Label -->
              <span
                class="hidden text-xs font-medium sm:block"
                [style]="i <= currentIndex()
                  ? 'color: var(--reloc-ref-color-primary)'
                  : 'color: var(--reloc-ref-color-text-muted)'"
              >
                {{ step.label }}
              </span>
              <span
                class="block text-xs font-medium sm:hidden"
                [style]="i <= currentIndex()
                  ? 'color: var(--reloc-ref-color-primary)'
                  : 'color: var(--reloc-ref-color-text-muted)'"
              >
                {{ step.shortLabel }}
              </span>
            </a>

            <!-- Connector line (not after last step) -->
            @if (i < steps().length - 1) {
              <div
                class="mx-1 hidden h-0.5 flex-1 sm:block"
                [style]="i < currentIndex()
                  ? 'background-color: var(--reloc-ref-color-primary)'
                  : 'background-color: var(--reloc-ref-color-border)'"
              ></div>
            }
          </li>
        }
      </ol>
    </nav>
  `,
})
export class StepIndicatorComponent {
  readonly steps = input.required<WizardStep[]>();
  readonly currentPath = input.required<string>();

  readonly currentIndex = computed(() => {
    const path = this.currentPath();
    return this.steps().findIndex((s) => s.path === path);
  });

  getStepStyle(index: number): string {
    const current = this.currentIndex();
    if (index < current) {
      // Completed
      return 'background-color: var(--reloc-ref-color-primary); border-color: var(--reloc-ref-color-primary); color: white';
    } else if (index === current) {
      // Active
      return 'background-color: var(--reloc-ref-color-primary-light); border-color: var(--reloc-ref-color-primary); color: var(--reloc-ref-color-primary)';
    } else {
      // Upcoming
      return 'background-color: var(--reloc-ref-color-bg-card); border-color: var(--reloc-ref-color-border); color: var(--reloc-ref-color-text-muted)';
    }
  }
}
