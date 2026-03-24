import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  inject,
  OnInit,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormGroup,
  FormControl,
  Validators,
} from '@angular/forms';
import { debounceTime, filter, switchMap, tap, catchError } from 'rxjs';
import { EMPTY } from 'rxjs';
import { SalaryCalculationService } from '../../core/services/salary-calculation.service';
import { SalaryResponse, TaxClass, ApiError } from '../../core/models/salary.model';
import { SalaryBreakdownComponent } from './salary-breakdown.component';

@Component({
  selector: 'reloc-salary-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SalaryBreakdownComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './salary-form.component.html',
})
export class SalaryFormComponent implements OnInit {
  private readonly salaryService = inject(SalaryCalculationService);
  private readonly destroyRef = inject(DestroyRef);

  /** Tax class options for the radio buttons */
  readonly taxClasses: { value: TaxClass; label: string; description: string }[] = [
    { value: 'I', label: 'I', description: 'Single / Divorced / Widowed' },
    { value: 'II', label: 'II', description: 'Single Parent' },
    { value: 'III', label: 'III', description: 'Married (higher earner)' },
    { value: 'IV', label: 'IV', description: 'Married (equal income)' },
    { value: 'V', label: 'V', description: 'Married (lower earner)' },
    { value: 'VI', label: 'VI', description: 'Secondary Job' },
  ];

  /** The reactive form */
  readonly salaryForm = new FormGroup({
    grossAnnual: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(0),
      Validators.max(10_000_000),
    ]),
    taxClass: new FormControl<TaxClass>('I', { nonNullable: true }),
    churchTax: new FormControl<boolean>(false, { nonNullable: true }),
    hasChildren: new FormControl<boolean>(false, { nonNullable: true }),
    childCount: new FormControl<number>(0, {
      nonNullable: true,
      validators: [Validators.min(0), Validators.max(10)],
    }),
  });

  /** State signals */
  readonly result = signal<SalaryResponse | null>(null);
  readonly isCalculating = signal(false);
  readonly error = signal<ApiError | null>(null);

  /** Derived state */
  readonly hasResult = computed(() => this.result() !== null);
  readonly showChildCount = computed(() => this.salaryForm.controls.hasChildren.value);

  ngOnInit(): void {
    // Auto-calculate when form changes (debounced)
    this.salaryForm.valueChanges
      .pipe(
        debounceTime(400),
        filter(() => this.salaryForm.valid && this.salaryForm.controls.grossAnnual.value !== null),
        tap(() => {
          this.isCalculating.set(true);
          this.error.set(null);
        }),
        switchMap(() => {
          const formValue = this.salaryForm.getRawValue();
          return this.salaryService
            .calculate({
              grossAnnual: formValue.grossAnnual!,
              taxClass: formValue.taxClass,
              churchTax: formValue.churchTax,
              hasChildren: formValue.hasChildren,
              childCount: formValue.hasChildren ? formValue.childCount : 0,
            })
            .pipe(
              catchError((err: ApiError) => {
                this.error.set(err);
                this.isCalculating.set(false);
                this.result.set(null);
                return EMPTY;
              })
            );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((response) => {
        this.result.set(response);
        try { sessionStorage.setItem('reloc_net_monthly', response.netMonthly.toString()); } catch {}
        this.isCalculating.set(false);
      });

    // Reset child count when hasChildren is toggled off
    this.salaryForm.controls.hasChildren.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((hasChildren) => {
        if (!hasChildren) {
          this.salaryForm.controls.childCount.setValue(0);
        }
      });
  }
}
