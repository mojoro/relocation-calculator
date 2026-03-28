import { Component, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { filter, map } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { ThemeToggleService } from './core/services/theme-toggle.service';
import { StepIndicatorComponent } from './shared/components/step-indicator/step-indicator.component';
import { WizardStepService } from './core/services/wizard-step.service';

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
        <button
          (click)="theme.toggleTheme()"
          class="flex items-center content-center justify-center align-middle cursor-pointer w-10 h-10 rounded-(--reloc-sys-radius-full) transition-colors hover:bg-(--reloc-ref-color-primary-surface) "
        >
          <span
            class="w-6 h-6 text-center text-(--reloc-ref-color-text-primary) material-symbols-outlined align-middle"
          >
            @if (theme.isDark()) {
              light_mode
            } @else {
              dark_mode
            }
          </span>
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
  readonly theme = inject(ThemeToggleService);
  private readonly wizardStepService = inject(WizardStepService);
  readonly wizardSteps = this.wizardStepService.wizardSteps;

  readonly currentPath = this.wizardStepService.currentPath;
}
