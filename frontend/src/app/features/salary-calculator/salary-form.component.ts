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
import { NgClass } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { debounceTime, filter, switchMap, tap, catchError } from 'rxjs';
import { EMPTY } from 'rxjs';
import { SalaryCalculationService } from '../../core/services/salary-calculation.service';
import { SalaryResponse, TaxClass, ApiError } from '../../core/models/salary.model';
import { SalaryBreakdownComponent } from './salary-breakdown.component';
import { WizardStepService } from '../../core/services/wizard-step.service';

@Component({
  selector: 'reloc-salary-form',
  standalone: true,
  imports: [ReactiveFormsModule, SalaryBreakdownComponent, NgClass],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './salary-form.component.html',
})
export class SalaryFormComponent implements OnInit {
  private readonly salaryService = inject(SalaryCalculationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly wizardService = inject(WizardStepService);

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
    respondentAge: new FormControl<number>(18, {
      nonNullable: true,
      validators: [Validators.min(18), Validators.max(125)],
    }),
  });

  /** State signals */
  readonly result = signal<SalaryResponse | null>(null);
  readonly isCalculating = signal(false);
  readonly error = signal<ApiError | null>(null);

  /** Derived state */
  readonly hasResult = computed(() => this.result() !== null);

  ngOnInit(): void {
    // Restore saved form state before subscribing (avoids double-fire)
    let hasRestored = false;
    try {
      const saved = sessionStorage.getItem('reloc_salary_form');
      if (saved) {
        const values = JSON.parse(saved);
        this.salaryForm.patchValue(values, { emitEvent: false });
        hasRestored = true;
      }
    } catch {
      /* ignore */
    }

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
              respondentAge: formValue.respondentAge,
            })
            .pipe(
              catchError((err: ApiError) => {
                this.error.set(err);
                this.isCalculating.set(false);
                this.result.set(null);
                return EMPTY;
              }),
            );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((response) => {
        this.result.set(response);
        try {
          this.wizardService.netMonthlySalary.set(response.netMonthly);
          sessionStorage.setItem(
            'reloc_salary_form',
            JSON.stringify(this.salaryForm.getRawValue()),
          );
        } catch {
          /* ignore */
        }
        this.isCalculating.set(false);
      });

    // Trigger calculation if form was restored from sessionStorage
    if (
      hasRestored &&
      this.salaryForm.valid &&
      this.salaryForm.controls.grossAnnual.value !== null
    ) {
      this.salaryForm.updateValueAndValidity();
    }

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
