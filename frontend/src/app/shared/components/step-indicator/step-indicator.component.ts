import { Component, ChangeDetectionStrategy, input, computed, effect } from '@angular/core';
import { NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';
import { WizardStep } from '../../../core/services/wizard-step.service';



@Component({
  selector: 'reloc-step-indicator',
  standalone: true,
  imports: [RouterLink, NgClass],
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
                [ngClass]="{
                  'bg-(--reloc-ref-color-primary-light) border-(--reloc-ref-color-primary) text-(--reloc-ref-color-primary)': isStepActive(i),
                  'bg-(--reloc-ref-color-primary) border-(--reloc-ref-color-primary) text-white': isStepCompleted(i),
                  'bg-(--reloc-ref-color-bg-card) border-(--reloc-ref-color-border) text-(--reloc-ref-color-text-muted)': isStepUpcoming(i)
                }"
              >
                @if (i < currentIndex() || (i <= maxVisitedIndex() && i !== currentIndex())) {
                  <svg
                    class="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="3"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                } @else {
                  {{ i + 1 }}
                }
              </div>

              <!-- Label -->
              <span
                class="hidden text-xs font-medium sm:block"
                [ngClass]="{
                  'text-(--reloc-ref-color-primary)': i <= currentIndex() || i <= maxVisitedIndex(),
                  'text-(--reloc-ref-color-text-muted)': i > currentIndex() && i > maxVisitedIndex()
                }"
              >
                {{ step.label }}
              </span>
              <span
                class="block text-xs font-medium sm:hidden"
                [ngClass]="{
                  'text-(--reloc-ref-color-primary)': i <= currentIndex() || i <= maxVisitedIndex(),
                  'text-(--reloc-ref-color-text-muted)': i > currentIndex() && i > maxVisitedIndex()
                }"
              >
                {{ step.shortLabel }}
              </span>
            </a>

            <!-- Connector line (not after last step) -->
            @if (i < steps().length - 1) {
              <div
                class="mx-1 hidden h-0.5 flex-1 sm:block"
                [ngClass]="{
                  'bg-(--reloc-ref-color-primary)': i < currentIndex() || i < maxVisitedIndex(),
                  'bg-(--reloc-ref-color-border)': i >= currentIndex() && i >= maxVisitedIndex()
                }"
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

  /** Track the highest step index visited (persisted across navigation) */
  private _maxVisited = 0;

  readonly currentIndex = computed(() => {
    const path = this.currentPath();
    return this.steps().findIndex((s) => s.path === path);
  });

  readonly maxVisitedIndex = computed(() => {
    const idx = this.currentIndex();
    if (idx > this._maxVisited) {
      this._maxVisited = idx;
      try {
        sessionStorage.setItem('reloc_max_step', String(this._maxVisited));
      } catch {
        /* ignore */
      }
    }
    return this._maxVisited;
  });

  constructor() {
    try {
      const saved = sessionStorage.getItem('reloc_max_step');
      if (saved) this._maxVisited = parseInt(saved, 10) || 0;
    } catch {
      /* ignore */
    }
  }

  isStepActive(i: number): boolean {
    return i === this.currentIndex();
  }

  isStepCompleted(i: number): boolean {
    return i < this.currentIndex() || (i <= this.maxVisitedIndex() && i !== this.currentIndex());
  }

  isStepUpcoming(i: number): boolean {
    return !this.isStepActive(i) && !this.isStepCompleted(i);
  }
}
