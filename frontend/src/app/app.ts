import { Component, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { filter, map } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  StepIndicatorComponent,
  WizardStep,
} from './shared/components/step-indicator/step-indicator.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, StepIndicatorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-(--reloc-ref-color-bg-body)">
      <header
        class="border-b px-6 py-4 flex justify-between items-center bg-(--reloc-ref-color-bg-card) border-(--reloc-ref-color-border)"
      >
        <h1
          class="text-xl font-semibold text-(--reloc-ref-color-primary) [font-family:var(--reloc-ref-font-display)]"
        >
          Berlin Relocation Planner
        </h1>
        <button class="cursor-pointer rounded-lg hover:bg">
          <span class="material-symbols-outlined">light_mode</span>
        </button>
      </header>
      <main class="mx-auto max-w-4xl px-4 py-8">
        <reloc-step-indicator [steps]="wizardSteps" [currentPath]="currentPath()" />
        <router-outlet />
      </main>
    </div>
  `,
})
export class AppComponent {
  private readonly router = inject(Router);

  readonly wizardSteps: WizardStep[] = [
    { path: 'salary', label: 'Salary Calculator', shortLabel: 'Salary', icon: '💰' },
    { path: 'costs', label: 'Cost Estimator', shortLabel: 'Costs', icon: '🏠' },
    { path: 'neighborhoods', label: 'Neighborhoods', shortLabel: 'Areas', icon: '🗺️' },
    { path: 'checklist', label: 'Visa Checklist', shortLabel: 'Visa', icon: '✅' },
  ];

  readonly currentPath = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => {
        // Extract the first path segment (e.g., '/salary' → 'salary')
        const segments = event.urlAfterRedirects.split('/').filter(Boolean);
        return segments[0] || 'salary';
      }),
    ),
    { initialValue: 'salary' },
  );
}
