import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  inject,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, FormControl, FormGroup } from '@angular/forms';
import { debounceTime, switchMap, tap, catchError, EMPTY, combineLatest } from 'rxjs';
import { CostEstimationService } from '../../core/services/cost-estimation.service';
import {
  CostEstimate,
  Bezirk,
  BEZIRK_OPTIONS,
  ApiError,
} from '../../core/models/cost.model';
import { CostBreakdownComponent } from './cost-breakdown.component';

@Component({
  selector: 'reloc-cost-estimator',
  standalone: true,
  imports: [ReactiveFormsModule, CostBreakdownComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cost-estimator.component.html',
})
export class CostEstimatorComponent {
  private readonly costService = inject(CostEstimationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly bezirkOptions = BEZIRK_OPTIONS;
  readonly roomOptions = [1, 2, 3, 4, 5];

  readonly form = new FormGroup({
    bezirk: new FormControl<Bezirk>('friedrichshain-kreuzberg', { nonNullable: true }),
    rooms: new FormControl<number>(2, { nonNullable: true }),
  });

  readonly result = signal<CostEstimate | null>(null);
  readonly isLoading = signal(false);
  readonly error = signal<ApiError | null>(null);

  /** Net monthly salary from Step 1, stored in sessionStorage */
  readonly netMonthlySalary = signal<number | null>(
    this.loadNetSalary()
  );

  readonly affordabilityRatio = computed(() => {
    const net = this.netMonthlySalary();
    const estimate = this.result();
    if (!net || !estimate) return null;
    return estimate.totalEstimated / net;
  });

  readonly affordabilityLabel = computed(() => {
    const ratio = this.affordabilityRatio();
    if (ratio === null) return null;
    if (ratio < 0.4) return { text: 'Comfortable', color: 'var(--reloc-ref-color-success)' };
    if (ratio < 0.5) return { text: 'Manageable', color: 'var(--reloc-sys-color-warning-500)' };
    if (ratio < 0.65) return { text: 'Tight', color: 'var(--reloc-sys-color-warning-500)' };
    return { text: 'Difficult', color: 'var(--reloc-ref-color-error)' };
  });

  constructor() {
    // Auto-fetch when form changes
    combineLatest([
      this.form.controls.bezirk.valueChanges,
      this.form.controls.rooms.valueChanges,
    ])
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
            })
          )
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((estimate) => {
        this.result.set(estimate);
        this.isLoading.set(false);
      });

    // Trigger initial fetch
    this.form.controls.bezirk.updateValueAndValidity();
    this.form.controls.rooms.updateValueAndValidity();
  }

  private loadNetSalary(): number | null {
    try {
      const saved = sessionStorage.getItem('reloc_net_monthly');
      return saved ? parseFloat(saved) : null;
    } catch {
      return null;
    }
  }
}
