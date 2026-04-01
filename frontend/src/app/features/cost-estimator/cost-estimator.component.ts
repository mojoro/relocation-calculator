import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  inject,
  DestroyRef,
  effect,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgClass } from '@angular/common';
import { ReactiveFormsModule, FormControl, FormGroup } from '@angular/forms';
import { debounceTime, switchMap, tap, catchError, EMPTY, combineLatest } from 'rxjs';
import { CostEstimationService } from '../../core/services/cost-estimation.service';
import { CostEstimate, Bezirk, BEZIRK_OPTIONS, ApiError } from '../../core/models/cost.model';
import { DEFAULT_BUDGET_CATEGORIES } from '../../core/models/budget.model';
import type { BudgetCategory, AnalysisContext } from '../../core/models/budget.model';
import { CostBreakdownComponent } from './cost-breakdown.component';
import { LifestyleSpendingComponent } from './lifestyle-spending.component';
import { SanityCheckComponent } from './sanity-check.component';
import { WizardService } from '../../core/services/wizard.service';

@Component({
  selector: 'reloc-cost-estimator',
  standalone: true,
  imports: [ReactiveFormsModule, CostBreakdownComponent, LifestyleSpendingComponent, SanityCheckComponent, NgClass],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cost-estimator.component.html',
})
export class CostEstimatorComponent {
  private readonly costService = inject(CostEstimationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly wizardService = inject(WizardService);
  readonly bezirkOptions = BEZIRK_OPTIONS;
  readonly roomOptions = [1, 2, 3, 4, 5];

  readonly form = new FormGroup({
    bezirk: new FormControl<Bezirk>(this.wizardService.bezirkSelection(), { nonNullable: true }),
    rooms: new FormControl<number>(this.wizardService.rooms(), { nonNullable: true }),
  });

  readonly result = signal<CostEstimate | null>(null);
  readonly isLoading = signal(false);
  readonly error = signal<ApiError | null>(null);

  /** Net monthly salary from Step 1, stored in the wizard service */
  readonly netMonthlySalary = this.wizardService.netMonthlySalary;

  /** Per-category budget percentages — stored in wizard service for persistence */
  readonly budgetPercentages = this.wizardService.budgetPercentages;

  /** Budget categories derived from budgetPercentages + net salary */
  readonly categories = computed<BudgetCategory[]>(() => {
    const net = this.netMonthlySalary();
    if (!net) return [];
    const percentages = this.budgetPercentages();

    return DEFAULT_BUDGET_CATEGORIES.map((def) => ({
      key: def.key,
      label: def.label,
      percentage: percentages[def.key] ?? def.percentage,
      total: net * ((percentages[def.key] ?? def.percentage) / 100),
      isCustom: def.isCustom,
      pieGroup: def.pieGroup,
    }));
  });

  readonly totalAllocatedPercent = computed(() =>
    this.categories().reduce((sum, c) => sum + c.percentage, 0),
  );

  readonly isOverBudget = computed(() => this.totalAllocatedPercent() > 100);

  /** AI budget analysis state — stored in wizard service for persistence */
  readonly analysis = this.wizardService.analysis;
  readonly isAnalyzing = signal(false);
  readonly analysisError = signal<string | null>(null);

  /** Snapshot of budget percentages at the time the last analysis was generated. */
  readonly analysisPercentageSnapshot = this.wizardService.analysisSnapshot;

  /** Whether sliders have changed since the last analysis. */
  readonly hasAnalysisChanged = computed(() => {
    const snapshot = this.analysisPercentageSnapshot();
    if (!snapshot) return false;
    const current = this.budgetPercentages();
    return Object.keys(snapshot).some(key => snapshot[key] !== current[key]);
  });

  constructor() {
    // Sync bezirk form selection with neighborhood page selection
    effect(() => {
      const bezirk = this.wizardService.bezirkSelection();
      if (bezirk && bezirk !== this.form.controls.bezirk.value) {
        this.form.controls.bezirk.setValue(bezirk);
      }
    });
    // Recalculate estimate-backed category percentages when estimate or net salary changes
    effect(() => {
      const net = this.netMonthlySalary();
      const estimate = this.result();
      if (!net || !estimate || net <= 0) return;

      this.budgetPercentages.update((current) => ({
        ...current,
        rent: Math.round((estimate.rentRange.median / net) * 100),
        utilities: Math.round((estimate.utilities / net) * 100),
        transport: Math.round((estimate.transport / net) * 100),
        groceries: Math.round((estimate.groceries / net) * 100),
      }));
    }, { allowSignalWrites: true });

    // Sync form changes back to wizard service
    this.form.controls.bezirk.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((bezirk) => {
        this.wizardService.bezirkSelection.set(bezirk);
      });

    this.form.controls.rooms.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((rooms) => {
        this.wizardService.rooms.set(rooms);
      });

    // Auto-fetch when form changes
    combineLatest([this.form.controls.bezirk.valueChanges, this.form.controls.rooms.valueChanges])
      .pipe(
        debounceTime(200),
        tap(() => {
          this.isLoading.set(true);
          this.error.set(null);
        }),
        switchMap(([bezirk, rooms]) =>
          this.costService.estimateCosts(bezirk, rooms).pipe(
            catchError((err) => {
              this.error.set(err);
              this.isLoading.set(false);
              this.result.set(null);
              return EMPTY;
            }),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((estimate) => {
        this.result.set(estimate);
        this.isLoading.set(false);
      });

    // Trigger initial fetch
    this.form.controls.bezirk.updateValueAndValidity();
    this.form.controls.rooms.updateValueAndValidity();
  }

  onCategoryChange(event: { key: string; percentage: number }): void {
    this.budgetPercentages.update((current) => ({
      ...current,
      [event.key]: event.percentage,
    }));
  }

  onAnalyzeRequested(): void {
    const net = this.netMonthlySalary();
    const estimate = this.result();
    if (!net || !estimate) return;

    const context: AnalysisContext = {
      netMonthlySalary: net,
      grossAnnualSalary: this.wizardService.grossAnnualSalary() ?? 0,
      taxClass: this.wizardService.taxClass(),
      bezirk: this.form.controls.bezirk.value,
      bezirkDisplayName: estimate.displayName,
      rooms: this.form.controls.rooms.value,
      categories: this.categories(),
      totalAllocated: this.categories().reduce((sum, c) => sum + c.total, 0),
      remainingMonthly: net - this.categories().reduce((sum, c) => sum + c.total, 0),
      rentRange: estimate.rentRange,
      neighborhoodVibe: '',
      neighborhoodHighlights: [],
    };

    this.isAnalyzing.set(true);
    this.analysisError.set(null);
    this.analysisPercentageSnapshot.set({ ...this.budgetPercentages() });

    this.costService
      .analyzeBudget(context)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.analysis.set(result);
          this.isAnalyzing.set(false);
        },
        error: (err) => {
          this.analysisError.set(err?.message ?? 'Analysis failed. Please try again.');
          this.isAnalyzing.set(false);
        },
      });
  }
}
