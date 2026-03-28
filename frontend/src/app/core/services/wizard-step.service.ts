// should manage all shared router state. Wizard steps, bezirk selection, net salary, etc.

import { inject, Injectable, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { Bezirk } from '../models/cost.model';

export interface WizardStep {
  path: string;
  label: string;
  shortLabel: string;
  icon: string;
}

@Injectable({ providedIn: 'root' })
export class WizardStepService {
  private readonly router = inject(Router);
  readonly wizardSteps: WizardStep[] = [
    { path: 'salary', label: 'Salary Calculator', shortLabel: 'Salary', icon: '💰' },
    { path: 'neighborhoods', label: 'Neighborhoods', shortLabel: 'Areas', icon: '🗺️' },
    { path: 'costs', label: 'Cost Estimator', shortLabel: 'Costs', icon: '🏠' },
    { path: 'checklist', label: 'Visa Checklist', shortLabel: 'Visa', icon: '✅' },
  ];

  readonly netMonthlySalary = signal<number | null>(null);

  readonly bezirkSelection = signal<Bezirk>('mitte');

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
