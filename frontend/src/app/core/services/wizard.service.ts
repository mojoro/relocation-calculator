import { effect, inject, Injectable, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { Bezirk } from '../models/cost.model';
import type { components } from '../api/generated-types';
import type { BudgetAnalysis } from '../models/budget.model';
import { DEFAULT_BUDGET_CATEGORIES } from '../models/budget.model';

type TaxClass = components['schemas']['TaxClass'];

export interface WizardStep {
  path: string;
  label: string;
  shortLabel: string;
  icon: string;
}

const STORAGE_KEY = 'reloc_wizard_state';

interface PersistedState {
  netMonthlySalary: number | null;
  grossAnnualSalary: number | null;
  taxClass: TaxClass;
  bezirk: Bezirk;
  rooms: number;
  budgetPercentages: Record<string, number>;
  analysis: BudgetAnalysis | null;
  analysisSnapshot: Record<string, number> | null;
}

function loadState(): Partial<PersistedState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

const defaultPercentages = Object.fromEntries(
  DEFAULT_BUDGET_CATEGORIES.map((c) => [c.key, c.percentage]),
);

@Injectable({ providedIn: 'root' })
export class WizardService {
  private readonly router = inject(Router);

  readonly wizardSteps: WizardStep[] = [
    { path: 'salary', label: 'Salary Calculator', shortLabel: 'Salary', icon: '💰' },
    { path: 'neighborhoods', label: 'Neighborhoods', shortLabel: 'Areas', icon: '🗺️' },
    { path: 'costs', label: 'Cost Estimator', shortLabel: 'Costs', icon: '🏠' },
    { path: 'checklist', label: 'Visa Checklist', shortLabel: 'Visa', icon: '✅' },
  ];

  private readonly saved = loadState();

  // Step 1: Salary
  readonly netMonthlySalary = signal<number | null>(this.saved.netMonthlySalary ?? null);
  readonly grossAnnualSalary = signal<number | null>(this.saved.grossAnnualSalary ?? null);
  readonly taxClass = signal<TaxClass>(this.saved.taxClass ?? 'I');

  // Step 2/3: Location + cost estimator
  readonly bezirkSelection = signal<Bezirk>(this.saved.bezirk ?? 'mitte');
  readonly rooms = signal<number>(this.saved.rooms ?? 2);
  readonly budgetPercentages = signal<Record<string, number>>(
    this.saved.budgetPercentages ?? { ...defaultPercentages },
  );

  // AI analysis
  readonly analysis = signal<BudgetAnalysis | null>(this.saved.analysis ?? null);
  readonly analysisSnapshot = signal<Record<string, number> | null>(
    this.saved.analysisSnapshot ?? null,
  );

  readonly currentPath = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => {
        const segments = event.urlAfterRedirects.split('/').filter(Boolean);
        return segments[0] || 'salary';
      }),
    ),
    { initialValue: 'salary' },
  );

  constructor() {
    effect(() => {
      const state: PersistedState = {
        netMonthlySalary: this.netMonthlySalary(),
        grossAnnualSalary: this.grossAnnualSalary(),
        taxClass: this.taxClass(),
        bezirk: this.bezirkSelection(),
        rooms: this.rooms(),
        budgetPercentages: this.budgetPercentages(),
        analysis: this.analysis(),
        analysisSnapshot: this.analysisSnapshot(),
      };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch { /* quota exceeded — non-critical */ }
    });
  }
}
